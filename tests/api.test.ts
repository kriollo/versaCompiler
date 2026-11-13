import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { build, compile } from '../src/index';

// API programática sobre un proyecto temporal (cada archivo de test corre en
// su propio worker, así que chdir y process.env no se filtran a otros tests).
describe('API programática (build / compile)', () => {
    const originalCwd = process.cwd();
    let dir: string;

    beforeAll(() => {
        dir = mkdtempSync(path.join(tmpdir(), 'versa-api-'));
        mkdirSync(path.join(dir, 'src'));
        writeFileSync(
            path.join(dir, 'versacompile.config.ts'),
            "export default { compilerOptions: { sourceRoot: './src', outDir: './dist', pathsAlias: {} }, linter: [] };\n",
        );
        writeFileSync(
            path.join(dir, 'tsconfig.json'),
            '{ "compilerOptions": { "strict": true, "module": "esnext", "target": "esnext" } }\n',
        );
        writeFileSync(
            path.join(dir, 'src', 'ok.ts'),
            'export const ok: number = 1;\n',
        );
        process.chdir(dir);
    });

    afterAll(() => {
        process.chdir(originalCwd);
        rmSync(dir, { recursive: true, force: true });
    });

    it('build() compila el proyecto y devuelve true', async () => {
        expect(await build({ prod: true })).toBe(true);
        expect(existsSync(path.join(dir, 'dist', 'ok.js'))).toBe(true);
    });

    it('compile() compila un archivo y devuelve su salida', async () => {
        const result = await compile('src/ok.ts');
        expect(result).toEqual({ success: true, output: 'dist/ok.js' });
    });

    it('build() devuelve false si un archivo no compila', async () => {
        writeFileSync(
            path.join(dir, 'src', 'bad.ts'),
            'export const bad = ;\n',
        );
        expect(await build()).toBe(false);
    });
});
