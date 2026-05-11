import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db/index';
import { PostgresAdapter } from '@/lib/db/postgres';
import { AuthService } from '@/lib/auth/auth-service';
import { SessionManager } from '@/lib/auth/session';
import { z } from 'zod';

const db = new PostgresAdapter();
const changePasswordSchema = z.object({
    oldPassword: z.string(),
    newPassword: z.string().min(6)
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Admin can set password for any user without old password
    // Regular users can only change their own password, need old password
    const isAdmin = session.role === 'admin';
    const isOwnAccount = session.userId === id;

    if (!isAdmin && !isOwnAccount) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await req.json();

        if (isAdmin && !body.oldPassword) {
            // Admin setting password for someone: only need new password
            const newPassword = z.string().min(6).parse(body.newPassword);
            await AuthService.setPassword(id, newPassword);
            return NextResponse.json({ success: true });
        }

        // Regular user changing own password, or admin changing own password
        const parsed = changePasswordSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request', details: parsed.error }, { status: 400 });
        }

        const success = await AuthService.changePassword(
            id,
            parsed.data.oldPassword,
            parsed.data.newPassword
        );

        if (!success) {
            return NextResponse.json({ error: 'Invalid old password' }, { status: 401 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
    }
}
