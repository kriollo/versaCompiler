/**
 * Tests para el sistema mejorado de tipado Vue
 * Verifica que los tipos se validen correctamente sin descartar errores legítimos
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { validateVueTypes } from '../src/compiler/typescript-manager';
import {
    autoSetupVueTypes,
    hasVueTypesSetup,
    setupVueTypes,
} from '../src/utils/vue-types-setup';

describe('Sistema de Tipado Vue Mejorado', () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vue-types-test-'));
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true });
        }
    });

    describe('Validación de Tipos Vue', () => {
        test('Debe validar correctamente componente Vue básico', () => {
            const vueContent = `<template>
  <div>{{ message }}</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const message = ref<string>('Hello Vue!')
</script>`;

            const result = validateVueTypes(vueContent, 'TestComponent.vue');

            expect(result).toBeDefined();
            expect(result.hasErrors).toBe(false);
            expect(result.diagnostics.length).toBe(0);
        });

        test('Debe detectar errores de tipos legítimos', () => {
            const vueContent = `<template>
  <div>{{ message }}</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const message = ref<string>('Hello')
const count: number = 'not a number' // Error intencional
</script>`;

            const result = validateVueTypes(vueContent, 'ErrorComponent.vue');
            expect(result).toBeDefined();
            // Debe detectar el error de asignación de tipo
            expect(result.hasErrors).toBe(true);
            expect(result.diagnostics.length).toBeGreaterThan(0);
            if (result.diagnostics.length > 0 && result.diagnostics[0]) {
                const errorMessage = result.diagnostics[0].messageText;
                expect(errorMessage).toContain('string');
                expect(errorMessage).toContain('number');
            }
        });

        test('No debe reportar errores para funciones Vue estándar', () => {
            const vueContent = `<template>
  <div @click="handleClick">{{ message }}</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

const message = ref<string>('Hello')
const uppercaseMessage = computed(() => message.value.toUpperCase())

const handleClick = () => {
    message.value = 'Clicked!'
}

onMounted(() => {
    console.log('Component mounted')
})

watch(message, (newValue) => {
    console.log('Message changed:', newValue)
})
</script>`;

            const result = validateVueTypes(
                vueContent,
                'StandardComponent.vue',
            );

            expect(result).toBeDefined();
            expect(result.hasErrors).toBe(false);
        });

        test('Debe manejar defineProps correctamente', () => {
            const vueContent = `<template>
  <div>{{ props.title }} - {{ props.count }}</div>
</template>

<script setup lang="ts">
interface Props {
    title: string
    count: number
    optional?: boolean
}

const props = defineProps<Props>()
</script>`;

            const result = validateVueTypes(vueContent, 'PropsComponent.vue');

            expect(result).toBeDefined();
            expect(result.hasErrors).toBe(false);
        });

        test('Debe manejar defineEmits correctamente', () => {
            const vueContent = `<template>
  <button @click="handleClick">Click me</button>
</template>

<script setup lang="ts">
interface Emits {
    (e: 'click', id: number): void
    (e: 'change', value: string): void
}

const emit = defineEmits<Emits>()

const handleClick = () => {
    emit('click', 123)
    emit('change', 'new value')
}
</script>`;

            const result = validateVueTypes(vueContent, 'EmitsComponent.vue');

            expect(result).toBeDefined();
            expect(result.hasErrors).toBe(false);
        });

        test('Debe usar modo estricto cuando se especifica', () => {
            const vueContent = `<template>
  <div>{{ message }}</div>
</template>

<script setup lang="ts">
// Sin tipado explícito en modo estricto debería generar warning/error
const message = ref('Hello') // Tipo inferido, pero en modo estricto podría requerir explícito
</script>`;

            const resultNormal = validateVueTypes(
                vueContent,
                'StrictComponent.vue',
            );
            const resultStrict = validateVueTypes(
                vueContent,
                'StrictComponent.vue',
                {
                    strictMode: true,
                },
            );

            expect(resultNormal).toBeDefined();
            expect(resultStrict).toBeDefined();

            // En modo normal debería ser más permisivo
            expect(resultNormal.hasErrors).toBe(false);
        });
    });

    describe('Configuración de Tipos Vue', () => {
        test('Debe configurar tipos Vue correctamente', async () => {
            const success = await setupVueTypes(tempDir);

            expect(success).toBe(true);
            expect(hasVueTypesSetup(tempDir)).toBe(true);

            // Verificar archivos creados
            const vueShimsPath = path.join(tempDir, 'src/types/vue-shims.d.ts');
            const globalTypesPath = path.join(tempDir, 'src/types/global.d.ts');

            expect(fs.existsSync(vueShimsPath)).toBe(true);
            expect(fs.existsSync(globalTypesPath)).toBe(true);
        });

        test('Debe crear tsconfig.json cuando se solicita', async () => {
            const success = await setupVueTypes(tempDir, {
                createTsConfig: true,
                enableStrictMode: true,
            });

            expect(success).toBe(true);

            const tsconfigPath = path.join(tempDir, 'tsconfig.json');
            expect(fs.existsSync(tsconfigPath)).toBe(true);

            const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
            expect(tsconfig.compilerOptions.strict).toBe(true);
        });

        test('Debe detectar y configurar automáticamente proyecto Vue', async () => {
            // Crear package.json simulado
            const packageJson = {
                name: 'test-vue-project',
                dependencies: {
                    vue: '^3.0.0',
                    'vue-router': '^4.0.0',
                },
                devDependencies: {
                    '@vitejs/plugin-vue': '^4.0.0',
                },
            };

            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify(packageJson, null, 2),
            );

            const success = await autoSetupVueTypes(tempDir);

            expect(success).toBe(true);
            expect(hasVueTypesSetup(tempDir)).toBe(true);

            // Verificar que detectó Vue Router
            const globalTypesPath = path.join(tempDir, 'src/types/global.d.ts');
            const globalTypesContent = fs.readFileSync(
                globalTypesPath,
                'utf-8',
            );
            expect(globalTypesContent).toContain('$route');
            expect(globalTypesContent).toContain('$router');
        });

        test('No debe configurar tipos en proyecto sin Vue', async () => {
            // Crear package.json sin Vue
            const packageJson = {
                name: 'test-react-project',
                dependencies: {
                    react: '^18.0.0',
                },
            };

            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify(packageJson, null, 2),
            );

            const success = await autoSetupVueTypes(tempDir);

            expect(success).toBe(false);
            expect(hasVueTypesSetup(tempDir)).toBe(false);
        });
    });

    describe('Compatibilidad y Regresión', () => {
        test('Debe mantener compatibilidad con validación anterior', () => {
            const vueContent = `<template>
  <div>{{ _ctx.message }}</div>
</template>

<script setup lang="ts">
const message = 'Hello'
</script>`;

            const result = validateVueTypes(
                vueContent,
                'CompatibilityComponent.vue',
            );

            // No debe fallar por parámetros internos de Vue
            expect(result).toBeDefined();
            expect(result.hasErrors).toBe(false);
        });

        test('Debe filtrar errores de infraestructura Vue pero mantener errores reales', () => {
            const vueContent = `<template>
  <div>{{ message }}</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Error real que debe detectarse
const message: string = 123

// Los parámetros internos como _ctx no deben generar errores
</script>`;

            const result = validateVueTypes(vueContent, 'FilterComponent.vue');

            expect(result).toBeDefined();
            expect(result.hasErrors).toBe(true);

            // Debe detectar el error de asignación pero filtrar errores de _ctx
            const errors = result.diagnostics.map(d => d.messageText);
            const hasTypeError = errors.some(
                err =>
                    typeof err === 'string' &&
                    err.includes(
                        "Type 'number' is not assignable to type 'string'",
                    ),
            );
            expect(hasTypeError).toBe(true);
        });
    });
});
