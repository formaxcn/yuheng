import { NextRequest, NextResponse } from 'next/server';
import { ensureInit, getAdapter } from '@/lib/db/index';
import { AuthService } from '@/lib/auth/auth-service';
import { SessionManager } from '@/lib/auth/session';
import { z } from 'zod';

const verifySchema = z.object({
    token: z.string(),
    deviceName: z.string().optional()
});

export async function POST(req: NextRequest) {
    await ensureInit();
    const db = getAdapter();

    try {
        const body = await req.json();
        const parsed = verifySchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const fingerprint = await SessionManager.getDeviceFingerprint();
        if (!fingerprint) {
            return NextResponse.json({ error: 'Device fingerprint not found' }, { status: 400 });
        }

        const result = await AuthService.verifyTotpLogin(
            parsed.data.token,
            fingerprint,
            parsed.data.deviceName ?? null
        );

        if (!result.success) {
            return NextResponse.json({ error: result.error || 'Verification failed' }, { status: 401 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}
