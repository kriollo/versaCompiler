import chalk from 'chalk';
import { glob, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env, stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';
import { logger } from '../servicios/logger.ts';
import { showTimingForHumans } from '../utils/utils.ts';
import { ESLint, OxLint } from './linter.ts';
import { minifyJS } from './minify.ts';
import { getCodeFile } from './parser.ts';
import { generateTailwindCSS } from './tailwindcss.ts';
import { estandarizaCode } from './transforms.ts';
import { preCompileTS } from './typescript.ts';
import { preCompileVue } from './vuejs.ts';

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
    const file = path
        .normalize(!ruta.startsWith('.') ? './' + ruta : ruta)
        .replace(/\\/g, '/');
    const sourceForDist = file.startsWith('./') ? file : `./${file}`;

    return sourceForDist;
}

export function getOutputPath(ruta: string) {
    const pathSource = env.PATH_SOURCE ?? '';
    const pathDist = env.PATH_DIST ?? '';
    return ruta.replace(pathSource, pathDist).replace(/\.(vue|ts)$/, '.js');
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
        registerInventoryError(inPath, error.message, 'error');
        throw new Error(error.message);
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
            registerInventoryError(inPath, vueResult.message, 'error');
            throw new Error(vueResult.error);
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
            registerInventoryError(inPath, tsResult.error, 'error');
            throw new Error(tsResult.error);
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
            registerInventoryError(inPath, resultMinify.error, 'error');
            throw new Error(resultMinify.error);
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
        logger.error(
            `🚩 :Error al compilar ${ruta}: ${error.message}\n${error.stack}\n`,
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

            const rl = readline.createInterface({ input, output });
            try {
                const answer = await rl.question(
                    '\n\n¿Deseas continuar con la compilación? (s/N): ',
                );
                if (answer.toLowerCase() !== 's') {
                    logger.info('🛑 Compilación cancelada por el usuario.');
                    proceedWithCompilation = false;
                }
            } finally {
                rl.close();
            }
        }
    }
    return proceedWithCompilation;
}

export async function initCompileAll() {
    try {
        const shouldContinue = await runLinter();
        if (!shouldContinue) {
            // Mostrar errores que llevaron a la detención, sin resumen de compilación.
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

        for await (const file of glob(patterns)) {
            if (file.endsWith('.d.ts')) {
                continue;
            }
            await initCompile(
                file.startsWith('./') ? file : `./${file}`,
                false,
            );
        }
        const endTime = Date.now();
        const elapsedTime = showTimingForHumans(endTime - startTime);
        logger.info(`⏱️ :Tiempo de compilación TOTAL: ${elapsedTime}\n`);

        logger.info(`🚀 :Compilación de todos los archivos finalizada.\n`);

        await displayLintingAndCompilationSummary(
            inventoryError,
            inventoryResume,
        );
    } catch (error) {
        logger.error(
            `🚩 :Error al compilar todos los archivos: ${error.message}\n${error.stack}\n`,
        );
    }
}
