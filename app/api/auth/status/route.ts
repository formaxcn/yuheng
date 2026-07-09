import { NextRequest, NextResponse } from 'next/server';
import { ensureInit, DEFAULT_USER_ID, getAdapter } from '@/lib/db/index';
import { UserContext } from '@/lib/db/user-context';
import { SessionManager, setUserContextFromSession } from '@/lib/auth/session';
import { AuthService } from '@/lib/auth/auth-service';

export async function GET(req: NextRequest) {
    await ensureInit();
    const db = getAdapter();

    const multiUserEnabled = await db.isMultiUserEnabled();
    const deviceAuthEnabled = await AuthService.isDeviceAuthEnabled();
    const totpBound = await AuthService.isTotpBound();
    const session = await SessionManager.get();

    let currentUser = null;
    let authenticated = false;

    if (multiUserEnabled) {
        // Multi-user mode: require session
        if (session) {
            await setUserContextFromSession();
            currentUser = await db.getUser(session.userId);
            authenticated = true;
        }
    } else {
        // Single-user mode
        UserContext.set(DEFAULT_USER_ID);
        currentUser = await db.getUser(DEFAULT_USER_ID);

        if (deviceAuthEnabled) {
            // Device auth enabled: require valid device session
            authenticated = !!session;
        } else {
            // No auth needed
            authenticated = true;
        }
    }

    return NextResponse.json({
        multiUserEnabled,
        deviceAuthEnabled,
        totpBound,
        authenticated,
        user: currentUser ? {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            avatar: currentUser.avatar,
            role: currentUser.role
        } : null
    });
}
