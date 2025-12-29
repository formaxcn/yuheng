import { NextRequest, NextResponse } from 'next/server';
import { getSetting } from '@/lib/db';
import { DEFAULT_MODELS, LLMProviderType } from '@/lib/llm/factory';

export async function GET(req: NextRequest) {
    const provider = (await getSetting('llm_provider')) as LLMProviderType || 'gemini';
    const models = DEFAULT_MODELS[provider] || [];

    return NextResponse.json(models);
}
