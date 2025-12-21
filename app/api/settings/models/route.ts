import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const models = [
        { id: 'gemini-2.0-flash', name: 'gemini 2.5 flash' },
        { id: 'gemini-1.5-flash', name: 'gemini 3 flash' },
    ];

    return NextResponse.json(models);
}
