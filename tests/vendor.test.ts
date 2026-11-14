import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    copyVendorFile,
    isVendorEnabled,
    resetVendorCache,
    toVendorUrl,
} from '../src/compiler/vendor';

describe('vendor - salida de producción sin node_modules', () => {
    const originalCwd = process.cwd();
    const keys = ['isPROD', 'VENDOR', 'PATH_DIST'] as const;
    const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
    let dir: string;

    beforeEach(() => {
        dir = mkdtempSync(path.join(tmpdir(), 'versa-vendor-'));
        process.chdir(dir);
        resetVendorCache();
        process.env.isPROD = 'true';
        process.env.VENDOR = 'true';
        process.env.PATH_DIST = './dist';
    });

    afterEach(() => {
        process.chdir(originalCwd);
        rmSync(dir, { recursive: true, force: true });
        for (const k of keys) {
            if (saved[k] === undefined) delete process.env[k];
            else process.env[k] = saved[k];
        }
    });

    it('solo se activa en --prod y si vendor no es false', () => {
        expect(isVendorEnabled()).toBe(true);
        process.env.VENDOR = 'false';
        expect(isVendorEnabled()).toBe(false);
        process.env.VENDOR = 'true';
        process.env.isPROD = 'false';
        expect(isVendorEnabled()).toBe(false);
    });

    it('reescribe /node_modules/... a /<outDir>/vendor/...', () => {
        expect(toVendorUrl('/node_modules/vue/dist/vue.js')).toBe(
            '/dist/vendor/vue/dist/vue.js',
        );
        expect(toVendorUrl('/src/a.js')).toBeNull();
    });

    it('copia el archivo y sus imports relativos, con la misma estructura', async () => {
        const pkg = path.join(dir, 'node_modules', 'lib', 'esm');
        mkdirSync(path.join(pkg, 'util'), { recursive: true });
        writeFileSync(
            path.join(pkg, 'index.js'),
            "import { a } from './util/a.js';\nexport * from './b.js';\nexport const lazy = () => import('./c.js');\nimport 'otro-paquete';\n",
        );
        writeFileSync(path.join(pkg, 'util', 'a.js'), 'export const a = 1;\n');
        writeFileSync(path.join(pkg, 'b.js'), 'export const b = 2;\n');
        writeFileSync(path.join(pkg, 'c.js'), 'export default 3;\n');

        await copyVendorFile('/node_modules/lib/esm/index.js');

        const out = path.join(dir, 'dist', 'vendor', 'lib', 'esm');
        for (const f of ['index.js', 'util/a.js', 'b.js', 'c.js']) {
            expect(existsSync(path.join(out, f))).toBe(true);
        }
    });
});
