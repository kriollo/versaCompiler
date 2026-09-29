import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compileFile } from '../src/compiler/compile';
import { resetModuleResolutionOptimizer } from '../src/compiler/module-resolution-optimizer';

describe('compileFile - re-exports en el pipeline completo', () => {
    const originalEnv = { ...process.env };
    let workDir: string;

    beforeEach(async () => {
        resetModuleResolutionOptimizer();
        workDir = await mkdtemp(join(tmpdir(), 'versa-reexports-'));
        process.env.PATH_ALIAS = JSON.stringify({ '@/*': ['src'] });
        process.env.PATH_DIST = join(workDir, 'out');
        process.env.VERBOSE = 'false';
    });

    afterEach(async () => {
        resetModuleResolutionOptimizer();
        process.env = { ...originalEnv };
        await rm(workDir, { recursive: true, force: true });
    });

    it('resuelve re-exports estáticos y elimina los exports de tipos', async () => {
        const file = join(workDir, 'theme.ts');
        await writeFile(
            file,
            [
                `import { composite } from '@/js/colorMath';`,
                `export { readableTextOn } from '@/js/colorMath';`,
                `export * from './local';`,
                `export type { Rgb } from '@/js/colorMath';`,
                `export const color = composite;`,
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
        expect(compiled).not.toMatch(/from ["']@\//);
        expect(compiled).not.toMatch(/\/src\/js\/colorMath/);
        expect(compiled).not.toContain('Rgb');
    });
});
