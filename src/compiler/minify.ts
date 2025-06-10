import { createHash } from 'node:crypto';

import { minify } from 'oxc-minify';

// ✨ NUEVA OPTIMIZACIÓN: Sistema de cache para minificación
interface MinificationCacheEntry {
    contentHash: string;
    options: any;
    minifiedCode: string;
    timestamp: number;
    originalSize: number;
    minifiedSize: number;
}

class MinificationCache {
    private static instance: MinificationCache;
    private cache = new Map<string, MinificationCacheEntry>();
    private readonly MAX_CACHE_SIZE = 100; // Máximo archivos minificados en cache
    private readonly MAX_CACHE_MEMORY = 20 * 1024 * 1024; // 20MB límite
    private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutos
    private currentMemoryUsage = 0;

    // Métricas
    private cacheHits = 0;
    private cacheMisses = 0;
    private totalMinifications = 0;
    private totalOriginalSize = 0;
    private totalMinifiedSize = 0;

    static getInstance(): MinificationCache {
        if (!MinificationCache.instance) {
            MinificationCache.instance = new MinificationCache();
        }
        return MinificationCache.instance;
    }

    /**
     * Genera un hash del contenido y opciones de minificación
     */
    private generateCacheKey(data: string, options: any): string {
        const content = `${data}||${JSON.stringify(options)}`;
        return createHash('sha256').update(content).digest('hex');
    }

    /**
     * Obtiene resultado de minificación desde cache o lo genera
     */
    async getOrMinify(
        data: string,
        filename: string,
        options: any,
    ): Promise<{ code: string; error: Error | null; cached: boolean }> {
        this.totalMinifications++;

        const cacheKey = this.generateCacheKey(data, options);

        // Verificar cache
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            // Actualizar timestamp de uso (LRU)
            cached.timestamp = Date.now();
            this.cacheHits++;
            return {
                code: cached.minifiedCode,
                error: null,
                cached: true,
            };
        }

        // Cache miss - minificar código
        this.cacheMisses++;
        const originalSize = data.length;

        try {
            const result = await minify(filename, data, options);

            // Si el código de entrada no estaba vacío pero el resultado sí,
            // probablemente hay un error de sintaxis
            if (data.trim() && !result.code.trim()) {
                const error = new Error(
                    `Minification failed: likely syntax error in ${filename}`,
                );
                return { code: '', error, cached: false };
            }

            const minifiedSize = result.code.length;

            // Cachear resultado exitoso
            this.addToCache(cacheKey, {
                contentHash: cacheKey,
                options,
                minifiedCode: result.code,
                timestamp: Date.now(),
                originalSize,
                minifiedSize,
            });

            // Actualizar métricas globales
            this.totalOriginalSize += originalSize;
            this.totalMinifiedSize += minifiedSize;

            return {
                code: result.code,
                error: null,
                cached: false,
            };
        } catch (error) {
            return {
                error:
                    error instanceof Error ? error : new Error(String(error)),
                code: '',
                cached: false,
            };
        }
    }

    /**
     * Añade resultado al cache con gestión de memoria
     */
    private addToCache(cacheKey: string, entry: MinificationCacheEntry): void {
        try {
            const entrySize = entry.originalSize + entry.minifiedSize;

            // Aplicar políticas de eviction si es necesario
            this.evictIfNeeded(entrySize);

            this.cache.set(cacheKey, entry);
            this.currentMemoryUsage += entrySize;
        } catch (error) {
            console.warn(
                '[MinificationCache] Error cacheando minificación:',
                error,
            );
        }
    }

    /**
     * Aplica políticas de eviction LRU si es necesario
     */
    private evictIfNeeded(newEntrySize: number): void {
        // Verificar límite de entradas
        while (this.cache.size >= this.MAX_CACHE_SIZE) {
            this.evictLRU();
        }

        // Verificar límite de memoria
        while (
            this.currentMemoryUsage + newEntrySize > this.MAX_CACHE_MEMORY &&
            this.cache.size > 0
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

        for (const [key, entry] of this.cache) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            const entry = this.cache.get(oldestKey);
            if (entry) {
                this.currentMemoryUsage -=
                    entry.originalSize + entry.minifiedSize;
                this.cache.delete(oldestKey);
            }
        }
    }

    /**
     * Limpia entradas expiradas
     */
    cleanExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.CACHE_TTL) {
                this.currentMemoryUsage -=
                    entry.originalSize + entry.minifiedSize;
                this.cache.delete(key);
            }
        }
    }

    /**
     * Obtiene estadísticas del cache
     */
    getStats() {
        const hitRate =
            this.totalMinifications > 0
                ? Math.round((this.cacheHits / this.totalMinifications) * 100)
                : 0;

        const avgCompressionRatio =
            this.totalOriginalSize > 0
                ? Math.round(
                      ((this.totalOriginalSize - this.totalMinifiedSize) /
                          this.totalOriginalSize) *
                          100,
                  )
                : 0;

        return {
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses,
            hitRate,
            totalMinifications: this.totalMinifications,
            cacheSize: this.cache.size,
            maxCacheSize: this.MAX_CACHE_SIZE,
            memoryUsage: this.currentMemoryUsage,
            maxMemoryUsage: this.MAX_CACHE_MEMORY,
            totalOriginalSize: this.totalOriginalSize,
            totalMinifiedSize: this.totalMinifiedSize,
            avgCompressionRatio,
        };
    }

    /**
     * Limpia todo el cache
     */
    clear(): void {
        this.cache.clear();
        this.currentMemoryUsage = 0;
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.totalMinifications = 0;
        this.totalOriginalSize = 0;
        this.totalMinifiedSize = 0;
    }
}

// Instancia global del cache de minificación
const minificationCache = MinificationCache.getInstance();

/**
 * Minifica el codigo JavaScript usando opciones especificas.
 *
 * @param {string} data - The JavaScript code to be minified.
 * @param {string} filename - The name of the file containing the JavaScript code.
 * @param {boolean} isProd - Indica si está en modo producción.
 * @returns {Promise<Object>} The result of the minification process.
 */
export const minifyJS = async (
    data: string,
    filename: string,
    isProd = true,
) => {
    try {
        const options = {
            compress: {
                target: 'es2020' as const,
            },
            mangle: {
                toplevel: true,
                debug: !isProd,
            },
            codegen: {
                removeWhitespace: true,
            },
            sourcemap: !isProd,
        };

        const result = await minificationCache.getOrMinify(
            data,
            filename,
            options,
        );

        return { code: result.code, error: result.error };
    } catch (error) {
        return { error, code: '' };
    }
};

// ✨ NUEVAS FUNCIONES: Exportar funcionalidades del cache de minificación para uso externo
export const getMinificationCacheStats = () => {
    return minificationCache.getStats();
};

export const clearMinificationCache = () => {
    minificationCache.clear();
};

export const cleanExpiredMinificationCache = () => {
    minificationCache.cleanExpired();
};
