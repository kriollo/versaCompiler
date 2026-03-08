<script setup lang="ts">
    import { computed } from 'vue';

    import type { FlowNode, NodeConfig } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

    interface Props {
        modelValue: NodeConfig;
        node: FlowNode;
    }

    const props = defineProps<Props>();
    const emit = defineEmits<{
        'update:modelValue': [val: NodeConfig];
    }>();

    const localConfig = computed({
        get: (): NodeConfig => props.modelValue,
        set: (val: NodeConfig) => {
            emit('update:modelValue', val);
        },
    });

    // Inicializar valores por defecto si no existen
    if (localConfig.value.errorHandlerEnabled === undefined) {
        localConfig.value.errorHandlerEnabled = true;
    }
</script>

<template>
    <div class="space-y-4">
        <div
            class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-xs text-red-700 dark:text-red-300 space-y-1">
            <p class="font-semibold">Puertos de salida</p>
            <p>
                <span class="font-semibold">Puerto 1:</span>
                Flujo normal (sin error)
            </p>
            <p>
                <span class="font-semibold">Puerto 2:</span>
                Manejo de error
            </p>
        </div>
        <div class="flex items-center gap-2">
            <input
                type="checkbox"
                id="errorHandlerEnabled"
                v-model="localConfig.errorHandlerEnabled"
                class="w-4 h-4 text-brand bg-gray-100 border-gray-300 rounded focus:ring-brand dark:focus:ring-brand dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
            <label for="errorHandlerEnabled" class="text-sm text-gray-700 dark:text-gray-300">
                Habilitar manejo de errores
            </label>
        </div>
        <div class="flex items-center gap-2">
            <input
                type="checkbox"
                id="errorHandlerCatchAll"
                v-model="localConfig.errorHandlerCatchAll"
                class="w-4 h-4 text-brand bg-gray-100 border-gray-300 rounded focus:ring-brand dark:focus:ring-brand dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
            <label for="errorHandlerCatchAll" class="text-sm text-gray-700 dark:text-gray-300">
                Capturar todos los errores (catch-all)
            </label>
        </div>
    </div>
</template>
