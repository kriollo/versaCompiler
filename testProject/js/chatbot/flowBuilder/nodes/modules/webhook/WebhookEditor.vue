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

    const localConfig = computed({
        get: (): NodeConfig => props.modelValue,
        set: (val: NodeConfig) => {
            emit('update:modelValue', val);
        },
    });
</script>

<template>
    <div class="space-y-4">
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre del evento (opcional)
            </label>
            <input
                v-model="localConfig.webhookEventName"
                type="text"
                placeholder="nuevo_pago"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Variable para payload</label>
            <input
                v-model="localConfig.webhookPayloadVariable"
                type="text"
                placeholder="webhook_payload"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
        </div>

        <div
            class="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 rounded-lg text-sm text-rose-700 dark:text-rose-300 italic">
            Este nodo espera un payload JSON de webhook, lo guarda en la variable indicada y luego continúa por su
            salida principal.
        </div>
    </div>
</template>
