import { NextRequest, NextResponse } from 'next/server';
import { ensureInit, getAdapter } from '@/lib/db/index';
import { AuthService } from '@/lib/auth/auth-service';
import { SessionManager } from '@/lib/auth/session';
import { z } from 'zod';

const createUserSchema = z.object({
    name: z.string().min(1),
    email: z.string().email().optional().nullable(),
    password: z.string().min(6),
    avatar: z.string().optional()
});

export async function GET(req: NextRequest) {
    await ensureInit();
    const db = getAdapter();

    const multiUserEnabled = await db.isMultiUserEnabled();
    if (!multiUserEnabled) {
        return NextResponse.json({ error: 'Multi-user mode not enabled' }, { status: 400 });
    }

    const session = await SessionManager.get();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const users = await db.listUsers();
        return NextResponse.json({
            users: users.map((u: any) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                avatar: u.avatar,
                role: u.role,
                last_login_at: u.last_login_at
            }))
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    await ensureInit();
    const db = getAdapter();

    const multiUserEnabled = await db.isMultiUserEnabled();
    if (!multiUserEnabled) {
        return NextResponse.json({ error: 'Multi-user mode not enabled' }, { status: 400 });
    }

    const session = await SessionManager.get();
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const parsed = createUserSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request', details: parsed.error }, { status: 400 });
        }

        const user = await AuthService.createUser(
            parsed.data.name,
            parsed.data.email || null,
            parsed.data.password,
            parsed.data.avatar
        );

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role
            }
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
