import * as process from 'node:process';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const initMock = vi.fn();
const bsInstance = {
    init: initMock,
    sockets: { on: vi.fn() },
};

vi.mock('browser-sync', () => ({
    create: () => bsInstance,
}));

vi.mock('get-port', () => ({
    default: vi.fn().mockResolvedValue(3000),
}));

describe('browserSyncServer ghostMode', () => {
    const originalPathProy = process.env.PATH_PROY;
    const originalPathDist = process.env.PATH_DIST;

    beforeEach(() => {
        initMock.mockClear();
        process.env.PATH_PROY = process.cwd();
        process.env.PATH_DIST = process.cwd();
    });

    afterEach(() => {
        process.env.PATH_PROY = originalPathProy;
        process.env.PATH_DIST = originalPathDist;
    });

    it('inicializa BrowserSync con ghostMode deshabilitado', async () => {
        const { browserSyncServer } = await import(
            '../src/servicios/browserSync'
        );
        await browserSyncServer();

        expect(initMock).toHaveBeenCalledTimes(1);
        const config = initMock.mock.calls[0]?.[0];
        expect(config.ghostMode).toBe(false);
    });
});
