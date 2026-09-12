import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { env } from 'node:process';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BuildPipeline } from '../src/compiler/pipeline/build-pipeline';
import type { Plugin } from '../src/compiler/pipeline/types';

// Plugin mínimo: onLoad lee el archivo del disco tal cual, onTransform no
// toca nada. Suficiente para ejercitar resolución de dependencias sin pasar
// por Vue/TS reales.
function createPassthroughPlugins(): Plugin[] {
    return [
        {
            name: 'test-load',
            async onLoad(args) {
                const fs = await import('node:fs/promises');
                const contents = await fs.readFile(args.path, 'utf-8');
                return { contents, loader: 'js' };
            },
        },
    ];
}

describe('BuildPipeline - resolución de dependencias con alias', () => {
    let dir: string;
    let originalPathAlias: string | undefined;

    beforeEach(() => {
        dir = mkdtempSync(path.join(tmpdir(), 'versa-build-pipeline-'));
        originalPathAlias = env.PATH_ALIAS;
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
        if (originalPathAlias === undefined) delete env.PATH_ALIAS;
        else env.PATH_ALIAS = originalPathAlias;
    });

    it('resuelve un import con alias (@/*) al path fuente real y lo agrega a dependencies/ModuleGraph', async () => {
        const srcDir = path.join(dir, 'src');
        mkdirSync(srcDir);
        const depFile = path.join(srcDir, 'foo.ts');
        writeFileSync(depFile, 'export const foo = 1;\n');

        const entryFile = path.join(dir, 'entry.ts');
        writeFileSync(
            entryFile,
            "import { foo } from '@/foo';\nexport { foo };\n",
        );

        env.PATH_ALIAS = JSON.stringify({ '@/*': [srcDir] });

        const pipeline = new BuildPipeline(createPassthroughPlugins());
        const result = await pipeline.compileFile(entryFile);

        expect(result.errors).toEqual([]);
        expect(result.dependencies).toContain(depFile);

        const graph = pipeline.getModuleGraph();
        expect(graph.getNode(entryFile)?.imports.has(depFile)).toBe(true);
    });

    it('un import de paquete externo (sin alias configurado) no se agrega a dependencies', async () => {
        const entryFile = path.join(dir, 'entry2.ts');
        writeFileSync(
            entryFile,
            "import { ref } from 'vue';\nexport { ref };\n",
        );
        delete env.PATH_ALIAS;

        const pipeline = new BuildPipeline(createPassthroughPlugins());
        const result = await pipeline.compileFile(entryFile);

        expect(result.errors).toEqual([]);
        expect(result.dependencies).toEqual([]);
    });
});
