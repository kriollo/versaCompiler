import { stat } from 'node:fs/promises';
import path from 'node:path';

import { parser } from '../parser';

import { ModuleGraph } from './module-graph';
import { PluginDriver } from './plugin-driver';
import type {
    HotUpdateArgs,
    HotUpdateResult,
    Plugin,
    TransformResult,
} from './types';

export type PipelineResult = {
    code: string;
    loader: 'js' | 'ts' | 'vue' | 'json' | 'css' | 'text';
    meta?: Record<string, unknown>;
    dependencies: string[];
    errors: string[];
};

function guessLoader(filePath: string) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.vue') return 'vue' as const;
    if (ext === '.ts') return 'ts' as const;
    if (ext === '.json') return 'json' as const;
    if (ext === '.css') return 'css' as const;
    return 'js' as const;
}

function getAstType(loader: string) {
    return loader === 'ts' ? 'ts' : 'js';
}

function collectModuleRequests(ast: any): string[] {
    const requests: string[] = [];
    const staticImports = ast?.module?.staticImports || [];
    for (const item of staticImports) {
        const value = item?.moduleRequest?.value;
        if (typeof value === 'string') requests.push(value);
    }
    const dynamicImports = ast?.module?.dynamicImports || [];
    for (const item of dynamicImports) {
        const value = item?.moduleRequest?.value;
        if (typeof value === 'string') requests.push(value);
    }
    return requests;
}

async function resolveLocalImport(
    importer: string,
    specifier: string,
): Promise<string | null> {
    if (!specifier.startsWith('.') && !specifier.startsWith('/')) return null;

    const base = specifier.startsWith('/')
        ? path.normalize(specifier)
        : path.resolve(path.dirname(importer), specifier);

    const ext = path.extname(base);
    if (ext) return base;

    const candidates = [
        `${base}.ts`,
        `${base}.js`,
        `${base}.vue`,
        `${base}.mjs`,
        `${base}.cjs`,
        `${base}.json`,
        path.join(base, 'index.ts'),
        path.join(base, 'index.js'),
        path.join(base, 'index.vue'),
    ];

    for (const candidate of candidates) {
        try {
            await stat(candidate);
            return candidate;
        } catch {
            continue;
        }
    }

    return base;
}

export class BuildPipeline {
    private driver: PluginDriver;
    private graph: ModuleGraph;

    constructor(plugins: Plugin[]) {
        this.driver = new PluginDriver(plugins);
        this.graph = new ModuleGraph();
    }

    getModuleGraph(): ModuleGraph {
        return this.graph;
    }

    async hotUpdate(args: HotUpdateArgs): Promise<HotUpdateResult> {
        return this.driver.hotUpdate(args);
    }

    async compileFile(filePath: string): Promise<PipelineResult> {
        const resolved = await this.driver.resolve({
            path: filePath,
            kind: 'entry',
        });
        const entryPath = resolved.path || filePath;

        const loaded = await this.driver.load({ path: entryPath });
        const loadErrors = loaded.errors || [];
        if (!loaded.contents) {
            await this.driver.end(loadErrors);
            return {
                code: '',
                loader: guessLoader(entryPath),
                dependencies: [],
                errors: loadErrors,
            };
        }

        const transformResult: TransformResult = await this.driver.transform({
            path: entryPath,
            contents: loaded.contents,
            loader: loaded.loader || guessLoader(entryPath),
            meta: loaded.meta,
        });

        const transformErrors = transformResult.errors || [];
        const finalCode = transformResult.contents || '';
        const finalLoader =
            transformResult.loader || loaded.loader || guessLoader(entryPath);

        const ast = await parser(entryPath, finalCode, getAstType(finalLoader));
        const requests = collectModuleRequests(ast);
        const resolvedDeps: string[] = [];
        for (const request of requests) {
            const resolvedDep = await resolveLocalImport(entryPath, request);
            if (resolvedDep) resolvedDeps.push(resolvedDep);
        }

        this.graph.updateImports(entryPath, resolvedDeps);

        const errors = loadErrors.concat(transformErrors);
        await this.driver.end(errors);

        return {
            code: finalCode,
            loader: finalLoader,
            meta: transformResult.meta || loaded.meta,
            dependencies: resolvedDeps,
            errors,
        };
    }
}
