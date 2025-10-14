import { transform } from 'oxc-transform';

export function traspileTStoJS(
    filePath: string,
    sourceCode: string,
): { outputText: string; declaration: string; diagnostics: any[] } {
    try {
        const {
            code: outputText,
            declaration,
            errors: diagnostics,
        } = transform(filePath, sourceCode);
        return {
            outputText: outputText,
            declaration: declaration || '',
            diagnostics: diagnostics || [],
        };
    } catch (error) {
        console.error(`Error transpiling ${filePath}:`, error);
        return { outputText: '', declaration: '', diagnostics: [error] };
    }
}
