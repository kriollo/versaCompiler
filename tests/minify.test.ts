import {
    minifyJS,
    minifyWithTemplates,
    getMinificationCacheStats,
    clearMinificationCache,
} from '../src/compiler/minify';

// Declaraciones de tipos para los globals de Vitest
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
declare const expect: (value: unknown) => {
    toBe: (expected: unknown) => void;
    toEqual: (expected: unknown) => void;
    toBeNull: () => void;
    toBeDefined: () => void;
    toBeLessThan: (expected: number) => void;
    toBeGreaterThan: (expected: number) => void;
};
declare const beforeEach: (fn: () => void) => void;

describe('Minify - Funciones de minificación', () => {
    beforeEach(() => {
        // Limpiar cache antes de cada test
        clearMinificationCache();
    });

    describe('minifyJS', () => {
        it('debe minificar código JavaScript válido', async () => {
            const code = `
                function hello(name) {
                    console.log('Hello, ' + name + '!');
                    return true;
                }
                hello('World');
            `;

            const result = await minifyJS(code, 'test.js', true);

            expect(result.error).toBeNull();
            expect(result.code).toBeDefined();
            expect(typeof result.code).toBe('string');
            expect(result.code.length).toBeLessThan(code.length);
            // Verificar que el código minificado contiene elementos esenciales
            expect(result.code).toContain('console.log');
            expect(result.code).toContain('Hello');
        });

        it('debe manejar código JavaScript vacío', async () => {
            const result = await minifyJS('', 'empty.js', true);

            expect(result.error).toBeNull();
            expect(result.code).toBe('');
        });

        it('debe manejar código con sintaxis inválida', async () => {
            const invalidCode =
                'function broken { console.log("missing paren"); }';

            const result = await minifyJS(invalidCode, 'broken.js', true);

            // Puede devolver error o código vacío dependiendo del minifier
            expect(result).toBeDefined();
            expect(typeof result.code).toBe('string');
        });
    });

    describe('minifyWithTemplates', () => {
        it('debe minificar código con templates HTML', async () => {
            const code = `
                const html = \`<div class="container">
                    <h1>Hello World</h1>
                    <p>This is a test</p>
                </div>\`;
                console.log(html);
            `;

            const result = await minifyWithTemplates(code, 'template.js', true);

            expect(result.error).toBeNull();
            expect(result.code).toBeDefined();
            expect(typeof result.code).toBe('string');
            // El código debería estar minificado
            expect(result.code.length).toBeLessThan(code.length);
        });

        it('debe manejar código sin templates', async () => {
            const code = 'const x = 42; function test() { return x * 2; }';

            const result = await minifyWithTemplates(
                code,
                'no-template.js',
                true,
            );

            expect(result.error).toBeNull();
            expect(result.code).toBeDefined();
            expect(result.code.length).toBeLessThan(code.length);
        });
    });

    describe('Minification Cache Management', () => {
        it('debe inicializar cache vacío', () => {
            const stats = getMinificationCacheStats();

            expect(stats.cacheHits).toBe(0);
            expect(stats.cacheMisses).toBe(0);
            expect(stats.totalMinifications).toBe(0);
            expect(stats.cacheSize).toBe(0);
            expect(stats.hitRate).toBe(0);
        });

        it('debe limpiar el cache correctamente', () => {
            clearMinificationCache();
            const stats = getMinificationCacheStats();

            expect(stats.cacheHits).toBe(0);
            expect(stats.cacheMisses).toBe(0);
            expect(stats.totalMinifications).toBe(0);
            expect(stats.cacheSize).toBe(0);
            expect(stats.memoryUsage).toBe(0);
            expect(stats.totalOriginalSize).toBe(0);
            expect(stats.totalMinifiedSize).toBe(0);
        });

        it('debe tener límites de cache definidos', () => {
            const stats = getMinificationCacheStats();

            expect(stats.maxCacheSize).toBeDefined();
            expect(stats.maxMemoryUsage).toBeDefined();
            expect(typeof stats.maxCacheSize).toBe('number');
            expect(typeof stats.maxMemoryUsage).toBe('number');
            expect(stats.maxCacheSize).toBeGreaterThan(0);
            expect(stats.maxMemoryUsage).toBeGreaterThan(0);
        });
    });
});
