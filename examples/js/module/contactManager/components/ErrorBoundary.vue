<script setup lang="ts">
    /**
     * ErrorBoundary.vue — Captura errores de hijos con onErrorCaptured
     * Prueba: onErrorCaptured lifecycle hook, fallback UI, error propagation
     */
    import { ref, onErrorCaptured } from 'vue';

    const hasError = ref(false);
    const errorMessage = ref('');

    onErrorCaptured((err: unknown) => {
        hasError.value = true;
        errorMessage.value = err instanceof Error ? err.message : String(err);
        // Retornar false previene propagación al padre
        return false;
    });

    function reset() {
        hasError.value = false;
        errorMessage.value = '';
    }
</script>

<template>
    <div>
        <div
            v-if="hasError"
            data-error-boundary="true"
            class="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            <div class="flex items-center gap-2 text-red-700">
                <span class="text-lg">⚠️</span>
                <strong class="text-sm">Ocurrió un error</strong>
            </div>
            <p class="text-xs text-red-600 font-mono break-all">
                {{ errorMessage }}
            </p>
            <button
                @click="reset"
                class="text-xs px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded border border-red-300">
                Reintentar
            </button>
        </div>
        <slot v-else />
    </div>
</template>
