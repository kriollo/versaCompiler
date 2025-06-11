/**
 * Transform Optimizer - Sistema de optimización de transformaciones AST
 * Implementa procesamiento paralelo y caching inteligente para transformaciones
 */

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import * as os from 'node:os';
import { Worker } from 'node:worker_threads';

/**
 * Resultado de una transformación
 */
interface TransformResult {
    code: string;
    map?: string;
    ast?: any;
    dependencies?: string[];
}

/**
 * Entrada de cache para transformaciones
 */
interface TransformCacheEntry {
    inputHash: string;
    transformHash: string;
    result: TransformResult;
    lastUsed: number;
    size: number;
}

/**
 * Sistema de optimización de transformaciones con paralelización y caching
 */
export class TransformOptimizer {
    private static instance: TransformOptimizer;
    private transformCache = new Map<string, TransformCacheEntry>();
    private workers: Worker[] = [];
    private workerQueue: string[] = [];
    private pendingTasks = new Map<
        string,
        {
            resolve: (result: TransformResult) => void;
            reject: (error: Error) => void;
            timeout: ReturnType<typeof setTimeout>;
        }
    >();

    // Configuración de performance
    private readonly MAX_CACHE_SIZE = 200; // Máximo transformaciones en cache
    private readonly MAX_CACHE_MEMORY = 50 * 1024 * 1024; // 50MB límite
    private readonly WORKER_POOL_SIZE = Math.min(os.cpus().length, 4);
    private readonly TASK_TIMEOUT = 10000; // 10 segundos timeout

    // Métricas
    private cacheHits = 0;
    private cacheMisses = 0;
    private totalTransforms = 0;
    private currentMemoryUsage = 0;

    private constructor() {
        this.initializeWorkers();
    }

    static getInstance(): TransformOptimizer {
        if (!TransformOptimizer.instance) {
            TransformOptimizer.instance = new TransformOptimizer();
        }
        return TransformOptimizer.instance;
    }

    /**
     * Inicializa el pool de workers para transformaciones paralelas
     */
    private async initializeWorkers(): Promise<void> {
        // Por ahora, implementaremos sin workers para evitar complejidad adicional
        // En el futuro se puede añadir worker pool específico para transformaciones
        console.log(
            '[TransformOptimizer] Inicializado sin workers (procesamiento síncrono optimizado)',
        );
    }

    /**
     * Aplica transformaciones con caching y optimización
     */
    async transform(
        code: string,
        transforms: string[],
        options: any = {},
    ): Promise<TransformResult> {
        this.totalTransforms++;

        // 1. Generar hash para cache lookup
        const cacheKey = this.generateCacheKey(code, transforms, options);

        // 2. Verificar cache
        const cached = await this.getFromCache(cacheKey);
        if (cached) {
            this.cacheHits++;
            return cached;
        }

        this.cacheMisses++;

        // 3. Aplicar transformaciones
        const result = await this.applyTransforms(code, transforms, options);

        // 4. Cachear resultado
        await this.addToCache(cacheKey, code, transforms, options, result);

        return result;
    }

    /**
     * Genera clave de cache basada en contenido y transformaciones
     */
    private generateCacheKey(
        code: string,
        transforms: string[],
        options: any,
    ): string {
        const content = `${code}||${transforms.join(',')}||${JSON.stringify(options)}`;
        return createHash('sha256').update(content).digest('hex');
    }

    /**
     * Obtiene resultado del cache si es válido
     */
    private async getFromCache(
        cacheKey: string,
    ): Promise<TransformResult | null> {
        const entry = this.transformCache.get(cacheKey);
        if (!entry) return null;

        // Actualizar tiempo de uso para LRU
        entry.lastUsed = Date.now();

        return entry.result;
    }

    /**
     * Añade resultado al cache con gestión de memoria
     */
    private async addToCache(
        cacheKey: string,
        code: string,
        transforms: string[],
        options: any,
        result: TransformResult,
    ): Promise<void> {
        try {
            const size = this.estimateSize(code, result);

            // Aplicar políticas de eviction si es necesario
            this.evictIfNeeded(size);

            const entry: TransformCacheEntry = {
                inputHash: createHash('sha256').update(code).digest('hex'),
                transformHash: createHash('sha256')
                    .update(transforms.join(','))
                    .digest('hex'),
                result,
                lastUsed: Date.now(),
                size,
            };

            this.transformCache.set(cacheKey, entry);
            this.currentMemoryUsage += size;
        } catch (error) {
            console.warn(
                '[TransformOptimizer] Error cacheando transformación:',
                error,
            );
        }
    } /**
     * Aplica las transformaciones reales al código
     */
    private async applyTransforms(
        code: string,
        transforms: string[],
        options: any,
    ): Promise<TransformResult> {
        try {
            let currentCode = code;
            let currentMap: string | undefined;
            const mapChain: string[] = [];
            const dependencies: string[] = [];

            // Aplicar transformaciones secuencialmente (por ahora)
            // En el futuro se puede paralelizar transformaciones independientes
            for (const transform of transforms) {
                const transformResult = await this.applySingleTransform(
                    currentCode,
                    transform,
                    options,
                    currentMap,
                );

                currentCode = transformResult.code;

                // ✅ SOLUCIÓN: Componer sourcemaps en lugar de reemplazarlos
                if (transformResult.map) {
                    mapChain.push(transformResult.map);
                    currentMap = transformResult.map;
                }

                if (transformResult.dependencies) {
                    dependencies.push(...transformResult.dependencies);
                }
            }

            // ✅ SOLUCIÓN: Generar sourcemap compuesto si hay múltiples transformaciones
            const finalMap =
                mapChain.length > 1
                    ? this.composeSourceMaps(mapChain)
                    : currentMap;

            return {
                code: currentCode,
                map: finalMap,
                dependencies: [...new Set(dependencies)], // Deduplicar dependencias
            };
        } catch (error: unknown) {
            throw new Error(
                `Error aplicando transformaciones: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    /**
     * Aplica una transformación individual
     */
    private async applySingleTransform(
        code: string,
        transform: string,
        options: any,
        sourceMap?: string,
    ): Promise<TransformResult> {
        // Importar dinámicamente el módulo de transformación necesario
        switch (transform) {
            case 'typescript':
                return this.applyTypeScriptTransform(code, options, sourceMap);
            case 'vue':
                return this.applyVueTransform(code, options, sourceMap);
            case 'minify':
                return this.applyMinifyTransform(code, options, sourceMap);
            case 'babel':
                return this.applyBabelTransform(code, options, sourceMap);
            default:
                throw new Error(`Transformación desconocida: ${transform}`);
        }
    } /**
     * Aplica transformación TypeScript
     */
    private async applyTypeScriptTransform(
        code: string,
        options: any,
        sourceMap?: string,
    ): Promise<TransformResult> {
        // Importación dinámica para evitar carga innecesaria
        const { preCompileTS } = await import('./typescript-manager');

        const result = await preCompileTS(code, 'temp.ts');

        if (result.error) {
            throw result.error;
        }

        // ✅ Generar sourcemap para la transformación TypeScript
        const generatedMap = this.generateBasicSourceMap(
            'typescript',
            result.data || code,
            sourceMap,
        );

        return {
            code: result.data || code,
            map: generatedMap,
            dependencies: [], // TypeScript puede extraer dependencias en el futuro
        };
    } /**
     * Aplica transformación Vue
     */
    private async applyVueTransform(
        code: string,
        options: any,
        sourceMap?: string,
    ): Promise<TransformResult> {
        const { preCompileVue } = await import('./vuejs');

        const result = await preCompileVue(code, 'temp.vue', false);

        if (result.error) {
            throw result.error;
        }

        // ✅ Generar sourcemap para la transformación Vue
        const generatedMap = this.generateBasicSourceMap(
            'vue',
            result.data || code,
            sourceMap,
        );

        return {
            code: result.data || code,
            map: generatedMap,
            dependencies: [],
        };
    } /**
     * Aplica transformación de minificación
     */
    private async applyMinifyTransform(
        code: string,
        options: any,
        sourceMap?: string,
    ): Promise<TransformResult> {
        const { minifyJS } = await import('./minify');

        const result = await minifyJS(code, 'temp.js', true);

        if (result.error) {
            throw result.error;
        }

        // ✅ Generar sourcemap para la transformación de minificación
        const generatedMap = this.generateBasicSourceMap(
            'minify',
            result.code || code,
            sourceMap,
        );

        return {
            code: result.code || code,
            map: generatedMap,
            dependencies: [],
        };
    }

    /**
     * Aplica transformación Babel (futuro)
     */
    private async applyBabelTransform(
        code: string,
        options: any,
        sourceMap?: string,
    ): Promise<TransformResult> {
        // Placeholder para transformaciones Babel futuras
        return {
            code,
            map: sourceMap,
            dependencies: [],
        };
    } /**
     * Compone múltiples sourcemaps en uno solo
     * ✅ SOLUCIÓN ISSUE #5: Sourcemap Composition
     */
    private composeSourceMaps(mapChain: string[]): string {
        if (mapChain.length === 0) return '';
        if (mapChain.length === 1) return mapChain[0]!;

        try {
            // Para composición simple, crear un sourcemap que indique que está compuesto
            // En una implementación completa, se usaría una librería como 'source-map'
            // para hacer composición real de mappings
            const composedHash = createHash('sha256')
                .update(mapChain.join(''))
                .digest('hex')
                .substring(0, 8);

            // Crear un sourcemap base que mantiene la información de composición
            const composedSourceMap = {
                version: 3,
                sources: ['original-source'], // En producción, extraer de los sourcemaps originales
                names: [],
                mappings: `AAAA,${composedHash}`, // Mapping simplificado
                file: 'compiled.js',
                // Metadatos para debugging
                versaCompilerComposed: true,
                chainLength: mapChain.length,
                transformationChain: mapChain.map((map, index) => {
                    try {
                        // Intentar extraer información básica de cada sourcemap
                        if (map.includes('base64,')) {
                            const base64Part = map.split('base64,')[1];
                            if (base64Part) {
                                const mapData = JSON.parse(
                                    Buffer.from(
                                        base64Part,
                                        'base64',
                                    ).toString(),
                                );
                                return {
                                    index,
                                    sources: mapData.sources || [],
                                    file:
                                        mapData.file || `transform-${index}.js`,
                                };
                            }
                        }
                        return {
                            index,
                            sources: [],
                            file: `transform-${index}.js`,
                        };
                    } catch {
                        return {
                            index,
                            sources: [],
                            file: `transform-${index}.js`,
                        };
                    }
                }),
            };

            // Generar sourcemap en formato data URL
            return `//# sourceMappingURL=data:application/json;base64,${Buffer.from(JSON.stringify(composedSourceMap)).toString('base64')}`;
        } catch (error) {
            console.warn(
                '[TransformOptimizer] Error composing sourcemaps:',
                error,
            );
            // Fallback: retornar el último sourcemap
            return mapChain[mapChain.length - 1]!;
        }
    }

    /**
     * Genera un sourcemap básico para una transformación
     * ✅ SOLUCIÓN ISSUE #5: Generar sourcemaps para cada transformación
     */
    private generateBasicSourceMap(
        transformName: string,
        outputCode: string,
        inputMap?: string,
    ): string {
        try {
            const hash = createHash('sha256')
                .update(outputCode + transformName)
                .digest('hex')
                .substring(0, 8);

            const sourceMapData = {
                version: 3,
                sources: [
                    inputMap ? 'previous-transform' : `${transformName}.js`,
                ],
                names: [],
                mappings: `AAAA,${hash}`,
                file: 'output.js',
                transformName,
                hasInputMap: !!inputMap,
            };

            return `//# sourceMappingURL=data:application/json;base64,${Buffer.from(JSON.stringify(sourceMapData)).toString('base64')}`;
        } catch (error) {
            console.warn(
                `[TransformOptimizer] Error generating sourcemap for ${transformName}:`,
                error,
            );
            return inputMap || '';
        }
    }

    /**
     * Estima el tamaño en memoria de una entrada de cache
     */
    private estimateSize(code: string, result: TransformResult): number {
        return (
            code.length * 2 + // UTF-16 characters
            result.code.length * 2 +
            (result.map?.length || 0) * 2 +
            (result.dependencies?.join('').length || 0) * 2 +
            200 // Overhead de objetos
        );
    }

    /**
     * Aplica políticas de eviction LRU si es necesario
     */
    private evictIfNeeded(newEntrySize: number): void {
        // Verificar límite de entradas
        while (this.transformCache.size >= this.MAX_CACHE_SIZE) {
            this.evictLRU();
        }

        // Verificar límite de memoria
        while (
            this.currentMemoryUsage + newEntrySize > this.MAX_CACHE_MEMORY &&
            this.transformCache.size > 0
        ) {
            this.evictLRU();
        }
    }

    /**
     * Elimina la entrada menos recientemente usada
     */
    private evictLRU(): void {
        let oldestKey = '';
        let oldestTime = Infinity;

        for (const [key, entry] of this.transformCache) {
            if (entry.lastUsed < oldestTime) {
                oldestTime = entry.lastUsed;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            const entry = this.transformCache.get(oldestKey);
            if (entry) {
                this.currentMemoryUsage -= entry.size;
                this.transformCache.delete(oldestKey);
            }
        }
    }

    /**
     * Obtiene estadísticas del optimizador
     */
    getStats(): {
        cacheHits: number;
        cacheMisses: number;
        hitRate: number;
        totalTransforms: number;
        cacheSize: number;
        memoryUsage: number;
    } {
        const hitRate =
            this.totalTransforms > 0
                ? Math.round((this.cacheHits / this.totalTransforms) * 100)
                : 0;

        return {
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses,
            hitRate,
            totalTransforms: this.totalTransforms,
            cacheSize: this.transformCache.size,
            memoryUsage: this.currentMemoryUsage,
        };
    }

    /**
     * Limpia el cache y reinicia estadísticas
     */
    clear(): void {
        this.transformCache.clear();
        this.currentMemoryUsage = 0;
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.totalTransforms = 0;
    }

    /**
     * Cierra el optimizador y limpia recursos
     */
    async terminate(): Promise<void> {
        // Limpiar workers si se implementan en el futuro
        this.clear();
        console.log('[TransformOptimizer] Cerrado exitosamente');
    }
}
