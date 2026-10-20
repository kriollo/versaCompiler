import { describe, expect, it } from 'vitest';

import { clearVueHMRCache, preCompileVue } from '../src/compiler/vuejs';

/**
 * En desarrollo se inyecta :key="versaComponentKey" en el elemento raíz del template. Un `>` dentro de
 * un atributo con comillas (v-if="total > 0") no es el cierre de la etiqueta.
 */
const componente = (raiz: string): string => `<script setup lang="ts">
    const props = defineProps<{ count?: number }>();
    const total = 3;
</script>

<template>
    ${raiz}
</template>
`;

describe('atributos del elemento raíz con > o < entre comillas', () => {
    it.each([
        '<p v-if="(props.count ?? 0) > 0">x</p>',
        '<p v-if="total > 0" class="mt-1 text-[11px]">x</p>',
        '<p v-if="total >= 1 && total < 10">x</p>',
        `<p v-show='total > 0' :class="{ activo: total > 2 }">x</p>`,
        '<input v-if="total > 0" />',
    ])('compila %s', async raiz => {
        clearVueHMRCache();
        const result = await preCompileVue(
            componente(raiz),
            '/tmp/RatingBadge.vue',
            false,
        );

        expect(result.error).toBeNull();
        expect(result.data).toContain('versaComponentKey');
    });

    it('una etiqueta enorme sin cerrar no se queda pensando (sin ReDoS)', async () => {
        clearVueHMRCache();
        const inicio = performance.now();
        await preCompileVue(
            componente(`<p ${'a="b" '.repeat(3000)}`),
            '/tmp/Enorme.vue',
            false,
        );

        expect(performance.now() - inicio).toBeLessThan(2000);
    });
});
