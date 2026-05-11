import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db/index';
import { PostgresAdapter } from '@/lib/db/postgres';
import { SessionManager } from '@/lib/auth/session';
import { z } from 'zod';

const db = new PostgresAdapter();
const updateUserSchema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional().nullable(),
    avatar: z.string().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    await ensureInit();
    const { id } = await params;

    const multiUserEnabled = await db.isMultiUserEnabled();
    if (!multiUserEnabled) {
        return NextResponse.json({ error: 'Multi-user mode not enabled' }, { status: 400 });
    }

    const session = await SessionManager.get();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin can update any user, regular users can only update themselves
    if (session.role !== 'admin' && session.userId !== id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const parsed = updateUserSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request', details: parsed.error }, { status: 400 });
        }

        await db.updateUser(id, parsed.data);
        const updatedUser = await db.getUser(id);

        return NextResponse.json({
            success: true,
            user: updatedUser ? {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                avatar: updatedUser.avatar,
                role: updatedUser.role
            } : null
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    await ensureInit();
    const { id } = await params;

    const multiUserEnabled = await db.isMultiUserEnabled();
    if (!multiUserEnabled) {
        return NextResponse.json({ error: 'Multi-user mode not enabled' }, { status: 400 });
    }

    const session = await SessionManager.get();
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cannot delete the default user
    if (id === '00000000-0000-0000-0000-000000000000') {
        return NextResponse.json({ error: 'Cannot delete default user' }, { status: 400 });
    }

    // Cannot delete yourself
    if (id === session.userId) {
        return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    try {
        await db.deleteUser(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
