import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { TypeScriptWorkerPool } from '../src/compiler/typescript-worker-pool';

describe('TypeScriptWorkerPool - recycleWorker re-entrancy', () => {
    let pool: TypeScriptWorkerPool;

    beforeAll(async () => {
        pool = TypeScriptWorkerPool.getInstance();
        // Forzar la creación de al menos un worker real antes de reciclarlo.
        await pool.typeCheck('recycle-setup.ts', 'const x = 1;', {
            target: 99,
            module: 99,
            strict: true,
            skipLibCheck: true,
        });
    });

    afterAll(async () => {
        await pool.terminate();
    });

    it('llamar recycleWorker dos veces concurrentemente sobre el mismo poolWorker no revienta', async () => {
        const anyPool = pool as any;
        const poolWorker = anyPool.workers[0];
        expect(poolWorker).toBeDefined();

        // recycleWorker atrapa sus propios errores internamente (nunca
        // rechaza la promesa), así que la regresión real a detectar es que
        // se loguee el TypeError de removeAllListeners sobre `null` — no
        // solo que Promise.all resuelva.
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Regresión: sin el guard `if (!poolWorker.worker) return;`, la
        // segunda llamada concurrente encuentra poolWorker.worker ya en
        // null (puesto por la primera) y revienta en removeAllListeners.
        await Promise.all([
            anyPool.recycleWorker(poolWorker),
            anyPool.recycleWorker(poolWorker),
        ]);

        const loggedRemoveListenersCrash = errorSpy.mock.calls.some(call =>
            call.some(
                arg =>
                    arg instanceof Error &&
                    arg.message.includes('removeAllListeners'),
            ),
        );
        expect(loggedRemoveListenersCrash).toBe(false);

        errorSpy.mockRestore();
    });
});
