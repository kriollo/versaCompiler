import { existsSync } from 'node:fs';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    cleanOutputDir,
    getAction,
    isAdditionalWatchFile,
} from '../src/servicios/file-watcher';

// A diferencia de la versión anterior de este archivo (que no importaba nada
// de src/servicios/file-watcher.ts y solo hacía smoke tests genéricos de
// fs/path), este test ejercita cleanOutputDir(), getAction() e
// isAdditionalWatchFile() reales (las dos últimas se exportaron para esto,
// eran internas). WatchDebouncer queda fuera: está fuertemente acoplado al
// pipeline de compilación real (initCompile, getPipelineModuleGraph,
// emitirCambios, etc.) y testearlo de forma significativa requeriría mockear
// todo ese pipeline — es un esfuerzo de test aparte, no housekeeping.
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

describe('file-watcher - getAction', () => {
    const extensionWatch = [
        { ext: 'js', action: 'compileFile' },
        { ext: 'ts', action: 'compileFile' },
        { ext: 'vue', action: 'compileFile' },
        { ext: 'css', action: 'reloadCss' },
    ];

    it('devuelve la acción configurada para la extensión del archivo', () => {
        expect(getAction('foo.ts', extensionWatch)).toBe('compileFile');
        expect(getAction('styles/main.css', extensionWatch)).toBe(
            'reloadCss',
        );
    });

    it('devuelve "reloadFull" para una extensión sin acción configurada', () => {
        expect(getAction('image.png', extensionWatch)).toBe('reloadFull');
    });

    it('devuelve "reloadFull" para un archivo sin extensión', () => {
        expect(getAction('Makefile', extensionWatch)).toBe('reloadFull');
    });

    it('usa la última extensión en archivos con varios puntos', () => {
        expect(getAction('component.test.ts', extensionWatch)).toBe(
            'compileFile',
        );
    });
});

describe('file-watcher - isAdditionalWatchFile', () => {
    it('devuelve false cuando no hay patrones adicionales configurados', () => {
        expect(isAdditionalWatchFile('templates/foo.twig', [])).toBe(false);
    });

    it('matchea un glob simple de patrones adicionales', () => {
        const patterns = ['./app/templates/**/*.twig'];
        expect(
            isAdditionalWatchFile(
                './app/templates/nested/foo.twig',
                patterns,
            ),
        ).toBe(true);
    });

    it('no matchea un archivo que no cumple ningún patrón', () => {
        const patterns = ['./app/templates/**/*.twig'];
        expect(isAdditionalWatchFile('./src/index.ts', patterns)).toBe(
            false,
        );
    });

    it('matchea con múltiples patrones configurados', () => {
        const patterns = ['./app/templates/**/*.twig', './locales/**/*.json'];
        expect(
            isAdditionalWatchFile('./locales/en/common.json', patterns),
        ).toBe(true);
    });
});
