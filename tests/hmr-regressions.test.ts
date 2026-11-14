import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
    invalidateConfigCache,
    preCompileTS,
} from '../src/compiler/typescript-manager';
import { preCompileVue } from '../src/compiler/vuejs';

describe('regresiones HMR 3.0.x', () => {
    const originalCwd = process.cwd();
    let dir: string | undefined;

    afterEach(() => {
        process.chdir(originalCwd);
        invalidateConfigCache();
        if (dir) rmSync(dir, { recursive: true, force: true });
        dir = undefined;
    });

    it('un tsconfig con baseUrl (TS5101) no bloquea la transpilación', async () => {
        dir = mkdtempSync(path.join(tmpdir(), 'versa-ts5101-'));
        writeFileSync(
            path.join(dir, 'tsconfig.json'),
            '{ "compilerOptions": { "baseUrl": ".", "sourceRoot": "/src", "module": "esnext", "target": "esnext" } }\n',
        );
        process.chdir(dir);
        invalidateConfigCache();
        const result = await preCompileTS(
            'export const a: number = 1;\n',
            path.join(dir, 'a.ts'),
        );
        expect(result.error).toBeNull();
        expect(result.data).toContain('export const a = 1');
    });

    it('solo registra en components los imports .vue que usa el template', async () => {
        const sfc = `<script setup lang="ts">
import Editor, { editorKey } from './Editor.vue';
console.log(editorKey);
</script>
<template><Editor /></template>`;
        const { data, error } = await preCompileVue(
            sfc,
            path.join(originalCwd, 'Leaf.vue'),
            false,
        );
        expect(error).toBeNull();
        const components = /components:\s*\{([^}]*)\}/.exec(data!)![1]!;
        expect(components).toContain('Editor');
        expect(components).not.toContain('editorKey');
    });
});
