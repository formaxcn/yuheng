import { NextRequest, NextResponse } from 'next/server';
import { WgerClient } from '@/lib/wger';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    const token = req.headers.get('x-wger-token');
    const baseUrl = req.headers.get('x-wger-base-url') || process.env.WGER_BASE_URL;

    logger.debug('Fetching plans API called', { hasToken: !!token, hasBaseUrl: !!baseUrl });

    if (!token || !baseUrl) {
        logger.warn('Missing token or base URL in request headers');
        return NextResponse.json({ error: 'Missing token or base URL' }, { status: 400 });
    }

    try {
        const client = new WgerClient(token, baseUrl);
        const plans = await client.getPlans();
        return NextResponse.json({ plans });
    } catch (error: any) {
        logger.error('Wger API Error:', error.response?.data || error.message);
        return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
    }
}
