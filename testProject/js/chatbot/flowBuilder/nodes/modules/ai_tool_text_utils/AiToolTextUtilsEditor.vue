<script setup lang="ts">
    import { computed } from 'vue';

    import ExpandableTextarea from '@/dashboard/js/chatbot/flowBuilder/components/ExpandableTextarea.vue';
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

    const toolTextOperations = [
        { value: 'trim', label: 'Trim (eliminar espacios)' },
        { value: 'lower', label: 'Minúsculas' },
        { value: 'upper', label: 'Mayúsculas' },
        { value: 'slug', label: 'Slug (URL-friendly)' },
    ];
</script>

<template>
    <div class="space-y-4">
        <div class="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
            <h4 class="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                Definición de Herramienta para IA
            </h4>
            <div class="space-y-3">
                <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nombre de la herramienta (para la IA)
                    </label>
                    <input
                        v-model="localConfig.toolName"
                        type="text"
                        placeholder="ej: procesar_texto"
                        class="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                </div>
                <ExpandableTextarea
                    v-model="localConfig.toolDescription"
                    label="Descripción (instrucción para la IA)"
                    placeholder="Describe para qué sirve esta herramienta..."
                    :rows="2"
                    modal-title="Descripción de la Herramienta" />
            </div>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Operación por defecto</label>
            <select
                v-model="localConfig.toolTextOperation"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option v-for="op in toolTextOperations" :key="op.value" :value="op.value">
                    {{ op.label }}
                </option>
            </select>
        </div>
        <ExpandableTextarea
            v-model="localConfig.variableValue"
            label="Texto base (fallback)"
            placeholder="Texto de entrada"
            :rows="3"
            modal-title="Texto base" />
    </div>
</template>
