import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { estandarizaCode } from '../src/compiler/transforms';

describe('Debug Transform Without Minify', () => {
    it('should transform Vue import to .prod.js in production mode', async () => {
        // Configurar modo producción
        process.env.isPROD = 'true';
        process.env.PATH_DIST = 'public/js';
        process.env.VERBOSE = 'false'; // Desactivar verbose para tests
        process.env.PATH_ALIAS = JSON.stringify({ '@/*': '/src/*' });

        const testFilePath = join(process.cwd(), 'temp', 'test-transform.js');
        const testContent = `import { createApp, ref } from 'vue';\nimport { createRouter } from 'vue-router';\nimport { createPinia } from 'pinia';\n\nconst app = createApp({});\nconsole.log('Test');`;

        await writeFile(testFilePath, testContent, 'utf-8');

        console.log('\n========================================');
        console.log('📝 CÓDIGO ORIGINAL:');
        console.log('========================================');
        console.log(testContent);
        console.log('========================================\n');

        // Transformar SIN minificar
        const result = await estandarizaCode(testContent, testFilePath);

        console.log('\n========================================');
        console.log('🔄 CÓDIGO TRANSFORMADO (SIN MINIFICAR):');
        console.log('========================================');
        console.log(result.code);
        console.log('========================================\n');

        // Analizar imports transformados
        const importLines = result.code
            .split('\n')
            .filter((line: string) => line.trim().startsWith('import'));

        console.log('🔍 IMPORTS TRANSFORMADOS:');
        importLines.forEach((line: string) => {
            console.log('  ', line);
        });
        console.log('\n');

        // Verificar si usa versiones .prod.js
        const hasProdVue =
            result.code.includes('vue.esm-browser.prod.js') ||
            result.code.includes('vue.runtime.esm-browser.prod.js');
        const hasProdRouter = result.code.includes(
            'vue-router.esm-browser.prod.js',
        );
        const hasAnyProd = result.code.includes('.prod.js');

        console.log('✅ VERIFICACIÓN:');
        console.log('  Vue contiene .prod.js:', hasProdVue);
        console.log('  Vue Router contiene .prod.js:', hasProdRouter);
        console.log('  Algún import contiene .prod.js:', hasAnyProd);
        console.log('\n');

        expect(result.error).toBeFalsy(); // null o undefined son válidos
        expect(hasAnyProd).toBe(true);
    }, 30000);
});
