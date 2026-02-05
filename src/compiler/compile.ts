import { createHash } from 'node:crypto';
import {
    glob,
    mkdir,
    readFile,
    stat,
    unlink,
    writeFile,
} from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as process from 'node:process';
const { argv, cwd, env } = process;

// Lazy loading optimizations - Only import lightweight modules synchronously

import { logger, setProgressManagerGetter } from '../servicios/logger';
import { promptUser } from '../utils/promptUser';
import { showTimingForHumans } from '../utils/utils';

// Configurar el getter del ProgressManager para el logger
setProgressManagerGetter(() => ProgressManager.getInstance());

/**
 * ✨ FIX #5: Wrapper con timeout para operaciones críticas
 * Evita que promesas colgadas bloqueen la compilación indefinidamente
 */
async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operationName: string,
): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
            () =>
                reject(
                    new Error(`Timeout en ${operationName} (${timeoutMs}ms)`),
                ),
            timeoutMs,
        ),
    );

    return Promise.race([promise, timeoutPromise]);
}

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
    private preloadLock: Promise<void> | null = null; // Lock para evitar precargas concurrentes

    // ✨ FIX #4: Límites estrictos de memoria para el pool
    private readonly MAX_POOL_MEMORY = 100 * 1024 * 1024; // 100MB límite total
    private readonly MAX_POOL_SIZE = 15; // Máximo 15 módulos en pool

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
     * ✨ MEJORADO: Precarga contextual basada en tipos de archivo con lock para prevenir cargas concurrentes
     */
    async preloadForContext(
        context: 'individual' | 'batch' | 'watch',
        fileTypes: Set<string> = new Set(),
    ): Promise<void> {
        // Si ya hay una precarga en progreso, esperar a que termine
        if (this.preloadLock) {
            await this.preloadLock;
            return;
        }

        // Crear el lock
        this.preloadLock = this.doPreload(context, fileTypes);

        try {
            await this.preloadLock;
        } finally {
            this.preloadLock = null;
        }
    }

    /**
     * ✨ Método interno de precarga
     */
    private async doPreload(
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

        // ✨ OPTIMIZACIÓN #10: Agrupar módulos compatibles y cargarlos en paralelo
        // Grupos de módulos que NO comparten dependencias nativas problemáticas
        const moduleGroups = [
            ['chalk', 'parser'], // Grupo 1: Módulos ligeros sin node:crypto
            ['transforms'], // Grupo 2: Puede usar node:crypto pero independiente
            ['vue', 'typescript'], // Grupo 3: Comparten configuración
            ['module-resolution-optimizer'], // Grupo 4: Independiente
            ['minify'], // Grupo 5: Independiente
        ];

        // Cargar cada grupo en paralelo, pero grupos secuencialmente
        for (const group of moduleGroups) {
            const modulesToLoad = group.filter(name =>
                toPreload.includes(name),
            );

            if (modulesToLoad.length > 0) {
                // Cargar módulos del grupo en paralelo
                await Promise.allSettled(
                    modulesToLoad.map(async moduleName => {
                        try {
                            await this.ensureModuleLoaded(moduleName);
                        } catch (error) {
                            // Silenciar errores de precarga - los módulos se cargarán bajo demanda
                            if (env.VERBOSE === 'true') {
                                const errorMessage =
                                    error instanceof Error
                                        ? error.message
                                        : String(error);
                                console.warn(
                                    `[Verbose] Warning: No se pudo precargar módulo ${moduleName}:`,
                                    errorMessage,
                                );
                            }
                        }
                    }),
                );
            }
        }
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
            // ✨ Usar minifyWithTemplates para minificar templates HTML ANTES del JS
            minifyJS = minifyModule.minifyWithTemplates;
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
            const resolutionModule =
                await import('./module-resolution-optimizer');
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
     * ✨ FIX #4: Estima el tamaño en memoria de un módulo
     */
    private estimateModuleSize(moduleName: string): number {
        // Estimaciones basadas en tipos de módulo
        const sizeMap: Record<string, number> = {
            'transform-optimizer': 5 * 1024 * 1024, // 5MB
            typescript: 10 * 1024 * 1024, // 10MB
            vue: 8 * 1024 * 1024, // 8MB
            'module-resolution-optimizer': 3 * 1024 * 1024, // 3MB
            transforms: 2 * 1024 * 1024, // 2MB
            minify: 2 * 1024 * 1024, // 2MB
            linter: 1 * 1024 * 1024, // 1MB
            parser: 500 * 1024, // 500KB
            chalk: 100 * 1024, // 100KB
            default: 500 * 1024, // 500KB por defecto
        };

        return sizeMap[moduleName] ?? (sizeMap.default as number);
    }

    /**
     * ✨ FIX #4: Obtiene el uso total de memoria del pool
     */
    private getPoolMemoryUsage(): number {
        let totalSize = 0;
        for (const moduleName of this.modulePool.keys()) {
            totalSize += this.estimateModuleSize(moduleName);
        }
        return totalSize;
    }

    /**
     * ✨ FIX #4: Limpia módulos no utilizados con control de memoria LRU
     */
    cleanupUnusedModules(): void {
        const currentMemory = this.getPoolMemoryUsage();
        const currentSize = this.modulePool.size;

        // Limpiar si excedemos límites de memoria o tamaño
        if (
            currentMemory > this.MAX_POOL_MEMORY ||
            currentSize > this.MAX_POOL_SIZE
        ) {
            // LRU: Ordenar por menos usado
            const sortedModules = Array.from(this.usageStats.entries())
                .sort((a, b) => a[1] - b[1]) // Ascendente por uso
                .filter(([name]) => !this.HOT_MODULES.includes(name)); // No eliminar HOT_MODULES

            // Eliminar módulos hasta estar por debajo del 70% del límite
            const targetMemory = this.MAX_POOL_MEMORY * 0.7;
            const targetSize = this.MAX_POOL_SIZE * 0.7;

            for (const [moduleName] of sortedModules) {
                this.modulePool.delete(moduleName);
                this.loadedModules.delete(moduleName);
                this.usageStats.delete(moduleName);

                const newMemory = this.getPoolMemoryUsage();
                const newSize = this.modulePool.size;

                if (newMemory <= targetMemory && newSize <= targetSize) {
                    break;
                }
            }

            if (env.VERBOSE === 'true') {
                console.log(
                    `[ModuleManager] Limpieza: ${currentSize} → ${this.modulePool.size} módulos, ` +
                        `${Math.round(currentMemory / 1024 / 1024)}MB → ${Math.round(this.getPoolMemoryUsage() / 1024 / 1024)}MB`,
                );
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
        // ✨ Usar minifyWithTemplates para minificar templates HTML ANTES del JS
        minifyJS = minifyModule.minifyWithTemplates;
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
    // No mostrar stack trace para errores de tipo TypeScript (son errores del usuario, no del compilador)
    const isTypeError = error instanceof Error && (error as any).isTypeError;
    const errorDetails =
        error instanceof Error && !isTypeError ? error.stack : undefined;

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

    // 🎨 Header moderno del resumen
    const summaryLine = '━'.repeat(40);
    logger.info('');
    logger.info(chalk.bold.cyan('📊 Resumen de Compilación'));
    logger.info(chalk.gray(summaryLine)); // ⏱️ Tiempo total con formato elegante
    if (totalTime) {
        logger.info(chalk.bold(`⏱️  Tiempo Total: ${chalk.green(totalTime)}`));
        logger.info('');
    } // 🔧 Estadísticas por etapa con mejor formato
    if (compilationResults.length > 0) {
        logger.info(chalk.bold.blue('🔧 Estadísticas por Etapa:'));

        for (const result of compilationResults) {
            const totalFiles = result.success + result.errors;
            const successRate =
                totalFiles > 0
                    ? Math.round((result.success / totalFiles) * 100)
                    : 0;

            // Iconos y colores dinámicos por etapa
            const stageIcon = getStageIcon(result.stage);
            const statusColor = result.errors === 0 ? chalk.green : chalk.red;
            const progressBar = createProgressBarWithPercentage(
                successRate,
                20,
            );
            logger.info(`   ${stageIcon} ${chalk.bold(result.stage)}`);
            logger.info(
                `     ${statusColor('●')} ${result.success}/${totalFiles} archivos ${statusColor(`(${successRate}%)`)}`,
            );
            logger.info(`     ${progressBar}`);

            if (result.errors > 0) {
                logger.info(
                    `     ${chalk.red('⚠')} ${result.errors} ${result.errors === 1 ? 'error' : 'errores'}`,
                );
            }
            logger.info('');
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
        } // 📊 Mostrar totales finales con diseño moderno
        const totalErrors = compilationErrors.filter(
            e => e.severity === 'error',
        ).length;
        const totalWarnings = compilationErrors.filter(
            e => e.severity === 'warning',
        ).length;
        const totalFiles = errorsByFile.size;

        // Header elegante para estadísticas finales
        const statLine = '═'.repeat(50);
        logger.info('');
        logger.info(chalk.bold.cyan(statLine));
        logger.info(chalk.bold.cyan('                📊 RESUMEN FINAL'));
        logger.info(chalk.bold.cyan(statLine));

        // Estadísticas con iconos y colores modernos
        logger.info('');
        logger.info(chalk.bold('🎯 Resultados:'));
        logger.info(`   📁 Archivos afectados: ${chalk.cyan.bold(totalFiles)}`);
        logger.info(
            `   ${totalErrors > 0 ? chalk.red('●') : chalk.green('○')} Errores: ${totalErrors > 0 ? chalk.red.bold(totalErrors) : chalk.green.bold('0')}`,
        );
        logger.info(
            `   ${totalWarnings > 0 ? chalk.yellow('●') : chalk.green('○')} Advertencias: ${totalWarnings > 0 ? chalk.yellow.bold(totalWarnings) : chalk.green.bold('0')}`,
        );

        logger.info('');

        // Estado final con diseño visual atractivo
        if (totalErrors > 0) {
            logger.info(
                chalk.red.bold('🚨 COMPILACIÓN COMPLETADA CON ERRORES'),
            );
            logger.info(
                chalk.red(
                    '   Por favor revisa y corrige los problemas anteriores.',
                ),
            );
        } else if (totalWarnings > 0) {
            logger.info(
                chalk.yellow.bold(
                    '⚠️  COMPILACIÓN COMPLETADA CON ADVERTENCIAS',
                ),
            );
            logger.info(
                chalk.yellow(
                    '   Considera revisar las advertencias anteriores.',
                ),
            );
        } else {
            logger.info(chalk.green.bold('✅ COMPILACIÓN EXITOSA'));
            logger.info(
                chalk.green(
                    '   ¡Todos los archivos se compilaron sin problemas!',
                ),
            );
        }

        logger.info('');
        logger.info(chalk.bold.cyan(statLine));
    } else {
        // Caso exitoso sin errores
        const successLine = '═'.repeat(50);
        logger.info('');
        logger.info(chalk.bold.green(successLine));
        logger.info(chalk.bold.green('                ✨ ÉXITO'));
        logger.info(chalk.bold.green(successLine));
        logger.info('');
        logger.info(chalk.green.bold('🎉 COMPILACIÓN COMPLETADA EXITOSAMENTE'));
        logger.info(
            chalk.green('   ¡No se encontraron errores ni advertencias!'),
        );
        logger.info('');
        logger.info(chalk.bold.green(successLine));
    }

    logger.info('');
}

/**
 * Muestra errores del linter con formato visual moderno y profesional
 */
async function displayLinterErrors(errors: any[]): Promise<void> {
    const chalk = await loadChalk();

    // Agrupar errores por archivo
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

    // Header estilo moderno con gradiente visual
    logger.info(
        chalk.bold.rgb(
            255,
            120,
            120,
        )('╭─────────────────────────────────────────────────────────────╮'),
    );
    logger.info(
        chalk.bold.rgb(255, 120, 120)('│                    ') +
            chalk.bold.white('🔍 LINTER REPORT') +
            chalk.bold.rgb(255, 120, 120)('                    │'),
    );
    logger.info(
        chalk.bold.rgb(
            255,
            120,
            120,
        )('╰─────────────────────────────────────────────────────────────╯'),
    );

    // Resumen con iconos profesionales
    const errorIcon = totalErrors > 0 ? chalk.red('●') : chalk.green('○');
    const warningIcon =
        totalWarnings > 0 ? chalk.yellow('●') : chalk.green('○');

    logger.info('');
    logger.info(chalk.bold('📊 Summary:'));
    logger.info(
        `   ${errorIcon} ${chalk.bold(totalErrors)} ${chalk.red('errors')}`,
    );
    logger.info(
        `   ${warningIcon} ${chalk.bold(totalWarnings)} ${chalk.yellow('warnings')}`,
    );
    logger.info(`   📁 ${chalk.bold(totalFiles)} ${chalk.cyan('files')}`);
    logger.info('');

    if (totalErrors === 0 && totalWarnings === 0) {
        logger.info(chalk.green.bold('✨ All checks passed! No issues found.'));
        return;
    }

    // Mostrar errores por archivo con formato elegante
    let fileIndex = 1;
    for (const [filePath, fileErrors] of errorsByFile) {
        await displayFileErrorsGroup(
            filePath,
            fileErrors,
            fileIndex,
            totalFiles,
        );
        fileIndex++;

        if (fileIndex <= totalFiles) {
            logger.info(chalk.gray('─'.repeat(80))); // Separador entre archivos
        }
    }

    // Footer con estadísticas
    logger.info('');
    logger.info(
        chalk.bold.rgb(
            255,
            120,
            120,
        )('╭─────────────────────────────────────────────────────────────╮'),
    );
    logger.info(
        chalk.bold.rgb(255, 120, 120)('│  ') +
            chalk.bold.white(
                `Found ${totalErrors + totalWarnings} issues in ${totalFiles} files`,
            ) +
            ' '.repeat(
                Math.max(
                    0,
                    52 -
                        `Found ${totalErrors + totalWarnings} issues in ${totalFiles} files`
                            .length,
                ),
            ) +
            chalk.bold.rgb(255, 120, 120)('  │'),
    );
    logger.info(
        chalk.bold.rgb(
            255,
            120,
            120,
        )('╰─────────────────────────────────────────────────────────────╯'),
    );
}

/**
 * Muestra un grupo de errores para un archivo específico con formato moderno
 */
async function displayFileErrorsGroup(
    filePath: string,
    fileErrors: any[],
    _fileIndex: number,
    _totalFiles: number,
): Promise<void> {
    const chalk = await loadChalk();

    // Header del archivo con iconos de estado
    const errorCount = fileErrors.filter(e => e.severity === 'error').length;
    const warningCount = fileErrors.filter(
        e => e.severity === 'warning',
    ).length;

    const statusIcon = errorCount > 0 ? chalk.red('✕') : chalk.yellow('⚠');
    const fileIcon = filePath.endsWith('.vue')
        ? '🎨'
        : filePath.endsWith('.ts')
          ? '📘'
          : filePath.endsWith('.js')
            ? '📜'
            : '📄';

    logger.info('');
    logger.info(
        chalk.bold(
            `${statusIcon} ${fileIcon} ${chalk.cyan(path.relative(process.cwd(), filePath))}`,
        ),
    );
    logger.info(
        chalk.gray(`   ${errorCount} errors, ${warningCount} warnings`),
    );
    logger.info('');

    // Mostrar cada error con formato elegante
    for (let i = 0; i < fileErrors.length; i++) {
        const error = fileErrors[i];
        await displayModernLinterError(
            error,
            filePath,
            i + 1,
            fileErrors.length,
        );
    }
}

/**
 * Muestra un error individual con formato visual moderno tipo ESLint/Prettier
 */
async function displayModernLinterError(
    error: any,
    filePath: string,
    errorIndex: number,
    totalErrorsInFile: number,
): Promise<void> {
    const chalk = await loadChalk();
    const fs = await import('node:fs/promises');

    // Determinar tipo y color del error
    const isError = error.severity === 'error';
    const typeColor = isError ? chalk.red : chalk.yellow;
    const typeIcon = isError ? '✕' : '⚠';

    const line = error.line || 1;
    const column = error.column || 1;
    const ruleId = error.ruleId || error.from || 'unknown';

    // Línea principal del error con formato moderno
    const errorHeader = `  ${typeColor(typeIcon)} ${chalk.bold(error.message)}`;
    const ruleInfo = `${chalk.gray(ruleId)}`;
    const locationInfo = `${chalk.blue(`${line}:${column}`)}`;

    logger.info(errorHeader);
    logger.info(
        `    ${chalk.gray('at')} ${locationInfo} ${chalk.gray('·')} ${ruleInfo}`,
    );

    // Mostrar código con contexto
    try {
        const absolutePath = path.resolve(filePath);
        const fileContent = await fs.readFile(absolutePath, 'utf-8');
        const lines = fileContent.split('\n');
        const lineNum = parseInt(line.toString()) - 1;

        if (lineNum >= 0 && lineNum < lines.length) {
            logger.info('');

            // Mostrar líneas de contexto con numeración elegante
            const startLine = Math.max(0, lineNum - 1);
            const endLine = Math.min(lines.length - 1, lineNum + 1);
            const maxLineNumWidth = (endLine + 1).toString().length;

            for (let i = startLine; i <= endLine; i++) {
                const currentLineNum = i + 1;
                const currentLine = lines[i] || '';
                const lineNumStr = currentLineNum
                    .toString()
                    .padStart(maxLineNumWidth, ' ');
                const isErrorLine = i === lineNum;

                if (isErrorLine) {
                    // Línea con el error - destacada
                    logger.info(
                        `    ${chalk.red('>')} ${chalk.gray(lineNumStr)} ${chalk.gray('│')} ${currentLine}`,
                    );

                    // Indicador de posición del error
                    const pointer =
                        ' '.repeat(Math.max(0, column - 1)) + typeColor('^');
                    logger.info(
                        `    ${chalk.gray(' ')} ${chalk.gray(' '.repeat(maxLineNumWidth))} ${chalk.gray('│')} ${pointer}`,
                    );
                } else {
                    // Líneas de contexto
                    logger.info(
                        `    ${chalk.gray(' ')} ${chalk.gray(lineNumStr)} ${chalk.gray('│')} ${chalk.gray(currentLine)}`,
                    );
                }
            }
        }
    } catch {
        // Si no se puede leer el archivo, mostrar formato simplificado
        logger.info(
            `    ${chalk.gray('│')} ${chalk.gray('(Unable to read file content)')}`,
        );
    }

    // Mostrar ayuda si está disponible
    if (error.help) {
        logger.info('');
        const helpText = error.help.replace(/^Regla \w+: /, '').trim();
        logger.info(
            `    ${chalk.blue('💡')} ${chalk.blue('Help:')} ${chalk.gray(helpText)}`,
        );
    }

    // Separador entre errores (solo si no es el último)
    if (errorIndex < totalErrorsInFile) {
        logger.info('');
    }
}

/**
 * Muestra un solo error del linter con formato visual mejorado
 * @deprecated Use displayModernLinterError instead
 */
async function _displaySingleLinterError(
    error: any,
    filePath: string,
): Promise<void> {
    const chalk = await loadChalk();
    const fs = await import('node:fs/promises');

    const icon = error.severity === 'error' ? '×' : '⚠';
    const ruleInfo = error.help || '';
    const line = error.line || 'N/A';
    const column = error.column || 10; // Columna por defecto si no está disponible

    // Línea principal del error
    const mainErrorLine = `${chalk.red(icon)} ${chalk.cyan(`${error.from}(${ruleInfo.replace(/^Regla \w+: /, '')})`)}: ${error.message}`;
    logger.info(mainErrorLine);

    // Intentar leer el contenido del archivo para mostrar contexto
    try {
        const absolutePath = path.resolve(filePath);
        const fileContent = await fs.readFile(absolutePath, 'utf-8');
        const lines = fileContent.split('\n');
        const lineNum = parseInt(line.toString()) - 1; // Convertir a índice 0-based

        if (lineNum >= 0 && lineNum < lines.length) {
            // Mostrar ubicación
            logger.info(chalk.blue(`    ╭─[${filePath}:${line}:${column}]`));

            // Mostrar líneas de contexto
            const startLine = Math.max(0, lineNum - 1);
            const endLine = Math.min(lines.length - 1, lineNum + 1);

            for (let i = startLine; i <= endLine; i++) {
                const currentLineNum = i + 1;
                const currentLine = lines[i] || '';
                const prefix = currentLineNum.toString().padStart(2, ' ');

                if (i === lineNum) {
                    // Línea con el error
                    logger.info(chalk.blue(` ${prefix} │ `) + currentLine);

                    // Mostrar el indicador de error
                    const indent = ' '.repeat(prefix.length + 3); // Espacios para alinear
                    const pointer =
                        ' '.repeat(Math.max(0, (column || 1) - 1)) +
                        chalk.red('───────┬──────');
                    logger.info(chalk.blue(indent + '·') + pointer);

                    // Mensaje de ubicación específica
                    const messageIndent = ' '.repeat(
                        Math.max(0, (column || 1) + 6),
                    );
                    logger.info(
                        chalk.blue(indent + '·') +
                            messageIndent +
                            chalk.red('╰── ') +
                            chalk.gray(getErrorLocationMessage(error)),
                    );
                } else {
                    // Líneas de contexto
                    logger.info(
                        chalk.blue(` ${prefix} │ `) + chalk.gray(currentLine),
                    );
                }
            }

            logger.info(chalk.blue('    ╰────'));
        }
    } catch {
        // Si no se puede leer el archivo, mostrar formato simplificado
        logger.info(chalk.blue(`    ╭─[${filePath}:${line}:${column}]`));
        logger.info(
            chalk.blue('    │ ') +
                chalk.gray('(No se pudo leer el contenido del archivo)'),
        );
        logger.info(chalk.blue('    ╰────'));
    }

    // Mostrar ayuda si está disponible
    if (error.help) {
        const helpMessage = error.help.replace(/^Regla \w+: /, '');
        logger.info(chalk.blue('  help: ') + chalk.yellow(helpMessage));
    }

    logger.info(''); // Espacio entre errores
}

/**
 * Genera un mensaje descriptivo para la ubicación específica del error
 */
function getErrorLocationMessage(error: any): string {
    if (error.message.includes('declared but never used')) {
        const match = error.message.match(/'([^']+)'/);
        if (match) {
            return `'${match[1]}' is declared here`;
        }
    }

    if (error.message.includes('Unexpected var')) {
        return 'var declaration found here';
    }

    if (error.message.includes('never reassigned')) {
        const match = error.message.match(/'([^']+)'/);
        if (match) {
            return `'${match[1]}' is assigned here`;
        }
    }

    return 'error location';
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
                    const { TypeScriptWorkerPool } =
                        (await import('./typescript-worker-pool')) as {
                            TypeScriptWorkerPool: any;
                        };
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

        // 🚀 OPTIMIZACIÓN: Pasar scriptInfo directamente sin crear objeto nuevo
        tsResult = await preCompileTS(code, inPath, vueResult?.scriptInfo);
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
            logger.info(chalk!.cyan(`  🔄️ TypeScript: ${timings.tsCompile}ms`));
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

        // 🚀 Verificar cache antes de compilar (especialmente importante en modo watch)
        if (mode === 'watch' || mode === 'individual') {
            if (await shouldSkipFile(file)) {
                if (env.VERBOSE === 'true') {
                    logger.info(
                        `⏭️ Archivo omitido (cache): ${path.basename(file)}`,
                    );
                }
                return {
                    success: true,
                    cached: true,
                    output: smartCache.getOutputPath(file) || outFile,
                    action: 'cached',
                };
            }
        }

        if (mode === 'individual' && env.VERBOSE === 'true') {
            logger.info(`🔜 Fuente: ${file}`);
        }
        const result = await compileJS(file, outFile, mode);
        if (result.error) {
            throw new Error(result.error);
        }

        // 🚀 Actualizar cache después de compilación exitosa (especialmente en modo watch)
        if (mode === 'watch' || mode === 'individual') {
            await smartCache.set(file, outFile);
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

        // 🎨 Header moderno de inicio de compilación
        const headerLine = '━'.repeat(48);
        process.stdout.write('\n\x1b[96m' + headerLine + '\x1b[0m\n');
        process.stdout.write(
            '\x1b[96m│ \x1b[97m\x1b[1m🚀 Iniciando Compilación\x1b[0m\x1b[96m' +
                ' '.repeat(22) +
                '│\x1b[0m\n',
        );
        process.stdout.write('\x1b[96m' + headerLine + '\x1b[0m\n');
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
        } // Escribir separador elegante antes del progreso
        if (this.hasProgressLine) {
            process.stdout.write('\r\x1b[K');
        } else {
            process.stdout.write('\n\x1b[96m' + '▔'.repeat(50) + '\x1b[0m\n');
        }

        // 🎨 Barra de progreso con colores dinámicos
        const stage = this.getStageFromText(progressText);
        const { bgColor, textColor, icon } = this.getProgressColors(stage);
        const progressBar = '█'.repeat(3);
        const enhancedProgress = `\x1b[${bgColor}m\x1b[${textColor}m ${progressBar} ${icon} ${progressText} ${progressBar} \x1b[0m`;
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

            // 🎨 Footer moderno de finalización
            const footerLine = '━'.repeat(48);
            process.stdout.write('\x1b[92m' + footerLine + '\x1b[0m\n');
            process.stdout.write(
                '\x1b[92m│ \x1b[97m\x1b[1m✅ ¡Compilación Completada!\x1b[0m\x1b[92m' +
                    ' '.repeat(23) +
                    '│\x1b[0m\n',
            );
            process.stdout.write('\x1b[92m' + footerLine + '\x1b[0m\n\n');

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

    /**
     * 🎨 Determina la etapa del progreso basándose en el texto
     */
    private getStageFromText(text: string): string {
        if (text.includes('Iniciando') || text.includes('Starting'))
            return 'start';
        if (text.includes('Tailwind') || text.includes('CSS'))
            return 'tailwind';
        if (
            text.includes('Recopilando') ||
            text.includes('archivos') ||
            text.includes('files')
        )
            return 'files';
        if (text.includes('Compilando') || text.includes('workers'))
            return 'compile';
        if (text.includes('cache') || text.includes('Guardando'))
            return 'cache';
        if (text.includes('linter') || text.includes('Linter')) return 'linter';
        if (text.includes('completado') || text.includes('Complete'))
            return 'complete';
        return 'default';
    }

    /**
     * 🌈 Obtiene colores dinámicos para cada etapa
     */
    private getProgressColors(stage: string): {
        bgColor: string;
        textColor: string;
        icon: string;
    } {
        const colorSchemes: Record<
            string,
            { bgColor: string; textColor: string; icon: string }
        > = {
            start: { bgColor: '45', textColor: '97', icon: '🚀' }, // Cyan brillante
            tailwind: { bgColor: '105', textColor: '97', icon: '🎨' }, // Magenta
            files: { bgColor: '43', textColor: '30', icon: '📁' }, // Amarillo
            compile: { bgColor: '42', textColor: '30', icon: '⚙️' }, // Verde
            cache: { bgColor: '44', textColor: '97', icon: '💾' }, // Azul
            linter: { bgColor: '101', textColor: '97', icon: '🔍' }, // Rojo claro
            complete: { bgColor: '102', textColor: '30', icon: '✅' }, // Verde claro
            default: { bgColor: '100', textColor: '30', icon: '⏳' }, // Gris claro
        };

        const defaultColors = { bgColor: '100', textColor: '30', icon: '⏳' };
        return colorSchemes[stage] || defaultColors;
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
                                                const filePath =
                                                    result.filePath ||
                                                    result.file ||
                                                    'archivo no especificado';
                                                linterErrors.push({
                                                    from: 'eslint',
                                                    line: result.line || 'N/A',
                                                    column: result.column || 1,
                                                    file: filePath,
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
                                                            const filePath =
                                                                fileResult.filePath ||
                                                                fileResult.file ||
                                                                'archivo no especificado';
                                                            linterErrors.push({
                                                                from: 'eslint',
                                                                line:
                                                                    msg.line ||
                                                                    'N/A',
                                                                column:
                                                                    msg.column ||
                                                                    1,
                                                                file: filePath,
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
                                            const filePath =
                                                result.filename ||
                                                result.file ||
                                                'archivo no especificado';
                                            const lineNumber =
                                                result.labels &&
                                                result.labels[0] &&
                                                result.labels[0].span
                                                    ? result.labels[0].span
                                                          .line ||
                                                      result.labels[0].span
                                                          .start?.line
                                                    : 'N/A';
                                            const columnNumber =
                                                result.labels &&
                                                result.labels[0] &&
                                                result.labels[0].span
                                                    ? result.labels[0].span
                                                          .column ||
                                                      result.labels[0].span
                                                          .start?.column
                                                    : 1;

                                            linterErrors.push({
                                                from: 'oxlint',
                                                line: lineNumber,
                                                column: columnNumber,
                                                file: filePath,
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
                // Modo --linter: Solo mostrar resultados sin preguntar
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
            } else {
                // Modo compilación: Mostrar errores si los hay y preguntar al usuario
                if (linterErrors.length > 0) {
                    await displayLinterErrors(linterErrors);
                    logger.warn(
                        '🚨 Se encontraron errores o advertencias durante el linting.',
                    );
                    if (env.yes === 'false') {
                        const result = await promptUser(
                            '¿Deseas continuar con la compilación a pesar de los errores de linting? (s/N): ',
                        );
                        if (result.toLowerCase() !== 's') {
                            logger.info(
                                '🛑 Compilación cancelada por el usuario.',
                            );
                            proceedWithCompilation = false;
                        }
                    }
                }
            }
        } catch (parseError) {
            logger.warn(
                `Error parseando configuración de linter: ${parseError instanceof Error ? parseError.message : 'Error desconocido'}, omitiendo...`,
            );
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

        // ✅ FIX: Esperar correctamente a que termine alguna promesa antes de continuar
        if (executing.length >= maxConcurrency) {
            // Esperar a que termine cualquier promesa
            const completedPromise = await Promise.race(executing);
            // Remover la promesa completada del array executing
            const index = executing.indexOf(completedPromise);
            if (index !== -1) {
                executing.splice(index, 1);
            }
        }

        // Limpiar promesas completadas del array executing
        promise.then(() => {
            const index = executing.indexOf(promise);
            if (index !== -1) {
                executing.splice(index, 1);
            }
        });
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
        lastProgressUpdate = 0; // Fase 2: Linting
        progressManager.updateProgress('🔍 Ejecutando linter...');
        const shouldContinue = await runLinter(false); // false = mostrar errores y preguntar si hay errores
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
        }

        // ✨ OPTIMIZACIÓN: Determinar concurrencia basada en CPUs y tipo de operación
        let cpuCount = os.cpus().length;
        const fileCount = filesToCompile.length;

        // ✅ FIX: En algunos entornos (Docker, VMs), os.cpus() retorna 1
        // Establecer un mínimo razonable basado en el tipo de sistema
        if (cpuCount < 4) {
            // Probablemente un contenedor o VM mal configurado
            // Usar un valor conservador pero razonable
            cpuCount = 4;
            if (env.VERBOSE === 'true') {
                logger.warn(
                    `⚠️  Solo se detectó ${os.cpus().length} CPU. Usando ${cpuCount} hilos por defecto.`,
                );
            }
        }

        // ✅ OVERRIDE MANUAL: Permitir al usuario forzar un número de hilos
        if (process.env.VERSACOMPILER_MAX_THREADS) {
            const envThreads = parseInt(
                process.env.VERSACOMPILER_MAX_THREADS,
                10,
            );
            if (!isNaN(envThreads) && envThreads > 0) {
                cpuCount = envThreads;
                if (env.VERBOSE === 'true') {
                    logger.info(
                        `🔧 Usando ${cpuCount} hilos (variable de entorno VERSACOMPILER_MAX_THREADS)`,
                    );
                }
            }
        }

        // Obtener memoria total del sistema (no solo heap)
        const totalMemoryMB = os.totalmem() / (1024 * 1024);
        const freeMemoryMB = os.freemem() / (1024 * 1024);
        const memoryUsagePercent =
            ((totalMemoryMB - freeMemoryMB) / totalMemoryMB) * 100;

        let maxConcurrency: number;

        // ✅ ESTRATEGIA AGRESIVA: Usar TODOS los cores disponibles por defecto
        // La compilación de archivos es I/O bound, no CPU bound, así que podemos ser agresivos
        if (memoryUsagePercent > 90) {
            // Solo si la memoria del SISTEMA está al 90%, reducir hilos
            maxConcurrency = Math.max(4, Math.floor(cpuCount * 0.5));
        } else if (fileCount < 5) {
            // Muy pocos archivos: no tiene sentido más hilos que archivos
            maxConcurrency = fileCount;
        } else if (fileCount < 20) {
            // Pocos archivos: usar todos los CPUs
            maxConcurrency = cpuCount;
        } else if (fileCount < 50) {
            // Archivos moderados: 1.5x los CPUs (I/O permite más hilos)
            maxConcurrency = Math.floor(cpuCount * 1.5);
        } else if (fileCount < 200) {
            // Muchos archivos: 2x los CPUs
            maxConcurrency = cpuCount * 2;
        } else {
            // Proyectos grandes: máxima concurrencia
            maxConcurrency = Math.min(cpuCount * 3, 48);
        }

        // ✅ GARANTIZAR MÍNIMO RAZONABLE: Nunca menos de 4 hilos en proyectos > 10 archivos
        if (fileCount > 10 && maxConcurrency < 4) {
            maxConcurrency = 4;
            if (env.VERBOSE === 'true') {
                logger.info(
                    `⚡ Ajustando a mínimo de 4 hilos para proyecto de ${fileCount} archivos`,
                );
            }
        }

        // Fase 5: Configurando workers y precargando módulos
        progressManager.updateProgress('⚙️ Configurando workers...');

        // ✅ Logging mejorado con información de recursos
        logger.info(
            `🚀 Compilando ${fileCount} archivos con concurrencia optimizada (${maxConcurrency} hilos)...`,
        );

        // ✅ SIEMPRE mostrar info de CPUs/memoria para detectar problemas
        logger.info(
            `   📊 CPUs detectados: ${os.cpus().length} (usando: ${cpuCount})`,
        );
        logger.info(
            `   💾 Memoria libre: ${freeMemoryMB.toFixed(0)}MB / ${totalMemoryMB.toFixed(0)}MB (${(100 - memoryUsagePercent).toFixed(1)}% libre)`,
        );
        logger.info(
            `   ⚡ Hilos configurados: ${maxConcurrency} (${(maxConcurrency / cpuCount).toFixed(1)}x CPUs)`,
        );

        // ⚠️ Warning si los hilos son muy pocos para el tamaño del proyecto
        const optimalThreads = Math.min(cpuCount * 2, 24);
        if (fileCount > 50 && maxConcurrency < optimalThreads * 0.5) {
            const chalk = await loadChalk();
            logger.warn(
                chalk.yellow(
                    `⚠️  Solo se usarán ${maxConcurrency} hilos para ${fileCount} archivos.`,
                ),
            );
            logger.info(
                chalk.yellow(
                    `   💡 Tip: export VERSACOMPILER_MAX_THREADS=${optimalThreads}`,
                ),
            );
        }

        // ⚠️ ADVERTENCIA: Si los hilos son muy bajos para el tamaño del proyecto
        if (fileCount > 50 && maxConcurrency < 8) {
            logger.warn(
                `⚠️  Solo se usarán ${maxConcurrency} hilos para ${fileCount} archivos.`,
            );
            logger.warn(
                `   💡 Tip: Establece VERSACOMPILER_MAX_THREADS para forzar más hilos:`,
            );
            logger.warn(`   💡 export VERSACOMPILER_MAX_THREADS=16`);
        }

        // Precargar módulos ANTES de iniciar la compilación concurrente
        // Esto evita que múltiples hilos intenten cargar node:crypto simultáneamente
        const moduleManager = OptimizedModuleManager.getInstance();
        const fileExtensions = new Set(
            filesToCompile.map(f => path.extname(f)),
        );
        await moduleManager.preloadForContext('batch', fileExtensions);

        // Configurar worker pool para modo batch
        try {
            const { TypeScriptWorkerPool } =
                (await import('./typescript-worker-pool')) as {
                    TypeScriptWorkerPool: any;
                };
            const workerPool = TypeScriptWorkerPool.getInstance();
            workerPool.setMode('batch');
        } catch {
            // Error silencioso en configuración del pool
        }

        // Fase 6: Compilación (el progreso continúa en compileWithConcurrencyLimit)
        progressManager.updateProgress(
            `🚀 Iniciando compilación de ${fileCount} archivos...`,
        );
        await compileWithConcurrencyLimit(filesToCompile, maxConcurrency); // Guardar cache al final
        progressManager.updateProgress('💾 Guardando cache...');
        await saveCache();

        // ✨ FIX #4: Limpiar módulos no usados después de compilación masiva
        progressManager.updateProgress('🧹 Limpiando módulos no usados...');
        moduleManager.cleanupUnusedModules();

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

/**
 * 🎨 Obtiene icono apropiado para cada etapa
 */
function getStageIcon(stage: string): string {
    const icons: Record<string, string> = {
        vue: '🎨',
        typescript: '📘',
        standardization: '💛',
        minification: '🗜️',
        tailwind: '🎨',
        'file-read': '📖',
        default: '⚙️',
    };

    return icons[stage] ?? '⚙️';
}

/**
 *  Crea una barra de progreso visual con porcentaje
 */
function createProgressBarWithPercentage(
    percentage: number,
    width: number,
): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;

    // Usar código directo para evitar problemas de importación
    const greenBar = '\x1b[32m' + '█'.repeat(filled) + '\x1b[0m';
    const grayBar = '\x1b[90m' + '░'.repeat(empty) + '\x1b[0m';
    return `${greenBar}${grayBar} ${percentage}%`;
}

// Función wrapper para compatibilidad con tests
// ✨ FIX #5: Con timeout de 60 segundos para compilación individual
export async function compileFile(filePath: string) {
    return await withTimeout(
        initCompile(filePath, true, 'individual'),
        60000,
        `compilación de ${path.basename(filePath)}`,
    );
}

export { WatchModeOptimizer };
