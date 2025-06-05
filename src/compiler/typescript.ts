import fs from 'node:fs';
import path from 'node:path';
import { env } from 'node:process';

import * as ts from 'typescript';

import {
    createUnifiedErrorMessage,
    parseTypeScriptErrors,
} from './typescript-error-parser';
import { TypeScriptWorkerManager } from './typescript-worker';

interface CompileResult {
    error: Error | null;
    data: string | null;
    lang?: string;
}

interface TypeCheckResult {
    diagnostics: ts.Diagnostic[];
    hasErrors: boolean;
}

/**
 * Cache para la configuración de TypeScript para evitar lecturas repetidas
 */
let configCache: { path?: string; options?: ts.CompilerOptions } = {};

/**
 * Carga la configuración de TypeScript desde tsconfig.json
 * @param fileName - Nombre del archivo para buscar el tsconfig.json relativo
 * @returns Opciones del compilador TypeScript
 */
export const loadTypeScriptConfig = (fileName: string): ts.CompilerOptions => {
    const fileDir = path.dirname(fileName);
    const configPath =
        ts.findConfigFile(fileDir, ts.sys.fileExists, 'tsconfig.json') ||
        path.resolve(process.cwd(), 'tsconfig.json');

    // Usar cache si el path no ha cambiado
    if (configCache.path === configPath && configCache.options) {
        return configCache.options;
    }

    let compilerOptions: ts.CompilerOptions;

    if (configPath && fs.existsSync(configPath)) {
        try {
            const { config, error: configError } = ts.readConfigFile(
                configPath,
                ts.sys.readFile,
            );
            if (!configError) {
                const parsedConfig = ts.parseJsonConfigFileContent(
                    config,
                    ts.sys,
                    path.dirname(configPath),
                );
                compilerOptions = {
                    ...parsedConfig.options,
                    // Asegurar opciones básicas necesarias
                    allowJs: parsedConfig.options.allowJs !== false,
                    esModuleInterop:
                        parsedConfig.options.esModuleInterop !== false,
                    allowSyntheticDefaultImports:
                        parsedConfig.options.allowSyntheticDefaultImports !==
                        false,
                    skipLibCheck: parsedConfig.options.skipLibCheck !== false,
                };
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
const getDefaultCompilerOptions = (): ts.CompilerOptions => ({
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ES2020,
    lib: ['es2020', 'dom', 'dom.iterable'],
    strict: false,
    skipLibCheck: true,
    allowJs: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    isolatedModules: true,
});

/**
 * Crea una versión optimizada y serializable de las opciones del compilador TypeScript.
 * @param options - Opciones originales del compilador
 * @returns Opciones serializables seguras para workers
 */
const createSerializableCompilerOptions = (
    options: ts.CompilerOptions,
): Record<string, any> => {
    // Usar las opciones del tsconfig.json pero con optimizaciones para el worker
    const {
        target = ts.ScriptTarget.ES2020,
        module = ts.ModuleKind.ES2020,
        lib = ['es2020', 'dom', 'dom.iterable'],
        allowJs = true,
        jsx,
        strict = false,
        skipLibCheck = true,
        esModuleInterop = true,
        allowSyntheticDefaultImports = true,
        isolatedModules = true,
    } = options;

    return {
        target,
        module,
        lib: Array.isArray(lib) ? lib : ['es2020', 'dom', 'dom.iterable'],
        allowJs,
        jsx,
        strict,
        skipLibCheck,
        skipDefaultLibCheck: true,
        esModuleInterop,
        allowSyntheticDefaultImports,
        isolatedModules,
        noEmitOnError: false,
        declaration: false,
        sourceMap: false,
    };
};

/**
 * Crea un Language Service Host optimizado para validación de tipos eficiente.
 */
class TypeScriptLanguageServiceHost implements ts.LanguageServiceHost {
    private files: Map<string, { version: number; content: string }> =
        new Map();
    private compilerOptions: ts.CompilerOptions;
    private fileSystemCache: Map<string, string | undefined> = new Map();

    constructor(compilerOptions: ts.CompilerOptions) {
        this.compilerOptions = compilerOptions;
    }

    addFile(fileName: string, content: string): void {
        const existing = this.files.get(fileName);
        this.files.set(fileName, {
            version: existing ? existing.version + 1 : 1,
            content,
        });
    }

    getCompilationSettings(): ts.CompilerOptions {
        return this.compilerOptions;
    }

    getScriptFileNames(): string[] {
        return Array.from(this.files.keys());
    }

    getScriptVersion(fileName: string): string {
        const file = this.files.get(fileName);
        return file ? file.version.toString() : '0';
    }

    getScriptSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
        const file = this.files.get(fileName);
        if (file) {
            return ts.ScriptSnapshot.fromString(file.content);
        }

        // Cache de sistema de archivos para evitar lecturas repetidas
        if (this.fileSystemCache.has(fileName)) {
            const cachedContent = this.fileSystemCache.get(fileName);
            return cachedContent
                ? ts.ScriptSnapshot.fromString(cachedContent)
                : undefined;
        }

        // Intentar leer el archivo del sistema de archivos solo si es necesario
        try {
            if (fs.existsSync(fileName)) {
                const content = fs.readFileSync(fileName, 'utf-8');
                this.fileSystemCache.set(fileName, content);
                return ts.ScriptSnapshot.fromString(content);
            }
        } catch {
            // Error al leer archivo
        }

        this.fileSystemCache.set(fileName, undefined);
        return undefined;
    }

    getCurrentDirectory(): string {
        return process.cwd();
    }

    getDefaultLibFileName(options: ts.CompilerOptions): string {
        return ts.getDefaultLibFilePath(options);
    }

    fileExists(path: string): boolean {
        if (this.files.has(path)) return true;

        if (this.fileSystemCache.has(path)) {
            return this.fileSystemCache.get(path) !== undefined;
        }

        const exists = fs.existsSync(path);
        if (!exists) this.fileSystemCache.set(path, undefined);
        return exists;
    }

    readFile(path: string): string | undefined {
        const file = this.files.get(path);
        if (file) return file.content;

        if (this.fileSystemCache.has(path)) {
            return this.fileSystemCache.get(path);
        }

        try {
            if (fs.existsSync(path)) {
                const content = fs.readFileSync(path, 'utf-8');
                this.fileSystemCache.set(path, content);
                return content;
            }
        } catch {
            // Error al leer archivo
        }

        this.fileSystemCache.set(path, undefined);
        return undefined;
    }

    getNewLine(): string {
        return ts.sys.newLine;
    }
}

/**
 * Realiza validación de tipos optimizada usando TypeScript Language Service.
 * @param fileName - Nombre del archivo
 * @param content - Contenido del archivo
 * @param compilerOptions - Opciones del compilador
 * @returns Resultado de la validación de tipos
 */
const validateTypesWithLanguageService = (
    fileName: string,
    content: string,
    compilerOptions: ts.CompilerOptions,
): TypeCheckResult => {
    try {
        // Validación temprana: contenido vacío
        if (!content.trim()) {
            return { diagnostics: [], hasErrors: false };
        }

        // Crear Language Service Host optimizado
        const host = new TypeScriptLanguageServiceHost(compilerOptions);

        // Determinar nombre de archivo efectivo
        let actualFileName = path.isAbsolute(fileName)
            ? fileName
            : path.resolve(fileName);

        // Para archivos Vue, crear archivo virtual
        if (fileName.endsWith('.vue')) {
            actualFileName = actualFileName.replace('.vue', '.vue.ts');
            host.addFile(actualFileName, content);

            // Añadir declaraciones Vue básicas solo si es necesario
            const vueTypesPath = path.join(
                path.dirname(actualFileName),
                'vue-types.d.ts',
            );
            const vueTypesDeclaration = `
declare global {
    function ref<T>(value: T): { value: T };
    function reactive<T extends object>(target: T): T;
    function computed<T>(getter: () => T): { value: T };
    function defineComponent<T>(options: T): T;
    function defineProps<T = {}>(): T;
    function defineEmits<T = {}>(): T;
    function onMounted(fn: () => void): void;
    function onUnmounted(fn: () => void): void;
    function watch<T>(source: () => T, callback: (newValue: T, oldValue: T) => void): void;
}
export {};`;
            host.addFile(vueTypesPath, vueTypesDeclaration);
        } else {
            host.addFile(actualFileName, content);
        }

        // Crear Language Service
        const languageService = ts.createLanguageService(host);

        // Verificar existencia del archivo
        if (!host.fileExists(actualFileName)) {
            return { diagnostics: [], hasErrors: false };
        }

        // Obtener diagnósticos con manejo de errores optimizado
        const allDiagnostics: ts.Diagnostic[] = [];

        try {
            allDiagnostics.push(
                ...languageService.getSyntacticDiagnostics(actualFileName),
            );
            allDiagnostics.push(
                ...languageService.getSemanticDiagnostics(actualFileName),
            );
        } catch {
            // Ignorar errores de diagnósticos
            return { diagnostics: [], hasErrors: false };
        }

        // Filtrado optimizado de diagnósticos
        const filteredDiagnostics = allDiagnostics.filter(diag => {
            if (diag.category !== ts.DiagnosticCategory.Error) return false;

            const messageText = ts.flattenDiagnosticMessageText(
                diag.messageText,
                '\n',
            );

            // Lista optimizada de patrones a ignorar
            const ignorePatterns = [
                'Cannot find module',
                'Could not find source file',
                "Parameter '$props' implicitly has an 'any' type",
                "Parameter '$setup' implicitly has an 'any' type",
                "Parameter '_ctx' implicitly has an 'any' type",
                "Parameter '_cache' implicitly has an 'any' type",
            ];

            return !ignorePatterns.some(pattern =>
                messageText.includes(pattern),
            );
        });

        return {
            diagnostics: filteredDiagnostics,
            hasErrors: filteredDiagnostics.length > 0,
        };
    } catch (error) {
        // Error handling simplificado
        return {
            diagnostics: [
                {
                    file: undefined,
                    start: undefined,
                    length: undefined,
                    messageText: `Error en validación de tipos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
                    category: ts.DiagnosticCategory.Error,
                    code: 0,
                },
            ],
            hasErrors: true,
        };
    }
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
 * @param {string} fileName - El nombre del archivo que contiene el código TypeScript.
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

        // PASO 1: Transpilación rápida con detección de errores críticos
        const transpileResult = ts.transpileModule(data, {
            compilerOptions: {
                ...compilerOptions,
                noLib: true,
                skipLibCheck: true,
                isolatedModules: true,
            },
            fileName,
            reportDiagnostics: true,
        });

        // Verificar errores críticos de sintaxis
        if (transpileResult.diagnostics?.length) {
            const criticalErrors = transpileResult.diagnostics.filter(diag => {
                if (diag.category !== ts.DiagnosticCategory.Error) return false;

                const messageText = ts.flattenDiagnosticMessageText(
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
            });

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
