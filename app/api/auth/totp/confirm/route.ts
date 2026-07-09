import { NextRequest, NextResponse } from 'next/server';
import { ensureInit, getAdapter } from '@/lib/db/index';
import { AuthService } from '@/lib/auth/auth-service';
import { SessionManager } from '@/lib/auth/session';
import { z } from 'zod';

const confirmSchema = z.object({
    secret: z.string(),
    backupCodes: z.array(z.string()),
    token: z.string()
});

export async function POST(req: NextRequest) {
    await ensureInit();
    const db = getAdapter();

    const session = await SessionManager.get();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const parsed = confirmSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const result = await AuthService.confirmTotpSetup(
            parsed.data.secret,
            parsed.data.backupCodes,
            parsed.data.token
        );

        if (!result.success) {
            return NextResponse.json({ error: result.error || 'Confirmation failed' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to confirm TOTP setup' }, { status: 500 });
    }
}
