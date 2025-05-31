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
 * Parsea errores de TypeScript y los convierte a un formato limpio
 * que incluye solo: archivo, mensaje, severidad y ubicación como ayuda
 */
export function parseTypeScriptErrors(
    diagnostics: ts.Diagnostic[],
    fileName: string,
): CleanTypeScriptError[] {
    return diagnostics.map(diagnostic => {
        // Extraer el mensaje del error (sin contexto adicional)
        const message =
            typeof diagnostic.messageText === 'string'
                ? diagnostic.messageText
                : ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

        // Determinar la severidad
        let severity: 'error' | 'warning' | 'info';
        switch (diagnostic.category) {
            case ts.DiagnosticCategory.Error:
                severity = 'error';
                break;
            case ts.DiagnosticCategory.Warning:
                severity = 'warning';
                break;
            default:
                severity = 'info';
                break;
        }

        // Construir información de ubicación limpia
        let help = `Código TS${diagnostic.code}`;

        if (diagnostic.file && diagnostic.start !== undefined) {
            const sourceFile = diagnostic.file;
            const lineAndChar = sourceFile.getLineAndCharacterOfPosition(
                diagnostic.start,
            );
            help += ` | Línea ${lineAndChar.line + 1}, Columna ${lineAndChar.character + 1}`;
        }

        return {
            file: fileName,
            message: cleanErrorMessage(message),
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
        return `${error.message}\n  └─ ${error.help}`;
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
 * Registra errores de TypeScript en el inventario usando el parser limpio
 */
export function registerCleanTypeScriptErrors(
    diagnostics: ts.Diagnostic[],
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
