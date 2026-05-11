import { ILLMProvider } from './interface';
import { GeminiProvider } from './providers/gemini';
import { OpenAIProvider } from './providers/openai';
import { ZhipuProvider } from './providers/zhipu';
import { getSetting } from '../db';
import { logger } from '../logger';

export type LLMProviderType = 'gemini' | 'openai' | 'openai-compatible' | 'zhipu';

const ENV_API_KEYS: Record<string, string> = {
    'gemini': 'GEMINI_API_KEY',
    'openai': 'OPENAI_API_KEY',
    'openai-compatible': 'OPENAI_API_KEY',
    'zhipu': 'ZHIPU_API_KEY',
};

export const DEFAULT_MODELS: Record<LLMProviderType, { id: string; name: string }[]> = {
    'gemini': [
        { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (High-Speed Vision)' },
        { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Complex Visual Logic)' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Reliable)' },
    ],
    'openai': [
        { id: 'gpt-4o', name: 'GPT-4o (Omni)' },
        { id: 'gpt-4o-mini', name: 'GPT-4o mini (Vision Lite)' },
    ],
    'openai-compatible': [
        { id: 'mimo-v2-flash', name: 'MiMo-V2 Flash (Xiaomi Vision)' },
        { id: 'grok-4-fast', name: 'Grok 4 Fast (Vision/Search)' },
        { id: 'grok-4.1-fast', name: 'Grok 4.1 Fast (Agentic Vision)' },
        { id: 'qwen-vl-max-2025', name: 'Qwen-VL Max (Professional OCR)' },
        { id: 'qwen2.5-vl-7b-instruct', name: 'Qwen2.5-VL (Open Source Choice)' },
        { id: 'doubao-vision-pro', name: 'Doubao Vision Pro (Fast)' },
        { id: 'deepseek-v3.2', name: 'DeepSeek V3.2 (Vision Enabled)' }
    ],
    'zhipu': [
        { id: 'glm-4.6v-flash', name: 'GLM-4.6V-Flash (Default)' },
        { id: 'glm-4v-flash', name: 'GLM-4V Flash (Always Free Vision)' }
    ]
};

function getProviderFromEnv(providerType: LLMProviderType): string | undefined {
    const envKey = ENV_API_KEYS[providerType];
    if (envKey && process.env[envKey]) {
        return process.env[envKey];
    }

    // Also check common fallbacks
    if (providerType === 'openai-compatible') {
        const keys = ['DASHSCOPE_API_KEY', 'DOUBAO_API_KEY', 'DEEPSEEK_API_KEY', 'XAI_API_KEY', 'MIMO_API_KEY'];
        for (const key of keys) {
            if (process.env[key]) return process.env[key];
        }
    }

    return undefined;
}

export class LLMFactory {
    static async getProvider(): Promise<ILLMProvider> {
        const providerType = (await getSetting('llm_provider')) as LLMProviderType || 'gemini';
        const model = await getSetting('llm_model') || 'gemini-2.5-flash';
        const baseUrl = await getSetting('llm_base_url') || '';

        // First try database setting, then fall back to environment variable
        let apiKey = await getSetting('llm_api_key') || '';
        if (!apiKey) {
            apiKey = getProviderFromEnv(providerType) || '';
        }

        logger.debug({ providerType, model, hasApiKey: !!apiKey }, "Instantiating LLM provider");

        switch (providerType) {
            case 'openai':
                return new OpenAIProvider(apiKey, model);
            case 'openai-compatible':
                return new OpenAIProvider(apiKey, model, baseUrl);
            case 'zhipu':
                return new ZhipuProvider(apiKey, model);
            case 'gemini':
            default:
                return new GeminiProvider(apiKey, model);
        }
    }
}
