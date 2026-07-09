import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db/index';
import { DeviceAuthService } from '@/lib/auth/device-auth';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    await ensureInit();

    const requestIdStr = req.nextUrl.searchParams.get('requestId');
    if (!requestIdStr) {
        return NextResponse.json({ error: 'Missing requestId parameter' }, { status: 400 });
    }

    const requestId = parseInt(requestIdStr, 10);
    if (isNaN(requestId)) {
        return NextResponse.json({ error: 'Invalid requestId' }, { status: 400 });
    }

    try {
        const request = await DeviceAuthService.getRequestStatusById(requestId);

        if (!request) {
            logger.warn('[API:device/status] Request not found', { requestId });
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // Only log when status changes to reduce noise from polling
        if (request.status !== 'pending') {
            logger.info('[API:device/status] Status update', {
                requestId,
                status: request.status
            });
        }

        return NextResponse.json({
            status: request.status
        });
    } catch (error) {
        logger.error('[API:device/status] Unexpected error', { requestId, error: String(error) });
        return NextResponse.json({ error: 'Failed to get request status' }, { status: 500 });
    }
}
