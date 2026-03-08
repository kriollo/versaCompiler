<script setup lang="ts">
    import { computed } from 'vue';

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

    const menuRenderModes = [
        { value: 'generic', label: 'Menú genérico (texto)' },
        { value: 'whatsapp_buttons', label: 'WhatsApp: botones' },
        { value: 'whatsapp_list', label: 'WhatsApp: lista' },
    ];

    const addMenuOption = () => {
        if (!localConfig.value.menuOptions) {
            localConfig.value.menuOptions = [];
        }
        localConfig.value.menuOptions.push({
            id: `option_${Date.now()}`,
            label: '',
            value: '',
            description: '',
            disabled: false,
        });
    };

    const removeMenuOption = (index: number) => {
        if (localConfig.value.menuOptions) {
            localConfig.value.menuOptions.splice(index, 1);
        }
    };
</script>

<template>
    <div class="space-y-4">
        <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Configuración del Menú</h4>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modo de render</label>
            <select
                v-model="localConfig.menuRenderMode"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent">
                <option v-for="mode in menuRenderModes" :key="mode.value" :value="mode.value">
                    {{ mode.label }}
                </option>
            </select>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título del Menú</label>
            <input
                v-model="localConfig.menuTitle"
                type="text"
                placeholder="Selecciona una opción:"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
        </div>

        <div class="flex items-center gap-2">
            <input
                type="checkbox"
                id="menuSingleOutput"
                v-model="localConfig.menuSingleOutput"
                class="w-4 h-4 text-brand bg-gray-100 border-gray-300 rounded focus:ring-brand dark:focus:ring-brand dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
            <label for="menuSingleOutput" class="text-sm text-gray-700 dark:text-gray-300">
                Salida única (usar Router para derivar)
            </label>
        </div>

        <div
            v-if="localConfig.menuSingleOutput"
            class="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-xs text-blue-700 dark:text-blue-300">
            El valor seleccionado se guardará en la variable y saldrá por un único puerto. Usa un nodo Router después
            para derivar el flujo.
        </div>
        <div
            v-else
            class="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-700 dark:text-amber-300">
            Cada opción tendrá su propio puerto de salida. Conecta cada puerto al flujo correspondiente.
        </div>

        <div v-if="localConfig.menuRenderMode === 'whatsapp_list'">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Texto del Botón (WhatsApp List)
            </label>
            <input
                v-model="localConfig.menuButtonText"
                type="text"
                placeholder="Ver opciones"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
        </div>

        <div>
            <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Opciones</label>
                <button
                    @click="addMenuOption"
                    class="px-2 py-1 text-xs font-medium text-brand dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded transition-colors flex items-center gap-1">
                    <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Agregar Opción
                </button>
            </div>

            <div class="space-y-2">
                <div
                    v-for="(option, index) in localConfig.menuOptions"
                    :key="option.id || index"
                    class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div class="space-y-2">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-xs font-medium text-gray-500 dark:text-gray-400">
                                Opción {{ index + 1 }}
                                <span
                                    v-if="option.disabled"
                                    class="ml-2 px-1.5 py-0.5 text-[10px] bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded">
                                    Desactivada
                                </span>
                            </span>
                            <div class="flex items-center gap-2">
                                <button
                                    @click="option.disabled = !option.disabled"
                                    :class="[
                                        option.disabled
                                            ? 'text-gray-400 hover:text-green-500 dark:text-gray-500 dark:hover:text-green-400'
                                            : 'text-green-500 hover:text-gray-400 dark:text-green-400 dark:hover:text-gray-500',
                                    ]"
                                    :title="option.disabled ? 'Activar opción' : 'Desactivar opción'">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            v-if="option.disabled"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        <path
                                            v-else
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </button>
                                <button
                                    @click="removeMenuOption(index)"
                                    class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                                    <svg
                                        class="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg">
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <input
                            v-model="option.label"
                            type="text"
                            placeholder="Etiqueta (ej: Opción 1)"
                            :class="[
                                'w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-900 placeholder-gray-400',
                                option.disabled
                                    ? 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                                    : 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white',
                            ]" />
                        <input
                            v-model="option.value"
                            type="text"
                            placeholder="Valor (ej: option1)"
                            :class="[
                                'w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-900 placeholder-gray-400',
                                option.disabled
                                    ? 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                                    : 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white',
                            ]" />
                        <textarea
                            v-model="option.description"
                            rows="2"
                            placeholder="Descripción (opcional)"
                            :class="[
                                'w-full px-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-900 placeholder-gray-400 resize-none',
                                option.disabled
                                    ? 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                                    : 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white',
                            ]"></textarea>
                    </div>
                </div>

                <div
                    v-if="!localConfig.menuOptions || localConfig.menuOptions.length === 0"
                    class="p-4 text-center text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    No hay opciones. Haz clic en "Agregar Opción" para comenzar.
                </div>
            </div>
        </div>
    </div>
</template>
