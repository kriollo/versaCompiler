import { execFile } from 'node:child_process';
import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const run = promisify(execFile);
const root = path.resolve(__dirname, '..');
// cli.mjs vía node (no .bin/tsx) para que funcione también en Windows
const tsxCli = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');

// Ejecuta el CLI real en un proyecto temporal: --all debe salir con 1 si
// algún archivo falla, para que un CI detecte el build roto.
async function compileAll(cwd: string): Promise<number> {
    try {
        await run(
            process.execPath,
            [tsxCli, path.join(root, 'src', 'main.ts'), '--all', '-y'],
            {
                cwd,
                env: { ...process.env, NODE_ENV: 'production' },
            },
        );
        return 0;
    } catch (error: any) {
        return error.code ?? -1;
    }
}

describe('CLI --all - exit code', () => {
    let dir: string;

    beforeEach(() => {
        dir = mkdtempSync(path.join(tmpdir(), 'versa-exit-'));
        mkdirSync(path.join(dir, 'src'));
        writeFileSync(
            path.join(dir, 'versacompile.config.ts'),
            "export default { compilerOptions: { sourceRoot: './src', outDir: './dist', pathsAlias: {} }, linter: [] };\n",
        );
        writeFileSync(
            path.join(dir, 'tsconfig.json'),
            '{ "compilerOptions": { "strict": true, "module": "esnext", "target": "esnext" } }\n',
        );
        writeFileSync(path.join(dir, 'src', 'ok.ts'), 'export const ok = 1;\n');
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    it('sale con 0 cuando todo compila', async () => {
        expect(await compileAll(dir)).toBe(0);
    });

    it('un .ts con solo tipos compila a un módulo vacío (no es un error)', async () => {
        writeFileSync(
            path.join(dir, 'src', 'types.ts'),
            'export interface User { id: number }\nexport type Id = number;\n',
        );
        expect(await compileAll(dir)).toBe(0);
        expect(
            readFileSync(path.join(dir, 'dist', 'types.js'), 'utf8'),
        ).toContain('export {};');
    });

    it('sale con 1 cuando un archivo no compila', async () => {
        writeFileSync(
            path.join(dir, 'src', 'bad.ts'),
            'export const bad = ;\n',
        );
        expect(await compileAll(dir)).toBe(1);
    });
});
