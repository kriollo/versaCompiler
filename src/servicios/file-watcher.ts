import { readdir, rm, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import process, { env } from 'node:process';

import * as chokidar from 'chokidar';
import { minimatch } from 'minimatch';

import { getOutputPath, initCompile, normalizeRuta } from '../compiler/compile';
import { promptUser } from '../utils/promptUser';

import { emitirCambios } from './browserSync';
import { logger } from './logger';

// Lazy loading para chalk
let chalk: any;
async function loadChalk() {
    if (!chalk) {
        chalk = (await import('chalk')).default;
    }
    return chalk;
}

// ✨ NUEVO: Sistema de debouncing optimizado para watch mode
interface PendingChange {
    filePath: string;
    action: 'add' | 'change' | 'unlink';
    timestamp: number;
    extensionAction: string;
    isAdditionalFile: boolean; // ✨ NUEVO: Indica si es un archivo adicional (no compilable)
}

class WatchDebouncer {
    private pendingChanges = new Map<string, PendingChange>();
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly DEBOUNCE_DELAY = 300; // 300ms debounce
    private readonly BATCH_SIZE = 10; // Máximo archivos por batch
    private isProcessing = false;
    private browserSyncInstance: any = null; // ✨ Almacenar referencia a browserSync

    /**
     * Establece la instancia de browserSync
     */
    setBrowserSyncInstance(bs: any): void {
        this.browserSyncInstance = bs;
    }

    /**
     * Añade un cambio al sistema de debouncing
     */
    addChange(
        filePath: string,
        action: 'add' | 'change' | 'unlink',
        extensionAction: string,
        isAdditionalFile: boolean = false,
    ): void {
        // Normalizar ruta para evitar duplicados
        const normalizedPath = normalizeRuta(filePath);

        // Agregar o actualizar el cambio pendiente
        this.pendingChanges.set(normalizedPath, {
            filePath: normalizedPath,
            action,
            timestamp: Date.now(),
            extensionAction,
            isAdditionalFile,
        });

        // Reiniciar el timer de debounce
        this.resetDebounceTimer();
    }

    /**
     * Reinicia el timer de debounce
     */
    private resetDebounceTimer(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            this.processPendingChanges();
        }, this.DEBOUNCE_DELAY);
    }

    /**
     * Procesa todos los cambios pendientes en batch
     */
    private async processPendingChanges(): Promise<void> {
        if (this.isProcessing || this.pendingChanges.size === 0) {
            return;
        }

        this.isProcessing = true;
        const changes = Array.from(this.pendingChanges.values());
        this.pendingChanges.clear();

        try {
            // Agrupar por tipo de acción para optimización
            const deleteChanges = changes.filter(c => c.action === 'unlink');
            const compileChanges = changes.filter(
                c => c.action === 'add' || c.action === 'change',
            );

            // Procesar eliminaciones primero
            if (deleteChanges.length > 0) {
                await this.processDeleteChanges(deleteChanges);
            }

            // Procesar compilaciones en batches
            if (compileChanges.length > 0) {
                await this.processCompileChanges(compileChanges);
            }
        } catch (error) {
            const chalkInstance = await loadChalk();
            logger.error(
                chalkInstance.red(
                    `🚩 Error procesando cambios en batch: ${error instanceof Error ? error.message : String(error)}`,
                ),
            );
        } finally {
            this.isProcessing = false;

            // Si hay más cambios pendientes, procesarlos
            if (this.pendingChanges.size > 0) {
                this.resetDebounceTimer();
            }
        }
    } /**
     * Procesa cambios de eliminación
     */
    private async processDeleteChanges(
        deleteChanges: PendingChange[],
    ): Promise<void> {
        for (const change of deleteChanges) {
            if (change.isAdditionalFile) {
                // ✨ Archivos adicionales: solo reload, sin eliminar del output
                logger.info(
                    `\n🗑️ Archivo adicional eliminado: ${change.filePath}`,
                );
                emitirCambios(
                    this.browserSyncInstance,
                    'reloadFull',
                    change.filePath,
                );
            } else {
                // Archivos compilables: eliminar del output
                logger.info(
                    `\n🗑️ Eliminando archivo compilado: ${change.filePath}`,
                );
                const result = await deleteFile(getOutputPath(change.filePath));
                if (result) {
                    logger.info(`Archivo eliminado: ${change.filePath}`);
                    emitirCambios(
                        this.browserSyncInstance,
                        'reloadFull',
                        change.filePath,
                    );
                }
            }
        }
    }

    /**
     * Procesa cambios de compilación en paralelo con límite de concurrencia
     */
    private async processCompileChanges(
        compileChanges: PendingChange[],
    ): Promise<void> {
        // ✨ NUEVO: Separar archivos adicionales de archivos compilables
        const additionalFiles = compileChanges.filter(c => c.isAdditionalFile);
        const compilableFiles = compileChanges.filter(c => !c.isAdditionalFile);

        // ✨ Procesar archivos adicionales (solo reload, sin compilación)

        if (additionalFiles.length > 0) {
            await this.processAdditionalFiles(additionalFiles);
        }
        // Procesar archivos compilables normalmente
        if (compilableFiles.length > 0) {
            await this.processCompilableFiles(compilableFiles);
        }
    }

    /**
     * ✨ RENOMBRADO: Procesa archivos compilables
     */
    async processCompilableFiles(
        compilableFiles: PendingChange[],
    ): Promise<void> {
        const chalkInstance = await loadChalk();

        // Procesar en batches para evitar sobrecarga
        for (let i = 0; i < compilableFiles.length; i += this.BATCH_SIZE) {
            const batch = compilableFiles.slice(i, i + this.BATCH_SIZE);

            if (batch.length > 1) {
                logger.info(
                    chalkInstance.cyan(
                        `📦 Procesando batch de ${batch.length} archivos compilables (${i + 1}-${Math.min(i + this.BATCH_SIZE, compilableFiles.length)} de ${compilableFiles.length})`,
                    ),
                );
            }

            const promises = batch.map(change => this.compileFile(change));
            await Promise.allSettled(promises);
        }

        if (compilableFiles.length > 1) {
            logger.info(
                chalkInstance.green(
                    `✅ Batch completado: ${compilableFiles.length} archivos compilados`,
                ),
            );
        }
    }

    /**
     * ✨ NUEVO: Procesa archivos adicionales (solo reloadFull)
     */
    async processAdditionalFiles(
        additionalFiles: PendingChange[],
    ): Promise<void> {
        const chalkInstance = await loadChalk();

        logger.info(
            chalkInstance.blue(
                `🔄 Recargando ${additionalFiles.length} archivo(s) adicional(es) (sin compilación)`,
            ),
        );

        for (const change of additionalFiles) {
            logger.info(`📄 Archivo adicional modificado: ${change.filePath}`);
            // Solo hacer reloadFull, sin compilación
            emitirCambios(
                this.browserSyncInstance,
                'reloadFull',
                change.filePath,
            );
        }
    }

    /**
     * Compila un archivo individual
     */
    private async compileFile(change: PendingChange): Promise<void> {
        try {
            const result = await initCompile(change.filePath, true, 'watch');
            if (result.success) {
                let accion = result.action || change.extensionAction;
                accion =
                    accion === 'extension' ? change.extensionAction : accion;
                emitirCambios(
                    this.browserSyncInstance,
                    accion || 'reloadFull',
                    result.output,
                );
            }
        } catch (error) {
            const chalkInstance = await loadChalk();
            logger.error(
                chalkInstance.red(
                    `🚩 Error compilando ${change.filePath}: ${error instanceof Error ? error.message : String(error)}`,
                ),
            );
        }
    }

    /**
     * Obtiene estadísticas del debouncer
     */
    getStats(): {
        pendingChanges: number;
        isProcessing: boolean;
        hasTimer: boolean;
    } {
        return {
            pendingChanges: this.pendingChanges.size,
            isProcessing: this.isProcessing,
            hasTimer: this.debounceTimer !== null,
        };
    }
}

// Instancia global del debouncer
const watchDebouncer = new WatchDebouncer();

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
                    await rm(itemPath, { recursive: true });
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

/**
 * Verifica si un archivo pertenece a las rutas adicionales (no compilables)
 */
function isAdditionalWatchFile(
    filePath: string,
    additionalPatterns: string[],
): boolean {
    if (!additionalPatterns || additionalPatterns.length === 0) {
        return false;
    }

    const normalizedPath = normalizeRuta(filePath);

    return additionalPatterns.some(pattern => {
        // Normalizar el patrón también
        const normalizedPattern = pattern.replace(/\\/g, '/');
        return minimatch(normalizedPath, normalizedPattern);
    });
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
        const watchCJS = `${env.PATH_SOURCE}/**/*.cjs`;
        const watchMJS = `${env.PATH_SOURCE}/**/*.mjs`;

        //TODO: agregar watch para CSS
        const watchAditional = JSON.parse(env.aditionalWatch || '[]');
        let fileWatch = [
            watchJS,
            watchVue,
            watchTS,
            watchCJS,
            watchMJS,
            ...watchAditional,
        ];

        //extraer sólo las extesniones  de fileWatch
        const accionExtension = {
            vue: 'HRMVue',
            js: 'HRMHelper',
            ts: 'HRMHelper',
            cjs: 'HRMHelper',
            mjs: 'HRMHelper',
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
        watcher.on('ready', async () => {
            const chalkInstance = await loadChalk();
            logger.info(
                chalkInstance.green(
                    `👀 : Listo para observar \n${fileWatch
                        .map((item: string) => `${item}`)
                        .join('\n')}\n`,
                ),
            );
        });

        // ✨ CONFIGURAR: Establecer la instancia de browserSync en el debouncer
        watchDebouncer.setBrowserSyncInstance(bs);

        // ✨ OPTIMIZADO: Evento cuando se añade un archivo - Con debouncing
        watcher.on('add', async ruta => {
            const isAdditional = isAdditionalWatchFile(ruta, watchAditional);
            const action = getAction(
                ruta,
                extendsionWatch.filter(
                    (item): item is { ext: string; action: string } =>
                        item !== undefined,
                ),
            );

            // Usar sistema de debouncing en lugar de compilación inmediata
            watchDebouncer.addChange(ruta, 'add', action, isAdditional);
        });

        // ✨ OPTIMIZADO: Evento cuando se modifica un archivo - Con debouncing
        watcher.on('change', async ruta => {
            const isAdditional = isAdditionalWatchFile(ruta, watchAditional);
            const action = getAction(
                ruta,
                extendsionWatch.filter(
                    (item): item is { ext: string; action: string } =>
                        item !== undefined,
                ),
            );

            // Usar sistema de debouncing en lugar de compilación inmediata
            watchDebouncer.addChange(ruta, 'change', action, isAdditional);
        });

        // ✨ OPTIMIZADO: Evento cuando se elimina un archivo - Con debouncing
        watcher.on('unlink', async ruta => {
            const action = getAction(
                ruta,
                extendsionWatch.filter(
                    (item): item is { ext: string; action: string } =>
                        item !== undefined,
                ),
            );
            const isAdditional = isAdditionalWatchFile(ruta, watchAditional);

            // Usar sistema de debouncing para eliminaciones también
            watchDebouncer.addChange(ruta, 'unlink', action, isAdditional);
        });
        return watcher;
    } catch (error) {
        logger.error(
            `🚩 :Error al iniciar watch: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
    }
}
