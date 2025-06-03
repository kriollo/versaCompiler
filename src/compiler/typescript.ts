import fs from 'node:fs';
import path from 'node:path';

import * as ts from 'typescript';

import {
    createUnifiedErrorMessage,
    parseTypeScriptErrors,
} from './typescript-error-parser';

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
 * Crea un Language Service Host para validación de tipos eficiente.
 */
class TypeScriptLanguageServiceHost implements ts.LanguageServiceHost {
    private files: Map<string, { version: number; content: string }> =
        new Map();
    private compilerOptions: ts.CompilerOptions;

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

        // Intentar leer el archivo del sistema de archivos para dependencias
        if (fs.existsSync(fileName)) {
            try {
                const content = fs.readFileSync(fileName, 'utf-8');
                return ts.ScriptSnapshot.fromString(content);
            } catch {
                return undefined;
            }
        }

        return undefined;
    }

    getCurrentDirectory(): string {
        return process.cwd();
    }

    getDefaultLibFileName(options: ts.CompilerOptions): string {
        return ts.getDefaultLibFilePath(options);
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
        return ts.sys.newLine;
    }
}

/**
 * Realiza validación de tipos usando TypeScript Language Service.
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
    let actualFileName = fileName; // Declarar aquí para acceso en catch
    try {
        let scriptContent = content; // Si el script está vacío o es solo espacios en blanco, no validar
        if (!scriptContent.trim()) {
            return { diagnostics: [], hasErrors: false };
        }

        // Crear Language Service Host
        const host = new TypeScriptLanguageServiceHost(compilerOptions); // Para archivos Vue, crear un archivo virtual .ts
        if (fileName.endsWith('.vue')) {
            // Usar ruta absoluta para el archivo virtual
            const absolutePath = path.isAbsolute(fileName)
                ? fileName
                : path.resolve(fileName);
            // Crear un nombre de archivo virtual único que no colisione
            const virtualFileName = absolutePath.replace('.vue', '.vue.ts');
            host.addFile(virtualFileName, scriptContent);
            actualFileName = virtualFileName;
        } else {
            // Asegurar que usamos ruta absoluta
            const absolutePath = path.isAbsolute(fileName)
                ? fileName
                : path.resolve(fileName);
            host.addFile(absolutePath, scriptContent);
            actualFileName = absolutePath;
        } // Agregar declaraciones básicas de tipos para Vue si es necesario
        if (fileName.endsWith('.vue')) {
            // Usar el directorio del archivo actual para las declaraciones
            const projectDir = path.dirname(actualFileName);
            const vueTypesPath = path.join(projectDir, 'vue-types.d.ts');
            const vueTypesDeclaration = `// Declaraciones de tipos Vue para validación
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
                export {};            `;
            host.addFile(vueTypesPath, vueTypesDeclaration);
        }

        // Crear Language Service
        const languageService = ts.createLanguageService(host);

        try {
            // Verificar que el archivo existe en el host antes de solicitar diagnósticos
            if (!host.fileExists(actualFileName)) {
                return { diagnostics: [], hasErrors: false };
            } // Obtener diagnósticos de tipos con manejo de errores
            let syntacticDiagnostics: ts.Diagnostic[] = [];
            let semanticDiagnostics: ts.Diagnostic[] = [];
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
            } // Combinar todos los diagnósticos
            const allDiagnostics = [
                ...syntacticDiagnostics,
                ...semanticDiagnostics,
            ]; // Filtrar diagnósticos relevantes
            const filteredDiagnostics = allDiagnostics.filter(
                (diag: ts.Diagnostic) => {
                    const messageText = ts.flattenDiagnosticMessageText(
                        diag.messageText,
                        '\n',
                    );

                    // Solo errores de categoría Error
                    if (diag.category !== ts.DiagnosticCategory.Error) {
                        return false;
                    }

                    // Ignorar SOLO errores específicos de infraestructura Vue y rutas de módulos
                    return (
                        !messageText.includes('Cannot find module') &&
                        !messageText.includes('Could not find source file') &&
                        !messageText.includes(
                            "Parameter '$props' implicitly has an 'any' type",
                        ) &&
                        !messageText.includes(
                            "Parameter '$setup' implicitly has an 'any' type",
                        ) &&
                        !messageText.includes(
                            "Parameter '$data' implicitly has an 'any' type",
                        ) &&
                        !messageText.includes(
                            "Parameter '$options' implicitly has an 'any' type",
                        ) &&
                        !messageText.includes(
                            "Parameter '$event' implicitly has an 'any' type",
                        ) &&
                        !messageText.includes(
                            "Parameter '_ctx' implicitly has an 'any' type",
                        ) &&
                        !messageText.includes(
                            "Parameter '_cache' implicitly has an 'any' type",
                        ) &&
                        // Permitir errores de "Cannot find name" ya que son errores de código real
                        // Solo filtrar parámetros implícitos de Vue generados automáticamente
                        !(
                            messageText.includes(
                                "implicitly has an 'any' type",
                            ) &&
                            (messageText.includes('_ctx') ||
                                messageText.includes('_cache') ||
                                messageText.includes('$props') ||
                                messageText.includes('$setup'))
                        )
                    );
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
        const errorDiagnostic: ts.Diagnostic = {
            file: undefined,
            start: undefined,
            length: undefined,
            messageText: `Error en validación de tipos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
            category: ts.DiagnosticCategory.Error,
            code: 0,
        };

        return {
            diagnostics: [errorDiagnostic],
            hasErrors: true,
        };
    }
};

/**
 * Valida tipos en archivos Vue antes de la compilación
 * @param vueContent - Contenido del archivo Vue
 * @param fileName - Nombre del archivo Vue
 * @param compilerOptions - Opciones del compilador
 * @returns Resultado de la validación de tipos
 */
export const validateVueTypes = (
    vueContent: string,
    fileName: string,
    compilerOptions: ts.CompilerOptions,
): TypeCheckResult => {
    return validateTypesWithLanguageService(
        fileName,
        vueContent,
        compilerOptions,
    );
};

/**
 * Precompila el código TypeScript proporcionado con validación de tipos mejorada.
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
        // Si el código está vacío (sin contenido), devolver cadena vacía
        if (!data.trim()) {
            return { error: null, data: data, lang: 'ts' };
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
        );

        // Configurar opciones del compilador
        const compilerOptions: ts.CompilerOptions = {
            ...parsedConfig.options,
        }; // 1. Primero, validar tipos usando Language Service para validación completa
        const typeCheckResult = validateTypesWithLanguageService(
            fileName,
            data,
            compilerOptions,
        );
        if (typeCheckResult.hasErrors) {
            // Crear un mensaje de error más limpio y estructurado
            const errorMessage = createUnifiedErrorMessage(
                parseTypeScriptErrors(
                    typeCheckResult.diagnostics,
                    fileName,
                    data,
                ),
            );
            return { error: new Error(errorMessage), data: null, lang: 'ts' };
        }

        // 2. Si la validación de tipos pasa, usar transpileModule para generación de código
        const transpileResult = ts.transpileModule(data, {
            compilerOptions,
            fileName,
            reportDiagnostics: true, // Importante: ahora sí queremos los diagnostics
            transformers: undefined,
            moduleName: path.basename(fileName, path.extname(fileName)),
        }); // Si transpileModule retorna diagnostics de error, reportar como error
        if (
            transpileResult.diagnostics &&
            transpileResult.diagnostics.length > 0
        ) {
            const errorDiagnostics = transpileResult.diagnostics.filter(
                (d: ts.Diagnostic) => {
                    if (d.category !== ts.DiagnosticCategory.Error) {
                        return false;
                    }

                    const messageText = ts.flattenDiagnosticMessageText(
                        d.messageText,
                        '\n',
                    );

                    // Aplicar el mismo filtro que en Language Service
                    return (
                        !messageText.includes('Cannot find module') &&
                        !messageText.includes('Could not find source file') &&
                        !messageText.includes(
                            "Parameter '$props' implicitly has an 'any' type",
                        ) &&
                        !messageText.includes(
                            "Parameter '$setup' implicitly has an 'any' type",
                        ) &&
                        !messageText.includes(
                            "Parameter '$data' implicitly has an 'any' type",
                        ) &&
                        !messageText.includes(
                            "Parameter '$options' implicitly has an 'any' type",
                        ) &&
                        !messageText.includes(
                            "Parameter '$event' implicitly has an 'any' type",
                        ) &&
                        !messageText.includes(
                            "Parameter '_ctx' implicitly has an 'any' type",
                        ) &&
                        !messageText.includes(
                            "Parameter '_cache' implicitly has an 'any' type",
                        ) &&
                        !(
                            messageText.includes(
                                "implicitly has an 'any' type",
                            ) &&
                            (messageText.includes('_ctx') ||
                                messageText.includes('_cache') ||
                                messageText.includes('$props') ||
                                messageText.includes('$setup'))
                        )
                    );
                },
            );
            if (errorDiagnostics.length > 0) {
                const cleanErrors = parseTypeScriptErrors(
                    errorDiagnostics,
                    fileName,
                    data,
                );
                const errorMessage = createUnifiedErrorMessage(cleanErrors);
                return {
                    error: new Error(errorMessage),
                    data: null,
                    lang: 'ts',
                };
            }
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
