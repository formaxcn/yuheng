import { NextRequest, NextResponse } from 'next/server';
import { createRecognitionTask, updateRecognitionTask, getUnitPreferences, getSetting } from '@/lib/db';
import { analyzeImage } from '@/lib/gemini';
import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { image } = body;

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
        const promptPath = path.join(process.cwd(), 'prompts', 'gemini-dish-init-prompt.txt');
        let promptText = fs.readFileSync(promptPath, 'utf-8');

        // Inject units into prompt
        if (unitPrefs.energy === 'kj') {
            promptText = promptText.replace('每100克的估算热量（kcal）', '每100克的估算热量（kJ）');
        }
        if (unitPrefs.weight === 'oz') {
            promptText = promptText.replace('估算的分量（克）', '估算的分量（oz）');
        }

        promptText += unitInstruction;
        promptText += langInstruction;

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
                const dishes = await analyzeImage(imagePart, promptText);
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
