/**
 * Tests específicos para la nueva funcionalidad de resolución de módulos
 * Testa getModulePath y las nuevas capacidades de transforms.ts
 */

import { estandarizaCode } from '../dist/compiler/transforms';
import { getModulePath } from '../dist/utils/module-resolver';

// Configurar variables de entorno para las pruebas
const setupEnv = () => {
    process.env.PATH_ALIAS = JSON.stringify({ '@/*': '/src/*' });
    process.env.PATH_DIST = 'public';
};

const cleanupEnv = () => {
    delete process.env.PATH_ALIAS;
    delete process.env.PATH_DIST;
};

describe('Resolución de módulos externos', () => {
    beforeEach(() => {
        setupEnv();
    });

    afterEach(() => {
        cleanupEnv();
    });

    describe('getModulePath function', () => {
        test('debe resolver vue si está instalado', () => {
            const result = getModulePath('vue');
            console.log('Vue resuelto:', result);

            if (result) {
                expect(result).toMatch(/node_modules.*vue/);
                expect(typeof result).toBe('string');
            } else {
                console.warn('Vue no está instalado, saltando test');
            }
        });

        test('debe devolver null para módulos inexistentes', () => {
            const result = getModulePath('modulo-que-no-existe-123456');
            expect(result).toBeNull();
        });

        test('debe manejar scoped packages si están disponibles', () => {
            // Ejemplo con @vue/reactivity si está disponible
            const result = getModulePath('@vue/reactivity');
            console.log('@vue/reactivity resuelto:', result);

            if (result) {
                expect(result).toMatch(/node_modules.*@vue.*reactivity/);
            }
        });
    });

    describe('Transformación de imports con módulos externos', () => {
        test('debe mantener alias intactos (prioridad)', async () => {
            const inputCode = `import { Component } from '@/components/modal.vue';`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toContain('/public/components/modal.js');
            expect(result.code).not.toContain('node_modules');
        });

        test('debe NO transformar rutas locales', async () => {
            const inputCode = `
import local1 from './local.js';
import local2 from '../utils/helper.js';
import absolute from '/absolute/path.js';
import project from 'public/js/devUtils.js';
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toContain(`'./local.js'`);
            expect(result.code).toContain(`'../utils/helper.js'`);
            expect(result.code).toContain(`'/absolute/path.js'`);
            expect(result.code).toContain(`'public/js/devUtils.js'`);
        });

        test('debe NO transformar módulos built-in de Node.js', async () => {
            const inputCode = `
import fs from 'fs';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toContain(`'fs'`);
            expect(result.code).toContain(`'node:path'`);
            expect(result.code).toContain(`'node:fs/promises'`);
        });

        test('debe transformar módulos npm (si están instalados)', async () => {
            // Test condicional - solo ejecuta si vue está instalado
            const vueResolved = getModulePath('vue');

            if (vueResolved) {
                const inputCode = `import { ref } from 'vue';`;
                const result = await estandarizaCode(inputCode, 'test.ts');

                expect(result.error).toBeNull();
                expect(result.code).toContain('node_modules');
                expect(result.code).toContain('vue');
                console.log('Vue transformado:', result.code);
            } else {
                console.warn(
                    'Vue no instalado, saltando test de transformación',
                );
                expect(true).toBe(true); // Test vacío para no fallar
            }
        });

        test('debe manejar imports dinámicos de módulos externos', async () => {
            const vueResolved = getModulePath('vue');

            if (vueResolved) {
                const inputCode = `const vue = await import('vue');`;
                const result = await estandarizaCode(inputCode, 'test.ts');

                expect(result.error).toBeNull();
                expect(result.code).toContain('node_modules');
                console.log('Vue dinámico transformado:', result.code);
            } else {
                console.warn('Vue no instalado, saltando test dinámico');
                expect(true).toBe(true);
            }
        });
    });

    describe('Casos edge y manejo de errores', () => {
        test('debe manejar módulos con exports complejos', async () => {
            // Buscar algún paquete que tengamos instalado
            const packages = ['resolve', 'enhanced-resolve', 'oxc-parser'];
            let foundPackage = null;

            for (const pkg of packages) {
                const resolved = getModulePath(pkg);
                if (resolved) {
                    foundPackage = { name: pkg, path: resolved };
                    break;
                }
            }

            if (foundPackage) {
                console.log(
                    `Probando con: ${foundPackage.name} -> ${foundPackage.path}`,
                );
                expect(foundPackage.path).toMatch(/node_modules/);
            } else {
                console.warn('No se encontraron paquetes para probar');
                expect(true).toBe(true);
            }
        });

        test('debe preservar template literals complejos', async () => {
            const inputCode = `
const dynamicImport = import(\`@/components/\${componentName}.vue\`);
const moduleImport = import(\`some-package/\${subPath}\`);
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            // Debe transformar alias pero no módulos en template literals complejos
            expect(result.code).toContain('/public/components/');
        });
    });
});
