import bcrypt from 'bcryptjs';
import { getAdapter } from '../db';
import { User } from '../db/types';
import { DEFAULT_USER_ID } from '../db/user-context';

const db = getAdapter();

const BCRYPT_ROUNDS = 12;

export interface LoginResult {
    success: boolean;
    user?: User;
    error?: string;
}

export class AuthService {
    static async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    static async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    static async login(userId: string, password: string): Promise<LoginResult> {
        const user = await db.getUser(userId);
        if (!user) {
            return { success: false, error: 'User not found' };
        }

        if (!user.password_hash) {
            return { success: false, error: 'Password not set' };
        }

        const valid = await this.verifyPassword(password, user.password_hash);
        if (!valid) {
            return { success: false, error: 'Invalid password' };
        }

        await db.updateLastLogin(userId);
        return { success: true, user };
    }

    static async setPassword(userId: string, password: string): Promise<void> {
        const password_hash = await this.hashPassword(password);
        await db.updateUser(userId, { password_hash });
    }

    static async enableMultiUserMode(adminPassword: string): Promise<void> {
        // Set password for default user
        await this.setPassword(DEFAULT_USER_ID, adminPassword);

        // Make default user an admin
        await db.updateUser(DEFAULT_USER_ID, { role: 'admin' });

        // Enable multi-user mode
        await db.saveSetting('multi_user_enabled', 'true', DEFAULT_USER_ID);
    }

    static async disableMultiUserMode(): Promise<void> {
        await db.saveSetting('multi_user_enabled', 'false', DEFAULT_USER_ID);
    }

    static async createUser(
        name: string,
        email: string | null,
        password: string,
        avatar?: string
    ): Promise<User> {
        const password_hash = await this.hashPassword(password);
        return db.createUser({
            name,
            email: email || undefined,
            password_hash,
            avatar,
            is_active: true,
            is_default: false,
            role: 'user'
        });
    }

    static async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
        const user = await db.getUser(userId);
        if (!user?.password_hash) {
            return false;
        }

        const valid = await this.verifyPassword(oldPassword, user.password_hash);
        if (!valid) {
            return false;
        }

        await this.setPassword(userId, newPassword);
        return true;
    }
}
