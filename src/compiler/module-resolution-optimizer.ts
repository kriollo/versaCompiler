/**
 * Module Resolution Optimizer
 *
 * Optimiza la resolución de módulos mediante:
 * - Sistema de indexación O(1) para búsquedas de módulos
 * - Caché LRU para resoluciones repetidas
 * - Indexación de alias para búsquedas rápidas
 * - Batch processing para múltiples resoluciones
 * - Monitoreo de performance y métricas
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { cwd, env } from 'node:process';

import { logger } from '../servicios/logger';

interface ModuleInfo {
    fullPath: string;
    entryPoint: string;
    packageJson: any;
    isESM: boolean;
    hasExports: boolean;
    optimizedEntry?: string;
    lastModified: number;
}

interface ResolvedModule {
    path: string | null;
    cached: boolean;
    resolveTime: number;
    fromCache?: boolean;
}

interface CacheEntry {
    result: string | null;
    timestamp: number;
    hits: number;
    moduleInfo?: ModuleInfo;
}

interface AliasIndex {
    pattern: string;
    target: string[];
    regex: RegExp;
    priority: number; // Basado en especificidad (longitud del patrón)
}

interface ResolutionMetrics {
    totalResolutions: number;
    cacheHits: number;
    cacheMisses: number;
    averageResolveTime: number;
    indexLookups: number;
    filesystemAccess: number;
    aliasMatches: number;
}

/**
 * Sistema de optimización de resolución de módulos
 * Implementa indexación, caché y búsquedas O(1)
 */
export class ModuleResolutionOptimizer {
    private static instance: ModuleResolutionOptimizer;

    // Índice principal de módulos para búsquedas O(1)
    private moduleIndex = new Map<string, ModuleInfo>();

    // Caché LRU para resoluciones repetidas
    private resolutionCache = new Map<string, CacheEntry>();
    private cacheOrder: string[] = [];

    // Índice de alias optimizado
    private aliasIndex: AliasIndex[] = [];

    // Caché de rutas de node_modules descubiertas
    private nodeModulesCache = new Map<string, string[]>();

    // Métricas de rendimiento
    private metrics: ResolutionMetrics = {
        totalResolutions: 0,
        cacheHits: 0,
        cacheMisses: 0,
        averageResolveTime: 0,
        indexLookups: 0,
        filesystemAccess: 0,
        aliasMatches: 0,
    };

    // Configuración
    private readonly maxCacheSize = 500;
    private readonly cacheMaxAge = 5 * 60 * 1000; // 5 minutos
    private readonly indexRefreshInterval = 10 * 60 * 1000; // 10 minutos

    // Lista de módulos excluidos (copiada del module-resolver)
    private readonly excludedModules = new Set([
        'vue/compiler-sfc',
        'vue/dist/vue.runtime.esm-bundler',
        '@vue/compiler-sfc',
        '@vue/compiler-dom',
        '@vue/runtime-core',
        '@vue/runtime-dom',
        'oxc-parser',
        'oxc-parser/wasm',
        'oxc-minify',
        'oxc-minify/browser',
        '@oxc-parser/binding-wasm32-wasi',
        '@oxc-minify/binding-wasm32-wasi',
        'typescript',
        'yargs',
        'yargs/helpers',
        'yargs-parser',
        'chalk',
        'browser-sync',
        'chokidar',
        'get-port',
        'execa',
        'find-root',
        'fs-extra',
    ]);

    private lastIndexUpdate = 0;

    private constructor() {
        this.initializeIndexes();
        this.setupPeriodicRefresh();
    }

    public static getInstance(): ModuleResolutionOptimizer {
        if (!ModuleResolutionOptimizer.instance) {
            ModuleResolutionOptimizer.instance =
                new ModuleResolutionOptimizer();
        }
        return ModuleResolutionOptimizer.instance;
    }

    /**
     * Inicializa los índices de módulos y alias
     */
    private initializeIndexes(): void {
        const startTime = performance.now();

        try {
            this.buildModuleIndex();
            this.buildAliasIndex();
            this.lastIndexUpdate = Date.now();

            const indexTime = performance.now() - startTime;
            if (env.VERBOSE === 'true') {
                logger.info(
                    `🚀 Índices de resolución construidos en ${indexTime.toFixed(2)}ms`,
                );
                logger.info(`📦 ${this.moduleIndex.size} módulos indexados`);
                logger.info(`🔗 ${this.aliasIndex.length} alias indexados`);
            }
        } catch (error) {
            logger.error('Error inicializando índices de resolución:', error);
        }
    }

    /**
     * Construye el índice principal de módulos para búsquedas O(1)
     */
    private buildModuleIndex(): void {
        const nodeModulesPath = join(cwd(), 'node_modules');
        if (!existsSync(nodeModulesPath)) {
            return;
        }

        try {
            const modules = this.discoverModules(nodeModulesPath);

            for (const moduleData of modules) {
                this.moduleIndex.set(moduleData.name, {
                    fullPath: moduleData.fullPath,
                    entryPoint: moduleData.entryPoint,
                    packageJson: moduleData.packageJson,
                    isESM: moduleData.isESM,
                    hasExports: moduleData.hasExports,
                    optimizedEntry: moduleData.optimizedEntry,
                    lastModified: moduleData.lastModified,
                });
            }

            if (env.VERBOSE === 'true') {
                logger.info(
                    `📚 Índice de módulos construido: ${this.moduleIndex.size} entradas`,
                );
            }
        } catch (error) {
            logger.error('Error construyendo índice de módulos:', error);
        }
    }

    /**
     * Descubre módulos disponibles en node_modules con información optimizada
     */
    private discoverModules(nodeModulesPath: string): Array<{
        name: string;
        fullPath: string;
        entryPoint: string;
        packageJson: any;
        isESM: boolean;
        hasExports: boolean;
        optimizedEntry?: string;
        lastModified: number;
    }> {
        const modules: Array<any> = [];

        try {
            const entries = readdirSync(nodeModulesPath);
            this.metrics.filesystemAccess++;

            for (const entry of entries) {
                const modulePath = join(nodeModulesPath, entry);

                try {
                    if (entry.startsWith('@')) {
                        // Scoped packages
                        const scopedModules = readdirSync(modulePath);
                        this.metrics.filesystemAccess++;

                        for (const scopedModule of scopedModules) {
                            const scopedPath = join(modulePath, scopedModule);
                            const moduleData = this.analyzeModule(
                                `${entry}/${scopedModule}`,
                                scopedPath,
                            );
                            if (moduleData) {
                                modules.push(moduleData);
                            }
                        }
                    } else {
                        // Regular packages
                        const moduleData = this.analyzeModule(
                            entry,
                            modulePath,
                        );
                        if (moduleData) {
                            modules.push(moduleData);
                        }
                    }
                } catch {
                    // Ignorar módulos que no se puedan analizar
                    continue;
                }
            }
        } catch (error) {
            logger.error('Error descubriendo módulos:', error);
        }

        return modules;
    }

    /**
     * Analiza un módulo individual y extrae información relevante
     */
    private analyzeModule(name: string, modulePath: string): any | null {
        try {
            const packageJsonPath = join(modulePath, 'package.json');
            if (!existsSync(packageJsonPath)) {
                return null;
            }

            const stats = statSync(packageJsonPath);
            this.metrics.filesystemAccess++;

            const packageJson = JSON.parse(
                readFileSync(packageJsonPath, 'utf-8'),
            );
            this.metrics.filesystemAccess++;

            const isESM = packageJson.type === 'module';
            const hasExports = !!packageJson.exports;

            // Determinar entry point optimizado
            let entryPoint = this.determineOptimalEntryPoint(packageJson);
            let optimizedEntry: string | undefined;

            // Buscar versión ESM/browser optimizada
            if (entryPoint) {
                optimizedEntry = this.findOptimalESMVersion(
                    modulePath,
                    entryPoint,
                );
            }

            return {
                name,
                fullPath: modulePath,
                entryPoint: entryPoint || 'index.js',
                packageJson,
                isESM,
                hasExports,
                optimizedEntry,
                lastModified: stats.mtime.getTime(),
            };
        } catch {
            return null;
        }
    } /**
     * Determina el entry point óptimo basado en package.json
     */
    private determineOptimalEntryPoint(packageJson: any): string | null {
        // Prioridad: module > exports > browser > main
        let entryPoint: string | null = null;

        if (packageJson.module) {
            entryPoint = packageJson.module;
        } else if (packageJson.exports) {
            if (typeof packageJson.exports === 'string') {
                entryPoint = packageJson.exports;
            } else if (packageJson.exports['.']) {
                const dotExport = packageJson.exports['.'];
                if (typeof dotExport === 'string') {
                    entryPoint = dotExport;
                } else if (typeof dotExport === 'object') {
                    entryPoint =
                        dotExport.import ||
                        dotExport.browser ||
                        dotExport.default;
                }
            }
        } else if (
            packageJson.browser &&
            typeof packageJson.browser === 'string'
        ) {
            entryPoint = packageJson.browser;
        } else {
            entryPoint = packageJson.main || null;
        }

        // ✨ NUEVA VALIDACIÓN POST-RESOLUCIÓN
        // Verificar si el archivo resuelto cumple con criterios de desarrollo
        if (entryPoint) {
            entryPoint = this.validateAndOptimizeEntryPoint(
                entryPoint,
                packageJson,
            );
        }

        return entryPoint;
    }

    /**
     * ✨ NUEVA FUNCIÓN: Valida y optimiza el entry point basado en criterios de desarrollo
     */
    private validateAndOptimizeEntryPoint(
        entryPoint: string,
        packageJson: any,
    ): string {
        const isProd = env.isProd === 'true';
        const fileName = entryPoint.toLowerCase();

        // Si estamos en desarrollo, evitar archivos .min o .prod
        if (
            !isProd &&
            (fileName.includes('.min.') || fileName.includes('.prod.'))
        ) {
            // Buscar alternativas mejores en el package.json
            const alternatives = this.findDevelopmentAlternatives(
                entryPoint,
                packageJson,
            );
            if (alternatives) {
                if (env.VERBOSE === 'true') {
                    logger.info(
                        `🔄 Cambiando ${entryPoint} por ${alternatives} (modo desarrollo)`,
                    );
                }
                return alternatives;
            }
        }

        // Priorizar versiones browser y esm para mejor compatibilidad
        if (fileName.includes('runtime') && !fileName.includes('browser')) {
            const browserAlternative = this.findBrowserAlternative(
                entryPoint,
                packageJson,
            );
            if (browserAlternative) {
                if (env.VERBOSE === 'true') {
                    logger.info(
                        `🌐 Cambiando ${entryPoint} por ${browserAlternative} (versión browser)`,
                    );
                }
                return browserAlternative;
            }
        }

        return entryPoint;
    } /**
     * ✨ NUEVA FUNCIÓN: Busca alternativas de desarrollo (no minificadas)
     */
    private findDevelopmentAlternatives(
        entryPoint: string,
        packageJson: any,
    ): string | null {
        // Crear versión de desarrollo basada en el entry point actual
        let devVersion = entryPoint
            .replace('.min.', '.')
            .replace('.prod.', '.');

        // Si hay exports, buscar en diferentes condiciones
        if (packageJson.exports && typeof packageJson.exports === 'object') {
            const dotExport = packageJson.exports['.'];
            if (dotExport && typeof dotExport === 'object') {
                // Buscar versiones development, import, browser
                const candidates = [
                    dotExport.development,
                    dotExport.import,
                    dotExport.browser,
                    dotExport.default,
                ].filter(Boolean);

                for (const candidate of candidates) {
                    if (
                        typeof candidate === 'string' &&
                        !candidate.includes('.min.') &&
                        !candidate.includes('.prod.')
                    ) {
                        return candidate;
                    }
                }
            }
        } // Si browser field es un objeto, buscar alternativas
        if (packageJson.browser && typeof packageJson.browser === 'object') {
            for (const value of Object.values(packageJson.browser)) {
                if (
                    typeof value === 'string' &&
                    !value.includes('.min.') &&
                    !value.includes('.prod.') &&
                    (value.includes('browser') || value.includes('esm'))
                ) {
                    return value;
                }
            }
        }

        return devVersion !== entryPoint ? devVersion : null;
    }

    /**
     * ✨ NUEVA FUNCIÓN: Busca alternativas browser para versiones runtime
     */
    private findBrowserAlternative(
        entryPoint: string,
        packageJson: any,
    ): string | null {
        // Primero intentar con exports
        if (packageJson.exports && typeof packageJson.exports === 'object') {
            const dotExport = packageJson.exports['.'];
            if (dotExport && typeof dotExport === 'object') {
                // Buscar specific browser+esm combinations
                const browserKeys = Object.keys(dotExport).filter(
                    key =>
                        key.includes('browser') &&
                        (key.includes('esm') || key.includes('module')),
                );
                if (browserKeys.length > 0) {
                    const firstBrowserKey = browserKeys[0];
                    if (
                        firstBrowserKey &&
                        typeof dotExport[firstBrowserKey] === 'string'
                    ) {
                        return dotExport[firstBrowserKey];
                    }
                }

                // Fallback a browser general
                if (
                    dotExport.browser &&
                    typeof dotExport.browser === 'string'
                ) {
                    return dotExport.browser;
                }
            }
        }

        // Buscar en directorio dist versiones browser
        const baseName = entryPoint.replace(/\.[^/.]+$/, '');
        const browserCandidates = [
            baseName.replace('runtime', 'esm-browser'),
            baseName.replace('runtime', 'browser'),
            baseName.replace('runtime.esm-bundler', 'esm-browser'),
            entryPoint.replace('runtime', 'esm-browser'),
            entryPoint.replace('runtime', 'browser'),
        ];

        // Para Vue específicamente
        if (entryPoint.includes('vue.runtime.esm-bundler')) {
            browserCandidates.unshift(
                'dist/vue.esm-browser.js',
                'dist/vue.browser.esm.js',
            );
        }

        return (
            browserCandidates.find(candidate => candidate !== entryPoint) ||
            null
        );
    }

    /**
     * Busca versión ESM/browser optimizada (simplificada del module-resolver)
     */
    private findOptimalESMVersion(
        moduleDir: string,
        entryPoint: string,
    ): string | undefined {
        const dir = dirname(entryPoint);
        const baseName = entryPoint.split('/').pop() || '';
        const nameWithoutExt = baseName.replace(/\.[^/.]+$/, '');

        const searchDir = join(moduleDir, dir);
        if (!existsSync(searchDir)) {
            return undefined;
        }

        try {
            const files = readdirSync(searchDir);
            this.metrics.filesystemAccess++;

            // Patrones de prioridad para versiones optimizadas
            const patterns = [
                `${nameWithoutExt}.esm-browser.js`,
                `${nameWithoutExt}.esm.js`,
                `${nameWithoutExt}.module.js`,
                `${nameWithoutExt}.browser.js`,
            ];

            for (const pattern of patterns) {
                if (files.includes(pattern)) {
                    return join(dir, pattern);
                }
            }
        } catch {
            // Ignorar errores de filesystem
        }

        return undefined;
    }

    /**
     * Construye el índice de alias optimizado para búsquedas rápidas
     */
    private buildAliasIndex(): void {
        if (!env.PATH_ALIAS) {
            return;
        }

        try {
            const pathAlias = JSON.parse(env.PATH_ALIAS);
            this.aliasIndex = [];

            // Convertir alias a índice con prioridad
            for (const [alias, target] of Object.entries(pathAlias)) {
                const pattern = alias.replace('/*', '');
                const priority = pattern.length; // Patrones más largos tienen prioridad

                this.aliasIndex.push({
                    pattern,
                    target: Array.isArray(target) ? target : [target],
                    regex: new RegExp(
                        `^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=/|$)`,
                    ),
                    priority,
                });
            }

            // Ordenar por prioridad (patrones más largos primero)
            this.aliasIndex.sort((a, b) => b.priority - a.priority);

            if (env.VERBOSE === 'true') {
                logger.info(
                    `🔗 Índice de alias construido: ${this.aliasIndex.length} patrones`,
                );
            }
        } catch (error) {
            logger.error('Error construyendo índice de alias:', error);
        }
    }

    /**
     * Resuelve un módulo utilizando el sistema optimizado
     */
    public async resolveModule(
        moduleName: string,
        fromFile?: string,
    ): Promise<ResolvedModule> {
        const startTime = performance.now();
        this.metrics.totalResolutions++;

        // Verificar si está excluido
        if (this.excludedModules.has(moduleName)) {
            return {
                path: null,
                cached: false,
                resolveTime: performance.now() - startTime,
            };
        }

        // Crear clave de caché
        const cacheKey = this.createCacheKey(moduleName, fromFile);

        // Verificar caché
        const cached = this.getFromCache(cacheKey);
        if (cached !== undefined) {
            this.metrics.cacheHits++;
            return {
                path: cached,
                cached: true,
                resolveTime: performance.now() - startTime,
                fromCache: true,
            };
        }

        this.metrics.cacheMisses++;

        // Resolver módulo
        let resolvedPath: string | null = null;

        try {
            // 1. Verificar si es subpath de módulo (ej: 'vue/dist/vue.esm-bundler')
            if (moduleName.includes('/')) {
                resolvedPath = await this.resolveSubPath(moduleName);
            } else {
                // 2. Búsqueda O(1) en el índice
                resolvedPath = this.resolveFromIndex(moduleName);
            }

            // 3. Si no se encuentra en índice, intentar resolución tradicional
            if (!resolvedPath) {
                resolvedPath = this.fallbackResolve(moduleName);
            }

            // Convertir a ruta relativa desde node_modules
            if (resolvedPath) {
                resolvedPath = this.getNodeModulesRelativePath(resolvedPath);
            }
        } catch (error) {
            if (env.VERBOSE === 'true') {
                logger.warn(`Error resolviendo ${moduleName}:`, error);
            }
        }

        // Guardar en caché
        this.setCache(cacheKey, resolvedPath);

        const resolveTime = performance.now() - startTime;
        this.updateMetrics(resolveTime);

        return {
            path: resolvedPath,
            cached: false,
            resolveTime,
        };
    }

    /**
     * Busca módulo en el índice (O(1))
     */
    private resolveFromIndex(moduleName: string): string | null {
        this.metrics.indexLookups++;

        const moduleInfo = this.moduleIndex.get(moduleName);
        if (!moduleInfo) {
            return null;
        }

        // Usar versión optimizada si está disponible
        const entryPoint = moduleInfo.optimizedEntry || moduleInfo.entryPoint;
        return join(moduleInfo.fullPath, entryPoint);
    }

    /**
     * Resuelve subpaths de módulos (ej: 'vue/dist/vue.esm-bundler')
     */
    private async resolveSubPath(moduleName: string): Promise<string | null> {
        const [packageName, ...subPathParts] = moduleName.split('/');
        const subPath = subPathParts.join('/');

        if (!packageName) {
            return null;
        }

        this.metrics.indexLookups++;
        const moduleInfo = this.moduleIndex.get(packageName);
        if (!moduleInfo) {
            return null;
        }

        // Verificar exports field para subpaths
        if (moduleInfo.hasExports && moduleInfo.packageJson.exports) {
            const exportKey = `./${subPath}`;
            const exportPath = moduleInfo.packageJson.exports[exportKey];

            if (exportPath) {
                if (typeof exportPath === 'string') {
                    return join(moduleInfo.fullPath, exportPath);
                } else if (typeof exportPath === 'object') {
                    const importPath = exportPath.import || exportPath.default;
                    if (typeof importPath === 'string') {
                        return join(moduleInfo.fullPath, importPath);
                    }
                }
            }
        }

        // Fallback: resolver directamente el subpath
        const directPath = join(moduleInfo.fullPath, subPath);
        if (existsSync(directPath)) {
            this.metrics.filesystemAccess++;
            return directPath;
        }

        // Intentar con extensiones comunes
        const extensions = ['.mjs', '.js', '.cjs'];
        for (const ext of extensions) {
            const pathWithExt = directPath + ext;
            if (existsSync(pathWithExt)) {
                this.metrics.filesystemAccess++;
                return pathWithExt;
            }
        }

        return null;
    }

    /**
     * Resolución de fallback cuando no se encuentra en índice
     */
    private fallbackResolve(moduleName: string): string | null {
        const nodeModulesPath = join(cwd(), 'node_modules', moduleName);
        const packagePath = join(nodeModulesPath, 'package.json');

        if (!existsSync(packagePath)) {
            this.metrics.filesystemAccess++;
            return null;
        }

        try {
            const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
            this.metrics.filesystemAccess++;

            const entryPoint =
                this.determineOptimalEntryPoint(packageJson) || 'index.js';
            const finalPath = join(nodeModulesPath, entryPoint);

            if (existsSync(finalPath)) {
                this.metrics.filesystemAccess++;
                return finalPath;
            }
        } catch {
            // Ignorar errores
        }

        return null;
    }

    /**
     * Encuentra alias que coincida con el path dado
     */
    public findMatchingAlias(path: string): AliasIndex | null {
        this.metrics.aliasMatches++;

        for (const alias of this.aliasIndex) {
            if (alias.regex.test(path)) {
                return alias;
            }
        }

        return null;
    } /**
     * Resuelve un alias a su ruta correspondiente
     */
    public resolveAlias(path: string): string | null {
        const alias = this.findMatchingAlias(path);
        if (!alias || !env.PATH_DIST) {
            return null;
        }        const relativePath = path.replace(alias.pattern, '');
        const targetPath = alias.target[0];

        if (!targetPath) {
            return null;
        }        // Construir ruta final
        let finalPath: string;
        const pathDist = env.PATH_DIST.replace('./', '');

        // Manejar caso especial: alias exacto sin wildcard (como #config -> config/index.js)
        if (relativePath === '' && !targetPath.includes('*')) {
            // Es un alias exacto, usar el target tal como está
            if (targetPath.startsWith('/')) {
                finalPath = join('/', pathDist, targetPath.substring(1));
            } else {
                const cleanTarget = targetPath.replace('./', '');
                if (cleanTarget.startsWith('src/')) {
                    const targetWithoutSrc = cleanTarget.replace('src/', '');
                    finalPath = join('/', pathDist, targetWithoutSrc);
                } else {
                    finalPath = join('/', pathDist, cleanTarget);
                }
            }
        } else if (targetPath.startsWith('/')) {
            // Si el target empieza con /, es una ruta absoluta desde la raíz del proyecto
            // Para targets como "/src/*", mapear directamente al PATH_DIST
            // Remover el primer directorio si es diferente de PATH_DIST
            const targetWithoutSlash = targetPath.substring(1).replace('/*', '');
            if (targetWithoutSlash === 'src' || targetWithoutSlash.startsWith('src/')) {
                // Para "/src/*" mapear directamente a "/pathDist/relativePath"
                finalPath = join('/', pathDist, relativePath);
            } else {
                // Para otros casos como "/examples/*", también mapear directamente
                finalPath = join('/', pathDist, relativePath);
            }
        } else {
            // Si es una ruta relativa, construir basándose en el target
            const cleanTarget = targetPath.replace('./', '').replace('/*', '');

            // Si el target ya incluye el directorio de distribución, no duplicar
            if (cleanTarget === pathDist) {
                finalPath = join('/', pathDist, relativePath);
            } else if (cleanTarget.startsWith(pathDist + '/')) {
                // Si el target ya contiene PATH_DIST como prefijo
                finalPath = join('/', cleanTarget, relativePath);
            } else {
                // Caso normal: mapear manteniendo la estructura relativa al target
                if (cleanTarget.startsWith('src/')) {
                    // Para "src/components/*" -> "/pathDist/components/*"
                    const targetWithoutSrc = cleanTarget.replace('src/', '');
                    finalPath = join('/', pathDist, targetWithoutSrc, relativePath);
                } else {
                    // Para casos como "examples/*" -> "/pathDist/*"
                    // No incluir el directorio raíz en la ruta final
                    const isRootDirectory = ['examples', 'src', 'app', 'lib'].includes(cleanTarget);
                    if (isRootDirectory) {
                        finalPath = join('/', pathDist, relativePath);
                    } else {
                        // Para subdirectorios específicos, mantener la estructura
                        finalPath = join('/', pathDist, cleanTarget, relativePath);
                    }
                }
            }
        }

        return finalPath.replace(/\\/g, '/');
    }

    /**
     * Gestión de caché LRU
     */
    private getFromCache(key: string): string | null | undefined {
        const entry = this.resolutionCache.get(key);
        if (!entry) {
            return undefined;
        }

        // Verificar expiración
        if (Date.now() - entry.timestamp > this.cacheMaxAge) {
            this.resolutionCache.delete(key);
            this.cacheOrder = this.cacheOrder.filter(k => k !== key);
            return undefined;
        }

        // Actualizar orden LRU
        entry.hits++;
        this.cacheOrder = this.cacheOrder.filter(k => k !== key);
        this.cacheOrder.push(key);

        return entry.result;
    }

    private setCache(key: string, result: string | null): void {
        // Implementar límite de caché LRU
        if (this.resolutionCache.size >= this.maxCacheSize) {
            const oldestKey = this.cacheOrder.shift();
            if (oldestKey) {
                this.resolutionCache.delete(oldestKey);
            }
        }

        this.resolutionCache.set(key, {
            result,
            timestamp: Date.now(),
            hits: 0,
        });

        this.cacheOrder.push(key);
    }

    private createCacheKey(moduleName: string, fromFile?: string): string {
        const hash = createHash('md5');
        hash.update(moduleName);
        if (fromFile) {
            hash.update(fromFile);
        }
        return hash.digest('hex');
    }

    /**
     * Convierte ruta absoluta a ruta relativa desde node_modules
     */
    private getNodeModulesRelativePath(fullPath: string): string | null {
        const idx = fullPath.indexOf('node_modules');
        if (idx !== -1) {
            return '/' + fullPath.substring(idx).replace(/\\/g, '/');
        }

        // Para rutas que no están en node_modules
        const rel = relative(cwd(), fullPath).replace(/\\/g, '/');
        return rel.startsWith('/') ? rel : '/' + rel;
    }

    /**
     * Actualiza métricas de rendimiento
     */
    private updateMetrics(resolveTime: number): void {
        this.metrics.averageResolveTime =
            (this.metrics.averageResolveTime *
                (this.metrics.totalResolutions - 1) +
                resolveTime) /
            this.metrics.totalResolutions;
    }

    /**
     * Configura actualización periódica de índices
     */
    private setupPeriodicRefresh(): void {
        setInterval(() => {
            if (Date.now() - this.lastIndexUpdate > this.indexRefreshInterval) {
                if (env.VERBOSE === 'true') {
                    logger.info(
                        '🔄 Actualizando índices de resolución de módulos',
                    );
                }
                this.refreshIndexes();
            }
        }, this.indexRefreshInterval);
    }

    /**
     * Actualiza los índices manteniendo el caché válido
     */
    private refreshIndexes(): void {
        try {
            const oldSize = this.moduleIndex.size;
            this.buildModuleIndex();
            this.buildAliasIndex();
            this.lastIndexUpdate = Date.now();

            if (env.VERBOSE === 'true') {
                logger.info(
                    `📚 Índices actualizados: ${oldSize} → ${this.moduleIndex.size} módulos`,
                );
            }
        } catch (error) {
            logger.error('Error actualizando índices:', error);
        }
    }

    /**
     * Limpia caché expirado
     */
    public clearExpiredCache(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

        for (const [key, entry] of this.resolutionCache.entries()) {
            if (now - entry.timestamp > this.cacheMaxAge) {
                keysToDelete.push(key);
            }
        }

        for (const key of keysToDelete) {
            this.resolutionCache.delete(key);
            this.cacheOrder = this.cacheOrder.filter(k => k !== key);
        }

        if (env.VERBOSE === 'true' && keysToDelete.length > 0) {
            logger.info(
                `🧹 Limpiado caché expirado: ${keysToDelete.length} entradas`,
            );
        }
    }

    /**
     * Obtiene métricas de rendimiento
     */
    public getMetrics(): ResolutionMetrics & {
        cacheSize: number;
        moduleIndexSize: number;
        aliasIndexSize: number;
        cacheHitRate: number;
    } {
        return {
            ...this.metrics,
            cacheSize: this.resolutionCache.size,
            moduleIndexSize: this.moduleIndex.size,
            aliasIndexSize: this.aliasIndex.length,
            cacheHitRate:
                this.metrics.totalResolutions > 0
                    ? (this.metrics.cacheHits / this.metrics.totalResolutions) *
                      100
                    : 0,
        };
    }

    /**
     * Resetea métricas de rendimiento
     */
    public resetMetrics(): void {
        this.metrics = {
            totalResolutions: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageResolveTime: 0,
            indexLookups: 0,
            filesystemAccess: 0,
            aliasMatches: 0,
        };
    }

    /**
     * Forzar reconstrucción de índices
     */
    public forceRefresh(): void {
        this.initializeIndexes();
        this.resolutionCache.clear();
        this.cacheOrder = [];

        if (env.VERBOSE === 'true') {
            logger.info('🔄 Índices de resolución reconstruidos forzosamente');
        }
    }

    /**
     * Limpia todos los cachés y índices
     */
    public cleanup(): void {
        this.moduleIndex.clear();
        this.resolutionCache.clear();
        this.cacheOrder = [];
        this.aliasIndex = [];
        this.nodeModulesCache.clear();

        if (env.VERBOSE === 'true') {
            logger.info('🧹 Sistema de resolución de módulos limpiado');
        }
    }
}

// Funciones de compatibilidad con el sistema existente
export async function getOptimizedModulePath(
    moduleName: string,
    fromFile?: string,
): Promise<string | null> {
    const optimizer = ModuleResolutionOptimizer.getInstance();
    const result = await optimizer.resolveModule(moduleName, fromFile);
    return result.path;
}

export function getOptimizedAliasPath(path: string): string | null {
    const optimizer = ModuleResolutionOptimizer.getInstance();
    return optimizer.resolveAlias(path);
}

export function getModuleResolutionMetrics() {
    const optimizer = ModuleResolutionOptimizer.getInstance();
    return optimizer.getMetrics();
}
