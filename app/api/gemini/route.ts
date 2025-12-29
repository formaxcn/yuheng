import { NextRequest, NextResponse } from 'next/server';
import { getUnitPreferences, getSetting } from '@/lib/db';
import { logger } from '@/lib/logger';
import { promptManager } from '@/lib/prompts';
import { LLMFactory } from '@/lib/llm/factory';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { image, mode, prompt: userPrompt, dish } = body;
        // mode: 'init' | 'fix'
        // image: base64 string (without prefix ideally, or handle it)

        const unitPrefs = await getUnitPreferences();
        const recognitionLang = (await getSetting('recognition_language')) || 'zh';

        const langInstruction = recognitionLang === 'en'
            ? `IMPORTANT: Please provide the "name" and "description" fields in English.`
            : `IMPORTANT: 请使用中文提供 "name" 和 "description" 字段的值。`;

        const commonVariables = {
            energy_unit: unitPrefs.energy === 'kj' ? 'kJ' : 'kcal',
            weight_unit: unitPrefs.weight === 'oz' ? 'oz' : '克',
            lang_instruction: langInstruction,
        };

        const provider = await LLMFactory.getProvider();

        if (mode === 'fix') {
            const fullPrompt = await promptManager.getPrompt('gemini-dish-fix-prompt', {
                ...commonVariables,
                user_prompt: userPrompt,
                original_dish: JSON.stringify(dish),
            });

            const text = await provider.generateContent(fullPrompt);
            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
            let resultData = JSON.parse(jsonStr);

            // Ensure units are attached to the result
            resultData = {
                ...resultData,
                energy_unit: unitPrefs.energy,
                weight_unit: unitPrefs.weight
            };

            return NextResponse.json(resultData);
        }

        // Default 'init'
        if (!image) {
            return NextResponse.json({ error: 'Image required' }, { status: 400 });
        }

        const promptText = await promptManager.getPrompt('gemini-dish-init-prompt', commonVariables);

        const imagePart = {
            inlineData: {
                data: image.split(',')[1] || image,
                mimeType: "image/jpeg" // Simplified
            }
        };

        const dishes = await provider.analyzeImage(imagePart, promptText);
        return NextResponse.json(dishes);

    } catch (error: any) {
        logger.error(error, 'LLM API Route Error');
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
