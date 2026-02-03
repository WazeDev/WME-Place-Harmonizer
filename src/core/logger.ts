type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

let level: LogLevel = 'info';

export function setLogLevel(next: LogLevel): void {
    level = next;
}

function shouldLog(target: LogLevel): boolean {
    const order: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];
    return order.indexOf(target) >= order.indexOf(level) && level !== 'silent';
}

export function logDebug(message: string, ...rest: unknown[]): void {
    if (shouldLog('debug')) {
        console.debug('[WMEPH]', message, ...rest);
    }
}

export function logInfo(message: string, ...rest: unknown[]): void {
    if (shouldLog('info')) {
        console.info('[WMEPH]', message, ...rest);
    }
}

export function logWarn(message: string, ...rest: unknown[]): void {
    if (shouldLog('warn')) {
        console.warn('[WMEPH]', message, ...rest);
    }
}

export function logError(message: string, ...rest: unknown[]): void {
    if (shouldLog('error')) {
        console.error('[WMEPH]', message, ...rest);
    }
}
