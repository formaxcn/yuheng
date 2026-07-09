import { NextRequest, NextResponse } from 'next/server';
import { ensureInit, getAdapter, DEFAULT_USER_ID } from '@/lib/db/index';
import { AuthService } from '@/lib/auth/auth-service';
import { SessionManager } from '@/lib/auth/session';
import { TotpService } from '@/lib/auth/totp';
import { z } from 'zod';

const disableSchema = z.object({
    token: z.string()
});

export async function POST(req: NextRequest) {
    await ensureInit();
    const db = getAdapter();

    const session = await SessionManager.get();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const parsed = disableSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        // Verify TOTP token before disabling
        const secret = await db.getSetting('totp_secret', DEFAULT_USER_ID);
        if (!secret) {
            return NextResponse.json({ error: 'TOTP not configured' }, { status: 400 });
        }

        const valid = await TotpService.verify(secret, parsed.data.token);
        if (!valid) {
            // Try backup codes
            const backupHashes = await db.getSetting('totp_backup_codes', DEFAULT_USER_ID);
            if (backupHashes) {
                const { valid: backupValid } = await TotpService.verifyBackupCode(parsed.data.token, backupHashes);
                if (!backupValid) {
                    return NextResponse.json({ error: 'Invalid TOTP code' }, { status: 400 });
                }
            } else {
                return NextResponse.json({ error: 'Invalid TOTP code' }, { status: 400 });
            }
        }

        await AuthService.disableTotp();
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to disable TOTP' }, { status: 500 });
    }
}
