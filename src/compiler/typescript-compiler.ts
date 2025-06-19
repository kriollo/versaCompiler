import fs from 'node:fs';
import path from 'node:path';
import * as process from 'node:process';
import { env } from 'node:process';

import * as typescript from 'typescript';

import {
    createUnifiedErrorMessage,
    parseTypeScriptErrors,
} from './typescript-error-parser';
import { validateTypesWithLanguageService } from './typescript-sync-validator';
import { TypeScriptWorkerManager } from './typescript-worker';

interface CompileResult {
    error: Error | null;
    data: string | null;
    lang?: string;
}

interface TypeCheckResult {
    diagnostics: typescript.Diagnostic[];
    hasErrors: boolean;
}

/**
 * Cache para la configuración de TypeScript para evitar lecturas repetidas
 */
let configCache: { path?: string; options?: typescript.CompilerOptions } = {};

/**
 * Carga la configuración de TypeScript desde tsconfig.json
 * @param fileName - Nombre del archivo para buscar el tsconfig.json relativo
 * @returns Opciones del compilador TypeScript
 */
export const loadTypeScriptConfig = (
    fileName: string,
): typescript.CompilerOptions => {
    const fileDir = path.dirname(fileName);
    const configPath =
        typescript.findConfigFile(
            fileDir,
            typescript.sys.fileExists,
            'tsconfig.json',
        ) || path.resolve(process.cwd(), 'tsconfig.json');

    // Usar cache si el path no ha cambiado
    if (configCache.path === configPath && configCache.options) {
        return configCache.options;
    }
    let compilerOptions: typescript.CompilerOptions;

    if (configPath && fs.existsSync(configPath)) {
        try {
            const { config, error: configError } = typescript.readConfigFile(
                configPath,
                typescript.sys.readFile,
            );
            if (!configError) {
                const parsedConfig = typescript.parseJsonConfigFileContent(
                    config,
                    typescript.sys,
                    path.dirname(configPath),
                ); // Usar exactamente la configuración del tsconfig.json del usuario
                compilerOptions = parsedConfig.options;
            } else {
                throw new Error(
                    `Error al leer tsconfig.json: ${configError.messageText}`,
                );
            }
        } catch (error) {
            console.warn(
                `[loadTypeScriptConfig] Error cargando ${configPath}:`,
                error,
            );
            // Fallback a opciones por defecto
            compilerOptions = getDefaultCompilerOptions();
        }
    } else {
        // Opciones por defecto si no se encuentra tsconfig.json
        compilerOptions = getDefaultCompilerOptions();
    }

    // Guardar en cache
    configCache = { path: configPath, options: compilerOptions };
    return compilerOptions;
};

/**
 * Obtiene las opciones por defecto del compilador TypeScript
 */
const getDefaultCompilerOptions = (): typescript.CompilerOptions => ({
    target: typescript.ScriptTarget.ES2020,
    module: typescript.ModuleKind.ES2020,
    lib: ['es2020', 'dom', 'dom.iterable'],
    strict: false,
    skipLibCheck: true,
    allowJs: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    isolatedModules: true,
});

/**
 * Crea una versión optimizada y serializable de las opciones del compilador typescript.
 * @param options - Opciones originales del compilador
 * @returns Opciones serializables seguras para workers
 */
const createSerializableCompilerOptions = (
    options: typescript.CompilerOptions,
): Record<string, any> => {
    // Respetar completamente la configuración del usuario del tsconfig.json
    return {
        ...options,
        // NO modificar configuraciones del usuario - solo optimizaciones internas del worker que no afectan la validación
        declaration: false, // No necesitamos declaraciones en el worker
        sourceMap: false, // No necesitamos source maps en el worker
    };
};

/**
 * Valida tipos en archivos Vue antes de la compilación
 * @param vueContent - Contenido del archivo Vue
 * @param fileName - Nombre del archivo Vue
 * @returns Resultado de la validación de tipos
 */
export const validateVueTypes = (
    vueContent: string,
    fileName: string,
): TypeCheckResult => {
    const compilerOptions = loadTypeScriptConfig(fileName);
    return validateTypesWithLanguageService(
        fileName,
        vueContent,
        compilerOptions,
    );
};

/**
 * Precompila el código TypeScript con pipeline optimizado para máxima performance.
 * @param {string} data - El código TypeScript a precompilar.
 * @param {string} fileName - El nombre del archivo que contiene el código typescript.
 * @returns {Promise<CompileResult>} - Un objeto con el código precompilado o un error.
 */
export const preCompileTS = async (
    data: string,
    fileName: string,
): Promise<CompileResult> => {
    try {
        // Validación temprana: contenido vacío
        if (!data.trim()) {
            return { error: null, data: data, lang: 'ts' };
        }

        // Cargar configuración de TypeScript desde tsconfig.json
        const compilerOptions = loadTypeScriptConfig(fileName); // PASO 1: Transpilación rápida con detección de errores críticos
        const transpileResult = typescript.transpileModule(data, {
            compilerOptions: {
                ...compilerOptions,
                noLib: true,
                skipLibCheck: true,
                isolatedModules: true,
            },
            fileName,
            reportDiagnostics: true,
        });

        // const transpileResult = traspileTStoJS(
        //     fileName,data)

        // Verificar errores críticos de sintaxis
        if (transpileResult.diagnostics?.length) {
            const criticalErrors = transpileResult.diagnostics.filter(
                (diag: typescript.Diagnostic) => {
                    if (diag.category !== typescript.DiagnosticCategory.Error)
                        return false;

                    const messageText = typescript.flattenDiagnosticMessageText(
                        diag.messageText,
                        '\n',
                    );

                    // Ignorar errores de módulo no encontrado
                    return (
                        !messageText.includes('Cannot find module') &&
                        !messageText.includes('Could not find source file') &&
                        diag.code !== 2307 &&
                        diag.code !== 6059
                    );
                },
            );

            if (criticalErrors.length > 0) {
                const errorMessage = createUnifiedErrorMessage(
                    parseTypeScriptErrors(criticalErrors, fileName, data),
                );
                return {
                    error: new Error(errorMessage),
                    data: null,
                    lang: 'ts',
                };
            }
        }

        // PASO 2: Type checking opcional (solo si está habilitado)
        if (env.typeCheck === 'true') {
            try {
                const workerManager = TypeScriptWorkerManager.getInstance();
                const serializableOptions =
                    createSerializableCompilerOptions(compilerOptions);

                const typeCheckResult = await workerManager.typeCheck(
                    fileName,
                    data,
                    serializableOptions,
                );

                if (typeCheckResult.hasErrors) {
                    const errorMessage = createUnifiedErrorMessage(
                        parseTypeScriptErrors(
                            typeCheckResult.diagnostics,
                            fileName,
                            data,
                        ),
                    );
                    return {
                        error: new Error(errorMessage),
                        data: null,
                        lang: 'ts',
                    };
                }
            } catch (typeCheckError) {
                // Type checking falla, pero continuar con transpilación
                console.warn(
                    '[preCompileTS] Type checking failed:',
                    typeCheckError,
                );
            }
        }

        // PASO 3: Devolver resultado optimizado
        const output = transpileResult.outputText;

        // Limpiar output vacío
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
