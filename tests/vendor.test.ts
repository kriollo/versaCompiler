import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
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

    it('vuelve a copiar si outDir se borró entre dos builds', async () => {
        const pkg = path.join(dir, 'node_modules', 'lib');
        mkdirSync(pkg, { recursive: true });
        writeFileSync(path.join(pkg, 'index.js'), 'export const a = 1;\n');
        const out = path.join(dir, 'dist', 'vendor', 'lib', 'index.js');

        await copyVendorFile('/node_modules/lib/index.js');
        rmSync(path.join(dir, 'dist'), { recursive: true });
        await copyVendorFile('/node_modules/lib/index.js');
        expect(existsSync(out)).toBe(true);
    });

    it('reescribe los imports bare dentro del archivo copiado hacia vendor', async () => {
        for (const name of ['router', 'core']) {
            mkdirSync(path.join(dir, 'node_modules', name), {
                recursive: true,
            });
        }
        writeFileSync(
            path.join(dir, 'node_modules', 'router', 'index.js'),
            "import { ref } from 'core';\nexport { ref };\n",
        );
        writeFileSync(
            path.join(dir, 'node_modules', 'core', 'index.js'),
            'export const ref = 1;\n',
        );

        await copyVendorFile('/node_modules/router/index.js', async spec =>
            spec === 'core' ? '/node_modules/core/index.js' : null,
        );

        const router = readFileSync(
            path.join(dir, 'dist', 'vendor', 'router', 'index.js'),
            'utf8',
        );
        expect(router).toContain('from "/dist/vendor/core/index.js"');
        expect(
            existsSync(path.join(dir, 'dist', 'vendor', 'core', 'index.js')),
        ).toBe(true);
    });

    it('usa / en la URL aunque outDir venga con barras de Windows', () => {
        process.env.PATH_DIST = '.\\public\\js';
        expect(toVendorUrl('/node_modules/vue/x.js')).toBe(
            '/public/js/vendor/vue/x.js',
        );
    });
});
