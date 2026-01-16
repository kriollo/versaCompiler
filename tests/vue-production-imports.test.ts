import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { preCompileVue } from '../src/compiler/vuejs';
import { replaceAliasImportStatic } from '../src/compiler/transforms';

describe('Vue Production Imports - Components without Script', () => {
    const testDir = join(process.cwd(), 'temp', 'vue-prod-test');
    const componentPath = join(testDir, 'lineHr.vue');

    beforeAll(async () => {
        await mkdir(testDir, { recursive: true });

        // Configurar entorno de producción
        process.env.isPROD = 'true';
        process.env.PATH_DIST = 'public/js';
        process.env.PATH_ALIAS = JSON.stringify({
            '@/*': '/src/*',
        });
    });

    afterAll(async () => {
        try {
            await rm(testDir, { recursive: true, force: true });
        } catch {
            // Ignorar errores de limpieza
        }

        // Limpiar variables de entorno
        delete process.env.isPROD;
    });

    it('should use .prod.js version for Vue imports in production mode - component without script', async () => {
        // Componente Vue solo con template (sin <script setup>)
        const vueComponent = `<template>
    <hr class="h-px my-4 bg-gray-200 border-0 dark:bg-gray-700" />
</template>`;

        await writeFile(componentPath, vueComponent, 'utf-8');

        // Compilar el componente en modo producción
        const { data, error } = await preCompileVue(
            vueComponent,
            componentPath,
            true, // isProd = true
        );

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data).not.toBeNull();

        if (!data) {
            throw new Error('Compiled data is null');
        }

        console.log('\n📦 Código compilado (antes de transforms):');
        console.log(data);

        // Aplicar transformaciones de imports (orden correcto: file, code)
        const transformedData = await replaceAliasImportStatic(
            componentPath,
            data,
        );

        console.log('\n📦 Código compilado (después de transforms):');
        console.log(transformedData);

        // Verificar que el código compilado contiene imports de Vue
        expect(transformedData).toContain('from');

        // Verificar que usa la versión de producción (.prod.js)
        const prodImportRegex =
            /from\s*['"]\/node_modules\/vue\/dist\/vue\.esm-browser\.prod\.js['"]/;
        const devImportRegex =
            /from\s*['"]\/node_modules\/vue\/dist\/vue\.esm-browser\.js['"]/;

        // El código DEBE contener imports de producción
        expect(transformedData).toMatch(prodImportRegex);

        // El código NO DEBE contener imports de desarrollo
        expect(transformedData).not.toMatch(devImportRegex);
    });

    it('should use .prod.js version for Vue imports - multiple Vue runtime imports', async () => {
        const vueComponent = `<template>
    <div>
        <h1>{{ title }}</h1>
        <button @click="handleClick">Click me</button>
    </div>
</template>

<script setup>
const title = 'Test Component';
const handleClick = () => {
    console.log('Clicked!');
};
</script>`;

        await writeFile(componentPath, vueComponent, 'utf-8');

        const { data, error } = await preCompileVue(
            vueComponent,
            componentPath,
            true,
        );

        expect(error).toBeNull();
        expect(data).toBeDefined();

        if (!data) {
            throw new Error('Compiled data is null');
        }

        const transformedData = await replaceAliasImportStatic(
            componentPath,
            data,
        );

        console.log('\n📦 Component with script setup (transformed):');
        console.log(transformedData);

        // Verificar versión de producción
        expect(transformedData).toMatch(/vue\.esm-browser\.prod\.js/);

        // NO debe contener versión de desarrollo
        expect(transformedData).not.toMatch(
            /vue\.esm-browser\.js['"](?!\.prod)/,
        );
    });

    it('should handle components with only template in development mode', async () => {
        // Cambiar a modo desarrollo
        process.env.isPROD = 'false';

        const vueComponent = `<template>
    <hr class="simple-line" />
</template>`;

        await writeFile(componentPath, vueComponent, 'utf-8');

        const { data, error } = await preCompileVue(
            vueComponent,
            componentPath,
            false, // isProd = false
        );

        expect(error).toBeNull();
        expect(data).toBeDefined();

        if (!data) {
            throw new Error('Compiled data is null');
        }

        const transformedData = await replaceAliasImportStatic(
            componentPath,
            data,
        );

        console.log('\n📦 Development mode (transformed):');
        console.log(transformedData);

        // En desarrollo puede usar cualquier versión (dev o prod)
        // Solo verificamos que tenga imports de Vue
        expect(transformedData).toMatch(/from.*vue/i);
    });

    it('should preserve production mode through entire compilation pipeline', async () => {
        const vueComponent = `<template>
    <div class="container">
        <slot></slot>
    </div>
</template>`;

        await writeFile(componentPath, vueComponent, 'utf-8');

        const { data: compiled1 } = await preCompileVue(
            vueComponent,
            componentPath,
            true,
        );

        expect(compiled1).toBeDefined();

        if (!compiled1) {
            throw new Error('First compilation failed');
        }

        const transformed1 = await replaceAliasImportStatic(
            componentPath,
            compiled1,
        );

        // Segunda compilación - verificar consistencia
        const { data: compiled2 } = await preCompileVue(
            vueComponent,
            componentPath,
            true,
        );

        expect(compiled2).toBeDefined();

        if (!compiled2) {
            throw new Error('Second compilation failed');
        }

        const transformed2 = await replaceAliasImportStatic(
            componentPath,
            compiled2,
        );

        // Ambas compilaciones deben producir el mismo resultado
        expect(transformed1).toBe(transformed2);

        // Ambas deben usar .prod.js
        expect(transformed1).toMatch(/vue\.esm-browser\.prod\.js/);
        expect(transformed2).toMatch(/vue\.esm-browser\.prod\.js/);
    });
});
