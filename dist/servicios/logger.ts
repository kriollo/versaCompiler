class Logger {
    constructor() {
        console.log('Logger initialized');
    }

    info(message: string): void {
        console.log(`INFO: ${message}`);
    }

    error(message: string): void {
        console.error(`ERROR: ${message}`);
    }
    warn(message: string): void {
        console.warn(`WARN: ${message}`);
    }
    debug(message: string): void {
        console.debug(`DEBUG: ${message}`);
    }
    fatal(message: string): void {
        console.error(`FATAL: ${message}`);
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
