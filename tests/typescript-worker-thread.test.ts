import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// El worker es un .cjs sin tipos; require() directo (fuera de un worker
// thread real) solo instancia las clases, no arranca el listener de
// parentPort (queda en null fuera de un worker).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { WorkerTypeScriptLanguageServiceHost } = require('../src/compiler/typescript-worker-thread.cjs');

describe('WorkerTypeScriptLanguageServiceHost - cache de versiones de dependencias', () => {
    let dir: string;
    let depFile: string;

    beforeEach(() => {
        dir = mkdtempSync(path.join(tmpdir(), 'versa-ts-worker-'));
        depFile = path.join(dir, 'dep.ts');
        writeFileSync(depFile, 'export const a = 1;\n');
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    it('mantiene la misma versión si el archivo no cambió (permite reutilizar el SourceFile parseado)', () => {
        const host = new WorkerTypeScriptLanguageServiceHost({});
        const v1 = host.getScriptVersion(depFile);
        const v2 = host.getScriptVersion(depFile);
        expect(v2).toBe(v1);
    });

    it('bump de versión cuando el archivo cambia en disco (corrige el bug de datos obsoletos)', async () => {
        const host = new WorkerTypeScriptLanguageServiceHost({});
        const v1 = host.getScriptVersion(depFile);

        // Forzar un mtime distinto y contenido distinto.
        await new Promise(r => setTimeout(r, 10));
        writeFileSync(depFile, 'export const a = 2;\n');

        const v2 = host.getScriptVersion(depFile);
        expect(v2).not.toBe(v1);
    });

    it('un archivo inexistente no revienta y devuelve una versión estable', () => {
        const host = new WorkerTypeScriptLanguageServiceHost({});
        const missing = path.join(dir, 'no-existe.ts');
        expect(() => host.getScriptVersion(missing)).not.toThrow();
        expect(host.getScriptVersion(missing)).toBe(
            host.getScriptVersion(missing),
        );
    });

    it('los archivos root (this.files) no usan el cache de dependencias y no aparecen ahí', () => {
        const host = new WorkerTypeScriptLanguageServiceHost({});
        host.addFile('entry.ts', 'const x = 1;');
        expect(host.getScriptVersion('entry.ts')).toBe('1');
        expect(host.depVersions.has('entry.ts')).toBe(false);
    });
});
