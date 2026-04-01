import { readdir, readFile, rm, stat, unlink } from 'node:fs/promises';
import * as path from 'node:path';
import * as process from 'node:process';
const { env } = process;

import * as chokidar from 'chokidar';
import { minimatch } from 'minimatch';

import {
    clearCompilationState,
    getOutputPath,
    getPipelineModuleGraph,
    initCompile,
    normalizeRuta,
    runPipelineHotUpdate,
} from '../compiler/compile';
import { promptUser } from '../utils/promptUser';

import { emitirCambios, registerHMRUpdate } from './browserSync';
import { logger } from './logger';

// Lazy loading para chalk
let chalk: any;
async function loadChalk() {
    if (!chalk) {
        chalk = (await import('chalk')).default;
    }
    return chalk;
}

/**
 * Analiza el contenido de un módulo JS compilado para determinar si es seguro
 * hacer HMR sin full-reload. Un módulo es "simple" si:
 * - Solo exporta funciones, constantes o valores (no clases con estado ni patrones singleton)
 * - No usa new/class en el scope raíz (como estado global mutable)
 *
 * @param outputPath - Ruta del archivo compilado a analizar
 * @returns 'propagate' si es seguro sin full-reload, 'full-reload' si no se puede determinar
 */
async function analyzeCompiledModuleStrategy(
    outputPath: string,
): Promise<'propagate' | 'full-reload'> {
    try {
        const content = await readFile(outputPath, 'utf8');

        // Si el módulo fue compilado por VersaCompiler en modo dev, el shim HMR
        // está inyectado y gestiona la estrategia de reemplazo vía versaHMR.
        // No analizar el shim como side-effect — siempre es propagate.
        if (content.startsWith('/* VersaCompiler HMR shim [dev] */')) {
            return 'propagate';
        }

        // Si el módulo declara que acepta HMR, propagate es seguro
        if (/import\.meta\.hot\.accept/.test(content)) {
            return 'propagate';
        }

        // Heurística: módulos con solo exports de funciones/constantes son seguros
        const hasExports =
            /export\s+(const|let|function|async function|class\b)/.test(
                content,
            ) || /export\s+default/.test(content);

        if (!hasExports) {
            return 'full-reload';
        }

        // Señales de estado global mutable o efectos secundarios al import:
        // new ClassName() en scope raíz, módulos con side-effects de init
        const hasRootLevelSideEffects =
            // new en scope raíz (fuera de funciones/clases) — detectar heurísticamente
            /^\s*(?:const|let|var)\s+\w+\s*=\s*new\s+\w+/m.test(content) ||
            // Llamadas a funciones en scope raíz que sugieren init
            /^\s*(?:init|setup|bootstrap|start|connect|register)\s*\(/m.test(
                content,
            );

        if (hasRootLevelSideEffects) {
            return 'full-reload';
        }

        return 'propagate';
    } catch {
        return 'full-reload';
    }
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
    private readonly DEBOUNCE_DELAY = 50; // ✨ OPTIMIZACIÓN: 50ms para hot reload más responsive
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
     * ✨ FIX #3: Limpia todos los recursos del debouncer
     */
    cleanup(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        this.pendingChanges.clear();
        this.isProcessing = false;
        this.browserSyncInstance = null;
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

        // Limpiar errores del ciclo anterior para evitar memory leak en watch mode
        clearCompilationState();

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
        const graph = getPipelineModuleGraph();

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

            const expandedChanges = new Map<string, PendingChange>();

            for (const change of batch) {
                expandedChanges.set(change.filePath, change);

                if (graph) {
                    const invalidated = graph.invalidate(change.filePath);
                    for (const invalidatedPath of invalidated) {
                        if (expandedChanges.has(invalidatedPath)) continue;
                        // Usar la acción correcta según la extensión del archivo invalidado
                        // en lugar de forzar 'reloadFull' para todos los importers
                        const invalidatedExt = path
                            .extname(invalidatedPath)
                            .replace('.', '');
                        const invalidatedAction =
                            (
                                {
                                    vue: 'HRMVue',
                                    ts: 'HRMHelper',
                                    js: 'HRMHelper',
                                    mjs: 'HRMHelper',
                                    cjs: 'HRMHelper',
                                } as Record<string, string>
                            )[invalidatedExt] ?? 'reloadFull';
                        expandedChanges.set(invalidatedPath, {
                            filePath: invalidatedPath,
                            action: 'change',
                            timestamp: Date.now(),
                            extensionAction: invalidatedAction,
                            isAdditionalFile: false,
                        });
                    }
                }
            }

            const promises = Array.from(expandedChanges.values()).map(change =>
                this.compileFile(change),
            );
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
            let pluginHmrReload: 'none' | 'module' | 'full' = 'none';
            if (change.action !== 'unlink') {
                const hotUpdate = await runPipelineHotUpdate(
                    change.filePath,
                    change.action,
                );
                pluginHmrReload = hotUpdate.reload || 'none';
            }
            const result = await initCompile(change.filePath, true, 'watch');
            if (result.success) {
                // Registrar el output para que el middleware HMR reescriba imports dependientes
                if (result.output) {
                    registerHMRUpdate(result.output);
                }
                let accion = result.action || change.extensionAction;
                accion =
                    accion === 'extension' ? change.extensionAction : accion;
                let payload: Record<string, any> = {};
                if (accion === 'HRMHelper') {
                    if (pluginHmrReload === 'full') {
                        accion = 'reloadFull';
                    } else {
                        const graph = getPipelineModuleGraph();
                        const node = graph?.getNode(change.filePath);
                        const importers = node
                            ? Array.from(node.importers)
                            : [];

                        // Determinar estrategia base:
                        // Si el plugin dice 'module' → propagate garantizado
                        // Si hay importers conocidos → propagate (los consumers actualizarán sus refs)
                        // Si no hay importers → analizar el módulo compilado para detectar si es "simple"
                        let strategy: 'propagate' | 'full-reload';
                        if (pluginHmrReload === 'module') {
                            strategy = 'propagate';
                        } else if (importers.length > 0) {
                            strategy = 'propagate';
                        } else {
                            // Sin importers conocidos: analizar el output compilado
                            strategy = await analyzeCompiledModuleStrategy(
                                result.output,
                            );
                        }

                        // moduleId: path del output relativo al proyecto para que el cliente
                        // pueda hacer lookup en VersaModuleRegistry
                        const moduleId = result.output.startsWith('/')
                            ? result.output
                            : `/${result.output}`;

                        payload = {
                            moduleId,
                            importers,
                            strategy,
                        };
                    }
                }
                emitirCambios(
                    this.browserSyncInstance,
                    accion || 'reloadFull',
                    result.output,
                    payload,
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
                        if (process.env.NODE_ENV !== 'test') {
                            process.exit(0);
                        }
                        return;
                    }
                }
            } catch (error) {
                logger.error(`Error en la entrada del usuario: ${error}`);
                if (process.env.NODE_ENV !== 'test') {
                    process.exit(1);
                }
                throw error;
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
            if (process.env.NODE_ENV !== 'test') {
                process.exit(1);
            }
            throw new Error('PATH_SOURCE no está definida');
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

        // ✨ OPTIMIZACIÓN: Pre-cargar módulos críticos al iniciar el watcher
        watcher.on('ready', async () => {
            const chalkInstance = await loadChalk();
            logger.info(
                chalkInstance.green(
                    `👀 : Listo para observar \n${fileWatch.map((item: string) => `${item}`).join('\n')}\n`,
                ),
            );

            // Pre-cargar módulos críticos para primera compilación más rápida
            setImmediate(async () => {
                try {
                    // Pre-cargar módulos básicos que se usarán en compilación
                    await Promise.all([
                        import('../compiler/compile'),
                        import('../compiler/parser'),
                    ]);
                } catch {
                    // Ignorar errores de pre-carga, no son críticos
                }
            });
        });

        // ✨ CONFIGURAR: Establecer la instancia de browserSync en el debouncer
        watchDebouncer.setBrowserSyncInstance(bs);

        // ✨ OPTIMIZADO: Evento cuando se añade un archivo - Con debouncing
        watcher.on('add', async (ruta: string) => {
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
        watcher.on('change', async (ruta: string) => {
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
        watcher.on('unlink', async (ruta: string) => {
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
        if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
        }
        throw error;
    }
}

/**
 * ✨ FIX #3: Limpia todos los recursos de watch mode
 * Cierra watchers y limpia timers para evitar fugas de memoria
 */
export async function cleanupWatcher(watcher: any): Promise<void> {
    try {
        console.log('[FileWatcher] Limpiando recursos...');

        // 1. Limpiar debouncer
        watchDebouncer.cleanup();

        // 2. Cerrar watcher de chokidar
        if (watcher) {
            await watcher.close();
        }

        console.log('[FileWatcher] Recursos limpiados correctamente');
    } catch (error) {
        console.error(
            '[FileWatcher] Error al limpiar recursos:',
            error instanceof Error ? error.message : String(error),
        );
    }
}
