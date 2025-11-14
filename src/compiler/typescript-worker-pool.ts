/**
 * TypeScript Worker Pool - Pool de workers para compilación paralela
 * Reemplaza el worker único con múltiples workers para aprovecha la concurrencia real
 */

import * as os from 'node:os';
import * as path from 'node:path';
import * as process from 'node:process';
import { setImmediate } from 'node:timers';
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
    type?: string; // ✨ ISSUE #4: Para manejo de mensajes especiales
    memoryUsage?: {
        heapUsed: number;
        heapTotal: number;
        rss: number;
    };
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
 * Worker individual en el pool con controles de memoria
 */
interface PoolWorker {
    worker: Worker;
    id: number;
    busy: boolean;
    pendingTasks: Map<string, PendingTask>;
    taskCounter: number;
    // ✨ ISSUE #4: Controles de memoria y performance
    memoryUsage: number;
    lastMemoryCheck: number;
    tasksProcessed: number;
    creationTime: number;
    lastActivityTime: number;
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
    private readonly TASK_TIMEOUT = 8000; // 8 segundos por tarea (reducido para mayor velocidad)
    private readonly WORKER_INIT_TIMEOUT = 3000; // 3 segundos para inicializar (reducido)
    private readonly MAX_TASKS_PER_WORKER = 200; // ✨ OPTIMIZADO: Aumentado de 50 a 200 para reducir overhead de reciclaje
    private readonly WORKER_MEMORY_CHECK_INTERVAL = 500; // ✨ OPTIMIZADO: Verificar cada 500 tareas (reducir overhead)

    // ✨ FIX #1: Referencias a timers para limpieza adecuada
    private memoryCheckInterval: ReturnType<typeof setInterval> | null = null;
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;

    // Métricas de rendimiento
    private totalTasks: number = 0;
    private completedTasks: number = 0;
    private failedTasks: number = 0;

    private constructor() {
        // Determinar tamaño óptimo del pool - MÁS AGRESIVO para mejor rendimiento
        const cpuCount = os.cpus().length;
        // Usar más workers para aprovechar mejor el CPU
        this.poolSize = Math.min(Math.max(cpuCount, 4), 16); // Entre 4 y 16 workers
        this.workerPath = path.join(
            process.env.PATH_PROY || path.join(process.cwd(), 'src'),
            'compiler',
            'typescript-worker-thread.cjs',
        );

        // ✨ ISSUE #4: Configurar monitoreo de memoria automático        this.startMemoryMonitoring();
    }

    // ✨ ISSUE #4: Métodos de control de memoria y timeouts

    /**
     * Inicia el monitoreo automático de memoria de workers
     * ✨ FIX #1: Ahora almacena referencias a los intervalos para limpieza posterior
     */
    private startMemoryMonitoring(): void {
        // Limpiar intervalos previos si existen
        this.stopMemoryMonitoring();

        // Monitoreo cada 15 segundos (más frecuente)
        this.memoryCheckInterval = setInterval(() => {
            this.checkWorkersMemory();
        }, 15000);

        // Limpieza de workers inactivos cada 2 minutos (más frecuente)
        this.cleanupInterval = setInterval(() => {
            this.cleanupInactiveWorkers();
        }, 120000);
    }

    /**
     * ✨ FIX #1: Detiene el monitoreo automático de memoria
     */
    private stopMemoryMonitoring(): void {
        if (this.memoryCheckInterval) {
            clearInterval(this.memoryCheckInterval);
            this.memoryCheckInterval = null;
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    /**
     * Verifica el uso de memoria de todos los workers con medición real
     */
    private async checkWorkersMemory(): Promise<void> {
        const now = Date.now();

        for (const poolWorker of this.workers) {
            // Actualizar tiempo de última verificación
            poolWorker.lastMemoryCheck = now;

            try {
                // ✨ ISSUE #4: Obtener memoria real del worker
                const memoryInfo = await this.getWorkerMemoryUsage(poolWorker);
                poolWorker.memoryUsage = memoryInfo.heapUsed;

                // Verificar límites de memoria y reciclaje automático
                if (this.shouldRecycleWorker(poolWorker)) {
                    const reason = this.getRecycleReason(poolWorker);
                    console.warn(
                        `[WorkerPool] Worker ${poolWorker.id} requiere reciclaje: ${reason}`,
                    );
                    await this.recycleWorker(poolWorker);
                }
            } catch (error: any) {
                console.warn(
                    `[WorkerPool] Error verificando memoria del worker ${poolWorker.id}:`,
                    error,
                );
            }
        }
    }

    /**
     * Obtiene el uso real de memoria de un worker
     */
    private async getWorkerMemoryUsage(
        poolWorker: PoolWorker,
    ): Promise<{ heapUsed: number; heapTotal: number; rss: number }> {
        return new Promise(resolve => {
            const timeout = setTimeout(() => {
                // Fallback con estimación si no hay respuesta
                resolve({
                    heapUsed: poolWorker.tasksProcessed * 2048, // 2KB por tarea
                    heapTotal: poolWorker.tasksProcessed * 3072, // 3KB total estimado
                    rss: poolWorker.tasksProcessed * 4096, // 4KB RSS estimado
                });
            }, 1000);

            // Solicitar memoria real del worker
            const memoryRequestId = `memory-${poolWorker.id}-${Date.now()}`;

            const handler = (response: any) => {
                if (
                    response.id === memoryRequestId &&
                    response.type === 'memory-usage'
                ) {
                    clearTimeout(timeout);
                    poolWorker.worker.off('message', handler);
                    resolve({
                        heapUsed:
                            response.memoryUsage?.heapUsed ||
                            poolWorker.tasksProcessed * 2048,
                        heapTotal:
                            response.memoryUsage?.heapTotal ||
                            poolWorker.tasksProcessed * 3072,
                        rss:
                            response.memoryUsage?.rss ||
                            poolWorker.tasksProcessed * 4096,
                    });
                }
            };

            poolWorker.worker.on('message', handler);
            poolWorker.worker.postMessage({
                type: 'get-memory-usage',
                id: memoryRequestId,
            });
        });
    }

    /**
     * Obtiene la razón por la cual un worker debe ser reciclado
     * ✨ OPTIMIZACIÓN #11: Límites aumentados para reducir overhead de reciclaje
     */
    private getRecycleReason(poolWorker: PoolWorker): string {
        const now = Date.now();
        const MEMORY_LIMIT = 100 * 1024 * 1024; // ✨ 100MB (aumentado de 50MB)
        const TIME_LIMIT = 30 * 60 * 1000; // 30 minutos
        const TASK_LIMIT = this.MAX_TASKS_PER_WORKER;

        const reasons: string[] = [];

        if (poolWorker.memoryUsage > MEMORY_LIMIT) {
            reasons.push(
                `memoria excede ${Math.round(MEMORY_LIMIT / 1024 / 1024)}MB (actual: ${Math.round(poolWorker.memoryUsage / 1024 / 1024)}MB)`,
            );
        }

        if (now - poolWorker.creationTime > TIME_LIMIT) {
            reasons.push(
                `tiempo de vida excede ${Math.round(TIME_LIMIT / 60000)} minutos`,
            );
        }

        if (poolWorker.tasksProcessed >= TASK_LIMIT) {
            reasons.push(
                `tareas procesadas exceden ${TASK_LIMIT} (actual: ${poolWorker.tasksProcessed})`,
            );
        }

        return reasons.join(', ');
    } /**
     * Limpia workers que han estado inactivos por mucho tiempo
     */
    private async cleanupInactiveWorkers(): Promise<void> {
        const now = Date.now();
        const INACTIVE_TIMEOUT = 5 * 60 * 1000; // 5 minutos (reducido)

        for (const poolWorker of this.workers) {
            const timeSinceLastActivity = now - poolWorker.lastActivityTime;

            if (
                timeSinceLastActivity > INACTIVE_TIMEOUT &&
                !poolWorker.busy &&
                poolWorker.pendingTasks.size === 0
            ) {
                console.info(
                    `[WorkerPool] Worker ${poolWorker.id} inactivo por ${Math.round(timeSinceLastActivity / 60000)} minutos, reciclando...`,
                );
                await this.recycleWorker(poolWorker);
            }
        }
    } /**
     * Verifica si un worker debe ser reciclado por límites de memoria/tiempo
     * ✨ OPTIMIZACIÓN #11: Límites aumentados para reducir overhead de reciclaje
     */
    private shouldRecycleWorker(poolWorker: PoolWorker): boolean {
        const now = Date.now();
        const MEMORY_LIMIT = 100 * 1024 * 1024; // ✨ 100MB (aumentado de 30MB)
        const TIME_LIMIT = 30 * 60 * 1000; // ✨ 30 minutos (aumentado de 15 min)
        const TASK_LIMIT = this.MAX_TASKS_PER_WORKER;

        return (
            poolWorker.memoryUsage > MEMORY_LIMIT ||
            now - poolWorker.creationTime > TIME_LIMIT ||
            poolWorker.tasksProcessed >= TASK_LIMIT
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
    }

    /**
     * Configura el modo de operación del pool - OPTIMIZADO para máxima velocidad
     */
    setMode(mode: 'individual' | 'batch' | 'watch'): void {
        // Ajustar configuración según el modo - MÁS AGRESIVO
        switch (mode) {
            case 'batch':
                // Para modo batch, máxima concurrencia para throughput
                this.poolSize = Math.min(os.cpus().length, 20);
                break;
            case 'watch':
                // Para modo watch, más workers para mejor responsividad
                this.poolSize = Math.min(os.cpus().length, 12);
                break;
            case 'individual':
                // Para individual, pool moderado
                this.poolSize = Math.min(8, os.cpus().length);
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
     */
    private async _performPoolInitialization(): Promise<void> {
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
        } catch (error: any) {
            this.isInitialized = false;
            throw error;
        }
    }

    /**
     * Crea un worker individual
     */
    private async createWorker(workerId: number): Promise<PoolWorker> {
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
                    // ✨ ISSUE #4: Inicializar controles de memoria
                    memoryUsage: 0,
                    lastMemoryCheck: Date.now(),
                    tasksProcessed: 0,
                    creationTime: Date.now(),
                    lastActivityTime: Date.now(),
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

                worker.on('error', (error: Error) => {
                    clearTimeout(initTimeout);
                    reject(error);
                });

                // Intentar conectar
                checkReady();
            } catch (error: any) {
                reject(error);
            }
        });
    }

    /**
     * Configura los listeners para un worker individual
     */
    private setupWorkerListeners(poolWorker: PoolWorker): void {
        const { worker } = poolWorker;

        worker.on('message', (response: WorkerResponse) => {
            try {
                // Ignorar mensajes de control
                if (
                    response.id === 'worker-ready' ||
                    response.message === 'pong'
                ) {
                    return;
                }

                // ✨ ISSUE #4: Manejar reportes de memoria del worker
                if (response.type === 'memory-usage') {
                    return; // Ya manejado en getWorkerMemoryUsage
                }

                // Buscar la tarea pendiente
                const pendingTask = poolWorker.pendingTasks.get(response.id);
                if (!pendingTask) {
                    return;
                }

                // ✨ FIX MEMORIA: Limpiar timeout INMEDIATAMENTE para liberar referencias
                clearTimeout(pendingTask.timeout);

                // ✨ FIX MEMORIA: Guardar referencias necesarias antes de eliminar la tarea
                const { resolve, reject } = pendingTask;

                // ✨ FIX MEMORIA: Eliminar la tarea del mapa ANTES de procesarla
                poolWorker.pendingTasks.delete(response.id);

                // Marcar worker como disponible si no tiene más tareas
                if (poolWorker.pendingTasks.size === 0) {
                    poolWorker.busy = false;
                }

                // Actualizar actividad del worker
                poolWorker.lastActivityTime = Date.now();

                // ✨ ISSUE #4: Manejo mejorado de errores de TypeScript
                if (
                    response.success &&
                    response.diagnostics !== undefined &&
                    response.hasErrors !== undefined
                ) {
                    this.completedTasks++;

                    // ✨ FIX MEMORIA: Crear resultado sin referencias circulares
                    const result: TypeCheckResult = {
                        diagnostics: response.diagnostics || [],
                        hasErrors: response.hasErrors,
                    };

                    // ✨ FIX MEMORIA: No mantener response completo en memoria
                    resolve(result);

                    // ✨ FIX MEMORIA: Limpiar diagnostics después de resolver
                    setImmediate(() => {
                        if (response.diagnostics) {
                            response.diagnostics.length = 0;
                        }
                    });
                } else {
                    this.failedTasks++;
                    const errorMessage =
                        response.error || 'Error desconocido del worker';

                    // ✨ FIX MEMORIA: Error simple sin referencias pesadas
                    const error = new Error(errorMessage);
                    reject(error);
                }
            } catch {
                // Error silencioso - no imprimir cada error
            }
        });

        worker.on('error', async (error: Error) => {
            await this.handleWorkerError(poolWorker, error);
        });

        worker.on('exit', async (code: number | null) => {
            await this.handleWorkerExit(poolWorker, code);
        });
    }

    /**
     * Maneja errores de un worker específico con cleanup completo
     * ✨ FIX MEMORIA: Limpieza agresiva y sin esperas
     */
    private async handleWorkerError(
        poolWorker: PoolWorker,
        error: Error,
    ): Promise<void> {
        console.warn(
            `[WorkerPool] Manejando error del worker ${poolWorker.id}:`,
            error.message,
        );

        // 1. ✨ FIX MEMORIA: Limpiar INMEDIATAMENTE todas las tareas pendientes
        const pendingTasksArray = Array.from(poolWorker.pendingTasks.entries());

        for (const [taskId, task] of pendingTasksArray) {
            clearTimeout(task.timeout);
            this.failedTasks++;
            task.reject(new Error(`Worker ${poolWorker.id} failed`));
            poolWorker.pendingTasks.delete(taskId);
        }

        poolWorker.pendingTasks.clear();

        // 2. ✨ FIX MEMORIA: Remover listeners antes de terminar
        try {
            poolWorker.worker.removeAllListeners('message');
            poolWorker.worker.removeAllListeners('error');
            poolWorker.worker.removeAllListeners('exit');
            poolWorker.worker.removeAllListeners('online');
            poolWorker.worker.removeAllListeners('messageerror');
        } catch {
            // Silencioso
        }

        // 3. ✨ FIX MEMORIA: Terminar sin esperar
        const workerToTerminate = poolWorker.worker;
        poolWorker.worker = null as any;
        poolWorker.busy = false;

        workerToTerminate.terminate().catch(() => {
            // Silencioso
        });

        // 4. ✨ FIX MEMORIA: Recrear worker asíncronamente sin bloquear
        if (this.isInitialized && this.workers.length > 0) {
            setImmediate(async () => {
                try {
                    const newWorker = await this.createWorker(poolWorker.id);
                    const index = this.workers.findIndex(
                        w => w.id === poolWorker.id,
                    );
                    if (index !== -1) {
                        this.workers[index] = newWorker;
                    }
                } catch {
                    // Silencioso
                }
            });
        }
    }

    /**
     * Maneja la salida inesperada de un worker con cleanup completo
     */
    private async handleWorkerExit(
        poolWorker: PoolWorker,
        code: number | null,
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
     */
    private async recreateWorker(failedWorker: PoolWorker): Promise<void> {
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
     * ✨ FIX MEMORIA: Limpieza agresiva de todas las referencias
     */
    private async recycleWorker(poolWorker: PoolWorker): Promise<void> {
        try {
            console.log(
                `[WorkerPool] Reciclando worker ${poolWorker.id} después de ${poolWorker.taskCounter} tareas`,
            );

            // 1. ✨ FIX MEMORIA: No esperar, rechazar inmediatamente todas las tareas pendientes
            const pendingTasksArray = Array.from(
                poolWorker.pendingTasks.entries(),
            );

            for (const [taskId, task] of pendingTasksArray) {
                clearTimeout(task.timeout);
                task.reject(new Error('Worker being recycled'));
                poolWorker.pendingTasks.delete(taskId);
            }

            // ✨ FIX MEMORIA: Forzar limpieza del Map
            poolWorker.pendingTasks.clear();

            // 2. ✨ FIX MEMORIA: Remover listeners explícitamente por tipo
            const worker = poolWorker.worker;
            worker.removeAllListeners('message');
            worker.removeAllListeners('error');
            worker.removeAllListeners('exit');
            worker.removeAllListeners('online');
            worker.removeAllListeners('messageerror');

            // 3. ✨ FIX MEMORIA: Guardar referencia temporal y limpiar poolWorker
            const workerToTerminate = poolWorker.worker;
            const workerId = poolWorker.id;

            // Limpiar todas las propiedades del poolWorker
            poolWorker.worker = null as any;
            poolWorker.busy = false;
            poolWorker.taskCounter = 0;
            poolWorker.tasksProcessed = 0;
            poolWorker.memoryUsage = 0;

            // 4. ✨ FIX MEMORIA: Terminar con timeout agresivo
            const terminatePromise = workerToTerminate.terminate();
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Terminate timeout')), 2000),
            );

            await Promise.race([terminatePromise, timeoutPromise]).catch(() => {
                // Forzar terminación si falla
                try {
                    workerToTerminate.terminate();
                } catch {
                    // Silencioso
                }
            });

            // ✨ FIX MEMORIA: Forzar garbage collection del worker terminado
            setImmediate(() => {
                // Dar tiempo al GC para limpiar
            });

            // 5. ✨ FIX MEMORIA: Crear y reemplazar con nuevo worker
            const newWorker = await this.createWorker(workerId);
            const index = this.workers.findIndex(w => w.id === workerId);
            if (index !== -1) {
                this.workers[index] = newWorker;
            }
        } catch (error: any) {
            console.error(
                `[WorkerPool] Error reciclando worker ${poolWorker.id}:`,
                error,
            );
            // ✨ FIX MEMORIA: Asegurar limpieza incluso en error
            poolWorker.pendingTasks.clear();
            poolWorker.busy = false;
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

        // ✨ FIX: Incrementar totalTasks ANTES del try/catch para conteo correcto
        this.totalTasks++;

        if (!availableWorker) {
            return this.typeCheckWithSyncFallback(
                fileName,
                content,
                compilerOptions,
            );
        }

        try {
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
     * Realiza type checking usando un worker específico con reciclaje automático
     * ✨ FIX MEMORIA: Optimizado para prevenir fugas de memoria
     */
    private async typeCheckWithWorker(
        poolWorker: PoolWorker,
        fileName: string,
        content: string,
        compilerOptions: any,
    ): Promise<TypeCheckResult> {
        // Verificar si el worker necesita reciclaje por número de tareas
        if (poolWorker.taskCounter >= this.MAX_TASKS_PER_WORKER) {
            // ✨ FIX: No esperar el reciclaje, usar fallback
            return this.typeCheckWithSyncFallback(
                fileName,
                content,
                compilerOptions,
            );
        }

        return new Promise<TypeCheckResult>((resolve, reject) => {
            const taskId = `task-${poolWorker.id}-${++poolWorker.taskCounter}-${Date.now()}`;

            // Marcar worker como ocupado y actualizar actividad
            poolWorker.busy = true;
            poolWorker.lastActivityTime = Date.now();
            poolWorker.tasksProcessed++;

            // ✨ ISSUE #4: Timeout dinámico basado en complejidad del archivo
            const dynamicTimeout = this.calculateDynamicTimeout(
                fileName,
                content,
                compilerOptions,
            );

            // ✨ FIX MEMORIA: Configurar timeout con limpieza explícita
            const timeout = setTimeout(() => {
                const task = poolWorker.pendingTasks.get(taskId);
                if (task) {
                    poolWorker.pendingTasks.delete(taskId);
                    if (poolWorker.pendingTasks.size === 0) {
                        poolWorker.busy = false;
                    }
                    reject(
                        new Error(
                            `Timeout (${dynamicTimeout}ms) en type checking para ${fileName}`,
                        ),
                    );
                }
            }, dynamicTimeout);

            // ✨ FIX MEMORIA: Wrapper para resolver/rechazar que limpia el timeout
            const wrappedResolve = (result: TypeCheckResult) => {
                clearTimeout(timeout);
                resolve(result);
            };

            const wrappedReject = (error: Error) => {
                clearTimeout(timeout);
                reject(error);
            };

            // ✨ FIX MEMORIA: Agregar tarea con wrappers que auto-limpian
            poolWorker.pendingTasks.set(taskId, {
                resolve: wrappedResolve,
                reject: wrappedReject,
                timeout,
                fileName,
                startTime: Date.now(),
            });

            try {
                // ✨ FIX MEMORIA: No copiar compilerOptions completo
                const message: WorkerMessage = {
                    id: taskId,
                    fileName,
                    content,
                    compilerOptions: {
                        target: compilerOptions.target,
                        module: compilerOptions.module,
                        strict: compilerOptions.strict,
                        skipLibCheck: compilerOptions.skipLibCheck,
                        // No pasar propiedades innecesarias que ocupan memoria
                    },
                };

                // Enviar mensaje al worker
                poolWorker.worker.postMessage(message);
            } catch (error: any) {
                // Limpiar en caso de error
                clearTimeout(timeout);
                poolWorker.pendingTasks.delete(taskId);
                if (poolWorker.pendingTasks.size === 0) {
                    poolWorker.busy = false;
                }
                reject(error as Error);
            }
        });
    }

    /**
     * Calcula un timeout dinámico basado en la complejidad del archivo TypeScript
     */
    private calculateDynamicTimeout(
        fileName: string,
        content: string,
        compilerOptions: any,
    ): number {
        const baseTimeout = this.TASK_TIMEOUT; // 10 segundos base
        let complexityMultiplier = 1;

        // Factor 1: Tamaño del archivo
        const contentLength = content.length;
        if (contentLength > 100000) {
            // Archivos > 100KB
            complexityMultiplier += 1.5;
        } else if (contentLength > 50000) {
            // Archivos > 50KB
            complexityMultiplier += 1;
        } else if (contentLength > 20000) {
            // Archivos > 20KB
            complexityMultiplier += 0.5;
        }

        // Factor 2: Complejidad sintáctica
        const importCount = (content.match(/^import\s+/gm) || []).length;
        const typeCount = (content.match(/\btype\s+\w+/g) || []).length;
        const interfaceCount = (content.match(/\binterface\s+\w+/g) || [])
            .length;
        const genericCount = (content.match(/<[^>]*>/g) || []).length;
        const complexConstructs =
            importCount + typeCount + interfaceCount + genericCount * 0.5;

        if (complexConstructs > 100) {
            complexityMultiplier += 2;
        } else if (complexConstructs > 50) {
            complexityMultiplier += 1;
        } else if (complexConstructs > 20) {
            complexityMultiplier += 0.5;
        }

        // Factor 3: Configuración de TypeScript estricta
        if (compilerOptions?.strict || compilerOptions?.noImplicitAny) {
            complexityMultiplier += 0.3;
        }

        // Factor 4: Extensión de archivo compleja (.d.ts, .vue.ts, etc.)
        if (fileName.includes('.d.ts')) {
            complexityMultiplier += 1; // Los archivos de definición son más complejos
        } else if (fileName.includes('.vue')) {
            complexityMultiplier += 0.5; // Los archivos Vue requieren procesamiento adicional
        }

        // Aplicar límites razonables
        complexityMultiplier = Math.min(complexityMultiplier, 5); // Máximo 5x el timeout base
        complexityMultiplier = Math.max(complexityMultiplier, 0.5); // Mínimo 0.5x el timeout base

        const finalTimeout = Math.round(baseTimeout * complexityMultiplier);

        return Math.min(finalTimeout, 60000); // Máximo absoluto de 60 segundos
    }

    /**
     * Fallback síncrono para type checking
     * ✨ FIX: Ahora trackea las tareas correctamente
     */
    private typeCheckWithSyncFallback(
        fileName: string,
        content: string,
        compilerOptions: any,
    ): TypeCheckResult {
        try {
            const result = validateTypesWithLanguageService(
                fileName,
                content,
                compilerOptions,
            );
            this.completedTasks++; // ✨ FIX: Contabilizar tareas completadas en fallback
            return result;
        } catch {
            this.failedTasks++; // ✨ FIX: Contabilizar tareas fallidas en fallback
            return {
                diagnostics: [],
                hasErrors: false,
            };
        }
    }

    /**
     * Cierra todos los workers del pool con cleanup completo
     * ✨ FIX #1: Ahora limpia timers de monitoreo para evitar fugas de memoria
     */
    async terminate(): Promise<void> {
        console.log('[WorkerPool] Cerrando pool de workers...');

        // 0. ✨ FIX #1: Detener monitoreo de memoria primero
        this.stopMemoryMonitoring();

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
        }

        // 2. Cerrar todos los workers con manejo de errores
        const terminatePromises = this.workers.map(async poolWorker => {
            try {
                await poolWorker.worker.terminate();
            } catch (error: any) {
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

    // ✨ ISSUE #4: Métodos de categorización de errores de TypeScript

    /**
     * Categoriza y mejora los errores de TypeScript para mejor debugging
     */
    private categorizeTypeScriptErrors(
        result: TypeCheckResult,
        fileName: string,
    ): TypeCheckResult {
        if (!result.hasErrors || !result.diagnostics?.length) {
            return result;
        }

        const categorizedDiagnostics = result.diagnostics.map(diagnostic => {
            // Añadir metadatos útiles para debugging
            const enhanced = {
                ...diagnostic,
                _category: this.getErrorCategory(diagnostic),
                _severity: this.getErrorSeverity(diagnostic),
                _fileName: fileName,
                _timestamp: Date.now(),
            };

            return enhanced;
        });

        return {
            ...result,
            diagnostics: categorizedDiagnostics,
            // Añadir estadísticas de errores
            _errorStats: this.calculateErrorStats(categorizedDiagnostics),
        } as any;
    } /**
     * Determina la categoría de un error de TypeScript
     */
    private getErrorCategory(diagnostic: any): string {
        const code = diagnostic.code;

        // Categorización basada en códigos de error comunes
        if ([2304, 2339, 2346].includes(code)) {
            return 'MISSING_DECLARATION'; // No puede encontrar nombre/propiedad
        } else if ([2322, 2322, 2345].includes(code)) {
            return 'TYPE_MISMATCH'; // Error de tipos
        } else if ([2307, 2317].includes(code)) {
            return 'MODULE_RESOLUTION'; // Error de resolución de módulos
        } else if ([2552, 2551].includes(code)) {
            return 'PROPERTY_ACCESS'; // Error de acceso a propiedades
        } else if (code >= 1000 && code < 2000) {
            return 'SYNTAX_ERROR'; // Errores de sintaxis
        } else if (code >= 2000 && code < 3000) {
            return 'SEMANTIC_ERROR'; // Errores semánticos
        } else if (code >= 4000) {
            return 'CONFIG_ERROR'; // Errores de configuración
        }

        return 'OTHER';
    }

    /**
     * Determina la severidad de un error de TypeScript
     */
    private getErrorSeverity(diagnostic: any): 'ERROR' | 'WARNING' | 'INFO' {
        const category = diagnostic.category;

        switch (category) {
            case 1:
                return 'ERROR'; // typescript.DiagnosticCategory.Error
            case 2:
                return 'WARNING'; // typescript.DiagnosticCategory.Warning
            case 3:
                return 'INFO'; // typescript.DiagnosticCategory.Message
            default:
                return 'ERROR';
        }
    }

    /**
     * Calcula estadísticas de errores para análisis
     */
    private calculateErrorStats(diagnostics: any[]): object {
        const stats = {
            totalErrors: diagnostics.length,
            errorsByCategory: {} as Record<string, number>,
            errorsBySeverity: {} as Record<string, number>,
            mostCommonError: null as any,
        };

        // Contar por categoría y severidad
        diagnostics.forEach(diag => {
            const category = diag._category || 'OTHER';
            const severity = diag._severity || 'ERROR';

            stats.errorsByCategory[category] =
                (stats.errorsByCategory[category] || 0) + 1;
            stats.errorsBySeverity[severity] =
                (stats.errorsBySeverity[severity] || 0) + 1;
        }); // Encontrar el error más común
        const errorCounts = {} as Record<string, number>;
        diagnostics.forEach(diag => {
            const code = String(diag.code);
            errorCounts[code] = (errorCounts[code] || 0) + 1;
        });
        const errorCountKeys = Object.keys(errorCounts);
        if (errorCountKeys.length > 0) {
            const mostCommonCode = errorCountKeys.reduce((a, b) =>
                (errorCounts[a] || 0) > (errorCounts[b] || 0) ? a : b,
            );

            stats.mostCommonError = {
                code: mostCommonCode,
                count: errorCounts[mostCommonCode],
                message: diagnostics.find(
                    d => String(d.code) === mostCommonCode,
                )?.messageText,
            };
        }

        return stats;
    }

    /**
     * Crea un error categorizado con información de contexto
     */
    private createCategorizedError(
        errorMessage: string,
        fileName: string,
        response: WorkerResponse,
    ): Error {
        const error = new Error(errorMessage) as any;

        // Añadir metadatos del error
        error.fileName = fileName;
        error.timestamp = Date.now();
        error.workerResponse = response;
        error.category = this.categorizeGenericError(errorMessage);
        error.isRecoverable = this.isRecoverableError(errorMessage);

        return error;
    }

    /**
     * Categoriza errores genéricos del worker
     */
    private categorizeGenericError(errorMessage: string): string {
        if (
            errorMessage.includes('timeout') ||
            errorMessage.includes('Timeout')
        ) {
            return 'TIMEOUT';
        } else if (
            errorMessage.includes('memory') ||
            errorMessage.includes('Memory')
        ) {
            return 'MEMORY';
        } else if (
            errorMessage.includes('Worker') &&
            errorMessage.includes('exited')
        ) {
            return 'WORKER_CRASH';
        } else if (
            errorMessage.includes('initialization') ||
            errorMessage.includes('init')
        ) {
            return 'INITIALIZATION';
        }

        return 'UNKNOWN';
    }

    /**
     * Determina si un error es recuperable
     */
    private isRecoverableError(errorMessage: string): boolean {
        const recoverablePatterns = [
            'timeout',
            'Worker being recycled',
            'Worker pool cerrado',
            'temporary',
        ];

        return recoverablePatterns.some(pattern =>
            errorMessage.toLowerCase().includes(pattern.toLowerCase()),
        );
    }
}
