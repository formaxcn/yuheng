import { NextRequest, NextResponse } from 'next/server';
import { createRecognitionTask, updateRecognitionTask, getUnitPreferences, getSetting } from '@/lib/db';
import { LLMFactory } from '@/lib/llm/factory';
import { promptManager } from '@/lib/prompts';
import { logger } from '@/lib/logger';
import { processRecognition } from '@/lib/recognition';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { image, userPrompt } = body;

        if (!image) {
            return NextResponse.json({ error: 'Image required' }, { status: 400 });
        }

        const taskId = crypto.randomUUID();
        await createRecognitionTask(taskId);

        // Run analysis in background
        // The image data in the body is likely a Data URI (data:image/jpeg;base64,...), we need to extract the base64 part just like before
        const base64Data = image.split(',')[1] || image;

        processRecognition(taskId, base64Data, userPrompt);


        return NextResponse.json({ taskId });
    } catch (error) {
        logger.error(error as Error, 'Failed to start recognition task');
        return NextResponse.json({ error: 'Failed to start recognition task' }, { status: 500 });
    }
}
