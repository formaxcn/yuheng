'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface User {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    role: 'user' | 'admin';
}

export interface AuthContextType {
    multiUserEnabled: boolean;
    authenticated: boolean;
    user: User | null;
    loading: boolean;
    login: (userId: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    enableMultiUser: (adminPassword: string) => Promise<boolean>;
    disableMultiUser: (password: string) => Promise<boolean>;
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [multiUserEnabled, setMultiUserEnabled] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        try {
            const res = await fetch('/api/auth/status');
            const data = await res.json();
            setMultiUserEnabled(data.multiUserEnabled);
            setAuthenticated(data.authenticated);
            setUser(data.user);
        } catch (error) {
            console.error('Failed to fetch auth status:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    const login = async (userId: string, password: string): Promise<boolean> => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, password })
        });
        if (res.ok) {
            await refresh();
            return true;
        }
        return false;
    };

    const logout = async (): Promise<void> => {
        await fetch('/api/auth/logout', { method: 'POST' });
        await refresh();
    };

    const enableMultiUser = async (adminPassword: string): Promise<boolean> => {
        const res = await fetch('/api/auth/enable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword })
        });
        if (res.ok) {
            await refresh();
            return true;
        }
        return false;
    };

    const disableMultiUser = async (password: string): Promise<boolean> => {
        const res = await fetch('/api/auth/disable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        if (res.ok) {
            await refresh();
            return true;
        }
        return false;
    };

    return (
        <AuthContext.Provider value={{
            multiUserEnabled,
            authenticated,
            user,
            loading,
            login,
            logout,
            enableMultiUser,
            disableMultiUser,
            refresh
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
