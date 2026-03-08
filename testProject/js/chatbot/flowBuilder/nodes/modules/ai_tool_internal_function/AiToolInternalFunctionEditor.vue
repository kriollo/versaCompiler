<script setup lang="ts">
    import { computed, inject, onMounted, ref, watch } from 'vue';

    import type { FlowNode, NodeConfig } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
    import { versaFetch } from '@/dashboard/js/functions';

    interface InternalFunction {
        name: string;
        description: string;
        category: string;
        parameters?: {
            name: string;
            type: string;
            required: boolean;
            description: string;
            default?: unknown;
        }[];
    }

    interface Props {
        modelValue: NodeConfig;
        node: FlowNode;
        env?: {
            panelUrl?: string;
            empresaSelected?: string;
            csrf_token?: string;
        };
    }

    const props = defineProps<Props>();
    const emit = defineEmits<{
        'update:modelValue': [val: NodeConfig];
    }>();

    const panelUrl = inject<string>('panelUrl', '');

    const localConfig = computed<NodeConfig>({
        get: () => props.modelValue,
        set: val => {
            emit('update:modelValue', val);
        },
    });

    const availableFunctions = ref<InternalFunction[]>([]);
    const loadingFunctions = ref(false);
    const functionsError = ref('');
    const searchQuery = ref('');
    const expandedCategories = ref<Set<string>>(new Set());
    const showFunctionSelector = ref(false);

    const selectedFunction = computed<InternalFunction | undefined>(() => {
        const name = localConfig.value.internalFunctionName;
        return availableFunctions.value.find(f => f.name === name);
    });

    const categoryLabels: Record<string, string> = {
        datetime: 'Fecha y Hora',
        format: 'Formateo',
        text: 'Texto',
        json: 'JSON',
        math: 'Matemáticas',
        utility: 'Utilidades',
        validation: 'Validación',
        agenda: 'Agenda',
        inbox: 'Inbox',
        crm: 'CRM',
        general: 'General',
    };

    const categoryIcons: Record<string, string> = {
        datetime: '📅',
        format: '🔤',
        text: '📝',
        json: '{ }',
        math: '🔢',
        utility: '🔧',
        validation: '✅',
        agenda: '📆',
        inbox: '📥',
        crm: '👥',
        general: '📦',
    };

    const filteredFunctions = computed(() => {
        const query = searchQuery.value.toLowerCase().trim();
        if (!query) {
            return availableFunctions.value;
        }
        return availableFunctions.value.filter(fn => {
            const nameMatch = fn.name.toLowerCase().includes(query);
            const descMatch = fn.description.toLowerCase().includes(query);
            const catMatch = (categoryLabels[fn.category] || fn.category).toLowerCase().includes(query);
            return nameMatch || descMatch || catMatch;
        });
    });

    const groupedFunctions = computed(() => {
        const groups: Record<string, InternalFunction[]> = {};
        for (const fn of filteredFunctions.value) {
            const cat = fn.category || 'general';
            if (!groups[cat]) {
                groups[cat] = [];
            }
            groups[cat].push(fn);
        }
        return groups;
    });

    const sortedCategories = computed(() =>
        Object.keys(groupedFunctions.value).sort((a, b) => {
            const order = [
                'datetime',
                'format',
                'text',
                'json',
                'math',
                'utility',
                'validation',
                'agenda',
                'inbox',
                'crm',
                'general',
            ];
            const indexA = order.indexOf(a);
            const indexB = order.indexOf(b);
            if (indexA === -1 && indexB === -1) {
                return a.localeCompare(b);
            }
            if (indexA === -1) {
                return 1;
            }
            if (indexB === -1) {
                return -1;
            }
            return indexA - indexB;
        }),
    );

    const loadFunctions = async () => {
        loadingFunctions.value = true;
        functionsError.value = '';
        try {
            const empresaToken = props.env?.empresaSelected ?? '';
            const response = await versaFetch({
                url: `/${panelUrl}/chatbot/flowBuilder/api/internal-functions/${empresaToken}`,
                method: 'GET',
            });
            if (response.success === 1 && Array.isArray(response.data)) {
                availableFunctions.value = response.data;
                for (const cat of Object.keys(categoryLabels)) {
                    expandedCategories.value.add(cat);
                }
            } else {
                functionsError.value = 'No se pudieron cargar las funciones';
            }
        } catch (error) {
            functionsError.value = 'Error al cargar funciones';
            console.error('Error loading internal functions:', error);
        } finally {
            loadingFunctions.value = false;
        }
    };

    const initParams = () => {
        if (!selectedFunction.value?.parameters) {
            return;
        }
        const params: Record<string, unknown> = {};
        for (const param of selectedFunction.value.parameters) {
            if (param.default !== undefined) {
                params[param.name] = param.default;
            }
        }
        localConfig.value.internalFunctionParams = params;
    };

    const selectFunction = (fn: InternalFunction) => {
        localConfig.value.internalFunctionName = fn.name;
        showFunctionSelector.value = false;
        searchQuery.value = '';
        initParams();
    };

    const toggleCategory = (category: string) => {
        if (expandedCategories.value.has(category)) {
            expandedCategories.value.delete(category);
        } else {
            expandedCategories.value.add(category);
        }
    };

    watch(selectedFunction, fn => {
        if (fn && !localConfig.value.internalFunctionParams) {
            initParams();
        }
    });

    onMounted(() => {
        loadFunctions();
    });
</script>

<template>
    <div class="space-y-4">
        <div
            class="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg text-xs text-purple-700 dark:text-purple-300 space-y-1">
            <p class="font-semibold">Herramienta para Agente IA</p>
            <p>Esta herramienta permite al agente de IA ejecutar funciones internas del backend.</p>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Función a ejecutar</label>

            <div v-if="loadingFunctions" class="text-sm text-gray-500 py-2">Cargando funciones...</div>
            <div v-else-if="functionsError" class="text-sm text-red-500 py-2">{{ functionsError }}</div>

            <template v-else>
                <button
                    v-if="selectedFunction"
                    @click="showFunctionSelector = true"
                    class="w-full px-3 py-2 text-left text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:border-purple-400 dark:hover:border-purple-500 transition-colors">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-lg">{{ categoryIcons[selectedFunction.category] || '📦' }}</span>
                            <div>
                                <div class="font-medium">{{ selectedFunction.name }}</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">
                                    {{ categoryLabels[selectedFunction.category] || selectedFunction.category }}
                                </div>
                            </div>
                        </div>
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </button>

                <button
                    v-else
                    @click="showFunctionSelector = true"
                    class="w-full px-3 py-2 text-left text-sm border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                    <div class="flex items-center justify-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Seleccionar función...</span>
                    </div>
                </button>
            </template>
        </div>

        <Teleport to="body">
            <div
                v-if="showFunctionSelector"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                @click.self="showFunctionSelector = false">
                <div
                    class="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col m-4">
                    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div class="flex items-center justify-between mb-3">
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Seleccionar Función</h3>
                            <button
                                @click="showFunctionSelector = false"
                                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div class="relative">
                            <svg
                                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                v-model="searchQuery"
                                type="text"
                                placeholder="Buscar función..."
                                class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                        </div>
                        <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {{ filteredFunctions.length }} función{{
                                filteredFunctions.length !== 1 ? 'es' : ''
                            }}
                            disponible{{ filteredFunctions.length !== 1 ? 's' : '' }}
                        </div>
                    </div>

                    <div class="flex-1 overflow-y-auto p-4">
                        <div
                            v-if="filteredFunctions.length === 0"
                            class="text-center py-8 text-gray-500 dark:text-gray-400">
                            <svg
                                class="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p>No se encontraron funciones</p>
                        </div>

                        <div v-else class="space-y-2">
                            <div
                                v-for="category in sortedCategories"
                                :key="category"
                                class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                <button
                                    @click="toggleCategory(category)"
                                    class="w-full px-3 py-2 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
                                    <div class="flex items-center gap-2">
                                        <span class="text-lg">{{ categoryIcons[category] || '📦' }}</span>
                                        <span class="font-medium text-gray-700 dark:text-gray-300">
                                            {{ categoryLabels[category] || category }}
                                        </span>
                                        <span class="text-xs text-gray-400 dark:text-gray-500">
                                            ({{ groupedFunctions[category].length }})
                                        </span>
                                    </div>
                                    <svg
                                        :class="[
                                            'w-4 h-4 text-gray-400 transition-transform',
                                            expandedCategories.has(category) ? 'rotate-180' : '',
                                        ]"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24">
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                <div
                                    v-show="expandedCategories.has(category) || searchQuery"
                                    class="divide-y divide-gray-100 dark:divide-gray-800">
                                    <button
                                        v-for="fn in groupedFunctions[category]"
                                        :key="fn.name"
                                        @click="selectFunction(fn)"
                                        :class="[
                                            'w-full px-4 py-3 text-left hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors',
                                            localConfig.internalFunctionName === fn.name
                                                ? 'bg-purple-100 dark:bg-purple-900/30 border-l-2 border-purple-500'
                                                : '',
                                        ]">
                                        <div class="flex items-start gap-2">
                                            <div class="flex-1 min-w-0">
                                                <div class="font-medium text-gray-900 dark:text-white text-sm">
                                                    {{ fn.name }}
                                                </div>
                                                <div
                                                    class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                                                    {{ fn.description }}
                                                </div>
                                            </div>
                                            <svg
                                                v-if="localConfig.internalFunctionName === fn.name"
                                                class="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5"
                                                fill="currentColor"
                                                viewBox="0 0 20 20">
                                                <path
                                                    fill-rule="evenodd"
                                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                    clip-rule="evenodd" />
                                            </svg>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>

        <div v-if="selectedFunction" class="space-y-3">
            <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p class="text-sm text-gray-700 dark:text-gray-300">{{ selectedFunction.description }}</p>
            </div>

            <div v-if="selectedFunction.parameters && selectedFunction.parameters.length > 0" class="space-y-3">
                <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Parámetros por defecto</h4>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                    El agente IA puede sobrescribir estos valores en tiempo de ejecución.
                </p>

                <div v-for="param in selectedFunction.parameters" :key="param.name" class="space-y-1">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {{ param.name }}
                        <span v-if="param.required" class="text-red-500">*</span>
                        <span v-if="!param.required" class="text-gray-400 text-xs">(opcional)</span>
                    </label>
                    <p v-if="param.description" class="text-xs text-gray-500 dark:text-gray-400">
                        {{ param.description }}
                    </p>
                    <input
                        v-if="param.type === 'string' || param.type === 'number'"
                        :type="param.type === 'number' ? 'number' : 'text'"
                        v-model.number="(localConfig.internalFunctionParams as Record<string, unknown>)[param.name]"
                        :placeholder="param.default !== undefined ? String(param.default) : ''"
                        class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                    <select
                        v-else-if="param.type === 'boolean'"
                        v-model="(localConfig.internalFunctionParams as Record<string, unknown>)[param.name]"
                        class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        <option :value="true">true</option>
                        <option :value="false">false</option>
                    </select>
                    <textarea
                        v-else
                        v-model="(localConfig.internalFunctionParams as Record<string, unknown>)[param.name]"
                        :placeholder="param.default !== undefined ? String(param.default) : ''"
                        rows="2"
                        class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono"></textarea>
                </div>
            </div>

            <div
                v-else
                class="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-xs text-green-700 dark:text-green-300">
                Esta función no requiere parámetros.
            </div>
        </div>

        <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Variable de salida</label>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Variable donde se guardará el resultado de la función.
            </p>
            <input
                v-model="localConfig.internalFunctionOutputVariable"
                type="text"
                placeholder="resultado"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
    </div>
</template>
