class Logger {
    constructor() {
        console.log('Logger initialized');
    }

    log(...args: any[]): void {
        console.log(...args);
    }

    info(...args: any[]): void {
        console.log('INFO:', ...args);
    }

    error(...args: any[]): void {
        console.error('ERROR:', ...args);
    }
    warn(...args: any[]): void {
        console.warn('WARN:', ...args);
    }
    debug(...args: any[]): void {
        console.debug('DEBUG:', ...args);
    }
    fatal(...args: any[]): void {
        console.error('FATAL:', ...args);
    }
    table(data: any, title?: string[]): void {
        if (title) {
            console.table(data, title);
        } else {
            console.table(data);
        }
    }
}

export const logger = new Logger();
