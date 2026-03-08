<template>
    <div
        v-if="show"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="$emit('close')">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Cerrar Ticket</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Selecciona una razón y agrega una observación opcional
                </p>
            </div>

            <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
                <div
                    v-if="errorMessage"
                    class="px-3 py-2 text-sm rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                    {{ errorMessage }}
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Razón de cierre *
                    </label>
                    <div class="space-y-2">
                        <button
                            v-for="reason in reasons"
                            :key="reason.id"
                            type="button"
                            @click="selectedReason = reason.id"
                            class="w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left"
                            :class="
                                selectedReason === reason.id
                                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            ">
                            <div
                                class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                                :class="
                                    selectedReason === reason.id
                                        ? 'border-teal-500 bg-teal-500'
                                        : 'border-gray-300 dark:border-gray-600'
                                ">
                                <svg
                                    v-if="selectedReason === reason.id"
                                    class="w-3 h-3 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="3"
                                        d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div class="flex-1">
                                <p class="font-medium text-gray-900 dark:text-white">{{ reason.name }}</p>
                                <p v-if="reason.description" class="text-xs text-gray-500 dark:text-gray-400">
                                    {{ reason.description }}
                                </p>
                            </div>
                            <span class="px-2 py-0.5 text-xs rounded-full" :class="getTypeClass(reason.type)">
                                {{ getTypeLabel(reason.type) }}
                            </span>
                        </button>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Observación (opcional)
                    </label>
                    <textarea
                        v-model="observation"
                        rows="3"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="Agrega detalles sobre la resolución del ticket..."></textarea>
                </div>

                <div class="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        @click="$emit('close')"
                        class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        :disabled="!selectedReason || loading"
                        class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {{ loading ? 'Cerrando...' : 'Cerrar Ticket' }}
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { inject, onMounted, ref } from 'vue';

    import type { CloseReason, CloseReasonType } from '@/dashboard/js/chatbot/inbox/types';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaFetch } from '@/dashboard/js/functions';

    const props = defineProps<{
        show: boolean;
        ticketId: string | number;
    }>();

    const emit = defineEmits<{
        close: [];
        closed: [];
    }>();

    const csrf_token = inject<string>('csrf_token');
    const panelUrl = inject<string>('panelUrl', '');

    const reasons = ref<CloseReason[]>([]);
    const selectedReason = ref<number | null>(null);
    const observation = ref('');
    const loading = ref(false);
    const errorMessage = ref('');

    const loadReasons = async () => {
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/close-reasons`,
                method: 'GET',
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                errorMessage.value = '';
                reasons.value = response.data as CloseReason[];
            } else {
                errorMessage.value = 'No se pudieron cargar las razones de cierre';
            }
        } catch (error) {
            errorMessage.value = 'No se pudieron cargar las razones de cierre';
            console.error('[CloseTicketModal] Error al cargar razones:', error);
        }
    };

    const handleSubmit = async () => {
        if (!selectedReason.value) {
            return;
        }

        loading.value = true;
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/tickets/${props.ticketId}/close-with-reason`,
                method: 'POST',
                data: JSON.stringify({
                    close_reason_id: selectedReason.value,
                    close_observation: observation.value.trim() || null,
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrf_token ?? '',
                },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                errorMessage.value = '';
                emit('closed');
                resetForm();
            } else {
                errorMessage.value = 'No se pudo cerrar el ticket';
            }
        } catch (error) {
            errorMessage.value = 'No se pudo cerrar el ticket';
            console.error('[CloseTicketModal] Error al cerrar ticket:', error);
        } finally {
            loading.value = false;
        }
    };

    const resetForm = () => {
        selectedReason.value = null;
        observation.value = '';
        errorMessage.value = '';
    };

    const getTypeClass = (type: CloseReasonType): string => {
        const classes: Record<CloseReasonType, string> = {
            resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            pending_escalation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
            duplicate: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            spam: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        };
        return classes[type] || '';
    };

    const getTypeLabel = (type: CloseReasonType): string => {
        const labels: Record<CloseReasonType, string> = {
            resolved: 'Resuelto',
            pending_escalation: 'Pendiente',
            cancelled: 'Cancelado',
            duplicate: 'Duplicado',
            spam: 'Spam',
        };
        return labels[type] || type;
    };

    onMounted(() => {
        loadReasons();
    });
</script>
