import path from 'node:path';
import { env } from 'node:process';

import { logger } from '../../servicios/logger';
import { CompileWorkerPool } from '../compile-worker-pool';

import type { Plugin, TransformArgs, TransformResult } from './types';

let preCompileVue: any;
let preCompileTS: any;
let estandarizaCode: any;
let minifyJS: any;
let getCodeFile: any;
let compileWorkerPool: CompileWorkerPool | null = null;

async function loadVue() {
    if (!preCompileVue) {
        const mod = await import('../vuejs');
        preCompileVue = mod.preCompileVue;
    }
    return preCompileVue;
}

async function loadTypeScript() {
    if (!preCompileTS) {
        const mod = await import('../typescript-manager');
        preCompileTS = mod.preCompileTS;
    }
    return preCompileTS;
}

async function loadTransforms() {
    if (!estandarizaCode) {
        const mod = await import('../transforms');
        estandarizaCode = mod.estandarizaCode;
    }
    return estandarizaCode;
}

async function loadMinify() {
    if (!minifyJS) {
        const mod = await import('../minify');
        minifyJS = mod.minifyJS;
    }
    return minifyJS;
}

async function loadParser() {
    if (!getCodeFile) {
        const mod = await import('../parser');
        getCodeFile = mod.getCodeFile;
    }
    return getCodeFile;
}

function getWorkerPool(): CompileWorkerPool {
    if (!compileWorkerPool) {
        compileWorkerPool = CompileWorkerPool.getInstance();
    }
    return compileWorkerPool;
}

function guessLoader(filePath: string) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.vue') return 'vue' as const;
    if (ext === '.ts') return 'ts' as const;
    if (ext === '.json') return 'json' as const;
    if (ext === '.css') return 'css' as const;
    return 'js' as const;
}

function withStageError(stage: string, error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return `${stage}: ${message}`;
}

export function createCorePlugins(): Plugin[] {
    const loadPlugin: Plugin = {
        name: 'core-load',
        async onLoad(args) {
            try {
                const read = await loadParser();
                const result = await read(args.path);
                if (result.error) {
                    return {
                        errors: [withStageError('file-read', result.error)],
                    };
                }
                return {
                    contents: result.code,
                    loader: guessLoader(args.path),
                };
            } catch (error) {
                return { errors: [withStageError('file-read', error)] };
            }
        },
    };

    const vuePlugin: Plugin = {
        name: 'core-vue',
        async onTransform(args: TransformArgs): Promise<TransformResult> {
            if (args.loader !== 'vue') return {};
            try {
                const useWorkers = env.WORKER_COMPILE === 'true';
                const result = useWorkers
                    ? await getWorkerPool().runTask('vue', {
                          fileName: args.path,
                          source: args.contents,
                          isProd: env.isPROD === 'true',
                      })
                    : await (
                          await loadVue()
                      )(args.contents, args.path, env.isPROD === 'true');
                if (result?.error) {
                    return {
                        errors: [withStageError('vue', result.error)],
                    };
                }
                return {
                    contents: result.data || '',
                    loader: result.lang === 'ts' ? 'ts' : 'js',
                    meta: {
                        vueScriptInfo: result.scriptInfo,
                        vueScriptLang: result.lang,
                    },
                };
            } catch (error) {
                return { errors: [withStageError('vue', error)] };
            }
        },
    };

    const tsPlugin: Plugin = {
        name: 'core-ts',
        async onTransform(args: TransformArgs): Promise<TransformResult> {
            const isTsFile = args.loader === 'ts';
            const vueLang = args.meta?.vueScriptLang;
            if (!isTsFile && vueLang !== 'ts') return {};
            try {
                const useWorkers = env.WORKER_COMPILE === 'true';
                const result = useWorkers
                    ? await getWorkerPool().runTask('ts', {
                          fileName: args.path,
                          source: args.contents,
                          scriptInfo: args.meta?.vueScriptInfo,
                      })
                    : await (
                          await loadTypeScript()
                      )(args.contents, args.path, args.meta?.vueScriptInfo);
                if (result?.error) {
                    return {
                        errors: [withStageError('typescript', result.error)],
                    };
                }
                return {
                    contents: result.data || '',
                    loader: 'js',
                };
            } catch (error) {
                return { errors: [withStageError('typescript', error)] };
            }
        },
    };

    const transformPlugin: Plugin = {
        name: 'core-transforms',
        async onTransform(args: TransformArgs): Promise<TransformResult> {
            try {
                const transform = await loadTransforms();
                const result = await transform(args.contents, args.path);
                if (result?.error) {
                    return {
                        errors: [
                            withStageError('standardization', result.error),
                        ],
                    };
                }
                return { contents: result.code || '' };
            } catch (error) {
                return { errors: [withStageError('standardization', error)] };
            }
        },
    };

    const minifyPlugin: Plugin = {
        name: 'core-minify',
        async onTransform(args: TransformArgs): Promise<TransformResult> {
            if (env.isPROD !== 'true') return {};
            try {
                const useWorkers = env.WORKER_COMPILE === 'true';
                const result = useWorkers
                    ? await getWorkerPool().runTask('minify', {
                          fileName: args.path,
                          source: args.contents,
                      })
                    : await (
                          await loadMinify()
                      )(args.contents, args.path, true);
                if (result?.error) {
                    return {
                        errors: [withStageError('minification', result.error)],
                    };
                }
                return { contents: result.code || '' };
            } catch (error) {
                return { errors: [withStageError('minification', error)] };
            }
        },
    };

    const logPlugin: Plugin = {
        name: 'core-log',
        onEnd(args) {
            if (!args.errors.length) return;
            if (env.VERBOSE === 'true') {
                logger.warn(`Pipeline errores: ${args.errors.length}`);
            }
        },
    };

    return [
        loadPlugin,
        vuePlugin,
        tsPlugin,
        transformPlugin,
        minifyPlugin,
        logPlugin,
    ];
}
