import { NextRequest, NextResponse } from 'next/server';
import { createRecognitionTask } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        const taskId = crypto.randomUUID();
        // Create task with 'uploading' status initially
        // Note: createRecognitionTask default impl in many adapters might set it to 'pending',
        // so we might need to update it immediately or ensure createRecognitionTask supports status.
        // Checking lib/db.ts, createRecognitionTask takes id and imagePath.
        // It relies on adapter implementation. Most likely it defaults to 'pending'.
        // We will update it to 'uploading' if the adapter allows or just treat 'pending' as uploading for now if needed,
        // but we added 'uploading' type.

        await createRecognitionTask(taskId);

        // Since createRecognitionTask likely sets status to 'pending' by default, 
        // we might want to update it to 'uploading' to be explicit.
        // However, if we don't have an update method available here (we do, updateRecognitionTask),
        // let's do that.

        const { updateRecognitionTask } = await import('@/lib/db');
        await updateRecognitionTask(taskId, { status: 'uploading' });

        return NextResponse.json({ taskId });
    } catch (error) {
        logger.error(error as Error, 'Failed to init upload task');
        return NextResponse.json({ error: 'Failed to init task' }, { status: 500 });
    }
}
