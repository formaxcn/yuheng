import { TOTP } from 'otplib';
import { NobleCryptoPlugin } from 'otplib';
import { ScureBase32Plugin } from 'otplib';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const BACKUP_CODE_COUNT = 8;

// Create a shared TOTP instance with plugins
// period: 60s means each code is valid for ~2min (with default tolerance window)
const totp = new TOTP({
    crypto: new NobleCryptoPlugin(),
    base32: new ScureBase32Plugin(),
    period: 60,
});

export interface TotpSetupResult {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
}

export class TotpService {
    /**
     * Generate a new TOTP secret
     */
    static generateSecret(): string {
        return totp.generateSecret();
    }

    /**
     * Build the otpauth:// URI for QR code generation
     */
    static buildOtpAuthUri(secret: string, label: string, issuer: string = 'YuHeng'): string {
        return totp.toURI({ secret, label, issuer });
    }

    /**
     * Generate QR code as data URL from an otpauth URI
     */
    static async generateQrCode(otpauthUri: string): Promise<string> {
        return QRCode.toDataURL(otpauthUri, {
            width: 256,
            margin: 1,
        });
    }

    /**
     * Full TOTP setup: generate secret, QR code, and backup codes
     */
    static async setup(label: string): Promise<TotpSetupResult> {
        const secret = this.generateSecret();
        const otpauthUri = this.buildOtpAuthUri(secret, label);
        const qrCodeUrl = await this.generateQrCode(otpauthUri);
        const backupCodes = this.generateBackupCodes();

        return { secret, qrCodeUrl, backupCodes };
    }

    /**
     * Verify a TOTP token against a secret (async in v13)
     */
    static async verify(secret: string, token: string): Promise<boolean> {
        try {
            const result = await totp.verify(token, { secret });
            return result.valid;
        } catch {
            return false;
        }
    }

    /**
     * Generate one-time backup codes (8 codes, 8 chars each, alphanumeric)
     */
    static generateBackupCodes(count: number = BACKUP_CODE_COUNT): string[] {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const codes: string[] = [];
        for (let i = 0; i < count; i++) {
            const bytes = randomBytes(8);
            let code = '';
            for (let j = 0; j < 8; j++) {
                code += chars[bytes[j] % chars.length];
            }
            codes.push(code);
        }
        return codes;
    }

    /**
     * Hash backup codes for storage (each code hashed individually)
     */
    static async hashBackupCodes(codes: string[]): Promise<string> {
        const hashed = await Promise.all(codes.map(c => bcrypt.hash(c, 10)));
        return JSON.stringify(hashed);
    }

    /**
     * Verify a backup code against stored hashes, returns true if matched
     * The matched code index is returned so it can be removed
     */
    static async verifyBackupCode(
        code: string,
        storedHashesJson: string
    ): Promise<{ valid: boolean; remainingHashes: string[] }> {
        try {
            const hashes: string[] = JSON.parse(storedHashesJson);
            for (let i = 0; i < hashes.length; i++) {
                if (await bcrypt.compare(code, hashes[i])) {
                    const remaining = [...hashes.slice(0, i), ...hashes.slice(i + 1)];
                    return { valid: true, remainingHashes: remaining };
                }
            }
            return { valid: false, remainingHashes: hashes };
        } catch {
            return { valid: false, remainingHashes: [] };
        }
    }

    /**
     * Serialize remaining backup code hashes for storage
     */
    static serializeBackupCodeHashes(hashes: string[]): string {
        return JSON.stringify(hashes);
    }
}
