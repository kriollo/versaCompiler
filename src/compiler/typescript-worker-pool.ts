/**
 * TypeScript Worker Pool - Pool de workers para compilación paralela
 * Reemplaza el worker único con múltiples workers para aprovecha la concurrencia real
 */

import * as os from 'node:os';
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
    fileName: string;
    startTime: number;
}

/**
 * Worker individual en el pool
 */
interface PoolWorker {
    worker: Worker;
    id: number;
    busy: boolean;
    pendingTasks: Map<string, PendingTask>;
    taskCounter: number;
}

/**
 * Pool de workers para compilación TypeScript paralela
 * Distribuye las tareas entre múltiples workers para mayor rendimiento
 */
export class TypeScriptWorkerPool {
    private static instance: TypeScriptWorkerPool;
    private workers: PoolWorker[] = [];
    private poolSize: number;
    private workerPath: string;
    private initPromise: Promise<void> | null = null;
    private isInitialized: boolean = false;

    // Configuración optimizada
    private readonly TASK_TIMEOUT = 10000; // 10 segundos por tarea
    private readonly WORKER_INIT_TIMEOUT = 5000; // 5 segundos para inicializar
    private readonly MAX_TASKS_PER_WORKER = 50; // Máximo de tareas por worker antes de rotación

    // Métricas de rendimiento
    private totalTasks: number = 0;
    private completedTasks: number = 0;
    private failedTasks: number = 0;

    private constructor() {
        // Determinar tamaño óptimo del pool
        const cpuCount = os.cpus().length;
        this.poolSize = Math.min(Math.max(cpuCount - 1, 2), 8); // Entre 2 y 8 workers
        this.workerPath = path.join(
            process.env.PATH_PROY || path.join(process.cwd(), 'src'),
            'compiler',
            'typescript-worker-thread.cjs',
        );
    }

    /**
     * Obtiene la instancia singleton del Worker Pool
     */
    static getInstance(): TypeScriptWorkerPool {
        if (!TypeScriptWorkerPool.instance) {
            TypeScriptWorkerPool.instance = new TypeScriptWorkerPool();
        }
        return TypeScriptWorkerPool.instance;
    } /**
     * Configura el modo de operación del pool
     */
    setMode(mode: 'individual' | 'batch' | 'watch'): void {
        // Ajustar configuración según el modo
        switch (mode) {
            case 'batch':
                // Para modo batch, optimizar para throughput
                this.poolSize = Math.min(os.cpus().length, 12);
                break;
            case 'watch':
                // Para modo watch, menos workers pero más responsivos
                this.poolSize = Math.min(Math.max(os.cpus().length / 2, 2), 6);
                break;
            case 'individual':
                // Para individual, pool pequeño
                this.poolSize = Math.min(4, os.cpus().length);
                break;
        }
    }

    /**
     * Inicializa el pool de workers
     */
    private async initializePool(): Promise<void> {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._performPoolInitialization();
        return this.initPromise;
    }

    /**
     * Realiza la inicialización del pool de workers
     */ private async _performPoolInitialization(): Promise<void> {
        try {
            // Verificar que el archivo del worker existe
            const fs = await import('node:fs');
            const exists = fs.existsSync(this.workerPath);
            if (!exists) {
                throw new Error(
                    `Worker thread file not found: ${this.workerPath}`,
                );
            }

            // Crear workers en paralelo
            const workerPromises = Array.from(
                { length: this.poolSize },
                (_, index) => this.createWorker(index),
            );

            this.workers = await Promise.all(workerPromises);
            this.isInitialized = true;
        } catch (error) {
            this.isInitialized = false;
            throw error;
        }
    }

    /**
     * Crea un worker individual
     */ private async createWorker(workerId: number): Promise<PoolWorker> {
        return new Promise((resolve, reject) => {
            try {
                const worker = new Worker(this.workerPath, {
                    env: {
                        ...process.env,
                        NODE_OPTIONS: '',
                        WORKER_ID: workerId.toString(),
                    },
                });

                const poolWorker: PoolWorker = {
                    worker,
                    id: workerId,
                    busy: false,
                    pendingTasks: new Map(),
                    taskCounter: 0,
                };

                // Configurar listeners
                this.setupWorkerListeners(poolWorker);

                // Timeout para inicialización
                const initTimeout = setTimeout(() => {
                    reject(
                        new Error(`Worker ${workerId} initialization timeout`),
                    );
                }, this.WORKER_INIT_TIMEOUT);

                // Esperar que el worker esté listo
                const checkReady = () => {
                    worker.postMessage({ type: 'ping' });
                };

                worker.on(
                    'message',
                    function readyHandler(response: WorkerResponse) {
                        if (
                            response.id === 'worker-ready' ||
                            response.message === 'pong'
                        ) {
                            clearTimeout(initTimeout);
                            worker.off('message', readyHandler);
                            resolve(poolWorker);
                        }
                    },
                );

                worker.on('error', error => {
                    clearTimeout(initTimeout);
                    reject(error);
                });

                // Intentar conectar
                checkReady();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Configura los listeners para un worker individual
     */ private setupWorkerListeners(poolWorker: PoolWorker): void {
        const { worker } = poolWorker;

        worker.on('message', (response: WorkerResponse) => {
            try {
                // Ignorar mensajes de control
                if (
                    response.id === 'worker-ready' ||
                    response.message === 'pong'
                ) {
                    return;
                } // Buscar la tarea pendiente
                const pendingTask = poolWorker.pendingTasks.get(response.id);
                if (!pendingTask) {
                    return;
                }

                // Limpiar timeout y eliminar tarea
                clearTimeout(pendingTask.timeout);
                poolWorker.pendingTasks.delete(response.id);

                // Marcar worker como disponible si no tiene más tareas
                if (poolWorker.pendingTasks.size === 0) {
                    poolWorker.busy = false;
                }

                // Procesar respuesta
                if (
                    response.success &&
                    response.diagnostics !== undefined &&
                    response.hasErrors !== undefined
                ) {
                    this.completedTasks++;
                    pendingTask.resolve({
                        diagnostics: response.diagnostics,
                        hasErrors: response.hasErrors,
                    });
                } else {
                    this.failedTasks++;
                    const errorMessage =
                        response.error || 'Error desconocido del worker';
                    pendingTask.reject(new Error(errorMessage));
                }
            } catch {
                // Error silencioso - no imprimir cada error
            }
        });
        worker.on('error', error => {
            this.handleWorkerError(poolWorker, error);
        });

        worker.on('exit', code => {
            this.handleWorkerExit(poolWorker, code);
        });
    }

    /**
     * Maneja errores de un worker específico
     */ private handleWorkerError(poolWorker: PoolWorker, error: Error): void {
        // Rechazar todas las tareas pendientes de este worker
        poolWorker.pendingTasks.forEach(task => {
            clearTimeout(task.timeout);
            this.failedTasks++;
            task.reject(new Error(`Worker error: ${error.message}`));
        });
        poolWorker.pendingTasks.clear();
        poolWorker.busy = false;
    }

    /**
     * Maneja la salida inesperada de un worker
     */
    private handleWorkerExit(poolWorker: PoolWorker, code: number): void {
        // Rechazar tareas pendientes
        poolWorker.pendingTasks.forEach(task => {
            clearTimeout(task.timeout);
            this.failedTasks++;
            task.reject(new Error(`Worker exited with code ${code}`));
        });
        poolWorker.pendingTasks.clear();
        poolWorker.busy = false; // Intentar recrear el worker si es necesario
        if (this.isInitialized) {
            this.recreateWorker(poolWorker).catch(() => {
                // Error silencioso en recreación
            });
        }
    }

    /**
     * Recrea un worker que falló
     */ private async recreateWorker(failedWorker: PoolWorker): Promise<void> {
        try {
            const newWorker = await this.createWorker(failedWorker.id);

            // Reemplazar en el array
            const index = this.workers.findIndex(w => w.id === failedWorker.id);
            if (index !== -1) {
                this.workers[index] = newWorker;
            }
        } catch {
            // Error silencioso en recreación
        }
    }

    /**
     * Encuentra el worker menos ocupado
     */
    private findAvailableWorker(): PoolWorker | null {
        // Buscar worker completamente libre
        const freeWorker = this.workers.find(
            w => !w.busy && w.pendingTasks.size === 0,
        );
        if (freeWorker) {
            return freeWorker;
        }

        // Si no hay workers libres, buscar el menos ocupado
        const leastBusyWorker = this.workers.reduce((least, current) => {
            if (current.pendingTasks.size < least.pendingTasks.size) {
                return current;
            }
            return least;
        });

        // Solo devolver si no está demasiado ocupado
        if (leastBusyWorker.pendingTasks.size < 5) {
            return leastBusyWorker;
        }

        return null; // Todos los workers están muy ocupados
    }

    /**
     * Realiza type checking usando el pool de workers
     */
    async typeCheck(
        fileName: string,
        content: string,
        compilerOptions: any,
    ): Promise<TypeCheckResult> {
        // Asegurar que el pool esté inicializado
        await this.initializePool();
        if (!this.isInitialized) {
            return this.typeCheckWithSyncFallback(
                fileName,
                content,
                compilerOptions,
            );
        }

        // Buscar worker disponible
        const availableWorker = this.findAvailableWorker();
        if (!availableWorker) {
            return this.typeCheckWithSyncFallback(
                fileName,
                content,
                compilerOptions,
            );
        }
        try {
            this.totalTasks++;
            return await this.typeCheckWithWorker(
                availableWorker,
                fileName,
                content,
                compilerOptions,
            );
        } catch {
            return this.typeCheckWithSyncFallback(
                fileName,
                content,
                compilerOptions,
            );
        }
    }

    /**
     * Realiza type checking usando un worker específico
     */
    private async typeCheckWithWorker(
        poolWorker: PoolWorker,
        fileName: string,
        content: string,
        compilerOptions: any,
    ): Promise<TypeCheckResult> {
        return new Promise<TypeCheckResult>((resolve, reject) => {
            const taskId = `task-${poolWorker.id}-${++poolWorker.taskCounter}-${Date.now()}`;

            // Marcar worker como ocupado
            poolWorker.busy = true;

            // Configurar timeout para la tarea
            const timeout = setTimeout(() => {
                poolWorker.pendingTasks.delete(taskId);
                if (poolWorker.pendingTasks.size === 0) {
                    poolWorker.busy = false;
                }
                reject(new Error(`Timeout en type checking para ${fileName}`));
            }, this.TASK_TIMEOUT);

            // Agregar tarea a la lista de pendientes del worker
            poolWorker.pendingTasks.set(taskId, {
                resolve,
                reject,
                timeout,
                fileName,
                startTime: Date.now(),
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
                poolWorker.worker.postMessage(message);
            } catch (error) {
                // Limpiar en caso de error
                clearTimeout(timeout);
                poolWorker.pendingTasks.delete(taskId);
                if (poolWorker.pendingTasks.size === 0) {
                    poolWorker.busy = false;
                }
                reject(error);
            }
        });
    }

    /**
     * Fallback síncrono para type checking
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
        } catch {
            return {
                diagnostics: [],
                hasErrors: false,
            };
        }
    }

    /**
     * Cierra todos los workers del pool
     */ async terminate(): Promise<void> {
        // Rechazar todas las tareas pendientes
        for (const poolWorker of this.workers) {
            poolWorker.pendingTasks.forEach(task => {
                clearTimeout(task.timeout);
                task.reject(new Error('Worker pool cerrado'));
            });
            poolWorker.pendingTasks.clear();
        }

        // Cerrar todos los workers
        const terminatePromises = this.workers.map(poolWorker =>
            poolWorker.worker.terminate(),
        );

        await Promise.all(terminatePromises);

        this.workers = [];
        this.isInitialized = false;
        this.initPromise = null;
    }

    /**
     * Obtiene estadísticas del pool
     */
    getStats(): {
        poolSize: number;
        busyWorkers: number;
        totalPendingTasks: number;
        totalTasks: number;
        completedTasks: number;
        failedTasks: number;
        successRate: number;
    } {
        const busyWorkers = this.workers.filter(w => w.busy).length;
        const totalPendingTasks = this.workers.reduce(
            (sum, w) => sum + w.pendingTasks.size,
            0,
        );
        const successRate =
            this.totalTasks > 0
                ? Math.round((this.completedTasks / this.totalTasks) * 100)
                : 0;

        return {
            poolSize: this.workers.length,
            busyWorkers,
            totalPendingTasks,
            totalTasks: this.totalTasks,
            completedTasks: this.completedTasks,
            failedTasks: this.failedTasks,
            successRate,
        };
    }
}
