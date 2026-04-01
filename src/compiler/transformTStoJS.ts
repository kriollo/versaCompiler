import { transform } from 'oxc-transform';

export async function transpileTStoJS(
    filePath: string,
    sourceCode: string,
): Promise<{ outputText: string; declaration: string; diagnostics: string[] }> {
    try {
        const {
            code: outputText,
            declaration,
            errors: diagnostics,
        } = await transform(filePath, sourceCode);

        // Si oxc-transform devuelve código vacío ante una entrada no vacía,
        // usar el fuente original como fallback para no corromper el pipeline.
        if (!outputText && sourceCode.trim()) {
            return {
                outputText: sourceCode,
                declaration: declaration || '',
                diagnostics: [
                    `Warning: oxc-transform produjo salida vacía para ${filePath}, usando fuente original`,
                    ...(diagnostics ?? []).map(d =>
                        typeof d === 'string' ? d : JSON.stringify(d),
                    ),
                ],
            };
        }

        return {
            outputText: outputText ?? sourceCode,
            declaration: declaration || '',
            diagnostics: (diagnostics ?? []).map(d =>
                typeof d === 'string' ? d : JSON.stringify(d),
            ),
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        // Fallback al fuente original para que el pipeline no reciba código vacío
        return {
            outputText: sourceCode,
            declaration: '',
            diagnostics: [
                `Error durante transpilación de ${filePath}: ${errorMsg}. Usando fuente original.`,
            ],
        };
    }
}

/** @deprecated Usar transpileTStoJS (corrección de typo histórico) */
export const traspileTStoJS = transpileTStoJS;
