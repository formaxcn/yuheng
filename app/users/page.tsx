'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface User {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    role: string;
}

export default function UsersPage() {
    const router = useRouter();
    const { user, multiUserEnabled, loading: authLoading } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', avatar: '' });

    useEffect(() => {
        if (authLoading) return;

        if (!multiUserEnabled) {
            router.push('/');
            return;
        }

        if (user?.role !== 'admin') {
            router.push('/');
            return;
        }

        loadUsers();
    }, [authLoading, multiUserEnabled, user, router]);

    const loadUsers = async () => {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            setUsers(data.users || []);
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });

            if (res.ok) {
                toast.success('User created successfully');
                setCreateDialogOpen(false);
                setNewUser({ name: '', email: '', password: '', avatar: '' });
                loadUsers();
            } else {
                toast.error('Failed to create user');
            }
        } catch (error) {
            toast.error('Failed to create user');
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? All their data will be lost.')) {
            return;
        }

        try {
            const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('User deleted successfully');
                loadUsers();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to delete user');
            }
        } catch (error) {
            toast.error('Failed to delete user');
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                        </Link>
                        <h1 className="text-2xl font-bold">User Management</h1>
                    </div>

                    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <UserPlus className="w-4 h-4 mr-2" />
                                Add User
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New User</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateUser} className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Username *</label>
                                    <Input
                                        value={newUser.name}
                                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                        placeholder="Enter username"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email</label>
                                    <Input
                                        type="email"
                                        value={newUser.email}
                                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                        placeholder="Enter email"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Password *</label>
                                    <Input
                                        type="password"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        placeholder="Min 6 characters"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Avatar (Emoji)</label>
                                    <Input
                                        value={newUser.avatar}
                                        onChange={(e) => setNewUser({ ...newUser, avatar: e.target.value })}
                                        placeholder="e.g., 🍎"
                                        maxLength={4}
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="button" variant="ghost" onClick={() => setCreateDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit">Create</Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardContent className="p-4">
                        <div className="space-y-2">
                            {/* Header */}
                            <div className="grid grid-cols-5 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                                <div>Avatar</div>
                                <div>Username</div>
                                <div>Email</div>
                                <div>Role</div>
                                <div className="text-right">Actions</div>
                            </div>
                            {/* Rows */}
                            {users.map(u => (
                                <div key={u.id} className="grid grid-cols-5 gap-4 px-4 py-3 items-center border-b last:border-0 hover:bg-muted/5 rounded">
                                    <div>{u.avatar || '-'}</div>
                                    <div className="font-medium">{u.name}</div>
                                    <div className="text-muted-foreground text-sm">{u.email || '-'}</div>
                                    <div>
                                        {u.role === 'admin' ? (
                                            <span className="bg-primary/20 px-2 py-0.5 rounded text-xs">Admin</span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">User</span>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteUser(u.id)}
                                            disabled={u.id === user?.id}
                                            className="text-red-500 hover:text-red-600 h-8 w-8 p-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
