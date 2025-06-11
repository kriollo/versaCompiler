import * as process from 'node:process';

// Función para obtener ProgressManager (lazy import para evitar dependencias circulares)
let getProgressManager: (() => any) | null = null;

export function setProgressManagerGetter(getter: () => any): void {
    getProgressManager = getter;
}

class Logger {
    constructor() {
        // Bind console methods
        process.stdout.write = process.stdout.write.bind(process.stdout);
        process.stderr.write = process.stderr.write.bind(process.stderr);
    }
    private writeMessage(
        message: string,
        useStderr = false,
        immediate = false,
    ): void {
        if (getProgressManager) {
            const progressManager = getProgressManager();
            if (progressManager && progressManager.isActive()) {
                // Si el progreso está activo, usar el sistema de logs apropiado
                if (immediate) {
                    progressManager.addImmediateLog(message);
                } else {
                    progressManager.addLog(message);
                }
                return;
            }
        }

        // Comportamiento normal si no hay progreso activo
        if (useStderr) {
            process.stderr.write(message + '\n');
        } else {
            process.stdout.write(message + '\n');
        }
    }

    log(...args: any[]): void {
        this.writeMessage(args.map(arg => String(arg)).join(' '));
    }

    info(...args: any[]): void {
        // En modo verbose, mostrar logs inmediatamente
        const isVerbose = process.env.VERBOSE === 'true';
        this.writeMessage(
            args.map(arg => String(arg)).join(' '),
            false,
            isVerbose,
        );
    }

    error(...args: any[]): void {
        this.writeMessage(args.map(arg => String(arg)).join(' '), true);
    }

    warn(...args: any[]): void {
        this.writeMessage(args.map(arg => String(arg)).join(' '), true);
    }

    debug(...args: any[]): void {
        this.writeMessage(args.map(arg => String(arg)).join(' '));
    }

    fatal(...args: any[]): void {
        this.writeMessage(args.map(arg => String(arg)).join(' '), true);
    }

    table(data: any, title?: string[]): void {
        const tableString = title
            ? console.table(data, title)
            : console.table(data);
        this.writeMessage(String(tableString));
    }
}

export const logger = new Logger();
