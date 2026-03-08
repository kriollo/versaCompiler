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

    const validationOptions = [
        { value: 'none', label: 'Sin validación' },
        { value: 'rut', label: 'RUT chileno' },
        { value: 'email', label: 'Email' },
        { value: 'phone_cl', label: 'Teléfono Chile (569XXXXXXXX)' },
        { value: 'regex', label: 'Regex personalizada' },
    ];

    const addField = () => {
        if (!localConfig.value.customerFields) {
            localConfig.value.customerFields = [];
        }
        localConfig.value.customerFields.push({
            key: '',
            label: '',
            prompt: '',
            required: true,
            validation: 'none',
            pattern: '',
            errorMessage: '',
        });
    };

    const removeField = (index: number) => {
        if (!localConfig.value.customerFields) {
            return;
        }
        localConfig.value.customerFields.splice(index, 1);
    };
</script>

<template>
    <div class="space-y-4">
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mensaje general (opcional)
            </label>
            <input
                v-model="localConfig.customerPrompt"
                type="text"
                placeholder="Por favor ingresa {{field}}"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mensaje de introducción (opcional)
            </label>
            <input
                v-model="localConfig.customerIntroMessage"
                type="text"
                placeholder="Para continuar, necesitamos algunos datos..."
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mensaje si existe (opcional)
            </label>
            <input
                v-model="localConfig.customerExistsMessage"
                type="text"
                placeholder="Hola {{customer_register.nombre}}, bienvenido de nuevo"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mensaje al completar registro (opcional)
            </label>
            <input
                v-model="localConfig.customerSuccessMessage"
                type="text"
                placeholder="Gracias {{customer_register.nombre}}, datos guardados"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mensaje de error general (opcional)
            </label>
            <input
                v-model="localConfig.customerErrorMessage"
                type="text"
                placeholder="El valor ingresado no es válido"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
        </div>

        <div class="flex items-center gap-2">
            <input
                id="customer-validate-input"
                v-model="localConfig.customerValidateInput"
                type="checkbox"
                class="h-4 w-4 text-brand border-gray-300 dark:border-gray-600 rounded" />
            <label for="customer-validate-input" class="text-sm text-gray-700 dark:text-gray-300">
                Cliente valida ingreso
            </label>
        </div>

        <div class="space-y-2">
            <div class="flex items-center justify-between">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Campos</label>
                <button
                    type="button"
                    @click="addField"
                    class="px-2 py-1 text-xs font-medium text-brand hover:underline">
                    Agregar campo
                </button>
            </div>

            <div
                v-for="(field, index) in localConfig.customerFields"
                :key="index"
                class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                <input
                    v-model="field.key"
                    type="text"
                    placeholder="key (ej: rut)"
                    class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
                <input
                    v-model="field.label"
                    type="text"
                    placeholder="Label (ej: RUT)"
                    class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
                <input
                    v-model="field.prompt"
                    type="text"
                    placeholder="Prompt específico (opcional)"
                    class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
                <select
                    v-model="field.validation"
                    class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                    <option v-for="option in validationOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </option>
                </select>
                <input
                    v-if="field.validation === 'regex'"
                    v-model="field.pattern"
                    type="text"
                    placeholder="Regex (sin delimitadores)"
                    class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded font-mono bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
                <input
                    v-model="field.errorMessage"
                    type="text"
                    placeholder="Mensaje de error (opcional)"
                    class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
                <label class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <input v-model="field.required" type="checkbox" />
                    Requerido
                </label>
                <button
                    type="button"
                    @click="removeField(index)"
                    class="w-full px-2 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600">
                    Eliminar campo
                </button>
            </div>
        </div>
    </div>
</template>
