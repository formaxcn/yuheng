'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function LoginPage() {
    const router = useRouter();
    const { multiUserEnabled, authenticated, login, loading } = useAuth();
    const [users, setUsers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    useEffect(() => {
        // If single-user mode or already authenticated, redirect to home
        if (!loading && (!multiUserEnabled || authenticated)) {
            router.push('/');
            return;
        }

        // Fetch users for selector
        fetch('/api/users')
            .then(res => res.json())
            .then(data => setUsers(data.users || []))
            .catch(err => console.error('Failed to fetch users:', err));
    }, [multiUserEnabled, authenticated, loading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId || !password) return;

        setIsLoggingIn(true);
        setError('');

        const success = await login(selectedUserId, password);
        if (success) {
            router.push('/');
        } else {
            setError('Invalid password');
        }
        setIsLoggingIn(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">YuHeng · Login</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select User</label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a user" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map(user => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.avatar && <span className="mr-2">{user.avatar}</span>}
                                            {user.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Password</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                            />
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm">{error}</div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={!selectedUserId || !password || isLoggingIn}
                        >
                            {isLoggingIn ? 'Logging in...' : 'Login'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
