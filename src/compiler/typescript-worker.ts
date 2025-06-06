/**
 * TypeScript Worker Manager - Gestiona workers dedicados para type checking asíncrono
 * Implementa el patrón Singleton para reutilizar workers entre compilaciones
 */

import path from 'node:path';
import { env } from 'node:process';
import { Worker } from 'node:worker_threads';

import * as ts from 'typescript';

import { logger } from '../servicios/logger';

import { validateTypesWithLanguageService } from './typescript-sync-validator';

/**
 * Resultado de la validación de tipos
 */
interface TypeCheckResult {
    diagnostics: ts.Diagnostic[];
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
    diagnostics?: ts.Diagnostic[];
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
    timeout: NodeJS.Timeout;
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
    private initPromise: Promise<void> | null = null;

    // NUEVOS: Gestión de modo y estado para optimización
    private currentMode: 'individual' | 'batch' | 'watch' | null = null;
    private keepAliveInWatchMode: boolean = false;
    private isTerminating: boolean = false;
    private lastActivityTime: number = Date.now();

    // NUEVO: Auto-cleanup timer para modo no-watch
    private autoCleanupTimer: NodeJS.Timeout | null = null;
    private readonly AUTO_CLEANUP_DELAY = 30000; // 30 segundos de inactividad

    // Configuración del worker optimizada
    private readonly WORKER_TIMEOUT = 15000; // Aumentado a 15 segundos
    private readonly MAX_RETRY_ATTEMPTS = 2;

    private constructor() {
        // NUEVO: Setup de auto-cleanup
        this.setupAutoCleanup();
    }

    /**
     * NUEVO: Configura auto-cleanup para modo no-watch
     */
    private setupAutoCleanup(): void {
        const checkCleanup = () => {
            if (
                !this.keepAliveInWatchMode &&
                this.pendingTasks.size === 0 &&
                Date.now() - this.lastActivityTime > this.AUTO_CLEANUP_DELAY
            ) {
                this.terminate().catch(console.error);
            } else if (!this.isTerminating) {
                this.autoCleanupTimer = setTimeout(
                    checkCleanup,
                    this.AUTO_CLEANUP_DELAY,
                );
            }
        };

        this.autoCleanupTimer = setTimeout(
            checkCleanup,
            this.AUTO_CLEANUP_DELAY,
        );
    }

    /**
     * NUEVO: Configura el modo de operación del worker
     */
    setMode(mode: 'individual' | 'batch' | 'watch'): void {
        this.currentMode = mode;
        this.keepAliveInWatchMode = mode === 'watch';

        // Cancelar auto-cleanup en modo watch
        if (mode === 'watch' && this.autoCleanupTimer) {
            clearTimeout(this.autoCleanupTimer);
            this.autoCleanupTimer = null;
        } else if (mode !== 'watch' && !this.autoCleanupTimer) {
            this.setupAutoCleanup();
        }
    }

    /**
     * Obtiene la instancia singleton del Worker Manager
     */
    static getInstance(): TypeScriptWorkerManager {
        if (!TypeScriptWorkerManager.instance) {
            TypeScriptWorkerManager.instance = new TypeScriptWorkerManager();
        }
        return TypeScriptWorkerManager.instance;
    } /**
     * MEJORADO: Inicializa el worker thread con mejor gestión de errores
     */
    private async initializeWorker(): Promise<void> {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._performWorkerInitialization();
        return this.initPromise;
    } /**
     * MEJORADO: Realiza la inicialización del worker thread
     */
    private async _performWorkerInitialization(): Promise<void> {
        try {
            // No reinicializar si ya está listo y no estamos terminando
            if (this.workerReady && this.worker && !this.isTerminating) {
                return;
            } // Obtener ruta al worker thread con lógica inteligente para tests
            const projectRoot = env.PATH_PROY || process.cwd();
            let workerPath: string;

            // En modo test, verificar múltiples ubicaciones posibles

            workerPath = path.join(
                projectRoot,
                'compiler',
                'typescript-worker-thread.cjs',
            );

            // console.log(
            //     `[WorkerManager] Intentando cargar worker desde: ${workerPath}`,
            // );

            // console.log(
            //     `[WorkerManager] Inicializando worker para modo: ${this.currentMode}`,
            // );

            // Crear el worker thread
            this.worker = new Worker(workerPath, {
                env: {
                    ...process.env,
                    NODE_OPTIONS: '--import tsx/esm',
                },
            });

            // Configurar listeners del worker
            this.setupWorkerListeners();

            // Esperar a que el worker esté listo
            await this.waitForWorkerReady();

            // console.log('[WorkerManager] Worker inicializado exitosamente');
        } catch (error) {
            logger.error('[WorkerManager] Error inicializando worker:', error);
            this.worker = null;
            this.workerReady = false;
            this.initPromise = null;
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
                    logger.warn(
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
                logger.error(
                    '[WorkerManager] Error procesando respuesta del worker:',
                    error,
                );
            }
        });

        this.worker.on('error', error => {
            logger.error('[WorkerManager] Error en worker thread:', error);
            this.handleWorkerError(error);
        });
        this.worker.on('exit', code => {
            logger.warn(
                '[WorkerManager] Worker thread cerrado con código:',
                code,
            );
            this.workerReady = false; // Rechazar todas las tareas pendientes
            for (const [, task] of this.pendingTasks) {
                clearTimeout(task.timeout);
                task.reject(
                    new Error(
                        `Worker cerrado inesperadamente con código ${code}`,
                    ),
                );
            }
            this.pendingTasks.clear();
        });
    }

    /**
     * Espera a que el worker esté listo para recibir tareas
     */
    private async waitForWorkerReady(): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(
                    new Error('Timeout esperando a que el worker esté listo'),
                );
            }, this.WORKER_TIMEOUT);

            const checkReady = () => {
                if (this.workerReady) {
                    clearTimeout(timeout);
                    resolve();
                } else {
                    setTimeout(checkReady, 100); // Verificar cada 100ms
                }
            };

            checkReady();
        });
    }

    /**
     * Maneja errores del worker thread
     */ private handleWorkerError(error: Error): void {
        logger.error('[WorkerManager] Manejando error del worker:', error); // Rechazar todas las tareas pendientes
        for (const [, task] of this.pendingTasks) {
            clearTimeout(task.timeout);
            task.reject(new Error(`Error en worker: ${error.message}`));
        }
        this.pendingTasks.clear();

        // Marcar worker como no disponible
        this.workerReady = false;
    }

    /**
     * Genera un ID único para cada tarea
     */
    private generateTaskId(): string {
        return `task-${++this.taskCounter}-${Date.now()}`;
    } /**
     * MEJORADO: Type checking con gestión de modo optimizada
     * @param fileName - Nombre del archivo TypeScript
     * @param content - Contenido del archivo
     * @param compilerOptions - Opciones del compilador TypeScript
     * @returns Resultado de la validación de tipos
     */
    async typeCheck(
        fileName: string,
        content: string,
        compilerOptions: any,
    ): Promise<TypeCheckResult> {
        this.lastActivityTime = Date.now();

        try {
            // En modo watch, mantener worker siempre activo
            if (this.currentMode === 'watch') {
                await this.ensureWorkerForWatchMode();
            }

            return await this.typeCheckWithWorker(
                fileName,
                content,
                compilerOptions,
            );
        } catch (workerError) {
            const errorMessage =
                workerError instanceof Error
                    ? workerError.message
                    : String(workerError);

            // Solo mostrar warning en modo verbose
            if (env.VERBOSE === 'true') {
                logger.warn('\n[WorkerManager] Worker fallback:', errorMessage);
            }

            return this.typeCheckWithSyncFallback(
                fileName,
                content,
                compilerOptions,
            );
        }
    }

    /**
     * NUEVO: Asegura que el worker esté activo en modo watch
     */
    private async ensureWorkerForWatchMode(): Promise<void> {
        if (!this.worker || !this.workerReady) {
            await this.initializeWorker();
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
            const taskId = this.generateTaskId();

            // Configurar timeout para la tarea
            const timeout = setTimeout(() => {
                this.pendingTasks.delete(taskId);
                reject(new Error(`Timeout en type checking para ${fileName}`));
            }, this.WORKER_TIMEOUT);

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
        try {
            return validateTypesWithLanguageService(
                fileName,
                content,
                compilerOptions,
            );
        } catch (error) {
            logger.error('[WorkerManager] Error en fallback síncrono:', error);

            // Devolver resultado vacío en caso de error total
            return {
                diagnostics: [],
                hasErrors: false,
            };
        }
    } /**
     * MEJORADO: Cierra el worker thread y limpia recursos
     */
    async terminate(): Promise<void> {
        if (this.isTerminating) {
            return;
        }

        this.isTerminating = true;

        // Limpiar timers
        if (this.autoCleanupTimer) {
            clearTimeout(this.autoCleanupTimer);
            this.autoCleanupTimer = null;
        }

        if (this.worker) {
            logger.log('[WorkerManager] Cerrando worker thread...');

            // Rechazar todas las tareas pendientes
            for (const [, task] of this.pendingTasks) {
                clearTimeout(task.timeout);
                task.reject(new Error('Worker manager cerrado'));
            }
            this.pendingTasks.clear();

            try {
                // Cerrar worker
                await this.worker.terminate();
            } catch (error) {
                logger.error(
                    '[WorkerManager] Error al terminar worker:',
                    error,
                );
            }

            this.worker = null;
            this.workerReady = false;
            this.initPromise = null;

            logger.log('[WorkerManager] Worker cerrado exitosamente');
        }

        this.isTerminating = false;
    }

    /**
     * NUEVO: Reinicia el worker si es necesario
     */
    async restart(): Promise<void> {
        await this.terminate();
        await this.initializeWorker();
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
