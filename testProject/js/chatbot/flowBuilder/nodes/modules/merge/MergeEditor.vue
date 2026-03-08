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

    const localConfig = computed<NodeConfig>({
        get: () => props.modelValue,
        set: val => {
            emit('update:modelValue', val);
        },
    });
</script>

<template>
    <div class="space-y-4">
        <div
            class="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg text-xs text-purple-700 dark:text-purple-300 space-y-1">
            <p class="font-semibold">Convergencia de ramas paralelas</p>
            <p>Recibe múltiples entradas y las combina en una sola salida.</p>
            <p>Úsalo junto con el nodo Paralelo para sincronizar resultados.</p>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modo de fusión</label>
            <select
                v-model="localConfig.mergeMode"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="wait_all">Esperar todas las entradas</option>
                <option value="wait_any">Esperar cualquier entrada</option>
                <option value="append">Agregar resultados en array</option>
            </select>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                <span class="font-medium">wait_all:</span>
                Espera a que todas las ramas terminen.
            </p>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entradas esperadas</label>
            <input
                v-model.number="localConfig.mergeExpectedInputs"
                type="number"
                min="2"
                max="10"
                placeholder="2"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timeout (ms)</label>
            <input
                v-model.number="localConfig.mergeTimeout"
                type="number"
                min="1000"
                step="1000"
                placeholder="30000"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Variable para resultados
            </label>
            <input
                v-model="localConfig.mergeResultsVariable"
                type="text"
                placeholder="merge_results"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
    </div>
</template>
