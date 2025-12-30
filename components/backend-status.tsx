"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

export function BackendStatus() {
    const [status, setStatus] = useState<{ online: boolean; version?: string } | null>(null);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const data = await api.checkHealth();
                setStatus({ online: true, version: data.version });
            } catch (error) {
                console.error('Backend status check failed:', error);
                setStatus({ online: false });
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 30000); // Check every 30 seconds for refined UI

        return () => clearInterval(interval);
    }, []);

    if (!status) return null;

    return (
        <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-default">
            <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                status.online ? "bg-emerald-500" : "bg-destructive",
                status.online && "animate-pulse"
            )} />
            {status.version && (
                <span className="text-[10px] font-medium text-muted-foreground tracking-tight">
                    v{status.version}
                </span>
            )}
        </div>
    );
}
