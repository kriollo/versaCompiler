import * as os from 'node:os';
import * as path from 'node:path';
import * as process from 'node:process';
import { Worker } from 'node:worker_threads';

export type CompileTaskType = 'vue' | 'ts' | 'minify';

type CompileTaskPayload = {
    fileName: string;
    source: string;
    isProd?: boolean;
    scriptInfo?: any;
};

type WorkerMessage = {
    id: string;
    type: CompileTaskType;
    payload: CompileTaskPayload;
};

type WorkerResponse = {
    id: string;
    success: boolean;
    data?: any;
    error?: string;
};

type PendingTask = {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
    // Worker al que se despachó la tarea (null mientras espera en cola).
    // Permite que un error de un worker solo rechace SUS tareas, no las de
    // workers hermanos que siguen sanos.
    poolWorker: PoolWorker | null;
};

type PoolWorker = {
    worker: Worker;
    busy: boolean;
    dead: boolean;
};

export class CompileWorkerPool {
    private static instance: CompileWorkerPool;
    private workers: PoolWorker[] = [];
    private pending = new Map<string, PendingTask>();
    private queue: Array<WorkerMessage> = [];
    private poolSize: number;
    private workerPath: string;
    private readonly TASK_TIMEOUT = 60000;

    private constructor() {
        const cpuCount = os.cpus().length;
        const configuredMax = parseInt(
            process.env.COMPILE_MAX_WORKERS || '2',
            10,
        );
        this.poolSize = Math.min(configuredMax, Math.max(1, cpuCount - 1));
        this.workerPath = path.join(
            process.env.PATH_PROY || path.join(process.cwd(), 'src'),
            'compiler',
            'compile-worker-thread.cjs',
        );
        this.initWorkers();
    }

    static getInstance(): CompileWorkerPool {
        if (!CompileWorkerPool.instance) {
            CompileWorkerPool.instance = new CompileWorkerPool();
        }
        return CompileWorkerPool.instance;
    }

    private initWorkers(): void {
        for (let i = 0; i < this.poolSize; i++) {
            this.workers.push(this.spawnWorker());
        }
    }

    private spawnWorker(): PoolWorker {
        const worker = new Worker(this.workerPath, {
            env: process.env,
        });
        const poolWorker: PoolWorker = { worker, busy: false, dead: false };

        worker.on('message', (response: WorkerResponse) => {
            const pending = this.pending.get(response.id);
            if (!pending) return;
            clearTimeout(pending.timeout);
            this.pending.delete(response.id);
            poolWorker.busy = false;
            if (!response.success) {
                pending.reject(new Error(response.error || 'Worker task failed'));
            } else {
                pending.resolve(response.data);
            }
            this.drainQueue();
        });

        worker.on('error', error => {
            this.replaceWorker(
                poolWorker,
                error instanceof Error ? error : new Error(String(error)),
            );
        });
        // Un crash/OOM (o el terminate() de un timeout) emite 'exit' sin 'error'
        worker.on('exit', code => {
            this.replaceWorker(
                poolWorker,
                new Error(`Worker terminó inesperadamente (code ${code})`),
            );
        });

        return poolWorker;
    }

    /**
     * Rechaza solo las tareas despachadas a ESTE worker (no las de workers
     * hermanos sanos) y lo sustituye por uno nuevo para no perder el slot.
     */
    private replaceWorker(poolWorker: PoolWorker, error: Error): void {
        if (poolWorker.dead) return;
        poolWorker.dead = true;
        for (const [id, pending] of this.pending) {
            if (pending.poolWorker !== poolWorker) continue;
            clearTimeout(pending.timeout);
            pending.reject(error);
            this.pending.delete(id);
        }
        const index = this.workers.indexOf(poolWorker);
        if (index !== -1) this.workers[index] = this.spawnWorker();
        this.drainQueue();
    }

    async runTask(
        type: CompileTaskType,
        payload: CompileTaskPayload,
    ): Promise<any> {
        const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const message: WorkerMessage = { id, type, payload };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pending.delete(id);
                this.queue = this.queue.filter(queued => queued.id !== id);
                reject(new Error(`Worker timeout: ${type}`));
                // El worker sigue colgado en la tarea: reemplazarlo vía 'exit'
                if (pendingTask.poolWorker) {
                    void pendingTask.poolWorker.worker.terminate();
                }
            }, this.TASK_TIMEOUT);

            const pendingTask: PendingTask = {
                resolve,
                reject,
                timeout,
                poolWorker: null,
            };
            this.pending.set(id, pendingTask);
            const worker = this.getAvailableWorker();
            if (worker) {
                worker.busy = true;
                pendingTask.poolWorker = worker;
                worker.worker.postMessage(message);
                return;
            }
            this.queue.push(message);
        });
    }

    private getAvailableWorker(): PoolWorker | null {
        return this.workers.find(worker => !worker.busy && !worker.dead) || null;
    }

    private drainQueue(): void {
        if (this.queue.length === 0) return;
        const worker = this.getAvailableWorker();
        if (!worker) return;
        const message = this.queue.shift();
        if (!message) return;
        const pendingTask = this.pending.get(message.id);
        if (pendingTask) pendingTask.poolWorker = worker;
        worker.busy = true;
        worker.worker.postMessage(message);
    }
}
