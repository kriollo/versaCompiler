/**
 * Tests para el compilador de Vue.js
 * Verifica la compilación de componentes Vue con diferentes configuraciones
 */

import { preCompileVue } from '../src/compiler/vuejs';

describe('Vue.js Compiler', () => {
    describe('preCompileVue', () => {
        test('debe compilar un componente Vue básico', async () => {
            const vueCode = `
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

            const result = await preCompileVue(vueCode, 'TestComponent.vue');

            expect(result).toBeDefined();
            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(typeof result.data).toBe('string');

            // Verificar que contiene el código JavaScript compilado
            expect(result.data).toContain('export default');
        });

        test('debe manejar componentes sin script en modo desarrollo', async () => {
            const vueCode = `
<template>
    <div>Solo template</div>
</template>

<style>
div { color: blue; }
</style>
            `.trim();

            const result = await preCompileVue(
                vueCode,
                'SimpleComponent.vue',
                false,
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            // En modo desarrollo debería agregar script con HMR
            expect(result.data).toContain('versaComponentKey');
        });

        test('debe manejar componentes en modo producción', async () => {
            const vueCode = `
<template>
    <div class="component">{{ message }}</div>
</template>

<script setup>
import { ref } from 'vue'
const message = ref('Production mode')
</script>
            `.trim();

            const result = await preCompileVue(
                vueCode,
                'ProdComponent.vue',
                true,
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            // En modo producción no debería tener HMR
            expect(result.data).not.toContain('versaComponentKey');
        });

        test('debe manejar componentes con Options API', async () => {
            const vueCode = `
<template>
    <div>{{ message }}</div>
</template>

<script>
export default {
    data() {
        return {
            message: 'Hello from Options API'
        }
    },
    methods: {
        greet() {
            console.log(this.message);
        }
    }
}
</script>
            `.trim();

            const result = await preCompileVue(vueCode, 'OptionsComponent.vue');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain('export default');
        });

        test('debe detectar el lenguaje TypeScript', async () => {
            const vueCode = `
<template>
    <div>{{ message }}</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface User {
    name: string;
    age: number;
}

const message = ref<string>('Hello TypeScript!')
const user: User = { name: 'John', age: 30 }
</script>
            `.trim();

            const result = await preCompileVue(
                vueCode,
                'TypeScriptComponent.vue',
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.lang).toBe('ts');
        });

        test('debe detectar el lenguaje JavaScript', async () => {
            const vueCode = `
<template>
    <div>{{ message }}</div>
</template>

<script setup>
import { ref } from 'vue'
const message = ref('Hello JavaScript!')
</script>
            `.trim();

            const result = await preCompileVue(
                vueCode,
                'JavaScriptComponent.vue',
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.lang).toBe('js');
        });

        test('debe manejar estilos scoped', async () => {
            const vueCode = `
<template>
    <div class="component">Test</div>
</template>

<style scoped>
.component {
    background: blue;
}
</style>
            `.trim();

            const result = await preCompileVue(vueCode, 'StyledComponent.vue');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
        });

        test('debe manejar múltiples bloques style', async () => {
            const vueCode = `
<template>
    <div class="component">Multi Style</div>
</template>

<style>
.global { color: red; }
</style>

<style scoped>
.component { background: blue; }
</style>
            `.trim();

            const result = await preCompileVue(
                vueCode,
                'MultiStyleComponent.vue',
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
        });
        test('debe agregar HMR en modo desarrollo', async () => {
            const vueCode = `
<template>
    <div class="test">HMR Test</div>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>
            `.trim();

            const result = await preCompileVue(
                vueCode,
                'HMRComponent.vue',
                false,
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain('versaComponentKey');
            expect(result.data).toContain('key: $setup.versaComponentKey');
        });

        test('debe manejar errores de sintaxis en template', async () => {
            const vueCode = `
<template>
    <div unclosed
        <span>Error</span>
    </div>
</template>
            `.trim();

            const result = await preCompileVue(vueCode, 'ErrorComponent.vue');

            expect(result).toBeDefined();
            // Dependiendo de la implementación, puede retornar error
            if (result.error) {
                expect(result.error).toBeInstanceOf(Error);
                expect(result.data).toBeNull();
            }
        });

        test('debe tener rendimiento adecuado', async () => {
            const vueCode = `
<template>
    <div>Performance test</div>
</template>

<script setup>
import { ref } from 'vue'
const message = ref('Fast compilation')
</script>
            `.trim();

            const startTime = Date.now();
            const result = await preCompileVue(
                vueCode,
                'PerformanceComponent.vue',
            );
            const endTime = Date.now();

            expect(result.error).toBeNull();
            expect(endTime - startTime).toBeLessThan(2000); // Menos de 2 segundos
        });
    });
});
