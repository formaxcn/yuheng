import { NextRequest, NextResponse } from 'next/server';
import { analyzeImage, fixDish } from '@/lib/gemini';
import fs from 'fs';
import path from 'path';
import { getUnitPreferences } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { image, mode, prompt: userPrompt, dish } = body;
        // mode: 'init' | 'fix'
        // image: base64 string (without prefix ideally, or handle it)

        if (mode === 'fix') {
            const unitPrefs = getUnitPreferences();
            const unitInstruction = `\nIMPORTANT: Please provide nutrition values in the following units: 
- Energy: ${unitPrefs.energy} (per 100g)
- Weight: ${unitPrefs.weight}`;

            const promptPath = path.join(process.cwd(), 'prompts', 'gemini-dish-fix-prompt.txt');
            let basePrompt = fs.readFileSync(promptPath, 'utf-8');

            if (unitPrefs.energy === 'kj') {
                basePrompt = basePrompt.replace('calories": 100', 'calories": 418'); // Example kJ
            }
            if (unitPrefs.weight === 'oz') {
                basePrompt = basePrompt.replace('weight": 200', 'weight": 7.0'); // Example oz
            }

            const fullPrompt = `${basePrompt}${unitInstruction}\n\nUser Input: ${userPrompt}\nOriginal Dish: ${JSON.stringify(dish)}`;

            let resultData = await fixDish(fullPrompt);

            // Ensure units are attached to the result
            resultData = {
                ...resultData,
                energy_unit: unitPrefs.energy,
                weight_unit: unitPrefs.weight
            };

            return NextResponse.json(resultData);
        }

        // Default 'init'
        const promptPath = path.join(process.cwd(), 'prompts', 'gemini-dish-init-prompt.txt');
        const promptText = fs.readFileSync(promptPath, 'utf-8');

        if (!image) {
            return NextResponse.json({ error: 'Image required' }, { status: 400 });
        }

        const imagePart = {
            inlineData: {
                data: image.split(',')[1] || image,
                mimeType: "image/jpeg" // Simplified
            }
        };

        const dishes = await analyzeImage(imagePart, promptText);
        return NextResponse.json(dishes);

    } catch (error: any) {
        console.error('Gemini API Error:', error);
        return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
    }
}
