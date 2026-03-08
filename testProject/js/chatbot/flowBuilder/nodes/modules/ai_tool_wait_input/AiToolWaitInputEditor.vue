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
                        placeholder="ej: preguntar_usuario"
                        class="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                </div>
                <ExpandableTextarea
                    v-model="localConfig.toolDescription"
                    label="Descripción (instrucción para la IA)"
                    placeholder="Usa esta herramienta cuando necesites hacer una pregunta al usuario y esperar su respuesta antes de continuar..."
                    :rows="2"
                    modal-title="Descripción de la Herramienta" />
            </div>
        </div>

        <ExpandableTextarea
            v-model="localConfig.toolWaitQuestion"
            label="Pregunta por defecto (el agente puede sobrescribir)"
            placeholder="ej: ¿Podrías darme más detalles sobre tu solicitud?"
            :rows="2"
            modal-title="Pregunta por defecto" />

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Variable donde guardar la respuesta del usuario
            </label>
            <input
                v-model="localConfig.toolWaitVariable"
                type="text"
                placeholder="__agent_user_input"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo de validación esperada
            </label>
            <select
                v-model="localConfig.toolWaitValidation"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="text">Texto libre</option>
                <option value="number">Número</option>
                <option value="email">Email</option>
                <option value="phone">Teléfono</option>
                <option value="date">Fecha</option>
            </select>
        </div>

        <div
            class="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg text-xs text-purple-700 dark:text-purple-300">
            Pausa el loop agentic y espera la respuesta del usuario. El agente retoma con la respuesta disponible en la
            variable configurada.
        </div>
    </div>
</template>
