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
        set: val => emit('update:modelValue', val),
    });

    const showKeyField = computed(() => ['remember', 'forget'].includes(localConfig.value.memoryOperation ?? 'recall'));
    const showValueField = computed(() => localConfig.value.memoryOperation === 'remember');
    const showAgentHistoryField = computed(() => localConfig.value.memoryOperation === 'summarize');
    const showQueryField = computed(() => localConfig.value.memoryOperation === 'recall');
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
                        d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Definición de Herramienta para IA
            </h4>
            <div class="space-y-3">
                <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nombre de la herramienta
                    </label>
                    <input
                        v-model="localConfig.toolName"
                        type="text"
                        placeholder="ej: gestionar_memoria"
                        class="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                </div>
                <ExpandableTextarea
                    v-model="localConfig.toolDescription"
                    label="Descripción (instrucción para la IA)"
                    placeholder="Usa esta herramienta para recordar información importante entre turnos de conversación..."
                    :rows="2"
                    modal-title="Descripción de la Herramienta" />
            </div>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Operación por defecto</label>
            <select
                v-model="localConfig.memoryOperation"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="remember">remember — Guardar un hecho en memoria</option>
                <option value="recall">recall — Recuperar memorias por búsqueda</option>
                <option value="summarize">summarize — Resumir historial del agente</option>
                <option value="forget">forget — Eliminar una memoria</option>
            </select>
        </div>

        <div v-if="showKeyField">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Clave de memoria (estática o sugerencia)
            </label>
            <input
                v-model="localConfig.memoryKey"
                type="text"
                placeholder="ej: nombre_usuario, preferencia_idioma"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>

        <div v-if="showValueField">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Valor a guardar (estático o sugerencia)
            </label>
            <input
                v-model="localConfig.memoryValue"
                type="text"
                placeholder="ej: {{nombre_usuario}}"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>

        <div v-if="showQueryField">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Consulta de búsqueda (estática o sugerencia)
            </label>
            <input
                v-model="localConfig.memoryKey"
                type="text"
                placeholder="ej: preferencias del usuario"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>

        <div v-if="showAgentHistoryField">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ID del nodo AI Agent cuyo historial resumir
            </label>
            <input
                v-model="localConfig.memoryAgentHistoryKey"
                type="text"
                placeholder="ej: agent-node-id-123"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                El historial se busca en la variable
                <code class="font-mono">history_{'{agentId}'}</code>
            </p>
        </div>

        <div
            class="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg text-xs text-purple-700 dark:text-purple-300">
            La memoria persiste en
            <code class="font-mono">__memory_store</code>
            durante toda la sesión. Úsala para que el agente recuerde hechos clave entre turnos.
        </div>
    </div>
</template>
