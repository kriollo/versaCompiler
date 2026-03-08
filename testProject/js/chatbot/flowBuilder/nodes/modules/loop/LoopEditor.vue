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

    const conditionOperators = [
        { value: 'equals', label: 'Igual a' },
        { value: 'not_equals', label: 'No igual a' },
        { value: 'greater', label: 'Mayor que' },
        { value: 'less', label: 'Menor que' },
        { value: 'contains', label: 'Contiene' },
        { value: 'is_empty', label: 'Está vacío' },
        { value: 'is_not_empty', label: 'No está vacío' },
    ];
</script>

<template>
    <div class="space-y-4">
        <div
            class="p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-lg text-xs text-teal-700 dark:text-teal-300 space-y-1">
            <p class="font-semibold">Puertos de salida</p>
            <p>
                <span class="font-semibold">Puerto 0:</span>
                Ejecutar iteracion (conectar al cuerpo del bucle)
            </p>
            <p>
                <span class="font-semibold">Puerto 1:</span>
                Fin del bucle (continuar cuando termina)
            </p>
            <p class="mt-2 text-teal-600 dark:text-teal-400">
                Importante: Conecta el cuerpo del bucle de vuelta al nodo Loop para continuar iterando.
            </p>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modo de bucle</label>
            <select
                v-model="localConfig.loopMode"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="foreach">ForEach - Iterar sobre array</option>
                <option value="times">Times - Repetir N veces</option>
                <option value="while">While - Mientras condición</option>
            </select>
        </div>
        <template v-if="localConfig.loopMode === 'foreach'">
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Variable con array
                </label>
                <input
                    v-model="localConfig.loopArrayVariable"
                    type="text"
                    placeholder="lista_productos"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre del iterador
                </label>
                <input
                    v-model="localConfig.loopIteratorVariable"
                    type="text"
                    placeholder="item"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
        </template>
        <template v-if="localConfig.loopMode === 'times'">
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cantidad de repeticiones
                </label>
                <input
                    v-model.number="localConfig.loopCount"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="5"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
        </template>
        <template v-if="localConfig.loopMode === 'while'">
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campo a evaluar</label>
                <input
                    v-model="localConfig.loopConditionField"
                    type="text"
                    placeholder="contador"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Operador</label>
                <select
                    v-model="localConfig.loopConditionOperator"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    <option v-for="op in conditionOperators" :key="op.value" :value="op.value">
                        {{ op.label }}
                    </option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Valor de comparación
                </label>
                <input
                    v-model="localConfig.loopConditionValue"
                    type="text"
                    placeholder="10"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
        </template>
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Máximo de iteraciones (seguridad)
            </label>
            <input
                v-model.number="localConfig.loopMaxIterations"
                type="number"
                min="1"
                max="1000"
                placeholder="100"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Delay entre iteraciones (ms)
            </label>
            <input
                v-model.number="localConfig.loopDelayMs"
                type="number"
                min="0"
                step="100"
                placeholder="0"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
        <div class="flex items-center gap-2">
            <input
                type="checkbox"
                v-model="localConfig.loopAccumulateResults"
                class="w-4 h-4 text-brand bg-gray-100 border-gray-300 rounded focus:ring-brand dark:focus:ring-brand dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
            <label class="text-sm text-gray-700 dark:text-gray-300">Acumular resultados en variable</label>
        </div>
        <div v-if="localConfig.loopAccumulateResults">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Variable para resultados
            </label>
            <input
                v-model="localConfig.loopResultsVariable"
                type="text"
                placeholder="loop_results"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
    </div>
</template>
