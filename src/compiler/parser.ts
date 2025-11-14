import { createHash } from 'node:crypto';
import { statSync } from 'node:fs';
import { open, readFile } from 'node:fs/promises';

import { parseSync } from 'oxc-parser';

// ✨ OPTIMIZACIÓN 1: Cache de contenido de archivos leídos
interface FileContentCacheEntry {
    content: string;
    mtimeMs: number;
    size: number;
    timestamp: number;
}

class FileContentCache {
    private static instance: FileContentCache;
    private cache = new Map<string, FileContentCacheEntry>();
    private readonly MAX_CACHE_SIZE = 500; // Máximo archivos en cache
    private readonly MAX_FILE_SIZE_TO_CACHE = 1024 * 1024; // 1MB - solo cachear archivos < 1MB
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

    // Métricas
    private cacheHits = 0;
    private cacheMisses = 0;
    private totalReads = 0;

    static getInstance(): FileContentCache {
        if (!FileContentCache.instance) {
            FileContentCache.instance = new FileContentCache();
        }
        return FileContentCache.instance;
    }

    /**
     * Lee archivo con cache inteligente
     */
    async readFileWithCache(filename: string): Promise<string> {
        this.totalReads++;

        // Obtener stats del archivo (más rápido que leerlo)
        const stats = statSync(filename);

        // No cachear archivos muy grandes
        if (stats.size > this.MAX_FILE_SIZE_TO_CACHE) {
            this.cacheMisses++;
            return await this.fastReadFile(filename, stats.size);
        }

        const cached = this.cache.get(filename);

        // Verificar si cache es válido (mismo mtime y no expirado)
        if (
            cached &&
            cached.mtimeMs === stats.mtimeMs &&
            Date.now() - cached.timestamp < this.CACHE_TTL
        ) {
            this.cacheHits++;
            cached.timestamp = Date.now(); // LRU update
            return cached.content;
        }

        // Cache miss - leer archivo
        this.cacheMisses++;
        const content = await this.fastReadFile(filename, stats.size);

        // Cachear si está dentro de límites
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            this.evictLRU();
        }

        this.cache.set(filename, {
            content,
            mtimeMs: stats.mtimeMs,
            size: stats.size,
            timestamp: Date.now(),
        });

        return content;
    }

    /**
     * Lectura ultra-rápida con buffer pre-allocated
     */
    private async fastReadFile(
        filename: string,
        size: number,
    ): Promise<string> {
        // Para archivos pequeños, usar el método tradicional (más rápido en ese caso)
        if (size < 16384) {
            // 16KB
            return await readFile(filename, 'utf-8');
        }

        // Para archivos grandes, usar open + read con buffer pre-allocated
        let fileHandle;
        try {
            fileHandle = await open(filename, 'r');
            const buffer = Buffer.allocUnsafe(size);
            await fileHandle.read(buffer, 0, size, 0);
            return buffer.toString('utf-8');
        } finally {
            await fileHandle?.close();
        }
    }

    /**
     * Elimina entrada LRU
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
            this.cache.delete(oldestKey);
        }
    }

    /**
     * Invalida cache de un archivo específico
     */
    invalidate(filename: string): void {
        this.cache.delete(filename);
    }

    /**
     * Limpia cache completo
     */
    clear(): void {
        this.cache.clear();
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.totalReads = 0;
    }

    /**
     * Obtiene estadísticas
     */
    getStats() {
        const hitRate =
            this.totalReads > 0
                ? Math.round((this.cacheHits / this.totalReads) * 100)
                : 0;

        return {
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses,
            hitRate,
            totalReads: this.totalReads,
            cacheSize: this.cache.size,
            maxCacheSize: this.MAX_CACHE_SIZE,
        };
    }
}

// Instancia global del cache de archivos
const fileCache = FileContentCache.getInstance();

// ✨ NUEVA OPTIMIZACIÓN: Sistema de cache AST inteligente
interface ASTCacheEntry {
    contentHash: string;
    ast: any;
    astType: 'js' | 'ts';
    timestamp: number;
    size: number;
}

class ParserASTCache {
    private static instance: ParserASTCache;
    private cache = new Map<string, ASTCacheEntry>();
    private readonly MAX_CACHE_SIZE = 150; // Máximo ASTs en cache
    private readonly MAX_CACHE_MEMORY = 30 * 1024 * 1024; // 30MB límite
    private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutos
    private currentMemoryUsage = 0;

    // Métricas
    private cacheHits = 0;
    private cacheMisses = 0;
    private totalParses = 0;

    static getInstance(): ParserASTCache {
        if (!ParserASTCache.instance) {
            ParserASTCache.instance = new ParserASTCache();
        }
        return ParserASTCache.instance;
    }

    /**
     * Genera un hash del contenido del código
     */
    private generateContentHash(code: string, astType: 'js' | 'ts'): string {
        return createHash('sha256').update(`${code}:${astType}`).digest('hex');
    }

    /**
     * Estima el tamaño en memoria de un AST
     */
    private estimateASTSize(ast: any): number {
        try {
            return JSON.stringify(ast).length * 2; // UTF-16 characters
        } catch {
            return 10000; // Estimación por defecto
        }
    }

    /**
     * Obtiene AST desde cache o lo parsea
     */
    async getOrParseAST(
        filename: string,
        code: string,
        astType: 'js' | 'ts' = 'js',
    ): Promise<{ ast: any; cached: boolean }> {
        this.totalParses++;

        const contentHash = this.generateContentHash(code, astType);
        const cacheKey = `${filename}:${contentHash}`;

        // Verificar cache
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            // Actualizar timestamp de uso (LRU)
            cached.timestamp = Date.now();
            this.cacheHits++;
            return {
                ast: cached.ast,
                cached: true,
            };
        }

        // Cache miss - parsear nuevo AST
        this.cacheMisses++;
        const ast = parseSync(filename, code, {
            sourceType: 'module',
            showSemanticErrors: true,
            astType,
        });

        // Cachear resultado si es válido
        if (ast && !ast.errors?.length) {
            this.addToCache(cacheKey, ast, astType);
        }

        return {
            ast,
            cached: false,
        };
    }

    /**
     * Añade AST al cache con gestión de memoria
     */
    private addToCache(cacheKey: string, ast: any, astType: 'js' | 'ts'): void {
        try {
            const size = this.estimateASTSize(ast);

            // Aplicar políticas de eviction si es necesario
            this.evictIfNeeded(size);
            const entry: ASTCacheEntry = {
                contentHash: cacheKey.split(':')[1] || '',
                ast,
                astType,
                timestamp: Date.now(),
                size,
            };

            this.cache.set(cacheKey, entry);
            this.currentMemoryUsage += size;
        } catch (error) {
            console.warn('[ParserASTCache] Error cacheando AST:', error);
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
                this.currentMemoryUsage -= entry.size;
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
                this.currentMemoryUsage -= entry.size;
                this.cache.delete(key);
            }
        }
    }

    /**
     * Obtiene estadísticas del cache
     */
    getStats() {
        const hitRate =
            this.totalParses > 0
                ? Math.round((this.cacheHits / this.totalParses) * 100)
                : 0;

        return {
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses,
            hitRate,
            totalParses: this.totalParses,
            cacheSize: this.cache.size,
            maxCacheSize: this.MAX_CACHE_SIZE,
            memoryUsage: this.currentMemoryUsage,
            maxMemoryUsage: this.MAX_CACHE_MEMORY,
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
        this.totalParses = 0;
    }
}

// Instancia global del cache AST
const astCache = ParserASTCache.getInstance();

/**
 * Parses the given JavaScript code using Acorn and returns the Abstract Syntax Tree (AST).
 *
 * @param {string} data - The JavaScript code to be parsed.
 * @returns {Promise<Object|null>} The parsed AST object if successful, or null if an error occurs.
 * @throws {Error} If there is an error during parsing, it logs the error details and stack trace.
 */
export const parser = async (
    filename: string,
    code: string,
    astType: 'js' | 'ts' = 'js',
) => {
    const { ast } = await astCache.getOrParseAST(filename, code, astType);
    return ast;
};

export const getCodeFile = async (filename: string) => {
    try {
        // ✨ Usar cache de archivos para lectura ultra-rápida
        const code = await fileCache.readFileWithCache(filename);
        return { code, error: null };
    } catch (error) {
        return { code: null, error };
    }
};

// ✨ NUEVAS FUNCIONES: Exportar funcionalidades del cache AST para uso externo
export const getParserCacheStats = () => {
    return astCache.getStats();
};

export const clearParserCache = () => {
    astCache.clear();
};

export const cleanExpiredParserCache = () => {
    astCache.cleanExpired();
};

// ✨ FUNCIONES: Cache de archivos
export const getFileContentCacheStats = () => {
    return fileCache.getStats();
};

export const clearFileContentCache = () => {
    fileCache.clear();
};

export const invalidateFileCache = (filename: string) => {
    fileCache.invalidate(filename);
};
