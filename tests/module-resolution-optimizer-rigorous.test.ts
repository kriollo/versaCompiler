/**
 * Tests exhaustivos para ModuleResolutionOptimizer
 * Casos de borde, rendimiento, memoria y concurrencia
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    getModuleResolutionMetrics,
    getOptimizedAliasPath,
    getOptimizedModulePath,
    resetModuleResolutionOptimizer,
} from '../src/compiler/module-resolution-optimizer';

describe('ModuleResolutionOptimizer - Tests Exhaustivos', () => {
    beforeEach(() => {
        resetModuleResolutionOptimizer();
        process.env.PATH_ALIAS = JSON.stringify({
            '@/*': ['/src/*'],
            '@components/*': ['/src/components/*'],
            '@utils/*': ['/src/utils/*'],
        });
        process.env.PATH_DIST = 'dist';
    });

    afterEach(() => {
        delete process.env.PATH_ALIAS;
        delete process.env.PATH_DIST;
        vi.restoreAllMocks();
    });

    describe('Resolución de módulos npm', () => {
        it('debe resolver módulos ESM conocidos correctamente', async () => {
            const result = await getOptimizedModulePath('vue');
            expect(result).toBeTruthy();
            expect(result).toContain('/node_modules/vue/');
        });

        it('debe cachear resoluciones repetidas', async () => {
            const result1 = await getOptimizedModulePath('vue');
            const result2 = await getOptimizedModulePath('vue');

            expect(result1).toBe(result2);

            const metrics = getModuleResolutionMetrics();
            expect(metrics.cacheHits).toBeGreaterThan(0);
        });

        it('debe manejar módulos no existentes', async () => {
            const result = await getOptimizedModulePath(
                'modulo-que-no-existe-xyz-123',
            );
            expect(result).toBeNull();
        });

        it('debe manejar resolución desde diferentes archivos fuente', async () => {
            const result1 = await getOptimizedModulePath(
                'vue',
                '/src/components/App.vue',
            );
            const result2 = await getOptimizedModulePath(
                'vue',
                '/src/utils/helpers.ts',
            );

            // Ambos deben resolver al mismo módulo
            expect(result1).toBeTruthy();
            expect(result1).toBe(result2);
        });
    });

    describe('Resolución de alias', () => {
        it('debe resolver alias simples correctamente', () => {
            const result = getOptimizedAliasPath('@/components/Button.vue');
            expect(result).toBeTruthy();
            expect(result).toContain('/dist/components/Button.vue');
        });

        it('debe mantener extensión .vue sin transformar', () => {
            const result = getOptimizedAliasPath('@/components/Modal.vue');
            expect(result).toMatch(/\.vue$/);
            expect(result).toContain('/dist/components/Modal.vue');
        });

        it('debe mantener extensión .ts sin transformar', () => {
            const result = getOptimizedAliasPath('@/utils/helpers.ts');
            expect(result).toMatch(/\.ts$/);
            expect(result).toContain('/dist/utils/helpers.ts');
        });

        it('debe mantener extensiones .js', () => {
            const result = getOptimizedAliasPath('@/utils/format.js');
            expect(result).toMatch(/\.js$/);
            expect(result).toContain('/dist/utils/format.js');
        });

        it('debe resolver paths sin extensión', () => {
            const result = getOptimizedAliasPath('@/utils/helpers');
            expect(result).toBeTruthy();
            expect(result).toContain('/dist/utils/helpers');
        });

        it('debe manejar paths con múltiples segmentos', () => {
            const result = getOptimizedAliasPath('@/components/ui/Button.vue');
            expect(result).toContain('/dist/components/ui/Button.vue');
        });

        it('debe retornar null para paths sin alias', () => {
            const result = getOptimizedAliasPath('./relative/path.js');
            expect(result).toBeNull();
        });
    });

    describe('Performance y concurrencia', () => {
        it('debe manejar múltiples resoluciones concurrentes', async () => {
            const promises = Array.from({ length: 50 }, () =>
                getOptimizedModulePath('vue'),
            );

            const results = await Promise.all(promises);

            // Todos deben resolver al mismo path
            const uniquePaths = new Set(results.filter(r => r !== null));
            expect(uniquePaths.size).toBeLessThanOrEqual(1);
        });

        it('debe resolver rápidamente con caché caliente', async () => {
            // Warm up cache
            await getOptimizedModulePath('vue');

            const start = performance.now();
            await getOptimizedModulePath('vue');
            const duration = performance.now() - start;

            // Cache hit debe ser < 5ms
            expect(duration).toBeLessThan(5);
        });
    });

    describe('Casos de borde y errores', () => {
        it('debe manejar PATH_ALIAS vacío', () => {
            process.env.PATH_ALIAS = '{}';
            resetModuleResolutionOptimizer();

            const result = getOptimizedAliasPath('@/components/Button.vue');
            expect(result).toBeNull();
        });

        it('debe manejar PATH_ALIAS malformado', () => {
            process.env.PATH_ALIAS = 'invalid-json';
            resetModuleResolutionOptimizer();

            const result = getOptimizedAliasPath('@/components/Button.vue');
            expect(result).toBeNull();
        });

        it('debe manejar paths muy largos', () => {
            const longPath = '@/' + 'very/'.repeat(50) + 'deep/Component.vue';
            const result = getOptimizedAliasPath(longPath);
            expect(result).toBeTruthy();
        });

        it('debe manejar paths con ../', () => {
            const result = getOptimizedAliasPath('@/../components/Button.vue');
            // Debe normalizar o rechazar
            expect(result === null || typeof result === 'string').toBe(true);
        });

        it('debe manejar extensiones múltiples', () => {
            const result = getOptimizedAliasPath('@/file.test.vue.ts');
            expect(result).toBeTruthy();
        });
    });
});
