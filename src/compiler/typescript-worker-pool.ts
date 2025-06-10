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
    private isInitialized: boolean = false; // Configuración optimizada con reciclaje de workers
    private readonly TASK_TIMEOUT = 10000; // 10 segundos por tarea
    private readonly WORKER_INIT_TIMEOUT = 5000; // 5 segundos para inicializar
    private readonly MAX_TASKS_PER_WORKER = 50; // Máximo de tareas por worker antes de reciclaje
    private readonly WORKER_MEMORY_CHECK_INTERVAL = 100; // Verificar cada 100 tareas

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
        worker.on('error', async error => {
            await this.handleWorkerError(poolWorker, error);
        });

        worker.on('exit', async code => {
            await this.handleWorkerExit(poolWorker, code);
        });
    }
    /**
     * Maneja errores de un worker específico con cleanup completo
     */ private async handleWorkerError(
        poolWorker: PoolWorker,
        error: Error,
    ): Promise<void> {
        console.warn(
            `[WorkerPool] Manejando error del worker ${poolWorker.id}:`,
            error.message,
        );

        // 1. Rechazar todas las tareas pendientes con cleanup de timeouts
        poolWorker.pendingTasks.forEach(task => {
            clearTimeout(task.timeout);
            this.failedTasks++;
            task.reject(
                new Error(`Worker ${poolWorker.id} failed: ${error.message}`),
            );
        });
        poolWorker.pendingTasks.clear();

        // 2. Terminar worker correctamente para evitar memory leaks
        try {
            poolWorker.worker.removeAllListeners();
            await poolWorker.worker.terminate();
        } catch (terminateError) {
            console.error(
                `[WorkerPool] Error terminando worker ${poolWorker.id}:`,
                terminateError,
            );
        }

        // 3. Marcar como no disponible
        poolWorker.busy = false;

        // 4. Recrear worker si el pool está activo
        if (this.isInitialized && this.workers.length > 0) {
            try {
                const newWorker = await this.createWorker(poolWorker.id);
                const index = this.workers.findIndex(
                    w => w.id === poolWorker.id,
                );
                if (index !== -1) {
                    this.workers[index] = newWorker;
                }
            } catch (recreateError) {
                console.error(
                    `[WorkerPool] No se pudo recrear worker ${poolWorker.id}:`,
                    recreateError,
                );
            }
        }
    } /**
     * Maneja la salida inesperada de un worker con cleanup completo
     */
    private async handleWorkerExit(
        poolWorker: PoolWorker,
        code: number,
    ): Promise<void> {
        console.warn(
            `[WorkerPool] Worker ${poolWorker.id} salió con código ${code}`,
        );

        // 1. Rechazar tareas pendientes con cleanup
        poolWorker.pendingTasks.forEach(task => {
            clearTimeout(task.timeout);
            this.failedTasks++;
            task.reject(
                new Error(`Worker ${poolWorker.id} exited with code ${code}`),
            );
        });
        poolWorker.pendingTasks.clear();
        poolWorker.busy = false;

        // 2. Limpiar listeners para evitar memory leaks
        try {
            poolWorker.worker.removeAllListeners();
        } catch {
            // Error silencioso en cleanup
        }

        // 3. Recrear worker si es necesario y el pool está activo
        if (this.isInitialized && this.workers.length > 0) {
            try {
                await this.recreateWorker(poolWorker);
            } catch (recreateError) {
                console.error(
                    `[WorkerPool] Error recreando worker ${poolWorker.id}:`,
                    recreateError,
                );
            }
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
     * Recicla un worker para prevenir memory leaks
     */
    private async recycleWorker(poolWorker: PoolWorker): Promise<void> {
        try {
            console.log(
                `[WorkerPool] Reciclando worker ${poolWorker.id} después de ${poolWorker.taskCounter} tareas`,
            ); // 1. Esperar a que termine tareas pendientes (timeout corto)
            const maxWait = 2000; // 2 segundos máximo
            const startTime = Date.now();

            await new Promise<void>(resolve => {
                const checkPending = () => {
                    if (
                        poolWorker.pendingTasks.size === 0 ||
                        Date.now() - startTime >= maxWait
                    ) {
                        resolve();
                    } else {
                        setTimeout(checkPending, 100);
                    }
                };
                checkPending();
            });

            // 2. Si aún hay tareas pendientes, rechazarlas
            if (poolWorker.pendingTasks.size > 0) {
                poolWorker.pendingTasks.forEach(task => {
                    clearTimeout(task.timeout);
                    task.reject(new Error('Worker being recycled'));
                });
                poolWorker.pendingTasks.clear();
            }

            // 3. Terminar worker actual
            poolWorker.worker.removeAllListeners();
            await poolWorker.worker.terminate();

            // 4. Crear nuevo worker
            const newWorker = await this.createWorker(poolWorker.id);

            // 5. Reemplazar en el array
            const index = this.workers.findIndex(w => w.id === poolWorker.id);
            if (index !== -1) {
                this.workers[index] = newWorker;
            }
        } catch (error) {
            console.error(
                `[WorkerPool] Error reciclando worker ${poolWorker.id}:`,
                error,
            );
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
    } /**
     * Realiza type checking usando un worker específico con reciclaje automático
     */
    private async typeCheckWithWorker(
        poolWorker: PoolWorker,
        fileName: string,
        content: string,
        compilerOptions: any,
    ): Promise<TypeCheckResult> {
        // Verificar si el worker necesita reciclaje por número de tareas
        if (poolWorker.taskCounter >= this.MAX_TASKS_PER_WORKER) {
            await this.recycleWorker(poolWorker);
        }

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
     * Cierra todos los workers del pool con cleanup completo
     */ async terminate(): Promise<void> {
        console.log('[WorkerPool] Cerrando pool de workers...');

        // 1. Rechazar todas las tareas pendientes con cleanup
        let totalPendingTasks = 0;
        for (const poolWorker of this.workers) {
            totalPendingTasks += poolWorker.pendingTasks.size;

            poolWorker.pendingTasks.forEach(task => {
                clearTimeout(task.timeout);
                task.reject(new Error('Worker pool cerrado'));
            });
            poolWorker.pendingTasks.clear();

            // Limpiar listeners para evitar memory leaks
            try {
                poolWorker.worker.removeAllListeners();
            } catch {
                // Error silencioso en cleanup
            }
        }

        if (totalPendingTasks > 0) {
            console.log(
                `[WorkerPool] Se cancelaron ${totalPendingTasks} tareas pendientes`,
            );
        } // 2. Cerrar todos los workers con manejo de errores
        const terminatePromises = this.workers.map(async poolWorker => {
            try {
                await poolWorker.worker.terminate();
            } catch (error) {
                console.warn(
                    `[WorkerPool] Error terminando worker ${poolWorker.id}:`,
                    error,
                );
            }
        });

        await Promise.allSettled(terminatePromises);

        // 3. Limpiar estado
        this.workers = [];
        this.isInitialized = false;
        this.initPromise = null;

        console.log(
            `[WorkerPool] Pool cerrado. Estadísticas finales: ${this.completedTasks} completadas, ${this.failedTasks} fallidas`,
        );
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
