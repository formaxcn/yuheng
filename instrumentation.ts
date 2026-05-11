export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { queueManager } = await import('@/lib/queue');
        const { executeRecognition } = await import('@/lib/recognition');
        const { ensureInit } = await import('@/lib/db');

        try {
            // Ensure DB is ready (settings loaded)
            await ensureInit();

            // Register recognition worker
            await queueManager.registerWorker(executeRecognition);

            console.log('✅ Background Queue Worker Registered');
        } catch (error) {
            console.error('❌ Failed to register background queue worker:', error);
        }
    }
}
