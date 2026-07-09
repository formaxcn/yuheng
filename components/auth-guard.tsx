'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { multiUserEnabled, deviceAuthEnabled, authenticated, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const needsAuth = multiUserEnabled || deviceAuthEnabled;

    useEffect(() => {
        if (loading) return;

        // If auth is required and not authenticated, redirect to login
        if (needsAuth && !authenticated && pathname !== '/login') {
            router.push('/login');
        }

        // If authenticated user tries to access login page, redirect to home
        if (authenticated && pathname === '/login') {
            router.push('/');
        }
    }, [needsAuth, authenticated, loading, pathname, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse">Loading...</div>
            </div>
        );
    }

    // If auth is required and not authenticated, only show login page
    if (needsAuth && !authenticated && pathname !== '/login') {
        return null; // Will redirect via useEffect
    }

    return <>{children}</>;
}
