import { NextRequest, NextResponse } from 'next/server';
import { ensureInit, getAdapter, DEFAULT_USER_ID } from '@/lib/db/index';
import { AuthService } from '@/lib/auth/auth-service';
import { SessionManager } from '@/lib/auth/session';
import { TotpService } from '@/lib/auth/totp';
import { DeviceAuthService } from '@/lib/auth/device-auth';
import { z } from 'zod';

const confirmSchema = z.object({
    secret: z.string(),
    backupCodes: z.array(z.string()),
    token: z.string()
});

export async function POST(req: NextRequest) {
    await ensureInit();
    const db = getAdapter();

    const deviceAuthEnabled = await AuthService.isDeviceAuthEnabled();

    // After device auth is enabled, require session to change TOTP
    if (deviceAuthEnabled) {
        const session = await SessionManager.get();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const body = await req.json();
        const parsed = confirmSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const { secret, backupCodes, token } = parsed.data;

        // Verify TOTP token
        const valid = await TotpService.verify(secret, token);
        if (!valid) {
            return NextResponse.json({ error: 'Invalid TOTP code' }, { status: 400 });
        }

        // Save TOTP secret and backup codes
        await db.saveSetting('totp_secret', secret, DEFAULT_USER_ID);
        const hashedCodes = await TotpService.hashBackupCodes(backupCodes);
        await db.saveSetting('totp_backup_codes', hashedCodes, DEFAULT_USER_ID);

        // If device auth not yet enabled, enable it now + create trusted session
        if (!deviceAuthEnabled) {
            await db.saveSetting('device_auth_enabled', 'true', DEFAULT_USER_ID);

            const fingerprint = await SessionManager.getDeviceFingerprint();
            if (fingerprint) {
                const session = await DeviceAuthService.createTrustedSession(fingerprint, 'This Device');
                const user = await db.getUser(DEFAULT_USER_ID);
                if (user) {
                    await SessionManager.createDeviceSession(
                        DEFAULT_USER_ID,
                        user.name,
                        user.role || 'admin',
                        session.id,
                        fingerprint
                    );
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to confirm TOTP setup' }, { status: 500 });
    }
}
