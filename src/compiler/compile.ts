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
import process, { argv, cwd, env } from 'node:process';

// Lazy loading optimizations - Only import lightweight modules synchronously

import { logger, setProgressManagerGetter } from '../servicios/logger';
import { promptUser } from '../utils/promptUser';
import { showTimingForHumans } from '../utils/utils';

// Configurar el getter del ProgressManager para el logger
setProgressManagerGetter(() => ProgressManager.getInstance());

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

// 🚀 Importar optimizador de transformaciones
let TransformOptimizer: any;

// 🚀 Importar optimizador de resolución de módulos
let ModuleResolutionOptimizer: any;

// 🚀 Sistema de Carga Inteligente de Módulos - VERSIÓN OPTIMIZADA V2
class OptimizedModuleManager {
    private static instance: OptimizedModuleManager;
    private isInitialized: boolean = false;
    private loadedModules: Set<string> = new Set();

    // ✨ NUEVAS OPTIMIZACIONES
    private modulePool: Map<string, any> = new Map(); // Pool de instancias reutilizables
    private loadingPromises: Map<string, Promise<any>> = new Map(); // Prevenir cargas duplicadas
    private usageStats: Map<string, number> = new Map(); // Estadísticas de uso
    private preloadQueue: Set<string> = new Set(); // Cola de precarga
    private backgroundLoader: Promise<void> | null = null; // Cargador en background

    // Módulos críticos que siempre se precargan
    private readonly HOT_MODULES = ['chalk', 'parser'];

    // Contexto actual para optimizar cargas
    private currentContext: 'individual' | 'batch' | 'watch' | null = null;

    private constructor() {
        // Iniciar precarga en background inmediatamente
        this.startBackgroundPreloading();
    }

    static getInstance(): OptimizedModuleManager {
        if (!OptimizedModuleManager.instance) {
            OptimizedModuleManager.instance = new OptimizedModuleManager();
        }
        return OptimizedModuleManager.instance;
    }

    /**
     * ✨ NUEVO: Precarga en background para módulos críticos
     */
    private startBackgroundPreloading(): void {
        this.backgroundLoader = this.preloadCriticalModules();
    }

    /**
     * ✨ NUEVO: Precarga módulos críticos en background
     */
    private async preloadCriticalModules(): Promise<void> {
        try {
            // Precargar módulos críticos de forma asíncrona
            const preloadPromises = this.HOT_MODULES.map(moduleName =>
                this.ensureModuleLoaded(moduleName).catch(() => {
                    // Silenciar errores de precarga, se intentará cargar después
                }),
            );

            await Promise.allSettled(preloadPromises);
        } catch {
            // Fallos en precarga no deben afectar la funcionalidad principal
        }
    }

    /**
     * ✨ MEJORADO: Precarga contextual basada en tipos de archivo
     */
    async preloadForContext(
        context: 'individual' | 'batch' | 'watch',
        fileTypes: Set<string> = new Set(),
    ): Promise<void> {
        this.currentContext = context;

        // Esperar que termine la precarga crítica si está en progreso
        if (this.backgroundLoader) {
            await this.backgroundLoader;
        }

        const toPreload: string[] = []; // Precarga basada en contexto
        if (context === 'batch' || context === 'watch') {
            // En batch/watch, precargar todos los módulos comunes
            toPreload.push(
                'transforms',
                'vue',
                'typescript',
                'module-resolution-optimizer',
            );
        } else {
            // En individual, cargar solo según tipos de archivo detectados
            if (fileTypes.has('.vue')) toPreload.push('vue');
            if (fileTypes.has('.ts') || fileTypes.has('.vue'))
                toPreload.push('typescript');
            if (!this.loadedModules.has('transforms'))
                toPreload.push('transforms');
        }

        // Precargar en paralelo
        const preloadPromises = toPreload.map(moduleName =>
            this.ensureModuleLoaded(moduleName).catch(() => {
                // Log warning pero no fallar
                console.warn(
                    `Warning: No se pudo precargar módulo ${moduleName}`,
                );
            }),
        );

        await Promise.allSettled(preloadPromises);
    }

    /**
     * ✨ MEJORADO: Carga inteligente con pooling y deduplicación
     */
    async ensureModuleLoaded(moduleName: string): Promise<any> {
        // 1. Verificar pool de módulos primero
        if (this.modulePool.has(moduleName)) {
            this.updateUsageStats(moduleName);
            return this.modulePool.get(moduleName);
        }

        // 2. Verificar si ya está cargando (deduplicación)
        if (this.loadingPromises.has(moduleName)) {
            return this.loadingPromises.get(moduleName);
        }

        // 3. Iniciar carga
        const loadPromise = this.loadModuleInternal(moduleName);
        this.loadingPromises.set(moduleName, loadPromise);

        try {
            const moduleInstance = await loadPromise;

            // 4. Almacenar en pool y estadísticas
            this.modulePool.set(moduleName, moduleInstance);
            this.loadedModules.add(moduleName);
            this.updateUsageStats(moduleName);

            return moduleInstance;
        } finally {
            // 5. Limpiar promesa de carga
            this.loadingPromises.delete(moduleName);
        }
    }

    /**
     * ✨ NUEVO: Actualiza estadísticas de uso para optimizaciones futuras
     */
    private updateUsageStats(moduleName: string): void {
        const currentCount = this.usageStats.get(moduleName) || 0;
        this.usageStats.set(moduleName, currentCount + 1);
    }

    /**
     * ✨ MEJORADO: Carga interna de módulos con mejor manejo de errores
     */ private async loadModuleInternal(moduleName: string): Promise<any> {
        switch (moduleName) {
            case 'chalk':
                return this.loadChalk();
            case 'parser':
                return this.loadParser();
            case 'transforms':
                return this.loadTransforms();
            case 'vue':
                return this.loadVue();
            case 'typescript':
                return this.loadTypeScript();
            case 'minify':
                return this.loadMinify();
            case 'tailwind':
                return this.loadTailwind();
            case 'linter':
                return this.loadLinter();
            case 'transform-optimizer':
                return this.loadTransformOptimizer();
            case 'module-resolution-optimizer':
                return this.loadModuleResolutionOptimizer();
            default:
                throw new Error(`Módulo desconocido: ${moduleName}`);
        }
    }

    // ✨ Métodos de carga específicos optimizados
    private async loadChalk(): Promise<any> {
        if (!chalk) {
            chalk = (await import('chalk')).default;
        }
        return chalk;
    }

    private async loadParser(): Promise<any> {
        if (!getCodeFile) {
            const parserModule = await import('./parser');
            getCodeFile = parserModule.getCodeFile;
        }
        return getCodeFile;
    }

    private async loadTransforms(): Promise<any> {
        if (!estandarizaCode) {
            const transformsModule = await import('./transforms');
            estandarizaCode = transformsModule.estandarizaCode;
        }
        return estandarizaCode;
    }

    private async loadVue(): Promise<any> {
        if (!preCompileVue) {
            const vueModule = await import('./vuejs');
            preCompileVue = vueModule.preCompileVue;
        }
        return preCompileVue;
    }

    private async loadTypeScript(): Promise<any> {
        if (!preCompileTS) {
            const typescriptModule = await import('./typescript-manager');
            preCompileTS = typescriptModule.preCompileTS;
        }
        return preCompileTS;
    }

    private async loadMinify(): Promise<any> {
        if (!minifyJS) {
            const minifyModule = await import('./minify');
            minifyJS = minifyModule.minifyJS;
        }
        return minifyJS;
    }

    private async loadTailwind(): Promise<any> {
        if (!generateTailwindCSS) {
            const tailwindModule = await import('./tailwindcss');
            generateTailwindCSS = tailwindModule.generateTailwindCSS;
        }
        return generateTailwindCSS;
    }
    private async loadLinter(): Promise<any> {
        if (!ESLint || !OxLint) {
            const linterModule = await import('./linter');
            ESLint = linterModule.ESLint;
            OxLint = linterModule.OxLint;
        }
        return { ESLint, OxLint };
    }
    private async loadTransformOptimizer(): Promise<any> {
        if (!TransformOptimizer) {
            const transformModule = await import('./transform-optimizer');
            TransformOptimizer =
                transformModule.TransformOptimizer.getInstance();
        }
        return TransformOptimizer;
    }

    private async loadModuleResolutionOptimizer(): Promise<any> {
        if (!ModuleResolutionOptimizer) {
            const resolutionModule = await import(
                './module-resolution-optimizer'
            );
            ModuleResolutionOptimizer =
                resolutionModule.ModuleResolutionOptimizer.getInstance();
        }
        return ModuleResolutionOptimizer;
    }

    /**
     * ✨ NUEVO: Obtiene estadísticas de performance del manager
     */
    getPerformanceStats(): {
        loadedModules: string[];
        usageStats: Record<string, number>;
        poolSize: number;
        loadingInProgress: string[];
        mostUsedModules: string[];
    } {
        const sortedByUsage = Array.from(this.usageStats.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name]) => name);

        return {
            loadedModules: Array.from(this.loadedModules),
            usageStats: Object.fromEntries(this.usageStats),
            poolSize: this.modulePool.size,
            loadingInProgress: Array.from(this.loadingPromises.keys()),
            mostUsedModules: sortedByUsage,
        };
    }

    /**
     * ✨ NUEVO: Limpia módulos no utilizados para liberar memoria
     */
    cleanupUnusedModules(): void {
        const threshold = 1; // Mínimo de usos para mantener en pool

        for (const [moduleName, usageCount] of this.usageStats) {
            if (
                usageCount < threshold &&
                !this.HOT_MODULES.includes(moduleName)
            ) {
                this.modulePool.delete(moduleName);
                this.loadedModules.delete(moduleName);
                this.usageStats.delete(moduleName);
            }
        }
    }

    /**
     * Resetea el estado del manager (útil para tests)
     */
    reset(): void {
        this.isInitialized = false;
        this.loadedModules.clear();
        this.modulePool.clear();
        this.loadingPromises.clear();
        this.usageStats.clear();
        this.preloadQueue.clear();
        this.currentContext = null;
        this.backgroundLoader = null;

        // Reiniciar precarga crítica
        this.startBackgroundPreloading();
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
    contentHash: string; // SHA-256 del contenido
    configHash: string; // Hash de la configuración del compilador
    envHash: string; // Hash de variables de entorno relevantes
    dependencyHash: string; // Hash de dependencias (package.json)
    mtime: number; // Tiempo de modificación
    outputPath: string; // Ruta del archivo compilado
    lastUsed: number; // Para LRU
    size: number; // Control de memoria
}

// Variables de entorno relevantes para compilación
const COMPILATION_ENV_VARS = [
    'NODE_ENV',
    'isPROD',
    'TAILWIND',
    'ENABLE_LINTER',
    'VERBOSE',
    'typeCheck',
    'PATH_ALIAS',
    'tailwindcss',
    'linter',
    'tsconfigFile',
] as const;

class SmartCompilationCache {
    private cache = new Map<string, SmartCacheEntry>();
    private readonly maxEntries = 200; // Reducido para tests de estrés
    private readonly maxMemory = 50 * 1024 * 1024; // 50MB límite (reducido)
    private currentMemoryUsage = 0;

    // ✨ ISSUE #3: Sistema de vigilancia de dependencias
    private fileWatchers = new Map<string, any>(); // chokidar watchers
    private dependencyGraph = new Map<string, Set<string>>(); // archivo -> dependencias
    private reverseDependencyGraph = new Map<string, Set<string>>(); // dependencia -> archivos que la usan
    private packageJsonPath = path.join(cwd(), 'package.json');
    private nodeModulesPath = path.join(cwd(), 'node_modules');
    private isWatchingDependencies = false;
    /**
     * Genera hash SHA-256 del contenido del archivo
     */ async generateContentHash(filePath: string): Promise<string> {
        try {
            const content = await readFile(filePath, 'utf8');
            return createHash('sha256').update(content).digest('hex');
        } catch {
            // Si no se puede leer el archivo, generar hash único basado en la ruta y timestamp
            const fallback = `${filePath}-${Date.now()}`;
            return createHash('sha256').update(fallback).digest('hex');
        }
    }

    /**
     * Genera hash de la configuración del compilador
     */
    private generateConfigHash(): string {
        try {
            // Recopilar configuración relevante de variables de entorno
            const config = {
                isPROD: env.isPROD || 'false',
                TAILWIND: env.TAILWIND || 'false',
                ENABLE_LINTER: env.ENABLE_LINTER || 'false',
                PATH_ALIAS: env.PATH_ALIAS || '{}',
                tailwindcss: env.tailwindcss || 'false',
                linter: env.linter || 'false',
                tsconfigFile: env.tsconfigFile || './tsconfig.json',
            };

            const configStr = JSON.stringify(
                config,
                Object.keys(config).sort(),
            );
            return createHash('sha256')
                .update(configStr)
                .digest('hex')
                .substring(0, 12);
        } catch {
            return 'no-config';
        }
    }

    /**
     * Genera hash de variables de entorno relevantes
     */
    private generateEnvHash(): string {
        try {
            const envVars = COMPILATION_ENV_VARS.map(
                key => `${key}=${env[key] || ''}`,
            ).join('|');
            return createHash('sha256')
                .update(envVars)
                .digest('hex')
                .substring(0, 12);
        } catch {
            return 'no-env';
        }
    } /**
     * ✨ ISSUE #3: Genera hash avanzado de dependencias del proyecto
     * Incluye vigilancia de package.json, node_modules y versiones instaladas
     */
    private async generateDependencyHash(): Promise<string> {
        try {
            const hash = createHash('sha256');

            // 1. Hash del package.json con versiones
            const packagePath = path.join(cwd(), 'package.json');
            const packageContent = await readFile(packagePath, 'utf8');
            const pkg = JSON.parse(packageContent);

            const deps = {
                ...pkg.dependencies,
                ...pkg.devDependencies,
            };

            const depsStr = JSON.stringify(deps, Object.keys(deps).sort());
            hash.update(`package:${depsStr}`);

            // 2. Hash del package-lock.json si existe (versiones exactas instaladas)
            try {
                const lockPath = path.join(cwd(), 'package-lock.json');
                const lockContent = await readFile(lockPath, 'utf8');
                const lockData = JSON.parse(lockContent);

                // Solo incluir las versiones instaladas, no todo el lockfile
                const installedVersions: Record<string, string> = {};
                if (lockData.packages) {
                    for (const [pkgPath, pkgInfo] of Object.entries(
                        lockData.packages,
                    )) {
                        if (
                            pkgPath &&
                            pkgPath !== '' &&
                            typeof pkgInfo === 'object' &&
                            pkgInfo !== null
                        ) {
                            const pkgName = pkgPath.replace(
                                'node_modules/',
                                '',
                            );
                            if ((pkgInfo as any).version) {
                                installedVersions[pkgName] = (
                                    pkgInfo as any
                                ).version;
                            }
                        }
                    }
                }
                hash.update(
                    `lock:${JSON.stringify(installedVersions, Object.keys(installedVersions).sort())}`,
                );
            } catch {
                // Ignorar si no existe package-lock.json
            }

            // 3. ✨ NUEVO: Hash de timestamps críticos de node_modules
            try {
                const nodeModulesPath = path.join(cwd(), 'node_modules');
                const nodeModulesStat = await stat(nodeModulesPath);
                hash.update(`nmtime:${nodeModulesStat.mtimeMs}`);

                // Verificar timestamps de dependencias críticas instaladas
                const criticalDeps = Object.keys(deps).slice(0, 10); // Top 10 para performance
                for (const dep of criticalDeps) {
                    try {
                        const depPath = path.join(nodeModulesPath, dep);
                        const depStat = await stat(depPath);
                        hash.update(`${dep}:${depStat.mtimeMs}`);
                    } catch {
                        // Dependencia no instalada o error
                        hash.update(`${dep}:missing`);
                    }
                }
            } catch {
                // node_modules no existe
                hash.update('nmtime:none');
            }

            return hash.digest('hex').substring(0, 16);
        } catch (error) {
            // Incluir información del error en el hash para debugging
            return createHash('sha256')
                .update(
                    `error:${error instanceof Error ? error.message : 'unknown'}`,
                )
                .digest('hex')
                .substring(0, 16);
        }
    }

    /**
     * Genera clave de cache granular que incluye todos los factores
     */
    private async generateCacheKey(filePath: string): Promise<string> {
        const contentHash = await this.generateContentHash(filePath);
        const configHash = this.generateConfigHash();
        const envHash = this.generateEnvHash();
        const dependencyHash = await this.generateDependencyHash();

        // Usar | como separador para evitar problemas con rutas de Windows
        return `${filePath}|${contentHash.substring(0, 12)}|${configHash}|${envHash}|${dependencyHash}`;
    } /**
     * Verifica si una entrada de cache es válida
     */
    async isValid(filePath: string): Promise<boolean> {
        const entry = this.cache.get(filePath);
        if (!entry) return false;

        try {
            // Verificar si el archivo de salida existe
            await stat(entry.outputPath);

            // Verificar si el contenido ha cambiado
            const currentContentHash = await this.generateContentHash(filePath);
            if (entry.contentHash !== currentContentHash) {
                this.cache.delete(filePath);
                return false;
            }

            // Verificar si la configuración ha cambiado
            const currentConfigHash = this.generateConfigHash();
            if (entry.configHash !== currentConfigHash) {
                this.cache.delete(filePath);
                return false;
            }

            // Verificar si las variables de entorno han cambiado
            const currentEnvHash = this.generateEnvHash();
            if (entry.envHash !== currentEnvHash) {
                this.cache.delete(filePath);
                return false;
            }

            // Verificar si las dependencias han cambiado
            const currentDependencyHash = await this.generateDependencyHash();
            if (entry.dependencyHash !== currentDependencyHash) {
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
    } /**
     * Añade una entrada al cache
     */
    async set(filePath: string, outputPath: string): Promise<void> {
        try {
            const stats = await stat(filePath);
            const contentHash = await this.generateContentHash(filePath);
            const configHash = this.generateConfigHash();
            const envHash = this.generateEnvHash();
            const dependencyHash = await this.generateDependencyHash();

            const entry: SmartCacheEntry = {
                contentHash,
                configHash,
                envHash,
                dependencyHash,
                mtime: stats.mtimeMs,
                outputPath,
                lastUsed: Date.now(),
                size: stats.size,
            };

            // Aplicar límites de memoria y entradas antes de agregar
            this.evictIfNeeded(entry.size);

            this.cache.set(filePath, entry);
            this.currentMemoryUsage += entry.size;
        } catch (error) {
            // Si hay error, no cachear
            console.warn(`Warning: No se pudo cachear ${filePath}:`, error);
        }
    } /**
     * Aplica política LRU para liberar espacio
     */
    private evictIfNeeded(newEntrySize: number): void {
        // Verificar límite de entradas más agresivamente
        while (this.cache.size >= this.maxEntries * 0.8) {
            // Limpiar cuando llegue al 80%
            this.evictLRU();
        }

        // Verificar límite de memoria más agresivamente
        while (
            this.currentMemoryUsage + newEntrySize > this.maxMemory * 0.8 && // Limpiar cuando llegue al 80%
            this.cache.size > 0
        ) {
            this.evictLRU();
        }

        // Eviction adicional si la memoria total del proceso es alta
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / (1024 * 1024);

        if (heapUsedMB > 200 && this.cache.size > 50) {
            // Si heap > 200MB, limpiar más agresivamente
            const entriesToRemove = Math.min(this.cache.size - 50, 10);
            for (let i = 0; i < entriesToRemove; i++) {
                this.evictLRU();
            }
        }
    } /**
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
     * Método público para limpiar entradas del cache cuando sea necesario
     */
    public cleanOldEntries(maxEntriesToRemove: number = 20): number {
        let removedCount = 0;
        for (let i = 0; i < maxEntriesToRemove && this.cache.size > 0; i++) {
            const sizeBefore = this.cache.size;
            this.evictLRU();
            if (this.cache.size < sizeBefore) {
                removedCount++;
            } else {
                break; // No se pudo remover más entradas
            }
        }
        return removedCount;
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
    } /**
     * Obtiene la ruta de salida para un archivo cacheado
     */
    getOutputPath(filePath: string): string {
        const entry = this.cache.get(filePath);
        return entry?.outputPath || '';
    } /**
     * Obtiene estadísticas del cache
     */
    getStats(): { entries: number; memoryUsage: number; hitRate: number } {
        return {
            entries: this.cache.size,
            memoryUsage: this.currentMemoryUsage,
            hitRate: 0, // Se calculará externamente
        };
    }

    // ✨ ISSUE #3: Métodos de vigilancia y invalidación cascada

    /**
     * Inicializa vigilancia de package.json y node_modules
     */
    async startDependencyWatching(): Promise<void> {
        if (this.isWatchingDependencies) return;

        try {
            // Lazy load chokidar para evitar problemas de importación
            const chokidar = await import('chokidar');

            // Vigilar package.json
            if (await this.fileExists(this.packageJsonPath)) {
                const packageWatcher = chokidar.watch(this.packageJsonPath, {
                    persistent: false, // No mantener el proceso vivo
                    ignoreInitial: true,
                });

                packageWatcher.on('change', () => {
                    logger.info(
                        '📦 package.json modificado - invalidando cache de dependencias',
                    );
                    this.invalidateByDependencyChange();
                });

                this.fileWatchers.set('package.json', packageWatcher);
            }

            // Vigilar node_modules (solo cambios en el directorio raíz para performance)
            if (await this.fileExists(this.nodeModulesPath)) {
                const nodeModulesWatcher = chokidar.watch(
                    this.nodeModulesPath,
                    {
                        persistent: false,
                        ignoreInitial: true,
                        depth: 1, // Solo primer nivel para performance
                        ignored: /(^|[/\\])\../, // Ignorar archivos ocultos
                    },
                );
                nodeModulesWatcher.on('addDir', (path: string) => {
                    logger.info(
                        `📦 Nueva dependencia instalada: ${path.split(/[/\\]/).pop()}`,
                    );
                    this.invalidateByDependencyChange();
                });

                nodeModulesWatcher.on('unlinkDir', (path: string) => {
                    logger.info(
                        `📦 Dependencia eliminada: ${path.split(/[/\\]/).pop()}`,
                    );
                    this.invalidateByDependencyChange();
                });

                this.fileWatchers.set('node_modules', nodeModulesWatcher);
            }

            this.isWatchingDependencies = true;
            logger.info('🔍 Vigilancia de dependencias iniciada');
        } catch (error) {
            logger.warn(
                '⚠️ No se pudo iniciar vigilancia de dependencias:',
                error,
            );
        }
    }

    /**
     * Detiene la vigilancia de dependencias
     */
    async stopDependencyWatching(): Promise<void> {
        for (const [name, watcher] of this.fileWatchers) {
            try {
                await watcher.close();
                logger.info(`🛑 Vigilancia detenida: ${name}`);
            } catch (error) {
                logger.warn(`⚠️ Error cerrando watcher ${name}:`, error);
            }
        }
        this.fileWatchers.clear();
        this.isWatchingDependencies = false;
    }

    /**
     * Registra dependencias de un archivo para invalidación cascada
     */
    registerDependencies(filePath: string, dependencies: string[]): void {
        // Limpiar dependencias anteriores
        const oldDeps = this.dependencyGraph.get(filePath);
        if (oldDeps) {
            for (const dep of oldDeps) {
                const reverseDeps = this.reverseDependencyGraph.get(dep);
                if (reverseDeps) {
                    reverseDeps.delete(filePath);
                    if (reverseDeps.size === 0) {
                        this.reverseDependencyGraph.delete(dep);
                    }
                }
            }
        }

        // Registrar nuevas dependencias
        const newDeps = new Set(dependencies);
        this.dependencyGraph.set(filePath, newDeps);

        for (const dep of newDeps) {
            if (!this.reverseDependencyGraph.has(dep)) {
                this.reverseDependencyGraph.set(dep, new Set());
            }
            this.reverseDependencyGraph.get(dep)!.add(filePath);
        }
    }

    /**
     * Invalida cache por cambios en dependencias
     */
    private invalidateByDependencyChange(): void {
        let invalidatedCount = 0;

        // Invalidar todos los archivos que dependen de dependencias externas
        for (const [filePath] of this.cache) {
            this.cache.delete(filePath);
            invalidatedCount++;
        }

        // Limpiar grafos de dependencias
        this.dependencyGraph.clear();
        this.reverseDependencyGraph.clear();
        this.currentMemoryUsage = 0;

        logger.info(
            `🗑️ Cache invalidado: ${invalidatedCount} archivos (cambio en dependencias)`,
        );
    }

    /**
     * Invalida cascada cuando un archivo específico cambia
     */
    invalidateCascade(changedFile: string): string[] {
        const invalidated: string[] = [];
        const toInvalidate = new Set<string>([changedFile]);

        // BFS para encontrar todos los archivos afectados
        const queue = [changedFile];
        while (queue.length > 0) {
            const current = queue.shift()!;
            const dependents = this.reverseDependencyGraph.get(current);

            if (dependents) {
                for (const dependent of dependents) {
                    if (!toInvalidate.has(dependent)) {
                        toInvalidate.add(dependent);
                        queue.push(dependent);
                    }
                }
            }
        }

        // Invalidar archivos
        for (const filePath of toInvalidate) {
            if (this.cache.has(filePath)) {
                const entry = this.cache.get(filePath)!;
                this.currentMemoryUsage -= entry.size;
                this.cache.delete(filePath);
                invalidated.push(filePath);
            }
        }

        if (invalidated.length > 0) {
            logger.info(
                `🔄 Invalidación cascada: ${invalidated.length} archivos afectados por ${changedFile}`,
            );
        }

        return invalidated;
    }

    /**
     * Verifica si un archivo existe
     */
    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await stat(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Obtiene estadísticas avanzadas del cache
     */
    getAdvancedStats(): {
        entries: number;
        memoryUsage: number;
        hitRate: number;
        dependencyNodes: number;
        watchingDependencies: boolean;
        activeWatchers: number;
    } {
        return {
            entries: this.cache.size,
            memoryUsage: this.currentMemoryUsage,
            hitRate: 0,
            dependencyNodes: this.dependencyGraph.size,
            watchingDependencies: this.isWatchingDependencies,
            activeWatchers: this.fileWatchers.size,
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

    // ✨ ISSUE #3: Iniciar vigilancia de dependencias en modo watch
    if (
        env.WATCH_MODE === 'true' ||
        argv.includes('--watch') ||
        argv.includes('-w')
    ) {
        await smartCache.startDependencyWatching();
    }
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
    totalTime?: string,
): Promise<void> {
    const chalk = await loadChalk();
    if (compilationErrors.length === 0 && compilationResults.length === 0) {
        logger.info(
            chalk.green('✅ No hay errores de compilación para mostrar.'),
        );
        if (totalTime) {
            logger.info(
                chalk.bold(`\n⏱️ TIEMPO TOTAL DE COMPILACIÓN: ${totalTime}`),
            );
        }
        return;
    }

    logger.info(chalk.bold('\n--- 📊 RESUMEN DE COMPILACIÓN ---'));

    // Mostrar tiempo total prominentemente al inicio si está disponible
    if (totalTime) {
        logger.info(
            chalk.bold(
                chalk.cyan(`⏱️ TIEMPO TOTAL DE COMPILACIÓN: ${totalTime}\n`),
            ),
        );
    }

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
            const icon = error.severity === 'error' ? '❌ ' : '⚠️ ';
            logger.info(`${icon} ${error.message}`);
            if (error.help) {
                logger.info(`   |`);
                logger.info(`   └ Linter: ${error.from}`);
                logger.info(`   |`);

                logger.info(`   └ Linea: ${error.line}`);
                logger.info(`   |`);
                logger.info(`   └─ ${error.help}\n`);
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
                    const { TypeScriptWorkerPool } = (await import(
                        './typescript-worker-pool'
                    )) as { TypeScriptWorkerPool: any };
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
        : normalizeRuta(path.resolve(inPath)); // 🚀 Usar OptimizedModuleManager para carga optimizada
    const moduleManager = OptimizedModuleManager.getInstance();

    // Timing de lectura
    let start = Date.now();

    const extension = path.extname(inPath); // Asegurar que el parser esté cargado
    await moduleManager.ensureModuleLoaded('parser');
    const getCodeFile = await loadParser();
    const result = await getCodeFile(inPath);
    let code = result.code;
    const error = result.error;
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
    } // Logs detallados en modo verbose
    const shouldShowDetailedLogs = env.VERBOSE === 'true'; // Compilación de Vue
    let vueResult;
    if (extension === '.vue') {
        start = Date.now();
        if (shouldShowDetailedLogs) {
            logger.info(
                chalk!.green(`💚 Precompilando VUE: ${path.basename(inPath)}`),
            );
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
            logger.info(
                chalk!.blue(`🔄️ Precompilando TS: ${path.basename(inPath)}`),
            );
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
    } // Estandarización
    if (shouldShowDetailedLogs) {
        logger.info(
            chalk!.yellow(`💛 Estandarizando: ${path.basename(inPath)}`),
        );
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
            logger.info(chalk!.red(`🤖 Minificando: ${path.basename(inPath)}`));
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
    } // Escribir archivo final
    const destinationDir = path.dirname(outPath);
    await mkdir(destinationDir, { recursive: true });
    await writeFile(outPath, code, 'utf-8');

    // Logs de timing detallados en modo verbose
    if (shouldShowDetailedLogs) {
        const totalTime = Object.values(timings).reduce(
            (sum, time) => sum + time,
            0,
        );
        logger.info(chalk!.cyan(`⏱️ Timing para ${path.basename(inPath)}:`));
        if (timings.fileRead)
            logger.info(chalk!.cyan(`  📖 Lectura: ${timings.fileRead}ms`));
        if (timings.vueCompile)
            logger.info(chalk!.cyan(`  💚 Vue: ${timings.vueCompile}ms`));
        if (timings.tsCompile)
            logger.info(
                chalk!.cyan(`  🔄️ TypeScript: ${timings.tsCompile}ms`),
            );
        if (timings.standardization)
            logger.info(
                chalk!.cyan(
                    `  💛 Estandarización: ${timings.standardization}ms`,
                ),
            );
        if (timings.minification)
            logger.info(
                chalk!.cyan(`  🤖 Minificación: ${timings.minification}ms`),
            );
        logger.info(chalk!.cyan(`  🏁 Total: ${totalTime}ms`));
    }

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
        const moduleManager = OptimizedModuleManager.getInstance();
        const fileExtension = path.extname(ruta);
        const fileExtensions = new Set([fileExtension]);

        // Inicializar módulos según el contexto
        await moduleManager.preloadForContext(
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

// Sistema de gestión de progreso persistente (como Jest)
class ProgressManager {
    private static instance: ProgressManager;
    private progressActive = false;
    private lastProgressLine = '';
    private logBuffer: string[] = [];
    private originalConsoleLog: typeof console.log;
    private originalConsoleError: typeof console.error;
    private originalConsoleWarn: typeof console.warn;
    private hasProgressLine = false;

    constructor() {
        // Guardar referencias originales
        this.originalConsoleLog = console.log;
        this.originalConsoleError = console.error;
        this.originalConsoleWarn = console.warn;
    }

    static getInstance(): ProgressManager {
        if (!ProgressManager.instance) {
            ProgressManager.instance = new ProgressManager();
        }
        return ProgressManager.instance;
    }

    private interceptConsole(): void {
        // Interceptar console.log y similares
        console.log = (...args: any[]) => {
            this.addLog(args.map(arg => String(arg)).join(' '));
        };

        console.error = (...args: any[]) => {
            this.addLog(args.map(arg => String(arg)).join(' '));
        };

        console.warn = (...args: any[]) => {
            this.addLog(args.map(arg => String(arg)).join(' '));
        };
    }

    private restoreConsole(): void {
        console.log = this.originalConsoleLog;
        console.error = this.originalConsoleError;
        console.warn = this.originalConsoleWarn;
    }
    startProgress(): void {
        this.progressActive = true;
        this.logBuffer = [];
        this.hasProgressLine = false;
        this.interceptConsole();

        // Escribir separador inicial para marcar el inicio del progreso
        process.stdout.write('\n\x1b[36m' + '='.repeat(60) + '\x1b[0m\n');
        process.stdout.write('\x1b[36m🚀 INICIANDO COMPILACIÓN\x1b[0m\n');
        process.stdout.write('\x1b[36m' + '='.repeat(60) + '\x1b[0m\n');
    }

    updateProgress(progressText: string): void {
        if (!this.progressActive) return;

        // Si hay logs pendientes, mostrarlos primero
        if (this.logBuffer.length > 0) {
            // Si ya hay una línea de progreso, limpiarla primero
            if (this.hasProgressLine) {
                process.stdout.write('\r\x1b[K');
            }

            // Escribir todos los logs pendientes
            for (const log of this.logBuffer) {
                process.stdout.write(
                    (this.hasProgressLine ? '\n' : '') + log + '\n',
                );
                this.hasProgressLine = false;
            }
            this.logBuffer = [];
        }

        // Escribir separador antes del progreso para mayor visibilidad
        if (this.hasProgressLine) {
            process.stdout.write('\r\x1b[K');
        } else {
            process.stdout.write('\n\x1b[33m' + '-'.repeat(50) + '\x1b[0m\n');
        }

        // Barra de progreso con mayor visibilidad
        const progressBar = '█'.repeat(3);
        const enhancedProgress = `\x1b[44m\x1b[97m ${progressBar} ${progressText} ${progressBar} \x1b[0m`;
        process.stdout.write(enhancedProgress);

        this.hasProgressLine = true;
        this.lastProgressLine = progressText;
    }

    addLog(message: string): void {
        if (this.progressActive) {
            this.logBuffer.push(message);
        } else {
            this.originalConsoleLog(message);
        }
    }

    addImmediateLog(message: string): void {
        if (this.progressActive) {
            if (this.hasProgressLine) {
                process.stdout.write('\r\x1b[K');
            }

            // Añadir un punto de separación visual para logs inmediatos
            process.stdout.write('\x1b[90m│\x1b[0m ' + message + '\n');
            this.hasProgressLine = false;
        } else {
            this.originalConsoleLog(message);
        }
    }
    endProgress(): void {
        if (this.progressActive) {
            if (this.hasProgressLine) {
                process.stdout.write('\n');
            }

            // Mostrar barra de progreso final completa antes del separador
            process.stdout.write('\n\x1b[33m' + '-'.repeat(50) + '\x1b[0m\n');
            const finalProgressBar = '█'.repeat(3);
            const finalProgress = `\x1b[42m\x1b[30m ${finalProgressBar} ✅ PROCESO COMPLETADO 100% ${finalProgressBar} \x1b[0m`;
            process.stdout.write(finalProgress + '\n');

            // Separador final muy visible
            process.stdout.write('\x1b[32m' + '='.repeat(60) + '\x1b[0m\n');
            process.stdout.write('\x1b[32m✅ COMPILACIÓN COMPLETADA\x1b[0m\n');
            process.stdout.write('\x1b[32m' + '='.repeat(60) + '\x1b[0m\n\n');

            // Escribir logs finales pendientes
            if (this.logBuffer.length > 0) {
                for (const log of this.logBuffer) {
                    process.stdout.write(log + '\n');
                }
            }
        }

        this.restoreConsole();
        this.progressActive = false;
        this.lastProgressLine = '';
        this.logBuffer = [];
        this.hasProgressLine = false;
    }

    isActive(): boolean {
        return this.progressActive;
    }
}

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
                                                    from: 'eslint',
                                                    line: result.line,
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
                                                                from: 'eslint',
                                                                line: fileResult.line,
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
                                    Array.isArray(
                                        oxlintResult['json']['diagnostics'],
                                    )
                                ) {
                                    oxlintResult['json']['diagnostics'].forEach(
                                        (result: any) => {
                                            linterErrors.push({
                                                from: 'oxlint',
                                                line:
                                                    result.labels[0].span
                                                        ?.line ?? '',
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
                                                    (result.code
                                                        ? `Regla Oxlint: ${result.code}`
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
    let failed = 0;

    // Usar el gestor de progreso existente (ya iniciado en initCompileAll)
    const progressManager = ProgressManager.getInstance();

    // Variable para controlar el progreso inicial
    let hasShownInitialProgress = false;

    // Contador para limpieza periódica de memoria
    let compilationCounter = 0;
    const CLEANUP_INTERVAL = 20; // Limpiar cada 20 compilaciones

    // Función para mostrar progreso
    function showProgress() {
        const currentTotal = completed + skipped + failed;
        const progressBar = createProgressBar(currentTotal, total);
        const progressPercent = Math.round((currentTotal / total) * 100);

        // Mostrar progreso inicial cuando se inicie O cuando haya progreso real
        if (
            (currentTotal === 0 && !hasShownInitialProgress) ||
            (progressPercent > lastProgressUpdate + 1 && currentTotal > 0) ||
            currentTotal === total
        ) {
            const progressText = `🚀 ${progressBar} [✅ ${completed} | ⏭️ ${skipped} | ❌ ${failed}]`;
            progressManager.updateProgress(progressText);

            if (currentTotal === 0) {
                hasShownInitialProgress = true;
            }

            lastProgressUpdate = progressPercent;

            // NO terminar el progreso aquí - se termina en initCompileAll
        }
    }

    // Mostrar progreso inicial
    showProgress();
    for (const file of files) {
        const promise = (async () => {
            try {
                // Log verbose: Iniciando compilación del archivo
                if (env.VERBOSE === 'true') {
                    logger.info(`🔄 Compilando: ${path.basename(file)}`);
                }

                // Verificar cache antes de compilar
                if (await shouldSkipFile(file)) {
                    skipped++;
                    if (env.VERBOSE === 'true') {
                        logger.info(
                            `⏭️ Archivo omitido (cache): ${path.basename(file)}`,
                        );
                    }
                    showProgress();
                    return {
                        success: true,
                        cached: true,
                        output: smartCache.getOutputPath(file),
                    };
                }
                const result = await initCompile(file, false, 'batch');

                // Actualizar cache si la compilación fue exitosa
                if (result.success && result.output) {
                    await smartCache.set(file, result.output);
                    if (env.VERBOSE === 'true') {
                        logger.info(
                            `✅ Completado: ${path.basename(file)} → ${path.basename(result.output)}`,
                        );
                    }
                } else if (env.VERBOSE === 'true') {
                    logger.info(`❌ Error en: ${path.basename(file)}`);
                }

                completed++;
                compilationCounter++; // Limpieza periódica de memoria
                if (compilationCounter % CLEANUP_INTERVAL === 0) {
                    // Forzar garbage collection si está disponible
                    try {
                        if (typeof (globalThis as any).gc === 'function') {
                            (globalThis as any).gc();
                        }
                    } catch {
                        // gc no disponible, continuar normalmente
                    }

                    // Limpiar cache si la memoria es alta
                    const memUsage = process.memoryUsage();
                    const heapUsedMB = memUsage.heapUsed / (1024 * 1024);
                    if (heapUsedMB > 300) {
                        // Si el heap supera 300MB
                        const cacheEntries = smartCache.getStats().entries;
                        if (cacheEntries > 50) {
                            console.log(
                                `[Memory] Heap alto (${heapUsedMB.toFixed(1)}MB), limpiando cache...`,
                            );
                            // Limpiar entradas más antiguas del cache
                            const removedEntries =
                                smartCache.cleanOldEntries(20);
                            if (removedEntries > 0) {
                                console.log(
                                    `[Memory] Se removieron ${removedEntries} entradas del cache`,
                                );
                            }
                        }
                    }
                }

                showProgress();
                return result;
            } catch (error) {
                failed++;
                if (env.VERBOSE === 'true') {
                    const errorMsg =
                        error instanceof Error ? error.message : String(error);
                    logger.error(
                        `💥 Falló: ${path.basename(file)} - ${errorMsg}`,
                    );
                }
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

    // El progreso ya se termina automáticamente en showProgress() cuando se completa
}

export async function initCompileAll() {
    try {
        // Inicializar el gestor de progreso desde el inicio
        const progressManager = ProgressManager.getInstance();
        progressManager.startProgress();

        // Fase 1: Preparación inicial
        progressManager.updateProgress('🚀 Iniciando compilación...');

        // Limpiar estado de compilación anterior
        clearCompilationState();

        // Cargar cache al inicio
        progressManager.updateProgress('📦 Cargando cache...');
        await loadCache();
        lastProgressUpdate = 0;

        // Fase 2: Linting
        progressManager.updateProgress('🔍 Ejecutando linter...');
        const shouldContinue = await runLinter();
        if (!shouldContinue) {
            // await displayCompilationSummary(env.VERBOSE === 'true');
            progressManager.endProgress();
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
        logger.info(`🔚 Destino: ${pathDist}\n`);

        // Fase 3: TailwindCSS
        progressManager.updateProgress('🎨 Generando TailwindCSS...');
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
        }

        // Fase 4: Recopilando archivos
        progressManager.updateProgress('📁 Recopilando archivos...');
        const filesToCompile: string[] = [];
        for await (const file of glob(patterns)) {
            if (file.endsWith('.d.ts')) {
                continue;
            }
            // Usar la ruta tal como viene de glob, sin modificar
            filesToCompile.push(file);
        } // Determinar concurrencia óptima considerando memoria disponible
        const cpuCount = os.cpus().length;
        const fileCount = filesToCompile.length;
        const memUsage = process.memoryUsage();
        const availableMemoryMB =
            (memUsage.heapTotal - memUsage.heapUsed) / (1024 * 1024);

        let maxConcurrency: number;

        // Ajustar concurrencia basado en memoria disponible y archivos
        if (availableMemoryMB < 100) {
            // Poca memoria disponible
            maxConcurrency = Math.min(2, cpuCount);
        } else if (fileCount < 10) {
            maxConcurrency = Math.min(fileCount, Math.min(cpuCount, 4));
        } else if (fileCount < 50) {
            maxConcurrency = Math.min(cpuCount, 6); // Reducido
        } else {
            maxConcurrency = Math.min(cpuCount, 8); // Reducido
        }

        // Fase 5: Configurando workers
        progressManager.updateProgress('⚙️ Configurando workers...');
        logger.info(
            `🚀 Compilando ${fileCount} archivos con concurrencia optimizada (${maxConcurrency} hilos)...`,
        ); // Configurar worker pool para modo batch
        try {
            const { TypeScriptWorkerPool } = (await import(
                './typescript-worker-pool'
            )) as { TypeScriptWorkerPool: any };
            const workerPool = TypeScriptWorkerPool.getInstance();
            workerPool.setMode('batch');
        } catch {
            // Error silencioso en configuración del pool
        } // Fase 6: Compilación (el progreso continúa en compileWithConcurrencyLimit)
        progressManager.updateProgress(
            `🚀 Iniciando compilación de ${fileCount} archivos...`,
        );
        await compileWithConcurrencyLimit(filesToCompile, maxConcurrency); // Guardar cache al final
        progressManager.updateProgress('💾 Guardando cache...');
        await saveCache();

        const endTime = Date.now();
        const elapsedTime = showTimingForHumans(endTime - startTime); // Finalizar progreso
        progressManager.endProgress();

        // Mostrar resumen de compilación con tiempo total
        await displayCompilationSummary(env.VERBOSE === 'true', elapsedTime);
    } catch (error) {
        // Asegurar que el progreso termine en caso de error
        const progressManager = ProgressManager.getInstance();
        if (progressManager.isActive()) {
            progressManager.endProgress();
        }

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
        ); // Mostrar resumen incluso si hay errores generales
        await displayCompilationSummary(env.VERBOSE === 'true');
    }
}

// Función wrapper para compatibilidad con tests
export async function compileFile(filePath: string) {
    return await initCompile(filePath, true, 'individual');
}

export { WatchModeOptimizer };
