import { NextRequest, NextResponse } from 'next/server';
import { ensureInit, DEFAULT_USER_ID, getAdapter } from '@/lib/db/index';
import { UserContext } from '@/lib/db/user-context';
import { SessionManager, setUserContextFromSession } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
    await ensureInit();
    const db = getAdapter();

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
