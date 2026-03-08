<template>
    <div class="relative">
        <button
            @click="isOpen = !isOpen"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <div class="w-3 h-3 rounded-full" :class="getStatusColor(currentStatus)"></div>
            <span class="text-sm text-white">{{ currentLabel }}</span>
            <svg class="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
        </button>

        <div
            v-if="isOpen"
            class="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
            <div
                v-if="errorMessage"
                class="mx-3 mb-2 px-2 py-1.5 text-xs rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                {{ errorMessage }}
            </div>

            <button
                v-for="option in availableStatuses"
                :key="option.value"
                @click="selectStatus(option.value)"
                class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                :class="{ 'bg-gray-50 dark:bg-gray-700/50': currentStatus === option.value }">
                <div class="w-3 h-3 rounded-full" :class="getStatusColor(option.value)"></div>
                <div class="flex-1 text-left">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ option.label }}</p>
                    <p
                        v-if="option.value === 'custom' && currentStatus === 'custom'"
                        class="text-xs text-gray-500 dark:text-gray-400">
                        {{ customLabel || 'Sin etiqueta' }}
                    </p>
                </div>
                <svg
                    v-if="currentStatus === option.value"
                    class="w-5 h-5 text-teal-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
            </button>

            <div
                v-if="currentStatus === 'custom'"
                class="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 px-4 pb-3">
                <input
                    v-model="customLabelInput"
                    type="text"
                    placeholder="Etiqueta personalizada..."
                    class="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    @keydown.enter="saveCustomLabel" />
            </div>
        </div>

        <div v-if="isOpen" class="fixed inset-0 z-40" @click="isOpen = false"></div>
    </div>
</template>

<script setup lang="ts">
    import { computed, inject, onMounted, ref, watch } from 'vue';

    import type { AgentStatusOption, AgentStatusValue } from '@/dashboard/js/chatbot/inbox/types';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaFetch } from '@/dashboard/js/functions';

    const props = defineProps<{
        initialStatus?: AgentStatusValue;
        initialCustomLabel?: string;
    }>();

    const emit = defineEmits<{
        'status-changed': [
            data: { status: AgentStatusValue; customLabel?: string; queues?: number[]; capacity?: number },
        ];
    }>();

    const emitStatusChanged = (payload: {
        status: AgentStatusValue;
        customLabel?: string;
        queues?: number[];
        capacity?: number;
    }) => {
        emit('status-changed', payload);
    };

    const csrf_token = inject<string>('csrf_token');
    const panelUrl = inject<string>('panelUrl', '');

    const isOpen = ref(false);
    const currentStatus = ref<AgentStatusValue>(props.initialStatus || 'offline');
    const customLabel = ref(props.initialCustomLabel || '');
    const customLabelInput = ref(customLabel.value);
    const errorMessage = ref('');
    const availableStatuses = ref<AgentStatusOption[]>([
        { value: 'online', label: 'En línea', color: 'green', icon: 'online' },
        { value: 'away', label: 'Ausente', color: 'yellow', icon: 'away' },
        { value: 'busy', label: 'Ocupado', color: 'red', icon: 'busy' },
        { value: 'offline', label: 'Desconectado', color: 'gray', icon: 'offline' },
        { value: 'custom', label: 'Personalizado', color: 'purple', icon: 'custom' },
    ]);

    const currentLabel = computed(() => {
        const status = availableStatuses.value.find(s => s.value === currentStatus.value);
        if (currentStatus.value === 'custom' && customLabel.value) {
            return customLabel.value;
        }
        return status?.label || 'Desconectado';
    });

    watch(
        () => props.initialStatus,
        newVal => {
            if (newVal) {
                currentStatus.value = newVal;
            }
        },
    );

    watch(
        () => props.initialCustomLabel,
        newVal => {
            customLabel.value = newVal || '';
            customLabelInput.value = customLabel.value;
        },
    );

    const loadStatus = async () => {
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/agent/status`,
                method: 'GET',
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                const data = response.data as any;
                currentStatus.value = data.status || 'offline';
                customLabel.value = data.custom_status_label || '';
                customLabelInput.value = customLabel.value;
                errorMessage.value = '';

                if (data.available_statuses) {
                    availableStatuses.value = data.available_statuses;
                }

                emitStatusChanged({
                    status: currentStatus.value,
                    customLabel: customLabel.value,
                    queues: data.queues,
                    capacity: data.capacity,
                });
            }
        } catch (error) {
            errorMessage.value = 'No se pudo cargar el estado del agente';
            console.error('[AgentStatusSelector] Error al cargar estado:', error);
        }
    };

    const selectStatus = async (status: AgentStatusValue) => {
        if (status === 'custom') {
            if (currentStatus.value !== 'custom') {
                currentStatus.value = 'custom';
                customLabelInput.value = '';
            }
            return;
        }

        currentStatus.value = status;
        customLabel.value = '';
        isOpen.value = false;

        await saveStatus(status);
    };

    const saveCustomLabel = async () => {
        if (customLabelInput.value.trim()) {
            customLabel.value = customLabelInput.value.trim();
            await saveStatus('custom', customLabel.value);
        }
    };

    const saveStatus = async (status: AgentStatusValue, customLabelValue?: string) => {
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/agent/status`,
                method: 'PUT',
                data: JSON.stringify({
                    status,
                    custom_status_label: customLabelValue || customLabel.value,
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrf_token ?? '',
                },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                errorMessage.value = '';
                emitStatusChanged({
                    status,
                    customLabel: customLabelValue || customLabel.value,
                });
            } else {
                errorMessage.value = 'No se pudo actualizar el estado';
            }
        } catch (error) {
            errorMessage.value = 'No se pudo actualizar el estado';
            console.error('[AgentStatusSelector] Error al guardar estado:', error);
        }
    };

    const getStatusColor = (status: AgentStatusValue): string => {
        const colors: Record<AgentStatusValue, string> = {
            online: 'bg-green-400',
            away: 'bg-yellow-400',
            busy: 'bg-red-400',
            offline: 'bg-gray-400',
            custom: 'bg-purple-400',
        };
        return colors[status] ?? colors.offline;
    };

    onMounted(() => {
        loadStatus();
    });
</script>
