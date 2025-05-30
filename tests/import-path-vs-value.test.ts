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
        test('import chalk - debe mantener nombre del import intacto', async () => {
            const inputCode = `import chalk from 'chalk';`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();

            // El nombre del import debe permanecer igual
            expect(result.code).toContain('import chalk from');

            // El path debe ser transformado a node_modules
            expect(result.code).toContain('node_modules/chalk/');

            // No debe contener la cadena original 'chalk' como path
            expect(result.code).not.toContain(`from 'chalk'`);

            console.log('Resultado chalk:', result.code);
        });

        test('import yargs - debe mantener nombre del import intacto', async () => {
            const inputCode = `import yargs from 'yargs';`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();

            // El nombre del import debe permanecer igual
            expect(result.code).toContain('import yargs from');

            // El path debe ser transformado a node_modules
            expect(result.code).toContain('node_modules/yargs/');

            // No debe contener la cadena original 'yargs' como path
            expect(result.code).not.toContain(`from 'yargs'`);

            console.log('Resultado yargs:', result.code);
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
            const inputCode = `import * as yargs from 'yargs';`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();

            // El nombre del namespace debe permanecer igual
            expect(result.code).toContain('import * as yargs from');

            // El path debe ser transformado
            if (result.code.includes('node_modules')) {
                expect(result.code).toContain('node_modules/yargs/');
                expect(result.code).not.toContain(`from 'yargs'`);
            }

            console.log('Resultado yargs namespace:', result.code);
        });

        test('múltiples imports - todos deben mantener nombres intactos', async () => {
            const inputCode = `
import chalk from 'chalk';
import yargs from 'yargs';
import { ref } from 'vue';
import * as fs from 'fs-extra';
import { resolve } from 'path';
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();

            // Todos los nombres de imports deben permanecer iguales
            expect(result.code).toContain('import chalk from');
            expect(result.code).toContain('import yargs from');
            expect(result.code).toContain('import { ref } from');
            expect(result.code).toContain('import * as fs from');
            expect(result.code).toContain('import { resolve } from');

            console.log('Resultado múltiples imports:', result.code);
        });

        test('imports dinámicos - debe mantener variable intacta', async () => {
            const inputCode = `
const chalk = await import('chalk');
const yargs = import('yargs');
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();

            // Los nombres de las variables deben permanecer iguales
            expect(result.code).toContain('const chalk = await import(');
            expect(result.code).toContain('const yargs = import(');

            console.log('Resultado imports dinámicos:', result.code);
        });
    });

    describe('Casos edge - nombres que podrían confundirse', () => {
        test('variable con nombre de módulo - no debe ser transformada', async () => {
            const inputCode = `
import utils from 'utils-package';
const chalk = 'some string with chalk word';
const yargs = { prop: 'yargs value' };
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();

            // Las variables internas no deben ser modificadas
            expect(result.code).toContain(
                `const chalk = 'some string with chalk word'`,
            );
            expect(result.code).toContain(
                `const yargs = { prop: 'yargs value' }`,
            );

            console.log('Resultado variables internas:', result.code);
        });

        test('comentarios con nombres de módulos - no deben ser transformados', async () => {
            const inputCode = `
// Usamos chalk para colores
/* yargs para argumentos */
import utils from 'some-package';
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();

            // Los comentarios deben permanecer iguales
            expect(result.code).toContain('// Usamos chalk para colores');
            expect(result.code).toContain('/* yargs para argumentos */');

            console.log('Resultado con comentarios:', result.code);
        });

        test('strings con nombres de módulos - no deben ser transformados', async () => {
            const inputCode = `
import utils from 'some-package';
const message = "Instalando chalk y yargs";
const template = \`El paquete chalk es útil\`;
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();

            // Los strings deben permanecer iguales
            expect(result.code).toContain(
                `const message = "Instalando chalk y yargs"`,
            );
            expect(result.code).toContain(
                `const template = \`El paquete chalk es útil\``,
            );

            console.log('Resultado con strings:', result.code);
        });
    });
});
