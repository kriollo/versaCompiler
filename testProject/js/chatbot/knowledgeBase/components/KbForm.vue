<script setup lang="ts">
    import { computed, onMounted, ref } from 'vue';

    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaFetch } from '@/dashboard/js/functions';

    interface KbItem {
        id: number;
        name: string;
        description?: string;
        chunk_size: number;
        chunk_overlap: number;
        flow_id?: number;
    }

    interface Props {
        kb: KbItem | null;
        csrfToken: string;
        panelUrl: string;
        empresaSelected: string;
    }

    const props = defineProps<Props>();
    const emit = defineEmits<{
        save: [];
        cancel: [];
    }>();

    const isEditing = computed(() => Boolean(props.kb?.id));

    const form = ref({
        id: 0,
        name: '',
        description: '',
        chunk_size: 500,
        chunk_overlap: 100,
        flow_id: null as number | null,
    });

    const loading = ref(false);
    const errors = ref<Record<string, string>>({});

    onMounted(() => {
        if (props.kb) {
            form.value = {
                id: props.kb.id,
                name: props.kb.name,
                description: props.kb.description || '',
                chunk_size: props.kb.chunk_size || 500,
                chunk_overlap: props.kb.chunk_overlap || 100,
                flow_id: props.kb.flow_id || null,
            };
        }
    });

    const validate = (): boolean => {
        errors.value = {};

        if (!form.value.name.trim()) {
            errors.value.name = 'El nombre es requerido';
        }

        if (form.value.chunk_size < 100 || form.value.chunk_size > 2000) {
            errors.value.chunk_size = 'El tamaño debe estar entre 100 y 2000';
        }

        if (form.value.chunk_overlap < 0 || form.value.chunk_overlap >= form.value.chunk_size) {
            errors.value.chunk_overlap = 'El overlap debe ser menor que el tamaño del chunk';
        }

        return Object.keys(errors.value).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) {
            return;
        }

        loading.value = true;
        try {
            const endpoint = isEditing.value ? 'update' : 'create';
            const response = await versaFetch({
                url: `/${props.panelUrl}/chatbot/knowledge-base/api/${endpoint}/${props.empresaSelected}`,
                method: 'POST',
                data: JSON.stringify(form.value),
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': props.csrfToken,
                },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                emit('save');
            } else {
                errors.value.general = response.message || 'Error al guardar';
            }
        } catch {
            errors.value.general = 'Error de conexión';
        } finally {
            loading.value = false;
        }
    };
</script>

<template>
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ isEditing ? 'Editar Base de Conocimiento' : 'Nueva Base de Conocimiento' }}
            </h2>
        </div>

        <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
            <div
                v-if="errors.general"
                class="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                {{ errors.general }}
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre
                    <span class="text-red-500">*</span>
                </label>
                <input
                    v-model="form.name"
                    type="text"
                    placeholder="Ej: FAQs de productos"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand/50 focus:border-brand" />
                <p v-if="errors.name" class="mt-1 text-xs text-red-500">{{ errors.name }}</p>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                <textarea
                    v-model="form.description"
                    rows="3"
                    placeholder="Describe el contenido de esta base de conocimiento..."
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"></textarea>
            </div>

            <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div class="flex items-center gap-2">
                    <svg
                        class="w-5 h-5 text-blue-600 dark:text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="text-sm font-medium text-blue-800 dark:text-blue-200">Modelo de Embedding</span>
                </div>
                <p class="mt-1 text-sm text-blue-700 dark:text-blue-300">
                    <strong>all-mpnet-base-v2</strong>
                    (768 dimensiones)
                </p>
                <p class="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Modelo de alta precisión para búsqueda semántica.
                </p>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tamaño de Chunk
                    </label>
                    <input
                        v-model.number="form.chunk_size"
                        type="number"
                        min="100"
                        max="2000"
                        class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    <p v-if="errors.chunk_size" class="mt-1 text-xs text-red-500">{{ errors.chunk_size }}</p>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Caracteres por fragmento</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Overlap de Chunk
                    </label>
                    <input
                        v-model.number="form.chunk_overlap"
                        type="number"
                        min="0"
                        :max="form.chunk_size - 1"
                        class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    <p v-if="errors.chunk_overlap" class="mt-1 text-xs text-red-500">{{ errors.chunk_overlap }}</p>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Caracteres de solapamiento</p>
                </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    type="button"
                    @click="emit('cancel')"
                    class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    Cancelar
                </button>
                <button
                    type="submit"
                    :disabled="loading"
                    class="px-4 py-2 text-sm font-medium text-white bg-brand hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors">
                    <span v-if="loading" class="flex items-center">
                        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
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
                        Guardando...
                    </span>
                    <span v-else>{{ isEditing ? 'Actualizar' : 'Crear' }}</span>
                </button>
            </div>
        </form>
    </div>
</template>
