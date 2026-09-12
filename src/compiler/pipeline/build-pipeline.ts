import { stat } from 'node:fs/promises';
import path from 'node:path';
import { cwd } from 'node:process';

import { parser } from '../parser';
import { getParsedPathAlias } from '../transforms';

import { ModuleGraph } from './module-graph';
import { PluginDriver } from './plugin-driver';
import type {
    HotUpdateArgs,
    HotUpdateResult,
    Plugin,
    StructuredError,
    TransformResult,
} from './types';

export type PipelineResult = {
    code: string;
    loader: 'js' | 'ts' | 'vue' | 'json' | 'css' | 'text';
    meta?: Record<string, unknown>;
    dependencies: string[];
    errors: string[];
    diagnostics?: StructuredError[];
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

// Resuelve un specifier con alias (ej. "@/utils/foo") a su path de origen
// bajo la raíz del proyecto, usando pathsAlias (env.PATH_ALIAS, cacheado por
// transforms.ts). Distinto de getOptimizedAliasPath/resolveModuleRequest en
// transforms.ts, que resuelven hacia el path de OUTPUT (dist) para reescribir
// imports en el código compilado; aquí necesitamos el archivo FUENTE para el
// grafo de dependencias (cascade invalidation / HMR).
function resolveAliasedImport(specifier: string): string | null {
    const pathAlias = getParsedPathAlias() as Record<
        string,
        string[]
    > | null;
    if (!pathAlias) return null;

    for (const [alias, targets] of Object.entries(pathAlias)) {
        const aliasPattern = alias.replace('*', '');
        if (!specifier.startsWith(aliasPattern)) continue;
        const target = Array.isArray(targets) ? targets[0] : undefined;
        if (!target) continue;
        const relativePath = specifier.slice(aliasPattern.length);
        return path.resolve(cwd(), target.replace(/^\.[/\\]/, ''), relativePath);
    }
    return null;
}

async function resolveLocalImport(
    importer: string,
    specifier: string,
): Promise<string | null> {
    let base: string;
    if (specifier.startsWith('/')) {
        base = path.normalize(specifier);
    } else if (specifier.startsWith('.')) {
        base = path.resolve(path.dirname(importer), specifier);
    } else {
        const aliased = resolveAliasedImport(specifier);
        if (!aliased) return null;
        base = aliased;
    }

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
                diagnostics: loaded.diagnostics,
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

        const diagnostics = (loaded.diagnostics || []).concat(
            transformResult.diagnostics || [],
        );
        const errors = loadErrors.concat(transformErrors);

        // Si ya hay errores de transformación, finalCode puede ser
        // vacío/inválido: evitar parsear/resolver dependencias sobre código
        // roto, que solo generaría errores secundarios confusos.
        if (transformErrors.length > 0) {
            await this.driver.end(errors);
            return {
                code: finalCode,
                loader: finalLoader,
                meta: transformResult.meta || loaded.meta,
                dependencies: [],
                errors,
                diagnostics,
            };
        }

        const ast = await parser(entryPath, finalCode, getAstType(finalLoader));
        const requests = collectModuleRequests(ast);
        const resolvedDeps: string[] = [];
        for (const request of requests) {
            const resolvedDep = await resolveLocalImport(entryPath, request);
            if (resolvedDep) resolvedDeps.push(resolvedDep);
        }

        this.graph.updateImports(entryPath, resolvedDeps);

        await this.driver.end(errors);

        return {
            code: finalCode,
            loader: finalLoader,
            meta: transformResult.meta || loaded.meta,
            dependencies: resolvedDeps,
            errors,
            diagnostics,
        };
    }
}
