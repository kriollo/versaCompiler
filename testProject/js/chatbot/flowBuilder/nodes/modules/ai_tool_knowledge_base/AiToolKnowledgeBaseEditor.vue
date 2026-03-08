<script setup lang="ts">
    import { computed, inject, onMounted, ref } from 'vue';

    import ExpandableTextarea from '@/dashboard/js/chatbot/flowBuilder/components/ExpandableTextarea.vue';
    import type { FlowNode, NodeConfig } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaFetch } from '@/dashboard/js/functions';

    interface Props {
        modelValue: NodeConfig;
        node: FlowNode;
    }

    const props = defineProps<Props>();
    const emit = defineEmits<{
        'update:modelValue': [val: NodeConfig];
    }>();

    const panelUrl = inject<string>('panelUrl', '');

    const localConfig = computed<NodeConfig>({
        get: () => props.modelValue,
        set: val => emit('update:modelValue', val),
    });

    interface KbItem {
        id: number;
        name: string;
        stats?: {
            total_documents: number;
            ready_documents: number;
        };
    }

    const knowledgeBases = ref<KbItem[]>([]);
    const loadingKbs = ref(false);

    const fetchKnowledgeBases = async () => {
        loadingKbs.value = true;
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/chatbot/knowledge-base/api/list/${panelUrl}?per_page=100`,
                method: 'GET',
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                knowledgeBases.value = response.data || [];
            }
        } catch (error) {
            console.error('Error fetching knowledge bases:', error);
        } finally {
            loadingKbs.value = false;
        }
    };

    const selectedKb = computed(() => {
        const id = localConfig.value.kbId;
        if (!id) {
            return null;
        }
        return knowledgeBases.value.find(kb => String(kb.id) === String(id));
    });

    onMounted(() => {
        fetchKnowledgeBases();
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
                        placeholder="ej: buscar_en_documentos"
                        class="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                </div>
                <ExpandableTextarea
                    v-model="localConfig.toolDescription"
                    label="Descripción (instrucción para la IA)"
                    placeholder="Busca información en la base de conocimiento interna cuando el usuario pregunte sobre productos, políticas o procedimientos..."
                    :rows="2"
                    modal-title="Descripción de la Herramienta" />
            </div>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base de Conocimiento</label>
            <div class="relative">
                <select
                    v-model="localConfig.kbId"
                    :disabled="loadingKbs"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white appearance-none cursor-pointer disabled:opacity-50">
                    <option value="">Seleccionar base de conocimiento...</option>
                    <option v-for="kb in knowledgeBases" :key="kb.id" :value="String(kb.id)">
                        {{ kb.name }} ({{ kb.stats?.ready_documents || 0 }} docs listos)
                    </option>
                </select>
                <div class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg v-if="loadingKbs" class="animate-spin w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24">
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
                    <svg v-else class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            <div v-if="selectedKb" class="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ selectedKb.stats?.total_documents || 0 }} documentos,
                {{ selectedKb.stats?.ready_documents || 0 }} listos para búsqueda
            </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Resultados máximos (top-k)
                </label>
                <input
                    v-model.number="localConfig.kbTopK"
                    type="number"
                    min="1"
                    max="20"
                    placeholder="3"
                    class="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Similitud mínima (0–1)
                </label>
                <input
                    v-model.number="localConfig.kbMinScore"
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    placeholder="0.5"
                    class="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Variable donde guardar los resultados
            </label>
            <input
                v-model="localConfig.kbOutputVariable"
                type="text"
                placeholder="__kb_results"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>

        <div
            class="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg text-xs text-purple-700 dark:text-purple-300">
            Realiza búsqueda semántica (RAG) en la base de conocimiento configurada. Retorna fragmentos relevantes
            basados en la similitud del texto.
        </div>
    </div>
</template>
