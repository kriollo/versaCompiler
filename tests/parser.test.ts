import {
    getCodeFile,
    getParserCacheStats,
    clearParserCache,
} from '../src/compiler/parser';
import fs from 'node:fs/promises';
import path from 'node:path';

// Declaraciones de tipos para los globals de Vitest
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
declare const expect: (value: unknown) => {
    toBe: (expected: unknown) => void;
    toEqual: (expected: unknown) => void;
    toBeNull: () => void;
    toBeDefined: () => void;
    toBeInstanceOf: (constructor: any) => void;
};
declare const beforeEach: (fn: () => void) => void;

describe('Parser - Funciones de parsing y cache', () => {
    describe('getCodeFile', () => {
        it('debe leer correctamente un archivo existente', async () => {
            // Crear un archivo temporal para el test
            const testFile = path.join(process.cwd(), 'test-temp-file.js');
            const testContent = 'console.log("Hello World");';

            try {
                await fs.writeFile(testFile, testContent, 'utf-8');

                const result = await getCodeFile(testFile);

                expect(result.error).toBeNull();
                expect(result.code).toBe(testContent);
            } finally {
                // Limpiar archivo temporal
                try {
                    await fs.unlink(testFile);
                } catch {
                    // Ignorar errores de limpieza
                }
            }
        });

        it('debe devolver error para archivo inexistente', async () => {
            const nonExistentFile = path.join(
                process.cwd(),
                'non-existent-file.js',
            );

            const result = await getCodeFile(nonExistentFile);

            expect(result.code).toBeNull();
            expect(result.error).toBeDefined();
            expect(result.error).toBeInstanceOf(Error);
        });
    });

    describe('Parser Cache Management', () => {
        beforeEach(() => {
            // Limpiar cache antes de cada test
            clearParserCache();
        });

        it('debe inicializar cache vacío', () => {
            const stats = getParserCacheStats();

            expect(stats.cacheHits).toBe(0);
            expect(stats.cacheMisses).toBe(0);
            expect(stats.totalParses).toBe(0);
            expect(stats.cacheSize).toBe(0);
            expect(stats.hitRate).toBe(0);
        });

        it('debe limpiar el cache correctamente', () => {
            clearParserCache();
            const stats = getParserCacheStats();

            expect(stats.cacheHits).toBe(0);
            expect(stats.cacheMisses).toBe(0);
            expect(stats.totalParses).toBe(0);
            expect(stats.cacheSize).toBe(0);
            expect(stats.memoryUsage).toBe(0);
        });

        it('debe tener límites de cache definidos', () => {
            const stats = getParserCacheStats();

            expect(stats.maxCacheSize).toBeDefined();
            expect(stats.maxMemoryUsage).toBeDefined();
            expect(typeof stats.maxCacheSize).toBe('number');
            expect(typeof stats.maxMemoryUsage).toBe('number');
        });
    });
});
