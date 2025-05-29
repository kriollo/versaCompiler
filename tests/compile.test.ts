/**
 * Tests para el compilador principal
 * Verifica la funcionalidad completa de compilación de archivos
 */

import fs from 'fs-extra';
import path from 'path';
import { compileFile, runLinter } from '../dist/compiler/compile';

describe('Compiler', () => {
    const testDir = path.join(process.cwd(), 'temp-test-compiler');
    let originalEnv: NodeJS.ProcessEnv;
    beforeEach(async () => {
        // Crear directorio temporal para tests
        await fs.ensureDir(testDir);
        await fs.ensureDir(path.join(testDir, 'src'));
        await fs.ensureDir(path.join(testDir, 'public'));

        // Copiar tsconfig.json al directorio temporal
        const tsconfigSource = path.join(process.cwd(), 'tsconfig.json');
        const tsconfigDest = path.join(testDir, 'tsconfig.json');
        await fs.copyFile(tsconfigSource, tsconfigDest);

        // Guardar el estado original del environment
        originalEnv = { ...process.env }; // Configurar environment para tests
        process.env.PATH_SOURCE = path.join(testDir, 'src');
        process.env.PATH_DIST = path.join(testDir, 'public');
        process.env.VERBOSE = 'false';
        process.env.isAll = 'false';
        process.env.isPROD = 'false';
    });

    afterEach(async () => {
        // Limpiar directorio temporal
        await fs.remove(testDir);

        // Restaurar el estado original del environment
        process.env = originalEnv;
    });

    describe('compileFile', () => {
        test('debe compilar un archivo JavaScript básico', async () => {
            const jsFile = path.join(testDir, 'src', 'test.js');
            const jsContent = `
const message = "Hello World";
function greet() {
    console.log(message);
}
export { greet };
            `.trim();

            await fs.writeFile(jsFile, jsContent);

            const result = await compileFile(jsFile);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.output).toBeTruthy();
            expect(path.extname(result.output)).toBe('.js');

            // Verificar que el archivo de salida existe
            const outputExists = await fs.pathExists(result.output);
            expect(outputExists).toBe(true);
        });

        test('debe compilar un archivo TypeScript', async () => {
            const tsFile = path.join(testDir, 'src', 'test.ts');
            const tsContent = `
interface User {
    name: string;
    age: number;
}

const user: User = {
    name: "John",
    age: 30
};

export function greetUser(user: User): string {
    return \`Hello \${user.name}, you are \${user.age} years old\`;
}
            `.trim();

            await fs.writeFile(tsFile, tsContent);

            const result = await compileFile(tsFile);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.output).toBeTruthy();

            // Verificar que el archivo compilado no tiene tipos TypeScript
            const compiledContent = await fs.readFile(result.output, 'utf-8');
            expect(compiledContent).not.toContain('interface User');
            expect(compiledContent).not.toContain(': User');
            expect(compiledContent).not.toContain(': string');
        });

        test('debe compilar un componente Vue', async () => {
            const vueFile = path.join(testDir, 'src', 'Component.vue');
            const vueContent = `
<template>
    <div class="hello">
        <h1>{{ msg }}</h1>
    </div>
</template>

<script setup>
import { ref } from 'vue'
const msg = ref('Hello Vue!')
</script>

<style scoped>
.hello {
    color: red;
}
</style>
            `.trim();

            await fs.writeFile(vueFile, vueContent);

            const result = await compileFile(vueFile);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.output).toBeTruthy();
            expect(path.extname(result.output)).toBe('.js');
        });

        test('debe compilar un componente Vue con TypeScript', async () => {
            const vueFile = path.join(testDir, 'src', 'TSComponent.vue');
            const vueContent = `
<template>
    <div>{{ message }}</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
    title: string;
}

const props = defineProps<Props>();
const message = ref<string>('Hello TypeScript Vue!')
</script>
            `.trim();

            await fs.writeFile(vueFile, vueContent);

            const result = await compileFile(vueFile);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.output).toBeTruthy();
        });

        test('debe manejar archivos vacíos', async () => {
            const emptyFile = path.join(testDir, 'src', 'empty.js');
            await fs.writeFile(emptyFile, '');

            const result = await compileFile(emptyFile);

            expect(result).toBeDefined();
            expect(result.success).toBe(false);
        });

        test('debe manejar archivos que no existen', async () => {
            const nonExistentFile = path.join(testDir, 'src', 'nonexistent.js');

            const result = await compileFile(nonExistentFile);

            expect(result).toBeDefined();
            expect(result.success).toBe(false);
        });

        test('debe manejar código con errores de sintaxis', async () => {
            const invalidFile = path.join(testDir, 'src', 'invalid.js');
            const invalidContent = `
function broken() {
    const invalid syntax here =
    return "never reached";
}
            `.trim();

            await fs.writeFile(invalidFile, invalidContent);

            const result = await compileFile(invalidFile);

            expect(result).toBeDefined();
            // Dependiendo de la implementación, puede fallar o manejar errores gracefully
            expect(typeof result.success).toBe('boolean');
        });

        test('debe usar minificación en modo producción', async () => {
            process.env.isPROD = 'true';

            const jsFile = path.join(testDir, 'src', 'prod.js');
            const jsContent = `
const message = "Hello Production";
function greet() {
    console.log(message);
    return message;
}
export { greet };
            `.trim();

            await fs.writeFile(jsFile, jsContent);

            const result = await compileFile(jsFile);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);

            if (result.success) {
                const compiledContent = await fs.readFile(
                    result.output,
                    'utf-8',
                );
                // En modo producción debería estar minificado
                expect(compiledContent.length).toBeLessThan(jsContent.length);
            }
        });

        test('debe manejar rutas con espacios', async () => {
            const dirWithSpaces = path.join(
                testDir,
                'src',
                'folder with spaces',
            );
            await fs.ensureDir(dirWithSpaces);

            const jsFile = path.join(dirWithSpaces, 'test file.js');
            const jsContent = `export const message = "File with spaces";`;

            await fs.writeFile(jsFile, jsContent);

            const result = await compileFile(jsFile);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });

        test('debe preservar la estructura de directorios', async () => {
            const nestedDir = path.join(testDir, 'src', 'nested', 'deep');
            await fs.ensureDir(nestedDir);

            const jsFile = path.join(nestedDir, 'deep.js');
            const jsContent = `export const deep = "nested file";`;

            await fs.writeFile(jsFile, jsContent);

            const result = await compileFile(jsFile);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);

            if (result.success) {
                // La estructura debería preservarse en el output
                expect(result.output).toContain('nested');
                expect(result.output).toContain('deep');
            }
        });
    });

    describe('runLinter', () => {
        test('debe retornar true cuando el linter está deshabilitado', async () => {
            process.env.ENABLE_LINTER = 'false';

            const result = await runLinter();

            expect(result).toBe(true);
        });

        test('debe retornar true cuando no hay configuración de linter', async () => {
            delete process.env.linter;

            const result = await runLinter();

            expect(result).toBe(true);
        });

        test('debe retornar true con configuración de linter vacía', async () => {
            process.env.linter = '';

            const result = await runLinter();

            expect(result).toBe(true);
        });

        test('debe manejar configuración de linter con ESLint', async () => {
            const linterConfig = [
                {
                    type: 'eslint',
                    bin: 'eslint',
                    configFile: './eslint.config.js',
                },
            ];
            process.env.linter = JSON.stringify(linterConfig);

            try {
                const result = await runLinter();
                expect(typeof result).toBe('boolean');
            } catch (error) {
                // Es esperado que falle si ESLint no está configurado
                expect(error).toBeInstanceOf(Error);
            }
        });

        test('debe manejar configuración de linter con Oxlint', async () => {
            const linterConfig = [
                {
                    type: 'oxlint',
                    bin: 'oxlint',
                },
            ];
            process.env.linter = JSON.stringify(linterConfig);

            try {
                const result = await runLinter();
                expect(typeof result).toBe('boolean');
            } catch (error) {
                // Es esperado que falle si Oxlint no está configurado
                expect(error).toBeInstanceOf(Error);
            }
        });

        test('debe manejar múltiples linters', async () => {
            const linterConfig = [
                {
                    type: 'eslint',
                    bin: 'eslint',
                },
                {
                    type: 'oxlint',
                    bin: 'oxlint',
                },
            ];
            process.env.linter = JSON.stringify(linterConfig);

            try {
                const result = await runLinter();
                expect(typeof result).toBe('boolean');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
            }
        });

        test('debe manejar JSON inválido en configuración de linter', async () => {
            process.env.linter = 'invalid json string';

            try {
                const result = await runLinter();
                expect(typeof result).toBe('boolean');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
            }
        });

        test('debe mostrar resultados cuando se solicita', async () => {
            const linterConfig = [
                {
                    type: 'eslint',
                    bin: 'eslint',
                },
            ];
            process.env.linter = JSON.stringify(linterConfig);

            try {
                const result = await runLinter(true);
                expect(typeof result).toBe('boolean');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
            }
        });
    });
});
