import { describe, expect, it } from 'vitest';
import { PluginDriver } from '../src/compiler/pipeline/plugin-driver';
import type { Plugin } from '../src/compiler/pipeline/types';

describe('PluginDriver.transform', () => {
    it('un plugin que produce un output vacío legítimo ("") se respeta, no se descarta', async () => {
        const emptyOutputPlugin: Plugin = {
            name: 'strips-everything',
            onTransform: async () => ({ contents: '' }),
        };
        const driver = new PluginDriver([emptyOutputPlugin]);

        const result = await driver.transform({
            path: 'ambient.ts',
            contents: 'declare const x: number;',
            loader: 'ts',
        });

        expect(result.contents).toBe('');
    });

    it('un plugin que no toca el contenido (sin contents) preserva el de la etapa anterior', async () => {
        const passthroughPlugin: Plugin = {
            name: 'no-op',
            onTransform: async () => ({}),
        };
        const driver = new PluginDriver([passthroughPlugin]);

        const result = await driver.transform({
            path: 'file.js',
            contents: 'const x = 1;',
            loader: 'js',
        });

        expect(result.contents).toBe('const x = 1;');
    });

    it('una etapa vacía legítima seguida de otra etapa "sin cambios" mantiene el vacío (no resucita contenido stale)', async () => {
        const emptyOutputPlugin: Plugin = {
            name: 'strips-everything',
            onTransform: async () => ({ contents: '' }),
        };
        const noopPlugin: Plugin = {
            name: 'no-op',
            onTransform: async () => ({}),
        };
        const driver = new PluginDriver([emptyOutputPlugin, noopPlugin]);

        const result = await driver.transform({
            path: 'ambient.ts',
            contents: 'declare const x: number;',
            loader: 'ts',
        });

        expect(result.contents).toBe('');
    });
});

describe('PluginDriver.transform: fail-fast', () => {
    const llamadas: string[] = [];
    const etapa = (
        nombre: string,
        resultado: Awaited<ReturnType<NonNullable<Plugin['onTransform']>>>,
    ): Plugin => ({
        name: nombre,
        onTransform: async () => {
            llamadas.push(nombre);
            return resultado;
        },
    });

    it('una etapa con errores corta la cadena: las siguientes no corren y queda el último contenido bueno', async () => {
        llamadas.length = 0;
        const driver = new PluginDriver([
            etapa('a', { contents: 'paso-a' }),
            etapa('b', {
                errors: ['b: falló'],
                diagnostics: [
                    {
                        stage: 'b',
                        message: 'falló',
                        severity: 'error',
                    } as never,
                ],
            }),
            etapa('c', { contents: 'no-debe-correr' }),
        ]);

        const result = await driver.transform({
            path: 'x.ts',
            contents: 'origen',
            loader: 'ts',
        });

        expect(llamadas).toEqual(['a', 'b']);
        expect(result.contents).toBe('paso-a');
        expect(result.errors).toEqual(['b: falló']);
        expect(result.diagnostics).toHaveLength(1);
    });

    it('una etapa con solo diagnostics (avisos, sin errors) no corta la cadena', async () => {
        llamadas.length = 0;
        const driver = new PluginDriver([
            etapa('a', {
                contents: 'a',
                diagnostics: [
                    {
                        stage: 'a',
                        message: 'aviso',
                        severity: 'warning',
                    } as never,
                ],
            }),
            etapa('b', { contents: 'b' }),
        ]);

        const result = await driver.transform({
            path: 'x.js',
            contents: 'origen',
            loader: 'js',
        });

        expect(llamadas).toEqual(['a', 'b']);
        expect(result.contents).toBe('b');
        expect(result.errors).toBeUndefined();
        expect(result.diagnostics).toHaveLength(1);
    });

    it('errors vacío ([]) no cuenta como error', async () => {
        llamadas.length = 0;
        const driver = new PluginDriver([
            etapa('a', { contents: 'a', errors: [] }),
            etapa('b', { contents: 'b' }),
        ]);

        const result = await driver.transform({
            path: 'x.js',
            contents: 'origen',
            loader: 'js',
        });

        expect(llamadas).toEqual(['a', 'b']);
        expect(result.errors).toBeUndefined();
    });
});
