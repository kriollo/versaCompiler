import { promises as fs } from 'node:fs';
import { join, relative } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createRequestMiddleware } from '../src/servicios/browserSync';

function createMockRes() {
    return {
        statusCode: 200,
        headers: {} as Record<string, string>,
        body: '' as string | Buffer,
        ended: false,
        setHeader(name: string, value: string) {
            this.headers[name] = value;
        },
        end(chunk?: string | Buffer) {
            this.ended = true;
            if (chunk !== undefined) this.body = chunk;
        },
    };
}

describe('browserSync createRequestMiddleware', () => {
    const tempDir = join(process.cwd(), 'temp', 'browsersync-test');
    const projectRoot = tempDir;
    const hrmDir = join(tempDir, 'hrm');
    // El branch /__versa/ resuelve relativeHrmPath contra process.cwd() real
    // (igual que en producción: relativeHrmPath = path.relative(projectRoot, hrmDir)
    // con projectRoot = process.cwd() en browserSyncServer()).
    const relativeHrmPath = relative(process.cwd(), hrmDir);

    beforeAll(async () => {
        await fs.mkdir(hrmDir, { recursive: true });
        await fs.mkdir(join(tempDir, 'node_modules', 'pkg'), {
            recursive: true,
        });
        await fs.mkdir(join(tempDir, 'public', 'js'), { recursive: true });
        await fs.mkdir(join(tempDir, 'secret'), { recursive: true });

        await fs.writeFile(
            join(hrmDir, 'initHRM.js'),
            'export const hmr = true;',
        );
        await fs.writeFile(
            join(tempDir, 'node_modules', 'pkg', 'index.js'),
            'export default 1;',
        );
        await fs.writeFile(
            join(tempDir, 'public', 'js', 'foo.js'),
            "import { bar } from '/public/js/bar.js';",
        );
        await fs.writeFile(
            join(tempDir, 'secret', 'hosts.js'),
            'super secret contents',
        );
    });

    afterAll(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('sirve /__versa/initHRM.js desde el directorio hrm', async () => {
        const middleware = createRequestMiddleware(
            relativeHrmPath,
            projectRoot,
            false,
        );
        const req = { method: 'GET', url: '/__versa/initHRM.js' };
        const res = createMockRes();
        let nextCalled = false;

        await middleware(req, res, () => {
            nextCalled = true;
        });

        expect(res.ended).toBe(true);
        expect(nextCalled).toBe(false);
        expect(res.body).toContain('export const hmr = true;');
    });

    it('bloquea path traversal en /__versa/', async () => {
        const middleware = createRequestMiddleware(
            relativeHrmPath,
            projectRoot,
            false,
        );
        const req = {
            method: 'GET',
            url: '/__versa/../../../../secret/hosts.js',
        };
        const res = createMockRes();

        await middleware(req, res, () => {});

        expect(res.statusCode).toBe(403);
        expect(res.body).not.toContain('super secret contents');
    });

    it('sirve archivos de /node_modules/', async () => {
        const middleware = createRequestMiddleware(
            relativeHrmPath,
            projectRoot,
            false,
        );
        const req = { method: 'GET', url: '/node_modules/pkg/index.js' };
        const res = createMockRes();

        await middleware(req, res, () => {});

        expect(res.ended).toBe(true);
        expect(res.body).toContain('export default 1;');
    });

    it('bloquea path traversal en /node_modules/', async () => {
        const middleware = createRequestMiddleware(
            relativeHrmPath,
            projectRoot,
            false,
        );
        const req = {
            method: 'GET',
            url: '/node_modules/../../../../secret/hosts.js',
        };
        const res = createMockRes();

        await middleware(req, res, () => {});

        expect(res.statusCode).toBe(403);
        expect(res.body).not.toContain('super secret contents');
    });

    it('reescribe imports en HMR re-import (?t=)', async () => {
        const middleware = createRequestMiddleware(
            relativeHrmPath,
            projectRoot,
            false,
        );
        const req = { method: 'GET', url: '/public/js/foo.js?t=12345' };
        const res = createMockRes();

        await middleware(req, res, () => {});

        expect(res.ended).toBe(true);
        expect(res.headers['Content-Type']).toContain('javascript');
    });

    it('bloquea path traversal en HMR re-import (?t=)', async () => {
        const middleware = createRequestMiddleware(
            relativeHrmPath,
            projectRoot,
            false,
        );
        const req = {
            method: 'GET',
            url: '/../../../../secret/hosts.js?t=1',
        };
        const res = createMockRes();
        let nextCalled = false;

        await middleware(req, res, () => {
            nextCalled = true;
        });

        // Debe rechazarse con 403 (path traversal) y NUNCA exponer el
        // contenido del archivo fuera del projectRoot ni seguir al handler
        // estático con esa misma ruta insegura.
        expect(res.body).not.toContain('super secret contents');
        expect(res.statusCode).toBe(403);
        expect(nextCalled).toBe(false);
    });

    it('llama a next() para requests que no matchean ningún handler especial', async () => {
        const middleware = createRequestMiddleware(
            relativeHrmPath,
            projectRoot,
            false,
        );
        const req = { method: 'GET', url: '/index.html' };
        const res = createMockRes();
        let nextCalled = false;

        await middleware(req, res, () => {
            nextCalled = true;
        });

        expect(nextCalled).toBe(true);
        expect(res.ended).toBe(false);
    });
});
