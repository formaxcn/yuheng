export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

function getLogLevel(): LogLevel {
    const envLevel = (process.env.LOG_LEVEL || process.env.NEXT_PUBLIC_LOG_LEVEL || 'info').toLowerCase();
    return validLevels.includes(envLevel as LogLevel) ? (envLevel as LogLevel) : 'info';
}

const currentLevel = getLogLevel();

const levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const shouldLog = (level: LogLevel) => {
    return levelPriority[level] >= levelPriority[currentLevel];
};

export const logger = {
    debug: (message: string, ...args: any[]) => {
        if (shouldLog('debug')) {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    },
    info: (message: string, ...args: any[]) => {
        if (shouldLog('info')) {
            console.log(`[INFO] ${message}`, ...args);
        }
    },
    warn: (message: string, ...args: any[]) => {
        if (shouldLog('warn')) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    },
    error: (message: string, ...args: any[]) => {
        if (shouldLog('error')) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    },
};
