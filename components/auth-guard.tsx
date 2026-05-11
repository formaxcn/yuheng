'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { multiUserEnabled, authenticated, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading) return;

        // In multi-user mode, require authentication for all pages except login
        if (multiUserEnabled && !authenticated && pathname !== '/login') {
            router.push('/login');
        }

        // If authenticated user tries to access login page, redirect to home
        if (authenticated && pathname === '/login') {
            router.push('/');
        }
    }, [multiUserEnabled, authenticated, loading, pathname, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse">Loading...</div>
            </div>
        );
    }

    // In multi-user mode, show login page only if not authenticated
    if (multiUserEnabled && !authenticated && pathname !== '/login') {
        return null; // Will redirect via useEffect
    }

    return <>{children}</>;
}
