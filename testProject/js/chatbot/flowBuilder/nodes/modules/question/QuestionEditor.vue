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

    const answerTypes = [
        { value: 'text', label: 'Texto' },
        { value: 'number', label: 'Número' },
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Teléfono' },
        { value: 'url', label: 'URL' },
        { value: 'date', label: 'Fecha (YYYY-MM-DD)' },
        { value: 'regex', label: 'Regex personalizada' },
    ];

    const buildRegexFromPattern = (rawPattern: string): RegExp => {
        const trimmedPattern = rawPattern.trim();
        let source = trimmedPattern;
        let flags = '';

        if (trimmedPattern.startsWith('/') && trimmedPattern.lastIndexOf('/') > 0) {
            const lastSlashIndex = trimmedPattern.lastIndexOf('/');
            source = trimmedPattern.slice(1, lastSlashIndex);
            flags = trimmedPattern.slice(lastSlashIndex + 1);
        }

        if (source.startsWith('(?i)')) {
            source = source.slice(4);
            if (!flags.includes('i')) {
                flags += 'i';
            }
        }
        return new RegExp(source, flags);
    };

    const regexValidationState = computed(() => {
        if (localConfig.value.expectedAnswer !== 'regex') {
            return null;
        }

        const pattern = (localConfig.value.validationPattern || '').trim();
        if (!pattern) {
            return {
                valid: false,
                message: 'Regex requerido: ingresa un patrón para validar respuestas.',
            };
        }

        try {
            buildRegexFromPattern(pattern);
            return {
                valid: true,
                message: 'Regex válido.',
            };
        } catch {
            return {
                valid: false,
                message: 'Regex inválido: revisa la sintaxis del patrón.',
            };
        }
    });
</script>

<template>
    <div class="space-y-4">
        <ExpandableTextarea
            v-model="localConfig.question"
            label="Pregunta"
            placeholder="¿Qué pregunta deseas hacer?"
            :rows="3"
            modal-title="Pregunta" />

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo de Respuesta Esperada
            </label>
            <select
                v-model="localConfig.expectedAnswer"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent">
                <option v-for="type in answerTypes" :key="type.value" :value="type.value">
                    {{ type.label }}
                </option>
            </select>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guardar en Variable</label>
            <input
                v-model="localConfig.variableName"
                type="text"
                placeholder="nombre_variable"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
        </div>

        <div v-if="localConfig.expectedAnswer === 'regex'">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Patrón Regex</label>
            <input
                v-model="localConfig.validationPattern"
                type="text"
                placeholder="^[A-Z]{3}-\\d{4}$"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent font-mono" />

            <p
                v-if="regexValidationState"
                :class="
                    regexValidationState.valid
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                "
                class="mt-1 text-xs">
                {{ regexValidationState.message }}
            </p>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mensaje de validación (opcional)
            </label>
            <input
                v-model="localConfig.validationErrorMessage"
                type="text"
                placeholder="La respuesta no cumple el formato esperado"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
        </div>
    </div>
</template>
