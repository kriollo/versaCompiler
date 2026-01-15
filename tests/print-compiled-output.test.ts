import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileFile } from '../src/compiler/compile';

describe('Print Compiled Output', () => {
    it('should print compiled output for production mode', async () => {
        // Configurar modo producción
        process.env.isPROD = 'true';
        process.env.PATH_DIST = 'public/js';
        process.env.VERBOSE = 'true'; // Activar verbose para ver logs
        process.env.PATH_ALIAS = JSON.stringify({ '@/*': '/src/*' }); // Configurar alias

        // Crear archivo de prueba con import de Vue
        const testFilePath = join(process.cwd(), 'temp', 'test-prod-output.js');
        const testContent = `import { createApp, ref } from 'vue';\nimport { createRouter } from 'vue-router';\nimport { createPinia } from 'pinia';\n\nconst app = createApp({});\nconsole.log('Test');`;

        await writeFile(testFilePath, testContent, 'utf-8');

        // Compilar
        const result = await compileFile(testFilePath);

        console.log('\n==============================================');
        console.log('📦 RESULTADO DE COMPILACIÓN (MODO PRODUCCIÓN)');
        console.log('==============================================');
        console.log('Success:', result.success);
        console.log('Output:', result.output);
        console.log('==============================================\n');

        if (result.success && result.output) {
            const compiledContent = await readFile(result.output, 'utf-8');

            console.log('📄 CONTENIDO COMPILADO:');
            console.log('----------------------------------------------');
            console.log(compiledContent);
            console.log('----------------------------------------------\n');

            // Analizar imports
            const importLines = compiledContent
                .split('\n')
                .filter((line: string) => line.trim().startsWith('import'));

            console.log('🔍 IMPORTS DETECTADOS:');
            importLines.forEach((line: string) => {
                console.log('  ', line);
            });
            console.log('\n');

            // Verificar si usa versiones .prod.js
            const hasProdVue =
                compiledContent.includes('vue.esm-browser.prod.js') ||
                compiledContent.includes('vue.runtime.esm-browser.prod.js');
            const hasProdRouter = compiledContent.includes(
                'vue-router.esm-browser.prod.js',
            );
            const hasProdPinia = compiledContent.includes(
                'pinia.esm-browser.prod.js',
            );

            console.log('✅ VERIFICACIÓN DE VERSIONES:');
            console.log('  Vue .prod.js:', hasProdVue ? '✓ SÍ' : '✗ NO');
            console.log(
                '  Vue Router .prod.js:',
                hasProdRouter ? '✓ SÍ' : '✗ NO',
            );
            console.log('  Pinia .prod.js:', hasProdPinia ? '✓ SÍ' : '✗ NO');
            console.log('\n');

            expect(result.success).toBe(true);
        }
    }, 30000);
});
