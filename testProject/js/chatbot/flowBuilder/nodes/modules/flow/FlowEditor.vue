<script setup lang="ts">
    import { computed, onMounted } from 'vue';

    import type { NodeEnvironment } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
    import type { FlowNode, NodeConfig } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

    interface Props {
        modelValue: NodeConfig;
        node: FlowNode;
        env?: NodeEnvironment;
    }

    const props = defineProps<Props>();
    const emit = defineEmits<{
        'update:modelValue': [val: NodeConfig];
        updateNode: [id: string, data: Partial<FlowNode>];
    }>();

    const localConfig = computed({
        get: (): NodeConfig => props.modelValue,
        set: (val: NodeConfig) => {
            emit('update:modelValue', val);
        },
    });

    const loadingFlows = computed(() => props.env?.loadingFlows || false);
    const availableFlows = computed(() => props.env?.availableFlows || []);

    const handleFlowSelection = (flowId: number) => {
        const selectedFlow = availableFlows.value.find((f: any) => f.id === flowId);
        if (selectedFlow) {
            const newConfig = {
                ...localConfig.value,
                linkedFlowId: flowId,
                linkedFlowName: selectedFlow.description,
                linkedFlowDescription: selectedFlow.description,
            };
            emit('update:modelValue', newConfig);
            // También actualizamos el label del nodo para que sea descriptivo
            emit('updateNode', props.node.id, { label: `Flujo: ${selectedFlow.description}` });
        }
    };

    onMounted(() => {
        if (props.env?.loadAvailableFlows && availableFlows.value.length === 0) {
            props.env.loadAvailableFlows();
        }
    });
</script>

<template>
    <div class="space-y-4">
        <!-- Selector de Flujo -->
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seleccionar Flujo</label>
            <div class="relative">
                <select
                    :value="localConfig.linkedFlowId"
                    @change="handleFlowSelection(Number(($event.target as HTMLSelectElement).value))"
                    :disabled="loadingFlows"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed">
                    <option value="">
                        {{ loadingFlows ? 'Cargando flujos...' : 'Seleccionar flujo...' }}
                    </option>
                    <option v-for="flow in availableFlows" :key="flow.id" :value="flow.id">
                        {{ flow.description }} (ID: {{ flow.id }})
                    </option>
                </select>
                <div v-if="loadingFlows" class="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg
                        class="animate-spin h-4 w-4 text-brand"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24">
                        <circle
                            class="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            stroke-width="4"></circle>
                        <path
                            class="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            </div>
        </div>

        <!-- Información del Flujo Seleccionado -->
        <div
            v-if="localConfig.linkedFlowId"
            class="p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-lg">
            <div class="flex items-start gap-2">
                <svg
                    class="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5"
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
                <div class="flex-1 text-sm">
                    <p class="font-medium text-violet-900 dark:text-violet-200">Flujo Vinculado</p>
                    <p class="text-violet-700 dark:text-violet-300 mt-1">
                        {{ localConfig.linkedFlowName }}
                    </p>
                    <p class="text-violet-600 dark:text-violet-400 text-xs mt-1">ID: {{ localConfig.linkedFlowId }}</p>
                </div>
            </div>
        </div>

        <!-- Mensaje Informativo -->
        <div class="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div class="flex items-start gap-2">
                <svg
                    class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
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
                <p class="text-sm text-blue-700 dark:text-blue-300">
                    Cuando el flujo llegue a este nodo, ejecutará el flujo seleccionado y continuará con la siguiente
                    acción una vez finalizado.
                </p>
            </div>
        </div>

        <!-- Botón para recargar flujos -->
        <button
            @click="env?.loadAvailableFlows?.()"
            :disabled="loadingFlows"
            class="w-full px-3 py-2 text-sm font-medium text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/30 hover:bg-violet-200 dark:hover:bg-violet-900/50 border border-violet-300 dark:border-violet-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            <svg
                class="w-4 h-4"
                :class="{ 'animate-spin': loadingFlows }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            {{ loadingFlows ? 'Recargando...' : 'Recargar flujos' }}
        </button>
    </div>
</template>
