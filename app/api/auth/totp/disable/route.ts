import { NextRequest, NextResponse } from 'next/server';
import { ensureInit, getAdapter } from '@/lib/db/index';
import { AuthService } from '@/lib/auth/auth-service';
import { SessionManager } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
    await ensureInit();
    const db = getAdapter();

    const session = await SessionManager.get();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await AuthService.disableTotp();
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to disable TOTP' }, { status: 500 });
    }
}
