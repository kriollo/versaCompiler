/**
 * Test específico para validar que solo se transforma el PATH de imports externos
 * y no se modifica el VALOR/NOMBRE del import
 */

import { estandarizaCode } from '../src/compiler/transforms';

describe('Transformación de imports externos - PATH vs VALOR', () => {
    beforeEach(() => {
        process.env.PATH_ALIAS = JSON.stringify({ '@/*': '/src/*' });
        process.env.PATH_DIST = 'public';
    });

    afterEach(() => {
        delete process.env.PATH_ALIAS;
        delete process.env.PATH_DIST;
    });

    describe('Validar que solo se reemplaza el PATH, no el VALOR', () => {
        test('import resolve - debe mantener nombre del import intacto', async () => {
            const inputCode = `import resolve from 'resolve';`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();

            // El nombre del import debe permanecer igual
            expect(result.code).toContain('import resolve from');

            // El path debe ser transformado a node_modules
            expect(result.code).toContain('node_modules/resolve/');

            // No debe contener la cadena original 'resolve' como path
            expect(result.code).not.toContain(`from 'resolve'`);

            console.log('Resultado resolve:', result.code);
        });

        test('import lodash - debe mantener nombre del import intacto', async () => {
            const inputCode = `import lodash from 'lodash';`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();

            // El nombre del import debe permanecer igual
            expect(result.code).toContain('import lodash from');

            // El path debe ser transformado a node_modules (si lodash está instalado)
            // Si no está instalado, debe mantener la forma original
            if (result.code.includes('node_modules/lodash/')) {
                expect(result.code).toContain('node_modules/lodash/');
                expect(result.code).not.toContain(`from 'lodash'`);
            } else {
                // Si lodash no está instalado, el import se mantiene sin cambios
                expect(result.code).toContain(`from 'lodash'`);
            }

            console.log('Resultado lodash:', result.code);
        });

        test('import con named exports - debe mantener nombres intactos', async () => {
            const inputCode = `import { ref, reactive } from 'vue';`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();

            // Los nombres de los imports deben permanecer iguales
            expect(result.code).toContain('import { ref, reactive } from');

            // El path debe ser transformado a node_modules (si vue está instalado)
            if (result.code.includes('node_modules')) {
                expect(result.code).toContain('node_modules/vue/');
                // No debe contener la cadena original 'vue' como path
                expect(result.code).not.toContain(`from 'vue'`);
            }

            console.log('Resultado vue named exports:', result.code);
        });

        test('import con alias - debe mantener alias intacto', async () => {
            const inputCode = `import { createApp as app } from 'vue';`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();

            // El alias debe permanecer igual
            expect(result.code).toContain('import { createApp as app } from');

            console.log('Resultado vue con alias:', result.code);
        });
        test('import namespace - debe mantener nombre intacto', async () => {
            const inputCode = `import * as resolve from 'resolve';`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();

            // El nombre del namespace debe permanecer igual
            expect(result.code).toContain('import * as resolve from');

            // El path debe ser transformado
            if (result.code.includes('node_modules')) {
                expect(result.code).toContain('node_modules/resolve/');
                expect(result.code).not.toContain(`from 'resolve'`);
            }

            console.log('Resultado resolve namespace:', result.code);
        });
        test('múltiples imports - todos deben mantener nombres intactos', async () => {
            const inputCode = `
import resolve from 'resolve';
import enhanced from 'enhanced-resolve';
import { ref } from 'vue';
import * as fs from 'fs-extra';
import { resolve as pathResolve } from 'path';
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();

            // Todos los nombres de imports deben permanecer iguales
            expect(result.code).toContain('import resolve from');
            expect(result.code).toContain('import enhanced from');
            expect(result.code).toContain('import { ref } from');
            expect(result.code).toContain('import * as fs from');
            expect(result.code).toContain(
                'import { resolve as pathResolve } from',
            );

            console.log('Resultado múltiples imports:', result.code);
        });
        test('imports dinámicos - debe mantener variable intacta', async () => {
            const inputCode = `
const resolve = await import('resolve');
const enhanced = import('enhanced-resolve');
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();

            // Los nombres de las variables deben permanecer iguales
            expect(result.code).toContain('const resolve = await import(');
            expect(result.code).toContain('const enhanced = import(');

            console.log('Resultado imports dinámicos:', result.code);
        });
    });

    describe('Casos edge - nombres que podrían confundirse', () => {
        test('variable con nombre de módulo - no debe ser transformada', async () => {
            const inputCode = `
import utils from 'utils-package';
const resolve = 'some string with resolve word';
const enhanced = { prop: 'enhanced value' };
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();

            // Las variables internas no deben ser modificadas
            expect(result.code).toContain(
                `const resolve = 'some string with resolve word'`,
            );
            expect(result.code).toContain(
                `const enhanced = { prop: 'enhanced value' }`,
            );

            console.log('Resultado variables internas:', result.code);
        });
        test('comentarios con nombres de módulos - no deben ser transformados', async () => {
            const inputCode = `
// Usamos resolve para rutas
/* enhanced-resolve para módulos */
import utils from 'some-package';
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();

            // Los comentarios deben permanecer iguales
            expect(result.code).toContain('// Usamos resolve para rutas');
            expect(result.code).toContain(
                '/* enhanced-resolve para módulos */',
            );

            console.log('Resultado con comentarios:', result.code);
        });
        test('strings con nombres de módulos - no deben ser transformados', async () => {
            const inputCode = `
import utils from 'some-package';
const message = "Instalando resolve y enhanced-resolve";
const template = \`El paquete resolve es útil\`;
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();

            // Los strings deben permanecer iguales
            expect(result.code).toContain(
                `const message = "Instalando resolve y enhanced-resolve"`,
            );
            expect(result.code).toContain(
                `const template = \`El paquete resolve es útil\``,
            );

            console.log('Resultado con strings:', result.code);
        });
    });
});
