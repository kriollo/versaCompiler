// Los globals (describe, it, expect, vi, beforeEach, afterEach) están disponibles gracias a vitest.config.ts
import {
    preCompileVue,
    getVueHMRCacheStats,
    clearVueHMRCache,
    cleanExpiredVueHMRCache,
} from '../src/compiler/vuejs';

// Declaraciones de tipos para los globals de Vitest
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
declare const beforeEach: (fn: () => void) => void;
declare const afterEach: (fn: () => void) => void;
declare const expect: any;
declare const vi: any;

// Mocks
vi.mock('vue/compiler-sfc', () => ({
    parse: vi.fn(),
    compileScript: vi.fn(),
    compileTemplate: vi.fn(),
    compileStyle: vi.fn(),
}));

vi.mock('../src/compiler/parser', () => ({
    parser: vi.fn(),
}));

vi.mock('../src/servicios/logger', () => ({
    logger: {
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock('chalk', () => ({
    default: vi.fn(() => ({
        yellow: vi.fn(msg => msg),
    })),
}));

// Import after mocks
import * as vCompiler from 'vue/compiler-sfc';
import { parser } from '../src/compiler/parser';

const vueCompiler = vCompiler as any;

describe('Vue.js Compiler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear cache before each test
        clearVueHMRCache();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('preCompileVue', () => {
        it('debe compilar un componente Vue básico sin script', async () => {
            const vueCode = `
<template>
  <div>Hello World</div>
</template>
<style>
div { color: red; }
</style>
`;

            const mockDescriptor = {
                template: { content: '<div>Hello World</div>' },
                script: null,
                scriptSetup: null,
                styles: [{ content: 'div { color: red; }', scoped: false }],
                customBlocks: [],
            };

            vueCompiler.parse.mockReturnValue({
                descriptor: mockDescriptor,
                errors: [],
            });

            vueCompiler.compileTemplate.mockReturnValue({
                code: 'function render() { return h("div", "Hello World") }',
                errors: [],
            });

            vueCompiler.compileStyle.mockReturnValue({
                code: 'div[data-v-123] { color: red; }',
            });

            const result = await preCompileVue(
                vueCode,
                '/path/to/Component.vue',
            );

            expect(result.error).toBeNull();
            expect(result.data).toContain('export default');
            expect(result.lang).toBe('js');
        });

        it('debe manejar errores de parsing', async () => {
            const vueCode = '<template><div>Unclosed';

            vueCompiler.parse.mockReturnValue({
                descriptor: null,
                errors: [{ message: 'Parse error' }],
            });

            const result = await preCompileVue(
                vueCode,
                '/path/to/Component.vue',
            );

            expect(result.error).toBeInstanceOf(Error);
            expect(result.data).toBeNull();
        });

        it('debe compilar componente con script setup', async () => {
            const vueCode = `
<script setup lang="ts">
import { ref } from 'vue';
const message = ref('Hello');
</script>
<template>
  <div>{{ message }}</div>
</template>
`;

            const mockDescriptor = {
                template: { content: '<div>{{ message }}</div>' },
                script: null,
                scriptSetup: {
                    content:
                        "import { ref } from 'vue'; const message = ref('Hello');",
                    lang: 'ts',
                },
                styles: [],
                customBlocks: [],
            };

            vueCompiler.parse.mockReturnValue({
                descriptor: mockDescriptor,
                errors: [],
            });

            vueCompiler.compileScript.mockReturnValue({
                content: 'const message = ref("Hello");',
                bindings: { message: 'data' },
            });

            vueCompiler.compileTemplate.mockReturnValue({
                code: 'function render() { return h("div", message.value) }',
                errors: [],
            });

            parser.mockResolvedValue({
                module: { staticImports: [] },
                errors: [],
            });

            const result = await preCompileVue(
                vueCode,
                '/path/to/Component.vue',
            );

            expect(result.error).toBeNull();
            expect(result.data).toContain('export default');
            expect(result.lang).toBe('ts');
        });

        it('debe usar cache HMR en modo desarrollo', async () => {
            const vueCode = `
<template>
  <div>Hello</div>
</template>
`;

            const mockDescriptor = {
                template: { content: '<div>Hello</div>' },
                script: null,
                scriptSetup: null,
                styles: [],
                customBlocks: [],
            };

            vueCompiler.parse.mockReturnValue({
                descriptor: mockDescriptor,
                errors: [],
            });

            vueCompiler.compileTemplate.mockReturnValue({
                code: 'function render() { return h("div", "Hello") }',
                errors: [],
            });

            // First call should populate cache
            await preCompileVue(vueCode, '/path/to/Component.vue', false);

            // Check that cache has content
            const stats = getVueHMRCacheStats();
            expect(stats.size).toBeGreaterThan(0);
        });

        it('no debe inyectar HMR en modo producción', async () => {
            const vueCode = `
<template>
  <div>Hello</div>
</template>
`;

            const mockDescriptor = {
                template: { content: '<div>Hello</div>' },
                script: null,
                scriptSetup: null,
                styles: [],
                customBlocks: [],
            };

            vueCompiler.parse.mockReturnValue({
                descriptor: mockDescriptor,
                errors: [],
            });

            vueCompiler.compileTemplate.mockReturnValue({
                code: 'function render() { return h("div", "Hello") }',
                errors: [],
            });

            const result = await preCompileVue(
                vueCode,
                '/path/to/Component.vue',
                true,
            );

            expect(result.error).toBeNull();
            expect(result.data).not.toContain(':key="versaComponentKey"');
        });

        it('debe manejar estilos scoped', async () => {
            const vueCode = `
<template>
  <div>Hello</div>
</template>
<style scoped>
div { color: blue; }
</style>
`;

            const mockDescriptor = {
                template: { content: '<div>Hello</div>' },
                script: null,
                scriptSetup: null,
                styles: [{ content: 'div { color: blue; }', scoped: true }],
                customBlocks: [],
            };

            vueCompiler.parse.mockReturnValue({
                descriptor: mockDescriptor,
                errors: [],
            });

            vueCompiler.compileTemplate.mockReturnValue({
                code: 'function render() { return h("div", "Hello") }',
                errors: [],
            });

            vueCompiler.compileStyle.mockReturnValue({
                code: 'div[data-v-123] { color: blue; }',
            });

            const result = await preCompileVue(
                vueCode,
                '/path/to/Component.vue',
            );

            expect(result.error).toBeNull();
            expect(result.data).toContain('__scopeId');
        });

        it('debe devolver componente vacío para contenido vacío', async () => {
            const result = await preCompileVue('', '/path/to/Component.vue');

            expect(result.error).toBeNull();
            expect(result.data).toBe('export default {};');
            expect(result.lang).toBe('js');
        });
    });

    describe('Cache Management Functions', () => {
        it('debe devolver estadísticas correctas del cache', () => {
            const stats = getVueHMRCacheStats();

            expect(stats).toHaveProperty('size');
            expect(stats).toHaveProperty('maxSize');
            expect(stats).toHaveProperty('ttl');
            expect(typeof stats.size).toBe('number');
            expect(typeof stats.maxSize).toBe('number');
            expect(typeof stats.ttl).toBe('number');
        });

        it('debe limpiar el cache completamente', () => {
            // Agregar algo al cache primero llamando a preCompileVue en desarrollo
            const vueCode = '<template><div>Test</div></template>';
            const mockDescriptor = {
                template: { content: '<div>Test</div>' },
                script: null,
                scriptSetup: null,
                styles: [],
                customBlocks: [],
            };

            vueCompiler.parse.mockReturnValue({
                descriptor: mockDescriptor,
                errors: [],
            });

            vueCompiler.compileTemplate.mockReturnValue({
                code: 'function render() { return h("div", "Test") }',
                errors: [],
            });

            // Llamar en desarrollo para activar cache
            preCompileVue(vueCode, '/path/to/Test.vue', false);

            // Verificar que hay algo en cache
            const statsBefore = getVueHMRCacheStats();
            expect(statsBefore.size).toBeGreaterThan(0);

            // Limpiar cache
            clearVueHMRCache();

            const statsAfter = getVueHMRCacheStats();
            expect(statsAfter.size).toBe(0);
        });

        it('debe limpiar entradas expiradas del cache', () => {
            // Similar al anterior, pero probando cleanExpiredVueHMRCache
            const vueCode = '<template><div>Test</div></template>';
            const mockDescriptor = {
                template: { content: '<div>Test</div>' },
                script: null,
                scriptSetup: null,
                styles: [],
                customBlocks: [],
            };

            vueCompiler.parse.mockReturnValue({
                descriptor: mockDescriptor,
                errors: [],
            });

            vueCompiler.compileTemplate.mockReturnValue({
                code: 'function render() { return h("div", "Test") }',
                errors: [],
            });

            // Mock Date.now para controlar expiración
            const originalNow = Date.now;
            const mockNow = vi.fn();
            Date.now = mockNow;
            mockNow.mockReturnValue(0);

            // Agregar al cache
            preCompileVue(vueCode, '/path/to/Test.vue', false);

            // Avanzar tiempo más allá del TTL
            mockNow.mockReturnValue(6 * 60 * 1000); // 6 minutos

            // Limpiar expiradas
            cleanExpiredVueHMRCache();

            const stats = getVueHMRCacheStats();
            expect(stats.size).toBe(0);

            Date.now = originalNow;
        });
    });
});
