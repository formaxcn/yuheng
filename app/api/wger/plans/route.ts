import { NextRequest, NextResponse } from 'next/server';
import { WgerClient } from '@/lib/wger';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    const token = req.headers.get('x-wger-token');
    const baseUrl = req.headers.get('x-wger-base-url') || process.env.WGER_BASE_URL;

    logger.debug({ hasToken: !!token, hasBaseUrl: !!baseUrl }, 'Fetching plans API called');

    if (!token || !baseUrl) {
        logger.warn('Missing token or base URL in request headers');
        return NextResponse.json({ error: 'Missing token or base URL' }, { status: 400 });
    }

    try {
        const client = new WgerClient(token, baseUrl);
        const plans = await client.getPlans();
        return NextResponse.json({ plans });
    } catch (error: any) {
        // Pino prefers error object first
        logger.error(error, 'Wger API Error');
        if (error.response?.data) logger.debug({ data: error.response.data }, 'Wger API Error Data');
        return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
    }
}
