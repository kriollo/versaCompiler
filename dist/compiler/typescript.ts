import { readFile } from 'node:fs/promises';
import path from 'node:path';
import * as ts from 'typescript';
/**
 * Precompila el código TypeScript proporcionado.
 * @param {string} data - El código TypeScript a precompilar.
 * @param {string} fileName - El nombre del archivo que contiene el código TypeScript.
 *
 * @returns {Promise<Object>} - Un objeto con el código precompilado o un error.
 */
export const preCompileTS = async (data:string, fileName:string): Promise<{ error: Error | null; data: string | null }> => {
    try {
        // Leer tsconfig.json
        const PATH_CONFIG_FILE = path.resolve(process.cwd(), 'tsconfig.json');
        const tsConfigContent = await readFile(PATH_CONFIG_FILE, 'utf-8');
        if (!tsConfigContent) {
            throw new Error(
                `No se pudo leer el archivo tsconfig.json en: ${PATH_CONFIG_FILE}`,
            );
        }

        const tsConfig = JSON.parse(tsConfigContent);

        // Obtener las opciones del compilador
        const { compilerOptions } = tsConfig;

        if (!compilerOptions) {
            throw new Error(
                'No se encontraron compilerOptions en tsconfig.json',
            );
        }

        // Crear host de configuración de parseo
        const parseConfigHost = {
            useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
            readDirectory: ts.sys.readDirectory,
            fileExists: ts.sys.fileExists,
            readFile: ts.sys.readFile,
            onUnRecoverableConfigFileDiagnostic: diagnostic => {
                throw new Error(
                    ts.flattenDiagnosticMessageText(
                        diagnostic.messageText,
                        '\n',
                    ),
                );
            },
        };

        // Parsear la configuración para que TS la entienda
        const parsedConfig = ts.parseJsonConfigFileContent(
            tsConfig,
            parseConfigHost,
            path.dirname(PATH_CONFIG_FILE),
        );
        if (parsedConfig.errors.length) {
            const errors = parsedConfig.errors.map(diagnostic =>
                ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
            );
            throw new Error(
                `Error al parsear tsconfig.json:\n${errors.join('\n')}`,
            );
        }

        // Transpilar el código
        const result = ts.transpileModule(data, {
            compilerOptions: parsedConfig.options,
            reportDiagnostics: true,
            fileName,
        });
        if (result.diagnostics && result.diagnostics.length > 0) {
            const errors = result.diagnostics.map(diagnostic => {
                if (diagnostic.file && diagnostic.start !== undefined) {
                    const { line, character } =
                        diagnostic.file.getLineAndCharacterOfPosition(
                            diagnostic.start,
                        );
                    return `${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')} - ${diagnostic.file.fileName} (${line + 1},${character + 1})`;
                } else {
                    return `${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
                }
            });

            throw new Error(`${errors.join('\n')}`);
        }

        return { error: null, data: result.outputText };
    } catch (error) {
        return { error, data: null };
    }
};
