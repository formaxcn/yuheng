import { NextRequest, NextResponse } from 'next/server';
import { createRecognitionTask, updateRecognitionTask, getUnitPreferences, getSetting } from '@/lib/db';
import { LLMFactory } from '@/lib/llm/factory';
import { promptManager } from '@/lib/prompts';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { image, userPrompt } = body;

        if (!image) {
            return NextResponse.json({ error: 'Image required' }, { status: 400 });
        }

        const taskId = crypto.randomUUID();
        await createRecognitionTask(taskId);

        // Fetch unit preferences to pass to Gemini
        const unitPrefs = await getUnitPreferences();
        const recognitionLang = (await getSetting('recognition_language')) || 'zh';

        const unitInstruction = `\nIMPORTANT: Please provide nutrition values in the following units: 
- Energy: ${unitPrefs.energy} (per 100g)
- Weight: ${unitPrefs.weight}`;

        const langInstruction = recognitionLang === 'en'
            ? `\nIMPORTANT: Please provide the "name" and "description" fields in English.`
            : `\nIMPORTANT: 请使用中文提供 "name" 和 "description" 字段的值。`;

        // Load prompt
        let promptText = await promptManager.getPrompt('dish-init-prompt', {
            energy_unit: unitPrefs.energy === 'kj' ? 'kJ' : 'kcal',
            weight_unit: unitPrefs.weight === 'oz' ? 'oz' : '克',
            lang_instruction: langInstruction
        });

        if (userPrompt) {
            promptText += `\n\nUSER ADDITIONAL INSTRUCTIONS: ${userPrompt}\nPlease prioritize these instructions while maintaining the overall output format.`;
        }

        const imagePart = {
            inlineData: {
                data: image.split(',')[1] || image,
                mimeType: "image/jpeg"
            }
        };

        // Run analysis in background
        (async () => {
            try {
                await updateRecognitionTask(taskId, { status: 'processing' });
                const provider = await LLMFactory.getProvider();
                const dishes = await provider.analyzeImage(imagePart, promptText);
                const dishesWithUnits = dishes.map((d: any) => ({
                    ...d,
                    energy_unit: unitPrefs.energy,
                    weight_unit: unitPrefs.weight
                }));
                await updateRecognitionTask(taskId, { status: 'completed', result: JSON.stringify(dishesWithUnits) });
            } catch (error) {
                logger.error(error as Error, `Failed to process task ${taskId}`);
                await updateRecognitionTask(taskId, { status: 'failed', error: (error as Error).message });
            }
        })();

        return NextResponse.json({ taskId });
    } catch (error) {
        logger.error(error as Error, 'Failed to start recognition task');
        return NextResponse.json({ error: 'Failed to start recognition task' }, { status: 500 });
    }
}
