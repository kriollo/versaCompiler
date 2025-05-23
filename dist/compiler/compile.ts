import chalk from 'chalk';
import { glob, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from 'node:process';
import { Worker } from 'node:worker_threads'; // Añadir esta línea
import { logger } from '../servicios/pino.ts';
import { showTimingForHumans } from '../utils/utils.ts';
import { getCodeFile } from './parser.ts';
import { estandarizaCode } from './transforms.ts';
import { preCompileTS } from './typescript.ts';
import { preCompileVue } from './vuejs.ts';

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

async function compileJS(inPath: string, outPath: string) {
    const extension = path.extname(inPath);
    let { code, error } = await getCodeFile(inPath);
    if (error) {
        throw new Error(error.message);
    }

    if (
        !code ||
        code.trim().length === 0 ||
        code === 'undefined' ||
        code === 'null'
    ) {
        throw new Error('El archivo está vacío o no se pudo leer.');
    }

    //aca se debe pasar de vue a js
    let vueResult;
    if (extension === '.vue') {
        logger.info(chalk.green(`💚 :Precompilando VUE: ${inPath}`));
        vueResult = await preCompileVue(code, inPath, !env.isPROD);
        if (vueResult.error) {
            throw new Error(vueResult.error);
        }
        code = vueResult.data;
    }

    if (
        !code ||
        code.trim().length === 0 ||
        code === 'undefined' ||
        code === 'null'
    ) {
        throw new Error('El archivo está vacío o no se pudo leer.');
    }
    //aca se debe pasar de ts a js
    let tsResult;
    if (extension === '.ts' || vueResult?.lang === 'ts') {
        logger.info(chalk.blue(`🔄️ :Precompilando TS: ${inPath}`));
        tsResult = await preCompileTS(code, inPath);
        if (tsResult.error) {
            throw new Error(tsResult.error);
        }
        code = tsResult.data;
    }
    if (
        !code ||
        code.trim().length === 0 ||
        code === 'undefined' ||
        code === 'null'
    ) {
        throw new Error('El archivo está vacío o no se pudo leer.');
    }

    //aca se debe pasar de js a js
    const resultSTD = await estandarizaCode(code, inPath);
    if (resultSTD.error) {
        throw new Error(resultSTD.error);
    }
    code = resultSTD.code;

    const destinationDir = path.dirname(outPath);
    await mkdir(destinationDir, { recursive: true });
    await writeFile(outPath, code, 'utf-8');

    return {
        error: null,
        action: 'extension',
    };
}

async function execCompileTailwindcss() {
    // Ejecutar generateTailwindCSS en un worker
    const tailwindWorker = new Worker(
        path.resolve(
            env.PATH_PROY || '',
            'dist',
            'compiler',
            'workers',
            'tailwindWorker.ts',
        ),
    );

    tailwindWorker.on('message', message => {
        if (message.success) {
            logger.info('🌬️ :Tailwind CSS generado exitosamente.');
        } else {
            logger.error(`🚩 :Error al generar Tailwind CSS: ${message.error}`);
        }
    });

    tailwindWorker.on('error', error => {
        logger.error(
            `🚩 :Error en el worker de Tailwind CSS: ${error.message}`,
        );
    });

    tailwindWorker.on('exit', code => {
        if (code !== 0) {
            logger.error(
                `🚩 :Worker de Tailwind CSS terminó con código de salida ${code}`,
            );
        }
    });
}

export async function initCompile(ruta: string, compileTailwind = true) {
    try {
        if (compileTailwind) {
            execCompileTailwindcss();
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
        logger.info(`🔚 :Destino para compilar: ${pathDist}`);

        execCompileTailwindcss();

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

        return {
            success: true,
            output: pathDist,
        };
    } catch (error) {
        logger.error(
            `🚩 :Error al compilar todos los archivos: ${error.message}\n${error.stack}\n`,
        );
        return {
            success: false,
            output: '',
        };
    }
}
