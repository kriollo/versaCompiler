import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// versaHMR.js lee `window` en el top-level del módulo (crea el singleton
// window.__versaHMR si no existe), así que window debe existir ANTES de
// importarlo — igual que hace tests/initHrm.test.ts para initHRM.js.
const mockLocation = {
    origin: 'http://localhost:3000',
    reload: vi.fn(),
};

Object.defineProperty(global, 'window', {
    value: { location: mockLocation },
    writable: true,
    configurable: true,
});

let versaHMR: any;

beforeAll(async () => {
    const mod = await import('../src/hrm/versaHMR.js');
    versaHMR = mod.versaHMR;
});

describe('VersaHMR - registro de módulos', () => {
    beforeEach(() => {
        versaHMR.clear();
        mockLocation.reload.mockClear();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('accept() registra un observer y notifyUpdate() lo llama con el nuevo módulo', () => {
        const callback = vi.fn();
        versaHMR.accept('/public/utils/math.js', callback);

        const newModule = { add: (a: number, b: number) => a + b };
        const ok = versaHMR.notifyUpdate('/public/utils/math.js', newModule);

        expect(ok).toBe(true);
        expect(callback).toHaveBeenCalledWith(newModule, {
            moduleId: '/public/utils/math.js',
            version: 1,
        });
    });

    it('notifyUpdate() en un módulo sin observers retorna false', () => {
        expect(versaHMR.notifyUpdate('/no/one/listens.js', {})).toBe(false);
    });

    it('normaliza moduleId quitando query params (?t=...)', () => {
        const callback = vi.fn();
        versaHMR.accept('/public/utils/math.js', callback);

        const ok = versaHMR.notifyUpdate(
            '/public/utils/math.js?t=123456',
            { fresh: true },
        );

        expect(ok).toBe(true);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('la función de unsubscribe retornada por accept() remueve el callback', () => {
        const callback = vi.fn();
        const unsubscribe = versaHMR.accept('/public/utils/math.js', callback);

        unsubscribe();

        expect(versaHMR.hasObservers('/public/utils/math.js')).toBe(false);
        expect(versaHMR.notifyUpdate('/public/utils/math.js', {})).toBe(
            false,
        );
        expect(callback).not.toHaveBeenCalled();
    });

    it('un callback que lanza error no rompe notifyUpdate y marca el módulo como fallido', () => {
        const goodCallback = vi.fn();
        const badCallback = vi.fn(() => {
            throw new Error('boom');
        });
        versaHMR.accept('/public/broken.js', goodCallback);
        versaHMR.accept('/public/broken.js', badCallback);

        const ok = versaHMR.notifyUpdate('/public/broken.js', {});

        expect(ok).toBe(false);
        expect(goodCallback).toHaveBeenCalled();
        expect(versaHMR.hasFailed('/public/broken.js')).toBe(true);
    });

    it('un update exitoso posterior limpia el estado de fallo previo', () => {
        let shouldThrow = true;
        versaHMR.accept('/public/flaky.js', () => {
            if (shouldThrow) throw new Error('boom');
        });

        versaHMR.notifyUpdate('/public/flaky.js', {});
        expect(versaHMR.hasFailed('/public/flaky.js')).toBe(true);

        shouldThrow = false;
        versaHMR.notifyUpdate('/public/flaky.js', {});
        expect(versaHMR.hasFailed('/public/flaky.js')).toBe(false);
    });

    it('_onDispose registra un callback de cleanup que corre antes del siguiente update, recibe _getHotData', () => {
        const disposeCallback = vi.fn();
        versaHMR._onDispose('/public/stateful.js', disposeCallback);
        const hotData = versaHMR._getHotData('/public/stateful.js');
        hotData.counter = 42;

        versaHMR.accept('/public/stateful.js', () => {});
        versaHMR.notifyUpdate('/public/stateful.js', {});

        expect(disposeCallback).toHaveBeenCalledWith(
            expect.objectContaining({ counter: 42 }),
        );
    });

    it('_invalidate() limpia el estado del módulo y fuerza location.reload()', () => {
        versaHMR.accept('/public/x.js', () => {});
        versaHMR._invalidate('/public/x.js');

        expect(mockLocation.reload).toHaveBeenCalledTimes(1);
        expect(versaHMR.hasObservers('/public/x.js')).toBe(false);
    });

    it('getStats() refleja módulos registrados, observers y fallos', () => {
        versaHMR.accept('/a.js', () => {});
        versaHMR.accept('/a.js', () => {});
        versaHMR.accept('/b.js', () => {
            throw new Error('boom');
        });
        versaHMR.notifyUpdate('/b.js', {});

        const stats = versaHMR.getStats();
        expect(stats).toEqual({
            modules: 2,
            totalObservers: 3,
            failedModules: 1,
        });
    });

    it('clear() resetea completamente el registry', () => {
        versaHMR.accept('/a.js', () => {});
        versaHMR.clear();

        expect(versaHMR.getStats()).toEqual({
            modules: 0,
            totalObservers: 0,
            failedModules: 0,
        });
    });
});
