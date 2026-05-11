import { NextRequest, NextResponse } from 'next/server';
import { ensureInit, DEFAULT_USER_ID } from '@/lib/db/index';
import { PostgresAdapter } from '@/lib/db/postgres';
import { UserContext } from '@/lib/db/user-context';
import { SessionManager, setUserContextFromSession } from '@/lib/auth/session';

const db = new PostgresAdapter();

export async function GET(req: NextRequest) {
    await ensureInit();

    const multiUserEnabled = await db.isMultiUserEnabled();
    const session = await SessionManager.get();

    // Single-user mode: always use default user
    let currentUser = null;
    if (multiUserEnabled && session) {
        await setUserContextFromSession();
        currentUser = await db.getUser(session.userId);
    } else if (!multiUserEnabled) {
        UserContext.set(DEFAULT_USER_ID);
        currentUser = await db.getUser(DEFAULT_USER_ID);
    }

    return NextResponse.json({
        multiUserEnabled,
        authenticated: !!session || !multiUserEnabled,
        user: currentUser ? {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            avatar: currentUser.avatar,
            role: currentUser.role
        } : null
    });
}
