import { existsSync } from 'node:fs';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { cleanOutputDir } from '../src/servicios/file-watcher';

// A diferencia de la versión anterior de este archivo (que no importaba nada
// de src/servicios/file-watcher.ts y solo hacía smoke tests genéricos de
// fs/path), este test ejercita cleanOutputDir() real. isAdditionalWatchFile,
// getAction y WatchDebouncer no están exportados de file-watcher.ts, así que
// no son testeables como unidades sin exportarlos primero — queda pendiente
// como cobertura nueva (no cabe en este housekeeping de alinear tests).
describe('file-watcher - cleanOutputDir', () => {
    const testDir = join(process.cwd(), 'temp', 'file-watcher-test');

    beforeEach(async () => {
        await mkdir(join(testDir, 'subdir'), { recursive: true });
        await writeFile(join(testDir, 'file.js'), 'console.log(1);', 'utf-8');
        await writeFile(
            join(testDir, 'subdir', 'nested.js'),
            'console.log(2);',
            'utf-8',
        );
    });

    afterEach(async () => {
        await rm(testDir, { recursive: true, force: true });
    });

    it('elimina archivos y subdirectorios dentro del directorio de salida', async () => {
        await cleanOutputDir(testDir, false);

        expect(existsSync(testDir)).toBe(true); // el directorio en sí se conserva
        const remaining = await readdir(testDir);
        expect(remaining).toEqual([]);
    });

    it('no lanza si el directorio de salida no existe', async () => {
        const missingDir = join(process.cwd(), 'temp', 'does-not-exist-xyz');
        await expect(cleanOutputDir(missingDir, true)).resolves.not.toThrow();
    });

    it('con primerInteraccion=false no pide confirmación aunque env.yes sea "false"', async () => {
        const originalYes = process.env.yes;
        process.env.yes = 'false';
        try {
            await cleanOutputDir(testDir, false);
            const remaining = await readdir(testDir);
            expect(remaining).toEqual([]);
        } finally {
            if (originalYes === undefined) delete process.env.yes;
            else process.env.yes = originalYes;
        }
    });
});
