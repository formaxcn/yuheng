import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const models = [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    ];

    return NextResponse.json(models);
}
