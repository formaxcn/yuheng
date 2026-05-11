import { createRecognitionTask, updateRecognitionTask, getUnitPreferences, getSetting, RecognizedDish } from './db';
import { LLMFactory } from './llm/factory';
import { promptManager } from './prompts';
import { logger } from './logger';

export async function executeRecognition(data: { taskId: string, imageBase64: string, userPrompt?: string }) {
    const { taskId, imageBase64, userPrompt } = data;
    try {
        await updateRecognitionTask(taskId, { status: 'processing' });

        // Fetch settings inside the async task to ensure fresh data
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
            weight_unit: unitPrefs.weight === 'oz' ? 'oz' : 'g',
            lang_instruction: langInstruction
        });

        if (userPrompt) {
            promptText += `\n\nUSER ADDITIONAL INSTRUCTIONS: ${userPrompt}\nPlease prioritize these instructions while maintaining the overall output format.`;
        }

        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: "image/jpeg"
            }
        };

        const provider = await LLMFactory.getProvider();
        const dishes = await provider.analyzeImage(imagePart, promptText);
        const dishesWithUnits = dishes.map((d: RecognizedDish) => ({
            ...d,
            energy_unit: unitPrefs.energy,
            weight_unit: unitPrefs.weight
        }));
        await updateRecognitionTask(taskId, { status: 'completed', result: JSON.stringify(dishesWithUnits) });
    } catch (error) {
        logger.error(error as Error, `Failed to process task ${taskId}`);
        await updateRecognitionTask(taskId, { status: 'failed', error: (error as Error).message });
        // Re-throw to allow pg-boss to handle retries
        throw error;
    }
}
