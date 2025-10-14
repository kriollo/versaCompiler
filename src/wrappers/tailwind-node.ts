import { execa, ExecaError } from 'execa';

import { resolveBin } from '../utils/resolve-bin';

/**
 * Opciones para la compilación de Tailwind CSS.
 */
interface TailwindBuildOptions {
    /** Ruta al ejecutable de Tailwind CSS. Si no se provee, se intentará resolver automáticamente. */
    binPath?: string;
    /** Ruta al archivo CSS de entrada. */
    input: string;
    /** Ruta al archivo CSS de salida. */
    output: string;
    /** Array de patrones glob para los archivos de contenido que Tailwind debe escanear. */
    content?: string[];
    /** Si se debe minificar el CSS de salida. */
    minify?: boolean;
    /** Argumentos adicionales para pasar al CLI de Tailwind CSS. */
    additionalArgs?: string[];
    /** Ruta al archivo de configuración de Tailwind. Si no se provee, Tailwind buscará uno por defecto. */
    configFile?: string;
}

/**
 * Resultado de la operación de compilación.
 */
interface TailwindRunResult {
    success: boolean;
    message: string;
    /** Detalles de la ejecución de execa (presente en caso de éxito o error). */
    details?: ExecaError;
}

export class TailwindNode {
    private readonly binPath: string;
    private readonly input: string;
    private readonly output: string;
    private readonly content?: string[];
    private readonly minify: boolean;
    private readonly additionalArgs?: string[];
    private readonly configFile?: string;

    /**
     * Crea una instancia de TailwindNode.
     * @param options Opciones para la compilación.
     */
    constructor(options: TailwindBuildOptions) {
        if (!options.input) {
            throw new Error('La opción "input" es requerida.');
        }
        if (!options.output) {
            throw new Error('La opción "output" es requerida.');
        }

        this.binPath = options.binPath || TailwindNode.getDefaultBinPath();
        this.input = options.input;
        this.output = options.output;
        this.content = options.content;
        this.minify = options.minify || false;
        this.additionalArgs = options.additionalArgs;
        this.configFile = options.configFile;
    }

    /**
     * Intenta resolver la ruta al ejecutable de Tailwind CSS.
     */
    private static getDefaultBinPath(): string {
        try {
            return resolveBin('tailwindcss', {
                executable: 'tailwindcss',
            });
        } catch (error) {
            console.error(
                "Error al resolver el binario de Tailwind CSS. Asegúrate de que esté instalado y en el PATH, o provee la opción 'binPath'.",
                error,
            );
            throw new Error('Error al resolver el binario de Tailwind CSS.', {
                cause: error,
            });
        }
    }

    /**
     * Ejecuta el proceso de compilación de Tailwind CSS.
     * @returns Una promesa que resuelve con el resultado de la compilación.
     */
    async run(): Promise<TailwindRunResult> {
        const cliArgs = this.toCliArgs();
        try {
            const result = await execa(this.binPath, cliArgs);
            return {
                success: true,
                message: `Tailwind CSS compilado exitosamente desde ${this.input} a ${this.output}`,
                details: result,
            };
        } catch (error: any) {
            const execaError = error as ExecaError; // error de execa
            console.error(
                `Error en la compilación de Tailwind CSS: ${execaError.message}`,
            );
            if (execaError.stderr) {
                console.error(`Stderr: ${execaError.stderr}`);
            }
            return {
                success: false,
                message: `Error en la compilación de Tailwind CSS: ${execaError.shortMessage || execaError.message}`,
                details: execaError,
            };
        }
    }

    /**
     * Construye el array de argumentos para pasar al CLI de Tailwind CSS.
     */
    private toCliArgs(): string[] {
        const args: string[] = ['-i', this.input, '-o', this.output];

        if (this.configFile) {
            args.push('--config', this.configFile);
        }

        if (this.content && this.content.length > 0) {
            args.push('--content');
            args.push(...this.content);
        }

        if (this.minify) {
            args.push('--minify');
        }

        if (this.additionalArgs && this.additionalArgs.length > 0) {
            args.push(...this.additionalArgs);
        }

        return args;
    }
}
