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
import { TypeScriptWorkerPool } from './typescript-worker-pool';

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
 * ✨ FIX #9: Ahora incluye timestamp para detectar cambios en el archivo
 */
let configCache: {
    path?: string;
    options?: typescript.CompilerOptions;
    mtime?: number;
} = {};

/**
 * Carga la configuración de TypeScript desde tsconfig.json
 * @param fileName - Nombre del archivo para buscar el tsconfig.json relativo
 * @returns Opciones del compilador TypeScript
 */
export const loadTypeScriptConfig = (
    fileName: string,
): typescript.CompilerOptions => {
    // Siempre buscar primero en la raíz del proyecto
    const rootConfigPath = path.resolve(process.cwd(), 'tsconfig.json');

    // Si no existe en la raíz, buscar desde el directorio del archivo
    const fileDir = path.dirname(fileName);
    const configPath = fs.existsSync(rootConfigPath)
        ? rootConfigPath
        : typescript.findConfigFile(
              fileDir,
              typescript.sys.fileExists,
              'tsconfig.json',
          );

    // ✨ FIX #9: Verificar si el archivo cambió comparando timestamp
    if (configPath && fs.existsSync(configPath)) {
        const stats = fs.statSync(configPath);
        const currentMtime = stats.mtimeMs;

        // Usar cache solo si el archivo no cambió
        if (
            configCache.path === configPath &&
            configCache.mtime === currentMtime &&
            configCache.options
        ) {
            return configCache.options;
        }
    }

    let compilerOptions: typescript.CompilerOptions;

    if (configPath && fs.existsSync(configPath)) {
        const stats = fs.statSync(configPath);
        const currentMtime = stats.mtimeMs;

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
                ); // Usar exactamente la configuración del tsconfig.json del usuario sin modificaciones
                compilerOptions = parsedConfig.options;
                // DEBUG: Verificar las opciones cargadas
                // console.log(`[DEBUG] Opciones de TypeScript cargadas desde ${configPath}:`);
                // console.log(`  noImplicitAny: ${compilerOptions.noImplicitAny}`);
                // console.log(`  strict: ${compilerOptions.strict}`);
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
            throw new Error(
                `No se puede continuar sin un tsconfig.json válido. Error: ${error}`,
                { cause: error },
            );
        }

        // ✨ FIX #9: Guardar en cache con timestamp
        configCache = {
            path: configPath,
            options: compilerOptions,
            mtime: currentMtime,
        };
        return compilerOptions;
    } else {
        throw new Error(
            `No se encontró tsconfig.json en la raíz del proyecto (${rootConfigPath}) ni en el directorio del archivo. ` +
                `El compilador requiere un tsconfig.json para funcionar correctamente.`,
        );
    }
};

/**
 * ✨ FIX #9: Invalida el cache de configuración de TypeScript
 * Útil cuando se detectan cambios en tsconfig.json o para tests
 */
export function invalidateConfigCache(): void {
    configCache = {};
}

/**
 * Crea una versión optimizada y serializable de las opciones del compilador typescript.
 * @param options - Opciones originales del compilador
 * @returns Opciones serializables seguras para workers
 */
const createSerializableCompilerOptions = (
    options: typescript.CompilerOptions,
): Record<string, any> => {
    // Respetar exactamente las opciones del tsconfig.json del usuario    // Respetar completamente la configuración del usuario del tsconfig.json
    const result = { ...options };

    // NO modificar ninguna opción del usuario - usar configuración exacta del tsconfig.json

    return result;
};

/**
 * Crea un Language Service Host optimizado para validación de tipos eficiente.
 */

/**
 * Valida tipos en archivos Vue antes de la compilación con soporte mejorado
 * @param vueContent - Contenido del archivo Vue
 * @param fileName - Nombre del archivo Vue
 * @param options - Opciones adicionales para la validación
 * @returns Resultado de la validación de tipos
 */
export const validateVueTypes = (
    vueContent: string,
    fileName: string,
    options?: {
        strictMode?: boolean;
        includeWarnings?: boolean;
        compilerOptions?: typescript.CompilerOptions;
    },
): TypeCheckResult => {
    // Extraer contenido del script de Vue
    let scriptContent = '';

    if (fileName.endsWith('.vue')) {
        // Extraer contenido entre <script> y </script>
        const scriptMatch = vueContent.match(
            /<script[^>]*>([\s\S]*?)<\/script>/i,
        );
        if (scriptMatch && scriptMatch[1]) {
            scriptContent = scriptMatch[1].trim();
        } else {
            // Si no hay script, no hay nada que validar
            return { diagnostics: [], hasErrors: false };
        }
    } else {
        // Para archivos .ts/.js normales, usar todo el contenido
        scriptContent = vueContent;
    }

    // Si el script está vacío, no validar
    if (!scriptContent.trim()) {
        return { diagnostics: [], hasErrors: false };
    }

    // Cargar la configuración del usuario como base
    const userConfig = loadTypeScriptConfig(fileName);

    // Crear opciones del compilador respetando la configuración del usuario
    let compilerOptions: typescript.CompilerOptions;

    if (options?.compilerOptions) {
        // Si se proporcionaron opciones explícitas, usarlas como base
        compilerOptions = { ...options.compilerOptions };
    } else {
        // Usar la configuración del usuario como base
        compilerOptions = { ...userConfig };
    }

    // Solo forzar las opciones ABSOLUTAMENTE necesarias para Vue
    // Estas opciones se fuerzan porque son técnicamente requeridas para el funcionamiento correcto

    if (fileName.endsWith('.vue')) {
        // JSX: Necesario para que funcione el template compilation de Vue
        compilerOptions.jsx = typescript.JsxEmit.Preserve;

        // ModuleResolution: Necesario para resolver módulos Vue correctamente
        if (!compilerOptions.moduleResolution) {
            compilerOptions.moduleResolution =
                typescript.ModuleResolutionKind.NodeJs;
        }

        // Lib: Asegurar que DOM esté disponible para archivos Vue, pero respetar otras libs del usuario
        const currentLibs = compilerOptions.lib || userConfig.lib || ['ES2020'];
        const hasDOM = currentLibs.some(
            lib =>
                typeof lib === 'string' &&
                (lib.toLowerCase().includes('dom') ||
                    lib.toLowerCase() === 'dom'),
        );

        if (!hasDOM) {
            compilerOptions.lib = [...currentLibs, 'DOM', 'DOM.Iterable'];
        }

        // Types: Agregar 'vue' si no está presente, pero mantener otros types del usuario
        const currentTypes = compilerOptions.types || userConfig.types || [];
        if (!currentTypes.includes('vue')) {
            compilerOptions.types = [...currentTypes, 'vue'];
        }
    }

    // Configuraciones que mejoran la detección de errores pero respetan preferencias del usuario
    // Solo se aplican si el usuario no las ha configurado explícitamente
    if (compilerOptions.skipLibCheck === undefined) {
        compilerOptions.skipLibCheck = true; // Para evitar errores en librerías externas
    }

    // Aplicar strictMode solo si el usuario no ha configurado estas opciones individualmente
    if (options?.strictMode !== undefined) {
        if (compilerOptions.noImplicitReturns === undefined) {
            compilerOptions.noImplicitReturns = options.strictMode;
        }
        if (compilerOptions.noImplicitThis === undefined) {
            compilerOptions.noImplicitThis = options.strictMode;
        }
        if (compilerOptions.strictNullChecks === undefined) {
            compilerOptions.strictNullChecks = options.strictMode;
        }
        if (compilerOptions.strictFunctionTypes === undefined) {
            compilerOptions.strictFunctionTypes = options.strictMode;
        }
        if (compilerOptions.exactOptionalPropertyTypes === undefined) {
            compilerOptions.exactOptionalPropertyTypes = false; // Menos estricto por defecto
        }
        if (compilerOptions.noFallthroughCasesInSwitch === undefined) {
            compilerOptions.noFallthroughCasesInSwitch = options.strictMode;
        }
    }

    return validateTypesWithLanguageService(
        fileName,
        scriptContent, // Usar solo el contenido del script
        compilerOptions,
    );
};

/**
 * Limpia los export {} innecesarios que TypeScript agrega automáticamente
 * @param compiledOutput - Código JavaScript compilado
 * @param originalSource - Código TypeScript original
 * @returns Código limpio sin export {} innecesarios
 */
const cleanupUnnecessaryExports = (
    compiledOutput: string,
    originalSource: string,
): string => {
    // Si el output está vacío o solo contiene export {}
    if (compiledOutput.trim() === 'export {};') {
        return '';
    }

    // Verificar si el código fuente original tiene imports/exports reales
    const hasRealImportsExports =
        /(?:^|\s)(?:import|export)\s+(?!(?:\s*\{\s*\}\s*;?\s*$))/m.test(
            originalSource,
        );

    // Si no hay imports/exports reales, eliminar export {} del final
    if (!hasRealImportsExports) {
        // Buscar el patrón exacto en el archivo
        const exportPattern = /export\s*\{\s*\}\s*;\s*$/m;
        const hasExportAtEnd = exportPattern.test(compiledOutput);

        if (hasExportAtEnd) {
            return compiledOutput.replace(exportPattern, '');
        }
    }

    return compiledOutput;
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
        const compilerOptions = loadTypeScriptConfig(fileName);

        // PASO 1: Transpilación ULTRA RÁPIDA con mínima verificación
        // Optimizaciones agresivas para máxima velocidad
        const transpileResult = typescript.transpileModule(data, {
            compilerOptions: {
                ...compilerOptions,
                // Optimizaciones de velocidad
                noLib: true,
                skipLibCheck: true,
                isolatedModules: true,
                // Deshabilitar checks innecesarios
                noResolve: true,
                // ✅ REMOVIDAS opciones obsoletas de TypeScript 5.9:
                // - suppressImplicitAnyIndexErrors (ya no existe)
                // - suppressExcessPropertyErrors (ya no existe)
                allowSyntheticDefaultImports: true,
                // Modo más rápido
                incremental: false, // No usar incremental en transpileModule
                diagnostics: false,
            },
            fileName,
            reportDiagnostics: env.VERBOSE === 'true', // Solo reportar en verbose
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
        } // PASO 2: Type checking opcional (solo si está habilitado)
        if (env.typeCheck === 'true') {
            try {
                const workerPool = TypeScriptWorkerPool.getInstance();

                const serializableOptions =
                    createSerializableCompilerOptions(compilerOptions);
                const typeCheckResult = await workerPool.typeCheck(
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
                    '[preCompileTS] ❌ Type checking falló, usando transpilación sin verificación de tipos:',
                    typeCheckError,
                );
            }
        }

        // PASO 3: Devolver resultado optimizado
        let output = transpileResult.outputText;

        // Limpiar export {} innecesarios
        output = cleanupUnnecessaryExports(output, data);

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
