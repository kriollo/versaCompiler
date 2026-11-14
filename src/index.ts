/**
 * API programática de VersaCompiler.
 *
 * ```ts
 * import { build, compile } from 'versacompiler';
 * const ok = await build({ prod: true });
 * ```
 *
 * ponytail: el compilador se configura vía process.env (igual que el CLI), así
 * que dos llamadas concurrentes con opciones distintas en el mismo proceso se
 * pisan. Para builds en paralelo, usar procesos separados.
 */
import * as path from 'node:path';
import { cwd, env } from 'node:process';
import { fileURLToPath } from 'node:url';

export {
    defineConfig,
    type BundlerEntry,
    type LinterConfig,
    type VersaConfig,
} from './servicios/versacompile.config.types.js';

export type {
    EndArgs,
    HotUpdateArgs,
    HotUpdateResult,
    LoadArgs,
    LoadResult,
    Plugin,
    ResolveArgs,
    ResolveResult,
    StructuredError,
    TransformArgs,
    TransformResult,
} from './compiler/pipeline/types.js';

export interface BuildOptions {
    /** Minifica y compila para producción (`--prod`). */
    prod?: boolean;
    /** Modo para `import.meta.env` y `.env.<mode>` (`--mode`). */
    mode?: string;
    /** Verifica tipos con TypeScript (`-t`). */
    typeCheck?: boolean;
    /** Ejecuta los linters configurados antes de compilar (`--linter`). */
    linter?: boolean;
    /** Compila TailwindCSS si está configurado. Por defecto `true`. */
    tailwind?: boolean;
    /** Valida la integridad del código generado (`--checkIntegrity`). */
    checkIntegrity?: boolean;
    /** Logs detallados (`--verbose`). */
    verbose?: boolean;
    /** Solo advertencias y errores (`--silent`). */
    silent?: boolean;
    /** Ruta al archivo de configuración. Por defecto `<cwd>/versacompile.config.ts`. */
    configFile?: string;
}

export interface CompileResult {
    success: boolean;
    /** Ruta del archivo generado (vacía si falló). */
    output: string;
}

// Especificadores no literales: así tsc no arrastra todo el compilador a los
// .d.ts publicados (solo se exporta esta superficie) y la carga sigue siendo lazy.
const COMPILER = './compiler/compile.js';
const READ_CONFIG = './servicios/readConfig.js';
const TS_POOL = './compiler/typescript-worker-pool.js';

/** Cierra los workers de TypeScript para que el proceso del usuario pueda salir. */
async function shutdown(): Promise<void> {
    const { TypeScriptWorkerPool } = (await import(TS_POOL)) as {
        TypeScriptWorkerPool: { getInstance(): { terminate(): Promise<void> } };
    };
    await TypeScriptWorkerPool.getInstance().terminate();
}

type CompilerModule = {
    initCompileAll(): Promise<boolean>;
    compileFile(file: string): Promise<{ success?: boolean; output?: string }>;
};

async function setup(options: BuildOptions): Promise<void> {
    env.PATH_PROY = path.dirname(fileURLToPath(import.meta.url));
    env.PATH_CONFIG_FILE = path.resolve(
        cwd(),
        options.configFile ?? 'versacompile.config.ts',
    );
    env.isPROD = options.prod ? 'true' : 'false';
    if (options.mode) env.MODE = options.mode;
    else delete env.MODE;
    env.TAILWIND = options.tailwind === false ? 'false' : 'true';
    env.ENABLE_LINTER = options.linter ? 'true' : 'false';
    env.typeCheck = options.typeCheck ? 'true' : 'false';
    env.CHECK_INTEGRITY = options.checkIntegrity ? 'true' : 'false';
    env.VERBOSE = options.verbose ? 'true' : 'false';
    env.SILENT = options.silent ? 'true' : 'false';
    env.yes = 'true'; // sin prompts interactivos

    const { readConfig } = (await import(READ_CONFIG)) as {
        readConfig(): Promise<boolean>;
    };
    if (!(await readConfig())) {
        throw new Error(
            `No se pudo cargar la configuración: ${env.PATH_CONFIG_FILE}`,
        );
    }
}

/**
 * Compila todo el proyecto (equivale a `versacompiler --all`).
 * @returns `true` si no hubo errores.
 */
export async function build(options: BuildOptions = {}): Promise<boolean> {
    await setup(options);
    env.isALL = 'true';
    const { initCompileAll } = (await import(COMPILER)) as CompilerModule;
    try {
        return await initCompileAll();
    } finally {
        await shutdown();
    }
}

/** Compila un único archivo (equivale a `versacompiler --file <ruta>`). */
export async function compile(
    filePath: string,
    options: BuildOptions = {},
): Promise<CompileResult> {
    await setup(options);
    env.isALL = 'false';
    const { compileFile } = (await import(COMPILER)) as CompilerModule;
    try {
        const result = await compileFile(path.resolve(filePath));
        return { success: !!result?.success, output: result?.output ?? '' };
    } finally {
        await shutdown();
    }
}
