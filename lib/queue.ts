import Queue from 'better-queue';
import SQLStore from 'better-queue-sql';
import knex from 'knex';
import { getSetting } from './db';
import { logger } from './logger';
import { QUEUE_RETRY_DELAY_SECONDS } from './constants';

function isSqlite(): boolean {
    const url = process.env.DATABASE_URL || '';
    return url.startsWith('file:');
}

export interface RecognitionJob {
    taskId: string;
    imageBase64: string;
    userPrompt?: string;
}

class QueueManager {
    private queue: Queue | null = null;
    private static instance: QueueManager;
    private initialized = false;

    private constructor() { }

    public static getInstance(): QueueManager {
        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager();
        }
        return QueueManager.instance;
    }

    private getKnexConfig() {
        const url = process.env.DATABASE_URL || '';
        if (isSqlite()) {
            const dbPath = url.replace('file:', '');
            return {
                client: 'better-sqlite3',
                connection: { filename: dbPath },
                useNullAsDefault: true
            };
        }
        return {
            client: 'pg',
            connection: url
        };
    }

    private async createQueue(handler?: (data: RecognitionJob) => Promise<void>): Promise<Queue> {
        const dbConfig = this.getKnexConfig();
        const db = knex(dbConfig);

        const retryLimit = parseInt((await getSetting('queue_retry_limit')) || '3', 10);
        const concurrency = parseInt((await getSetting('queue_concurrency')) || '5', 10);

        const queue = new Queue('recognition-task', {
            store: new SQLStore({
                dialect: isSqlite() ? 'sqlite' : 'postgres',
                knex: db,
                tableName: 'queue_jobs'
            }),
            concurrent: concurrency,
            maxRetries: retryLimit,
            retryDelay: QUEUE_RETRY_DELAY_SECONDS * 1000,
            backoff: 'exponential',
            id: 'taskId',
            process: handler ? async (job: RecognitionJob, cb: (err?: Error | null) => void) => {
                try {
                    await handler(job);
                    cb(null);
                } catch (error) {
                    cb(error as Error);
                }
            } : undefined
        });

        queue.on('task_queued', (taskId: string) => {
            logger.info(`Job queued: ${taskId}`);
        });

        queue.on('task_failed', (taskId: string, error: Error) => {
            logger.error(error, `Job failed: ${taskId}`);
        });

        queue.on('task_finish', (taskId: string) => {
            logger.info(`Job finished: ${taskId}`);
        });

        queue.on('error', (error: Error) => {
            logger.error(error, 'Queue error');
        });

        logger.info(`QueueManager (better-queue-sql) started with ${concurrency} workers`, {
            db: isSqlite() ? 'SQLite' : 'PostgreSQL'
        });

        return queue;
    }

    async enqueueRecognition(data: RecognitionJob): Promise<string> {
        if (!this.queue) {
            throw new Error('Queue not initialized - call registerWorker first');
        }

        return new Promise((resolve, reject) => {
            this.queue!.push(data, (err: Error | null, result: any) => {
                if (err) reject(err);
                else resolve(result?.taskId || data.taskId);
            });
        });
    }

    async registerWorker(handler: (data: RecognitionJob) => Promise<void>) {
        if (this.queue) {
            this.queue.process(async (job: RecognitionJob, cb: (err?: Error | null) => void) => {
                try {
                    await handler(job);
                    cb(null);
                } catch (error) {
                    cb(error as Error);
                }
            });
        } else {
            this.queue = await this.createQueue(handler);
        }

        logger.info('Recognition worker registered');
    }

    async stop() {
        if (this.queue) {
            await new Promise<void>((resolve) => {
                this.queue!.pause();
                this.queue!.destroy(() => resolve());
            });
            this.initialized = false;
            this.queue = null;
            logger.info('QueueManager stopped');
        }
    }
}

export const queueManager = QueueManager.getInstance();
