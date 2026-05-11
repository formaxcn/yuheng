import { UserContext } from '../db/user-context';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'user_session';
const SESSION_EXPIRE_DAYS = 1;

export interface Session {
    userId: string;
    userName: string;
    role: string;
    createdAt: number;
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
        const ageMs = Date.now() - session.createdAt;
        const maxAgeMs = SESSION_EXPIRE_DAYS * 24 * 60 * 60 * 1000;
        return ageMs > maxAgeMs;
    }

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

        return session;
    }

    static async destroy(): Promise<void> {
        const cookieStore = await cookies();
        cookieStore.delete(SESSION_COOKIE);
    }

    static async isAuthenticated(): Promise<boolean> {
        return (await this.get()) !== null;
    }

    static async getCurrentUserId(): Promise<string | null> {
        return (await this.get())?.userId ?? null;
    }
}

export async function setUserContextFromSession(): Promise<void> {
    const session = await SessionManager.get();
    if (session) {
        UserContext.set(session.userId);
    }
}
