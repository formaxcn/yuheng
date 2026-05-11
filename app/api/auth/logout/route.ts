import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
    await SessionManager.destroy();
    return NextResponse.json({ success: true });
}
