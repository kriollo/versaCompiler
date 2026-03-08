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
</script>

<template>
    <div class="space-y-4">
        <div class="space-y-1">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                📦 Variable fuente (array)
                <span class="text-red-500">*</span>
            </label>
            <input
                v-model="localConfig.listRenderSourceVariable"
                type="text"
                placeholder="feriados_list"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            <p class="text-xs text-gray-500 dark:text-gray-400">
                Nombre de la variable que contiene el array de datos.
            </p>
        </div>

        <div class="space-y-1">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                🔍 Ruta al array
                <span class="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
                v-model="localConfig.listRenderPath"
                type="text"
                placeholder="data.items"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
        </div>

        <div class="space-y-1">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                📋 Encabezado / Título
                <span class="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
                v-model="localConfig.listRenderHeader"
                type="text"
                placeholder="📅 Lista de feriados {{year}}"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
        </div>

        <ExpandableTextarea
            v-model="localConfig.listRenderItemTemplate"
            label="🔧 Template por ítem"
            placeholder="🟢 {{date}} — {{title}} ({{type}})"
            :rows="3"
            modal-title="Template por ítem"
            monospace />

        <div class="space-y-1">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                📄 Pie / Footer
                <span class="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
                v-model="localConfig.listRenderFooter"
                type="text"
                placeholder="📡 Fuente: api.boostr.cl"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
        </div>

        <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">🔢 Máx. ítems</label>
                <input
                    v-model.number="localConfig.listRenderMaxItems"
                    type="number"
                    min="1"
                    max="200"
                    placeholder="50"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            </div>
            <div class="space-y-1">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Env. como mensaje</label>
                <div class="flex items-center h-10">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input
                            v-model="localConfig.listRenderSendMessage"
                            type="checkbox"
                            class="w-4 h-4 rounded border-gray-300 text-lime-500 focus:ring-lime-500" />
                        <span class="text-sm text-gray-700 dark:text-gray-300">Activado</span>
                    </label>
                </div>
            </div>
        </div>

        <div class="space-y-1">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                💾 Variable de salida
                <span class="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
                v-model="localConfig.listRenderOutputVariable"
                type="text"
                placeholder="rendered_list"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
        </div>

        <div class="p-3 bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-700 rounded-lg">
            <p class="text-sm text-lime-800 dark:text-lime-200 font-medium">💡 Cómo funciona</p>
            <p class="text-xs text-lime-700 dark:text-lime-300 mt-1">
                Lee el array de la variable, aplica el template a cada elemento y concatena el resultado. Útil para
                mostrar listas de feriados, productos, resultados de API, etc.
            </p>
        </div>
    </div>
</template>
