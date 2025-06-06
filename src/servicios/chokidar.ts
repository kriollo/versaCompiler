import { readdir, rmdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { env } from 'node:process';

import chokidar from 'chokidar';

import { WatchModeOptimizer } from '../compiler/compile';
import { TypeScriptWorkerManager } from '../compiler/typescript-worker';
import { promptUser } from '../utils/promptUser.js';

import { logger } from './logger.js';

// Lazy loading para chalk
let chalk: any;
async function loadChalk() {
    if (!chalk) {
        chalk = (await import('chalk')).default;
    }
    return chalk;
}

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
                if (env.yes === 'false') {
                    const chalkInstance = await loadChalk();
                    const answer = await promptUser(
                        '\n\n¿Estás seguro deseas limpiar la carpeta ' +
                            chalkInstance.yellow(outputDir) +
                            '? (s / N) : ',
                    );
                    if (answer.toLowerCase() !== 's') {
                        logger.info('🛑 Compilación cancelada por el usuario.');
                        process.exit(0);
                    }
                }
            } catch (error) {
                logger.error(`Error en la entrada del usuario: ${error}`);
                process.exit(1);
            }
        }
        const chalkInstance = await loadChalk();
        logger.info(
            `🗑️ Limpiando directorio de salida: ${chalkInstance.yellow(outputDir)}\n`,
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

export async function initChokidar(
    bs: any,
    compileFn: (file: string) => Promise<any>,
): Promise<any> {
    const optimizer = WatchModeOptimizer.getInstance();
    // Precargar módulos para modo watch si es necesario
    const workerManager = TypeScriptWorkerManager.getInstance();
    workerManager.setMode('watch');

    const watcher = chokidar.watch('src/**/*.{js,ts,vue}', {
        ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/dist/**',
            '**/*.d.ts',
        ],
        persistent: true,
        ignoreInitial: true,
        usePolling: false,
        interval: 300,
        binaryInterval: 1000,
        awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 50,
        },
    });

    watcher.on('change', async (filePath: string) => {
        try {
            const result = await optimizer.compileForWatch(filePath, compileFn);
            if (result.cached) {
                console.info(`⚡ Sin cambios: ${filePath}`);
                return;
            }
            if (result.success) {
                console.info(`✅ Actualizado: ${filePath}`);
                if (bs) bs.reload();
            } else {
                console.error(`❌ Error: ${filePath}`);
            }
        } catch (error) {
            console.error(`Error compilando ${filePath}:`, error);
        }
    });

    // Cleanup al cerrar
    const originalClose = watcher.close.bind(watcher);
    watcher.close = async () => {
        optimizer.cleanup();
        await workerManager.terminate();
        return originalClose();
    };

    return watcher;
}
