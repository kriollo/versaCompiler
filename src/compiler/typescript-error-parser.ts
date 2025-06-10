import * as ts from 'typescript';

/**
 * Información de error limpia y estructurada para TypeScript
 */
export interface CleanTypeScriptError {
    file: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    help: string;
}

/**
 * Configuración para el formato de mensajes de error
 */
export interface ErrorDisplayConfig {
    verbose: boolean;
    showContext: boolean;
    showSuggestions: boolean;
}

/**
 * Parsea errores de TypeScript y los convierte a un formato limpio
 * que incluye solo: archivo, mensaje, severidad y ubicación como ayuda
 */
export function parseTypeScriptErrors(
    diagnostics: ts.Diagnostic[],
    fileName: string,
    sourceCode?: string,
): CleanTypeScriptError[] {
    return diagnostics.map(diagnostic => {
        // Usar el mejorador de errores para obtener mensaje detallado
        const enhancedMessage = enhanceErrorMessage(
            diagnostic,
            fileName,
            sourceCode,
        ); // Determinar la severidad
        let severity: 'error' | 'warning' | 'info';
        switch (diagnostic.category) {
            case TypeScript.DiagnosticCategory.Error:
                severity = 'error';
                break;
            case TypeScript.DiagnosticCategory.Warning:
                severity = 'warning';
                break;
            default:
                severity = 'info';
                break;
        } // Construir información de ubicación limpia
        let help = `Código TS${diagnostic.code}`;

        if (diagnostic.file && diagnostic.start !== undefined) {
            const sourceFile = diagnostic.file;
            // Verificar que el método getLineAndCharacterOfPosition existe (para compatibilidad con mocks)
            if (
                typeof sourceFile.getLineAndCharacterOfPosition === 'function'
            ) {
                try {
                    const lineAndChar =
                        sourceFile.getLineAndCharacterOfPosition(
                            diagnostic.start,
                        );
                    help += ` | Línea ${lineAndChar.line + 1}, Columna ${lineAndChar.character + 1}`;
                } catch {
                    // Si falla, solo mostrar la posición de carácter
                    help += ` | Posición ${diagnostic.start}`;
                }
            } else {
                // Fallback para cuando no está disponible el método (como en tests)
                help += ` | Posición ${diagnostic.start}`;
            }
        }
        return {
            file: fileName,
            message: enhancedMessage,
            severity,
            help,
        };
    });
}

/**
 * Limpia el mensaje de error eliminando información redundante
 */
function cleanErrorMessage(message: string): string {
    return (
        message
            // Remover prefijos verbosos
            .replace(/^error TS\d+:\s*/i, '')
            // Remover información de archivo duplicada al inicio
            .replace(/^.*\.ts\(\d+,\d+\):\s*/, '')
            // Limpiar espacios múltiples
            .replace(/\s+/g, ' ')
            .trim()
    );
}

/**
 * Mejora significativamente el mensaje de error TypeScript con contexto visual
 */
function enhanceErrorMessage(
    diagnostic: TypeScript.Diagnostic,
    fileName: string,
    sourceCode?: string,
): string {
    // Extraer el mensaje del error
    const message =
        typeof diagnostic.messageText === 'string'
            ? diagnostic.messageText
            : TypeScript.flattenDiagnosticMessageText(
                  diagnostic.messageText,
                  '\n',
              );

    let enhancedMessage = cleanErrorMessage(message); // Información de ubicación
    let location = `Código TS${diagnostic.code}`;
    let codeContext = '';

    if (diagnostic.file && diagnostic.start !== undefined) {
        const sourceFile = diagnostic.file;
        // Verificar que el método getLineAndCharacterOfPosition existe (para compatibilidad con mocks)
        if (typeof sourceFile.getLineAndCharacterOfPosition === 'function') {
            try {
                const lineAndChar = sourceFile.getLineAndCharacterOfPosition(
                    diagnostic.start,
                );
                const line = lineAndChar.line + 1;
                const column = lineAndChar.character + 1;

                location = `Línea ${line}, Columna ${column} | Código TS${diagnostic.code}`;
            } catch {
                // Si falla, solo mostrar la posición de carácter
                location = `Posición ${diagnostic.start} | Código TS${diagnostic.code}`;
            }
        } else {
            // Fallback para cuando no está disponible el método (como en tests)
            location = `Posición ${diagnostic.start} | Código TS${diagnostic.code}`;
        } // Agregar contexto del código si está disponible
        if (
            (sourceCode || sourceFile.text) &&
            typeof sourceFile.getLineAndCharacterOfPosition === 'function'
        ) {
            try {
                const lineAndChar = sourceFile.getLineAndCharacterOfPosition(
                    diagnostic.start,
                );
                const text = sourceCode || sourceFile.text;
                const lines = text.split('\n');
                const errorLine = lines[lineAndChar.line];

                if (errorLine) {
                    // Mostrar hasta 2 líneas antes y después para contexto
                    const startLine = Math.max(0, lineAndChar.line - 2);
                    const endLine = Math.min(
                        lines.length - 1,
                        lineAndChar.line + 2,
                    );

                    codeContext = '\n\n📝 Contexto del código:\n';

                    for (let i = startLine; i <= endLine; i++) {
                        const currentLine = i + 1;
                        const lineContent = lines[i] || '';
                        const isErrorLine = i === lineAndChar.line;

                        if (isErrorLine) {
                            codeContext += `  ${currentLine.toString().padStart(3, ' ')} ❌ ${lineContent}\n`;
                            // Agregar flecha apuntando al error
                            const arrow =
                                ' '.repeat(6 + lineAndChar.character + 1) +
                                '^^^';
                            codeContext += `       ${arrow}\n`;
                        } else {
                            codeContext += `  ${currentLine.toString().padStart(3, ' ')}    ${lineContent}\n`;
                        }
                    }
                }
            } catch {
                // Si falla obtener el contexto, continuar sin él
            }
        }
    }

    // Agregar sugerencias basadas en el tipo de error
    const suggestions = getErrorSuggestions(diagnostic.code, enhancedMessage);
    const suggestionsText =
        suggestions.length > 0
            ? `\n\n💡 Sugerencias:\n${suggestions.map(s => `   • ${s}`).join('\n')}`
            : '';

    return `${enhancedMessage}\n   📍 ${location}${codeContext}${suggestionsText}`;
}

/**
 * Proporciona sugerencias específicas basadas en el código de error TypeScript
 */
function getErrorSuggestions(errorCode: number, message: string): string[] {
    const suggestions: string[] = [];

    switch (errorCode) {
        case 2304: // Cannot find name
            suggestions.push('Verifica que la variable esté declarada');
            suggestions.push('Asegúrate de importar el módulo correspondiente');
            suggestions.push('Revisa la ortografía del nombre');
            break;
        case 2322: // Type assignment error
            suggestions.push('Verifica que los tipos sean compatibles');
            suggestions.push(
                'Considera usar type assertion: valor as TipoEsperado',
            );
            break;
        case 2307: // Cannot find module
            suggestions.push(
                'Verifica que el archivo exista en la ruta especificada',
            );
            suggestions.push('Revisa las rutas en tsconfig.json');
            suggestions.push('Asegúrate de que el paquete esté instalado');
            break;
        case 2451: // Cannot redeclare block-scoped variable
            suggestions.push('Cambia el nombre de la variable');
            suggestions.push('Usa un scope diferente (function, block)');
            break;
        case 7006: // Parameter implicitly has 'any' type
            suggestions.push('Agrega tipos explícitos a los parámetros');
            suggestions.push(
                'Considera habilitar "noImplicitAny": false en tsconfig.json',
            );
            break;
        case 1155: // 'const' declarations must be initialized
            suggestions.push(
                'Agrega un valor inicial: const variable = valor;',
            );
            suggestions.push('O cambia a "let" si quieres asignar después');
            break;
        case 2339: // Property does not exist
            suggestions.push('Verifica que la propiedad exista en el tipo');
            suggestions.push(
                'Considera usar optional chaining: objeto?.propiedad',
            );
            break;
        default:
            // Sugerencias genéricas basadas en el mensaje
            if (message.includes('Cannot find')) {
                suggestions.push(
                    'Verifica que el elemento exista y esté importado',
                );
            }
            if (message.includes('Type')) {
                suggestions.push('Revisa la compatibilidad de tipos');
            }
            if (message.includes('missing')) {
                suggestions.push('Agrega el elemento faltante');
            }
            break;
    }

    return suggestions;
}

/**
 * Crea un mensaje de error unificado para errores múltiples
 */
export function createUnifiedErrorMessage(
    errors: CleanTypeScriptError[],
): string {
    if (errors.length === 0) {
        return 'Error de TypeScript desconocido';
    }
    if (errors.length === 1) {
        const error = errors[0];
        if (error) {
            return `${error.message}\n  └─ ${error.help}`;
        }
        return 'Error de TypeScript desconocido';
    }

    const errorCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;

    // Mostrar hasta los primeros 10 errores con detalles
    const maxErrorsToShow = 10;
    const errorsToShow = errors.slice(0, maxErrorsToShow);
    const hasMoreErrors = errors.length > maxErrorsToShow;

    let result = '';

    // Agregar resumen
    let summary = '';
    if (errorCount > 0) {
        summary += `${errorCount} error${errorCount > 1 ? 'es' : ''}`;
    }
    if (warningCount > 0) {
        if (summary) summary += ', ';
        summary += `${warningCount} advertencia${warningCount > 1 ? 's' : ''}`;
    }

    result += `TypeScript: ${summary} encontrado${errorCount + warningCount > 1 ? 's' : ''}:\n\n`;

    // Agregar detalles de cada error
    errorsToShow.forEach((error, index) => {
        const icon =
            error.severity === 'error'
                ? '❌'
                : error.severity === 'warning'
                  ? '⚠️'
                  : 'ℹ️';
        result += `${icon} ${error.message}\n`;
        result += `   └─ ${error.help}\n`;
        if (index < errorsToShow.length - 1) result += '\n';
    });

    // Si hay más errores, indicarlo
    if (hasMoreErrors) {
        const remainingCount = errors.length - maxErrorsToShow;
        result += `\n... y ${remainingCount} error${remainingCount > 1 ? 'es' : ''} más`;
    }

    return result;
}

/**
 * Crea un mensaje de error simplificado para modo normal
 */
export function createSimpleErrorMessage(
    diagnostics: TypeScript.Diagnostic[],
    _fileName: string,
): string {
    if (diagnostics.length === 0) return '';

    const firstDiagnostic = diagnostics[0];
    if (!firstDiagnostic) return '';

    const message = TypeScript.flattenDiagnosticMessageText(
        firstDiagnostic.messageText,
        '\n',
    );

    // Extraer solo la primera línea del mensaje para simplicidad
    const simplifiedMessage = message.split('\n')[0];
    let location = '';
    if (firstDiagnostic.file && firstDiagnostic.start !== undefined) {
        const sourceFile = firstDiagnostic.file;
        // Verificar que el método getLineAndCharacterOfPosition existe (para compatibilidad con mocks)
        if (typeof sourceFile.getLineAndCharacterOfPosition === 'function') {
            try {
                const lineAndChar = sourceFile.getLineAndCharacterOfPosition(
                    firstDiagnostic.start,
                );
                location = ` (línea ${lineAndChar.line + 1})`;
            } catch {
                // Si falla, continuar sin información de ubicación
            }
        }
    }

    const errorCount = diagnostics.length;
    const countText = errorCount > 1 ? ` (+${errorCount - 1} más)` : '';

    return `${simplifiedMessage}${location}${countText}`;
}

/**
 * Crea un mensaje de error detallado para modo verbose
 */
export function createDetailedErrorMessage(
    diagnostics: TypeScript.Diagnostic[],
    fileName: string,
    sourceCode?: string,
): string {
    const cleanErrors = parseTypeScriptErrors(
        diagnostics,
        fileName,
        sourceCode,
    );
    return createUnifiedErrorMessage(cleanErrors);
}

/**
 * Registra errores de TypeScript en el inventario usando el parser limpio
 */
export function registerCleanTypeScriptErrors(
    diagnostics: TypeScript.Diagnostic[],
    fileName: string,
    registerInventoryError: (
        file: string,
        message: string,
        severity: string,
        help?: string,
    ) => void,
): void {
    const cleanErrors = parseTypeScriptErrors(diagnostics, fileName);

    cleanErrors.forEach(error => {
        registerInventoryError(
            error.file,
            error.message,
            error.severity,
            error.help,
        );
    });
}
