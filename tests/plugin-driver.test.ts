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
