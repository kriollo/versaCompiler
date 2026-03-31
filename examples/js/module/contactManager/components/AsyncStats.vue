<script setup lang="ts">
/**
 * AsyncStats.vue — Estadísticas con carga simulada asíncrona
 * Prueba: async setup, simulación de fetch async, computed sobre datos asíncronos
 */
import { ref, onMounted } from 'vue';
import type { ContactStats } from '../types';

interface Props {
    stats: ContactStats;
}

const props = defineProps<Props>();

const isLoading = ref(true);
const extraInfo = ref<string | null>(null);

onMounted(async () => {
    // Simula operación asíncrona (como un fetch de datos adicionales)
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    extraInfo.value = `Última actualización: ${new Date().toLocaleTimeString()}`;
    isLoading.value = false;
});
</script>

<template>
    <div data-async-stats="true" class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Estadísticas
        </h3>

        <!-- Loading state -->
        <div v-if="isLoading" class="flex items-center gap-2 text-gray-400 text-sm">
            <span class="animate-pulse">⏳</span>
            <span>Cargando estadísticas...</span>
        </div>

        <!-- Stats loaded -->
        <div v-else class="space-y-2">
            <div class="grid grid-cols-2 gap-2 text-sm">
                <div class="bg-white dark:bg-gray-700 rounded p-2 text-center">
                    <div class="text-2xl font-bold text-blue-600">{{ stats.total }}</div>
                    <div class="text-xs text-gray-500">Total</div>
                </div>
                <div class="bg-white dark:bg-gray-700 rounded p-2 text-center">
                    <div class="text-2xl font-bold text-yellow-500">{{ stats.favorites }}</div>
                    <div class="text-xs text-gray-500">Favoritos</div>
                </div>
            </div>

            <div class="flex gap-1 flex-wrap text-xs">
                <span
                    v-for="(count, cat) in stats.byCategory"
                    :key="cat"
                    class="px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                    {{ cat }}: {{ count }}
                </span>
            </div>

            <p v-if="extraInfo" class="text-xs text-gray-400 mt-1">{{ extraInfo }}</p>
        </div>
    </div>
</template>
