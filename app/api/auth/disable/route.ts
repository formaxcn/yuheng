import { NextRequest, NextResponse } from 'next/server';
import { ensureInit, getAdapter } from '@/lib/db/index';
import { AuthService } from '@/lib/auth/auth-service';
import { SessionManager } from '@/lib/auth/session';
import { z } from 'zod';

const disableSchema = z.object({
    password: z.string()
});

export async function POST(req: NextRequest) {
    await ensureInit();
    const db = getAdapter();

    const session = await SessionManager.get();
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const parsed = disableSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        // Verify admin password
        const result = await AuthService.login(session.userId, parsed.data.password);
        if (!result.success) {
            return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
        }

        await AuthService.disableMultiUserMode();
        await SessionManager.destroy();

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to disable multi-user mode' }, { status: 500 });
    }
}
