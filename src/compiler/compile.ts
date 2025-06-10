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
import { cwd, env, stdout } from 'node:process';

// Lazy loading optimizations - Only import lightweight modules synchronously

import { logger } from '../servicios/logger';
import { promptUser } from '../utils/promptUser';
import { showTimingForHumans } from '../utils/utils';

// Heavy dependencies will be loaded dynamically when needed
let chalk: any;
let ESLint: any;
let OxLint: any;
let minifyJS: any;
let getCodeFile: any;
let generateTailwindCSS: any;
let estandarizaCode: any;
let preCompileTS: any;
let preCompileVue: any;

// 🚀 Sistema de Carga Inteligente de Módulos - VERSIÓN OPTIMIZADA
class ModuleManager {
    private static instance: ModuleManager;
    private isInitialized: boolean = false;
    private initializationPromise: Promise<void> | null = null;
    private loadedModules: Set<string> = new Set();

    // NUEVOS: Gestión de modo y precarga
    private currentMode: 'individual' | 'batch' | 'watch' | null = null;
    private preloadPromises: Map<string, Promise<any>> = new Map();
    private moduleCache: Map<string, any> = new Map();

    private constructor() {}

    static getInstance(): ModuleManager {
        if (!ModuleManager.instance) {
            ModuleManager.instance = new ModuleManager();
        }
        return ModuleManager.instance;
    }

    /**
     * NUEVO: Precarga estratégica para modo watch
     */
    async preloadForWatchMode(): Promise<void> {
        const essentialModules = ['chalk', 'parser', 'transforms'];

        const preloadPromises = essentialModules.map(async moduleName => {
            if (!this.loadedModules.has(moduleName)) {
                switch (moduleName) {
                    case 'chalk':
                        return this._loadModule('chalk', loadChalk);
                    case 'parser':
                        return this._loadModule('parser', loadParser);
                    case 'transforms':
                        return this._loadModule('transforms', loadTransforms);
                }
            }
        });

        await Promise.all(preloadPromises);
        // console.log('[ModuleManager] Precarga completada para modo watch');
    } /**
     * MEJORADO: Inicializa los módulos necesarios según el contexto de compilación
     * @param context Contexto de compilación: 'individual', 'batch', 'watch'
     * @param fileExtensions Extensiones de archivos a compilar para optimizar la carga
     */
    async initializeModules(
        context: 'individual' | 'batch' | 'watch' = 'individual',
        fileExtensions: Set<string> = new Set(),
    ): Promise<void> {
        // Si cambia el contexto, reinicializar
        if (this.currentMode !== context) {
            this.currentMode = context;

            // En modo watch, precargar módulos esenciales
            if (context === 'watch') {
                await this.preloadForWatchMode();
            }
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        if (this.isInitialized && context !== 'individual') {
            return;
        }

        this.initializationPromise = this._performInitialization(
            context,
            fileExtensions,
        );
        await this.initializationPromise;
        this.initializationPromise = null;
    }

    private async _performInitialization(
        context: 'individual' | 'batch' | 'watch',
        fileExtensions: Set<string>,
    ): Promise<void> {
        const modulesToLoad: Promise<void>[] = [];

        // Módulos siempre necesarios
        if (!this.loadedModules.has('chalk')) {
            modulesToLoad.push(this._loadModule('chalk', loadChalk));
        }
        if (!this.loadedModules.has('parser')) {
            modulesToLoad.push(this._loadModule('parser', loadParser));
        }
        if (!this.loadedModules.has('transforms')) {
            modulesToLoad.push(this._loadModule('transforms', loadTransforms));
        }

        // Carga contextual según el tipo de compilación
        if (context === 'batch' || context === 'watch') {
            // En modo batch/watch, precargar todos los módulos necesarios
            if (!this.loadedModules.has('vue')) {
                modulesToLoad.push(this._loadModule('vue', loadVue));
            }
            if (!this.loadedModules.has('typescript')) {
                modulesToLoad.push(
                    this._loadModule('typescript', loadTypeScript),
                );
            }
            if (!this.loadedModules.has('minify')) {
                modulesToLoad.push(this._loadModule('minify', loadMinify));
            }
        } else {
            // En modo individual, cargar solo según las extensiones necesarias
            if (fileExtensions.has('.vue') && !this.loadedModules.has('vue')) {
                modulesToLoad.push(this._loadModule('vue', loadVue));
            }
            if (
                (fileExtensions.has('.ts') || fileExtensions.has('.vue')) &&
                !this.loadedModules.has('typescript')
            ) {
                modulesToLoad.push(
                    this._loadModule('typescript', loadTypeScript),
                );
            }
            if (env.isPROD === 'true' && !this.loadedModules.has('minify')) {
                modulesToLoad.push(this._loadModule('minify', loadMinify));
            }
        }

        // Cargar módulos en paralelo
        await Promise.all(modulesToLoad);
        this.isInitialized = true;
    }

    private async _loadModule(
        name: string,
        loadFunction: () => Promise<any>,
    ): Promise<void> {
        if (!this.loadedModules.has(name)) {
            await loadFunction();
            this.loadedModules.add(name);
        }
    }

    /**
     * Carga un módulo específico bajo demanda (lazy loading)
     */
    async ensureModuleLoaded(moduleName: string): Promise<void> {
        if (this.loadedModules.has(moduleName)) {
            return;
        }

        switch (moduleName) {
            case 'vue':
                await this._loadModule('vue', loadVue);
                break;
            case 'typescript':
                await this._loadModule('typescript', loadTypeScript);
                break;
            case 'minify':
                await this._loadModule('minify', loadMinify);
                break;
            case 'tailwind':
                await this._loadModule('tailwind', loadTailwind);
                break;
            case 'linter':
                await this._loadModule('linter', loadLinter);
                break;
            default:
                throw new Error(`Módulo desconocido: ${moduleName}`);
        }
    }

    /**
     * Resetea el estado del manager (útil para tests)
     */
    reset(): void {
        this.isInitialized = false;
        this.initializationPromise = null;
        this.loadedModules.clear();
    }

    /**
     * Obtiene estadísticas de módulos cargados
     */
    getStats(): { loaded: string[]; initialized: boolean } {
        return {
            loaded: Array.from(this.loadedModules),
            initialized: this.isInitialized,
        };
    }
}

// Lazy loading helper functions
async function loadChalk() {
    if (!chalk) {
        chalk = (await import('chalk')).default;
    }
    return chalk;
}

async function loadLinter() {
    if (!ESLint || !OxLint) {
        const linterModule = await import('./linter');
        ESLint = linterModule.ESLint;
        OxLint = linterModule.OxLint;
    }
    return { ESLint, OxLint };
}

async function loadMinify() {
    if (!minifyJS) {
        const minifyModule = await import('./minify');
        minifyJS = minifyModule.minifyJS;
    }
    return minifyJS;
}

async function loadParser() {
    if (!getCodeFile) {
        const parserModule = await import('./parser');
        getCodeFile = parserModule.getCodeFile;
    }
    return getCodeFile;
}

async function loadTailwind() {
    if (!generateTailwindCSS) {
        const tailwindModule = await import('./tailwindcss');
        generateTailwindCSS = tailwindModule.generateTailwindCSS;
    }
    return generateTailwindCSS;
}

async function loadTransforms() {
    if (!estandarizaCode) {
        const transformsModule = await import('./transforms');
        estandarizaCode = transformsModule.estandarizaCode;
    }
    return estandarizaCode;
}

async function loadTypeScript() {
    if (!preCompileTS) {
        const typescriptModule = await import('./typescript-manager');
        preCompileTS = typescriptModule.preCompileTS;
    }

    return preCompileTS;
}

async function loadVue() {
    if (!preCompileVue) {
        const vueModule = await import('./vuejs');
        preCompileVue = vueModule.preCompileVue;
    }
    return preCompileVue;
}

// ⚠️ Función eliminada: preloadAllModules()
// Ahora usamos ModuleManager.getInstance().initializeModules() directamente

// 🎯 Sistema Unificado de Manejo de Errores
type CompilationMode = 'all' | 'individual' | 'watch' | 'batch';

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

// 🚀 Sistema de Cache Inteligente para Compilación
interface SmartCacheEntry {
    contentHash: string;           // SHA-256 del contenido
    dependencyHashes?: string[];   // Hashes de dependencias (futuro)
    mtime: number;                 // Tiempo de modificación
    outputPath: string;            // Ruta del archivo compilado
    lastUsed: number;              // Para LRU
    size: number;                  // Control de memoria
}

class SmartCompilationCache {
    private cache = new Map<string, SmartCacheEntry>();
    private readonly maxEntries = 500;     // Máximo archivos en cache
    private readonly maxMemory = 100 * 1024 * 1024; // 100MB límite
    private currentMemoryUsage = 0;

    /**
     * Genera hash SHA-256 del contenido del archivo
     */
    async generateContentHash(filePath: string): Promise<string> {
        try {
            const content = await readFile(filePath, 'utf8');
            return createHash('sha256').update(content).digest('hex');
        } catch (error) {
            // Si no se puede leer el archivo, generar hash único basado en la ruta y timestamp
            const fallback = `${filePath}-${Date.now()}`;
            return createHash('sha256').update(fallback).digest('hex');
        }
    }

    /**
     * Verifica si una entrada de cache es válida
     */
    async isValid(filePath: string): Promise<boolean> {
        const entry = this.cache.get(filePath);
        if (!entry) return false;

        try {
            // Verificar si el archivo de salida existe
            await stat(entry.outputPath);
            
            // Verificar si el contenido ha cambiado
            const currentHash = await this.generateContentHash(filePath);
            if (entry.contentHash !== currentHash) {
                this.cache.delete(filePath);
                return false;
            }

            // Verificar tiempo de modificación como backup
            const stats = await stat(filePath);
            if (stats.mtimeMs > entry.mtime) {
                this.cache.delete(filePath);
                return false;
            }

            // Actualizar tiempo de uso para LRU
            entry.lastUsed = Date.now();
            return true;
        } catch {
            // Si hay error verificando, eliminar del cache
            this.cache.delete(filePath);
            return false;
        }
    }

    /**
     * Añade una entrada al cache
     */
    async set(filePath: string, outputPath: string): Promise<void> {
        try {
            const stats = await stat(filePath);
            const contentHash = await this.generateContentHash(filePath);
            
            const entry: SmartCacheEntry = {
                contentHash,
                mtime: stats.mtimeMs,
                outputPath,
                lastUsed: Date.now(),
                size: stats.size
            };

            // Aplicar límites de memoria y entradas antes de agregar
            this.evictIfNeeded(entry.size);
            
            this.cache.set(filePath, entry);
            this.currentMemoryUsage += entry.size;
        } catch (error) {
            // Si hay error, no cachear
            console.warn(`Warning: No se pudo cachear ${filePath}:`, error);
        }
    }

    /**
     * Aplica política LRU para liberar espacio
     */
    private evictIfNeeded(newEntrySize: number): void {
        // Verificar límite de entradas
        while (this.cache.size >= this.maxEntries) {
            this.evictLRU();
        }

        // Verificar límite de memoria
        while (this.currentMemoryUsage + newEntrySize > this.maxMemory && this.cache.size > 0) {
            this.evictLRU();
        }
    }

    /**
     * Elimina la entrada menos recientemente usada
     */
    private evictLRU(): void {
        let oldestKey = '';
        let oldestTime = Infinity;

        for (const [key, entry] of this.cache) {
            if (entry.lastUsed < oldestTime) {
                oldestTime = entry.lastUsed;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            const entry = this.cache.get(oldestKey);
            if (entry) {
                this.currentMemoryUsage -= entry.size;
                this.cache.delete(oldestKey);
            }
        }
    }

    /**
     * Carga el cache desde disco
     */
    async load(cacheFile: string): Promise<void> {
        try {
            if (env.cleanCache === 'true') {
                this.cache.clear();
                this.currentMemoryUsage = 0;
                try {
                    await unlink(cacheFile);
                } catch {
                    // Ignorar errores al eliminar el archivo
                }
                return;
            }

            const cacheData = await readFile(cacheFile, 'utf-8');
            const parsed = JSON.parse(cacheData);
            
            // Validar y cargar entradas del cache
            for (const [key, value] of Object.entries(parsed)) {
                const entry = value as SmartCacheEntry;
                if (entry.contentHash && entry.outputPath && entry.mtime) {
                    this.cache.set(key, entry);
                    this.currentMemoryUsage += entry.size || 0;
                }
            }
        } catch {
            // Cache file doesn't exist or is invalid, start fresh
            this.cache.clear();
            this.currentMemoryUsage = 0;
        }
    }

    /**
     * Guarda el cache a disco
     */
    async save(cacheFile: string, cacheDir: string): Promise<void> {
        try {
            await mkdir(cacheDir, { recursive: true });
            const cacheData = Object.fromEntries(this.cache);
            await writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
        } catch (error) {
            console.warn('Warning: No se pudo guardar el cache:', error);
        }
    }

    /**
     * Limpia completamente el cache
     */
    clear(): void {
        this.cache.clear();
        this.currentMemoryUsage = 0;
    }    /**
     * Obtiene la ruta de salida para un archivo cacheado
     */
    getOutputPath(filePath: string): string {
        const entry = this.cache.get(filePath);
        return entry?.outputPath || '';
    }

    /**
     * Obtiene estadísticas del cache
     */
    getStats(): { entries: number; memoryUsage: number; hitRate: number } {
        return {
            entries: this.cache.size,
            memoryUsage: this.currentMemoryUsage,
            hitRate: 0 // Se calculará externamente
        };
    }
}

// Instancia global del cache inteligente
const smartCache = new SmartCompilationCache();
const CACHE_DIR = path.join(
    path.resolve(env.PATH_PROY || cwd(), 'compiler'),
    '.cache',
);
const CACHE_FILE = path.join(CACHE_DIR, 'versacompile-cache.json');

async function loadCache() {
    await smartCache.load(CACHE_FILE);
}

async function saveCache() {
    await smartCache.save(CACHE_FILE, CACHE_DIR);
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
async function handleCompilationError(
    error: Error | string,
    fileName: string,
    stage: string,
    mode: CompilationMode,
    isVerbose: boolean = false,
): Promise<void> {
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
    registerCompilationResult(stage, 1, 0, [fileName]); // Mostrar error inmediatamente solo en modo individual y watch
    if (mode === 'individual' || mode === 'watch') {
        const chalk = await loadChalk();
        const baseName = path.basename(fileName);
        const stageColor = await getStageColor(stage);

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
async function displayCompilationSummary(
    isVerbose: boolean = false,
): Promise<void> {
    const chalk = await loadChalk();

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

        for (const result of compilationResults) {
            const totalFiles = result.success + result.errors;
            const successRate =
                totalFiles > 0
                    ? Math.round((result.success / totalFiles) * 100)
                    : 0;
            const statusIcon = result.errors === 0 ? '✅' : '❌';
            const stageColor = await getStageColor(result.stage);
            const statusText = `${result.success} éxitos, ${result.errors} errores`;
            const coloredStatusText =
                result.errors === 0
                    ? chalk.green(statusText)
                    : chalk.red(statusText);

            logger.info(
                `${statusIcon} ${stageColor(result.stage)}: ${coloredStatusText} (${successRate}% éxito)`,
            );
        }
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
        for (const [filePath, fileErrors] of errorsByFile) {
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

            for (const error of fileErrors) {
                const icon = error.severity === 'error' ? '❌' : '⚠️';
                const stageColor = await getStageColor(error.stage);

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
            }

            fileIndex++;
        }

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
 * Muestra errores del linter de forma detallada
 */
async function displayLinterErrors(errors: any[]): Promise<void> {
    const chalk = await loadChalk();
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

/**
 * Obtiene el color apropiado para cada etapa de compilación
 */
async function getStageColor(stage: string): Promise<(text: string) => string> {
    const chalk = await loadChalk();
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

    let outputPath;
    if (normalizedRuta.includes(normalizedSource)) {
        const relativePath = normalizedRuta
            .substring(
                normalizedRuta.indexOf(normalizedSource) +
                    normalizedSource.length,
            )
            .replace(/^[/\\]/, '');

        outputPath = path
            .join(normalizedDist, relativePath)
            .replace(/\\/g, '/');
    } else {
        const fileName = path.basename(normalizedRuta);
        outputPath = path.join(normalizedDist, fileName).replace(/\\/g, '/');
    }
    if (outputPath.includes('vue') || outputPath.includes('ts')) {
        return outputPath.replace(/\.(vue|ts)$/, '.js');
    } else {
        return outputPath;
    }
}

// Optimización para modo watch: debouncing y cache de archivos
class WatchModeOptimizer {
    private static instance: WatchModeOptimizer;
    private fileSystemCache: Map<string, { mtime: number }> = new Map();
    private debounceTimers: Map<string, ReturnType<typeof setTimeout>> =
        new Map();
    private readonly DEBOUNCE_DELAY = 100; // 100ms debounce

    static getInstance(): WatchModeOptimizer {
        if (!WatchModeOptimizer.instance) {
            WatchModeOptimizer.instance = new WatchModeOptimizer();
        }
        return WatchModeOptimizer.instance;
    }

    async compileForWatch(
        filePath: string,
        compileFn: (file: string) => Promise<any>,
    ): Promise<any> {
        return new Promise(resolve => {
            const existingTimer = this.debounceTimers.get(filePath);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }
            const timer = setTimeout(async () => {
                this.debounceTimers.delete(filePath);
                try {
                    const stats = await stat(filePath);
                    const cached = this.fileSystemCache.get(filePath);
                    if (cached && cached.mtime >= stats.mtimeMs) {
                        resolve({ success: true, cached: true });
                        return;
                    } // Configurar worker pool para modo watch
                    const { TypeScriptWorkerPool } = await import(
                        './typescript-worker-pool'
                    );
                    const workerPool = TypeScriptWorkerPool.getInstance();
                    workerPool.setMode('watch');
                    const result = await compileFn(filePath);
                    this.fileSystemCache.set(filePath, {
                        mtime: stats.mtimeMs,
                    });
                    resolve(result);
                } catch (error) {
                    resolve({ success: false, error });
                }
            }, this.DEBOUNCE_DELAY);
            this.debounceTimers.set(filePath, timer);
        });
    }

    cleanup(): void {
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
        this.fileSystemCache.clear();
    }
}

async function compileJS(
    inPath: string,
    outPath: string,
    mode: CompilationMode = 'individual',
) {
    const timings: Record<string, number> = {};

    // Si la ruta ya es absoluta, no la resolvamos de nuevo
    inPath = path.isAbsolute(inPath)
        ? normalizeRuta(inPath)
        : normalizeRuta(path.resolve(inPath));

    // 🚀 Usar ModuleManager para carga optimizada
    const moduleManager = ModuleManager.getInstance();

    // Timing de lectura
    let start = Date.now();

    const extension = path.extname(inPath);

    // Asegurar que el parser esté cargado
    await moduleManager.ensureModuleLoaded('parser');
    const getCodeFile = await loadParser();
    let { code, error } = await getCodeFile(inPath);
    timings.fileRead = Date.now() - start;
    if (error) {
        await handleCompilationError(
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
        await handleCompilationError(
            new Error('El archivo está vacío o no se pudo leer.'),
            inPath,
            'file-read',
            mode,
            env.VERBOSE === 'true',
        );
        throw new Error('El archivo está vacío o no se pudo leer.');
    }

    // Logs detallados solo en modo verbose + all
    const shouldShowDetailedLogs = env.VERBOSE === 'true' && mode === 'all';

    // Compilación de Vue
    let vueResult;
    if (extension === '.vue') {
        start = Date.now();
        if (shouldShowDetailedLogs) {
            logger.info(chalk!.green(`💚 Precompilando VUE: ${inPath}`));
        }

        // Asegurar que el módulo Vue esté cargado
        await moduleManager.ensureModuleLoaded('vue');
        const preCompileVue = await loadVue();

        if (typeof preCompileVue !== 'function') {
            throw new Error(
                `loadVue devolvió ${typeof preCompileVue} en lugar de una función para archivo: ${inPath}`,
            );
        }

        vueResult = await preCompileVue(code, inPath, env.isPROD === 'true');
        timings.vueCompile = Date.now() - start;
        if (vueResult === undefined || vueResult === null) {
            throw new Error(
                `preCompileVue devolvió ${vueResult} para archivo: ${inPath}`,
            );
        }

        if (vueResult.error) {
            await handleCompilationError(
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
        await handleCompilationError(
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
        start = Date.now();
        if (shouldShowDetailedLogs) {
            logger.info(chalk!.blue(`🔄️ Precompilando TS: ${inPath}`));
        }

        // Asegurar que el módulo TypeScript esté cargado
        await moduleManager.ensureModuleLoaded('typescript');
        const preCompileTS = await loadTypeScript();

        if (typeof preCompileTS !== 'function') {
            throw new Error(
                `loadTypeScript devolvió ${typeof preCompileTS} en lugar de una función para archivo: ${inPath}`,
            );
        }

        tsResult = await preCompileTS(code, inPath);
        timings.tsCompile = Date.now() - start;
        if (tsResult === undefined || tsResult === null) {
            throw new Error(
                `preCompileTS devolvió ${tsResult} para archivo: ${inPath}`,
            );
        }

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
            } else {
                await handleCompilationError(
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
        await handleCompilationError(
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
        logger.info(chalk!.yellow(`💛 Estandarizando: ${inPath}`));
    }
    start = Date.now();

    // Asegurar que el módulo de transformaciones esté cargado
    await moduleManager.ensureModuleLoaded('transforms');
    const estandarizaCode = await loadTransforms();
    const resultSTD = await estandarizaCode(code, inPath);
    timings.standardization = Date.now() - start;
    if (resultSTD === undefined || resultSTD === null) {
        throw new Error(
            `estandarizaCode devolvió ${resultSTD} para archivo: ${inPath}`,
        );
    }

    if (resultSTD.error) {
        await handleCompilationError(
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
        await handleCompilationError(
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
        start = Date.now();
        if (shouldShowDetailedLogs) {
            logger.info(chalk!.red(`🤖 Minificando: ${inPath}`));
        }

        // Asegurar que el módulo de minificación esté cargado
        await moduleManager.ensureModuleLoaded('minify');
        const minifyJS = await loadMinify();
        const resultMinify = await minifyJS(code, inPath, true);
        timings.minification = Date.now() - start;
        if (resultMinify === undefined || resultMinify === null) {
            throw new Error(
                `minifyJS devolvió ${resultMinify} para archivo: ${inPath}`,
            );
        }

        if (resultMinify.error) {
            await handleCompilationError(
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
        // 🚀 Sistema de Carga Inteligente de Módulos
        const moduleManager = ModuleManager.getInstance();
        const fileExtension = path.extname(ruta);
        const fileExtensions = new Set([fileExtension]);

        // Inicializar módulos según el contexto
        await moduleManager.initializeModules(
            mode === 'all' ? 'batch' : mode,
            fileExtensions,
        );

        // Generar TailwindCSS si está habilitado
        if (compileTailwind && Boolean(env.TAILWIND)) {
            await moduleManager.ensureModuleLoaded('tailwind');
            const generateTailwindCSS = await loadTailwind();
            const resultTW = await generateTailwindCSS();
            if (typeof resultTW !== 'boolean') {
                if (resultTW?.success) {
                    logger.info(`🎨 ${resultTW.message}`);
                } else {
                    const errorMsg = `${resultTW.message}${resultTW.details ? '\n' + resultTW.details : ''}`;
                    await handleCompilationError(
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
            const chalk = await loadChalk();
            logger.info(
                chalk.green(`✅ Compilación exitosa: ${path.basename(file)}`),
            );
        }

        return {
            success: true,
            output: outFile,
            action: result.action,
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        if (env.VERBOSE === 'true') {
            logger.error(
                `❌ Error en compilación de ${path.basename(ruta)}: ${errorMessage}`,
            );
        }
        return {
            success: false,
            output: '',
            error: errorMessage,
        };
    }
}

// Variable para el último progreso mostrado (evitar spam)
let lastProgressUpdate = 0;

// Función para ejecutar el linter antes de la compilación
export async function runLinter(showResult: boolean = false): Promise<boolean> {
    const linterENV = env.linter;
    const linterPromises: Promise<void>[] = [];
    const linterErrors: any[] = [];
    let proceedWithCompilation = true;

    if (env.ENABLE_LINTER !== 'true') {
        return true;
    }
    if (typeof linterENV === 'string' && linterENV.trim() !== '') {
        logger.info('🔍 Ejecutando linting...');
        try {
            const parsedLinterEnv = JSON.parse(linterENV);
            if (Array.isArray(parsedLinterEnv)) {
                // Cargar dependencias de linting de forma lazy
                const { ESLint, OxLint } = await loadLinter();
                for (const item of parsedLinterEnv) {
                    if (item.name.toLowerCase() === 'eslint') {
                        logger.info(
                            `🔧 Ejecutando ESLint con config: ${item.configFile || 'por defecto'}`,
                        );
                        const eslintPromise = ESLint(item)
                            .then((eslintResult: any) => {
                                if (eslintResult && eslintResult.json) {
                                    // Procesar resultados de ESLint
                                    if (Array.isArray(eslintResult.json)) {
                                        eslintResult.json.forEach(
                                            (result: any) => {
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
                                            },
                                        );
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
                            .catch((err: any) => {
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
                            .then((oxlintResult: any) => {
                                if (
                                    oxlintResult &&
                                    oxlintResult['json'] &&
                                    Array.isArray(oxlintResult['json'])
                                ) {
                                    oxlintResult['json'].forEach(
                                        (result: any) => {
                                            linterErrors.push({
                                                file:
                                                    result.filename ||
                                                    result.file ||
                                                    'archivo no especificado',
                                                message: result.message,
                                                severity:
                                                    typeof result.severity ===
                                                    'string'
                                                        ? result.severity.toLowerCase()
                                                        : 'error',
                                                help:
                                                    result.help ||
                                                    (result.rule_id
                                                        ? `Regla Oxlint: ${result.rule_id}`
                                                        : undefined),
                                            });
                                        },
                                    );
                                }
                            })
                            .catch((err: any) => {
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
                logger.warn(
                    '⚠️ La configuración de linter no es un array válido.',
                );
            }

            await Promise.all(linterPromises);

            if (showResult) {
                if (linterErrors.length > 0) {
                    await displayLinterErrors(linterErrors);
                } else {
                    const chalk = await loadChalk();
                    logger.info(
                        chalk.green(
                            '✅ No se encontraron errores ni advertencias de linting.',
                        ),
                    );
                }
            }
        } catch (parseError) {
            logger.warn(
                `Error parseando configuración de linter: ${parseError instanceof Error ? parseError.message : 'Error desconocido'}, omitiendo...`,
            );
        }

        if (!showResult && linterErrors.length > 0) {
            await displayLinterErrors(linterErrors);
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

// Función para crear una barra de progreso visual
function createProgressBar(
    current: number,
    total: number,
    width: number = 30,
): string {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${' '.repeat(empty)}] ${percentage}% (${current}/${total})`;
}

// Función helper para verificar si un archivo debe ser omitido por cache
async function shouldSkipFile(filePath: string): Promise<boolean> {
    return await smartCache.isValid(filePath);
}

// Función para compilar archivos con límite de concurrencia
async function compileWithConcurrencyLimit(
    files: string[],
    maxConcurrency: number = 8,
) {
    const results: any[] = [];
    const executing: Promise<any>[] = [];
    const total = files.length;
    let completed = 0;
    let skipped = 0;
    let failed = 0; // Función para mostrar progreso
    function showProgress() {
        const currentTotal = completed + skipped + failed;
        const progressBar = createProgressBar(currentTotal, total);
        const progressPercent = Math.round((currentTotal / total) * 100);

        if (
            progressPercent > lastProgressUpdate + 1 ||
            currentTotal === total
        ) {
            stdout.write(
                `\r🚀 ${progressBar} [✅ ${completed} | ⏭️ ${skipped} | ❌ ${failed}]`,
            );
            lastProgressUpdate = progressPercent;
        }
    }
    for (const file of files) {
        const promise = (async () => {
            try {
                // Verificar cache antes de compilar
                if (await shouldSkipFile(file)) {
                    skipped++;
                    showProgress();
                    return {
                        success: true,
                        cached: true,
                        output: smartCache.getOutputPath(file),
                    };
                }

                const result = await initCompile(file, false, 'batch');                // Actualizar cache si la compilación fue exitosa
                if (result.success && result.output) {
                    await smartCache.set(file, result.output);
                }

                completed++;
                showProgress();
                return result;
            } catch (error) {
                failed++;
                showProgress();
                return {
                    success: false,
                    error:
                        error instanceof Error ? error.message : String(error),
                };
            }
        })();

        results.push(promise);
        executing.push(promise);

        if (executing.length >= maxConcurrency) {
            await Promise.race(executing);
            executing.splice(
                executing.findIndex(p => p === promise),
                1,
            );
        }
    }

    await Promise.all(results);
    console.log('\n'); // Nueva línea después de la barra de progreso
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
            // await displayCompilationSummary(env.VERBOSE === 'true');
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
            `${normalizedGlobPathSource}/**/*.mjs`,
            `${normalizedGlobPathSource}/**/*.cjs`,
        ];

        logger.info(`📝 Compilando todos los archivos...`);
        logger.info(`🔜 Fuente: ${rawPathSource}`);
        logger.info(`🔚 Destino: ${pathDist}\n`); // Generar TailwindCSS
        const generateTailwindCSS = await loadTailwind();
        const resultTW = await generateTailwindCSS();
        if (typeof resultTW !== 'boolean') {
            if (resultTW?.success) {
                logger.info(`🎨 ${resultTW.message}\n`);
            } else {
                await handleCompilationError(
                    new Error(
                        `${resultTW.message}${resultTW.details ? '\n' + resultTW.details : ''}`,
                    ),
                    'tailwind.config.js',
                    'tailwind',
                    'all',
                    env.VERBOSE === 'true',
                );
            }
        } // Recopilar todos los archivos
        const filesToCompile: string[] = [];
        for await (const file of glob(patterns)) {
            if (file.endsWith('.d.ts')) {
                continue;
            }
            // Usar la ruta tal como viene de glob, sin modificar
            filesToCompile.push(file);
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
        ); // Configurar worker pool para modo batch
        try {
            const { TypeScriptWorkerPool } = await import(
                './typescript-worker-pool'
            );
            const workerPool = TypeScriptWorkerPool.getInstance();
            workerPool.setMode('batch');
        } catch {
            // Error silencioso en configuración del pool
        }

        await compileWithConcurrencyLimit(filesToCompile, maxConcurrency);

        // Guardar cache al final
        await saveCache();

        const endTime = Date.now();
        const elapsedTime = showTimingForHumans(endTime - startTime);
        logger.info(`⏱️ Tiempo total de compilación: ${elapsedTime}\n`); // Mostrar resumen de compilación
        await displayCompilationSummary(env.VERBOSE === 'true');
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        logger.error(
            `🚩 Error al compilar todos los archivos: ${errorMessage}`,
        );

        // Registrar el error en el sistema unificado
        await handleCompilationError(
            error instanceof Error ? error : new Error(String(error)),
            'compilación general',
            'all',
            'all',
            env.VERBOSE === 'true',
        );

        // Mostrar resumen incluso si hay errores generales
        await displayCompilationSummary(env.VERBOSE === 'true');
    }
}

// Función wrapper para compatibilidad con tests
export async function compileFile(filePath: string) {
    return await initCompile(filePath, true, 'individual');
}

export { WatchModeOptimizer };
