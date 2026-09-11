import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:readline/promises', () => ({
    createInterface: vi.fn(() => ({
        question: vi.fn(() => new Promise(() => {})), // nunca resuelve
        close: vi.fn(),
    })),
}));

import { promptUser } from '../src/utils/promptUser';

describe('promptUser - listener de SIGINT', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('no deja un listener de SIGINT colgado cuando expira el timeout', async () => {
        const before = process.listenerCount('SIGINT');

        const pending = promptUser('¿continuar?', 1000);
        // Adjuntar el rechazo ahora para que Node no lo marque unhandled
        // mientras avanzamos el reloj falso.
        const result = expect(pending).rejects.toThrow('Timeout');

        await vi.advanceTimersByTimeAsync(1000);
        await result;

        expect(process.listenerCount('SIGINT')).toBe(before);
    });
});
