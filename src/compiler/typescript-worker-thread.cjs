/**
 * TypeScript Worker Thread - Ejecuta type checking asíncrono
 * Este archivo se ejecuta en un worker thread separado para validación de tipos
 */

const fs = require('node:fs');
const path = require('node:path');
const { parentPort } = require('node:worker_threads');

// Debug: Log de inicio del worker
// console.log('[Worker] TypeScript Worker Thread iniciado');

let ts;
try {
    ts = require('typescript');
    // console.log('[Worker] TypeScript cargado exitosamente');
} catch (error) {
    console.error('[Worker] Error cargando TypeScript:', error);
    process.exit(1);
}

/**
 * Language Service Host para validación de tipos en el worker
 */
class WorkerTypeScriptLanguageServiceHost {
    constructor(compilerOptions) {
        this.files = new Map();
        // Crear opciones ultra-limpias para evitar problemas de serialización
        this.compilerOptions =
            this.createUltraCleanCompilerOptions(compilerOptions);
    } /**
     * Crea opciones del compilador que respetan la configuración del tsconfig.json
     */
    createUltraCleanCompilerOptions(options) {
        // Usar las opciones del tsconfig.json pasadas desde el hilo principal
        const cleanOptions = {
            // target: options.target || ts.ScriptTarget.ES2020,
            // module: options.module || ts.ModuleKind.ES2020,
            // strict: Boolean(options.strict),
            // noEmitOnError: Boolean(options.noEmitOnError),
            // skipLibCheck: Boolean(options.skipLibCheck !== false), // true por defecto
            // skipDefaultLibCheck: Boolean(options.skipDefaultLibCheck !== false), // true por defecto
            // allowJs: Boolean(options.allowJs !== false), // true por defecto
            // esModuleInterop: Boolean(options.esModuleInterop !== false), // true por defecto
            // allowSyntheticDefaultImports: Boolean(
            //     options.allowSyntheticDefaultImports !== false,
            // ), // true por defecto
            // declaration: Boolean(options.declaration),
            // sourceMap: Boolean(options.sourceMap),
            // noImplicitAny: Boolean(options.noImplicitAny),
            // noImplicitReturns: Boolean(options.noImplicitReturns),
            // noImplicitThis: Boolean(options.noImplicitThis),
            // noUnusedLocals: Boolean(options.noUnusedLocals),
            // noUnusedParameters: Boolean(options.noUnusedParameters),
            // isolatedModules: Boolean(options.isolatedModules !== false), // true por defecto            // Usar las librerías especificadas en el tsconfig.json
            // lib: Array.isArray(options.lib)
            //     ? options.lib
            //     : ['es2020', 'dom', 'dom.iterable'],

            // // Soporte para decorators
            // experimentalDecorators: Boolean(
            //     options.experimentalDecorators !== false,
            // ),
            // emitDecoratorMetadata: Boolean(
            //     options.emitDecoratorMetadata !== false,
            // ),

            // // Opciones críticas para el worker pero manteniendo compatibilidad
            // noLib: false, // Permitir librerías para APIs básicas (DOM, Promise, etc.)
            // noResolve: true, // Evitar resolución de módulos compleja pero mantener tipos globales
            // suppressOutputPathCheck: true,
            // allowNonTsExtensions: true,
            ...options,
        };

        // console.log(
        //     '[Worker] Opciones del compilador limpias creadas:',
        //     Object.keys(cleanOptions),
        // );
        return cleanOptions;
    }

    addFile(fileName, content) {
        const existing = this.files.get(fileName);
        this.files.set(fileName, {
            version: existing ? existing.version + 1 : 1,
            content,
        });
    }

    getCompilationSettings() {
        return this.compilerOptions;
    }

    getScriptFileNames() {
        return Array.from(this.files.keys());
    }

    getScriptVersion(fileName) {
        const file = this.files.get(fileName);
        return file ? file.version.toString() : '0';
    }

    getScriptSnapshot(fileName) {
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

    getCurrentDirectory() {
        return process.cwd();
    }

    getDefaultLibFileName(options) {
        return ts.getDefaultLibFilePath(options);
    }

    fileExists(path) {
        return this.files.has(path) || fs.existsSync(path);
    }

    readFile(path) {
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

    getNewLine() {
        return ts.sys.newLine;
    }
}

/**
 * Realiza validación de tipos en el worker thread
 */
function validateTypesInWorker(fileName, content, compilerOptions) {
    let actualFileName = fileName;
    try {
        const scriptContent = content;

        // Si el script está vacío o es solo espacios en blanco, no validar
        if (!scriptContent.trim()) {
            return { diagnostics: [], hasErrors: false };
        }

        // Crear Language Service Host
        const host = new WorkerTypeScriptLanguageServiceHost(compilerOptions); // Para archivos Vue, crear un archivo virtual .ts
        if (fileName.endsWith('.vue')) {
            // Crear un nombre de archivo virtual único
            const virtualFileName = `${fileName}.ts`;
            host.addFile(virtualFileName, scriptContent);
            actualFileName = virtualFileName;
            // console.log('[Worker] Archivo Vue agregado como:', virtualFileName);
        } else {
            // Para archivos virtuales, usar el nombre tal como viene
            host.addFile(fileName, scriptContent);
            actualFileName = fileName;
            // console.log('[Worker] Archivo agregado como:', fileName);
        }

        // console.log(
        //     '[Worker] Contenido del archivo:',
        //     scriptContent.substring(0, 100) + '...',
        // );
        // console.log('[Worker] Archivos en host:', host.getScriptFileNames());

        // Agregar declaraciones básicas de tipos para Vue si es necesario
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
                    function defineExpose<T = {}>(exposed: T): void;
                    function mergeModels<T>(models: T): T;
                    function provide<T>(key: string | symbol, value: T): void;
                    function inject<T>(key: string | symbol, defaultValue?: T): T | undefined;
                    function useSlots(): { [key: string]: (...args: any[]) => any };
                    function useAttrs(): { [key: string]: any };
                    function useModel<T>(modelName: string): { value: T };
                    function onMounted(fn: () => void): void;
                    function onUnmounted(fn: () => void): void;
                    function watch<T>(source: () => T, callback: (newValue: T, oldValue: T) => void): void;
                }
                export {};`;
            host.addFile(vueTypesPath, vueTypesDeclaration);
        }

        // Crear Language Service
        const languageService = ts.createLanguageService(host);

        try {
            // Verificar que el archivo existe en el host antes de solicitar diagnósticos
            if (!host.fileExists(actualFileName)) {
                return { diagnostics: [], hasErrors: false };
            }

            // Obtener diagnósticos de tipos con manejo de errores
            let syntacticDiagnostics = [];
            let semanticDiagnostics = [];
            try {
                syntacticDiagnostics =
                    languageService.getSyntacticDiagnostics(actualFileName);
                // console.log(
                //     '[Worker] Diagnósticos sintácticos:',
                //     syntacticDiagnostics.length,
                // );
            } catch (error) {
                console.error(
                    '[Worker] Error obteniendo diagnósticos sintácticos:',
                    error.message,
                );
            }

            try {
                semanticDiagnostics =
                    languageService.getSemanticDiagnostics(actualFileName);
                // console.log(
                //     '[Worker] Diagnósticos semánticos:',
                //     semanticDiagnostics.length,
                // );
            } catch (error) {
                console.error(
                    '[Worker] Error obteniendo diagnósticos semánticos:',
                    error.message,
                );
            } // Combinar todos los diagnósticos
            const allDiagnostics = [
                ...syntacticDiagnostics,
                ...semanticDiagnostics,
            ];

            // console.log(
            //     '[Worker] Total diagnósticos encontrados:',
            //     allDiagnostics.length,
            // );

            // Log de todos los diagnósticos antes del filtrado
            // allDiagnostics.forEach((diag, index) => {
            //     const messageText = ts.flattenDiagnosticMessageText(
            //         diag.messageText,
            //         '\n',
            //     );
            //     console.log(
            //         `[Worker] Diagnóstico ${index + 1}: [${diag.category}] ${messageText}`,
            //     );
            // });

            // Filtrar diagnósticos relevantes
            const filteredDiagnostics = allDiagnostics.filter(diag => {
                const messageText = ts.flattenDiagnosticMessageText(
                    diag.messageText,
                    '\n',
                );

                // Solo errores de categoría Error
                if (diag.category !== ts.DiagnosticCategory.Error) {
                    return false;
                } // Ignorar SOLO errores específicos de infraestructura Vue y rutas de módulos
                return (
                    !messageText.includes('Cannot find module') &&
                    !messageText.includes('Could not find source file') &&
                    !messageText.includes(
                        "has no exported member 'mergeModels'",
                    ) &&
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
                    // Ignorar errores específicos de decorators cuando están mal configurados
                    !messageText.includes(
                        'Unable to resolve signature of method decorator when called as an expression',
                    ) &&
                    !messageText.includes(
                        'The runtime will invoke the decorator with',
                    ) &&
                    // NO ignorar errores TS7031 y TS7006 de forma general, solo para parámetros específicos de Vue
                    // diag.code !== 7031 &&
                    // diag.code !== 7006 &&
                    // Ignorar errores TS1241 (decorator signature mismatch) durante desarrollo
                    diag.code !== 1241 &&
                    !(
                        messageText.includes("implicitly has an 'any' type") &&
                        (messageText.includes('_ctx') ||
                            messageText.includes('_cache') ||
                            messageText.includes('$props') ||
                            messageText.includes('$setup') ||
                            messageText.includes('__expose') ||
                            messageText.includes('__emit'))
                    )
                );
            });

            return {
                diagnostics: filteredDiagnostics,
                hasErrors: filteredDiagnostics.length > 0,
            };
        } catch {
            return { diagnostics: [], hasErrors: false };
        }
    } catch (error) {
        // En caso de error, devolver diagnóstico de error
        const errorDiagnostic = {
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
}

// Escuchar mensajes del proceso principal
if (parentPort) {
    parentPort.on('message', message => {
        try {
            // console.log('[Worker] Mensaje recibido:', {
            //     id: message.id,
            //     fileName: message.fileName,
            //     contentLength: message.content?.length,
            //     compilerOptions: Object.keys(message.compilerOptions || {}),
            // });

            const { id, fileName, content, compilerOptions } = message;

            // Validar que el mensaje tiene la estructura correcta
            if (!id || !fileName || typeof content !== 'string') {
                parentPort.postMessage({
                    id: id || 'unknown',
                    success: false,
                    error: 'Mensaje del worker inválido',
                });
                return;
            }

            // Realizar validación de tipos
            const result = validateTypesInWorker(
                fileName,
                content,
                compilerOptions,
            ); // Serializar diagnósticos de forma segura
            const serializableDiagnostics = result.diagnostics.map(diag => ({
                category: diag.category,
                code: diag.code,
                messageText:
                    typeof diag.messageText === 'string'
                        ? diag.messageText
                        : ts.flattenDiagnosticMessageText(
                              diag.messageText,
                              '\n',
                          ),
                file: diag.file
                    ? {
                          fileName: diag.file.fileName,
                          text: diag.file.text,
                      }
                    : undefined,
                start: diag.start,
                length: diag.length,
            }));

            // Enviar respuesta al proceso principal
            // console.log('[Worker] Enviando respuesta:', {
            //     id,
            //     success: true,
            //     diagnosticsCount: serializableDiagnostics.length,
            //     hasErrors: result.hasErrors,
            // });

            parentPort.postMessage({
                id,
                success: true,
                diagnostics: serializableDiagnostics,
                hasErrors: result.hasErrors,
            });
        } catch (error) {
            // Enviar error al proceso principal
            parentPort.postMessage({
                id: message?.id || 'unknown',
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Error desconocido en worker',
            });
        }
    });
}

// Manejar errores no capturados en el worker
process.on('uncaughtException', error => {
    console.error('[Worker] Error no capturado en TypeScript worker:', error);
    if (parentPort) {
        parentPort.postMessage({
            id: 'error',
            success: false,
            error: `Error crítico en worker: ${error.message}`,
        });
    }
    process.exit(1);
});

// Log de confirmación de que el worker está listo
// console.log('[Worker] TypeScript Worker Thread listo para recibir mensajes');

// Señal de que el worker está listo
if (parentPort) {
    parentPort.postMessage({
        id: 'worker-ready',
        success: true,
        message: 'TypeScript worker iniciado correctamente',
    });
}
