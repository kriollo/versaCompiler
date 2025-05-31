import { createHash } from 'node:crypto';
import { glob, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { env } from 'node:process';

import chalk from 'chalk';

import { logger } from '../servicios/logger';
import { promptUser } from '../utils/promptUser';
import { showTimingForHumans } from '../utils/utils';

import { ESLint, OxLint } from './linter';
import { minifyJS } from './minify';
import { getCodeFile } from './parser';
import { generateTailwindCSS } from './tailwindcss';
import { estandarizaCode } from './transforms';
import { preCompileTS } from './typescript';
import { preCompileVue } from './vuejs';

type InventoryError = {
    file: string;
    message: string;
    severity: string;
    help?: string;
};

type Result = {
    error: number;
    success: number;
};

type InventoryResume = {
    tipo: string;
    result: Result;
};

const inventoryResume: InventoryResume[] = [];
const inventoryError: InventoryError[] = [];

// 🚀 Sistema de Cache para Compilación
interface CacheEntry {
    hash: string;
    mtime: number;
    outputPath: string;
}

const compilationCache = new Map<string, CacheEntry>();
const CACHE_DIR = path.join(__dirname, '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'versacompile-cache.json');

async function loadCache() {
    try {
        const cacheData = await readFile(CACHE_FILE, 'utf-8');
        const parsed = JSON.parse(cacheData);
        for (const [key, value] of Object.entries(parsed)) {
            compilationCache.set(key, value as CacheEntry);
        }
    } catch {
        // Cache file doesn't exist or is invalid, start fresh
    }
}

async function saveCache() {
    try {
        // Crear directorio cache si no existe
        await mkdir(CACHE_DIR, { recursive: true });
        const cacheData = Object.fromEntries(compilationCache);
        await writeFile(CACHE_FILE, JSON.stringify(cacheData, null, 2));
    } catch {
        // Ignore save errors
    }
}

async function shouldRecompile(
    filePath: string,
    outputPath: string,
): Promise<boolean> {
    try {
        const stats = await stat(filePath);
        const cached = compilationCache.get(filePath);

        if (!cached) return true;

        // Si el archivo cambió, recompilar
        if (stats.mtimeMs > cached.mtime) {
            return true;
        }

        // Verificar si el archivo de salida existe
        try {
            await stat(outputPath);
        } catch {
            return true; // Archivo de salida no existe, recompilar
        }

        return false;
    } catch {
        return true; // Si hay error, recompilar
    }
}

async function updateCache(filePath: string, outputPath: string) {
    try {
        const stats = await stat(filePath);
        const hash = createHash('md5')
            .update(filePath + stats.mtimeMs)
            .digest('hex');
        compilationCache.set(filePath, {
            hash,
            mtime: stats.mtimeMs,
            outputPath,
        });
    } catch {
        // Ignorar errores de cache
    }
}

function displayLintErrors(errors: InventoryError[]): void {
    if (errors.length === 0) {
        return;
    }
    logger.info(chalk.bold('--- Errores y Advertencias de Linting ---'));
    logger.table(errors, ['file', 'message', 'severity', 'help']);
    logger.info(chalk.bold('--- Fin de Errores y Advertencias ---\n'));
}

async function displayLintingAndCompilationSummary(
    errors: InventoryError[],
    resume: InventoryResume[],
): Promise<void> {
    if (errors.length > 0) {
        displayLintErrors(errors);
    }

    if (resume.length > 0) {
        logger.info(chalk.bold('--- Resumen de Compilación ---'));
        await logger.table(resume, ['tipo', 'result']);
        logger.info(chalk.bold('--- Fin del Resumen de Compilación ---\n'));
    }
}

export function normalizeRuta(ruta: string) {
    // Si la ruta es absoluta, no agregar el prefijo './'
    if (path.isAbsolute(ruta)) {
        return path.normalize(ruta).replace(/\\/g, '/');
    }

    const file = path
        .normalize(!ruta.startsWith('.') ? './' + ruta : ruta)
        .replace(/\\/g, '/');
    const sourceForDist = file.startsWith('./') ? file : `./${file}`;

    return sourceForDist;
}

export function getOutputPath(ruta: string) {
    const pathSource = env.PATH_SOURCE ?? '';
    const pathDist = env.PATH_DIST ?? '';

    if (!pathSource || !pathDist) {
        return ruta.replace(/\.(vue|ts)$/, '.js');
    } // Normalizar las rutas para trabajar con barras forward
    const normalizedRuta = path.normalize(ruta).replace(/\\/g, '/');
    const normalizedSource = path.normalize(pathSource).replace(/\\/g, '/');
    const normalizedDist = path.normalize(pathDist).replace(/\\/g, '/');

    // Si la ruta ya es relativa a pathSource, calcular la ruta de salida
    if (normalizedRuta.includes(normalizedSource)) {
        // Extraer la parte relativa después de pathSource
        const relativePath = normalizedRuta
            .substring(
                normalizedRuta.indexOf(normalizedSource) +
                    normalizedSource.length,
            )
            .replace(/^[/\\]/, ''); // Remover barra inicial si existe        // Construir la ruta de salida
        const outputPath = path
            .join(normalizedDist, relativePath)
            .replace(/\\/g, '/');
        return outputPath.replace(/\.(vue|ts)$/, '.js');
    } else {
        // Si no está en pathSource, usar solo el nombre del archivo
        const fileName = path.basename(normalizedRuta);
        const outputPath = path
            .join(normalizedDist, fileName)
            .replace(/\\/g, '/');
        return outputPath.replace(/\.(vue|ts)$/, '.js');
    }
}

function registerInventoryResume(tipo: string, error: number, success: number) {
    const invRes = inventoryResume.find(res => res.tipo === tipo);
    if (!invRes) {
        inventoryResume.push({
            tipo,
            result: {
                error,
                success,
            },
        });
        return;
    } else {
        invRes.result.error += error;
        invRes.result.success += success;
    }
}
function registerInventoryError(
    file: string,
    message: string,
    severity: string,
    help?: string,
) {
    inventoryError.push({
        file,
        message,
        severity,
        help,
    });
}
async function compileJS(inPath: string, outPath: string) {
    const extension = path.extname(inPath);
    let { code, error } = await getCodeFile(inPath);
    if (error) {
        registerInventoryResume('getCodeFile', 1, 0);
        registerInventoryError(
            inPath,
            error instanceof Error ? error.message : String(error),
            'error',
        );
        throw new Error(error instanceof Error ? error.message : String(error));
    }

    if (
        !code ||
        code.trim().length === 0 ||
        code === 'undefined' ||
        code === 'null'
    ) {
        registerInventoryResume('getCodeFile', 1, 0);
        registerInventoryError(
            inPath,
            'El archivo está vacío o no se pudo leer.',
            'error',
        );
        throw new Error('El archivo está vacío o no se pudo leer.');
    }

    //aca se debe pasar de vue a js
    let vueResult;
    if (extension === '.vue') {
        if (env.VERBOSE === 'true' && env.isAll === 'true')
            logger.info(chalk.green(`💚 :Precompilando VUE`));
        vueResult = await preCompileVue(code, inPath, env.isPROD === 'true');
        if (vueResult.error) {
            registerInventoryResume('preCompileVue', 1, 0);
            registerInventoryError(
                inPath,
                vueResult.error instanceof Error
                    ? vueResult.error.message
                    : String(vueResult.error),
                'error',
            );
            throw new Error(
                vueResult.error instanceof Error
                    ? vueResult.error.message
                    : String(vueResult.error),
            );
        }
        registerInventoryResume('preCompileVue', 0, 1);
        code = vueResult.data;
    }

    if (
        !code ||
        code.trim().length === 0 ||
        code === 'undefined' ||
        code === 'null'
    ) {
        registerInventoryResume('preCompileVue', 1, -1);
        registerInventoryError(
            inPath,
            'El archivo está vacío o no se pudo leer.',
            'error',
        );
        throw new Error('El archivo está vacío o no se pudo leer.');
    }
    //aca se debe pasar de ts a js
    let tsResult;
    if (extension === '.ts' || vueResult?.lang === 'ts') {
        if (env.VERBOSE === 'true' && env.isAll === 'true')
            logger.info(chalk.blue(`🔄️ :Precompilando TS`));
        tsResult = await preCompileTS(code, inPath);
        if (tsResult.error) {
            registerInventoryResume('preCompileTS', 1, 0);
            registerInventoryError(
                inPath,
                tsResult.error instanceof Error
                    ? tsResult.error.message
                    : String(tsResult.error),
                'error',
            );
            throw new Error(
                tsResult.error instanceof Error
                    ? tsResult.error.message
                    : String(tsResult.error),
            );
        }
        registerInventoryResume('preCompileTS', 0, 1);
        code = tsResult.data;
    }
    if (
        !code ||
        code.trim().length === 0 ||
        code === 'undefined' ||
        code === 'null'
    ) {
        registerInventoryResume('preCompileTS', -1, 1);
        registerInventoryError(
            inPath,
            'El archivo está vacío o no se pudo leer.',
            'error',
        );
        throw new Error('El archivo está vacío o no se pudo leer.');
    }

    //aca se debe pasar de js a js
    if (env.VERBOSE === 'true' && env.isAll === 'true')
        logger.info(chalk.yellow(`💛 :Estandarizando`));
    const resultSTD = await estandarizaCode(code, inPath);
    if (resultSTD.error) {
        registerInventoryResume('estandarizaCode', 1, 0);
        registerInventoryError(inPath, resultSTD.error, 'error');
        throw new Error(resultSTD.error);
    }
    registerInventoryResume('estandarizaCode', 0, 1);
    code = resultSTD.code;
    if (
        !code ||
        code.trim().length === 0 ||
        code === 'undefined' ||
        code === 'null'
    ) {
        registerInventoryResume('estandarizaCode', -1, 1);
        registerInventoryError(
            inPath,
            'El archivo está vacío o no se pudo leer.',
            'error',
        );
        throw new Error('El archivo está vacío o no se pudo leer.');
    }

    if (env.isPROD === 'true') {
        if (env.VERBOSE === 'true' && env.isAll === 'true')
            logger.info(chalk.red(`🤖 :Minificando`));
        const resultMinify = await minifyJS(code, inPath, true);
        if (resultMinify.error) {
            registerInventoryResume('minifyJS', 1, 0);
            registerInventoryError(
                inPath,
                resultMinify.error instanceof Error
                    ? resultMinify.error.message
                    : String(resultMinify.error),
                'error',
            );
            throw new Error(
                resultMinify.error instanceof Error
                    ? resultMinify.error.message
                    : String(resultMinify.error),
            );
        }
        registerInventoryResume('minifyJS', 0, 1);
        code = resultMinify.code;
    }

    const destinationDir = path.dirname(outPath);
    await mkdir(destinationDir, { recursive: true });
    await writeFile(outPath, code, 'utf-8');

    return {
        error: null,
        action: 'extension',
    };
}

export async function initCompile(ruta: string, compileTailwind = true) {
    try {
        if (compileTailwind && Boolean(env.TAILWIND)) {
            const resultTW = await generateTailwindCSS();
            if (typeof resultTW !== 'boolean') {
                if (resultTW?.success) {
                    logger.info(`🎨 :${resultTW.message}\n`);
                } else {
                    logger.error(
                        `❌ :${resultTW.message}\n${resultTW.details}\n`,
                    );
                }
            }
        }
        const startTime = Date.now();
        const file = normalizeRuta(ruta);
        const outFile = getOutputPath(file);

        if (env.VERBOSE === 'true' && env.isAll === 'true')
            logger.info(`🔜 :Fuente para compilar: ${file}`);

        const result = await compileJS(file, outFile);
        if (result.error) {
            throw new Error(result.error);
        }

        const endTime = Date.now();
        const elapsedTime = showTimingForHumans(endTime - startTime);
        if (env.VERBOSE === 'true' && env.isAll === 'true')
            logger.info(`🔚 :Destino para publicar: ${outFile}`);
        if (env.VERBOSE === 'true' && env.isAll === 'true')
            logger.info(`⏱️ :Tiempo de compilación: ${elapsedTime}\n\n`);

        return {
            success: true,
            output: outFile,
            action: result.action,
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : '';
        logger.error(
            `🚩 :Error al compilar ${ruta}: ${errorMessage}\n${errorStack}\n`,
        );
        return {
            success: false,
            output: '',
        };
    }
}

export async function runLinter(showResult: boolean = false): Promise<boolean> {
    const linterENV = env.linter;
    let proceedWithCompilation = true;
    inventoryError.length = 0; // Limpiar errores de ejecuciones anteriores de linter

    if (
        typeof linterENV === 'string' &&
        linterENV.trim() !== '' &&
        env.ENABLE_LINTER !== 'false'
    ) {
        logger.info('🔍 Ejecutando linting...');
        const linterPromises: Promise<void>[] = [];

        inventoryError.length = 0;

        const parsedLinterEnv = JSON.parse(linterENV);
        if (Array.isArray(parsedLinterEnv)) {
            for (const item of parsedLinterEnv) {
                if (item.name.toLowerCase() === 'eslint') {
                    logger.info(
                        `🔧 Ejecutando ESLint con config: ${item.configFile || 'por defecto'}`,
                    );
                    const eslintPromise = ESLint(item)
                        .then(eslintResult => {
                            if (eslintResult && eslintResult.json) {
                                if (Array.isArray(eslintResult.json)) {
                                    eslintResult.json.forEach((result: any) => {
                                        registerInventoryError(
                                            result.filePath ||
                                                'archivo no especificado',
                                            result.message,
                                            result.severity === 2
                                                ? 'error'
                                                : 'warning',
                                            result.ruleId
                                                ? `Regla ESLint: ${result.ruleId}`
                                                : undefined,
                                        );
                                    });
                                } else if (
                                    eslintResult.json.results &&
                                    Array.isArray(eslintResult.json.results)
                                ) {
                                    eslintResult.json.results.forEach(
                                        (fileResult: any) => {
                                            if (
                                                fileResult.messages &&
                                                Array.isArray(
                                                    fileResult.messages,
                                                )
                                            ) {
                                                fileResult.messages.forEach(
                                                    (msg: any) => {
                                                        registerInventoryError(
                                                            fileResult.filePath ||
                                                                'archivo no especificado',
                                                            msg.message,
                                                            msg.severity === 2
                                                                ? 'error'
                                                                : 'warning',
                                                            msg.ruleId
                                                                ? `Regla ESLint: ${msg.ruleId}`
                                                                : undefined,
                                                        );
                                                    },
                                                );
                                            }
                                        },
                                    );
                                }
                            }
                        })
                        .catch(err => {
                            logger.error(
                                `❌ Error durante la ejecución de ESLint: ${err.message}`,
                            );
                            registerInventoryError(
                                item.configFile || 'ESLint Config',
                                `Fallo al ejecutar ESLint: ${err.message}`,
                                'error',
                            );
                        });
                    linterPromises.push(eslintPromise);
                } else if (item.name.toLowerCase() === 'oxlint') {
                    logger.info(
                        `🔧 Ejecutando OxLint con config: ${item.configFile || 'por defecto'}`,
                    );
                    const oxlintPromise = OxLint(item)
                        .then(oxlintResult => {
                            if (
                                oxlintResult &&
                                oxlintResult['json'] &&
                                Array.isArray(oxlintResult['json'])
                            ) {
                                oxlintResult['json'].forEach((result: any) => {
                                    registerInventoryError(
                                        result.filename ||
                                            result.file ||
                                            'archivo no especificado',
                                        result.message,
                                        typeof result.severity === 'string'
                                            ? result.severity.toLowerCase()
                                            : 'error',
                                        result.help ||
                                            (result.rule_id
                                                ? `Regla Oxlint: ${result.rule_id}`
                                                : undefined),
                                    );
                                });
                            }
                        })
                        .catch(err => {
                            logger.error(
                                `❌ Error durante la ejecución de OxLint: ${err.message}`,
                            );
                            registerInventoryError(
                                item.configFile || 'Oxlint Config',
                                `Fallo al ejecutar Oxlint: ${err.message}`,
                                'error',
                            );
                        });
                    linterPromises.push(oxlintPromise);
                }
            }
        } else {
            logger.warn('⚠️ La configuración de linter no es un array válido.');
        }

        await Promise.all(linterPromises);
        if (showResult) {
            if (inventoryError.length > 0) {
                displayLintErrors(inventoryError);
            } else {
                logger.info(
                    chalk.green(
                        '✅ No se encontraron errores ni advertencias de linting.',
                    ),
                );
            }
        }
        if (!showResult && inventoryError.length > 0) {
            displayLintErrors(inventoryError); // Mostrar errores antes de preguntar
            logger.warn(
                '🚨 Se encontraron errores o advertencias durante el linting.',
            );

            const result = await promptUser(
                '¿Deseas continuar con la compilación a pesar de los errores de linting? (s/N): ',
            );
            if (result.toLowerCase() !== 's') {
                logger.info('🛑 Compilación cancelada por el usuario.');
                proceedWithCompilation = false;
                // Mostrar errores que llevaron a la detención, sin resumen de compilación.
                displayLintErrors(inventoryError);
            }
        }
    }
    return proceedWithCompilation;
}

// Función para generar barra de progreso
function createProgressBar(
    current: number,
    total: number,
    barLength: number = 30,
): string {
    const percentage = Math.round((current / total) * 100);
    const filledLength = Math.round((current / total) * barLength);
    const emptyLength = barLength - filledLength;

    const filled = '█'.repeat(filledLength);
    const empty = '░'.repeat(emptyLength);

    return `[${filled}${empty}] ${percentage}% (${current}/${total})`;
}

// Variable para el último progreso mostrado (evitar spam)
let lastProgressUpdate = 0;

async function compileWithConcurrencyLimit(
    files: string[],
    maxConcurrency: number = 8,
) {
    const results: any[] = [];
    const executing: Promise<any>[] = [];
    let completed = 0;
    let skipped = 0;
    const total = files.length;

    logger.info(`📊 Iniciando compilación de ${total} archivos...`);

    // Mostrar barra inicial
    const initialBar = createProgressBar(0, total);
    process.stdout.write(`\r🚀 ${initialBar}`);

    for (const file of files) {
        const promise = (async () => {
            const outFile = getOutputPath(normalizeRuta(file));

            // Verificar cache
            const needsRecompile = await shouldRecompile(file, outFile);
            if (!needsRecompile) {
                skipped++;
                updateProgressBar();
                return { success: true, cached: true, output: outFile };
            }

            const result = await initCompile(file, false);
            if (result.success) {
                // Actualizar cache
                await updateCache(file, result.output);
            }

            completed++;
            updateProgressBar();
            return result;
        })().then(result => {
            executing.splice(executing.indexOf(promise), 1);
            return result;
        });

        results.push(promise);
        executing.push(promise);

        if (executing.length >= maxConcurrency) {
            await Promise.race(executing);
        }
    }

    function updateProgressBar() {
        const currentTotal = completed + skipped;
        const progressBar = createProgressBar(currentTotal, total);

        // Actualizar solo cada 2% o cuando hay cambios significativos
        const progressPercent = Math.round((currentTotal / total) * 100);
        if (
            progressPercent > lastProgressUpdate + 1 ||
            currentTotal === total
        ) {
            process.stdout.write(
                `\r🚀 ${progressBar} [📁 ${completed} | ⚡ ${skipped}]`,
            );
            lastProgressUpdate = progressPercent;
        }
    }

    const finalResults = await Promise.all(results);

    // Limpiar línea de progreso y mostrar resumen final
    process.stdout.write('\n');
    logger.info(
        chalk.green(
            `✅ Compilación completada: ${completed} archivos compilados, ${skipped} desde cache`,
        ),
    );

    return finalResults;
}

export async function initCompileAll() {
    try {
        // 🚀 Cargar cache al inicio
        await loadCache();

        // Reset progress tracker
        lastProgressUpdate = 0;

        const shouldContinue = await runLinter();
        if (!shouldContinue) {
            await displayLintingAndCompilationSummary(inventoryError, []);
            return;
        }

        const startTime = Date.now();
        const rawPathSource = env.PATH_SOURCE ?? '';
        const pathDist = env.PATH_DIST ?? '';

        const normalizedGlobPathSource = rawPathSource.replace(/\\/g, '/');

        const patterns = [
            `${normalizedGlobPathSource}/**/*.js`,
            `${normalizedGlobPathSource}/**/*.vue`,
            `${normalizedGlobPathSource}/**/*.ts`,
        ];

        logger.info(`📝 :Compilando todos los archivos...`);
        logger.info(`🔜 :Fuente para compilar (original): ${rawPathSource}`);
        logger.info(`🔚 :Destino para compilar: ${pathDist}\n`);

        const resultTW = await generateTailwindCSS();
        if (typeof resultTW !== 'boolean') {
            if (resultTW?.success) {
                logger.info(`🎨 :${resultTW.message}\n`);
            } else {
                logger.error(`❌ :${resultTW.message}\n${resultTW.details}\n`);
            }
        }

        // Recopilar todos los archivos
        const filesToCompile: string[] = [];
        for await (const file of glob(patterns)) {
            if (file.endsWith('.d.ts')) {
                continue;
            }
            filesToCompile.push(file.startsWith('./') ? file : `./${file}`);
        } // Determinar concurrencia óptima basada en cantidad de archivos y CPUs
        const cpuCount = os.cpus().length;
        const fileCount = filesToCompile.length;

        // Ajuste dinámico de concurrencia
        let maxConcurrency: number;
        if (fileCount < 10) {
            maxConcurrency = Math.min(fileCount, cpuCount);
        } else if (fileCount < 50) {
            maxConcurrency = Math.min(cpuCount * 2, 12);
        } else {
            maxConcurrency = Math.min(cpuCount * 2, 16);
        }

        logger.info(
            `🚀 :Compilando ${fileCount} archivos con concurrencia optimizada (${maxConcurrency} hilos)...`,
        );

        await compileWithConcurrencyLimit(filesToCompile, maxConcurrency);

        // 💾 Guardar cache al final
        await saveCache();

        const endTime = Date.now();
        const elapsedTime = showTimingForHumans(endTime - startTime);
        logger.info(`⏱️ :Tiempo de compilación TOTAL: ${elapsedTime}\n`);

        logger.info(`🚀 :Compilación de todos los archivos finalizada.\n`);

        await displayLintingAndCompilationSummary(
            inventoryError,
            inventoryResume,
        );
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : '';
        logger.error(
            `🚩 :Error al compilar todos los archivos: ${errorMessage}\n${errorStack}\n`,
        );
    }
}

// Función wrapper para compatibilidad con tests
export async function compileFile(filePath: string) {
    return await initCompile(filePath, true);
}
