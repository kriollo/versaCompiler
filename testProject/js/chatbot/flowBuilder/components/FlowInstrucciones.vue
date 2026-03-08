<script setup lang="ts">
    interface Props {
        isZenMode?: boolean;
    }

    withDefaults(defineProps<Props>(), {
        isZenMode: false,
    });
</script>

<template>
    <div
        class="absolute bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700 max-w-xs transition-all duration-300"
        :class="isZenMode ? 'bottom-6 right-6' : 'top-6 left-6'">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <svg
                class="w-5 h-5 text-brand"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Controles:
        </h3>
        <ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1.5">
            <li class="flex items-start gap-2">
                <span class="text-green-500 font-bold">•</span>
                <span>
                    <svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"></path>
                    </svg>
                    Modo Mano: Click para mover canvas libremente
                </span>
            </li>
            <li class="flex items-start gap-2">
                <span class="text-brand font-bold">•</span>
                <span>
                    <kbd class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl</kbd>
                    + Click: Mover canvas (sin activar modo)
                </span>
            </li>
            <li class="flex items-start gap-2">
                <span class="text-brand font-bold">•</span>
                <span>
                    <kbd class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl</kbd>
                    + Scroll: Zoom
                </span>
            </li>
            <li class="flex items-start gap-2">
                <span class="text-green-500 font-bold">•</span>
                <span>Arrastra nodos desde el panel izquierdo</span>
            </li>
            <li class="flex items-start gap-2">
                <span class="text-green-500 font-bold">•</span>
                <span>Doble click en nodo: Editar</span>
            </li>
            <li class="flex items-start gap-2">
                <span class="text-yellow-500 font-bold">•</span>
                <span>Puerto salida → entrada: Conectar</span>
            </li>
            <li class="flex items-start gap-2">
                <span class="text-red-500 font-bold">•</span>
                <span>Click en conexión: Eliminar</span>
            </li>
        </ul>
    </div>
</template>
