"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

export function useBackendStatus() {
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
        const interval = setInterval(checkStatus, 30000);

        return () => clearInterval(interval);
    }, []);

    return status;
}
