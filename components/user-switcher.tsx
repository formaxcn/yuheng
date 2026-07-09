'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Users, Settings as SettingsIcon } from 'lucide-react';
import Link from 'next/link';

export function UserSwitcher() {
    const { multiUserEnabled, deviceAuthEnabled, user, logout } = useAuth();
    const router = useRouter();

    // Don't show switcher in plain single-user mode (no auth)
    if (!multiUserEnabled && !deviceAuthEnabled) {
        return null;
    }

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span>{user?.name || 'User'}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                    {user?.name}
                    {user?.role === 'admin' && (
                        <span className="ml-2 text-xs bg-primary/20 px-2 py-0.5 rounded">
                            Admin
                        </span>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {multiUserEnabled && (
                    <DropdownMenuItem asChild>
                        <Link href="/users" className="cursor-pointer flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Manage Users
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer flex items-center gap-2">
                        <SettingsIcon className="h-4 w-4" />
                        Settings
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-500 focus:text-red-500"
                >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
