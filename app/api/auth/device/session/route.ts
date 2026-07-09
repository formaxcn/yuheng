import { NextRequest, NextResponse } from 'next/server';
import { ensureInit, getAdapter, DEFAULT_USER_ID } from '@/lib/db/index';
import { DeviceAuthService } from '@/lib/auth/device-auth';
import { SessionManager } from '@/lib/auth/session';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const sessionSchema = z.object({
    requestId: z.number(),
    deviceName: z.string().optional()
});

export async function POST(req: NextRequest) {
    await ensureInit();
    const db = getAdapter();

    try {
        const body = await req.json();
        const parsed = sessionSchema.safeParse(body);

        if (!parsed.success) {
            logger.warn('[API:device/session] Invalid request body', { body });
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const fingerprint = await SessionManager.getDeviceFingerprint();
        if (!fingerprint) {
            logger.warn('[API:device/session] No device fingerprint in headers/cookie');
            return NextResponse.json({ error: 'Device fingerprint not found' }, { status: 400 });
        }

        logger.info('[API:device/session] Creating session from approval', {
            requestId: parsed.data.requestId,
            deviceName: parsed.data.deviceName,
            fingerprint: fingerprint.substring(0, 8) + '...'
        });

        const result = await DeviceAuthService.createSessionFromApproval(
            parsed.data.requestId,
            fingerprint,
            parsed.data.deviceName ?? null
        );

        if (!result.success || !result.session) {
            logger.warn('[API:device/session] Failed', {
                requestId: parsed.data.requestId,
                error: result.error
            });
            return NextResponse.json({ error: result.error || 'Failed to create session' }, { status: 400 });
        }

        // Create device session cookie for the new device
        const user = await db.getUser(DEFAULT_USER_ID);
        await SessionManager.createDeviceSession(
            DEFAULT_USER_ID,
            user?.name || 'Default',
            user?.role || 'admin',
            result.session.id,
            fingerprint
        );

        logger.info('[API:device/session] Success - session cookie created', {
            requestId: parsed.data.requestId,
            sessionId: result.session.id,
            userName: user?.name
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('[API:device/session] Unexpected error', { error: String(error) });
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
}
