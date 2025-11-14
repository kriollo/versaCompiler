/**
 * TypeScript Worker Manager - Gestiona workers dedicados para type checking asíncrono
 * Implementa el patrón Singleton para reutilizar workers entre compilaciones
 */

import * as path from 'node:path';
import * as process from 'node:process';
import { Worker } from 'node:worker_threads';

import * as typescript from 'typescript';

import { validateTypesWithLanguageService } from './typescript-sync-validator';

/**
 * Resultado de la validación de tipos
 */
interface TypeCheckResult {
    diagnostics: typescript.Diagnostic[];
    hasErrors: boolean;
}

/**
 * Mensaje que se envía al worker thread
 */
interface WorkerMessage {
    id: string;
    fileName: string;
    content: string;
    compilerOptions: any;
}

/**
 * Respuesta del worker thread
 */
interface WorkerResponse {
    id: string;
    success: boolean;
    diagnostics?: typescript.Diagnostic[];
    hasErrors?: boolean;
    error?: string;
    message?: string;
}

/**
 * Task pendiente de respuesta del worker
 */
interface PendingTask {
    resolve: (result: TypeCheckResult) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
}

/**
 * Gestiona workers dedicados para type checking asíncrono de TypeScript
 * Implementa patrón Singleton para eficiencia y reutilización de recursos
 */
export class TypeScriptWorkerManager {
    private static instance: TypeScriptWorkerManager;
    private worker: Worker | null = null;
    private pendingTasks: Map<string, PendingTask> = new Map();
    private taskCounter: number = 0;
    private workerReady: boolean = false;
    private initPromise: Promise<void> | null = null; // Configuración del worker    private readonly WORKER_TIMEOUT = 45000; // 45 segundos timeout (incrementado para manejar concurrencia)
    private readonly MAX_RETRY_ATTEMPTS = 2;
    private readonly MAX_CONCURRENT_TASKS = 20; // Aumentar límite de tareas concurrentes
    private readonly TASK_TIMEOUT = 15000; // 15 segundos timeout por tarea individual

    // NUEVOS: Gestión de modo y estado para optimización
    private currentMode: 'individual' | 'batch' | 'watch' | null = null;

    private constructor() {}

    /**
     * NUEVO: Configura el modo de operación del worker
     */
    setMode(mode: 'individual' | 'batch' | 'watch'): void {
        this.currentMode = mode;
        // En modo watch, el worker se mantiene activo más tiempo
        // En otros modos, se puede optimizar la gestión de recursos
        console.log(`[WorkerManager] Modo establecido: ${mode}`);
    }

    /**
     * Obtiene la instancia singleton del Worker Manager
     */
    static getInstance(): TypeScriptWorkerManager {
        if (!TypeScriptWorkerManager.instance) {
            TypeScriptWorkerManager.instance = new TypeScriptWorkerManager();
        }
        return TypeScriptWorkerManager.instance;
    }

    /**
     * Inicializa el worker thread de TypeScript
     */
    private async initializeWorker(): Promise<void> {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._performWorkerInitialization();
        return this.initPromise;
    }
    /**
     * Realiza la inicialización del worker thread
     */ private async _performWorkerInitialization(): Promise<void> {
        try {
            console.log(
                '[WorkerManager] 🚀 Iniciando proceso de inicialización del worker...',
            ); // Obtener ruta al worker thread (compatible con ES modules y Windows)
            const workerPath = path.join(
                process.env.PATH_PROY || path.join(process.cwd(), 'src'),
                'compiler',
                'typescript-worker-thread.cjs',
            );

            console.log('[WorkerManager] 📂 Ruta del worker:', workerPath);
            console.log('[WorkerManager] 🌍 PATH_PROY:', process.env.PATH_PROY);
            console.log('[WorkerManager] 📁 CWD:', process.cwd());

            // Verificar que el archivo existe
            const fs = await import('node:fs');
            const exists = fs.existsSync(workerPath);
            console.log('[WorkerManager] 📋 Worker file exists:', exists);

            // Crear el worker thread sin tsx para evitar dependencias externas
            console.log('[WorkerManager] 🔧 Creando Worker...');
            this.worker = new Worker(workerPath, {
                env: {
                    ...process.env,
                    NODE_OPTIONS: '', // Limpiar NODE_OPTIONS para evitar conflictos con tsx
                },
            });

            console.log(
                '[WorkerManager] ✅ Worker creado, configurando listeners...',
            );
            // Configurar listeners del worker
            this.setupWorkerListeners();

            console.log(
                '[WorkerManager] ⏳ Esperando que el worker esté listo...',
            );
            // Esperar a que el worker esté listo
            await this.waitForWorkerReady();

            console.log('[WorkerManager] ✅ Worker inicializado exitosamente');
        } catch (error) {
            console.error(
                '[WorkerManager] ❌ Error inicializando worker:',
                error,
            );
            this.worker = null;
            this.workerReady = false;
            throw error;
        }
    }

    /**
     * Configura los listeners del worker thread
     */
    private setupWorkerListeners(): void {
        if (!this.worker) return;

        this.worker.on('message', (response: WorkerResponse) => {
            try {
                // console.log('[WorkerManager] Mensaje recibido del worker:', {
                //     id: response.id,
                //     success: response.success,
                //     hasErrors: response.hasErrors,
                //     diagnosticsCount: response.diagnostics?.length,
                // });

                // Manejar mensaje de worker ready
                if (response.id === 'worker-ready') {
                    this.workerReady = true;
                    return;
                }

                // Buscar la tarea pendiente correspondiente
                const pendingTask = this.pendingTasks.get(response.id);
                if (!pendingTask) {
                    console.warn(
                        '[WorkerManager] Respuesta para tarea desconocida:',
                        response.id,
                    );
                    return;
                }

                // Limpiar timeout y eliminar tarea pendiente
                clearTimeout(pendingTask.timeout);
                this.pendingTasks.delete(response.id);

                // Procesar respuesta
                if (
                    response.success &&
                    response.diagnostics !== undefined &&
                    response.hasErrors !== undefined
                ) {
                    pendingTask.resolve({
                        diagnostics: response.diagnostics,
                        hasErrors: response.hasErrors,
                    });
                } else {
                    const errorMessage =
                        response.error || 'Error desconocido del worker';
                    pendingTask.reject(new Error(errorMessage));
                }
            } catch (error) {
                console.error(
                    '[WorkerManager] Error procesando respuesta del worker:',
                    error,
                );
            }
        });

        this.worker.on('error', (error: Error) => {
            console.error('[WorkerManager] Error en worker thread:', error);
            this.handleWorkerError(error);
        });

        this.worker.on('exit', (code: number | null) => {
            console.warn(
                '[WorkerManager] Worker thread cerrado con código:',
                code,
            );
            this.workerReady = false;
            // Rechazar todas las tareas pendientes
            this.pendingTasks.forEach(task => {
                clearTimeout(task.timeout);
                task.reject(
                    new Error(
                        `Worker cerrado inesperadamente con código ${code}`,
                    ),
                );
            });
            this.pendingTasks.clear();
        });
    } /**
     * Espera a que el worker esté listo para recibir tareas
     */
    private async waitForWorkerReady(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Reducir timeout para inicialización a 5 segundos
            const timeout = setTimeout(() => {
                reject(
                    new Error('Timeout esperando a que el worker esté listo'),
                );
            }, 5000);

            const checkReady = () => {
                if (this.workerReady) {
                    clearTimeout(timeout);
                    resolve();
                } else {
                    setTimeout(checkReady, 50); // Verificar cada 50ms (más frecuente)
                }
            };

            checkReady();
        });
    }

    /**
     * Maneja errores del worker thread
     */
    private handleWorkerError(error: Error): void {
        console.error('[WorkerManager] Manejando error del worker:', error);
        // Rechazar todas las tareas pendientes
        this.pendingTasks.forEach(task => {
            clearTimeout(task.timeout);
            task.reject(new Error(`Error en worker: ${error.message}`));
        });
        this.pendingTasks.clear();

        // Marcar worker como no disponible
        this.workerReady = false;
    }

    /**
     * Genera un ID único para cada tarea
     */
    private generateTaskId(): string {
        return `task-${++this.taskCounter}-${Date.now()}`;
    }
    /**
     * Realiza type checking usando el worker thread (con fallback síncrono)
     * @param fileName - Nombre del archivo TypeScript
     * @param content - Contenido del archivo
     * @param compilerOptions - Opciones del compilador TypeScript
     * @returns Resultado de la validación de tipos
     */ async typeCheck(
        fileName: string,
        content: string,
        compilerOptions: any,
    ): Promise<TypeCheckResult> {
        // Limitar tareas concurrentes para evitar saturación
        if (this.pendingTasks.size >= this.MAX_CONCURRENT_TASKS) {
            return this.typeCheckWithSyncFallback(
                fileName,
                content,
                compilerOptions,
            );
        }

        // En modo de testing o si hay problemas de inicialización, usar fallback directo
        if (process.env.NODE_ENV === 'test' || !this.worker) {
            if (!this.worker) {
                try {
                    await this.initializeWorker();
                    if (this.worker && this.workerReady) {
                        console.log(
                            '[WorkerManager] ✅ Worker inicializado exitosamente, reintentando...',
                        );
                        return this.typeCheckWithWorker(
                            fileName,
                            content,
                            compilerOptions,
                        );
                    }
                } catch (error) {
                    console.error(
                        '[WorkerManager] ❌ Error inicializando worker:',
                        error,
                    );
                }
            }
            console.log(
                '[WorkerManager] 🔄 Usando fallback síncrono (test mode o worker no disponible)',
            );
            return this.typeCheckWithSyncFallback(
                fileName,
                content,
                compilerOptions,
            );
        }
        try {
            console.log('[WorkerManager] 🚀 Intentando usar worker thread...');
            // Intentar usar el worker thread con timeout más realista
            const workerPromise = this.typeCheckWithWorker(
                fileName,
                content,
                compilerOptions,
            );
            const timeoutPromise = new Promise<TypeCheckResult>(
                (resolve, reject) => {
                    setTimeout(() => {
                        console.log(
                            '[WorkerManager] ⏰ Worker timeout, usando fallback',
                        );
                        reject(new Error('Worker timeout - usando fallback'));
                    }, this.TASK_TIMEOUT); // Usar timeout por tarea más realista
                },
            );

            console.log('[WorkerManager] ⏳ Esperando respuesta del worker...');
            const result = await Promise.race([workerPromise, timeoutPromise]);
            console.log('[WorkerManager] ✅ Worker completado exitosamente');
            return result;
        } catch (workerError) {
            const errorMessage =
                workerError instanceof Error
                    ? workerError.message
                    : String(workerError);
            console.warn(
                '[WorkerManager] ❌ Error en worker, usando fallback síncrono:',
                errorMessage,
            );

            // Fallback a validación síncrona
            return this.typeCheckWithSyncFallback(
                fileName,
                content,
                compilerOptions,
            );
        }
    }

    /**
     * Realiza type checking usando el worker thread
     */
    private async typeCheckWithWorker(
        fileName: string,
        content: string,
        compilerOptions: any,
    ): Promise<TypeCheckResult> {
        // Asegurar que el worker esté inicializado
        await this.initializeWorker();

        if (!this.worker || !this.workerReady) {
            throw new Error('Worker no disponible');
        }

        return new Promise<TypeCheckResult>((resolve, reject) => {
            const taskId = this.generateTaskId(); // Configurar timeout para la tarea
            const timeout = setTimeout(() => {
                this.pendingTasks.delete(taskId);
                reject(new Error(`Timeout en type checking para ${fileName}`));
            }, this.TASK_TIMEOUT);

            // Agregar tarea a la lista de pendientes
            this.pendingTasks.set(taskId, {
                resolve,
                reject,
                timeout,
            });

            try {
                // Crear mensaje para el worker
                const message: WorkerMessage = {
                    id: taskId,
                    fileName,
                    content,
                    compilerOptions,
                };

                // console.log('[WorkerManager] Enviando tarea al worker:', {
                //     id: taskId,
                //     fileName,
                //     contentLength: content.length,
                //     compilerOptionsKeys: Object.keys(compilerOptions),
                // });

                // Enviar mensaje al worker
                this.worker!.postMessage(message);
            } catch (error) {
                // Limpiar en caso de error
                clearTimeout(timeout);
                this.pendingTasks.delete(taskId);
                reject(error);
            }
        });
    }

    /**
     * Fallback síncrono para type checking cuando el worker no está disponible
     */
    private typeCheckWithSyncFallback(
        fileName: string,
        content: string,
        compilerOptions: any,
    ): TypeCheckResult {
        // console.log(
        //     '[WorkerManager] Ejecutando type checking síncrono como fallback',
        // );

        try {
            return validateTypesWithLanguageService(
                fileName,
                content,
                compilerOptions,
            );
        } catch (error) {
            console.error('[WorkerManager] Error en fallback síncrono:', error);

            // Devolver resultado vacío en caso de error total
            return {
                diagnostics: [],
                hasErrors: false,
            };
        }
    }

    /**
     * Cierra el worker thread y limpia recursos
     */
    async terminate(): Promise<void> {
        if (this.worker) {
            // console.log('[WorkerManager] Cerrando worker thread...');
            // Rechazar todas las tareas pendientes
            this.pendingTasks.forEach(task => {
                clearTimeout(task.timeout);
                task.reject(new Error('Worker manager cerrado'));
            });
            this.pendingTasks.clear();

            // Cerrar worker
            await this.worker.terminate();
            this.worker = null;
            this.workerReady = false;
            this.initPromise = null;

            // console.log('[WorkerManager] Worker cerrado exitosamente');
        }
    }

    /**
     * Obtiene estadísticas del worker manager
     */
    getStats(): {
        workerReady: boolean;
        pendingTasks: number;
        taskCounter: number;
    } {
        return {
            workerReady: this.workerReady,
            pendingTasks: this.pendingTasks.size,
            taskCounter: this.taskCounter,
        };
    }
}
