import { createHash } from 'node:crypto';
import { glob, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { env } from 'node:process';
import { fileURLToPath } from 'node:url';

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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

    logger.info(chalk.bold('--- Errores y Advertencias de Linting ---\n'));

    // Agrupar errores por archivo
    const errorsByFile = new Map<string, InventoryError[]>();
    errors.forEach(error => {
        if (!errorsByFile.has(error.file)) {
            errorsByFile.set(error.file, []);
        }
        errorsByFile.get(error.file)!.push(error);
    });

    // Mostrar errores agrupados por archivo
    errorsByFile.forEach((fileErrors, filePath) => {
        // Mostrar nombre del archivo
        logger.info(chalk.cyan(`📁 ${filePath}`));

        fileErrors.forEach((error, index) => {
            // Determinar el icono según la severidad
            const icon =
                error.severity === 'error'
                    ? '❌'
                    : error.severity === 'warning'
                      ? '⚠️'
                      : 'ℹ️';

            // Si el mensaje ya está formateado (como los de TypeScript), mostrarlo tal como está
            if (error.message.includes('\n') && error.message.includes('└─')) {
                // Es un mensaje ya formateado (TypeScript)
                logger.info(`${error.message}`);
            } else {
                // Es un mensaje simple (linting normal)
                logger.info(`${icon} ${error.message}`);
                if (error.help) {
                    logger.info(`   └─ ${error.help}`);
                }
            }

            // Agregar línea en blanco entre errores (excepto el último)
            if (index < fileErrors.length - 1) {
                logger.info('');
            }
        });

        // Línea en blanco entre archivos
        logger.info('');
    });

    logger.info(chalk.bold('--- Fin de Errores y Advertencias ---\n'));
}

async function displayLintingAndCompilationSummary(
    errors: InventoryError[],
    resume: InventoryResume[],
): Promise<void> {
    logger.info(''); // Línea en blanco para separación

    // 🔍 Mostrar errores del linter y compilación si existen
    if (errors.length > 0) {
        displayLintErrors(errors);
    } else {
        logger.info(
            chalk.green(
                '✅ No se encontraron errores durante linting y compilación.\n',
            ),
        );
    }

    // 📊 Mostrar resumen de compilación si existe
    if (resume.length > 0) {
        logger.info(chalk.bold('--- Resumen de Compilación ---'));
        await logger.table(resume, ['tipo', 'result']);
        logger.info(chalk.bold('--- Fin del Resumen de Compilación ---\n'));
    } else {
        logger.info(
            chalk.yellow(
                '⚠️ No hay datos de resumen de compilación disponibles.\n',
            ),
        );
    }

    // 📈 Mostrar estadísticas generales
    const errorCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;
    const totalFiles = resume.reduce((total, item) => {
        if (item.result && typeof item.result === 'object') {
            return total + (item.result.success || 0);
        }
        return total;
    }, 0);

    logger.info(chalk.bold('--- Estadísticas Finales ---'));
    logger.info(`📁 Archivos procesados: ${totalFiles}`);
    logger.info(`❌ Errores encontrados: ${errorCount}`);
    logger.info(`⚠️ Advertencias encontradas: ${warningCount}`);

    if (errorCount === 0 && warningCount === 0) {
        logger.info(chalk.green('🎉 ¡Compilación exitosa sin errores!'));
    } else if (errorCount === 0) {
        logger.info(
            chalk.yellow('✅ Compilación completada con advertencias.'),
        );
    } else {
        logger.info(
            chalk.red(
                '🚨 Compilación completada con errores que requieren atención.',
            ),
        );
    }
    logger.info(chalk.bold('--- Fin de Estadísticas ---\n'));
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

/**
 * Registra errores de TypeScript usando el parser limpio para obtener mensajes más legibles
 */
function registerTypeScriptError(error: Error, fileName: string) {
    // Para evitar duplicación, no registrar el error aquí ya que se muestra inmediatamente
    // Solo registrar si hay un sistema de recolección de errores diferido
    const errorMessage = error.message;

    // Si el error contiene información estructurada de TypeScript, usarla
    if (error.stack && error.stack.includes('TypeScript')) {
        // Para errores ya procesados por nuestro parser, simplemente registrar sin duplicar
        registerInventoryError(
            fileName,
            errorMessage,
            'error',
            'Error de compilación TypeScript',
        );
    } else {
        // Para otros errores de TypeScript, registrar normalmente
        registerInventoryError(
            fileName,
            errorMessage,
            'error',
            'Error de compilación TypeScript',
        );
    }
}

/**
 * Maneja y muestra errores de TypeScript con diferentes niveles de verbosidad
 */
function handleTypeScriptError(
    error: Error,
    fileName: string,
    mode: CompilationMode,
    isVerbose: boolean = false,
): void {
    // Registrar el error para el resumen final
    registerInventoryResume('preCompileTS', 1, 0);

    // En modo individual y watch, mostrar inmediatamente
    if (mode === 'individual' || mode === 'watch') {
        if (isVerbose) {
            // Modo verbose: Mostrar error completo con contexto
            logger.error(
                chalk.red(`❌ Error al compilar TypeScript ${fileName}:`),
            );
            logger.error(chalk.red(error.message));
        } else {
            // Modo normal: Mostrar error simplificado
            const errorMessage = error.message;
            const firstLine = errorMessage.split('\n')[0];
            const baseName = path.basename(fileName);

            logger.error(
                chalk.red(`❌ Error de tipos en ${baseName}: ${firstLine}`),
            );
            logger.info(
                chalk.yellow(`💡 Usa --verbose para ver detalles completos`),
            );
        }
    }

    // No duplicar en el inventory si ya se mostró inmediatamente
    if (mode !== 'all') {
        registerTypeScriptError(error, fileName);
    }
}

type CompilationMode = 'all' | 'individual' | 'watch';

async function compileJS(
    inPath: string,
    outPath: string,
    mode: CompilationMode = 'individual',
) {
    const extension = path.extname(inPath);
    let { code, error } = await getCodeFile(inPath);
    if (error) {
        registerInventoryResume('getCodeFile', 1, 0);
        registerInventoryError(
            inPath,
            error instanceof Error ? error.message : String(error),
            'error',
        );

        // Solo mostrar errores inmediatamente en modo individual y watch
        if (mode === 'individual' || mode === 'watch') {
            logger.error(
                chalk.red(
                    `❌ Error al leer archivo ${inPath}: ${error instanceof Error ? error.message : String(error)}`,
                ),
            );
        }

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

        // Solo mostrar errores inmediatamente en modo individual y watch
        if (mode === 'individual' || mode === 'watch') {
            logger.error(
                chalk.red(
                    `❌ El archivo ${inPath} está vacío o no se pudo leer.`,
                ),
            );
        }

        throw new Error('El archivo está vacío o no se pudo leer.');
    } // Mostrar logs organizados solo en modo verbose
    const shouldShowDetailedLogs =
        env.VERBOSE === 'true' && env.isAll === 'true' && mode === 'all'; //aca se debe pasar de vue a js
    let vueResult;
    if (extension === '.vue') {
        if (shouldShowDetailedLogs)
            logger.info(chalk.green(`💚 :Precompilando VUE\n${inPath}`));

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
            if (mode === 'individual' || mode === 'watch') {
                logger.error(
                    chalk.red(
                        `❌ Error al compilar Vue ${inPath}: ${vueResult.error instanceof Error ? vueResult.error.message : String(vueResult.error)}`,
                    ),
                );
            }
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
    } //aca se debe pasar de ts a js
    let tsResult;
    if (extension === '.ts' || vueResult?.lang === 'ts') {
        if (shouldShowDetailedLogs)
            logger.info(chalk.blue(`🔄️ :Precompilando TS\n${inPath}`));
        tsResult = await preCompileTS(code, inPath);
        if (tsResult.error) {
            handleTypeScriptError(
                tsResult.error,
                inPath,
                mode,
                env.VERBOSE === 'true',
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
        logger.info(chalk.yellow(`💛 :Estandarizando\n${inPath}`));
    const resultSTD = await estandarizaCode(code, inPath);
    if (resultSTD.error) {
        registerInventoryResume('estandarizaCode', 1, 0);
        registerInventoryError(inPath, resultSTD.error, 'error');

        // Solo mostrar errores inmediatamente en modo individual y watch
        if (mode === 'individual' || mode === 'watch') {
            logger.error(
                chalk.red(
                    `❌ Error al estandarizar código ${inPath}: ${resultSTD.error}`,
                ),
            );
        }

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
            logger.info(chalk.red(`🤖 :Minificando\n${inPath}`));
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

            // Solo mostrar errores inmediatamente en modo individual y watch
            if (mode === 'individual' || mode === 'watch') {
                logger.error(
                    chalk.red(
                        `❌ Error al minificar ${inPath}: ${resultMinify.error instanceof Error ? resultMinify.error.message : String(resultMinify.error)}`,
                    ),
                );
            }

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

export async function initCompile(
    ruta: string,
    compileTailwind = true,
    mode: CompilationMode = 'individual',
) {
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

        const result = await compileJS(file, outFile, mode);
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

        // No mostrar errores duplicados - ya se manejan en handleTypeScriptError y otras funciones específicas
        // Solo para errores que no sean de TypeScript o en modo 'all'
        if (
            mode === 'all' ||
            (!errorMessage.includes('Type ') && !errorMessage.includes('TS2'))
        ) {
            logger.error(`🚩 Error al compilar ${ruta}: ${errorMessage}`);
        }

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
        } // Preguntar al usuario si desea continuar cuando se encuentren errores
        if (!showResult && inventoryError.length > 0) {
            // Mostrar errores antes de preguntar
            displayLintErrors(inventoryError);
            logger.warn(
                '🚨 Se encontraron errores o advertencias durante el linting.',
            );

            const result = await promptUser(
                '¿Deseas continuar con la compilación a pesar de los errores de linting? (s/N): ',
            );
            if (result.toLowerCase() !== 's') {
                logger.info('🛑 Compilación cancelada por el usuario.');
                proceedWithCompilation = false;
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

    logger.info(`📊 Iniciando compilación de ${total} archivos...\n`);

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

            const result = await initCompile(file, false, 'all'); // Pasar modo 'all' para compilación masiva
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
    logger.log(`\n`);
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
    return await initCompile(filePath, true, 'individual');
}
