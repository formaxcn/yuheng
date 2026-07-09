import bcrypt from 'bcryptjs';
import { getAdapter } from '../db';
import { User } from '../db/types';
import { DEFAULT_USER_ID } from '../db/user-context';
import { TotpService } from './totp';
import { DeviceAuthService } from './device-auth';
import { SessionManager } from './session';

const db = getAdapter();

const BCRYPT_ROUNDS = 12;

export interface LoginResult {
    success: boolean;
    user?: User;
    error?: string;
}

export interface TotpSetupResult {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
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

    // ========================================================================
    // Device Auth Methods
    // ========================================================================

    static async isDeviceAuthEnabled(): Promise<boolean> {
        const value = await db.getSetting('device_auth_enabled', DEFAULT_USER_ID);
        return value === 'true';
    }

    static async enableDeviceAuth(): Promise<void> {
        await db.saveSetting('device_auth_enabled', 'true', DEFAULT_USER_ID);

        // Auto-trust the current device (the one that enabled it)
        const fingerprint = await SessionManager.getDeviceFingerprint();
        if (fingerprint) {
            await DeviceAuthService.createTrustedSession(fingerprint, 'This Device');

            // Create device session cookie for the default user
            const user = await db.getUser(DEFAULT_USER_ID);
            if (user) {
                const sessions = await DeviceAuthService.listSessions();
                const currentSession = sessions.find(s => s.fingerprint === fingerprint);
                if (currentSession) {
                    await SessionManager.createDeviceSession(
                        DEFAULT_USER_ID,
                        user.name,
                        user.role || 'admin',
                        currentSession.id,
                        fingerprint
                    );
                }
            }
        }
    }

    static async disableDeviceAuth(): Promise<void> {
        await db.saveSetting('device_auth_enabled', 'false', DEFAULT_USER_ID);
        await db.saveSetting('totp_secret', '', DEFAULT_USER_ID);
        await db.saveSetting('totp_backup_codes', '[]', DEFAULT_USER_ID);

        // Destroy current session and clear all sessions
        const sessions = await DeviceAuthService.listSessions();
        for (const session of sessions) {
            await DeviceAuthService.revokeSession(session.id);
        }
    }

    static async isTotpBound(): Promise<boolean> {
        const secret = await db.getSetting('totp_secret', DEFAULT_USER_ID);
        return !!secret && secret.length > 0;
    }

    /**
     * Setup TOTP: generate secret, QR code, and backup codes
     * Returns the setup data - caller must verify a code before saving
     */
    static async setupTotp(label: string): Promise<TotpSetupResult> {
        return TotpService.setup(label);
    }

    /**
     * Confirm TOTP setup: verify a code, then save the secret and backup codes
     */
    static async confirmTotpSetup(
        secret: string,
        backupCodes: string[],
        token: string
    ): Promise<{ success: boolean; error?: string }> {
        if (!await TotpService.verify(secret, token)) {
            return { success: false, error: 'Invalid TOTP code' };
        }

        await db.saveSetting('totp_secret', secret, DEFAULT_USER_ID);
        const hashedCodes = await TotpService.hashBackupCodes(backupCodes);
        await db.saveSetting('totp_backup_codes', hashedCodes, DEFAULT_USER_ID);

        return { success: true };
    }

    /**
     * Disable TOTP (remove secret and backup codes)
     */
    static async disableTotp(): Promise<void> {
        await db.saveSetting('totp_secret', '', DEFAULT_USER_ID);
        await db.saveSetting('totp_backup_codes', '[]', DEFAULT_USER_ID);
    }

    /**
     * Verify a TOTP code and create a trusted session
     */
    static async verifyTotpLogin(
        token: string,
        fingerprint: string,
        deviceName: string | null
    ): Promise<{ success: boolean; error?: string }> {
        const secret = await db.getSetting('totp_secret', DEFAULT_USER_ID);
        if (!secret) {
            return { success: false, error: 'TOTP not configured' };
        }

        if (await TotpService.verify(secret, token)) {
            const session = await DeviceAuthService.createTrustedSession(fingerprint, deviceName);
            const user = await db.getUser(DEFAULT_USER_ID);
            await SessionManager.createDeviceSession(
                DEFAULT_USER_ID,
                user?.name || 'Default',
                user?.role || 'admin',
                session.id,
                fingerprint
            );
            return { success: true };
        }

        // Try backup codes
        const backupHashes = await db.getSetting('totp_backup_codes', DEFAULT_USER_ID);
        if (backupHashes) {
            const { valid, remainingHashes } = await TotpService.verifyBackupCode(token, backupHashes);
            if (valid) {
                await db.saveSetting(
                    'totp_backup_codes',
                    TotpService.serializeBackupCodeHashes(remainingHashes),
                    DEFAULT_USER_ID
                );

                const session = await DeviceAuthService.createTrustedSession(fingerprint, deviceName);
                const user = await db.getUser(DEFAULT_USER_ID);
                await SessionManager.createDeviceSession(
                    DEFAULT_USER_ID,
                    user?.name || 'Default',
                    user?.role || 'admin',
                    session.id,
                    fingerprint
                );
                return { success: true };
            }
        }

        return { success: false, error: 'Invalid code' };
    }
}
