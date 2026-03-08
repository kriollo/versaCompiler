<script setup lang="ts">
    import { computed } from 'vue';

    import type { FlowNode, NodeConfig } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

    const props = defineProps<{
        modelValue: NodeConfig;
        node: FlowNode;
    }>();

    const emit = defineEmits<{
        'update:modelValue': [val: NodeConfig];
    }>();

    const localConfig = computed({
        get: () => props.modelValue,
        set: val => {
            emit('update:modelValue', val);
        },
    });

    const conditionOperators = [
        { value: 'equals', label: 'Igual a' },
        { value: 'not_equals', label: 'No igual a' },
        { value: 'contains', label: 'Contiene' },
        { value: 'greater', label: 'Mayor que' },
        { value: 'less', label: 'Menor que' },
        { value: 'is_empty', label: 'Está vacío' },
        { value: 'is_not_empty', label: 'No está vacío' },
        { value: 'is_true', label: 'Es verdadero (true)' },
        { value: 'is_false', label: 'Es falso (false)' },
        { value: 'starts_with', label: 'Comienza con' },
        { value: 'ends_with', label: 'Termina con' },
        { value: 'regex', label: 'Regex (patrón)' },
    ];

    const operatorsWithoutValue = ['is_empty', 'is_not_empty', 'is_true', 'is_false'];

    const conditionOutputMap = computed(() => {
        const conditions = localConfig.value.conditions || [];
        const conditionPorts = conditions.map((_, index) => ({
            port: index + 1,
            label: `Condición ${index + 1}`,
        }));

        return [
            ...conditionPorts,
            {
                port: conditions.length + 1,
                label: 'Por defecto (ninguna condición coincide)',
            },
        ];
    });

    const addCondition = () => {
        if (!localConfig.value.conditions) {
            localConfig.value.conditions = [];
        }
        localConfig.value.conditions.push({
            field: '',
            operator: 'equals',
            value: '',
        });
    };

    const removeCondition = (index: number) => {
        if (localConfig.value.conditions) {
            localConfig.value.conditions.splice(index, 1);
        }
    };
</script>

<template>
    <div>
        <div
            class="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-700 dark:text-amber-300 space-y-1 mb-4">
            <p class="font-semibold">Mapa de puertos de salida</p>
            <p v-for="item in conditionOutputMap" :key="item.port">
                <span class="font-semibold">Puerto {{ item.port }}:</span>
                {{ item.label }}
            </p>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Condiciones</label>
            <div class="space-y-3">
                <div
                    v-for="(condition, index) in localConfig.conditions"
                    :key="index"
                    class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <p class="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                Condición {{ Number(index) + 1 }} → Puerto {{ Number(index) + 1 }}
                            </p>
                            <button
                                @click="removeCondition(index)"
                                class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                                <svg
                                    class="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                            </button>
                        </div>
                        <input
                            v-model="condition.field"
                            type="text"
                            placeholder="Campo o variable (Ej: user_age)"
                            class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
                        <select
                            v-model="condition.operator"
                            class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                            <option v-for="op in conditionOperators" :key="op.value" :value="op.value">
                                {{ op.label }}
                            </option>
                        </select>
                        <input
                            v-if="!operatorsWithoutValue.includes(condition.operator)"
                            v-model="condition.value"
                            type="text"
                            placeholder="Valor a comparar"
                            class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
                    </div>
                </div>
            </div>
            <button
                @click="addCondition"
                class="w-full mt-3 px-3 py-2 text-sm bg-brand hover:bg-brand dark:bg-brand dark:hover:bg-brand-600 text-white rounded-lg transition-colors flex justify-center items-center gap-2">
                <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Agregar Condición
            </button>
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                La última salida, si ninguna coincide, es la ruta por defecto.
            </p>
        </div>
    </div>
</template>
