import { NextRequest, NextResponse } from 'next/server';
import { getRecognitionTask } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const task = await getRecognitionTask(id);

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Parse result if completed
        let result = null;
        if (task.status === 'completed' && task.result) {
            try {
                result = JSON.parse(task.result);
            } catch (e) {
                logger.error(e as Error, `Failed to parse result for task ${id}`);
            }
        }

        return NextResponse.json({
            id: task.id,
            status: task.status,
            result: result,
            error: task.error,
            created_at: task.created_at,
            updated_at: task.updated_at
        });
    } catch (error) {
        logger.error(error as Error, 'Failed to fetch task status');
        return NextResponse.json({ error: 'Failed to fetch task status' }, { status: 500 });
    }
}
