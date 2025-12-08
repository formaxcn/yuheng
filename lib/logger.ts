import pino from 'pino';

const logLevel = (process.env.LOG_LEVEL || process.env.NEXT_PUBLIC_LOG_LEVEL || 'info').toLowerCase();

export const logger = pino({
    level: logLevel,
    transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard',
        },
    } : undefined,
    browser: {
        asObject: true,
    },
});
