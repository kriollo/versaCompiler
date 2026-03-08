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

    const addRouterCase = () => {
        if (!localConfig.value.routerCases) {
            localConfig.value.routerCases = [];
        }
        localConfig.value.routerCases.push({
            id: `case_${Date.now()}`,
            label: '',
            value: '',
        });
    };

    const removeRouterCase = (index: number) => {
        if (localConfig.value.routerCases) {
            localConfig.value.routerCases.splice(index, 1);
        }
    };
</script>

<template>
    <div class="space-y-4">
        <div
            class="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-700 dark:text-amber-300 space-y-1">
            <p class="font-semibold">Distribución por valor de variable</p>
            <p>Cada caso genera un puerto de salida. El último puerto es "por defecto".</p>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Variable a evaluar</label>
            <input
                v-model="localConfig.routerVariable"
                type="text"
                placeholder="tipo_consulta"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Casos de routing</label>
            <div class="space-y-2">
                <div
                    v-for="(caseItem, index) in localConfig.routerCases"
                    :key="caseItem.id"
                    class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">Puerto {{ Number(index) + 1 }}</p>
                    <input
                        v-model="caseItem.label"
                        type="text"
                        placeholder="Etiqueta (ej: Soporte)"
                        class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white mb-2" />
                    <input
                        v-model="caseItem.value"
                        type="text"
                        placeholder="Valor a comparar (ej: soporte)"
                        class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono" />
                    <button
                        @click="removeRouterCase(index)"
                        class="w-full mt-2 px-2 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors">
                        Eliminar Caso
                    </button>
                </div>
            </div>
            <button
                @click="addRouterCase"
                class="w-full mt-2 px-3 py-2 text-sm bg-brand hover:bg-brand dark:bg-brand dark:hover:bg-brand-600 text-white rounded-lg transition-colors">
                + Agregar Caso
            </button>
        </div>
    </div>
</template>
