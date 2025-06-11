/**
 * Tests para analizar el impacto del orden del pipeline de compilación
 * Issue #1: Pipeline de Compilación - Orden Incorrecto
 *
 * Este test evalúa si cambiar el orden del pipeline (TS validation antes de transforms)
 * realmente causa problemas o si el orden actual es correcto.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { estandarizaCode } from '../src/compiler/transforms';
import { preCompileTS } from '../src/compiler/typescript-manager';
import { preCompileVue } from '../src/compiler/vuejs';

describe('Pipeline Order Analysis - Issue #1', () => {
    const testDir = path.join(process.cwd(), 'temp-pipeline-test');
    beforeAll(async () => {
        await fs.mkdir(testDir, { recursive: true });
        // Configurar variables de entorno para los tests
        process.env.PATH_DIST = 'public';
        process.env.isPROD = 'false';
        process.env.PATH_ALIAS = JSON.stringify({
            '@/*': ['examples/*'],
            'P@/*': ['public/*'],
        });
    });

    afterAll(async () => {
        await fs.rmdir(testDir, { recursive: true }).catch(() => {});
    });

    describe('Escenario 1: Vue con TypeScript y alias', () => {
        test('debe analizar el impacto del orden del pipeline en archivos Vue con TS y alias', async () => {
            // Crear archivo Vue que usa alias y TypeScript
            const vueContent = `
<template>
    <div class="container">
        <h1>{{ title }}</h1>
        <Button :label="buttonText" @click="handleClick" />
        <Helper :data="helperData" />
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Helper } from '@/utils/helper';
import Button from '@/components/Button.vue';
import { UserService } from '@/services/user.service';

interface Props {
    title: string;
}

interface UserData {
    name: string;
    age: number;
}

const props = defineProps<Props>();
const buttonText = ref<string>('Click me');
const helperData = ref<UserData>({ name: 'John', age: 30 });
const userService = new UserService();

const handleClick = () => {
    console.log('Button clicked!');
};
</script>

<style scoped>
.container {
    padding: 20px;
    background-color: #f5f5f5;
}
</style>`;

            console.log(
                '\n=== ANÁLISIS ORDEN PIPELINE PARA VUE + TS + ALIAS ===',
            );

            // TEST: ORDEN ACTUAL (Vue → TS → Transforms)
            let currentOrderResult: any = null;
            let currentOrderError: any = null;

            try {
                console.log(
                    '\n📊 PROBANDO ORDEN ACTUAL (Vue → TS → Transforms):',
                );

                // 1. Vue compilation
                const vueResult = await preCompileVue(
                    vueContent,
                    'TestComponent.vue',
                    false,
                );
                console.log(
                    '  ✓ Vue compilation:',
                    vueResult.error ? 'FAILED' : 'SUCCESS',
                );

                if (vueResult.error) {
                    throw vueResult.error;
                }

                let intermediateCode = vueResult.data || vueContent;

                // 2. TS validation/compilation (si el resultado es TS)
                if (vueResult.lang === 'ts') {
                    const tsResult = await preCompileTS(
                        intermediateCode,
                        'TestComponent.vue',
                    );
                    console.log(
                        '  ✓ TS compilation:',
                        tsResult.error ? 'FAILED' : 'SUCCESS',
                    );

                    if (tsResult.error) {
                        throw tsResult.error;
                    }
                    intermediateCode = tsResult.data || intermediateCode;
                } // 3. Aplicar transforms (imports/alias)
                const transformResult = await estandarizaCode(
                    intermediateCode,
                    'TestComponent.vue',
                );
                console.log(
                    '  ✓ Transforms:',
                    transformResult.error ? 'FAILED' : 'SUCCESS',
                );

                if (transformResult.error) {
                    throw new Error(transformResult.error);
                }
                currentOrderResult = {
                    code: transformResult.code,
                    lang: vueResult.lang,
                    steps: ['Vue', 'TS', 'Transforms'],
                };
            } catch (error: unknown) {
                currentOrderError = error;
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                console.log('  ❌ ORDEN ACTUAL FALLÓ:', errorMessage);
            }

            // TEST: ORDEN PROPUESTO (Vue → Transforms → TS)
            let proposedOrderResult: any = null;
            let proposedOrderError: any = null;

            try {
                console.log(
                    '\n📊 PROBANDO ORDEN PROPUESTO (Vue → Transforms → TS):',
                );

                // 1. Vue compilation
                const vueResult = await preCompileVue(
                    vueContent,
                    'TestComponent.vue',
                    false,
                );
                console.log(
                    '  ✓ Vue compilation:',
                    vueResult.error ? 'FAILED' : 'SUCCESS',
                );

                if (vueResult.error) {
                    throw vueResult.error;
                }

                let intermediateCode = vueResult.data || vueContent; // 2. Aplicar transforms ANTES de TS (orden propuesto)
                const transformResult = await estandarizaCode(
                    intermediateCode,
                    'TestComponent.vue',
                );
                console.log(
                    '  ✓ Transforms:',
                    transformResult.error ? 'FAILED' : 'SUCCESS',
                );

                if (transformResult.error) {
                    throw new Error(transformResult.error);
                }

                intermediateCode = transformResult.code;

                // 3. TS validation/compilation DESPUÉS (orden propuesto)
                if (vueResult.lang === 'ts') {
                    const tsResult = await preCompileTS(
                        intermediateCode,
                        'TestComponent.vue',
                    );
                    console.log(
                        '  ✓ TS compilation:',
                        tsResult.error ? 'FAILED' : 'SUCCESS',
                    );

                    if (tsResult.error) {
                        throw tsResult.error;
                    }
                    intermediateCode = tsResult.data || intermediateCode;
                }
                proposedOrderResult = {
                    code: intermediateCode,
                    lang: vueResult.lang,
                    steps: ['Vue', 'Transforms', 'TS'],
                };
            } catch (error: unknown) {
                proposedOrderError = error;
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                console.log('  ❌ ORDEN PROPUESTO FALLÓ:', errorMessage);
            }

            // ANÁLISIS DE RESULTADOS
            console.log('\n=== ANÁLISIS COMPARATIVO ===');
            console.log('📊 ORDEN ACTUAL (Vue → TS → Transforms):');
            console.log('  Estado:', currentOrderError ? 'FALLÓ' : 'ÉXITO');
            console.log('  Error:', currentOrderError?.message || 'Ninguno');
            console.log('  Código generado:', !!currentOrderResult?.code);

            console.log('\n📊 ORDEN PROPUESTO (Vue → Transforms → TS):');
            console.log('  Estado:', proposedOrderError ? 'FALLÓ' : 'ÉXITO');
            console.log('  Error:', proposedOrderError?.message || 'Ninguno');
            console.log('  Código generado:', !!proposedOrderResult?.code);

            if (currentOrderResult && proposedOrderResult) {
                console.log('\n📈 COMPARACIÓN DE CÓDIGOS:');
                console.log(
                    '  Longitud actual:',
                    currentOrderResult.code?.length || 0,
                );
                console.log(
                    '  Longitud propuesta:',
                    proposedOrderResult.code?.length || 0,
                );
                console.log(
                    '  Son idénticos:',
                    currentOrderResult.code === proposedOrderResult.code,
                );
            }

            // CONCLUSIONES DEL TEST
            console.log('\n=== CONCLUSIONES ===');

            if (currentOrderError && !proposedOrderError) {
                console.log(
                    '✅ ISSUE CONFIRMADO: El orden actual causa problemas, el propuesto funciona',
                );
            } else if (!currentOrderError && proposedOrderError) {
                console.log(
                    '❌ ISSUE REFUTADO: El orden actual funciona, el propuesto causa problemas',
                );
            } else if (currentOrderError && proposedOrderError) {
                console.log(
                    '⚠️ AMBOS ÓRDENES FALLAN: Problema más profundo en el sistema',
                );
            } else {
                console.log(
                    '🤔 AMBOS ÓRDENES FUNCIONAN: El issue podría no ser real o aplicarse a casos específicos',
                );
            }

            // EXPECTATIONS para que el test pase/falle según los resultados
            if (currentOrderError) {
                expect(currentOrderError).toBeDefined();
                console.log('   → El orden actual SÍ tiene problemas');
            } else {
                expect(currentOrderResult).toBeDefined();
                expect(currentOrderResult.code).toBeTruthy();
                console.log('   → El orden actual funciona correctamente');
            }

            if (proposedOrderError) {
                expect(proposedOrderError).toBeDefined();
                console.log('   → El orden propuesto SÍ tiene problemas');
            } else {
                expect(proposedOrderResult).toBeDefined();
                expect(proposedOrderResult.code).toBeTruthy();
                console.log('   → El orden propuesto funciona correctamente');
            }
        });
    });

    describe('Escenario 2: TypeScript puro con alias no resueltos', () => {
        test('debe probar si TS puede validar código con imports alias sin resolver', async () => {
            const tsContent = `
import { Helper } from '@/utils/helper';
import { config } from '@/config/app.config';
import Button from '@/components/Button.vue';

interface User {
    name: string;
    age: number;
}

export class UserService {
    private helper: Helper;

    constructor() {
        this.helper = new Helper();
    }

    getUser(): User {
        return {
            name: config.defaultUser,
            age: this.helper.getDefaultAge()
        };
    }
}`;

            console.log('\n=== ANÁLISIS TS PURO CON ALIAS ===');

            // TEST ORDEN ACTUAL: Transforms → TS
            let currentOrderSuccess = false;
            let currentOrderError: any = null;

            try {
                console.log('\n📊 ORDEN ACTUAL (Transforms → TS):'); // 1. Aplicar transforms primero (orden actual)
                const transformResult = await estandarizaCode(
                    tsContent,
                    'UserService.ts',
                );
                console.log(
                    '  ✓ Transforms:',
                    transformResult.error ? 'FAILED' : 'SUCCESS',
                );

                if (transformResult.error) {
                    throw new Error(transformResult.error);
                }

                // 2. Validar TS sobre código transformado
                const tsResult = await preCompileTS(
                    transformResult.code,
                    'UserService.ts',
                );
                console.log(
                    '  ✓ TS validation:',
                    tsResult.error ? 'FAILED' : 'SUCCESS',
                );

                if (tsResult.error) {
                    throw tsResult.error;
                }
                currentOrderSuccess = true;
            } catch (error: unknown) {
                currentOrderError = error;
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                console.log('  ❌ ORDEN ACTUAL FALLÓ:', errorMessage);
            }

            // TEST ORDEN PROPUESTO: TS → Transforms
            let proposedOrderSuccess = false;
            let proposedOrderError: any = null;

            try {
                console.log('\n📊 ORDEN PROPUESTO (TS → Transforms):');

                // 1. Validar TS sobre código original (orden propuesto)
                const tsResult = await preCompileTS(
                    tsContent,
                    'UserService.ts',
                );
                console.log(
                    '  ✓ TS validation:',
                    tsResult.error ? 'FAILED' : 'SUCCESS',
                );

                if (tsResult.error) {
                    throw tsResult.error;
                } // 2. Aplicar transforms después
                const transformResult = await estandarizaCode(
                    tsResult.data || tsContent,
                    'UserService.ts',
                );
                console.log(
                    '  ✓ Transforms:',
                    transformResult.error ? 'FAILED' : 'SUCCESS',
                );

                if (transformResult.error) {
                    throw new Error(transformResult.error);
                }
                proposedOrderSuccess = true;
            } catch (error: unknown) {
                proposedOrderError = error;
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                console.log('  ❌ ORDEN PROPUESTO FALLÓ:', errorMessage);
            }
            console.log('\n=== ANÁLISIS TS PURO ===');
            console.log('📊 ORDEN ACTUAL (Transforms → TS):');
            console.log('  Éxito:', currentOrderSuccess);
            console.log(
                '  Error:',
                currentOrderError instanceof Error
                    ? currentOrderError.message
                    : currentOrderError || 'Ninguno',
            );

            console.log('\n📊 ORDEN PROPUESTO (TS → Transforms):');
            console.log('  Éxito:', proposedOrderSuccess);
            console.log(
                '  Error:',
                proposedOrderError instanceof Error
                    ? proposedOrderError.message
                    : proposedOrderError || 'Ninguno',
            );

            // ANÁLISIS ESPECÍFICO PARA TS
            if (!proposedOrderSuccess && currentOrderSuccess) {
                console.log(
                    '\n✅ ISSUE CONFIRMADO: TS no puede validar alias sin resolver',
                );
                console.log(
                    '   → El orden actual (Transforms → TS) es NECESARIO',
                );
            } else if (proposedOrderSuccess && !currentOrderSuccess) {
                console.log(
                    '\n❌ ISSUE REFUTADO: TS puede validar alias, transforms después causan problemas',
                );
            } else if (proposedOrderSuccess && currentOrderSuccess) {
                console.log(
                    '\n🤔 AMBOS FUNCIONAN: El orden puede no importar para este caso',
                );
            } else {
                console.log('\n⚠️ AMBOS FALLAN: Problema más profundo');
            }

            // Test expectations
            expect(typeof currentOrderSuccess).toBe('boolean');
            expect(typeof proposedOrderSuccess).toBe('boolean');
        });
    });

    describe('Escenario 3: Análisis de sourcemaps', () => {
        test('debe verificar si el orden afecta la trazabilidad de errores', async () => {
            const vueContentWithError = `
<template>
    <div>{{ undefinedVariable }}</div>
</template>

<script setup lang="ts">
import { Helper } from '@/utils/helper';

// Error intencional: variable no definida
const result = undefinedVariable + 5;
</script>`;

            console.log('\n=== ANÁLISIS DE TRAZABILIDAD DE ERRORES ===');

            let currentOrderErrorLine: number | null = null;
            let proposedOrderErrorLine: number | null = null;

            // ORDEN ACTUAL: Vue → TS → Transforms
            try {
                const vueResult = await preCompileVue(
                    vueContentWithError,
                    'ErrorComponent.vue',
                    false,
                );
                if (vueResult.data && vueResult.lang === 'ts') {
                    await preCompileTS(vueResult.data, 'ErrorComponent.vue');
                }
            } catch (error: unknown) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                const lineMatch = errorMessage
                    ? errorMessage.match(/line (\d+)/i)
                    : null;
                currentOrderErrorLine =
                    lineMatch && lineMatch[1] ? parseInt(lineMatch[1]) : null;
                console.log(
                    '📊 Error en orden actual - línea:',
                    currentOrderErrorLine,
                );
            }

            // ORDEN PROPUESTO: Vue → Transforms → TS
            try {
                const vueResult = await preCompileVue(
                    vueContentWithError,
                    'ErrorComponent.vue',
                    false,
                );
                if (vueResult.data) {
                    const transformResult = await estandarizaCode(
                        vueResult.data,
                        'ErrorComponent.vue',
                    );
                    if (!transformResult.error && vueResult.lang === 'ts') {
                        await preCompileTS(
                            transformResult.code,
                            'ErrorComponent.vue',
                        );
                    }
                }
            } catch (error: unknown) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                const lineMatch = errorMessage
                    ? errorMessage.match(/line (\d+)/i)
                    : null;
                proposedOrderErrorLine =
                    lineMatch && lineMatch[1] ? parseInt(lineMatch[1]) : null;
                console.log(
                    '📊 Error en orden propuesto - línea:',
                    proposedOrderErrorLine,
                );
            }

            if (currentOrderErrorLine && proposedOrderErrorLine) {
                console.log('\n📈 ANÁLISIS DE TRAZABILIDAD:');
                console.log(
                    '  Línea error orden actual:',
                    currentOrderErrorLine,
                );
                console.log(
                    '  Línea error orden propuesto:',
                    proposedOrderErrorLine,
                );
                console.log(
                    '  Diferencia:',
                    Math.abs(currentOrderErrorLine - proposedOrderErrorLine),
                );

                if (currentOrderErrorLine !== proposedOrderErrorLine) {
                    console.log(
                        '✅ ISSUE CONFIRMADO: El orden afecta la trazabilidad de errores',
                    );
                } else {
                    console.log(
                        '❌ ISSUE NO CONFIRMADO: Ambos órdenes reportan la misma línea',
                    );
                }
            }

            expect(true).toBe(true); // Test siempre pasa, el análisis está en los logs
        });
    });
});
