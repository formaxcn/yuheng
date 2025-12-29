import { ILLMProvider } from './interface';
import { GeminiProvider } from './providers/gemini';
import { OpenAIProvider } from './providers/openai';
import { getSetting } from '@/lib/db';
import { logger } from '@/lib/logger';

export type LLMProviderType = 'gemini' | 'openai' | 'openai-compatible';

export const DEFAULT_MODELS: Record<LLMProviderType, { id: string; name: string }[]> = {
    'gemini': [
        // Gemini 3 系列原生支持视频和图片理解，Flash 预览版 API 额度极高
        { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (High-Speed Vision)' },
        { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Complex Visual Logic)' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Reliable)' },
    ],
    'openai': [
        { id: 'gpt-4o', name: 'GPT-4o (Omni)' },
        { id: 'gpt-4o-mini', name: 'GPT-4o mini (Vision Lite)' },
    ],
    'openai-compatible': [
        // --- 2025 榜单明星：小米 MiMo (API 限时免费且支持多模态) ---
        { id: 'mimo-v2-flash', name: 'MiMo-V2 Flash (Xiaomi Vision)' },

        // --- xAI Grok: 2025 最新版已支持 Point-and-Say 实时视觉 ---
        { id: 'grok-4-fast', name: 'Grok 4 Fast (Vision/Search)' },
        { id: 'grok-4.1-fast', name: 'Grok 4.1 Fast (Agentic Vision)' },

        // --- 智谱 GLM: 唯一明确“API永久免费”的多模态模型 ---
        { id: 'glm-4v-flash', name: 'GLM-4V Flash (Always Free Vision)' },

        // --- 阿里 Qwen: 视觉理解公认的国产最强 ---
        { id: 'qwen-vl-max-2025', name: 'Qwen-VL Max (Professional OCR)' },
        { id: 'qwen2.5-vl-7b-instruct', name: 'Qwen2.5-VL (Open Source Choice)' },

        // --- 字节 豆包: 生活场景识别最快 ---
        { id: 'doubao-vision-pro', name: 'Doubao Vision Pro (Fast)' },

        // --- DeepSeek: 高性价比多模态 ---
        { id: 'deepseek-v3.2', name: 'DeepSeek V3.2 (Vision Enabled)' }
    ]
};

export class LLMFactory {
    static async getProvider(): Promise<ILLMProvider> {
        const providerType = (await getSetting('llm_provider')) as LLMProviderType || 'gemini';
        const apiKey = await getSetting('llm_api_key') || '';
        const model = await getSetting('llm_model') || 'gemini-2.5-flash';
        const baseUrl = await getSetting('llm_base_url') || '';

        logger.debug({ providerType, model, hasApiKey: !!apiKey }, "Instantiating LLM provider");

        switch (providerType) {
            case 'openai':
                return new OpenAIProvider(apiKey, model);
            case 'openai-compatible':
                return new OpenAIProvider(apiKey, model, baseUrl);
            case 'gemini':
            default:
                return new GeminiProvider(apiKey, model);
        }
    }
}
