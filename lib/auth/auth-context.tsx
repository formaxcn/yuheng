'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

export interface User {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    role: 'user' | 'admin';
}

export interface AuthContextType {
    multiUserEnabled: boolean;
    deviceAuthEnabled: boolean;
    totpBound: boolean;
    authenticated: boolean;
    user: User | null;
    loading: boolean;
    deviceFingerprint: string | null;
    login: (userId: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    enableMultiUser: (adminPassword: string) => Promise<boolean>;
    disableMultiUser: (password: string) => Promise<boolean>;
    enableDeviceAuth: () => Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] } | null>;
    disableDeviceAuth: (token: string) => Promise<boolean>;
    totpLogin: (token: string, deviceName?: string) => Promise<boolean>;
    totpSetup: (label: string) => Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] } | null>;
    totpConfirm: (secret: string, backupCodes: string[], token: string) => Promise<boolean>;
    totpDisable: (token: string) => Promise<boolean>;
    createDeviceRequest: (deviceName?: string) => Promise<{ requestId: number } | null>;
    pollDeviceStatus: (requestId: number) => Promise<{ status: string } | null>;
    approveDeviceRequest: (requestId: number) => Promise<boolean>;
    denyDeviceRequest: (requestId: number) => Promise<boolean>;
    createDeviceSession: (requestId: number, deviceName?: string) => Promise<boolean>;
    listDevices: () => Promise<{ pendingRequests: any[]; sessions: any[] } | null>;
    revokeSession: (sessionId: number) => Promise<boolean>;
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEVICE_FP_KEY = 'yuheng_device_fp';

function getOrCreateFingerprint(): string {
    if (typeof window === 'undefined') return '';
    let fp = localStorage.getItem(DEVICE_FP_KEY);
    if (!fp) {
        fp = crypto.randomUUID();
        localStorage.setItem(DEVICE_FP_KEY, fp);
    }
    return fp;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [multiUserEnabled, setMultiUserEnabled] = useState(false);
    const [deviceAuthEnabled, setDeviceAuthEnabled] = useState(false);
    const [totpBound, setTotpBound] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);

    // Generate device fingerprint on mount
    useEffect(() => {
        const fp = getOrCreateFingerprint();
        setDeviceFingerprint(fp);
    }, []);

    const refresh = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/status');
            const data = await res.json();
            setMultiUserEnabled(data.multiUserEnabled);
            setDeviceAuthEnabled(data.deviceAuthEnabled);
            setTotpBound(data.totpBound);
            setAuthenticated(data.authenticated);
            setUser(data.user);
        } catch (error) {
            console.error('Failed to fetch auth status:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

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

    const enableDeviceAuth = async (): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] } | null> => {
        const res = await fetch('/api/auth/device/enable', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Device-FP': deviceFingerprint || ''
            },
            body: JSON.stringify({})
        });
        if (res.ok) {
            return res.json();
        }
        return null;
    };

    const disableDeviceAuth = async (token: string): Promise<boolean> => {
        const res = await fetch('/api/auth/device/disable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        if (res.ok) {
            await refresh();
            return true;
        }
        return false;
    };

    const totpLogin = async (token: string, deviceName?: string): Promise<boolean> => {
        const res = await fetch('/api/auth/totp/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Device-FP': deviceFingerprint || ''
            },
            body: JSON.stringify({ token, deviceName })
        });
        if (res.ok) {
            await refresh();
            return true;
        }
        return false;
    };

    const totpSetup = async (label: string): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] } | null> => {
        const res = await fetch('/api/auth/totp/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label })
        });
        if (res.ok) {
            return res.json();
        }
        return null;
    };

    const totpConfirm = async (secret: string, backupCodes: string[], token: string): Promise<boolean> => {
        const res = await fetch('/api/auth/totp/confirm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Device-FP': deviceFingerprint || ''
            },
            body: JSON.stringify({ secret, backupCodes, token })
        });
        if (res.ok) {
            await refresh();
            return true;
        }
        return false;
    };

    const totpDisable = async (token: string): Promise<boolean> => {
        const res = await fetch('/api/auth/totp/disable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        if (res.ok) {
            await refresh();
            return true;
        }
        return false;
    };

    const createDeviceRequest = async (deviceName?: string): Promise<{ requestId: number } | null> => {
        const res = await fetch('/api/auth/device/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceName })
        });
        if (res.ok) {
            return res.json();
        }
        return null;
    };

    const pollDeviceStatus = async (requestId: number): Promise<{ status: string } | null> => {
        const res = await fetch(`/api/auth/device/status?requestId=${requestId}`);
        if (res.ok) {
            return res.json();
        }
        return null;
    };

    const approveDeviceRequest = async (requestId: number): Promise<boolean> => {
        const res = await fetch('/api/auth/device/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId })
        });
        return res.ok;
    };

    const denyDeviceRequest = async (requestId: number): Promise<boolean> => {
        const res = await fetch('/api/auth/device/deny', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId })
        });
        return res.ok;
    };

    const createDeviceSession = async (requestId: number, deviceName?: string): Promise<boolean> => {
        const res = await fetch('/api/auth/device/session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Device-FP': deviceFingerprint || ''
            },
            body: JSON.stringify({ requestId, deviceName })
        });
        if (res.ok) {
            await refresh();
            return true;
        }
        return false;
    };

    const listDevices = async (): Promise<{ pendingRequests: any[]; sessions: any[] } | null> => {
        const res = await fetch('/api/auth/device/list');
        if (res.ok) {
            return res.json();
        }
        return null;
    };

    const revokeSession = async (sessionId: number): Promise<boolean> => {
        const res = await fetch('/api/auth/device/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
        return res.ok;
    };

    return (
        <AuthContext.Provider value={{
            multiUserEnabled,
            deviceAuthEnabled,
            totpBound,
            authenticated,
            user,
            loading,
            deviceFingerprint,
            login,
            logout,
            enableMultiUser,
            disableMultiUser,
            enableDeviceAuth,
            disableDeviceAuth,
            totpLogin,
            totpSetup,
            totpConfirm,
            totpDisable,
            createDeviceRequest,
            pollDeviceStatus,
            approveDeviceRequest,
            denyDeviceRequest,
            createDeviceSession,
            listDevices,
            revokeSession,
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
