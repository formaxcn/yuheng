// 简单的 console-based 日志记录器
const format = (msg: any, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    const formattedMsg = typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg;
    return `[${timestamp}] ${formattedMsg} ${args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : a).join(' ')}`.trim();
};

const logger = {
    debug: (msg: any, ...args: any[]) => console.debug(format(msg, ...args)),
    info: (msg: any, ...args: any[]) => console.info(format(msg, ...args)),
    warn: (msg: any, ...args: any[]) => console.warn(format(msg, ...args)),
    error: (msg: any, ...args: any[]) => console.error(format(msg, ...args)),
    fatal: (msg: any, ...args: any[]) => console.error(format(msg, ...args)),
};

export { logger };