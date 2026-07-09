import { UserContext } from '../db/user-context';
import { cookies, headers } from 'next/headers';
import { getAdapter } from '../db';

const SESSION_COOKIE = 'user_session';
const DEVICE_FP_COOKIE = 'device_fp';
const SESSION_EXPIRE_DAYS = 1;
// Device auth sessions never expire - cookie lasts 10 years
const DEVICE_SESSION_COOKIE_MAX_AGE = 10 * 365 * 24 * 60 * 60;

export interface Session {
    userId: string;
    userName: string;
    role: string;
    createdAt: number;
    sessionId?: number;
    fingerprint?: string;
}

export class SessionManager {
    private static encode(session: Session): string {
        return Buffer.from(JSON.stringify(session)).toString('base64');
    }

    private static decode(encoded: string): Session | null {
        try {
            return JSON.parse(Buffer.from(encoded, 'base64').toString());
        } catch {
            return null;
        }
    }

    private static isExpired(session: Session): boolean {
        // Device auth sessions never expire
        if (session.sessionId) return false;
        // Multi-user sessions expire after SESSION_EXPIRE_DAYS
        const ageMs = Date.now() - session.createdAt;
        const maxAgeMs = SESSION_EXPIRE_DAYS * 24 * 60 * 60 * 1000;
        return ageMs > maxAgeMs;
    }

    /**
     * Create a standard session (multi-user mode, cookie-only)
     */
    static async create(userId: string, userName: string, role: string): Promise<void> {
        const session: Session = {
            userId,
            userName,
            role,
            createdAt: Date.now()
        };
        const cookieStore = await cookies();
        cookieStore.set(SESSION_COOKIE, this.encode(session), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: SESSION_EXPIRE_DAYS * 24 * 60 * 60,
            path: '/'
        });
    }

    /**
     * Create a device-auth session (DB-backed, long-lived)
     */
    static async createDeviceSession(
        userId: string,
        userName: string,
        role: string,
        sessionId: number,
        fingerprint: string
    ): Promise<void> {
        const session: Session = {
            userId,
            userName,
            role,
            createdAt: Date.now(),
            sessionId,
            fingerprint
        };
        const cookieStore = await cookies();
        cookieStore.set(SESSION_COOKIE, this.encode(session), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: DEVICE_SESSION_COOKIE_MAX_AGE,
            path: '/'
        });
    }

    /**
     * Get the current session from the cookie.
     * If the session has a sessionId (device auth), validates against the DB.
     */
    static async get(): Promise<Session | null> {
        const cookieStore = await cookies();
        const cookie = cookieStore.get(SESSION_COOKIE)?.value;
        if (!cookie) return null;

        const session = this.decode(cookie);
        if (!session) return null;
        if (this.isExpired(session)) {
            await this.destroy();
            return null;
        }

        // If this is a DB-backed session (device auth), validate against DB
        if (session.sessionId && session.fingerprint) {
            try {
                const db = getAdapter();
                const dbSession = await db.getSession(session.sessionId);
                if (!dbSession || dbSession.fingerprint !== session.fingerprint) {
                    // Session revoked or fingerprint mismatch
                    await this.destroy();
                    return null;
                }
            } catch {
                // DB not available, fall back to cookie-only validation
                // This handles edge cases during startup
            }
        }

        return session;
    }

    static async destroy(): Promise<void> {
        const cookieStore = await cookies();

        // If this is a DB-backed session, delete from DB
        const cookie = cookieStore.get(SESSION_COOKIE)?.value;
        if (cookie) {
            const session = this.decode(cookie);
            if (session?.sessionId) {
                try {
                    const db = getAdapter();
                    await db.deleteSession(session.sessionId);
                } catch {
                    // Ignore DB errors during destroy
                }
            }
        }

        cookieStore.delete(SESSION_COOKIE);
    }

    static async isAuthenticated(): Promise<boolean> {
        return (await this.get()) !== null;
    }

    static async getCurrentUserId(): Promise<string | null> {
        return (await this.get())?.userId ?? null;
    }

    /**
     * Read the device fingerprint from the request header or cookie.
     * The client sends it as X-Device-FP header or device_fp cookie.
     */
    static async getDeviceFingerprint(): Promise<string | null> {
        // Try header first
        const headerStore = await headers();
        const fpHeader = headerStore.get('x-device-fp');
        if (fpHeader) return fpHeader;

        // Fall back to cookie
        const cookieStore = await cookies();
        return cookieStore.get(DEVICE_FP_COOKIE)?.value ?? null;
    }
}

export async function setUserContextFromSession(): Promise<void> {
    const session = await SessionManager.get();
    if (session) {
        UserContext.set(session.userId);
    }
}
