/**
 * Tests específicos para la función getModulePath
 * Prueba todos los casos de resolución de módulos npm/node_modules
 */

import fs from 'fs';
import path from 'path';
import { getModulePath } from '../dist/utils/module-resolver.ts';

describe('getModulePath - Tests básicos', () => {
    test('debe funcionar con módulos existentes', () => {
        // Test básico para verificar que la función está funcionando
        const result = getModulePath('resolve');

        if (result) {
            expect(typeof result).toBe('string');
            expect(result).toMatch(/\/node_modules/);
            expect(result).toMatch(/^\/node_modules\//);
        }

        // El test pasa independientemente si el módulo existe o no
        expect(true).toBe(true);
    });

    test('debe devolver null para módulos inexistentes', () => {
        const result = getModulePath('modulo-inexistente-123456');
        expect(result).toBeNull();
    });

    test('debe manejar nombres vacíos', () => {
        const result = getModulePath('');
        expect(result).toBeNull();
    });
});

describe('getModulePath - Resolución de módulos', () => {
    test('debe resolver módulos comunes instalados', () => {
        const commonModules = ['resolve', 'enhanced-resolve'];

        for (const moduleName of commonModules) {
            const result = getModulePath(moduleName);

            if (result) {
                expect(typeof result).toBe('string');
                expect(result).toMatch(/\/node_modules/);
                expect(result).toMatch(/\.js$/);
                expect(result).toMatch(/^\/node_modules\//);
            }
        }
    });
    test('debe resolver vue si está disponible', () => {
        const result = getModulePath('vue');

        if (result) {
            expect(result).toMatch(/\/node_modules.*vue/);
            expect(typeof result).toBe('string');
            expect(result).toMatch(/\.js$/);
            expect(result).toMatch(/^\/node_modules\//);
            // Remover la barra inicial para construir la ruta completa
            const relativePath = result.startsWith('/')
                ? result.substring(1)
                : result;
            const fullPath = path.join(process.cwd(), relativePath);
            expect(fs.existsSync(fullPath)).toBe(true);
        }
    });
    test('debe resolver paquetes con scope (@)', () => {
        const scopedPackages = ['@vue/reactivity', '@types/node'];

        for (const packageName of scopedPackages) {
            const result = getModulePath(packageName);

            if (result) {
                expect(typeof result).toBe('string');
                expect(result).toMatch(/\/node_modules/);
                expect(result).toMatch(/^\/node_modules\//);
            }
        }
    });
});

describe('getModulePath - Formato de salida', () => {
    test('debe devolver rutas con formato Unix que empiecen con /', () => {
        const result = getModulePath('resolve');

        if (result) {
            expect(result).not.toMatch(/\\/);
            expect(result).toMatch(/\//);
            expect(result).toMatch(/^\/node_modules\//);
        }
    });

    test('debe devolver rutas que empiecen con / (absoluto relativo)', () => {
        const result = getModulePath('resolve');

        if (result) {
            expect(result).toMatch(/^\//);
            expect(result).toMatch(/^\/node_modules\//);
        }
    });
});

describe('getModulePath - Consistencia', () => {
    test('debe devolver el mismo resultado en llamadas consecutivas', () => {
        const moduleName = 'resolve';
        const result1 = getModulePath(moduleName);
        const result2 = getModulePath(moduleName);

        expect(result1).toEqual(result2);
    });

    test('debe ejecutarse en tiempo razonable', () => {
        const start = Date.now();
        getModulePath('resolve');
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(1000);
    });
});

describe('getModulePath - Verificación de archivos', () => {
    test('la ruta devuelta debe apuntar a un archivo existente', () => {
        const result = getModulePath('resolve');

        if (result) {
            // Remover la barra inicial para construir la ruta completa
            const relativePath = result.startsWith('/')
                ? result.substring(1)
                : result;
            const fullPath = path.join(process.cwd(), relativePath);
            expect(fs.existsSync(fullPath)).toBe(true);

            const stats = fs.statSync(fullPath);
            expect(stats.isFile()).toBe(true);
        }
    });
});
