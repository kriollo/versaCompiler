import { createHash } from 'node:crypto';
import {
    glob,
    mkdir,
    readFile,
    stat,
    unlink,
    writeFile,
} from 'node:fs/promises';
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

// 🎯 Sistema Unificado de Manejo de Errores
type CompilationMode = 'all' | 'individual' | 'watch';

type CompilationError = {
    file: string;
    stage: string;
    message: string;
    severity: 'error' | 'warning';
    details?: string;
    help?: string;
    timestamp: number;
};

type CompilationResult = {
    stage: string;
    errors: number;
    success: number;
    files: string[];
};

// Almacenamiento global de errores y resultados
const compilationErrors: CompilationError[] = [];
const compilationResults: CompilationResult[] = [];

// 🚀 Sistema de Cache para Compilación
interface CacheEntry {
    hash: string;
    mtime: number;
    outputPath: string;
}

// Obtener __dirname de manera compatible con CommonJS y ES modules
let pathName: string;

// Estrategia 1: Intentar con __filename (disponible en CommonJS y en ts-jest)
// @ts-ignore - Suprime advertencia de TypeScript sobre __filename en ESM
if (typeof __filename !== 'undefined') {
    pathName = path.dirname(__filename);
} else {
    pathName = process.cwd();
}

const compilationCache = new Map<string, CacheEntry>();
const CACHE_DIR = path.join(pathName, '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'versacompile-cache.json');

async function loadCache() {
    try {
        if (env.clean === 'true') {
            compilationCache.clear();
            try {
                await unlink(CACHE_FILE);
            } catch {
                // Ignorar errores al eliminar el archivo
            }
        }

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

        if (stats.mtimeMs > cached.mtime) {
            return true;
        }

        try {
            await stat(outputPath);
        } catch {
            return true;
        }

        return false;
    } catch {
        return true;
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

// 🎯 Funciones del Sistema Unificado de Manejo de Errores

/**
 * Registra un error de compilación en el sistema unificado
 */
function registerCompilationError(
    file: string,
    stage: string,
    message: string,
    severity: 'error' | 'warning' = 'error',
    details?: string,
    help?: string,
): void {
    compilationErrors.push({
        file,
        stage,
        message,
        severity,
        details,
        help,
        timestamp: Date.now(),
    });
}

/**
 * Registra un resultado de compilación (éxitos/errores por etapa)
 */
function registerCompilationResult(
    stage: string,
    errors: number,
    success: number,
    files: string[] = [],
): void {
    const existingResult = compilationResults.find(r => r.stage === stage);
    if (existingResult) {
        existingResult.errors += errors;
        existingResult.success += success;
        existingResult.files.push(...files);
    } else {
        compilationResults.push({
            stage,
            errors,
            success,
            files: [...files],
        });
    }
}

/**
 * Maneja errores según el modo de compilación
 */
function handleCompilationError(
    error: Error | string,
    fileName: string,
    stage: string,
    mode: CompilationMode,
    isVerbose: boolean = false,
): void {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorDetails = error instanceof Error ? error.stack : undefined;

    // Registrar el error en el sistema unificado
    registerCompilationError(
        fileName,
        stage,
        errorMessage,
        'error',
        errorDetails,
    );
    registerCompilationResult(stage, 1, 0, [fileName]);

    // Mostrar error inmediatamente solo en modo individual y watch
    if (mode === 'individual' || mode === 'watch') {
        const baseName = path.basename(fileName);
        const stageColor = getStageColor(stage);

        if (isVerbose) {
            // Modo verbose: Mostrar error completo con contexto
            logger.error(
                chalk.red(
                    `❌ Error en etapa ${stageColor(stage)} - ${baseName}:`,
                ),
            );
            logger.error(chalk.red(errorMessage));
            if (errorDetails && (stage === 'typescript' || stage === 'vue')) {
                // Mostrar stack trace limitado para TypeScript y Vue
                const stackLines = errorDetails.split('\n').slice(0, 5);
                stackLines.forEach(line => {
                    if (line.trim()) {
                        logger.error(chalk.gray(`  ${line.trim()}`));
                    }
                });
            }
        } else {
            // Modo normal: Mostrar error simplificado
            const firstLine = errorMessage.split('\n')[0];
            logger.error(
                chalk.red(`❌ Error en ${stageColor(stage)}: ${baseName}`),
            );
            logger.error(chalk.red(`   ${firstLine}`));
            logger.info(
                chalk.yellow(`💡 Usa --verbose para ver detalles completos`),
            );
        }
    }
    // En modo 'all', los errores se acumulan silenciosamente para el resumen final
}

/**
 * Registra un éxito de compilación
 */
function registerCompilationSuccess(fileName: string, stage: string): void {
    registerCompilationResult(stage, 0, 1, [fileName]);
}

/**
 * Limpia todos los errores y resultados acumulados
 */
function clearCompilationState(): void {
    compilationErrors.length = 0;
    compilationResults.length = 0;
}

/**
 * Muestra un resumen detallado de todos los errores de compilación
 */
function displayCompilationSummary(isVerbose: boolean = false): void {
    if (compilationErrors.length === 0 && compilationResults.length === 0) {
        logger.info(
            chalk.green('✅ No hay errores de compilación para mostrar.'),
        );
        return;
    }

    logger.info(chalk.bold('\n--- 📊 RESUMEN DE COMPILACIÓN ---'));

    // Mostrar estadísticas por etapa
    if (compilationResults.length > 0) {
        logger.info(chalk.blue('\n🔍 Estadísticas por etapa:'));

        compilationResults.forEach(result => {
            const totalFiles = result.success + result.errors;
            const successRate =
                totalFiles > 0
                    ? Math.round((result.success / totalFiles) * 100)
                    : 0;

            const statusIcon = result.errors === 0 ? '✅' : '❌';
            const statusColor = result.errors === 0 ? chalk.green : chalk.red;
            const stageColor = getStageColor(result.stage);

            logger.info(
                `${statusIcon} ${stageColor(result.stage)}: ${statusColor(`${result.success} éxitos, ${result.errors} errores`)} (${successRate}% éxito)`,
            );
        });
    }

    // Mostrar errores detallados
    if (compilationErrors.length > 0) {
        logger.info(
            chalk.red(
                `\n❌ Se encontraron ${compilationErrors.length} errores:`,
            ),
        );

        // Agrupar errores por archivo para mejor organización
        const errorsByFile = new Map<string, CompilationError[]>();
        compilationErrors.forEach(error => {
            if (!errorsByFile.has(error.file)) {
                errorsByFile.set(error.file, []);
            }
            errorsByFile.get(error.file)!.push(error);
        });

        // Mostrar errores por archivo
        let fileIndex = 1;
        errorsByFile.forEach((fileErrors, filePath) => {
            const baseName = path.basename(filePath);
            const errorCount = fileErrors.filter(
                e => e.severity === 'error',
            ).length;
            const warningCount = fileErrors.filter(
                e => e.severity === 'warning',
            ).length;

            logger.info(chalk.cyan(`\n📄 ${fileIndex}. ${baseName}`));
            logger.info(chalk.gray(`   Ruta: ${filePath}`));
            logger.info(
                chalk.yellow(
                    `   ${errorCount} errores, ${warningCount} advertencias`,
                ),
            );
            fileErrors.forEach(error => {
                const icon = error.severity === 'error' ? '❌' : '⚠️';
                const stageColor = getStageColor(error.stage);

                logger.info(
                    `   ${icon} [${stageColor(error.stage)}] ${error.message}`,
                );

                if (isVerbose && error.details) {
                    // En modo verbose, mostrar detalles adicionales
                    const detailLines = error.details.split('\n').slice(0, 5);
                    detailLines.forEach(line => {
                        if (line.trim()) {
                            logger.info(chalk.gray(`      ${line.trim()}`));
                        }
                    });
                }

                if (error.help) {
                    logger.info(chalk.blue(`      💡 ${error.help}`));
                }
            });

            fileIndex++;
        });

        // Mostrar totales finales
        const totalErrors = compilationErrors.filter(
            e => e.severity === 'error',
        ).length;
        const totalWarnings = compilationErrors.filter(
            e => e.severity === 'warning',
        ).length;
        const totalFiles = errorsByFile.size;

        logger.info(chalk.bold('\n--- 📈 ESTADÍSTICAS FINALES ---'));
        logger.info(`📁 Archivos con errores: ${totalFiles}`);
        logger.info(`❌ Total de errores: ${totalErrors}`);
        logger.info(`⚠️ Total de advertencias: ${totalWarnings}`);

        if (totalErrors > 0) {
            logger.info(
                chalk.red(
                    '🚨 Compilación completada con errores que requieren atención.',
                ),
            );
        } else {
            logger.info(
                chalk.yellow(
                    '✅ Compilación completada con solo advertencias.',
                ),
            );
        }
    } else {
        logger.info(chalk.green('✅ ¡Compilación exitosa sin errores!'));
    }

    logger.info(chalk.bold('--- FIN DEL RESUMEN ---\n'));
}

/**
 * Obtiene el color apropiado para cada etapa de compilación
 */
function getStageColor(stage: string): (text: string) => string {
    switch (stage) {
        case 'vue':
            return chalk.green;
        case 'typescript':
            return chalk.blue;
        case 'standardization':
            return chalk.yellow;
        case 'minification':
            return chalk.red;
        case 'tailwind':
            return chalk.magenta;
        case 'file-read':
            return chalk.gray;
        default:
            return chalk.white;
    }
}

export function normalizeRuta(ruta: string) {
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
    }

    const normalizedRuta = path.normalize(ruta).replace(/\\/g, '/');
    const normalizedSource = path.normalize(pathSource).replace(/\\/g, '/');
    const normalizedDist = path.normalize(pathDist).replace(/\\/g, '/');

    if (normalizedRuta.includes(normalizedSource)) {
        const relativePath = normalizedRuta
            .substring(
                normalizedRuta.indexOf(normalizedSource) +
                    normalizedSource.length,
            )
            .replace(/^[/\\]/, '');

        const outputPath = path
            .join(normalizedDist, relativePath)
            .replace(/\\/g, '/');
        return outputPath.replace(/\.(vue|ts)$/, '.js');
    } else {
        const fileName = path.basename(normalizedRuta);
        const outputPath = path
            .join(normalizedDist, fileName)
            .replace(/\\/g, '/');
        return outputPath.replace(/\.(vue|ts)$/, '.js');
    }
}

async function compileJS(
    inPath: string,
    outPath: string,
    mode: CompilationMode = 'individual',
) {
    inPath = normalizeRuta(path.resolve(inPath));

    const extension = path.extname(inPath);
    let { code, error } = await getCodeFile(inPath);

    if (error) {
        handleCompilationError(
            error instanceof Error ? error : new Error(String(error)),
            inPath,
            'file-read',
            mode,
            env.VERBOSE === 'true',
        );
        throw new Error(error instanceof Error ? error.message : String(error));
    }

    if (
        !code ||
        code.trim().length === 0 ||
        code === 'undefined' ||
        code === 'null'
    ) {
        handleCompilationError(
            new Error('El archivo está vacío o no se pudo leer.'),
            inPath,
            'file-read',
            mode,
            env.VERBOSE === 'true',
        );
        throw new Error('El archivo está vacío o no se pudo leer.');
    }

    // Logs detallados solo en modo verbose + all
    const shouldShowDetailedLogs = env.VERBOSE === 'true' && mode === 'all'; // Compilación de Vue
    let vueResult;
    if (extension === '.vue') {
        if (shouldShowDetailedLogs) {
            logger.info(chalk.green(`💚 Precompilando VUE: ${inPath}`));
        }

        vueResult = await preCompileVue(code, inPath, env.isPROD === 'true');
        if (vueResult.error) {
            handleCompilationError(
                vueResult.error instanceof Error
                    ? vueResult.error
                    : new Error(String(vueResult.error)),
                inPath,
                'vue',
                mode,
                env.VERBOSE === 'true',
            );
            throw new Error(
                vueResult.error instanceof Error
                    ? vueResult.error.message
                    : String(vueResult.error),
            );
        }
        registerCompilationSuccess(inPath, 'vue');
        code = vueResult.data;
    }

    if (!code || code.trim().length === 0) {
        handleCompilationError(
            new Error('El código Vue compilado está vacío.'),
            inPath,
            'vue',
            mode,
            env.VERBOSE === 'true',
        );
        throw new Error('El código Vue compilado está vacío.');
    }

    // Compilación de TypeScript
    let tsResult;
    if (extension === '.ts' || vueResult?.lang === 'ts') {
        if (shouldShowDetailedLogs) {
            logger.info(chalk.blue(`🔄️ Precompilando TS: ${inPath}`));
        }
        tsResult = await preCompileTS(code, inPath);
        if (tsResult.error) {
            if (mode === 'all') {
                // En modo --all, registrar el error pero continuar la compilación
                registerCompilationError(
                    inPath,
                    'typescript',
                    tsResult.error instanceof Error
                        ? tsResult.error.message
                        : String(tsResult.error),
                    'error',
                );
                // Usar el código original si la compilación de TypeScript falla
                // code permanece sin cambios
            } else {
                // En modo individual, mantener el comportamiento original (detener compilación)
                handleCompilationError(
                    tsResult.error,
                    inPath,
                    'typescript',
                    mode,
                    env.VERBOSE === 'true',
                );
                throw new Error(
                    tsResult.error instanceof Error
                        ? tsResult.error.message
                        : String(tsResult.error),
                );
            }
        } else {
            registerCompilationSuccess(inPath, 'typescript');
            code = tsResult.data;
        }
    }

    if (!code || code.trim().length === 0) {
        handleCompilationError(
            new Error('El código TypeScript compilado está vacío.'),
            inPath,
            'typescript',
            mode,
            env.VERBOSE === 'true',
        );
        throw new Error('El código TypeScript compilado está vacío.');
    }

    // Estandarización
    if (shouldShowDetailedLogs) {
        logger.info(chalk.yellow(`💛 Estandarizando: ${inPath}`));
    }

    const resultSTD = await estandarizaCode(code, inPath);
    if (resultSTD.error) {
        handleCompilationError(
            new Error(resultSTD.error),
            inPath,
            'standardization',
            mode,
            env.VERBOSE === 'true',
        );
        throw new Error(resultSTD.error);
    }
    registerCompilationSuccess(inPath, 'standardization');
    code = resultSTD.code;

    if (!code || code.trim().length === 0) {
        handleCompilationError(
            new Error('El código estandarizado está vacío.'),
            inPath,
            'standardization',
            mode,
            env.VERBOSE === 'true',
        );
        throw new Error('El código estandarizado está vacío.');
    }

    // Minificación (solo en producción)
    if (env.isPROD === 'true') {
        if (shouldShowDetailedLogs) {
            logger.info(chalk.red(`🤖 Minificando: ${inPath}`));
        }

        const resultMinify = await minifyJS(code, inPath, true);
        if (resultMinify.error) {
            handleCompilationError(
                resultMinify.error instanceof Error
                    ? resultMinify.error
                    : new Error(String(resultMinify.error)),
                inPath,
                'minification',
                mode,
                env.VERBOSE === 'true',
            );
            throw new Error(
                resultMinify.error instanceof Error
                    ? resultMinify.error.message
                    : String(resultMinify.error),
            );
        }
        registerCompilationSuccess(inPath, 'minification');
        code = resultMinify.code;
    }

    // Escribir archivo final
    const destinationDir = path.dirname(outPath);
    await mkdir(destinationDir, { recursive: true });
    await writeFile(outPath, code, 'utf-8');

    return {
        error: null,
        action: 'extension',
    };
}

export async function initCompile(
    ruta: string,
    compileTailwind = true,
    mode: CompilationMode = 'individual',
) {
    try {
        // Generar TailwindCSS si está habilitado
        if (compileTailwind && Boolean(env.TAILWIND)) {
            const resultTW = await generateTailwindCSS();
            if (typeof resultTW !== 'boolean') {
                if (resultTW?.success) {
                    if (mode === 'individual') {
                        logger.info(`🎨 ${resultTW.message}`);
                    }
                } else {
                    const errorMsg = `${resultTW.message}${resultTW.details ? '\n' + resultTW.details : ''}`;
                    handleCompilationError(
                        new Error(errorMsg),
                        'tailwind.config.js',
                        'tailwind',
                        mode,
                        env.VERBOSE === 'true',
                    );
                    // No hacer throw aquí, permitir que la compilación continúe
                }
            }
        }

        const startTime = Date.now();
        const file = normalizeRuta(ruta);
        const outFile = getOutputPath(file);

        if (mode === 'individual' && env.VERBOSE === 'true') {
            logger.info(`🔜 Fuente: ${file}`);
        }

        const result = await compileJS(file, outFile, mode);
        if (result.error) {
            throw new Error(result.error);
        }

        const endTime = Date.now();
        const elapsedTime = showTimingForHumans(endTime - startTime);

        if (mode === 'individual') {
            if (env.VERBOSE === 'true') {
                logger.info(`🔚 Destino: ${outFile}`);
                logger.info(`⏱️ Tiempo: ${elapsedTime}`);
            }
            logger.info(
                chalk.green(`✅ Compilación exitosa: ${path.basename(file)}`),
            );
        }

        return {
            success: true,
            output: outFile,
            action: result.action,
        };
    } catch {
        // Los errores ya se manejan en handleCompilationError
        return {
            success: false,
            output: '',
        };
    }
}

export async function runLinter(showResult: boolean = false): Promise<boolean> {
    const linterENV = env.linter;
    let proceedWithCompilation = true;

    if (
        typeof linterENV === 'string' &&
        linterENV.trim() !== '' &&
        env.ENABLE_LINTER !== 'false'
    ) {
        logger.info('🔍 Ejecutando linting...');
        const linterPromises: Promise<void>[] = [];
        const linterErrors: any[] = [];

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
                                // Procesar resultados de ESLint
                                if (Array.isArray(eslintResult.json)) {
                                    eslintResult.json.forEach((result: any) => {
                                        linterErrors.push({
                                            file:
                                                result.filePath ||
                                                'archivo no especificado',
                                            message: result.message,
                                            severity:
                                                result.severity === 2
                                                    ? 'error'
                                                    : 'warning',
                                            help: result.ruleId
                                                ? `Regla ESLint: ${result.ruleId}`
                                                : undefined,
                                        });
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
                                                        linterErrors.push({
                                                            file:
                                                                fileResult.filePath ||
                                                                'archivo no especificado',
                                                            message:
                                                                msg.message,
                                                            severity:
                                                                msg.severity ===
                                                                2
                                                                    ? 'error'
                                                                    : 'warning',
                                                            help: msg.ruleId
                                                                ? `Regla ESLint: ${msg.ruleId}`
                                                                : undefined,
                                                        });
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
                            linterErrors.push({
                                file: item.configFile || 'ESLint Config',
                                message: `Fallo al ejecutar ESLint: ${err.message}`,
                                severity: 'error',
                            });
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
                                    linterErrors.push({
                                        file:
                                            result.filename ||
                                            result.file ||
                                            'archivo no especificado',
                                        message: result.message,
                                        severity:
                                            typeof result.severity === 'string'
                                                ? result.severity.toLowerCase()
                                                : 'error',
                                        help:
                                            result.help ||
                                            (result.rule_id
                                                ? `Regla Oxlint: ${result.rule_id}`
                                                : undefined),
                                    });
                                });
                            }
                        })
                        .catch(err => {
                            logger.error(
                                `❌ Error durante la ejecución de OxLint: ${err.message}`,
                            );
                            linterErrors.push({
                                file: item.configFile || 'Oxlint Config',
                                message: `Fallo al ejecutar Oxlint: ${err.message}`,
                                severity: 'error',
                            });
                        });
                    linterPromises.push(oxlintPromise);
                }
            }
        } else {
            logger.warn('⚠️ La configuración de linter no es un array válido.');
        }

        await Promise.all(linterPromises);

        if (showResult) {
            if (linterErrors.length > 0) {
                displayLinterErrors(linterErrors);
            } else {
                logger.info(
                    chalk.green(
                        '✅ No se encontraron errores ni advertencias de linting.',
                    ),
                );
            }
        }

        if (!showResult && linterErrors.length > 0) {
            displayLinterErrors(linterErrors);
            logger.warn(
                '🚨 Se encontraron errores o advertencias durante el linting.',
            );

            if (env.yes === 'false') {
                const result = await promptUser(
                    '¿Deseas continuar con la compilación a pesar de los errores de linting? (s/N): ',
                );
                if (result.toLowerCase() !== 's') {
                    logger.info('🛑 Compilación cancelada por el usuario.');
                    proceedWithCompilation = false;
                }
            }
        }
    }
    return proceedWithCompilation;
}

function displayLinterErrors(errors: any[]): void {
    logger.info(chalk.bold('--- Errores y Advertencias de Linting ---'));

    const errorsByFile = new Map<string, any[]>();
    errors.forEach(error => {
        if (!errorsByFile.has(error.file)) {
            errorsByFile.set(error.file, []);
        }
        errorsByFile.get(error.file)!.push(error);
    });

    const totalErrors = errors.filter(e => e.severity === 'error').length;
    const totalWarnings = errors.filter(e => e.severity === 'warning').length;
    const totalFiles = errorsByFile.size;

    logger.info(
        chalk.yellow(
            `📊 Resumen: ${totalErrors} errores, ${totalWarnings} advertencias en ${totalFiles} archivos\n`,
        ),
    );

    errorsByFile.forEach((fileErrors, filePath) => {
        const baseName = path.basename(filePath);
        logger.info(chalk.cyan(`\n📄 ${baseName}`));

        fileErrors.forEach(error => {
            const icon = error.severity === 'error' ? '❌' : '⚠️';
            logger.info(`${icon} ${error.message}`);
            if (error.help) {
                logger.info(`   └─ ${error.help}`);
            }
        });
    });

    logger.info(chalk.bold('--- Fin de Errores y Advertencias ---\n'));
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

    logger.info(`📊 Iniciando compilación de ${total} archivos...\n`);

    const initialBar = createProgressBar(0, total);
    process.stdout.write(`\r🚀 ${initialBar}`);

    function updateProgressBar() {
        const currentTotal = completed + skipped;
        const progressBar = createProgressBar(currentTotal, total);

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

            const result = await initCompile(file, false, 'all');
            if (result.success) {
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

    const finalResults = await Promise.all(results);

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
        // Limpiar estado de compilación anterior
        clearCompilationState();

        // Cargar cache al inicio
        await loadCache();
        lastProgressUpdate = 0;

        const shouldContinue = await runLinter();
        if (!shouldContinue) {
            displayCompilationSummary(env.VERBOSE === 'true');
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

        logger.info(`📝 Compilando todos los archivos...`);
        logger.info(`🔜 Fuente: ${rawPathSource}`);
        logger.info(`🔚 Destino: ${pathDist}\n`);

        // Generar TailwindCSS
        const resultTW = await generateTailwindCSS();
        if (typeof resultTW !== 'boolean') {
            if (resultTW?.success) {
                logger.info(`🎨 ${resultTW.message}\n`);
            } else {
                handleCompilationError(
                    new Error(
                        `${resultTW.message}${resultTW.details ? '\n' + resultTW.details : ''}`,
                    ),
                    'tailwind.config.js',
                    'tailwind',
                    'all',
                    env.VERBOSE === 'true',
                );
            }
        }

        // Recopilar todos los archivos
        const filesToCompile: string[] = [];
        for await (const file of glob(patterns)) {
            if (file.endsWith('.d.ts')) {
                continue;
            }
            filesToCompile.push(file.startsWith('./') ? file : `./${file}`);
        }

        // Determinar concurrencia óptima
        const cpuCount = os.cpus().length;
        const fileCount = filesToCompile.length;

        let maxConcurrency: number;
        if (fileCount < 10) {
            maxConcurrency = Math.min(fileCount, cpuCount);
        } else if (fileCount < 50) {
            maxConcurrency = Math.min(cpuCount * 2, 12);
        } else {
            maxConcurrency = Math.min(cpuCount * 2, 16);
        }

        logger.info(
            `🚀 Compilando ${fileCount} archivos con concurrencia optimizada (${maxConcurrency} hilos)...`,
        );

        await compileWithConcurrencyLimit(filesToCompile, maxConcurrency);

        // Guardar cache al final
        await saveCache();

        const endTime = Date.now();
        const elapsedTime = showTimingForHumans(endTime - startTime);
        logger.info(`⏱️ Tiempo total de compilación: ${elapsedTime}\n`);

        // Mostrar resumen de compilación
        displayCompilationSummary(env.VERBOSE === 'true');
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        logger.error(
            `🚩 Error al compilar todos los archivos: ${errorMessage}`,
        );

        // Registrar el error en el sistema unificado
        handleCompilationError(
            error instanceof Error ? error : new Error(String(error)),
            'compilación general',
            'all',
            'all',
            env.VERBOSE === 'true',
        );

        // Mostrar resumen incluso si hay errores generales
        displayCompilationSummary(env.VERBOSE === 'true');
    }
}

// Función wrapper para compatibilidad con tests
export async function compileFile(filePath: string) {
    return await initCompile(filePath, true, 'individual');
}
