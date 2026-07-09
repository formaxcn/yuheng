import { NextRequest, NextResponse } from 'next/server';
import { ensureInit, getAdapter } from '@/lib/db/index';
import { AuthService } from '@/lib/auth/auth-service';

export async function POST(req: NextRequest) {
    await ensureInit();
    const db = getAdapter();

    // Check if device auth is already enabled
    const deviceAuthEnabled = await AuthService.isDeviceAuthEnabled();
    if (deviceAuthEnabled) {
        return NextResponse.json({ error: 'Device auth already enabled' }, { status: 400 });
    }

    try {
        // Generate TOTP setup data (not saved yet - saved on confirm)
        const totpSetup = await AuthService.setupTotp('YuHeng');
        return NextResponse.json(totpSetup);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to generate TOTP setup' }, { status: 500 });
    }
}
