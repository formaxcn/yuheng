import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db/index';
import { DeviceAuthService } from '@/lib/auth/device-auth';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const requestSchema = z.object({
    deviceName: z.string().optional()
});

export async function POST(req: NextRequest) {
    await ensureInit();

    try {
        const body = await req.json();
        const parsed = requestSchema.safeParse(body);

        if (!parsed.success) {
            logger.warn('[API:device/request] Invalid request body', { body });
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        logger.info('[API:device/request] New device request', { deviceName: parsed.data.deviceName });

        const request = await DeviceAuthService.createRequest(parsed.data.deviceName ?? null);

        logger.info('[API:device/request] Created', { requestId: request.id, deviceName: parsed.data.deviceName });

        return NextResponse.json({
            requestId: request.id
        });
    } catch (error) {
        logger.error('[API:device/request] Unexpected error', { error: String(error) });
        return NextResponse.json({ error: 'Failed to create device request' }, { status: 500 });
    }
}
