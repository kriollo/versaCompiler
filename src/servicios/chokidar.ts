import { readdir, rmdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { env } from 'node:process';

import chalk from 'chalk';
import chokidar from 'chokidar';

import {
    getOutputPath,
    initCompile,
    normalizeRuta,
} from '../compiler/compile.js';
import { promptUser } from '../utils/promptUser.js';

import { emitirCambios } from './browserSync.js';
import { logger } from './logger.js';

// const cacheImportMap = new Map<string, string[]>();
// const cacheComponentMap = new Map<string, string[]>();

export async function cleanOutputDir(
    outputDir: string,
    primerInteraccion: boolean = true,
): Promise<void> {
    try {
        if (!outputDir) {
            throw new Error('El directorio de salida no está definido');
        }

        if (primerInteraccion) {
            const stats = await stat(outputDir).catch(() => null);
            if (!stats || !stats.isDirectory()) {
                logger.error(
                    `🚩 El directorio de salida no existe o no es un directorio: ${outputDir}`,
                );
                return;
            }

            try {
                const answer = await promptUser(
                    '\n\n¿Estás seguro deseas limpiar la carpeta ' +
                        chalk.yellow(outputDir) +
                        '? (s / N) : ',
                );
                if (answer.toLowerCase() !== 's') {
                    logger.info('🛑 Compilación cancelada por el usuario.');
                    process.exit(0);
                }
            } catch (error) {
                logger.error(`Error en la entrada del usuario: ${error}`);
                process.exit(1);
            }
        }

        logger.info(
            `🗑️ Limpiando directorio de salida: ${chalk.yellow(outputDir)}`,
        );
        const items = await readdir(outputDir);
        await Promise.all(
            items.map(async item => {
                const itemPath = path.join(outputDir, item);
                const itemStat = await stat(itemPath);
                if (itemStat.isDirectory()) {
                    await rmdir(itemPath, { recursive: true });
                } else {
                    await unlink(itemPath);
                }
            }),
        );
        logger.info(`✅ Directorio limpiado: ${outputDir}`);
    } catch (error) {
        logger.error(
            `🚩 Error al limpiar directorio de salida: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}

async function deleteFile(filePath: string): Promise<boolean> {
    try {
        await unlink(filePath);
        return true;
    } catch (error) {
        logger.error(
            `🚩 Error eliminando archivo ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
        return false;
    }
}

function getAction(
    ruta: string,
    extendsionWatch: { ext: string; action: string }[],
) {
    const action = extendsionWatch
        .filter(
            (item): item is { ext: string; action: string } =>
                item !== undefined,
        )
        .find(item => item.ext === ruta.split('.').pop())?.action;
    return action || 'reloadFull';
}

export async function initChokidar(bs: any) {
    try {
        if (!env.PATH_SOURCE) {
            logger.error(
                'Error: La variable de entorno PATH_SOURCE no está definida.',
            );
            process.exit(1);
        }
        const watchJS = `${env.PATH_SOURCE}/**/*.js`;
        const watchVue = `${env.PATH_SOURCE}/**/*.vue`;
        const watchTS = `${env.PATH_SOURCE}/**/*.ts`;

        //TODO: agregar watch para CSS
        const watchAditional = JSON.parse(env.aditionalWatch || '[]');
        let fileWatch = [watchJS, watchVue, watchTS, ...watchAditional];

        //extraer sólo las extesniones  de fileWatch
        const accionExtension = {
            vue: 'HRMVue',
            js: 'HRMHelper',
            ts: 'HRMHelper',
        };
        const extendsionWatch = fileWatch.map(item => {
            const ext = item.split('.').pop();
            if (ext) {
                return {
                    ext,
                    action:
                        accionExtension[ext as keyof typeof accionExtension] ||
                        'reloadFull',
                };
            }
        });
        if (extendsionWatch.length === 0 || extendsionWatch[0] === undefined) {
            throw new Error('No se encontraron extensiones para observar');
        }

        const regExtExtension = new RegExp(
            `\\.(?!${extendsionWatch
                .filter(item => item !== undefined)
                .map(item => item!.ext)
                .join('$|')}$).+$`,
        );

        fileWatch = fileWatch.map(item => item.replace(/\/\*\*\//g, '/'));
        const directories = new Map<string, string[]>();
        fileWatch.forEach(item => {
            const dir = item.substring(0, item.lastIndexOf('/'));
            if (!directories.has(dir)) {
                directories.set(dir, []);
            }
            directories.get(dir)!.push(item);
        });
        const DirWatch = Array.from(directories.keys());

        const watcher = chokidar.watch(DirWatch, {
            persistent: true,
            ignoreInitial: true,
            ignored: regExtExtension,
        });

        watcher.on('ready', () => {
            logger.info(
                chalk.green(
                    `👀 : Listo para observar \n${fileWatch
                        .map((item: string) => `${item}`)
                        .join('\n')}\n`,
                ),
            );
        });

        // Evento cuando se añade un archivo
        watcher.on('add', async ruta => {
            const action = getAction(
                ruta,
                extendsionWatch.filter(
                    (item): item is { ext: string; action: string } =>
                        item !== undefined,
                ),
            );
            const result = await initCompile(ruta, true, 'watch');
            if (result.success) {
                let accion = result.action || action;
                accion = accion == 'extension' ? action : accion;
                emitirCambios(bs, accion || 'reloadFull', result.output);
            }
        });

        // Evento cuando se modifica un archivo
        watcher.on('change', async ruta => {
            const action = getAction(
                ruta,
                extendsionWatch.filter(
                    (item): item is { ext: string; action: string } =>
                        item !== undefined,
                ),
            );
            const result = await initCompile(ruta, true, 'watch');
            if (result.success) {
                let accion = result.action || action;
                accion = accion == 'extension' ? action : accion;
                emitirCambios(bs, accion || 'reloadFull', result.output);
            }
        });

        // Evento cuando se elimina un archivo
        watcher.on('unlink', async ruta => {
            logger.info(`🗑️ eliminando archivo: ${ruta}`);
            const result = await deleteFile(getOutputPath(normalizeRuta(ruta)));
            if (result) {
                logger.info(`Archivo eliminado: ${ruta}`);
                emitirCambios(bs, 'reloadFull', ruta);
            }
        });
        return watcher;
    } catch (error) {
        logger.error(
            `🚩 :Error al iniciar watch: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
    }
}
