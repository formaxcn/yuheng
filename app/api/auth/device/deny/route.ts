import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db/index';
import { DeviceAuthService } from '@/lib/auth/device-auth';
import { SessionManager } from '@/lib/auth/session';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const denySchema = z.object({
    requestId: z.number()
});

export async function POST(req: NextRequest) {
    await ensureInit();

    const session = await SessionManager.get();
    if (!session) {
        logger.warn('[API:device/deny] Unauthorized - no session');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const parsed = denySchema.safeParse(body);

        if (!parsed.success) {
            logger.warn('[API:device/deny] Invalid request body', { body });
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        logger.info('[API:device/deny] Request received', {
            requestId: parsed.data.requestId,
            denier: session.userName
        });

        const result = await DeviceAuthService.denyRequest(parsed.data.requestId);

        if (!result.success) {
            logger.warn('[API:device/deny] Failed', {
                requestId: parsed.data.requestId,
                error: result.error
            });
            return NextResponse.json({ error: result.error || 'Failed to deny request' }, { status: 400 });
        }

        logger.info('[API:device/deny] Success', {
            requestId: parsed.data.requestId,
            denier: session.userName
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('[API:device/deny] Unexpected error', { error: String(error) });
        return NextResponse.json({ error: 'Failed to deny request' }, { status: 500 });
    }
}
