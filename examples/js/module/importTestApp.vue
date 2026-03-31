<script setup lang="ts">
    /**
     * importTestApp.vue
     * Prueba end-to-end de todos los modos de importación soportados por VersaCompiler.
     *
     * Modos cubiertos:
     *  1. Named import  — paquete regular con exports string simple  (vue)
     *  2. Default import — paquete con campo "module", sin "exports"  (sweetalert2)
     *  3. Named import  — paquete scoped @scope/pkg                  (@vueuse/core)
     *  4. Named import  — paquete con exports condicionales anidados  (pinia)
     *  5. Named import  — paquete con exports condicionales anidados  (vue-router)
     *  6. Import alias  — alias 'e@/*' configurado en versacompile   (e@/js/components/...)
     *  7. Import relativo                                             (./operacionesMatematicas.vue)
     *  8. Dynamic import — import() dinámico de módulo externo
     */

    // ── 1. Named import — vue (exports['.'] = string simple) ──────────────────
    import { computed, onMounted, ref, watch } from 'vue';

    // ── 2. Default import — sweetalert2 (usa campo "module", sin exports) ─────
    import Swal from 'sweetalert2';

    // ── 3. Named import — @vueuse/core (scoped, exports['.'] = string simple) ─
    import {
        useLocalStorage,
        useMouse,
        usePreferredDark,
        useToggle,
    } from '@vueuse/core';

    // ── 4. Named import — pinia (exports condicionales anidados con "import") ──
    import { defineStore, storeToRefs } from 'pinia';

    // ── 5. Named import — vue-router (exports condicionales anidados) ──────────
    import { RouterLink } from 'vue-router';

    // ── 6. Import alias — 'e@/*' → examples/* ─────────────────────────────────
    import SwitchToggle from 'e@/js/components/switchToggle.vue';

    // ── 7. Import relativo ─────────────────────────────────────────────────────
    import OperacionesMatematicas from './operacionesMatematicas.vue';

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Vue reactivity
    const count = ref(0);
    const doubled = computed(() => count.value * 2);
    watch(count, val => {
        if (val > 10) count.value = 0;
    });

    // 2. @vueuse/core — scoped package
    const { x: mouseX, y: mouseY } = useMouse();
    const isDark = usePreferredDark();
    const [isToggled, toggle] = useToggle(false);
    const storedName = useLocalStorage('test-app-name', 'VersaCompiler');

    // 3. pinia — named exports con exports condicionales anidados
    const useCounterStore = defineStore('counter', () => {
        const n = ref(0);
        const increment = () => n.value++;
        return { n, increment };
    });
    const store = useCounterStore();
    const { n: storeCount } = storeToRefs(store);

    // 4. sweetalert2 — default import
    const showSwal = () => {
        Swal.fire({
            title: '¡Funciona!',
            text: `sweetalert2 importado como default. Count: ${count.value}`,
            icon: 'success',
            confirmButtonText: 'OK',
        });
    };

    // 5. Dynamic import — módulo externo
    const dynamicResult = ref<string>('pendiente...');
    const runDynamicImport = async () => {
        const { defineStore: ds } = await import('pinia');
        dynamicResult.value =
            typeof ds === 'function'
                ? '✅ pinia cargado dinámicamente'
                : '❌ fallo';
    };

    onMounted(() => {
        runDynamicImport();
    });
</script>

<template>
    <div class="p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg space-y-6">
        <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">
            🧪 Import Test App
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
            Prueba end-to-end de todos los modos de importación
        </p>

        <!-- 1. vue: ref / computed / watch -->
        <section class="border rounded-lg p-4 space-y-2">
            <h2 class="font-semibold text-gray-700 dark:text-gray-200">
                1.
                <code>vue</code>
                — named import (exports string simple)
            </h2>
            <div class="flex items-center gap-3">
                <button
                    @click="count--"
                    class="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                    -
                </button>
                <span class="text-lg font-mono">{{ count }}</span>
                <button
                    @click="count++"
                    class="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                    +
                </button>
                <span class="text-sm text-gray-500">× 2 = {{ doubled }}</span>
            </div>
        </section>

        <!-- 2. sweetalert2: default import -->
        <section class="border rounded-lg p-4 space-y-2">
            <h2 class="font-semibold text-gray-700 dark:text-gray-200">
                2.
                <code>sweetalert2</code>
                — default import (campo "module")
            </h2>
            <button
                @click="showSwal"
                class="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-white rounded font-medium">
                Mostrar Swal
            </button>
        </section>

        <!-- 3. @vueuse/core: scoped package -->
        <section class="border rounded-lg p-4 space-y-2">
            <h2 class="font-semibold text-gray-700 dark:text-gray-200">
                3.
                <code>@vueuse/core</code>
                — named import (paquete scoped)
            </h2>
            <ul
                class="text-sm font-mono space-y-1 text-gray-600 dark:text-gray-300">
                <li>useMouse → x: {{ mouseX }}, y: {{ mouseY }}</li>
                <li>
                    usePreferredDark → {{ isDark ? '🌙 oscuro' : '☀️ claro' }}
                </li>
                <li>
                    useToggle →
                    <button
                        @click="toggle()"
                        class="px-2 py-0.5 bg-indigo-500 text-white rounded text-xs ml-1">
                        {{ isToggled ? 'ON' : 'OFF' }}
                    </button>
                </li>
                <li>
                    useLocalStorage →
                    <input
                        v-model="storedName"
                        class="border rounded px-1 py-0.5 text-xs ml-1 dark:bg-gray-800" />
                </li>
            </ul>
        </section>

        <!-- 4. pinia: exports condicionales anidados -->
        <section class="border rounded-lg p-4 space-y-2">
            <h2 class="font-semibold text-gray-700 dark:text-gray-200">
                4.
                <code>pinia</code>
                — named import (exports condicionales anidados)
            </h2>
            <div class="flex items-center gap-3">
                <span class="font-mono text-lg">{{ storeCount }}</span>
                <button
                    @click="store.increment()"
                    class="px-3 py-1 bg-green-500 text-white rounded">
                    +1 en store
                </button>
            </div>
        </section>

        <!-- 5. vue-router: exports condicionales anidados -->
        <section class="border rounded-lg p-4 space-y-2">
            <h2 class="font-semibold text-gray-700 dark:text-gray-200">
                5.
                <code>vue-router</code>
                — named import (exports condicionales anidados)
            </h2>
            <p class="text-sm text-gray-500">
                RouterLink importado:
                {{ typeof RouterLink === 'object' ? '✅' : '❌' }}
                <code class="ml-2 text-xs">
                    {{ RouterLink.__name ?? RouterLink.name }}
                </code>
            </p>
        </section>

        <!-- 6. Alias import -->
        <section class="border rounded-lg p-4 space-y-2">
            <h2 class="font-semibold text-gray-700 dark:text-gray-200">
                6. Alias
                <code>e@/...</code>
                — import de componente local via alias
            </h2>
            <SwitchToggle v-model="isToggled" />
        </section>

        <!-- 7. Relative import -->
        <section class="border rounded-lg p-4 space-y-2">
            <h2 class="font-semibold text-gray-700 dark:text-gray-200">
                7. Import relativo —
                <code>./operacionesMatematicas.vue</code>
            </h2>
            <OperacionesMatematicas message="test" />
        </section>

        <!-- 8. Dynamic import -->
        <section class="border rounded-lg p-4 space-y-2">
            <h2 class="font-semibold text-gray-700 dark:text-gray-200">
                8. Dynamic
                <code>import()</code>
                — pinia cargado en onMounted
            </h2>
            <p class="font-mono text-sm">{{ dynamicResult }}</p>
        </section>
    </div>
</template>

<style scoped>
    section {
        border-color: #e5e7eb;
    }
    code {
        font-size: 0.85em;
        background: #f3f4f6;
        padding: 0.1em 0.3em;
        border-radius: 3px;
    }
    .dark code {
        background: #374151;
    }
</style>
