import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compileFile } from '../src/compiler/compile';
import { resetModuleResolutionOptimizer } from '../src/compiler/module-resolution-optimizer';
import { estandarizaCode } from '../src/compiler/transforms';

const ALIAS_VITE_STYLE = JSON.stringify({ '@/*': ['src'], 'P@/*': ['public'] });

describe('estandarizaCode - re-exports: casos adicionales', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        resetModuleResolutionOptimizer();
        process.env.PATH_ALIAS = ALIAS_VITE_STYLE;
        process.env.PATH_DIST = 'dist';
        process.env.VERBOSE = 'false';
    });

    afterEach(() => {
        resetModuleResolutionOptimizer();
        process.env = { ...originalEnv };
    });

    it('dos sentencias de re-export del mismo módulo se resuelven ambas (posiciones distintas)', async () => {
        const code = `export { a } from '@/js/m';\nexport { b } from '@/js/m';`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(
            `export { a } from '/dist/js/m.js';\nexport { b } from '/dist/js/m.js';`,
        );
    });

    it('`export *` y `export { x }` del mismo módulo en el mismo archivo', async () => {
        const code = `export * from '@/js/m';\nexport { default as M } from '@/js/m';`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(
            `export * from '/dist/js/m.js';\nexport { default as M } from '/dist/js/m.js';`,
        );
    });

    it('re-export con comillas dobles conserva el tipo de comilla', async () => {
        const code = `export { a } from "@/js/m";`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(`export { a } from "/dist/js/m.js";`);
    });

    it('re-export que ya trae extensión .js no la duplica', async () => {
        const code = `export { a } from '@/js/m.js';`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(`export { a } from '/dist/js/m.js';`);
    });

    it('re-export de un .ts se reescribe a .js', async () => {
        const code = `export { a } from '@/js/m.ts';`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(`export { a } from '/dist/js/m.js';`);
    });

    it('re-export de ruta absoluta no se toca', async () => {
        const code = `export { a } from '/public/vendor/lib.js';`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(code);
    });

    it('con alias estilo tsconfig (`/src/*`) el resultado es el mismo', async () => {
        process.env.PATH_ALIAS = JSON.stringify({ '@/*': ['/src/*'] });
        const code = `export { a } from '@/js/m';`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(`export { a } from '/dist/js/m.js';`);
    });
});

describe('compileFile - re-exports en el pipeline completo', () => {
    const originalEnv = { ...process.env };
    const workDir = join(process.cwd(), 'temp', 'reexport-integration');
    const outDir = join(workDir, 'out');

    beforeEach(async () => {
        resetModuleResolutionOptimizer();
        process.env = { ...originalEnv };
        process.env.PATH_ALIAS = ALIAS_VITE_STYLE;
        process.env.PATH_DIST = outDir;
        process.env.VERBOSE = 'false';
        if (!existsSync(workDir)) {
            await mkdir(workDir, { recursive: true });
        }
    });

    afterEach(async () => {
        resetModuleResolutionOptimizer();
        process.env = { ...originalEnv };
        await rm(workDir, { recursive: true, force: true });
    });

    it('un .ts con re-exports compila a rutas navegables y elimina el `export type`', async () => {
        const file = join(workDir, 'theme.ts');
        await writeFile(
            file,
            [
                `import { composite } from '@/js/colorMath';`,
                `export { readableTextOn } from '@/js/colorMath';`,
                `export * from './local';`,
                `export type { Rgb } from '@/js/colorMath';`,
                `export const c = composite;`,
            ].join('\n'),
            'utf-8',
        );

        const result = await compileFile(file);
        expect(result.success).toBe(true);
        expect(result.output).toBeTruthy();
        const compiled = await readFile(result.output as string, 'utf-8');

        expect(compiled).toMatch(
            /export \{ readableTextOn \} from ["'][^"']*\/js\/colorMath\.js["']/,
        );
        expect(compiled).toMatch(/export \* from ["']\.\/local\.js["']/);
        // Ninguna ruta de alias sin resolver ni con el target antepuesto (/src/) debe llegar al navegador
        expect(compiled).not.toMatch(/from ["']@\//);
        expect(compiled).not.toMatch(/\/src\/js\/colorMath/);
        // El TS transform (core-ts) corre antes que core-transforms: el re-export de tipos desaparece
        expect(compiled).not.toContain('Rgb');
    });
});
