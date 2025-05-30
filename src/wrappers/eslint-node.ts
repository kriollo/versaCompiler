import { execa } from 'execa';
import path from 'node:path'; // Añadir importación de path
import { cwd } from 'node:process'; // Añadir importación de cwd
import { resolveBin } from '../utils/resolve-bin';

// Tipos para ESLint
export type ESLintFormat =
    | 'stylish'
    | 'compact'
    | 'json'
    | 'unix'
    | 'checkstyle'
    | 'html'
    | 'table'
    | 'tap'
    | 'junit'
    | 'visualstudio'
    | 'sarif';

/**
 * Opciones para configurar la instancia de ESLintNode.
 * Similar a OxlintConfigOptions del código de referencia.
 */
export interface ESLintConfigOptions {
    /** Ruta al ejecutable de ESLint. */
    binPath?: string;
    /** Si se deben aplicar las correcciones automáticas (--fix). */
    fix?: boolean;
    /** Ruta al archivo de configuración de ESLint (--config). */
    configFile?: string;
    /** Suprimir toda la salida excepto los errores fatales (--quiet). */
    quiet?: boolean;
    /** Reglas específicas a denegar (--rule). */
    deny?: string[];
    /** Reglas específicas a permitir (--rule). */
    allow?: string[];
    /** Deshabilitar el uso de archivos .eslintignore y similares (--no-ignore). */
    noIgnore?: boolean;
    /** Ruta a un archivo de ignore personalizado (--ignore-path). */
    ignorePath?: string;
    /** Patrones a ignorar (--ignore-pattern). */
    ignorePattern?: string[];
    /** Formatos de salida deseados. */
    formats?: ESLintFormat[];
    /** Argumentos adicionales para pasar al CLI de ESLint. */
    additionalArgs?: string[];
}

/**
 * Resultado de la operación de ESLint para múltiples formatos.
 */
export type ESLintMultiFormatResult = Partial<Record<ESLintFormat, any>>; // 'any' para el resultado parseado o string

export class ESLintNode {
    public readonly binPath: string;
    public readonly fix: boolean;
    public readonly configFile?: string;
    public readonly quiet: boolean;
    public readonly deny?: string[];
    public readonly allow?: string[];
    public readonly noIgnore: boolean;
    public readonly ignorePath?: string;
    public readonly ignorePattern?: string[];
    public readonly formats: ESLintFormat[];
    public readonly additionalArgs?: string[];

    constructor(options: ESLintConfigOptions = {}) {
        this.binPath = options.binPath || ESLintNode.getDefaultBinPath();
        this.fix = options.fix || false;
        this.configFile = options.configFile;
        this.quiet = options.quiet || false;
        this.deny = options.deny;
        this.allow = options.allow;
        this.noIgnore = options.noIgnore || false;
        this.ignorePath = options.ignorePath;
        this.ignorePattern = options.ignorePattern;
        this.formats = options.formats || ['json']; // Por defecto, solo 'json'
        this.additionalArgs = options.additionalArgs;
    }

    private static getDefaultBinPath(): string {
        try {
            return resolveBin('eslint', { executable: 'eslint' });
        } catch (error) {
            console.error(
                "Error al resolver el binario de ESLint. Asegúrate de que 'eslint' esté instalado y en el PATH, o provee la opción 'binPath'.",
                error,
            );
            throw new Error('Error al resolver el binario de ESLint.');
        }
    }

    async version(): Promise<string> {
        const { stdout: version } = await execa(this.binPath, ['--version']);
        return version;
    }

    /**
     * Ejecuta ESLint para los formatos configurados y devuelve los resultados.
     * @param paths Rutas o patrones glob para los archivos a lint.
     * @returns Un objeto donde cada clave es un formato y el valor es el resultado (parseado si es JSON).
     */
    async run(paths: string[] = []): Promise<ESLintMultiFormatResult> {
        const results: ESLintMultiFormatResult = {};

        const targetPaths = paths.length > 0 ? paths : ['.'];
        const projectRoot = cwd(); // Obtener la ruta raíz del proyecto

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
                                `ESLint para formato '${format}' finalizó con código ${exitCode} y stderr: ${stderr}`,
                            );
                        }
                    }
                    if (format === 'json') {
                        // ESLint devuelve un array de archivos con mensajes anidados
                        // Necesitamos aplanar esta estructura para que coincida con lo que espera el compilador
                        const eslintOutput = JSON.parse(stdout || '[]');
                        const flattenedResults: any[] = [];

                        for (const fileResult of eslintOutput) {
                            for (const message of fileResult.messages || []) {
                                // Calcular ruta relativa
                                const relativeFilePath = path
                                    .relative(projectRoot, fileResult.filePath)
                                    .replace(/\\/g, '/');
                                flattenedResults.push({
                                    filePath: relativeFilePath, // Usar ruta relativa
                                    file: relativeFilePath, // Alias para compatibilidad
                                    message: message.message,
                                    severity: message.severity,
                                    ruleId: message.ruleId,
                                    line: message.line,
                                    column: message.column,
                                });
                            }
                        }

                        results[format] = flattenedResults;
                    } else if (format === 'sarif') {
                        results[format] = JSON.parse(stdout || '{}');
                    } else {
                        results[format] = stdout;
                    }
                } catch (error: any) {
                    console.error(
                        `Error ejecutando ESLint para formato '${format}':`,
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
     * Construye el array de argumentos para pasar al CLI de ESLint para un formato específico.
     */
    toCliArgs(format: ESLintFormat, paths: string[]): string[] {
        const args: string[] = [];

        // Opciones directas
        if (this.fix) args.push('--fix');
        if (this.configFile) args.push('--config', this.configFile);
        if (this.quiet) args.push('--quiet');
        if (this.noIgnore) args.push('--no-ignore');
        if (this.ignorePath) args.push('--ignore-path', this.ignorePath);

        if (this.deny)
            this.deny.forEach(rule => args.push('--rule', `${rule}:error`));
        if (this.allow)
            this.allow.forEach(rule => args.push('--rule', `${rule}:off`));
        if (this.ignorePattern)
            this.ignorePattern.forEach(pattern =>
                args.push('--ignore-pattern', pattern),
            );

        // Formato
        if (format !== 'stylish') {
            args.push('--format', format);
        }

        // Argumentos adicionales
        if (this.additionalArgs) args.push(...this.additionalArgs);

        // Rutas/patrones
        args.push(...paths);

        return args;
    }

    /**
     * Método estático para crear una instancia de ESLintNode, similar al código de referencia.
     * @param options Opciones de configuración.
     */
    static create(options: ESLintConfigOptions): ESLintNode {
        return new ESLintNode(options);
    }
}

