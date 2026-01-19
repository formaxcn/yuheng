import PgBoss from 'pg-boss';
import { getSetting } from './db';
import { logger } from './logger';

export interface RecognitionJob {
    taskId: string;
    imageBase64: string;
    userPrompt?: string;
}

class QueueManager {
    private boss: PgBoss | null = null;
    private static instance: QueueManager;
    private initialized = false;

    private constructor() { }

    public static getInstance(): QueueManager {
        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager();
        }
        return QueueManager.instance;
    }

    async init() {
        if (this.initialized) return;

        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL is not defined');
        }

        this.boss = new PgBoss(connectionString);

        this.boss.on('error', (error: Error) => logger.error(error, 'PgBoss error'));

        await this.boss.start();
        this.initialized = true;
        logger.info('QueueManager (pg-boss) started');
    }

    async enqueueRecognition(data: RecognitionJob) {
        if (!this.boss) await this.init();

        const retryLimit = parseInt((await getSetting('queue_retry_limit')) || '3', 10);

        const id = await this.boss!.send('recognition-task', data, {
            retryLimit,
            retryDelay: 30, // 30 seconds
            retryBackoff: true
        });

        return id;
    }

    async registerWorker(handler: (data: RecognitionJob) => Promise<void>) {
        if (!this.boss) await this.init();

        const concurrency = parseInt((await getSetting('queue_concurrency')) || '5', 10);

        await this.boss!.work<RecognitionJob, void>('recognition-task', { teamConcurrency: concurrency }, async (job: { id: string, data: RecognitionJob }) => {
            const { data } = job;
            logger.info(`Processing job ${job.id} for task ${data.taskId}`);
            await handler(data);
        });

        logger.info(`Registered recognition worker with concurrency ${concurrency}`);
    }

    async stop() {
        if (this.boss) {
            await this.boss.stop();
            this.initialized = false;
            logger.info('QueueManager stopped');
        }
    }
}

export const queueManager = QueueManager.getInstance();
