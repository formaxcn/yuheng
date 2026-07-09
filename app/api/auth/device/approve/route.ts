import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db/index';
import { DeviceAuthService } from '@/lib/auth/device-auth';
import { SessionManager } from '@/lib/auth/session';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const approveSchema = z.object({
    requestId: z.number()
});

export async function POST(req: NextRequest) {
    await ensureInit();

    const session = await SessionManager.get();
    if (!session) {
        logger.warn('[API:device/approve] Unauthorized - no session');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const parsed = approveSchema.safeParse(body);

        if (!parsed.success) {
            logger.warn('[API:device/approve] Invalid request body', { body });
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        logger.info('[API:device/approve] Request received', {
            requestId: parsed.data.requestId,
            approver: session.userName
        });

        const result = await DeviceAuthService.approveRequest(parsed.data.requestId);

        if (!result.success) {
            logger.warn('[API:device/approve] Failed', {
                requestId: parsed.data.requestId,
                error: result.error
            });
            return NextResponse.json({ error: result.error || 'Failed to approve request' }, { status: 400 });
        }

        logger.info('[API:device/approve] Success', {
            requestId: parsed.data.requestId,
            approver: session.userName
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('[API:device/approve] Unexpected error', { error: String(error) });
        return NextResponse.json({ error: 'Failed to approve request' }, { status: 500 });
    }
}
