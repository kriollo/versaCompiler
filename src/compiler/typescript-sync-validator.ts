/**
 * TypeScript Sync Validator - Validación síncrona de tipos como fallback
 * Contiene la lógica extraída del módulo principal para cuando el worker no está disponible
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';

import * as typescript from 'typescript';

/**
 * Genera declaraciones básicas de tipos para Vue como fallback
 */
const generateBasicVueTypes = (): string => {
    return `// Declaraciones básicas de tipos Vue para validación
declare global {
    function ref<T>(value: T): { value: T };
    function reactive<T extends object>(target: T): T;
    function computed<T>(getter: () => T): { value: T };
    function defineComponent<T>(options: T): T;
    function defineProps<T = {}>(): T;
    function defineEmits<T = {}>(): T;
    function defineExpose<T = {}>(exposed: T): void;
    function onMounted(fn: () => void): void;
    function onUnmounted(fn: () => void): void;
    function onBeforeMount(fn: () => void): void;
    function onBeforeUnmount(fn: () => void): void;
    function onUpdated(fn: () => void): void;
    function onBeforeUpdate(fn: () => void): void;
    function provide<T>(key: string | symbol, value: T): void;
    function inject<T>(key: string | symbol, defaultValue?: T): T | undefined;
    function useSlots(): { [key: string]: (...args: any[]) => any };
    function useAttrs(): { [key: string]: any };
    function useModel<T>(modelName?: string): { value: T };
    function watch<T>(source: () => T, callback: (newValue: T, oldValue: T) => void): void;
    function watchEffect(effect: () => void): void;
    function nextTick(callback?: () => void): Promise<void>;
    function getCurrentInstance(): any;
    function mergeModels<T>(models: T): T;
}
declare module '*.vue' {
    const component: any;
    export default component;
}
export {};`;
};

/**
 * Resultado de la validación de tipos
 */
interface TypeCheckResult {
    diagnostics: typescript.Diagnostic[];
    hasErrors: boolean;
}

/**
 * Language Service Host para validación de tipos eficiente
 */
class TypeScriptLanguageServiceHost implements typescript.LanguageServiceHost {
    private files: Map<string, { version: number; content: string }> =
        new Map();
    private compilerOptions: typescript.CompilerOptions;
    constructor(compilerOptions: typescript.CompilerOptions) {
        this.compilerOptions = {
            ...compilerOptions,
            // Asegurar que las librerías DOM estén incluidas para archivos Vue
            lib: compilerOptions.lib || ['ES2020', 'DOM', 'DOM.Iterable'],
        };
    }

    addFile(fileName: string, content: string): void {
        const existing = this.files.get(fileName);
        this.files.set(fileName, {
            version: existing ? existing.version + 1 : 1,
            content,
        });
    }
    getCompilationSettings(): typescript.CompilerOptions {
        return this.compilerOptions;
    }

    getScriptFileNames(): string[] {
        return Array.from(this.files.keys());
    }

    getScriptVersion(fileName: string): string {
        const file = this.files.get(fileName);
        return file ? file.version.toString() : '0';
    }
    getScriptSnapshot(
        fileName: string,
    ): typescript.IScriptSnapshot | undefined {
        const file = this.files.get(fileName);
        if (file) {
            return typescript.ScriptSnapshot.fromString(file.content);
        } // Intentar leer el archivo del sistema de archivos para dependencias
        if (fs.existsSync(fileName)) {
            try {
                const content = fs.readFileSync(fileName, 'utf-8');
                return typescript.ScriptSnapshot.fromString(content);
            } catch {
                return undefined;
            }
        }

        return undefined;
    }

    getCurrentDirectory(): string {
        return process.cwd();
    }
    getDefaultLibFileName(options: typescript.CompilerOptions): string {
        return typescript.getDefaultLibFilePath(options);
    }

    fileExists(path: string): boolean {
        return this.files.has(path) || fs.existsSync(path);
    }

    readFile(path: string): string | undefined {
        const file = this.files.get(path);
        if (file) {
            return file.content;
        }

        if (fs.existsSync(path)) {
            try {
                return fs.readFileSync(path, 'utf-8');
            } catch {
                return undefined;
            }
        }

        return undefined;
    }
    getNewLine(): string {
        return typescript.sys.newLine;
    }
}

/**
 * Realiza validación de tipos usando TypeScript Language Service (versión síncrona)
 * @param fileName - Nombre del archivo
 * @param content - Contenido del archivo
 * @param compilerOptions - Opciones del compilador
 * @returns Resultado de la validación de tipos
 */
export const validateTypesWithLanguageService = (
    fileName: string,
    content: string,
    compilerOptions: typescript.CompilerOptions,
): TypeCheckResult => {
    try {
        // Si el script está vacío o es solo espacios en blanco, no validar
        if (!content.trim()) {
            return { diagnostics: [], hasErrors: false };
        } // Crear Language Service Host
        const host = new TypeScriptLanguageServiceHost(compilerOptions);

        // Para archivos Vue, crear un archivo virtual .ts
        let actualFileName = fileName;
        if (fileName.endsWith('.vue')) {
            // Crear un nombre de archivo virtual con extensión .ts
            actualFileName = fileName.replace('.vue', '.vue.ts');
        }

        // Agregar el archivo al host con el nombre correcto
        host.addFile(actualFileName, content);

        // Agregar declaraciones de tipos para Vue si es necesario
        if (fileName.endsWith('.vue')) {
            // Cargar declaraciones de tipos Vue desde archivo shims
            const projectRoot = process.cwd();
            const vueShimsPath = path.join(
                projectRoot,
                'src/types/vue-shims.d.ts',
            );
            try {
                if (fs.existsSync(vueShimsPath)) {
                    const vueShimsContent = fs.readFileSync(
                        vueShimsPath,
                        'utf-8',
                    );
                    host.addFile(vueShimsPath, vueShimsContent);
                } else {
                    // Fallback a declaraciones básicas si no se encuentra el archivo shims
                    const basicVueTypes = generateBasicVueTypes();
                    const fallbackTypesPath = path.join(
                        path.dirname(fileName),
                        'vue-fallback.d.ts',
                    );
                    host.addFile(fallbackTypesPath, basicVueTypes);
                }
            } catch (error) {
                // Si hay error cargando los tipos, usar fallback básico
                console.warn('Error al cargar tipos Vue:', error);
                const basicVueTypes = generateBasicVueTypes();
                const fallbackTypesPath = path.join(
                    path.dirname(fileName),
                    'vue-fallback.d.ts',
                );
                host.addFile(fallbackTypesPath, basicVueTypes);
            }
        } // Crear Language Service
        const languageService = typescript.createLanguageService(host);

        try {
            // Verificar que el archivo existe en el host antes de solicitar diagnósticos
            if (!host.fileExists(actualFileName)) {
                console.log(
                    'File does not exist in host, returning empty result',
                );
                return { diagnostics: [], hasErrors: false };
            } // Obtener diagnósticos de tipos con manejo de errores
            let syntacticDiagnostics: typescript.Diagnostic[] = [];
            let semanticDiagnostics: typescript.Diagnostic[] = [];

            try {
                syntacticDiagnostics =
                    languageService.getSyntacticDiagnostics(actualFileName);
            } catch {
                // Ignorar errores de diagnósticos sintácticos
            }

            try {
                semanticDiagnostics =
                    languageService.getSemanticDiagnostics(actualFileName);
            } catch {
                // Ignorar errores de diagnósticos semánticos
            }

            // Combinar todos los diagnósticos
            const allDiagnostics = [
                ...syntacticDiagnostics,
                ...semanticDiagnostics,
            ];

            // Filtrar diagnósticos relevantes con mejor manejo para Vue
            const filteredDiagnostics = allDiagnostics.filter(
                (diag: typescript.Diagnostic) => {
                    const messageText = typescript.flattenDiagnosticMessageText(
                        diag.messageText,
                        '\n',
                    );

                    // Solo errores de categoría Error (no warnings)
                    if (diag.category !== typescript.DiagnosticCategory.Error) {
                        return false;
                    } // Errores de infraestructura que siempre se filtran
                    const infrastructureErrors = [
                        'Cannot find module',
                        'Could not find source file',
                        "has no exported member 'mergeModels'",
                        'Unable to resolve signature of method decorator',
                        'The runtime will invoke the decorator with',
                        'Module resolution kind is not specified',
                        'Cannot resolve module',
                        "Cannot find name 'console'", // Error común al usar console en entorno sin DOM
                        'Do you need to change your target library', // Sugerencia de librerías
                    ];

                    for (const errorPattern of infrastructureErrors) {
                        if (messageText.includes(errorPattern)) {
                            return false;
                        }
                    } // Códigos de error específicos que se filtran
                    const filteredErrorCodes = [
                        1241, // decorator signature mismatch
                        2307, // Cannot find module (redundant but explicit)
                        2584, // Cannot find name (ej: console sin DOM lib)
                        6133, // unused variables (warnings, not errors in this context)
                    ];

                    if (filteredErrorCodes.includes(diag.code)) {
                        return false;
                    }

                    // Para archivos Vue, filtrar solo errores específicos de infraestructura
                    if (fileName.endsWith('.vue')) {
                        // Parámetros implícitos generados automáticamente por Vue
                        const vueImplicitParams = [
                            '$props',
                            '$setup',
                            '$data',
                            '$options',
                            '$event',
                            '_ctx',
                            '_cache',
                            '__expose',
                            '__emit',
                            '__slots',
                            '__props',
                            '__defaults',
                        ];

                        // Solo filtrar errores de 'any' implícito para parámetros de infraestructura de Vue
                        if (
                            messageText.includes("implicitly has an 'any' type")
                        ) {
                            const hasVueImplicitParam = vueImplicitParams.some(
                                param =>
                                    messageText.includes(`'${param}'`) ||
                                    messageText.includes(`"${param}"`),
                            );

                            if (hasVueImplicitParam) {
                                return false;
                            }
                        }

                        // Filtrar errores específicos de setup function
                        if (
                            messageText.includes('Parameter') &&
                            messageText.includes('implicitly has an') &&
                            vueImplicitParams.some(param =>
                                messageText.includes(param),
                            )
                        ) {
                            return false;
                        }
                    }

                    // Mantener TODOS los demás errores - especialmente errores de tipos del usuario
                    return true;
                },
            );

            return {
                diagnostics: filteredDiagnostics,
                hasErrors: filteredDiagnostics.length > 0,
            };
        } catch {
            return { diagnostics: [], hasErrors: false };
        }
    } catch (error) {
        // En caso de error, devolver diagnóstico de error
        const errorDiagnostic: typescript.Diagnostic = {
            file: undefined,
            start: undefined,
            length: undefined,
            messageText: `Error en validación de tipos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
            category: typescript.DiagnosticCategory.Error,
            code: 0,
        };

        return {
            diagnostics: [errorDiagnostic],
            hasErrors: true,
        };
    }
};

/**
 * Valida tipos en archivos Vue antes de la compilación (versión síncrona)
 * @param vueContent - Contenido del archivo Vue
 * @param fileName - Nombre del archivo Vue
 * @param compilerOptions - Opciones del compilador
 * @returns Resultado de la validación de tipos
 */
export const validateVueTypes = (
    vueContent: string,
    fileName: string,
    compilerOptions: typescript.CompilerOptions,
): TypeCheckResult => {
    return validateTypesWithLanguageService(
        fileName,
        vueContent,
        compilerOptions,
    );
};
