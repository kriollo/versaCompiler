<script setup lang="ts">
    import { computed, watch } from 'vue';

    import type { FlowNode, NodeConfig } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

    interface Props {
        modelValue: NodeConfig;
        node: FlowNode;
    }

    const props = defineProps<Props>();
    const emit = defineEmits<{
        'update:modelValue': [val: NodeConfig];
        updateNode: [id: string, data: Partial<FlowNode>];
    }>();

    const localConfig = computed({
        get: (): NodeConfig => props.modelValue,
        set: (val: NodeConfig) => {
            emit('update:modelValue', val);
        },
    });

    watch(
        () => [
            localConfig.value.jsonMenuSingleOutput,
            localConfig.value.jsonMenuMaxItems,
            localConfig.value.jsonMenuOptionZeroEnabled,
        ],
        ([singleOutput, maxItems, optionZeroEnabled]) => {
            const isSingleOutput = singleOutput === true;
            const items: number = (maxItems as number) || 10;
            const hasOptionZero = optionZeroEnabled === true;

            let nextOutputs = 0;
            if (isSingleOutput) {
                nextOutputs = hasOptionZero ? 2 : 1;
            } else {
                nextOutputs = Math.min(items, 10) + (hasOptionZero ? 1 : 0);
            }

            if (props.node.outputs !== nextOutputs) {
                emit('updateNode', props.node.id, {
                    config: { ...localConfig.value },
                    outputs: nextOutputs,
                });
            }
        },
        { immediate: true },
    );
</script>

<template>
    <div class="space-y-4">
        <div
            class="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:bg-orange-700 rounded-lg text-xs text-orange-700 dark:text-orange-300 space-y-1">
            <p class="font-semibold">Menu dinamico desde JSON</p>
            <p>Genera opciones de menu automaticamente desde un array JSON.</p>
            <p>Ideal para catalogos de productos, listas de servicios, etc.</p>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titulo del Menu</label>
            <input
                v-model="localConfig.jsonMenuTitle"
                type="text"
                placeholder="Selecciona un producto:"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Variable con JSON</label>
            <input
                v-model="localConfig.jsonMenuSourceVariable"
                type="text"
                placeholder="productos_api"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Variable que contiene el JSON/array de datos.</p>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ruta al array (opcional)
            </label>
            <input
                v-model="localConfig.jsonMenuPath"
                type="text"
                placeholder="data.products"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Si el array esta anidado, indica la ruta. Ej: "data.items"
            </p>
        </div>

        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campo Label</label>
                <input
                    v-model="localConfig.jsonMenuLabelField"
                    type="text"
                    placeholder="name"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Campo para el texto visible.</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campo Valor</label>
                <input
                    v-model="localConfig.jsonMenuValueField"
                    type="text"
                    placeholder="id"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Campo para el valor interno.</p>
            </div>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Template de Label (opcional)
            </label>
            <input
                v-model="localConfig.jsonMenuLabelTemplate"
                type="text"
                placeholder="{{ name }} - ${{ price }}"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Si especificas un template, se usara en lugar del campo. Usa doble llave para interpolacion.
            </p>
        </div>

        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campo Desc. (opc)</label>
                <input
                    v-model="localConfig.jsonMenuDescriptionField"
                    type="text"
                    placeholder="description"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max. Items</label>
                <input
                    v-model.number="localConfig.jsonMenuMaxItems"
                    type="number"
                    min="1"
                    max="10"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Template de Descripcion (opcional)
            </label>
            <input
                v-model="localConfig.jsonMenuDescriptionTemplate"
                type="text"
                placeholder="{{ category }} | Stock: {{ stock }}"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
        </div>

        <!-- Opción 0 (Opción Especial) -->
        <div
            class="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg space-y-3">
            <div class="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="jsonMenuOptionZeroEnabled"
                    v-model="localConfig.jsonMenuOptionZeroEnabled"
                    class="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                <label for="jsonMenuOptionZeroEnabled" class="text-sm font-medium text-purple-700 dark:text-purple-300">
                    Activar opcion especial (Puerto 0)
                </label>
            </div>

            <div v-if="localConfig.jsonMenuOptionZeroEnabled" class="grid grid-cols-2 gap-3 pl-6">
                <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Label</label>
                    <input
                        v-model="localConfig.jsonMenuOptionZeroLabel"
                        type="text"
                        placeholder="← Volver al menu"
                        class="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Valor</label>
                    <input
                        v-model="localConfig.jsonMenuOptionZeroValue"
                        type="text"
                        placeholder="option_zero"
                        class="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                </div>
            </div>

            <p v-if="localConfig.jsonMenuOptionZeroEnabled" class="text-xs text-purple-600 dark:text-purple-400 pl-6">
                Esta opcion siempre saldra por el
                <strong>puerto 0</strong>
                , independiente del modo de salida unica.
            </p>
        </div>

        <div class="flex items-center gap-2">
            <input
                type="checkbox"
                id="jsonMenuSingleOutput"
                v-model="localConfig.jsonMenuSingleOutput"
                class="w-4 h-4 text-brand bg-gray-100 border-gray-300 rounded focus:ring-brand dark:focus:ring-brand dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
            <label for="jsonMenuSingleOutput" class="text-sm text-gray-700 dark:text-gray-300">
                Salida unica (usar Router para derivar)
            </label>
        </div>

        <div
            class="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <p><strong>Puertos de salida:</strong></p>
            <ul class="list-disc list-inside pl-2">
                <li v-if="localConfig.jsonMenuOptionZeroEnabled">
                    <span class="font-mono">0</span>
                    : Opcion especial "{{ localConfig.jsonMenuOptionZeroLabel || 'Volver' }}"
                </li>
                <li v-if="localConfig.jsonMenuSingleOutput">
                    <span class="font-mono">{{ localConfig.jsonMenuOptionZeroEnabled ? '1' : '0' }}</span>
                    : Seleccion del usuario (guarda en variable)
                </li>
                <li v-else>
                    <span class="font-mono">{{ localConfig.jsonMenuOptionZeroEnabled ? '1-10' : '0-9' }}</span>
                    : Un puerto por cada opcion del menu
                </li>
            </ul>
        </div>
    </div>
</template>
