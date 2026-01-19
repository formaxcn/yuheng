import { NextRequest, NextResponse } from 'next/server';
import { createRecognitionTask } from '@/lib/db';
import { logger } from '@/lib/logger';
import { queueManager } from '@/lib/queue';

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

        await queueManager.enqueueRecognition({
            taskId,
            imageBase64: base64Data,
            userPrompt
        });


        return NextResponse.json({ taskId });
    } catch (error) {
        logger.error(error as Error, 'Failed to start recognition task');
        return NextResponse.json({ error: 'Failed to start recognition task' }, { status: 500 });
    }
}
