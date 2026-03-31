// Lazy loading optimizations - Only import lightweight modules synchronously

// Heavy dependencies will be loaded dynamically when needed
let chalk: any;

// Función que proporciona chalk sin color como fallback
function createChalkFallback() {
    // Crear una función que siempre retorna el texto sin modificar
    function createChainableFunction(): any {
        const fn = (text: any) => String(text);

        // Lista de métodos de chalk que deben ser encadenables
        const methods = [
            'reset',
            'bold',
            'dim',
            'italic',
            'underline',
            'strikethrough',
            'inverse',
            'hidden',
            'visible',
            'black',
            'red',
            'green',
            'yellow',
            'blue',
            'magenta',
            'cyan',
            'white',
            'gray',
            'grey',
            'blackBright',
            'redBright',
            'greenBright',
            'yellowBright',
            'blueBright',
            'magentaBright',
            'cyanBright',
            'whiteBright',
            'bgBlack',
            'bgRed',
            'bgGreen',
            'bgYellow',
            'bgBlue',
            'bgMagenta',
            'bgCyan',
            'bgWhite',
            'bgGray',
            'bgGrey',
            'bgBlackBright',
            'bgRedBright',
            'bgGreenBright',
            'bgYellowBright',
            'bgBlueBright',
            'bgMagentaBright',
            'bgCyanBright',
            'bgWhiteBright',
        ];

        // Añadir todos los métodos como propiedades que retornan nuevas funciones encadenables
        methods.forEach(method => {
            Object.defineProperty(fn, method, {
                get() {
                    return createChainableFunction();
                },
                enumerable: true,
                configurable: true,
            });
        });
        // Hacer que la función misma sea callable
        return new Proxy(fn, {
            apply(target, thisArg, argumentsList) {
                return String(argumentsList[0] || '');
            },
            get(target, prop: string | symbol) {
                // Verificar si es una propiedad de la función
                if (typeof prop === 'string' || typeof prop === 'symbol') {
                    // Si es un método de chalk, retorna una nueva función encadenable
                    if (typeof prop === 'string' && methods.includes(prop)) {
                        return createChainableFunction();
                    }
                    // Retornar propiedades existentes de la función
                    return (target as any)[prop];
                }
                return undefined;
            },
        });
    }

    return createChainableFunction();
}

// Obtener chalk de forma síncrona con fallback
function getChalkSync() {
    if (!chalk) {
        // Si no tenemos chalk cargado, usar fallback
        chalk = createChalkFallback();
    }
    return chalk;
}

/**
 * Información detallada sobre un error de parsing
 */
export interface DetailedParsingError {
    file: string;
    message: string;
    line?: number;
    column?: number;
    severity: 'error' | 'warning' | 'info';
    codeContext?: string;
    suggestion?: string;
    errorCode?: string;
}

/**
 * Opciones para el reporte de errores
 */
export interface ErrorReporterOptions {
    showLineNumbers?: boolean;
    showCodeContext?: boolean;
    contextLines?: number; // Número de líneas antes y después del error a mostrar
    colorize?: boolean;
}

/**
 * Clase para generar reportes detallados de errores de parsing
 */
export class ErrorReporter {
    private options: Required<ErrorReporterOptions>;

    constructor(options: ErrorReporterOptions = {}) {
        this.options = {
            showLineNumbers: options.showLineNumbers ?? true,
            showCodeContext: options.showCodeContext ?? true,
            contextLines: options.contextLines ?? 2,
            colorize: options.colorize ?? true,
        };
    }

    /**
     * Analiza un error de oxc-parser y extrae información detallada
     */
    analyzeParsingError(
        error: any,
        sourceCode: string,
        fileName: string,
    ): DetailedParsingError {
        const detailedError: DetailedParsingError = {
            file: fileName,
            message: error.message || 'Error de parsing desconocido',
            severity: 'error',
        };

        // Intentar extraer información de ubicación del error
        if (error.labels && error.labels.length > 0) {
            // oxc-parser proporciona información en labels
            const label = error.labels[0];
            if (label.start !== undefined) {
                const position = this.getLineAndColumnFromOffset(
                    sourceCode,
                    label.start,
                );
                detailedError.line = position.line;
                detailedError.column = position.column;
            }
        } else if (error.span) {
            // oxc-parser también puede proporcionar información de span
            const position = this.getLineAndColumnFromSpan(
                sourceCode,
                error.span.start,
            );
            detailedError.line = position.line;
            detailedError.column = position.column;
        } else if (error.offset !== undefined) {
            // Si tenemos un offset, calculamos línea y columna
            const position = this.getLineAndColumnFromOffset(
                sourceCode,
                error.offset,
            );
            detailedError.line = position.line;
            detailedError.column = position.column;
        }

        // Agregar contexto del código si está disponible
        if (this.options.showCodeContext && detailedError.line && sourceCode) {
            detailedError.codeContext = this.generateCodeContext(
                sourceCode,
                detailedError.line,
                detailedError.column,
            );
        }

        // Detectar patrones específicos de errores para sugerencias más inteligentes
        detailedError.suggestion = this.generateIntelligentSuggestion(
            error.message,
            sourceCode,
            detailedError.line,
            detailedError.column,
        );

        // Extraer código de error si está disponible
        if (error.code) {
            detailedError.errorCode = error.code;
        }

        // Si oxc-parser ya proporciona un codeframe, usarlo como referencia adicional
        if (error.codeframe) {
            detailedError.codeContext = this.combineWithOxcCodeframe(
                detailedError.codeContext,
                error.codeframe,
            );
        }

        return detailedError;
    }

    /**
     * Calcula línea y columna desde un span de oxc-parser
     */
    private getLineAndColumnFromSpan(
        sourceCode: string,
        spanStart: number,
    ): { line: number; column: number } {
        return this.getLineAndColumnFromOffset(sourceCode, spanStart);
    }

    /**
     * Calcula línea y columna desde un offset
     */
    private getLineAndColumnFromOffset(
        sourceCode: string,
        offset: number,
    ): { line: number; column: number } {
        const lines = sourceCode.split('\n');
        let currentOffset = 0;
        let line = 1;
        let column = 1;
        for (let i = 0; i < lines.length; i++) {
            const currentLine = lines[i];
            if (currentLine === undefined) continue;

            const lineLength = currentLine.length + 1; // +1 para el \n

            if (currentOffset + lineLength > offset) {
                line = i + 1;
                column = offset - currentOffset + 1;
                break;
            }

            currentOffset += lineLength;
        }

        return { line, column };
    }

    /**
     * Genera contexto del código alrededor del error
     */
    private generateCodeContext(
        sourceCode: string,
        errorLine: number,
        errorColumn?: number,
    ): string {
        const lines = sourceCode.split('\n');
        const startLine = Math.max(1, errorLine - this.options.contextLines);
        const endLine = Math.min(
            lines.length,
            errorLine + this.options.contextLines,
        );

        const chalkSync = getChalkSync();
        let context = '\n' + chalkSync.dim('Contexto del código:') + '\n';

        for (let i = startLine; i <= endLine; i++) {
            const lineContent = lines[i - 1] || '';
            const lineNumber = i.toString().padStart(3, ' ');
            const isErrorLine = i === errorLine;
            if (isErrorLine) {
                if (this.options.colorize) {
                    context += chalkSync.red(
                        `${lineNumber} ❌ ${lineContent}\n`,
                    );
                    // Agregar flecha apuntando al error si tenemos la columna
                    if (errorColumn) {
                        const spaces = ' '.repeat(6 + (errorColumn - 1));
                        const arrow = chalkSync.red('^');
                        context += `${spaces}${arrow}\n`;
                    }
                } else {
                    context += `${lineNumber} ❌ ${lineContent}\n`;
                    if (errorColumn) {
                        const spaces = ' '.repeat(6 + (errorColumn - 1));
                        context += `${spaces}^\n`;
                    }
                }
            } else {
                const prefix = this.options.colorize
                    ? chalkSync.dim
                    : (s: string) => s;
                context += prefix(`${lineNumber}    ${lineContent}\n`);
            }
        }

        return context;
    }

    /**
     * Genera sugerencias basadas en el mensaje de error
     */
    private generateSuggestion(errorMessage: string): string {
        const message = errorMessage.toLowerCase();

        if (message.includes('unexpected') && message.includes('identifier')) {
            return 'Verifica si hay una coma faltante antes del identificador o si la línea anterior no está completa.';
        }

        if (message.includes('expected') && message.includes('but found')) {
            return 'Revisa la sintaxis alrededor de este punto. Puede faltar un carácter específico.';
        }

        if (message.includes('missing')) {
            if (message.includes('semicolon')) {
                return 'Agrega un punto y coma (;) al final de la declaración.';
            }
            if (message.includes('comma')) {
                return 'Verifica si falta una coma (,) en una lista o declaración.';
            }
            if (message.includes('parenthesis')) {
                return 'Verifica que los paréntesis estén balanceados.';
            }
        }

        if (message.includes('import') || message.includes('export')) {
            return 'Revisa la sintaxis de import/export. Las líneas pueden estar cortadas o malformadas.';
        }

        if (message.includes('const') && message.includes('initializer')) {
            return 'Las declaraciones const requieren un valor inicial. Ejemplos válidos:\n   • const variable = "valor";\n   • const numero = 42;\n   • const objeto = { propiedad: "valor" };';
        }

        return 'Revisa la sintaxis del código alrededor de esta ubicación.';
    }

    /**
     * Combina nuestro contexto de código con el codeframe de oxc-parser
     */
    private combineWithOxcCodeframe(
        ourContext: string | undefined,
        oxcCodeframe: string,
    ): string {
        if (!ourContext) {
            return oxcCodeframe;
        }

        // Si ya tenemos nuestro contexto, podemos agregar el de oxc como referencia adicional
        const chalkSync = getChalkSync();
        return (
            ourContext +
            '\n' +
            chalkSync.dim('Codeframe de oxc-parser:') +
            '\n' +
            oxcCodeframe
        );
    }

    /**
     * Formatea un error detallado como texto legible
     */
    formatError(error: DetailedParsingError): string {
        let output = '';

        // Encabezado del error
        const severity = error.severity.toUpperCase();
        const chalkSync = getChalkSync();
        const severityColor =
            error.severity === 'error'
                ? chalkSync.red
                : error.severity === 'warning'
                  ? chalkSync.yellow
                  : chalkSync.blue;
        if (this.options.colorize) {
            output +=
                severityColor(`[${severity}]`) +
                ` en ${chalkSync.cyan(error.file)}`;
        } else {
            output += `[${severity}] en ${error.file}`;
        }

        // Ubicación específica
        if (error.line) {
            const location = error.column
                ? `línea ${error.line}, columna ${error.column}`
                : `línea ${error.line}`;
            if (this.options.colorize) {
                output += ` (${chalkSync.dim(location)})`;
            } else {
                output += ` (${location})`;
            }
        }

        output += '\n';

        // Mensaje de error
        if (this.options.colorize) {
            output += `💥 ${chalkSync.bold(error.message)}\n`;
        } else {
            output += `💥 ${error.message}\n`;
        }

        // Código de error si está disponible
        if (error.errorCode) {
            if (this.options.colorize) {
                output += chalkSync.dim(`   Código: ${error.errorCode}\n`);
            } else {
                output += `   Código: ${error.errorCode}\n`;
            }
        }

        // Contexto del código
        if (error.codeContext) {
            output += error.codeContext;
        }

        // Sugerencia
        if (error.suggestion) {
            if (this.options.colorize) {
                output += `\n💡 ${chalkSync.yellow('Sugerencia:')} ${error.suggestion}\n`;
            } else {
                output += `\n💡 Sugerencia: ${error.suggestion}\n`;
            }
        }

        return output;
    }

    /**
     * Analiza múltiples errores de un resultado de parsing
     */
    analyzeMultipleErrors(
        errors: any[],
        sourceCode: string,
        fileName: string,
    ): DetailedParsingError[] {
        return errors.map(error =>
            this.analyzeParsingError(error, sourceCode, fileName),
        );
    }

    /**
     * Formatea múltiples errores como un reporte completo
     */
    formatMultipleErrors(errors: DetailedParsingError[]): string {
        if (errors.length === 0) {
            return 'No se encontraron errores.';
        }

        const chalkSync = getChalkSync();
        let output = '';

        if (this.options.colorize) {
            output += chalkSync.bold.red(
                `\n🚨 Se encontraron ${errors.length} error(es) de parsing:\n\n`,
            );
        } else {
            output += `\n🚨 Se encontraron ${errors.length} error(es) de parsing:\n\n`;
        }

        errors.forEach((error, index) => {
            output += this.formatError(error);

            // Separador entre errores (excepto el último)
            if (index < errors.length - 1) {
                if (this.options.colorize) {
                    output += chalkSync.dim('─'.repeat(60)) + '\n\n';
                } else {
                    output += '─'.repeat(60) + '\n\n';
                }
            }
        });
        return output;
    } /**
     * Genera sugerencias más inteligentes basadas en análisis contextual del error
     */
    private generateIntelligentSuggestion(
        errorMessage: string,
        sourceCode: string,
        line?: number,
        _column?: number,
    ): string {
        const message = errorMessage.toLowerCase();

        // Análisis contextual del código si tenemos la línea
        if (line && sourceCode) {
            const lines = sourceCode.split('\n');
            const errorLine = lines[line - 1] || '';
            const prevLine = line > 1 ? lines[line - 2] || '' : '';

            // Análisis específico para declaraciones const
            if (message.includes('const') && message.includes('initializer')) {
                // Detectar el tipo de error específico analizando el contexto
                if (
                    errorLine
                        .trim()
                        .match(/^const\s+[a-zA-Z_][a-zA-Z0-9_]*\s*;/)
                ) {
                    return (
                        'Declaración const incompleta. Agrega un valor inicial:\n   • const ' +
                        errorLine.match(
                            /const\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
                        )?.[1] +
                        ' = "valor";\n   • const ' +
                        errorLine.match(
                            /const\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
                        )?.[1] +
                        ' = 42;\n   • O cambia a "let" si planeas asignar después'
                    );
                }

                if (
                    errorLine.includes('=') &&
                    !errorLine.trim().endsWith(';')
                ) {
                    return 'Parece que la declaración const está incompleta. Verifica:\n   • Que la expresión del lado derecho esté completa\n   • Que termine con punto y coma (;)\n   • Que no falten paréntesis o comillas';
                }

                return 'Las declaraciones const requieren un valor inicial:\n   • const variable = "valor";\n   • const numero = 42;\n   • const objeto = { propiedad: "valor" };\n   • const array = [1, 2, 3];';
            }

            // Análisis para identificadores inesperados
            if (
                message.includes('unexpected') &&
                message.includes('identifier')
            ) {
                if (
                    prevLine.trim() &&
                    !prevLine.trim().endsWith(';') &&
                    !prevLine.trim().endsWith('{') &&
                    !prevLine.trim().endsWith('}')
                ) {
                    return 'La línea anterior parece incompleta. Verifica:\n   • Que termine con punto y coma (;)\n   • Que no falten operadores o comas\n   • Que los paréntesis estén balanceados';
                }

                if (errorLine.includes(',') && !errorLine.includes('=')) {
                    return 'Posible error en declaración de múltiples variables:\n   • const a = 1, b = 2; (para const)\n   • let a, b; a = 1; b = 2; (para let)\n   • Verifica que cada variable tenga su valor asignado';
                }
            }

            // Análisis para import/export malformados
            if (message.includes('import') || message.includes('export')) {
                if (
                    errorLine.includes('import') &&
                    !errorLine.includes('from')
                ) {
                    return 'Import statement incompleto:\n   • import { item } from "modulo";\n   • import defaultItem from "modulo";\n   • import * as alias from "modulo";';
                }

                if (
                    errorLine.includes('export') &&
                    errorLine.trim().endsWith('export')
                ) {
                    return 'Export statement incompleto:\n   • export { item };\n   • export default item;\n   • export const item = valor;';
                }
            }

            // Análisis para paréntesis y brackets
            if (message.includes('expected')) {
                const openParens = (errorLine.match(/\(/g) || []).length;
                const closeParens = (errorLine.match(/\)/g) || []).length;
                const openBrackets = (errorLine.match(/\{/g) || []).length;
                const closeBrackets = (errorLine.match(/\}/g) || []).length;

                if (openParens !== closeParens) {
                    return `Paréntesis desbalanceados (${openParens} abiertos, ${closeParens} cerrados):\n   • Verifica que cada ( tenga su correspondiente )\n   • Revisa llamadas a funciones y expresiones`;
                }

                if (openBrackets !== closeBrackets) {
                    return `Llaves desbalanceadas (${openBrackets} abiertas, ${closeBrackets} cerradas):\n   • Verifica que cada { tenga su correspondiente }\n   • Revisa objetos, funciones y bloques de código`;
                }
            }
        }

        // Fallback a sugerencias básicas si no hay análisis contextual específico
        return this.generateSuggestion(errorMessage);
    }
}

/**
 * Instancia predeterminada del reporter con configuración estándar
 */
export const defaultErrorReporter = new ErrorReporter({
    showLineNumbers: true,
    showCodeContext: true,
    contextLines: 2,
    colorize: true,
});

/**
 * Función helper para analizar y formatear rápidamente un error
 */
export function analyzeAndFormatError(
    error: any,
    sourceCode: string,
    fileName: string,
    options?: ErrorReporterOptions,
): string {
    const reporter = options
        ? new ErrorReporter(options)
        : defaultErrorReporter;
    const detailedError = reporter.analyzeParsingError(
        error,
        sourceCode,
        fileName,
    );
    return reporter.formatError(detailedError);
}

/**
 * Función helper para analizar y formatear múltiples errores
 */
export function analyzeAndFormatMultipleErrors(
    errors: any[],
    sourceCode: string,
    fileName: string,
    options?: ErrorReporterOptions,
): string {
    const reporter = options
        ? new ErrorReporter(options)
        : defaultErrorReporter;
    const detailedErrors = reporter.analyzeMultipleErrors(
        errors,
        sourceCode,
        fileName,
    );
    return reporter.formatMultipleErrors(detailedErrors);
}
