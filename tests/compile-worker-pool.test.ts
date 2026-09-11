import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock de worker_threads: cada Worker es un EventEmitter controlable desde
// el test, sin spawnear threads reales ni depender de compile-worker-thread.cjs.
const createdWorkers: MockWorker[] = [];

class MockWorker extends EventEmitter {
    postMessage = vi.fn();
    terminate = vi.fn();
    constructor() {
        super();
        createdWorkers.push(this);
    }
}

vi.mock('node:worker_threads', () => ({
    Worker: MockWorker,
}));

describe('CompileWorkerPool - aislamiento de errores por worker', () => {
    beforeEach(() => {
        vi.resetModules();
        createdWorkers.length = 0;
        process.env.COMPILE_MAX_WORKERS = '2';
    });

    afterEach(() => {
        delete process.env.COMPILE_MAX_WORKERS;
    });

    it('un error en un worker solo rechaza SUS tareas, no las de workers hermanos sanos', async () => {
        const { CompileWorkerPool } =
            await import('../src/compiler/compile-worker-pool');
        const pool = CompileWorkerPool.getInstance();

        expect(createdWorkers.length).toBe(2);
        const [workerA, workerB] = createdWorkers;

        // Despachar dos tareas: como ambos workers están libres al inicio,
        // cada runTask() toma un worker distinto (A luego B).
        const taskA = pool.runTask('vue', { fileName: 'a.vue', source: '' });
        const taskB = pool.runTask('ts', { fileName: 'b.ts', source: '' });

        expect(workerA!.postMessage).toHaveBeenCalledTimes(1);
        expect(workerB!.postMessage).toHaveBeenCalledTimes(1);

        const idA = workerA!.postMessage.mock.calls[0][0].id;
        const idB = workerB!.postMessage.mock.calls[0][0].id;

        // Worker A crashea: solo debe rechazar la tarea A.
        workerA!.emit('error', new Error('worker A crashed'));

        await expect(taskA).rejects.toThrow('worker A crashed');

        // Worker B responde con éxito a su propia tarea: taskB debe resolver,
        // sin verse afectada por el crash de A.
        workerB!.emit('message', {
            id: idB,
            success: true,
            data: { compiled: true },
        });

        await expect(taskB).resolves.toEqual({ compiled: true });
        void idA; // solo usado para claridad/documentación del escenario
    });
});
