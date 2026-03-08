<script setup lang="ts">
    import { computed, inject, onMounted, ref } from 'vue';

    import ExpandableTextarea from '@/dashboard/js/chatbot/flowBuilder/components/ExpandableTextarea.vue';
    import type { FlowNode, NodeConfig } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaFetch } from '@/dashboard/js/functions';

    interface Queue {
        id: number;
        name: string;
        description: string;
        status: string;
        priority: number;
        agent_count: number;
    }

    interface Props {
        modelValue: NodeConfig;
        node: FlowNode;
    }

    const props = defineProps<Props>();
    const emit = defineEmits<{
        'update:modelValue': [val: NodeConfig];
    }>();

    const panelUrl = inject<string>('panelUrl', '');
    const queues = ref<Queue[]>([]);
    const loadingQueues = ref(false);

    const localConfig = computed<NodeConfig>({
        get: () => props.modelValue,
        set: val => {
            emit('update:modelValue', val);
        },
    });

    const loadQueues = async () => {
        loadingQueues.value = true;
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/queues`,
                method: 'GET',
            });
            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                const paged = response.data as { data: Queue[] };
                queues.value = paged.data.filter(q => q.status === 'active');
            }
        } catch (error) {
            console.error('[SendToEditor] Error al cargar colas:', error);
        } finally {
            loadingQueues.value = false;
        }
    };

    onMounted(() => {
        loadQueues();
    });
</script>

<template>
    <div class="space-y-4">
        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asignar a Cola</label>
            <select
                v-model="localConfig.queueId"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                :disabled="loadingQueues">
                <option value="">{{ loadingQueues ? 'Cargando colas...' : 'Seleccionar cola...' }}</option>
                <option v-for="queue in queues" :key="queue.id" :value="queue.id">
                    {{ queue.name }}
                </option>
            </select>
        </div>

        <ExpandableTextarea
            v-if="localConfig.queueId"
            v-model="localConfig.message"
            label="Mensaje (opcional)"
            placeholder="Mensaje que se enviará antes de la transferencia..."
            :rows="3"
            modal-title="Mensaje" />
    </div>
</template>
