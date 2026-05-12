import { NextRequest, NextResponse } from 'next/server';
import { ensureInit, getAdapter } from '@/lib/db/index';
import { AuthService } from '@/lib/auth/auth-service';
import { SessionManager } from '@/lib/auth/session';
import { z } from 'zod';

const loginSchema = z.object({
    userId: z.string(),
    password: z.string()
});

export async function POST(req: NextRequest) {
    await ensureInit();
    const db = getAdapter();

    const multiUserEnabled = await db.isMultiUserEnabled();
    if (!multiUserEnabled) {
        return NextResponse.json({ error: 'Multi-user mode not enabled' }, { status: 400 });
    }

    try {
        const body = await req.json();
        const parsed = loginSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const result = await AuthService.login(parsed.data.userId, parsed.data.password);

        if (!result.success || !result.user) {
            return NextResponse.json({ error: result.error || 'Login failed' }, { status: 401 });
        }

        await SessionManager.create(result.user.id, result.user.name, result.user.role);

        return NextResponse.json({
            success: true,
            user: {
                id: result.user.id,
                name: result.user.name,
                email: result.user.email,
                avatar: result.user.avatar,
                role: result.user.role
            }
        });
    } catch (error) {
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
