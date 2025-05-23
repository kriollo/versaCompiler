import chalk from 'chalk';
import { glob, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from 'node:process';
import { logger } from '../servicios/pino.ts';
import { showTimingForHumans } from '../utils/utils.ts';
import { OxLint } from './linter.ts';
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
        logger.info(chalk.green(`💚 :Precompilando VUE: ${inPath}`));
        vueResult = await preCompileVue(code, inPath, !env.isPROD);
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
        logger.info(chalk.blue(`🔄️ :Precompilando TS: ${inPath}`));
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

    if (!env.isPROD) {
        const resultMinify = await minifyJS(code, inPath, !env.isPROD);
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
        if (compileTailwind) {
            const resultTW = await generateTailwindCSS();
            if (resultTW) {
                logger.info(`💚 :Compilando Tailwind CSS...`);
            } else {
                logger.info(`❌ :No se pudo compilar Tailwind CSS...`);
            }
        }
        const startTime = Date.now();
        const file = normalizeRuta(ruta);
        const outFile = getOutputPath(file);
        logger.info(`📝 :Compilando archivo: ${file}`);

        logger.info(`🔜 :Fuente para compilar: ${file}`);
        logger.info(`🔚 :Destino para compilar: ${outFile}`);

        const result = await compileJS(file, outFile);
        if (result.error) {
            throw new Error(result.error);
        }

        const endTime = Date.now();
        const elapsedTime = showTimingForHumans(endTime - startTime);
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
        if (resultTW) {
            logger.info(`💚 :Compilando Tailwind CSS...`);
        } else {
            logger.info(`❌ :No se pudo compilar Tailwind CSS...`);
        }

        // await linter(env.PATH_SOURCE ?? '');

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
        logger.info(`⏱️ :Tiempo de compilación TOTAL: ${elapsedTime}`);

        const result = await OxLint();
        if (result) {
            for (const file of JSON.parse(result)) {
                inventoryError.push({
                    severity: 'Linter_' + file.severity,
                    message: file.message,
                    file: file.filename,
                    help: file.help,
                });
            }
        }

        console.table(inventoryResume, ['tipo', 'result']);
        if (inventoryError.length > 0) {
            console.table(inventoryError, [
                'file',
                'message',
                'severity',
                'help',
            ]);
        }
    } catch (error) {
        logger.error(
            `🚩 :Error al compilar todos los archivos: ${error.message}\n${error.stack}\n`,
        );
    }
}
