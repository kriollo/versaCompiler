class Logger {
    constructor() {
        // Bind console methods
        process.stdout.write = process.stdout.write.bind(process.stdout);
        process.stderr.write = process.stderr.write.bind(process.stderr);
    }

    log(...args: any[]): void {
        process.stdout.write(args.map(arg => String(arg)).join(' ') + '\n');
    }

    info(...args: any[]): void {
        process.stdout.write(args.map(arg => String(arg)).join(' ') + '\n');
    }

    error(...args: any[]): void {
        process.stderr.write(args.map(arg => String(arg)).join(' ') + '\n');
    }

    warn(...args: any[]): void {
        process.stderr.write(args.map(arg => String(arg)).join(' ') + '\n');
    }

    debug(...args: any[]): void {
        process.stdout.write(args.map(arg => String(arg)).join(' ') + '\n');
    }

    fatal(...args: any[]): void {
        process.stderr.write(args.map(arg => String(arg)).join(' ') + '\n');
    }

    table(data: any, title?: string[]): void {
        const tableString = title ? 
            console.table(data, title) : 
            console.table(data);
        process.stdout.write(String(tableString) + '\n');
    }
}

export const logger = new Logger();
