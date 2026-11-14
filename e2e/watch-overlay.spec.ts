import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

// Único e2e sobre `--watch` real (browser-sync + socket HMR): un error de
// compilación debe verse en el overlay del navegador y desaparecer al
// corregirlo. Cubre también que el socket HMR conecte aunque el cliente de
// BrowserSync no esté listo en el primer intento.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test.describe('--watch: overlay de errores de compilación', () => {
    test.setTimeout(90_000);

    let dir: string;
    let watch: ChildProcess;
    let url: string;

    // oxlint-disable-next-line no-empty-pattern -- firma requerida por Playwright para llegar a testInfo
    test.beforeAll(async ({}, testInfo) => {
        // Un solo navegador basta: lo que se prueba es el servidor de --watch
        test.skip(testInfo.project.name !== 'Desktop Chrome');
        testInfo.setTimeout(90_000);
        dir = mkdtempSync(path.join(tmpdir(), 'versa-watch-'));
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
            path.join(dir, 'index.html'),
            '<!doctype html><html><body><script type="module" src="/dist/main.js"></script></body></html>\n',
        );
        writeFileSync(
            path.join(dir, 'src', 'main.ts'),
            'export const v: number = 1;\n(window as any).__v = v;\n',
        );

        const cli = [
            path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
            path.join(root, 'src', 'main.ts'),
        ];
        // --watch no compila al arrancar: build inicial para tener dist/main.js
        execFileSync(process.execPath, [...cli, '--all', '-y'], { cwd: dir });
        watch = spawn(process.execPath, [...cli, '--watch', '-y'], {
            cwd: dir,
            env: { ...process.env, NODE_ENV: 'development' },
        });
        url = await new Promise<string>((resolve, reject) => {
            let out = '';
            const timer = setTimeout(
                () => reject(new Error(`--watch no arrancó:\n${out}`)),
                45_000,
            );
            watch.stdout!.on('data', chunk => {
                out += chunk;
                // browser-sync colorea la URL: quitar códigos ANSI antes de buscarla
                // oxlint-disable-next-line no-control-regex -- quitar códigos ANSI es justo la intención
                const plain = out.replace(/\u001b\[[0-9;]*m/g, '');
                const match = /Local: (http:\/\/localhost:\d+)/.exec(plain);
                if (match) {
                    clearTimeout(timer);
                    resolve(match[1]!);
                }
            });
        });
    });

    test.afterAll(() => {
        watch?.kill();
        if (dir) rmSync(dir, { recursive: true, force: true });
    });

    test('muestra el error y lo oculta al corregir el archivo', async ({
        page,
    }) => {
        await page.goto(`${url}/`);
        await page.waitForFunction(() => (window as any).__v === 1);
        await page.waitForFunction(
            () => (window as any).___browserSync___?.socket?.connected,
            null,
            { timeout: 30_000 },
        );
        // initHRM registra sus listeners tras conectar el socket
        await page.waitForTimeout(3_000);

        writeFileSync(
            path.join(dir, 'src', 'main.ts'),
            'export const v: number = ;\n',
        );
        const overlay = page.locator('#versa-hmr-error-overlay');
        await expect(overlay).toContainText('Error de compilación', {
            timeout: 20_000,
        });

        writeFileSync(
            path.join(dir, 'src', 'main.ts'),
            'export const v: number = 2;\n(window as any).__v = v;\n',
        );
        await expect(overlay).toHaveCount(0, { timeout: 20_000 });
    });
});
