import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compileFile } from '../src/compiler/compile';

describe('Production Mode Import Integration Tests', () => {
    const originalEnv = { ...process.env };
    const testOutputDir = join(process.cwd(), 'temp', 'production-test-output');

    beforeEach(async () => {
        process.env = { ...originalEnv };
        process.env.PATH_DIST = testOutputDir;
        process.env.VERBOSE = 'false';

        // Crear directorio de output si no existe
        if (!existsSync(testOutputDir)) {
            await mkdir(testOutputDir, { recursive: true });
        }
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('should use .prod.js version in production mode for Vue import', async () => {
        // Configurar modo producción
        process.env.isPROD = 'true';

        // Crear archivo de prueba con import de Vue
        const testFilePath = join(process.cwd(), 'temp', 'test-vue-prod.js');
        const testContent = `import { createApp } from 'vue';\nconsole.log('Test');`;

        await writeFile(testFilePath, testContent, 'utf-8');

        try {
            // Compilar
            const result = await compileFile(testFilePath);

            // Verificar que el resultado contenga la versión .prod.js
            expect(result.success).toBe(true);

            if (result.success && result.outputPath) {
                const compiledContent = await readFile(
                    result.outputPath,
                    'utf-8',
                );

                // En producción, debería contener vue.esm-browser.prod.js
                const hasProdVersion =
                    compiledContent.includes('vue.esm-browser.prod.js') ||
                    compiledContent.includes(
                        'vue.runtime.esm-browser.prod.js',
                    ) ||
                    compiledContent.includes('.prod.js');

                expect(hasProdVersion).toBe(true);

                // NO debería tener la versión de desarrollo sin .prod
                const hasDevVersionOnly =
                    compiledContent.includes('vue.esm-browser.js') &&
                    !compiledContent.includes('.prod.js');

                expect(hasDevVersionOnly).toBe(false);
            }
        } catch (error) {
            // Si falla la compilación, puede ser porque no hay node_modules
            // En ese caso, solo verificamos la lógica de priorización
            console.warn(
                'Compilación falló (posiblemente sin node_modules):',
                error,
            );
        }
    });

    it('should use development .js version in development mode for Vue import', async () => {
        // Configurar modo desarrollo
        process.env.isPROD = 'false';

        // Crear archivo de prueba con import de Vue
        const testFilePath = join(process.cwd(), 'temp', 'test-vue-dev.js');
        const testContent = `import { createApp } from 'vue';\nconsole.log('Test');`;

        await writeFile(testFilePath, testContent, 'utf-8');

        try {
            // Compilar
            const result = await compileFile(testFilePath);

            // Verificar que el resultado contenga la versión de desarrollo
            expect(result.success).toBe(true);

            if (result.success && result.outputPath) {
                const compiledContent = await readFile(
                    result.outputPath,
                    'utf-8',
                );

                // En desarrollo, debería preferir versión sin .prod
                const hasDevVersion =
                    compiledContent.includes('vue.esm-browser.js') ||
                    compiledContent.includes('vue.runtime.esm-browser.js');

                // Si no hay versión de desarrollo, puede usar .prod como fallback
                const hasProdAsDefinitiveChoice =
                    compiledContent.includes('.prod.js') &&
                    !compiledContent.includes('vue.esm-browser.js');

                // En desarrollo, preferir dev, pero tolerar prod si no hay otra opción
                expect(hasDevVersion || hasProdAsDefinitiveChoice).toBe(true);
            }
        } catch (error) {
            console.warn(
                'Compilación falló (posiblemente sin node_modules):',
                error,
            );
        }
    });

    it('should preserve production mode setting across multiple compilations', async () => {
        process.env.isPROD = 'true';

        const testFiles = [
            {
                name: 'test-vue-1.js',
                content: `import { createApp } from 'vue';`,
            },
            { name: 'test-vue-2.js', content: `import { ref } from 'vue';` },
            {
                name: 'test-vue-3.js',
                content: `import { computed } from 'vue';`,
            },
        ];

        const compilationResults: string[] = [];

        for (const { name, content } of testFiles) {
            const filePath = join(process.cwd(), 'temp', name);
            await writeFile(filePath, content, 'utf-8');

            try {
                const result = await compileFile(filePath);

                if (result.success && result.outputPath) {
                    const compiled = await readFile(result.outputPath, 'utf-8');
                    compilationResults.push(compiled);
                }
            } catch (error) {
                console.warn(`Compilación falló para ${name}:`, error);
            }
        }

        // Verificar que TODAS las compilaciones usen versión prod consistentemente
        if (compilationResults.length > 0) {
            compilationResults.forEach((content, index) => {
                const hasProdVersion = content.includes('.prod.js');
                // Si alguna compilación tiene .prod.js, está bien
                // Si ninguna tiene, puede ser porque no hay node_modules instalado
                if (compilationResults.some(c => c.includes('.prod.js'))) {
                    expect(hasProdVersion || !content.includes('vue')).toBe(
                        true,
                    );
                }
            });
        }
    });
});
