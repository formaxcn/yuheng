'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, KeyRound, Smartphone, ShieldCheck, Clock } from 'lucide-react';

type LoginMode = 'password' | 'totp' | 'device';

export default function LoginPage() {
    const router = useRouter();
    const {
        multiUserEnabled, deviceAuthEnabled, totpBound, authenticated, loading,
        login, totpLogin, createDeviceRequest, pollDeviceStatus, createDeviceSession
    } = useAuth();

    const [users, setUsers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // TOTP state
    const [totpCode, setTotpCode] = useState('');

    // Device approval state
    const [waitingForApproval, setWaitingForApproval] = useState(false);
    const [deviceName, setDeviceName] = useState('');
    const [polling, setPolling] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [activeMode, setActiveMode] = useState<LoginMode>('password');

    useEffect(() => {
        if (loading) return;

        // Already authenticated or no auth needed
        if (authenticated || (!multiUserEnabled && !deviceAuthEnabled)) {
            router.push('/');
            return;
        }

        // Fetch users for multi-user mode
        if (multiUserEnabled) {
            setActiveMode('password');
            fetch('/api/users')
                .then(res => res.json())
                .then(data => setUsers(data.users || []))
                .catch(err => console.error('Failed to fetch users:', err));
        } else if (deviceAuthEnabled) {
            // Device auth mode - default to TOTP if available, otherwise device approval
            setActiveMode(totpBound ? 'totp' : 'device');
        }
    }, [multiUserEnabled, deviceAuthEnabled, totpBound, authenticated, loading, router]);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    const handlePasswordLogin = async (e: React.FormEvent) => {
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

    const handleTotpLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!totpCode) return;

        setIsLoggingIn(true);
        setError('');

        const success = await totpLogin(totpCode, deviceName || undefined);
        if (success) {
            router.push('/');
        } else {
            setError('Invalid code');
            setTotpCode('');
        }
        setIsLoggingIn(false);
    };

    const handleDeviceRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setError('');

        const result = await createDeviceRequest(deviceName || undefined);
        if (result) {
            setWaitingForApproval(true);
            setPolling(true);

            // Start polling
            pollRef.current = setInterval(async () => {
                const status = await pollDeviceStatus(result.requestId);
                if (!status) return;

                if (status.status === 'approved') {
                    if (pollRef.current) clearInterval(pollRef.current);
                    setPolling(false);
                    const sessionSuccess = await createDeviceSession(result.requestId, deviceName || undefined);
                    if (sessionSuccess) {
                        router.push('/');
                    } else {
                        setError('Failed to create session');
                        setIsLoggingIn(false);
                    }
                } else if (status.status === 'denied') {
                    if (pollRef.current) clearInterval(pollRef.current);
                    setPolling(false);
                    setError('Request denied');
                    setWaitingForApproval(false);
                    setIsLoggingIn(false);
                } else if (status.status === 'expired') {
                    if (pollRef.current) clearInterval(pollRef.current);
                    setPolling(false);
                    setError('Request expired');
                    setWaitingForApproval(false);
                    setIsLoggingIn(false);
                }
            }, 3000);
        } else {
            setError('Failed to create request');
        }
        setIsLoggingIn(false);
    };

    const cancelPolling = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        setPolling(false);
        setWaitingForApproval(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-background/80">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">
                        {multiUserEnabled ? 'YuHeng · Login' : 'YuHeng · Device Authorization'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Multi-user password login */}
                    {multiUserEnabled && activeMode === 'password' && (
                        <form onSubmit={handlePasswordLogin} className="space-y-4">
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
                            {error && <div className="text-red-500 text-sm">{error}</div>}
                            <Button type="submit" className="w-full" disabled={!selectedUserId || !password || isLoggingIn}>
                                {isLoggingIn ? 'Logging in...' : 'Login'}
                            </Button>
                        </form>
                    )}

                    {/* Device auth mode - mode selector */}
                    {deviceAuthEnabled && !multiUserEnabled && (
                        <>
                            {/* Mode tabs */}
                            {!waitingForApproval && (
                                <div className="flex gap-2 mb-2">
                                    {totpBound && (
                                        <Button
                                            variant={activeMode === 'totp' ? 'default' : 'outline'}
                                            size="sm"
                                            className="flex-1 gap-2"
                                            onClick={() => { setActiveMode('totp'); setError(''); }}
                                        >
                                            <KeyRound className="w-4 h-4" />
                                            TOTP
                                        </Button>
                                    )}
                                    <Button
                                        variant={activeMode === 'device' ? 'default' : 'outline'}
                                        size="sm"
                                        className="flex-1 gap-2"
                                        onClick={() => { setActiveMode('device'); setError(''); }}
                                    >
                                        <Smartphone className="w-4 h-4" />
                                        Device Approval
                                    </Button>
                                </div>
                            )}

                            {/* TOTP login */}
                            {activeMode === 'totp' && !waitingForApproval && (
                                <form onSubmit={handleTotpLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Enter 6-digit TOTP code</label>
                                        <Input
                                            type="text"
                                            value={totpCode}
                                            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="000000"
                                            className="text-center text-2xl tracking-widest font-mono"
                                            maxLength={6}
                                            autoFocus
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Enter the code from your authenticator app. Backup codes also work.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Device Name (optional)</label>
                                        <Input
                                            value={deviceName}
                                            onChange={(e) => setDeviceName(e.target.value)}
                                            placeholder="e.g. My iPhone"
                                        />
                                    </div>
                                    {error && <div className="text-red-500 text-sm">{error}</div>}
                                    <Button type="submit" className="w-full" disabled={totpCode.length !== 6 || isLoggingIn}>
                                        {isLoggingIn ? 'Verifying...' : 'Verify & Login'}
                                    </Button>
                                </form>
                            )}

                            {/* Device approval - create request */}
                            {activeMode === 'device' && !waitingForApproval && (
                                <form onSubmit={handleDeviceRequest} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Device Name (optional)</label>
                                        <Input
                                            value={deviceName}
                                            onChange={(e) => setDeviceName(e.target.value)}
                                            placeholder="e.g. My iPhone"
                                        />
                                    </div>
                                    <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Smartphone className="w-4 h-4" />
                                            How it works
                                        </div>
                                        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                                            <li>Submit a device approval request</li>
                                            <li>On a trusted device, go to Settings &gt; Sessions</li>
                                            <li>Approve the pending request</li>
                                            <li>This device will be automatically logged in</li>
                                        </ol>
                                    </div>
                                    {error && <div className="text-red-500 text-sm">{error}</div>}
                                    <Button type="submit" className="w-full" disabled={isLoggingIn}>
                                        {isLoggingIn ? 'Creating request...' : 'Request Device Approval'}
                                    </Button>
                                </form>
                            )}

                            {/* Device approval - waiting for approval */}
                            {waitingForApproval && (
                                <div className="space-y-4 text-center">
                                    <div className="bg-primary/10 rounded-lg p-6 space-y-2">
                                        <ShieldCheck className="w-12 h-12 mx-auto text-primary" />
                                        <div className="text-sm font-medium text-primary">
                                            Waiting for approval
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="w-4 h-4 animate-pulse" />
                                        {polling ? 'Waiting for approval...' : 'Processing...'}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Approve this request from a trusted device in Settings &gt; Sessions.
                                        Request expires in 10 minutes.
                                    </p>
                                    {error && <div className="text-red-500 text-sm">{error}</div>}
                                    <Button variant="outline" className="w-full" onClick={cancelPolling}>
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
