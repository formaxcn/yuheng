import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db/index';
import { DeviceAuthService } from '@/lib/auth/device-auth';
import { SessionManager } from '@/lib/auth/session';
import { z } from 'zod';

const revokeSchema = z.object({
    sessionId: z.number()
});

export async function POST(req: NextRequest) {
    await ensureInit();

    const session = await SessionManager.get();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const parsed = revokeSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        // Don't allow revoking the current session
        if (session.sessionId === parsed.data.sessionId) {
            return NextResponse.json({ error: 'Cannot revoke current session. Use logout instead.' }, { status: 400 });
        }

        await DeviceAuthService.revokeSession(parsed.data.sessionId);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 });
    }
}
