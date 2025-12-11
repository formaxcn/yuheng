// 简单的 console-based 日志记录器
const logger = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
    fatal: console.error,
};

export { logger };