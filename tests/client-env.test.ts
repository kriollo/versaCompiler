import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyClientEnv } from '../src/compiler/client-env';

describe('applyClientEnv - import.meta.env y define', () => {
    const originalCwd = process.cwd();
    // No reasignar process.env: client-env guarda la referencia original
    const keys = ['MODE', 'DEFINE', 'isPROD'] as const;
    const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
    let dir: string;

    beforeEach(() => {
        dir = mkdtempSync(path.join(tmpdir(), 'versa-env-'));
        process.chdir(dir);
        delete process.env.MODE;
        delete process.env.DEFINE;
        process.env.isPROD = 'false';
    });

    afterEach(() => {
        process.chdir(originalCwd);
        rmSync(dir, { recursive: true, force: true });
        for (const k of keys) {
            if (saved[k] === undefined) delete process.env[k];
            else process.env[k] = saved[k];
        }
    });

    it('sustituye VERSA_* de .env y .env.<mode>, con MODE/PROD/DEV', () => {
        writeFileSync('.env', 'VERSA_API=http://dev\nSECRET=no\n');
        writeFileSync('.env.production', 'VERSA_API=https://prod\n');
        process.env.isPROD = 'true';
        const out = applyClientEnv(
            'const a = import.meta.env.VERSA_API, b = import.meta.env.SECRET, c = import.meta.env.MODE, d = import.meta.env.PROD;',
        );
        expect(out).toBe(
            'const a = "https://prod", b = undefined, c = "production", d = true;',
        );
    });

    it('import.meta.env sin propiedad se vuelve un objeto sin variables privadas', () => {
        writeFileSync('.env', 'VERSA_X=1\nSECRET=no\n');
        const out = applyClientEnv('const e = import.meta.env;');
        expect(out).toBe(
            'const e = {"VERSA_X":"1","MODE":"development","PROD":false,"DEV":true};',
        );
    });

    it('no toca strings ni comentarios', () => {
        const code = `const s = "import.meta.env.VERSA_X"; // import.meta.env`;
        expect(applyClientEnv(code)).toBe(code);
    });

    it('aplica define a identificadores y claves con punto, no a propiedades', () => {
        process.env.DEFINE = JSON.stringify({
            __VERSION__: '"1.2.0"',
            'process.env.NODE_ENV': '"production"',
        });
        const out = applyClientEnv(
            'const v = __VERSION__, o = obj.__VERSION__, n = process.env.NODE_ENV;',
        );
        expect(out).toBe(
            'const v = "1.2.0", o = obj.__VERSION__, n = "production";',
        );
    });
});

describe('applyClientEnv - define no rompe declaraciones ni claves', () => {
    const saved = process.env.DEFINE;
    afterEach(() => {
        if (saved === undefined) delete process.env.DEFINE;
        else process.env.DEFINE = saved;
    });

    it('solo reemplaza usos, no declaraciones, claves, imports ni asignaciones', () => {
        process.env.DEFINE = JSON.stringify({
            __V__: '"1.2.3"',
            'process.env.NODE_ENV': '"production"',
        });
        const code = [
            "import { __V__ as v } from './x.js';",
            "const __V__ = 'local';",
            'const o = { __V__: 1, __V__, [__V__]: 2 };',
            'function f(__V__) { return __V__; }',
            "process.env.NODE_ENV = 'x';",
            'const n = process.env.NODE_ENV;',
        ].join('\n');
        expect(applyClientEnv(code)).toBe(
            [
                "import { __V__ as v } from './x.js';",
                "const __V__ = 'local';",
                'const o = { __V__: 1, __V__: "1.2.3", ["1.2.3"]: 2 };',
                'function f(__V__) { return "1.2.3"; }',
                "process.env.NODE_ENV = 'x';",
                'const n = "production";',
            ].join('\n'),
        );
    });
});
