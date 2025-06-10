/**
 * Performance Monitor - Sistema centralizado de monitoreo de optimizaciones
 * Reúne todas las métricas de cache y performance del VersaCompiler
 */

import {
    clearBrowserSyncCache,
    getBrowserSyncCacheStats,
} from '../servicios/browserSync';

import {
    cleanExpiredMinificationCache,
    clearMinificationCache,
    getMinificationCacheStats,
} from './minify';
import { getModuleResolutionMetrics } from './module-resolution-optimizer';
import {
    cleanExpiredParserCache,
    clearParserCache,
    getParserCacheStats,
} from './parser';
import { TransformOptimizer } from './transform-optimizer';
import {
    cleanExpiredVueHMRCache,
    clearVueHMRCache,
    getVueHMRCacheStats,
} from './vuejs';

/**
 * Interfaz unificada para todas las estadísticas de performance
 */
interface PerformanceStats {
    vueHMRCache: any;
    parserCache: any;
    browserSyncCache: any;
    minificationCache: any;
    transformOptimizer: any;
    moduleResolution: any;
    summary: {
        totalCacheHits: number;
        totalCacheMisses: number;
        overallHitRate: number;
        totalMemoryUsage: number;
        totalCacheEntries: number;
    };
}

export class PerformanceMonitor {
    private static instance: PerformanceMonitor;

    static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    /**
     * Obtiene todas las estadísticas de performance de manera unificada
     */
    getAllStats(): PerformanceStats {
        const vueHMRCache = getVueHMRCacheStats();
        const parserCache = getParserCacheStats();
        const browserSyncCache = getBrowserSyncCacheStats();
        const minificationCache = getMinificationCacheStats();
        const transformOptimizer = TransformOptimizer.getInstance().getStats();
        const moduleResolution = getModuleResolutionMetrics();

        // Calcular resumen general
        const totalCacheHits =
            (parserCache.cacheHits || 0) +
            (browserSyncCache.cacheHits || 0) +
            (minificationCache.cacheHits || 0) +
            (transformOptimizer.cacheHits || 0) +
            (moduleResolution.cacheHits || 0);

        const totalCacheMisses =
            (parserCache.cacheMisses || 0) +
            (browserSyncCache.cacheMisses || 0) +
            (minificationCache.cacheMisses || 0) +
            (transformOptimizer.cacheMisses || 0) +
            (moduleResolution.cacheMisses || 0);

        const totalRequests = totalCacheHits + totalCacheMisses;
        const overallHitRate =
            totalRequests > 0
                ? Math.round((totalCacheHits / totalRequests) * 100)
                : 0;

        const totalMemoryUsage =
            (parserCache.memoryUsage || 0) +
            (browserSyncCache.memoryUsage || 0) +
            (minificationCache.memoryUsage || 0) +
            (transformOptimizer.memoryUsage || 0);

        const totalCacheEntries =
            (vueHMRCache.size || 0) +
            (parserCache.cacheSize || 0) +
            (browserSyncCache.cacheSize || 0) +
            (minificationCache.cacheSize || 0) +
            (transformOptimizer.cacheSize || 0) +
            (moduleResolution.cacheSize || 0);

        return {
            vueHMRCache,
            parserCache,
            browserSyncCache,
            minificationCache,
            transformOptimizer,
            moduleResolution,
            summary: {
                totalCacheHits,
                totalCacheMisses,
                overallHitRate,
                totalMemoryUsage,
                totalCacheEntries,
            },
        };
    }

    /**
     * Genera un reporte detallado de performance
     */
    generateReport(): string {
        const stats = this.getAllStats();

        const formatBytes = (bytes: number) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return (
                parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
            );
        };

        const report = `
🚀 VERSACOMPILER PERFORMANCE REPORT
=====================================

📊 RESUMEN GENERAL
Hit Rate Total: ${stats.summary.overallHitRate}%
Cache Hits: ${stats.summary.totalCacheHits}
Cache Misses: ${stats.summary.totalCacheMisses}
Memoria Total: ${formatBytes(stats.summary.totalMemoryUsage)}
Entradas Cache: ${stats.summary.totalCacheEntries}

🎯 VUE HMR CACHE
Size: ${stats.vueHMRCache.size}/${stats.vueHMRCache.maxSize}
TTL: ${Math.round(stats.vueHMRCache.ttl / 1000 / 60)}min

📝 PARSER AST CACHE
Hit Rate: ${stats.parserCache.hitRate}%
Cache Hits: ${stats.parserCache.cacheHits}
Cache Misses: ${stats.parserCache.cacheMisses}
Size: ${stats.parserCache.cacheSize}/${stats.parserCache.maxCacheSize}
Memoria: ${formatBytes(stats.parserCache.memoryUsage)}/${formatBytes(stats.parserCache.maxMemoryUsage)}

🌐 BROWSERSYNC FILE CACHE
Hit Rate: ${stats.browserSyncCache.hitRate}%
Cache Hits: ${stats.browserSyncCache.cacheHits}
Cache Misses: ${stats.browserSyncCache.cacheMisses}
Size: ${stats.browserSyncCache.cacheSize}/${stats.browserSyncCache.maxCacheSize}
Memoria: ${formatBytes(stats.browserSyncCache.memoryUsage)}/${formatBytes(stats.browserSyncCache.maxMemoryUsage)}

🗜️ MINIFICATION CACHE
Hit Rate: ${stats.minificationCache.hitRate}%
Cache Hits: ${stats.minificationCache.cacheHits}
Cache Misses: ${stats.minificationCache.cacheMisses}
Size: ${stats.minificationCache.cacheSize}/${stats.minificationCache.maxCacheSize}
Memoria: ${formatBytes(stats.minificationCache.memoryUsage)}/${formatBytes(stats.minificationCache.maxMemoryUsage)}
Compresión Promedio: ${stats.minificationCache.avgCompressionRatio}%

🔄 TRANSFORM OPTIMIZER
Hit Rate: ${stats.transformOptimizer.hitRate}%
Cache Hits: ${stats.transformOptimizer.cacheHits}
Cache Misses: ${stats.transformOptimizer.cacheMisses}
Transformaciones: ${stats.transformOptimizer.totalTransforms}
Size: ${stats.transformOptimizer.cacheSize}
Memoria: ${formatBytes(stats.transformOptimizer.memoryUsage)}

📦 MODULE RESOLUTION
Hit Rate: ${stats.moduleResolution.cacheHitRate?.toFixed(1)}%
Cache Hits: ${stats.moduleResolution.cacheHits}
Cache Misses: ${stats.moduleResolution.cacheMisses}
Resoluciones: ${stats.moduleResolution.totalResolutions}
Índice Módulos: ${stats.moduleResolution.moduleIndexSize}
Índice Alias: ${stats.moduleResolution.aliasIndexSize}
Tiempo Promedio: ${stats.moduleResolution.averageResolveTime?.toFixed(2)}ms

=====================================
        `;

        return report;
    }

    /**
     * Limpia todos los caches
     */
    clearAllCaches(): void {
        clearVueHMRCache();
        clearParserCache();
        clearBrowserSyncCache();
        clearMinificationCache();
        TransformOptimizer.getInstance().clear();

        console.log('🧹 Todos los caches han sido limpiados');
    }

    /**
     * Limpia entradas expiradas de todos los caches
     */
    cleanExpiredCaches(): void {
        cleanExpiredVueHMRCache();
        cleanExpiredParserCache();
        cleanExpiredMinificationCache();

        console.log('🧹 Entradas expiradas limpiadas de todos los caches');
    }

    /**
     * Configura limpieza automática periódica
     */
    setupAutomaticCleanup(intervalMinutes: number = 30): void {
        setInterval(
            () => {
                this.cleanExpiredCaches();
                console.log(
                    `🔄 Limpieza automática ejecutada cada ${intervalMinutes} minutos`,
                );
            },
            intervalMinutes * 60 * 1000,
        );
    }

    /**
     * Obtiene métricas simplificadas para logging
     */
    getSimpleMetrics() {
        const stats = this.getAllStats();
        return {
            hitRate: stats.summary.overallHitRate,
            totalHits: stats.summary.totalCacheHits,
            totalMisses: stats.summary.totalCacheMisses,
            memoryUsage: stats.summary.totalMemoryUsage,
            cacheEntries: stats.summary.totalCacheEntries,
        };
    }
}

// Exportar instancia singleton
export const performanceMonitor = PerformanceMonitor.getInstance();

// Funciones de conveniencia
export const getAllPerformanceStats = () => performanceMonitor.getAllStats();
export const generatePerformanceReport = () =>
    performanceMonitor.generateReport();
export const clearAllCaches = () => performanceMonitor.clearAllCaches();
export const cleanExpiredCaches = () => performanceMonitor.cleanExpiredCaches();
export const getSimpleMetrics = () => performanceMonitor.getSimpleMetrics();
