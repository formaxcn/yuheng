'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/auth-context';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Check, X, Monitor, Trash2, Clock, Smartphone } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/utils';

interface PendingRequest {
    id: number;
    device_name: string | null;
    created_at: string;
}

interface ActiveSession {
    id: number;
    device_name: string | null;
    fingerprint: string;
    created_at: string;
    last_active_at: string;
}

export function SessionManager() {
    const { listDevices, approveDeviceRequest, denyDeviceRequest, revokeSession, deviceFingerprint } = useAuth();
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
    const [sessions, setSessions] = useState<ActiveSession[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        const data = await listDevices();
        if (data) {
            setPendingRequests(data.pendingRequests || []);
            setSessions(data.sessions || []);
        }
        setLoading(false);
    }, [listDevices]);

    useEffect(() => {
        load();
    }, [load]);

    const handleApprove = async (id: number) => {
        setActionLoading(id);
        const success = await approveDeviceRequest(id);
        if (success) {
            toast.success('Request approved');
            await load();
        } else {
            toast.error('Failed to approve');
        }
        setActionLoading(null);
    };

    const handleDeny = async (id: number) => {
        setActionLoading(id);
        const success = await denyDeviceRequest(id);
        if (success) {
            toast.success('Request denied');
            await load();
        } else {
            toast.error('Failed to deny');
        }
        setActionLoading(null);
    };

    const handleRevoke = async (id: number) => {
        setActionLoading(id);
        const success = await revokeSession(id);
        if (success) {
            toast.success('Session revoked');
            await load();
        } else {
            toast.error('Failed to revoke');
        }
        setActionLoading(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Sessions & Devices</Label>
                <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
            </div>

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                            <Clock className="w-4 h-4" />
                            Pending Device Requests ({pendingRequests.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {pendingRequests.map((req) => (
                            <div key={req.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                                <div className="flex items-center gap-3">
                                    <Smartphone className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <div className="text-sm font-medium">
                                            {req.device_name || 'Unknown Device'}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(req.created_at))} ago
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        size="sm"
                                        variant="default"
                                        className="h-8 w-8 p-0"
                                        onClick={() => handleApprove(req.id)}
                                        disabled={actionLoading === req.id}
                                    >
                                        {actionLoading === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-500"
                                        onClick={() => handleDeny(req.id)}
                                        disabled={actionLoading === req.id}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Active Sessions */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        Active Sessions ({sessions.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {sessions.length === 0 && !loading && (
                        <div className="text-sm text-muted-foreground text-center py-4">
                            No active sessions
                        </div>
                    )}
                    {sessions.map((session) => {
                        const isCurrent = session.fingerprint === deviceFingerprint;
                        return (
                            <div key={session.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                                <div className="flex items-center gap-3">
                                    <Monitor className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <div className="text-sm font-medium flex items-center gap-2">
                                            {session.device_name || 'Unknown Device'}
                                            {isCurrent && (
                                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                                    It's me
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Last active: {formatDistanceToNow(new Date(session.last_active_at))} ago
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-500"
                                    onClick={() => handleRevoke(session.id)}
                                    disabled={actionLoading === session.id || isCurrent}
                                >
                                    {actionLoading === session.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </Button>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {pendingRequests.length === 0 && sessions.length === 0 && !loading && (
                <div className="text-sm text-muted-foreground text-center py-4">
                    No pending requests or active sessions
                </div>
            )}
        </div>
    );
}
