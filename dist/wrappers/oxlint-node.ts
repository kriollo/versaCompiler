import { execa, ExecaError } from 'execa';
import { resolveBin } from '../utils/resolve-bin.ts';

// Tipos basados en el código de referencia y tu implementación actual
export type OxlintFormat =
    | 'json'
    | 'unix'
    | 'github'
    | 'grouped'
    | 'sarif'
    | 'default';

/**
 * Opciones para configurar la instancia de OxlintNode.
 * Similar a OxlintNodeOptions del código de referencia.
 */
export interface OxlintConfigOptions {
    /** Ruta al ejecutable de Oxlint. */
    binPath?: string;
    /** Rutas o patrones glob para los archivos a lint. Se pasan al método run(). */
    // paths?: string[]; // Se pasan a run()
    /** Si se deben aplicar las correcciones automáticas (--fix). */
    fix?: boolean;
    /** Ruta al archivo de configuración de Oxlint (--config). */
    configFile?: string;
    /** Ruta al archivo tsconfig.json (--tsconfig). */
    tsconfigPath?: string;
    /** Suprimir toda la salida excepto los errores fatales (--quiet). */
    quiet?: boolean;
    /** Reglas específicas a denegar (--deny). */
    deny?: string[];
    /** Reglas específicas a permitir (--allow). */
    allow?: string[];
    /** Deshabilitar el uso de archivos .eslintignore y similares (--no-ignore). */
    noIgnore?: boolean;
    /** Ruta a un archivo de ignore personalizado (--ignore-path). */
    ignorePath?: string;
    /** Patrones a ignorar (--ignore-pattern). */
    ignorePattern?: string[];
    /** Formatos de salida deseados. */
    formats?: OxlintFormat[];
    /** Argumentos adicionales para pasar al CLI de Oxlint. */
    additionalArgs?: string[];
}

/**
 * Resultado de la operación de Oxlint para múltiples formatos.
 */
export type OxlintMultiFormatResult = Partial<Record<OxlintFormat, any>>; // 'any' para el resultado parseado o string

/**
 * Resultado detallado para una sola ejecución de formato, incluyendo estado de éxito.
 */
interface OxlintSingleRunDetails {
    success: boolean;
    output?: any; // string o JSON parseado
    error?: ExecaError;
}

export class OxlintNode {
    public readonly binPath: string;
    public readonly fix: boolean;
    public readonly configFile?: string;
    public readonly tsconfigPath?: string;
    public readonly quiet: boolean;
    public readonly deny?: string[];
    public readonly allow?: string[];
    public readonly noIgnore: boolean;
    public readonly ignorePath?: string;
    public readonly ignorePattern?: string[];
    public readonly formats: OxlintFormat[];
    public readonly additionalArgs?: string[];

    constructor(options: OxlintConfigOptions = {}) {
        this.binPath = options.binPath || OxlintNode.getDefaultBinPath();
        this.fix = options.fix || false;
        this.configFile = options.configFile;
        this.tsconfigPath = options.tsconfigPath;
        this.quiet = options.quiet || false;
        this.deny = options.deny;
        this.allow = options.allow;
        this.noIgnore = options.noIgnore || false;
        this.ignorePath = options.ignorePath;
        this.ignorePattern = options.ignorePattern;
        this.formats = options.formats || ['default']; // Por defecto, solo 'default'
        this.additionalArgs = options.additionalArgs;
    }

    private static getDefaultBinPath(): string {
        try {
            return resolveBin('oxlint', { executable: 'oxlint' });
        } catch (error) {
            console.error(
                "Error al resolver el binario de Oxlint. Asegúrate de que 'oxlint' esté instalado y en el PATH, o provee la opción 'binPath'.",
                error,
            );
            throw new Error('Error al resolver el binario de Oxlint.');
        }
    }

    async version(): Promise<string> {
        const { stdout: version } = await execa(this.binPath, ['--version']);
        return version;
    }

    /**
     * Ejecuta Oxlint para los formatos configurados y devuelve los resultados.
     * @param paths Rutas o patrones glob para los archivos a lint.
     * @returns Un objeto donde cada clave es un formato y el valor es el resultado (parseado si es JSON).
     */
    async run(paths: string[] = []): Promise<OxlintMultiFormatResult> {
        const results: OxlintMultiFormatResult = {};

        const targetPaths = paths.length > 0 ? paths : ['.'];

        await Promise.all(
            this.formats.map(async format => {
                const cliArgs = this.toCliArgs(format, targetPaths);
                try {
                    const { stdout, stderr, exitCode } = await execa(
                        this.binPath,
                        cliArgs,
                        { reject: false },
                    );

                    if (
                        exitCode !== 0 &&
                        format !== 'json' &&
                        format !== 'sarif'
                    ) {
                        if (stderr && !stdout) {
                            console.warn(
                                `Oxlint para formato '${format}' finalizó con código ${exitCode} y stderr: ${stderr}`,
                            );
                        }
                    }

                    results[format] =
                        format === 'json' || format === 'sarif'
                            ? JSON.parse(stdout || '{}')
                            : stdout;
                } catch (error: any) {
                    console.error(
                        `Error ejecutando Oxlint para formato '${format}':`,
                        error.shortMessage || error.message,
                    );
                    results[format] = {
                        error: error.shortMessage || error.message,
                        details: error,
                    };
                }
            }),
        );
        return results;
    }

    /**
     * Construye el array de argumentos para pasar al CLI de Oxlint para un formato específico.
     */
    toCliArgs(format: OxlintFormat, paths: string[]): string[] {
        const args: string[] = [];

        // Opciones directas
        if (this.fix) args.push('--fix');
        if (this.configFile) args.push('--config', this.configFile);
        if (this.tsconfigPath) args.push('--tsconfig', this.tsconfigPath); // Añadido
        if (this.quiet) args.push('--quiet');
        if (this.noIgnore) args.push('--no-ignore');
        if (this.ignorePath) args.push('--ignore-path', this.ignorePath);

        if (this.deny) this.deny.forEach(rule => args.push('--deny', rule));
        if (this.allow) this.allow.forEach(rule => args.push('--allow', rule));
        if (this.ignorePattern)
            this.ignorePattern.forEach(pattern =>
                args.push('--ignore-pattern', pattern),
            );

        // Formato
        if (format !== 'default') {
            args.push('--format', format);
        }

        // Argumentos adicionales
        if (this.additionalArgs) args.push(...this.additionalArgs);

        // Rutas/patrones
        args.push(...paths);

        return args;
    }

    /**
     * Método estático para crear una instancia de OxlintNode, similar al código de referencia.
     * @param options Opciones de configuración.
     */
    static create(options: OxlintConfigOptions): OxlintNode {
        return new OxlintNode(options);
    }
}
