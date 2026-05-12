declare module 'better-queue' {
    interface QueueOptions {
        store?: any;
        concurrent?: number;
        maxRetries?: number;
        retryDelay?: number;
        backoff?: string;
        id?: string;
        process?: (task: any, cb: (err?: Error | null) => void) => void;
    }

    interface QueueEvents {
        on(event: 'task_queued', callback: (taskId: string) => void): void;
        on(event: 'task_failed', callback: (taskId: string, error: Error) => void): void;
        on(event: 'task_progress', callback: (taskId: string, progress: number) => void): void;
        on(event: 'task_finish', callback: (taskId: string, result: any) => void): void;
        on(event: 'error', callback: (error: Error) => void): void;
    }

    class Queue implements QueueEvents {
        constructor(name: string, options?: QueueOptions);
        push(task: any, cb?: (err: Error | null, result: any) => void): void;
        pause(): void;
        resume(): void;
        destroy(cb?: () => void): void;
        process(handler: (task: any, cb: (err?: Error | null) => void) => void): void;
        on(event: string, callback: (...args: any[]) => void): void;
    }

    export = Queue;
}

declare module 'better-queue-sql' {
    interface SQLStoreOptions {
        dialect: 'sqlite' | 'postgres' | 'mysql';
        knex?: any;
        tableName?: string;
    }

    class SQLStore {
        constructor(options: SQLStoreOptions);
    }

    export = SQLStore;
}
