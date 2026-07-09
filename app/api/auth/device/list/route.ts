import { NextRequest, NextResponse } from 'next/server';
import { ensureInit, getAdapter } from '@/lib/db/index';
import { DeviceAuthService } from '@/lib/auth/device-auth';
import { SessionManager } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
    await ensureInit();
    const db = getAdapter();

    const session = await SessionManager.get();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const [pendingRequests, sessions] = await Promise.all([
            DeviceAuthService.listPendingRequests(),
            DeviceAuthService.listSessions()
        ]);

        return NextResponse.json({ pendingRequests, sessions });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to list device requests and sessions' }, { status: 500 });
    }
}
