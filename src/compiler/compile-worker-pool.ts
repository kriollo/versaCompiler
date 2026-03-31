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
};

type PoolWorker = {
    worker: Worker;
    busy: boolean;
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
            const worker = new Worker(this.workerPath, {
                env: process.env,
            });
            const poolWorker: PoolWorker = { worker, busy: false };

            worker.on('message', (response: WorkerResponse) => {
                const pending = this.pending.get(response.id);
                if (!pending) return;
                clearTimeout(pending.timeout);
                this.pending.delete(response.id);
                poolWorker.busy = false;
                if (!response.success) {
                    pending.reject(
                        new Error(response.error || 'Worker task failed'),
                    );
                } else {
                    pending.resolve(response.data);
                }
                this.drainQueue();
            });

            worker.on('error', error => {
                poolWorker.busy = false;
                for (const [id, pending] of this.pending) {
                    clearTimeout(pending.timeout);
                    const normalized =
                        error instanceof Error
                            ? error
                            : new Error(String(error));
                    pending.reject(normalized);
                    this.pending.delete(id);
                }
                this.drainQueue();
            });

            this.workers.push(poolWorker);
        }
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
                reject(new Error(`Worker timeout: ${type}`));
            }, this.TASK_TIMEOUT);

            this.pending.set(id, { resolve, reject, timeout });
            const worker = this.getAvailableWorker();
            if (worker) {
                worker.busy = true;
                worker.worker.postMessage(message);
                return;
            }
            this.queue.push(message);
        });
    }

    private getAvailableWorker(): PoolWorker | null {
        return this.workers.find(worker => !worker.busy) || null;
    }

    private drainQueue(): void {
        if (this.queue.length === 0) return;
        const worker = this.getAvailableWorker();
        if (!worker) return;
        const message = this.queue.shift();
        if (!message) return;
        worker.busy = true;
        worker.worker.postMessage(message);
    }
}
