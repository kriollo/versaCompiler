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

    const localConfig = computed({
        get: (): NodeConfig => props.modelValue,
        set: (val: NodeConfig) => {
            emit('update:modelValue', val);
        },
    });

    const delayUnits = [
        { value: 'seconds', label: 'Segundos' },
        { value: 'minutes', label: 'Minutos' },
        { value: 'hours', label: 'Horas' },
    ];

    // Inicializar valores por defecto si no existen
    if (!localConfig.value.delayTime) {
        localConfig.value.delayTime = 5;
    }
    if (!localConfig.value.delayUnit) {
        localConfig.value.delayUnit = 'seconds';
    }
</script>

<template>
    <div class="space-y-4">
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tiempo de Espera</label>
            <input
                v-model.number="localConfig.delayTime"
                type="number"
                min="1"
                placeholder="5"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unidad</label>
            <select
                v-model="localConfig.delayUnit"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent">
                <option v-for="unit in delayUnits" :key="unit.value" :value="unit.value">
                    {{ unit.label }}
                </option>
            </select>
        </div>
        <ExpandableTextarea
            v-model="localConfig.delayMessage"
            label="Mensaje (opcional)"
            placeholder="En un momento te atendemos..."
            :rows="2"
            modal-title="Mensaje" />
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Este mensaje se mostrará antes de iniciar la espera.
        </p>
    </div>
</template>
