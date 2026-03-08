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

    const mediaTypeOptions: { value: MediaType; label: string }[] = [
        { value: 'image', label: '🖼️ Imagen' },
        { value: 'audio', label: '🎧 Audio' },
        { value: 'video', label: '🎬 Video' },
        { value: 'document', label: '📄 Documento' },
        { value: 'location', label: '📍 Ubicación' },
        { value: 'any', label: '📎 Cualquier archivo' },
    ];

    type MediaType = 'image' | 'audio' | 'video' | 'document' | 'location' | 'any';

    const selectedTypes = computed<MediaType[]>({
        get: () => (localConfig.value.inputMediaTypes as MediaType[]) ?? ['any'],
        set: val => {
            localConfig.value = { ...localConfig.value, inputMediaTypes: val };
        },
    });

    const toggleType = (value: MediaType): void => {
        const current = selectedTypes.value;
        if (value === 'any') {
            selectedTypes.value = ['any'];
            return;
        }
        const withoutAny = current.filter(t => t !== 'any');
        if (withoutAny.includes(value)) {
            const next = withoutAny.filter(t => t !== value);
            selectedTypes.value = next.length === 0 ? ['any'] : next;
        } else {
            selectedTypes.value = [...withoutAny, value];
        }
    };

    const isSelected = (value: MediaType): boolean => selectedTypes.value.includes(value);
</script>

<template>
    <div class="space-y-4">
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipos de media aceptados
            </label>
            <div class="flex flex-wrap gap-2">
                <button
                    v-for="opt in mediaTypeOptions"
                    :key="opt.value"
                    type="button"
                    :class="[
                        'px-3 py-1.5 text-xs rounded-full border transition-colors',
                        isSelected(opt.value)
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400',
                    ]"
                    @click="toggleType(opt.value)">
                    {{ opt.label }}
                </button>
            </div>
        </div>

        <ExpandableTextarea
            :model-value="localConfig.inputMediaPrompt ?? ''"
            @update:model-value="val => (localConfig.inputMediaPrompt = val)"
            label="Mensaje al usuario (opcional)"
            placeholder="Por favor envía una imagen o documento..."
            :rows="2"
            modal-title="Mensaje al usuario" />

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Variable donde guardar la URL del archivo
            </label>
            <input
                v-model="localConfig.inputMediaVariable"
                type="text"
                placeholder="media_url"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>

        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Variable para tipo MIME
                </label>
                <input
                    v-model="localConfig.inputMediaMimeVariable"
                    type="text"
                    placeholder="media_mime"
                    class="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Variable para tipo de media
                </label>
                <input
                    v-model="localConfig.inputMediaTypeVariable"
                    type="text"
                    placeholder="media_type"
                    class="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
        </div>

        <div
            class="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-xs text-blue-700 dark:text-blue-300">
            El flujo se pausará hasta que el usuario envíe un archivo del tipo aceptado. En el simulador se genera una
            URL de prueba automáticamente.
        </div>
    </div>
</template>
