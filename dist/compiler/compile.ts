import chalk from 'chalk';
import { glob, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from 'node:process';
import { setTimeout } from 'node:timers';
import { logger } from '../servicios/pino.ts';
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

        logger.info(`🔜 :Fuente para compilar: ${file}`);

        const result = await compileJS(file, outFile);
        if (result.error) {
            throw new Error(result.error);
        }

        const endTime = Date.now();
        const elapsedTime = showTimingForHumans(endTime - startTime);
        logger.info(`🔚 :Destino para publicar: ${outFile}`);
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

export async function runLinter(showResult: boolean = false) {
    const linterENV = env.linter;
    if (
        typeof linterENV === 'string' &&
        linterENV.trim() !== '' &&
        env.ENABLE_LINTER !== 'false'
    ) {
        logger.info('🔍 Ejecutando linting...');
        const linterPromises: Promise<void>[] = []; // Array para almacenar las promesas de los linters

        const parsedLinterEnv = JSON.parse(linterENV);
        if (Array.isArray(parsedLinterEnv)) {
            // Asegurarse que el parseo resulta en un array
            for (const item of parsedLinterEnv) {
                if (item.name.toLowerCase() === 'eslint') {
                    logger.info(
                        `🔧 Ejecutando ESLint con config: ${item.configFile || 'por defecto'}`,
                    );
                    const eslintPromise = ESLint(item)
                        .then(eslintResult => {
                            if (eslintResult && eslintResult.json) {
                                // Comprobar si eslintResult.json es directamente el array de mensajes (versiones antiguas)
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
                                    // Comprobar la estructura con `results` (versiones más nuevas de ESLint)
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
                await console.table(inventoryError, [
                    'file',
                    'message',
                    'severity',
                    'help',
                ]);
            }
        }
    }
}

export async function initCompileAll() {
    try {
        const startTime = Date.now();
        const rawPathSource = env.PATH_SOURCE ?? '';
        const pathDist = env.PATH_DIST ?? '';

        // Normalizar la ruta para usar barras inclinadas en patrones glob
        const normalizedGlobPathSource = rawPathSource.replace(/\\/g, '/');

        const patterns = [
            `${normalizedGlobPathSource}/**/*.js`,
            `${normalizedGlobPathSource}/**/*.vue`,
            `${normalizedGlobPathSource}/**/*.ts`,
        ];

        logger.info(`📝 :Compilando todos los archivos...`);
        logger.info(`🔜 :Fuente para compilar (original): ${rawPathSource}`);
        logger.info(`🔚 :Destino para compilar: ${pathDist}\n`);

        // execCompileTailwindcss();
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

        await runLinter();

        setTimeout(() => {
            logger.info(`🚀 :Compilación de todos los archivos finalizada.\n`);
        }, 1000);

        if (inventoryError.length > 0) {
            await console.table(inventoryError, [
                'file',
                'message',
                'severity',
                'help',
            ]);
        }
        if (inventoryResume.length > 0) {
            await console.table(inventoryResume, ['tipo', 'result']);
        }
    } catch (error) {
        logger.error(
            `🚩 :Error al compilar todos los archivos: ${error.message}\n${error.stack}\n`,
        );
    }
}
