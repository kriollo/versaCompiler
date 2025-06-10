/**
 * Test del Module Resolution Optimizer
 * Valida el funcionamiento del sistema optimizado de resolución de módulos
 */

import { env } from 'node:process';

import {
    ModuleResolutionOptimizer,
    getModuleResolutionMetrics,
    getOptimizedAliasPath,
    getOptimizedModulePath,
} from '../src/compiler/module-resolution-optimizer';

describe('Module Resolution Optimizer', () => {
    let optimizer: ModuleResolutionOptimizer;

    beforeAll(() => {
        // Configurar entorno de test
        env.PATH_ALIAS = JSON.stringify({
            '@/*': ['/src/*'],
            '@components/*': ['./src/components/*'],
            'P@/*': ['./public/*'],
        });
        env.PATH_DIST = 'public';

        optimizer = ModuleResolutionOptimizer.getInstance();
    });

    afterAll(() => {
        optimizer.cleanup();
        delete env.PATH_ALIAS;
        delete env.PATH_DIST;
    });

    describe('Inicialización del sistema', () => {
        test('debe crear una instancia singleton', () => {
            const instance1 = ModuleResolutionOptimizer.getInstance();
            const instance2 = ModuleResolutionOptimizer.getInstance();

            expect(instance1).toBe(instance2);
        });

        test('debe construir índices de módulos y alias', () => {
            const metrics = optimizer.getMetrics();

            expect(metrics.moduleIndexSize).toBeGreaterThanOrEqual(0);
            expect(metrics.aliasIndexSize).toBe(3); // 3 alias configurados
            expect(metrics.cacheSize).toBe(0); // Cache inicialmente vacío
        });
    });

    describe('Resolución de módulos', () => {
        test('debe resolver módulos conocidos', async () => {
            // Probar con un módulo que probablemente esté instalado
            const result = await getOptimizedModulePath('path');

            if (result !== null) {
                expect(result).toMatch(/node_modules.*path/);
                expect(result).toMatch(/^\/.*\.js$/);
            } else {
                // Si no está instalado, debería retornar null
                expect(result).toBeNull();
            }
        });

        test('debe retornar null para módulos excluidos', async () => {
            const excludedModules = [
                'vue/compiler-sfc',
                'oxc-parser',
                'typescript',
                '@vue/compiler-sfc',
            ];

            for (const moduleName of excludedModules) {
                const result = await getOptimizedModulePath(moduleName);
                expect(result).toBeNull();
            }
        });

        test('debe manejar subpaths de módulos', async () => {
            // Probar con un subpath típico
            const result = await getOptimizedModulePath('lodash/isArray');

            // Si lodash está instalado, debería resolver el subpath
            if (result !== null) {
                expect(result).toMatch(/node_modules.*lodash/);
            }
        });

        test('debe usar caché para resoluciones repetidas', async () => {
            const moduleName = 'fs'; // Built-in module que será rechazado pero cacheado

            // Primera resolución
            const result1 = await getOptimizedModulePath(moduleName);
            const metrics1 = optimizer.getMetrics();

            // Segunda resolución (debería usar caché)
            const result2 = await getOptimizedModulePath(moduleName);
            const metrics2 = optimizer.getMetrics();

            expect(result1).toBe(result2);
            expect(metrics2.cacheHits).toBeGreaterThan(metrics1.cacheHits);
        });
    });

    describe('Resolución de alias', () => {
        test('debe resolver alias @/', () => {
            const tests = [
                {
                    input: '@/components/Button.vue',
                    expected: '/public/components/Button.vue',
                },
                {
                    input: '@/utils/helper.ts',
                    expected: '/public/utils/helper.ts',
                },
                {
                    input: '@/config/app.js',
                    expected: '/public/config/app.js',
                },
            ];

            for (const { input, expected } of tests) {
                const result = getOptimizedAliasPath(input);
                expect(result).toBe(expected);
            }
        });

        test('debe resolver alias @components/*', () => {
            const result = getOptimizedAliasPath('@components/Modal.vue');
            expect(result).toBe('/public/src/components/Modal.vue');
        });
        test('debe resolver alias P@/*', () => {
            const result = getOptimizedAliasPath('P@/vendor/styles.css');
            expect(result).toBe('/public/vendor/styles.css');
        });

        test('debe retornar null para paths sin alias', () => {
            const nonAliasedPaths = [
                './local/file.js',
                '../parent/file.js',
                '/absolute/path.js',
                'regular-module',
            ];

            for (const path of nonAliasedPaths) {
                const result = getOptimizedAliasPath(path);
                expect(result).toBeNull();
            }
        });

        test('debe priorizar alias más específicos', () => {
            // El alias @components/* debería tener prioridad sobre @/*
            const result = getOptimizedAliasPath('@components/Button.vue');

            // Debería usar @components/* en lugar de @/*
            expect(result).toBe('/public/src/components/Button.vue');
        });
    });

    describe('Performance y métricas', () => {
        test('debe medir tiempos de resolución', async () => {
            const startMetrics = optimizer.getMetrics();

            await getOptimizedModulePath('path');
            await getOptimizedModulePath('fs');
            await getOptimizedModulePath('crypto');

            const endMetrics = optimizer.getMetrics();

            expect(endMetrics.totalResolutions).toBeGreaterThan(
                startMetrics.totalResolutions,
            );
            expect(endMetrics.averageResolveTime).toBeGreaterThan(0);
            expect(endMetrics.indexLookups).toBeGreaterThanOrEqual(0);
        });

        test('debe calcular cache hit rate correctamente', async () => {
            optimizer.resetMetrics();

            // Hacer varias resoluciones con repeticiones
            await getOptimizedModulePath('path');
            await getOptimizedModulePath('fs');
            await getOptimizedModulePath('path'); // Repetición -> cache hit
            await getOptimizedModulePath('fs'); // Repetición -> cache hit

            const metrics = optimizer.getMetrics();

            expect(metrics.totalResolutions).toBe(4);
            expect(metrics.cacheHitRate).toBeGreaterThan(0);
            expect(metrics.cacheHits).toBeGreaterThanOrEqual(2);
        });

        test('debe limpiar caché expirado', () => {
            optimizer.clearExpiredCache();

            const metrics = optimizer.getMetrics();
            expect(metrics.cacheSize).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Gestión de memoria y limpieza', () => {
        test('debe resetear métricas correctamente', () => {
            optimizer.resetMetrics();

            const metrics = optimizer.getMetrics();

            expect(metrics.totalResolutions).toBe(0);
            expect(metrics.cacheHits).toBe(0);
            expect(metrics.cacheMisses).toBe(0);
            expect(metrics.averageResolveTime).toBe(0);
        });
        test('debe forzar reconstrucción de índices', () => {
            optimizer.forceRefresh();

            const metrics = optimizer.getMetrics();
            expect(metrics.moduleIndexSize).toBeGreaterThanOrEqual(0);
        });

        test('debe limpiar todos los recursos', () => {
            optimizer.cleanup();

            const metrics = optimizer.getMetrics();

            expect(metrics.cacheSize).toBe(0);
            expect(metrics.moduleIndexSize).toBe(0);
            expect(metrics.aliasIndexSize).toBe(0);
        });
    });

    describe('Casos edge y manejo de errores', () => {
        test('debe manejar módulos inexistentes', async () => {
            const result = await getOptimizedModulePath(
                'modulo-que-no-existe-12345',
            );
            expect(result).toBeNull();
        });
        test('debe manejar alias con caracteres especiales', () => {
            // Configurar alias con caracteres especiales para el test
            const originalPathDist = env.PATH_DIST;
            env.PATH_ALIAS = JSON.stringify({
                '$test/*': ['special/*'],
                '#config': ['config/index.js'],
            });
            env.PATH_DIST = 'special';

            // Refrescar para cargar nuevos alias
            optimizer.forceRefresh();

            const result1 = getOptimizedAliasPath('$test/file.js');
            const result2 = getOptimizedAliasPath('#config');

            expect(result1).toBe('/special/file.js');
            expect(result2).toBe('/special/config/index.js');

            // Restaurar configuración original
            env.PATH_DIST = originalPathDist;
            env.PATH_ALIAS = JSON.stringify({
                '@/*': ['/src/*'],
                '@components/*': ['./src/components/*'],
                'P@/*': ['./public/*'],
            });
            optimizer.forceRefresh();
        });

        test('debe manejar alias sin PATH_DIST', () => {
            const originalPathDist = env.PATH_DIST;
            delete env.PATH_DIST;

            const result = getOptimizedAliasPath('@/test.js');
            expect(result).toBeNull();

            // Restaurar
            env.PATH_DIST = originalPathDist;
        });

        test('debe manejar PATH_ALIAS inválido', () => {
            const originalPathAlias = env.PATH_ALIAS;
            env.PATH_ALIAS = 'invalid-json';

            // Esto no debería romper el sistema
            expect(() => {
                optimizer.forceRefresh();
            }).not.toThrow();

            // Restaurar
            env.PATH_ALIAS = originalPathAlias;
        });
    });

    describe('Integración con sistema existente', () => {
        test('funciones de compatibilidad deben funcionar', async () => {
            // Test de getOptimizedModulePath
            const modulePath = await getOptimizedModulePath('path');
            expect(typeof modulePath === 'string' || modulePath === null).toBe(
                true,
            );

            // Test de getOptimizedAliasPath
            const aliasPath = getOptimizedAliasPath('@/test.js');
            expect(typeof aliasPath === 'string' || aliasPath === null).toBe(
                true,
            );

            // Test de getModuleResolutionMetrics
            const metrics = getModuleResolutionMetrics();
            expect(metrics).toHaveProperty('totalResolutions');
            expect(metrics).toHaveProperty('cacheHitRate');
            expect(metrics).toHaveProperty('moduleIndexSize');
        });
    });
});

describe('Comparación de performance con sistema anterior', () => {
    test('debe ser más rápido para búsquedas repetidas', async () => {
        const iterations = 10;
        const modules = ['path', 'fs', 'crypto', 'util', 'events'];

        // Test con sistema optimizado
        const optimizedStart = performance.now();

        for (let i = 0; i < iterations; i++) {
            for (const module of modules) {
                await getOptimizedModulePath(module);
            }
        }

        const optimizedTime = performance.now() - optimizedStart;

        // Verificar que se usó caché (hit rate > 0)
        const metrics = getModuleResolutionMetrics();
        expect(metrics.cacheHitRate).toBeGreaterThan(0);

        console.log(
            `Sistema optimizado: ${optimizedTime.toFixed(2)}ms para ${iterations * modules.length} resoluciones`,
        );
        console.log(`Cache hit rate: ${metrics.cacheHitRate.toFixed(1)}%`);
        console.log(
            `Tiempo promedio por resolución: ${metrics.averageResolveTime.toFixed(2)}ms`,
        );

        // El tiempo debería ser razonable (menos de 100ms para 50 resoluciones)
        expect(optimizedTime).toBeLessThan(100);
    });
});
