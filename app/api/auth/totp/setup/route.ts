import { NextRequest, NextResponse } from 'next/server';
import { ensureInit, getAdapter } from '@/lib/db/index';
import { AuthService } from '@/lib/auth/auth-service';
import { SessionManager } from '@/lib/auth/session';
import { z } from 'zod';

const setupSchema = z.object({
    label: z.string()
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
        const parsed = setupSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const result = await AuthService.setupTotp(parsed.data.label);

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to setup TOTP' }, { status: 500 });
    }
}
