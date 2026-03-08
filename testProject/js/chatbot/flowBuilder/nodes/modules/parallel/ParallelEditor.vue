<script setup lang="ts">
    import { computed, watch } from 'vue';

    import type { FlowNode, NodeConfig } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

    interface Props {
        modelValue: NodeConfig;
        node: FlowNode;
    }

    const props = defineProps<Props>();
    const emit = defineEmits<{
        'update:modelValue': [val: NodeConfig];
        updateNode: [id: string, data: Partial<FlowNode>];
    }>();

    const localConfig = computed<NodeConfig>({
        get: () => props.modelValue,
        set: val => {
            emit('update:modelValue', val);
        },
    });

    watch(
        () => localConfig.value.parallelBranches,
        branches => {
            if (!props.node) {
                return;
            }
            const nextOutputs = Math.max(2, Math.min(10, branches || 3));
            if (props.node.outputs !== nextOutputs) {
                emit('updateNode', props.node.id, {
                    config: { ...localConfig.value },
                    outputs: nextOutputs,
                });
            }
        },
        { immediate: true },
    );
</script>

<template>
    <div class="space-y-4">
        <div
            class="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg text-xs text-indigo-700 dark:text-indigo-300 space-y-1">
            <p class="font-semibold">Ejecución paralela</p>
            <p>Cada puerto de salida ejecuta en paralelo.</p>
            <p>El flujo continúa cuando todas las ramas terminan.</p>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad de ramas</label>
            <input
                v-model.number="localConfig.parallelBranches"
                type="number"
                min="2"
                max="10"
                placeholder="3"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timeout total (ms)</label>
            <input
                v-model.number="localConfig.parallelTimeout"
                type="number"
                min="1000"
                step="1000"
                placeholder="30000"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
        <div class="flex items-center gap-2">
            <input
                type="checkbox"
                v-model="localConfig.parallelFailFast"
                class="w-4 h-4 text-brand bg-gray-100 border-gray-300 rounded focus:ring-brand dark:focus:ring-brand dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
            <label class="text-sm text-gray-700 dark:text-gray-300">Fallar rápido (detener si una rama falla)</label>
        </div>
        <div class="flex items-center gap-2">
            <input
                type="checkbox"
                v-model="localConfig.parallelContinueOnError"
                class="w-4 h-4 text-brand bg-gray-100 border-gray-300 rounded focus:ring-brand dark:focus:ring-brand dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
            <label class="text-sm text-gray-700 dark:text-gray-300">Continuar aunque haya errores</label>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Variable para resultados
            </label>
            <input
                v-model="localConfig.parallelResultsVariable"
                type="text"
                placeholder="parallel_results"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
    </div>
</template>
