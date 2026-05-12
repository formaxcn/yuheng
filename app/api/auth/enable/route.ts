import { NextRequest, NextResponse } from 'next/server';
import { ensureInit, DEFAULT_USER_ID, getAdapter } from '@/lib/db/index';
import { AuthService } from '@/lib/auth/auth-service';
import { SessionManager } from '@/lib/auth/session';
import { z } from 'zod';

const enableSchema = z.object({
    adminPassword: z.string().min(6)
});

export async function POST(req: NextRequest) {
    await ensureInit();
    const db = getAdapter();

    const multiUserEnabled = await db.isMultiUserEnabled();
    if (multiUserEnabled) {
        return NextResponse.json({ error: 'Multi-user mode already enabled' }, { status: 400 });
    }

    try {
        const body = await req.json();
        const parsed = enableSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        await AuthService.enableMultiUserMode(parsed.data.adminPassword);

        // Auto login as default user
        await SessionManager.create(DEFAULT_USER_ID, 'Default', 'admin');

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to enable multi-user mode' }, { status: 500 });
    }
}
