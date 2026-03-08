<script setup lang="ts">
    import { computed, onMounted } from 'vue';

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

    onMounted(() => {
        const config = { ...props.modelValue };
        let changed = false;

        if (config.ratingMin === undefined) {
            config.ratingMin = 1;
            changed = true;
        }
        if (config.ratingMax === undefined) {
            config.ratingMax = 5;
            changed = true;
        }

        if (changed) {
            emit('update:modelValue', config);
        }
    });
</script>

<template>
    <div class="space-y-4">
        <ExpandableTextarea
            v-model="localConfig.ratingMessage"
            label="Mensaje de Valoración"
            placeholder="Ej: ¿Cómo calificarías nuestro servicio?"
            :rows="3"
            modal-title="Mensaje de Valoración" />

        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nota Mínima</label>
                <input
                    v-model.number="localConfig.ratingMin"
                    type="number"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nota Máxima</label>
                <input
                    v-model.number="localConfig.ratingMax"
                    type="number"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
            </div>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guardar en Variable</label>
            <input
                v-model="localConfig.ratingVariable"
                type="text"
                placeholder="nota_cliente"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mensaje de error (opcional)
            </label>
            <input
                v-model="localConfig.ratingErrorMessage"
                type="text"
                placeholder="Por favor, ingresa una nota válida"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
        </div>
    </div>
</template>
