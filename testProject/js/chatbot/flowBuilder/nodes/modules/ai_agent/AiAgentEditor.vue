<script setup lang="ts">
    import { computed } from 'vue';

    import ExpandableTextarea from '@/dashboard/js/chatbot/flowBuilder/components/ExpandableTextarea.vue';
    import type { FlowNode, NodeConfig } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

    interface Props {
        modelValue: NodeConfig;
        node: FlowNode;
        env?: {
            aiProviders?: { value: string; label: string }[];
        };
    }

    const props = defineProps<Props>();
    const emit = defineEmits<{
        'update:modelValue': [val: NodeConfig];
        updateNode: [node: FlowNode];
        openMediaStore: [];
    }>();

    const localConfig = computed<NodeConfig>({
        get: () => props.modelValue,
        set: val => {
            emit('update:modelValue', val);
        },
    });

    const aiProviders = props.env?.aiProviders || [
        { value: 'openai', label: 'OpenAI' },
        { value: 'anthropic', label: 'Anthropic' },
        { value: 'google', label: 'Google (Gemini)' },
        { value: 'groq', label: 'Groq' },
        { value: 'mistral', label: 'Mistral' },
        { value: 'other', label: 'Otro (Custom)' },
    ];

    const aiMemorySources = [
        { value: 'session', label: 'Sesión actual' },
        { value: 'database', label: 'Base de datos' },
        { value: 'manual', label: 'Manual' },
    ];

    const addAIActionTooling = () => {
        if (!localConfig.value.aiToolings) {
            localConfig.value.aiToolings = [];
        }
        localConfig.value.aiToolings.push({
            name: '',
            description: '',
            parameters: '{}',
        });
    };

    const removeAIActionTooling = (index: number) => {
        if (localConfig.value.aiToolings) {
            localConfig.value.aiToolings.splice(index, 1);
        }
    };
</script>

<template>
    <div class="space-y-4">
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Proveedor de IA</label>
            <select
                v-model="localConfig.aiProvider"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option v-for="provider in aiProviders" :key="provider.value" :value="provider.value">
                    {{ provider.label }}
                </option>
            </select>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key personalizada</label>
            <input
                v-model="localConfig.aiApiKey"
                type="password"
                placeholder="sk-..."
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modelo</label>
            <input
                v-model="localConfig.aiModel"
                type="text"
                placeholder="gpt-4o, claude-3-sonnet, gemini-1.5-pro..."
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>

        <ExpandableTextarea
            v-model="localConfig.aiPrompt"
            label="Prompt / Instrucciones del Sistema"
            placeholder="Eres un asistente útil que..."
            :rows="6"
            modal-title="Prompt / Instrucciones del Sistema" />

        <div class="p-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg">
            <div class="flex items-start gap-2">
                <i class="bi bi-info-circle text-brand mt-0.5"></i>
                <div class="text-xs text-brand-800 dark:text-brand-300">
                    <span class="font-bold">Conexión de Herramientas:</span>
                    Puedes conectar otros nodos al puerto
                    <span class="font-bold text-indigo-600 dark:text-indigo-400">TOOL</span>
                    de este agente en el canvas para usarlos como herramientas automáticas.
                </div>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Temperatura</label>
                <input
                    v-model.number="localConfig.aiTemperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Tokens</label>
                <input
                    v-model.number="localConfig.aiMaxTokens"
                    type="number"
                    step="100"
                    min="1"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
        </div>

        <div class="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Habilitar Memoria</label>
                <input type="checkbox" v-model="localConfig.aiMemoryEnabled" class="w-4 h-4 text-brand rounded" />
            </div>
            <div v-if="localConfig.aiMemoryEnabled" class="space-y-3 mt-2">
                <div>
                    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Fuente de Memoria
                    </label>
                    <select
                        v-model="localConfig.aiMemorySource"
                        class="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                        <option v-for="source in aiMemorySources" :key="source.value" :value="source.value">
                            {{ source.label }}
                        </option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Límite de mensajes previos
                    </label>
                    <input
                        v-model.number="localConfig.aiMemorySessionLimit"
                        type="number"
                        min="1"
                        max="50"
                        class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
            </div>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Guardar respuesta en variable
            </label>
            <input
                v-model="localConfig.aiResponseVariable"
                type="text"
                placeholder="ai_response"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>

        <div class="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Control de Ejecución
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Max Iteraciones
                    </label>
                    <input
                        v-model.number="localConfig.maxIterations"
                        type="number"
                        min="1"
                        max="20"
                        placeholder="8"
                        class="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
                    <p class="text-[10px] text-gray-400 mt-0.5">Ciclos máximos del agente</p>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Max Profundidad Tools
                    </label>
                    <input
                        v-model.number="localConfig.maxToolDepth"
                        type="number"
                        min="1"
                        max="10"
                        placeholder="3"
                        class="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
                    <p class="text-[10px] text-gray-400 mt-0.5">Anidamiento de tools</p>
                </div>
            </div>
        </div>

        <div class="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Política de Retry
            </div>

            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Max Reintentos
                    </label>
                    <input
                        v-model.number="localConfig.maxRetries"
                        type="number"
                        min="0"
                        max="10"
                        placeholder="3"
                        class="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Delay Base (ms)
                    </label>
                    <input
                        v-model.number="localConfig.retryBaseDelay"
                        type="number"
                        min="100"
                        step="100"
                        placeholder="1000"
                        class="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Delay Max (ms)
                    </label>
                    <input
                        v-model.number="localConfig.retryMaxDelay"
                        type="number"
                        min="1000"
                        step="1000"
                        placeholder="10000"
                        class="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
                </div>
            </div>
            <p class="text-[10px] text-gray-400">Backoff exponencial: delay = baseDelay × 2^intento (hasta maxDelay)</p>
        </div>
    </div>
</template>
