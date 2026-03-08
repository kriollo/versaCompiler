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

    const variableOperations = [
        { value: 'set', label: 'Establecer valor' },
        { value: 'get', label: 'Obtener valor' },
        { value: 'increment', label: 'Incrementar (+1)' },
        { value: 'decrement', label: 'Decrementar (-1)' },
    ];
</script>

<template>
    <div class="space-y-4">
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de Variable</label>
            <input
                v-model="localConfig.variableName"
                type="text"
                placeholder="nombre_variable"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Operación</label>
            <select
                v-model="localConfig.variableOperation"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option v-for="op in variableOperations" :key="op.value" :value="op.value">
                    {{ op.label }}
                </option>
            </select>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor</label>
            <input
                v-model="localConfig.variableValue"
                type="text"
                placeholder="Valor de la variable"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
    </div>
</template>
