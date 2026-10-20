import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { env } from 'node:process';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BuildPipeline } from '../src/compiler/pipeline/build-pipeline';
import { createCorePlugins } from '../src/compiler/pipeline/core-plugins';

/**
 * Bug reporte de VersaABA (modalArticulo.vue):
 *
 * 1. El script de un SFC `lang="ts"` tiene un error de tipos (TS2339 con
 *    typeCheck activo). El stage core-ts entonces devuelve errores y NO
 *    actualiza `contents`.
 * 2. PluginDriver.transform encadena igual el siguiente stage (standardization),
 *    que recibe el TS crudo y lo parsea con oxc en modo JS: falla con
 *    `Expected `,` or `}` but found `Identifier`` apuntando al `type Ref`
 *    inline del import de vue, un error engañoso que entierra el real.
 *
 * El pipeline debe cortar la cadena de transform al primer stage con errores
 * y no debe aparecer un error de `standardization` asociado a TS crudo.
 */

const SFC_CON_TYPE_ERROR = `<script setup lang="ts">
    import { computed, inject, ref, watch, type Ref } from 'vue';

    interface FichaArticulo {
        id: number;
        codigo: string;
    }

    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));

    interface Props {
        showModal: boolean;
    }

    const props = withDefaults(defineProps<Props>(), {
        showModal: false,
    });

    const guardar = async () => {
        const response = await fetch('/api/articulos/1');
        const ficha = (await response.json()) as FichaArticulo;
        // TS2339: 'stocks' no existe en el tipo de la respuesta (caso real de VersaABA)
        const filas = (ficha.stocks ?? []) as unknown[];
        console.log(props.showModal, csrf_token.value, filas.length, computed, ref);
    };

    watch(
        () => props.showModal,
        abierto => {
            if (abierto) void guardar();
        },
    );
</script>
<template>
    <div>articulo</div>
</template>
`;

const SFC_VALIDO = `<script setup lang="ts">
    import { ref, type Ref } from 'vue';

    const cuenta = ref<Record<number, { valor: number }>>({});
    const token: Ref<string> = ref('');
    console.log(cuenta, token);
</script>
<template>
    <div>ok</div>
</template>
`;

const ORIGINAL_ENV = {
    typeCheck: env.typeCheck,
    isPROD: env.isPROD,
    WORKER_COMPILE: env.WORKER_COMPILE,
    VERBOSE: env.VERBOSE,
    TAILWIND: env.TAILWIND,
    CHECK_INTEGRITY: env.CHECK_INTEGRITY,
    PIPELINE_V2: env.PIPELINE_V2,
};

describe('Pipeline: fail-fast cuando un stage de transform falla', () => {
    let dir: string;

    beforeEach(() => {
        dir = mkdtempSync(path.join(tmpdir(), 'versa-fail-fast-'));
        // -t de compileDev: typeCheck activo (es lo que dispara el TS2339 real)
        env.typeCheck = 'true';
        env.isPROD = 'false';
        env.WORKER_COMPILE = 'false';
        env.VERBOSE = ORIGINAL_ENV.VERBOSE;
        env.TAILWIND = 'false';
        env.CHECK_INTEGRITY = 'false';
        env.PIPELINE_V2 = 'true';
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
        for (const [clave, valor] of Object.entries(ORIGINAL_ENV)) {
            if (valor === undefined) delete env[clave];
            else env[clave] = valor;
        }
    });

    it('un SFC válido con import type inline compila sin errores, incluso con genéricos anidados', async () => {
        const fileVue = path.join(dir, 'modalOk.vue');
        writeFileSync(fileVue, SFC_VALIDO, 'utf-8');

        const pipeline = new BuildPipeline(createCorePlugins());
        const result = await pipeline.compileFile(fileVue);

        expect(result.errors).toEqual([]);
        expect(result.code).not.toContain('type Ref');
    });

    it('reporta los errores de TypeScript y no el error espúrio de standardization', async () => {
        const fileVue = path.join(dir, 'modalArticulo.vue');
        writeFileSync(fileVue, SFC_CON_TYPE_ERROR, 'utf-8');

        const pipeline = new BuildPipeline(createCorePlugins());
        const result = await pipeline.compileFile(fileVue);

        // Hubo un error real, siempre
        expect(
            result.errors.length,
            `los errores fueron: ${JSON.stringify(result.errors)}`,
        ).toBeGreaterThan(0);

        // En el pipeline los errores salen como "stage: mensaje"
        const errores = result.errors.map(e => String(e));

        // El error real de TypeScript debe estar presente (TS2339 del caso VersaABA)
        const errorRealTs = errores.filter(
            e => e.startsWith('typescript:') && e.includes('TS2339'),
        );
        expect(errorRealTs.length).toBe(1);

        // El error espurio de standardization sobre TS crudo NO debe aparecer
        const parseoEspurio = errores.filter(
            e =>
                e.startsWith('standardization:') ||
                e.includes('found `Identifier`'),
        );
        expect(parseoEspurio).toEqual([]);
    });
});
