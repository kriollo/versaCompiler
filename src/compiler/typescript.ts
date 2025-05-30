import path from 'node:path';

import * as ts from 'typescript';

interface CompileResult {
    error: Error | null;
    data: string | null;
    lang?: string;
}

/**
 * Precompila el código TypeScript proporcionado.
 * @param {string} data - El código TypeScript a precompilar.
 * @param {string} fileName - El nombre del archivo que contiene el código TypeScript.
 *
 * @returns {Promise<CompileResult>} - Un objeto con el código precompilado o un error.
 */
export const preCompileTS = async (
    data: string,
    fileName: string,
): Promise<CompileResult> => {
    try {
        // Si el código está vacío, devolver cadena vacía
        if (!data.trim()) {
            return { error: null, data: '', lang: 'ts' };
        }

        // Buscar tsconfig.json en el directorio del archivo o sus padres
        const fileDir = path.dirname(fileName);
        const configPath =
            ts.findConfigFile(fileDir, ts.sys.fileExists, 'tsconfig.json') ||
            path.resolve(process.cwd(), 'tsconfig.json');

        if (!configPath) {
            throw new Error('No se pudo encontrar tsconfig.json');
        }

        // Cargar y parsear tsconfig.json
        const { config, error: configError } = ts.readConfigFile(
            configPath,
            ts.sys.readFile,
        );
        if (configError) {
            throw new Error(
                `Error al leer tsconfig.json: ${configError.messageText}`,
            );
        }

        // Parsear la configuración
        const parsedConfig = ts.parseJsonConfigFileContent(
            config,
            ts.sys,
            path.dirname(configPath),
        ); // Usar las opciones del tsconfig.json directamente
        const compilerOptions: ts.CompilerOptions = {
            ...parsedConfig.options,
            // Solo sobreescribir opciones críticas que no deben venir del tsconfig
            noEmit: false,
            noEmitOnError: false,
        };

        // Usar transpileModule para compilación
        const transpileResult = ts.transpileModule(data, {
            compilerOptions,
            fileName,
            reportDiagnostics: true,
            transformers: undefined,
            moduleName: path.basename(fileName, path.extname(fileName)),
        });

        // Filtrar y procesar diagnósticos
        const diagnostics = (transpileResult.diagnostics || [])
            .filter(diag => diag.category === ts.DiagnosticCategory.Error)
            .filter(diag => {
                // Ignorar errores de módulos no encontrados
                const messageText = ts.flattenDiagnosticMessageText(
                    diag.messageText,
                    '\n',
                );
                return (
                    !messageText.includes('Cannot find module') &&
                    !messageText.includes('Cannot find name')
                );
            });

        if (diagnostics.length > 0) {
            const errorMessage = ts.formatDiagnosticsWithColorAndContext(
                diagnostics,
                {
                    getCurrentDirectory: () => process.cwd(),
                    getCanonicalFileName: fileName => fileName,
                    getNewLine: () => ts.sys.newLine,
                },
            );
            return { error: new Error(errorMessage), data: null, lang: 'ts' };
        }

        const output = transpileResult.outputText;

        // Remover "export {};" si es la única línea
        if (output.trim() === 'export {};') {
            return { error: null, data: '', lang: 'ts' };
        }

        return { error: null, data: output, lang: 'ts' };
    } catch (error) {
        return {
            error:
                error instanceof Error ? error : new Error('Error desconocido'),
            data: null,
            lang: 'ts',
        };
    }
};

