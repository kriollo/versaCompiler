<script setup lang="ts">
    import { computed } from 'vue';

    import type { FlowNode, NodeConfig } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

    interface SchemaField {
        field: string;
        type: 'string' | 'number' | 'boolean' | 'array';
        description?: string;
        required?: boolean;
        defaultValue?: unknown;
    }

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

    const schema = computed<SchemaField[]>({
        get: () => (localConfig.value.structuredSchema as SchemaField[]) ?? [],
        set: val => {
            localConfig.value = { ...localConfig.value, structuredSchema: val };
        },
    });

    const addField = (): void => {
        schema.value = [
            ...schema.value,
            { field: '', type: 'string', description: '', required: false, defaultValue: '' },
        ];
    };

    const removeField = (index: number): void => {
        schema.value = schema.value.filter((_, i) => i !== index);
    };

    const updateField = (index: number, key: keyof SchemaField, value: unknown): void => {
        const updated = [...schema.value];
        updated[index] = { ...updated[index], [key]: value } as SchemaField;
        schema.value = updated;
    };
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
                        placeholder="ej: extraer_datos_usuario"
                        class="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Descripción (instrucción para la IA)
                    </label>
                    <textarea
                        v-model="localConfig.toolDescription"
                        rows="2"
                        placeholder="Extrae los datos estructurados del mensaje del usuario según el esquema definido..."
                        class="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"></textarea>
                </div>
            </div>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Variable fuente (opcional)
            </label>
            <input
                v-model="localConfig.structuredSourceVariable"
                type="text"
                placeholder="ej: ultimo_mensaje_usuario (vacío = último mensaje)"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Variable de salida</label>
            <input
                v-model="localConfig.structuredOutputVariable"
                type="text"
                placeholder="__structured_data"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>

        <div>
            <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Esquema de campos</label>
                <button
                    type="button"
                    class="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50"
                    @click="addField">
                    + Agregar campo
                </button>
            </div>

            <div v-if="schema.length === 0" class="text-xs text-gray-400 dark:text-gray-500 italic py-2 text-center">
                Sin campos definidos. Agrega al menos uno.
            </div>

            <div
                v-for="(field, index) in schema"
                :key="index"
                class="mb-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
                <div class="flex gap-2">
                    <input
                        :value="field.field"
                        type="text"
                        placeholder="nombre_campo"
                        class="flex-1 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono"
                        @input="updateField(index, 'field', ($event.target as HTMLInputElement).value)" />
                    <select
                        :value="field.type"
                        class="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        @change="updateField(index, 'type', ($event.target as HTMLSelectElement).value)">
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="array">array</option>
                    </select>
                    <label class="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        <input
                            type="checkbox"
                            :checked="field.required"
                            class="rounded"
                            @change="updateField(index, 'required', ($event.target as HTMLInputElement).checked)" />
                        Req.
                    </label>
                    <button type="button" class="text-red-400 hover:text-red-600 text-xs" @click="removeField(index)">
                        ✕
                    </button>
                </div>
                <input
                    :value="field.description"
                    type="text"
                    placeholder="Descripción del campo (ayuda a la IA)"
                    class="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    @input="updateField(index, 'description', ($event.target as HTMLInputElement).value)" />
            </div>
        </div>

        <div
            class="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg text-xs text-purple-700 dark:text-purple-300">
            Extrae datos estructurados de texto o JSON. El agente puede pasar texto del usuario y recibir de vuelta un
            objeto tipado según el esquema definido.
        </div>
    </div>
</template>
