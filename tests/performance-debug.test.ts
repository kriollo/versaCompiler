/**
 * Debug version of performance tests to identify issues
 */

import fs from 'fs/promises';
import { env } from 'node:process';
import path from 'path';
import { compileFile } from '../src/compiler/compile';
import { preCompileTS } from '../src/compiler/typescript-manager';
import { preCompileVue } from '../src/compiler/vuejs';

const TEMP_DIR = path.join(process.cwd(), 'tests', 'temp-performance-debug');

describe('VersaCompiler Performance Debug Tests', () => {
    let originalEnv: any;

    beforeAll(async () => {
        // Guardar configuración original
        originalEnv = { ...env };

        // Configurar ambiente de pruebas
        env.PATH_SOURCE = path.join(TEMP_DIR, 'src');
        env.PATH_DIST = path.join(TEMP_DIR, 'dist');
        env.PATH_PROY = TEMP_DIR;
        env.VERBOSE = 'false';
        env.ENABLE_LINTER = 'false';
        env.clean = 'false';

        // Crear directorios temporales
        await fs.mkdir(TEMP_DIR, { recursive: true });
        await fs.mkdir(env.PATH_SOURCE!, { recursive: true });
        await fs.mkdir(env.PATH_DIST!, { recursive: true });
    });

    afterAll(async () => {
        // Restaurar configuración original
        Object.assign(env, originalEnv);

        // Limpiar archivos temporales
        try {
            await fs.rm(TEMP_DIR, { recursive: true, force: true });
        } catch (error) {
            console.warn('No se pudo limpiar directorio temporal:', error);
        }
    });

    beforeEach(async () => {
        // Limpiar directorios antes de cada test
        try {
            if (env.PATH_SOURCE) {
                await fs.rm(env.PATH_SOURCE, { recursive: true, force: true });
                await fs.mkdir(env.PATH_SOURCE, { recursive: true });
            }
            if (env.PATH_DIST) {
                await fs.rm(env.PATH_DIST, { recursive: true, force: true });
                await fs.mkdir(env.PATH_DIST, { recursive: true });
            }
        } catch {
            // Ignorar errores de limpieza
        }
    });

    test('Simple JavaScript compilation', async () => {
        const content = `
// Simple JavaScript file
const message = 'Hello World';
console.log(message);
export { message };
        `;

        const filePath = path.join(env.PATH_SOURCE!, 'simple.js');
        await fs.writeFile(filePath, content);

        console.log('🔍 Testing JavaScript compilation...');
        const startTime = Date.now();

        const result = await compileFile(filePath);

        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`⏱️ JavaScript compilation took: ${duration}ms`);
        console.log(
            `📄 Result:`,
            result.success
                ? `Success - ${result.output}`
                : `Error - ${result.error}`,
        );

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
    }, 30000);

    test('Simple TypeScript compilation', async () => {
        const content = `
// Simple TypeScript file
interface User {
    name: string;
    age: number;
}

const user: User = { name: 'Test', age: 25 };
console.log(user);
export { User, user };
        `;

        const filePath = path.join(env.PATH_SOURCE!, 'simple.ts');
        await fs.writeFile(filePath, content);

        env.typeCheck = 'false';

        console.log('🔍 Testing TypeScript compilation...');
        const startTime = Date.now();

        const result = await compileFile(filePath);

        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`⏱️ TypeScript compilation took: ${duration}ms`);
        console.log(
            `📄 Result:`,
            result.success
                ? `Success - ${result.output}`
                : `Error - ${result.error}`,
        );

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
    }, 30000);

    test('Simple Vue compilation', async () => {
        const content = `
<template>
    <div>
        <h1>{{ title }}</h1>
        <p>{{ message }}</p>
    </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('Test Component')
const message = ref('Hello Vue!')
</script>

<style scoped>
div {
    padding: 20px;
}
</style>
        `;

        const filePath = path.join(env.PATH_SOURCE!, 'Simple.vue');
        await fs.writeFile(filePath, content);

        console.log('🔍 Testing Vue compilation...');
        const startTime = Date.now();

        const result = await compileFile(filePath);

        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`⏱️ Vue compilation took: ${duration}ms`);
        console.log(
            `📄 Result:`,
            result.success
                ? `Success - ${result.output}`
                : `Error - ${result.error}`,
        );

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
    }, 30000);

    test('Direct preCompileVue function', async () => {
        const content = `
<template>
    <div>{{ message }}</div>
</template>

<script setup>
const message = 'Hello Vue Direct!'
</script>

<style scoped>
div { color: blue; }
</style>
        `;

        console.log('🔍 Testing preCompileVue direct function...');
        const startTime = Date.now();

        const result = await preCompileVue(content, 'test.vue');

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`⏱️ preCompileVue took: ${duration}ms`);
        console.log(
            `📄 Result:`,
            result.error
                ? result.error.message
                : `Success, length: ${result.data?.length || 'N/A'}`,
        );

        expect(result).toBeDefined();
        expect(result.error).toBeNull();
    }, 30000);

    test('Direct preCompileTS function', async () => {
        const content = `
interface TestInterface {
    value: string;
}

const test: TestInterface = { value: 'Hello TypeScript Direct!' };
console.log(test);
        `;

        console.log('🔍 Testing preCompileTS direct function...');
        const startTime = Date.now();

        const result = await preCompileTS(content, 'test.ts');

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`⏱️ preCompileTS took: ${duration}ms`);
        console.log(
            `📄 Result:`,
            result.error
                ? result.error.message
                : `Success, length: ${result.data?.length || 'N/A'}`,
        );

        expect(result).toBeDefined();
        expect(result.error).toBeNull();
    }, 30000);
});
