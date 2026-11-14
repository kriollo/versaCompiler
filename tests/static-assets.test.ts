import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resetModuleResolutionOptimizer } from '../src/compiler/module-resolution-optimizer';
import { emitStaticAsset, isStaticAsset } from '../src/compiler/static-assets';
import { estandarizaCode } from '../src/compiler/transforms';

describe('static-assets - JSON, CSS e imágenes como módulos', () => {
    let dir: string;

    beforeEach(() => {
        dir = mkdtempSync(path.join(tmpdir(), 'versa-assets-'));
        mkdirSync(path.join(dir, 'src'));
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    const emit = async (name: string, content: string | Buffer) => {
        const src = path.join(dir, 'src', name);
        const out = path.join(dir, 'dist', name);
        writeFileSync(src, content);
        await emitStaticAsset(src, out);
        return out;
    };

    it('detecta extensiones de assets y no las de código', () => {
        expect(isStaticAsset('a/b.json')).toBe(true);
        expect(isStaticAsset('a/b.PNG')).toBe(true);
        expect(isStaticAsset('a/b.ts')).toBe(false);
        expect(isStaticAsset('a/b.vue')).toBe(false);
    });

    it('un .json se importa como export default', async () => {
        const out = await emit('data.json', '{ "name": "x", "n": 1 }');
        const mod = await import(pathToFileURL(`${out}.js`).href);
        expect(mod.default).toEqual({ name: 'x', n: 1 });
    });

    it('un .json inválido falla al compilar, no en el navegador', async () => {
        await expect(emit('bad.json', '{ nope')).rejects.toThrow();
    });

    it('una imagen se copia y su módulo exporta la URL del archivo', async () => {
        const out = await emit('logo.png', Buffer.from([0x89, 0x50]));
        expect(readFileSync(out)).toEqual(Buffer.from([0x89, 0x50]));
        const mod = await import(pathToFileURL(`${out}.js`).href);
        // Windows: pathToFileURL codifica `~` (RUNNER~1) como %7E y new URL no
        expect(decodeURIComponent(mod.default)).toBe(
            decodeURIComponent(pathToFileURL(out).href),
        );
    });

    it('un .css se copia y su módulo exporta la URL (inyecta <link> en el navegador)', async () => {
        const out = await emit('style.css', '.a { color: red; }');
        expect(readFileSync(out, 'utf8')).toBe('.a { color: red; }');
        expect(readFileSync(`${out}.js`, 'utf8')).toContain(
            "link.rel = 'stylesheet'",
        );
        const mod = await import(pathToFileURL(`${out}.js`).href);
        // Windows: pathToFileURL codifica `~` (RUNNER~1) como %7E y new URL no
        expect(decodeURIComponent(mod.default)).toBe(
            decodeURIComponent(pathToFileURL(out).href),
        );
    });
});

describe('transforms - imports de assets', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        resetModuleResolutionOptimizer();
        process.env.PATH_ALIAS = JSON.stringify({ '@/*': ['/src/*'] });
        process.env.PATH_DIST = 'dist';
    });

    afterEach(() => {
        resetModuleResolutionOptimizer();
        process.env.PATH_ALIAS = originalEnv.PATH_ALIAS;
        process.env.PATH_DIST = originalEnv.PATH_DIST;
    });

    it('reescribe .json/.css/imágenes a su módulo .js', async () => {
        const code = `import d from './data.json';\nimport './style.css';\nimport logo from './logo.png';`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toContain(`from './data.json.js'`);
        expect(result.code).toContain(`import './style.css.js'`);
        expect(result.code).toContain(`from './logo.png.js'`);
    });

    it('no toca imports con atributos (with { type }) que ya son nativos', async () => {
        const code = `import d from './data.json' with { type: 'json' };\nconst c = import('./x.css', { with: { type: 'css' } });`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toContain(`from './data.json' with`);
        expect(result.code).toContain(`import('./x.css', {`);
    });

    it('pone el .js antes de ?query y #hash', async () => {
        const code = `import a from './x.css?inline';\nimport b from './logo.svg#icon';`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toContain(`from './x.css.js?inline'`);
        expect(result.code).toContain(`from './logo.svg.js#icon'`);
    });
});
