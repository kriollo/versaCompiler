<template>
    <div>
        <div class="mb-6">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">Configuración General</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Parámetros globales del sistema de inbox para tu empresa
            </p>
        </div>

        <div v-if="loading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>

        <div
            v-else
            class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 max-w-4xl">
            <div class="grid gap-8 lg:grid-cols-2">
                <div class="space-y-4">
                    <div>
                        <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Asignación</h3>
                        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Se aplica cuando una cola no define su propio algoritmo.
                        </p>
                    </div>
                    <div class="space-y-3">
                        <label
                            v-for="option in algorithmOptions"
                            :key="option.value"
                            class="group flex gap-3 rounded-lg border px-4 py-3 cursor-pointer transition"
                            :class="
                                assignmentAlgorithm === option.value
                                    ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-teal-300'
                            ">
                            <input
                                v-model="assignmentAlgorithm"
                                type="radio"
                                name="assignmentAlgorithm"
                                :value="option.value"
                                class="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500" />
                            <div>
                                <div class="flex flex-wrap items-center gap-2">
                                    <p class="text-sm font-medium text-gray-800 dark:text-gray-200">
                                        {{ option.label }}
                                    </p>
                                    <span
                                        v-if="option.recommended"
                                        class="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700 dark:bg-teal-900/40 dark:text-teal-200">
                                        Recomendado
                                    </span>
                                    <span
                                        v-if="option.tag"
                                        class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                        {{ option.tag }}
                                    </span>
                                </div>
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    {{ option.description }}
                                </p>
                            </div>
                        </label>
                    </div>
                </div>

                <div class="space-y-6">
                    <div>
                        <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200">TTL y expiraciones</h3>
                        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Controla cuánto tiempo vive el contexto de tickets y media.
                        </p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            TTL de tickets (horas)
                        </label>
                        <p class="text-xs text-gray-400 dark:text-gray-500 mb-2">
                            Mantiene la relación ticket-agente en Redis. Mínimo: 1h, máximo: 720h (30 días).
                        </p>
                        <input
                            v-model.number="ticketTtlHours"
                            type="number"
                            min="1"
                            max="720"
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="24" />
                        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Valor actual equivale a
                            <span class="font-medium text-gray-600 dark:text-gray-300">
                                {{ ticketTtlHours }} horas ({{ (ticketTtlHours * 3600).toLocaleString() }} segundos)
                            </span>
                        </p>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            TTL de URLs temporales de media (horas)
                        </label>
                        <p class="text-xs text-gray-400 dark:text-gray-500 mb-2">
                            Vigencia de enlaces firmados para adjuntos. Mínimo: 1h, máximo: 720h (30 días).
                        </p>
                        <input
                            v-model.number="mediaUrlTtlHours"
                            type="number"
                            min="1"
                            max="720"
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="24" />
                        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Valor actual equivale a
                            <span class="font-medium text-gray-600 dark:text-gray-300">
                                {{ mediaUrlTtlHours }} horas ({{ (mediaUrlTtlHours * 3600).toLocaleString() }} segundos)
                            </span>
                        </p>
                    </div>

                    <div class="pt-2">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Outbound (multicanal)
                        </label>
                        <p class="text-xs text-gray-400 dark:text-gray-500 mb-3">
                            Habilita el inicio de conversaciones outbound desde el inbox.
                        </p>
                        <label class="inline-flex items-center gap-3 cursor-pointer">
                            <input v-model="outboundEnabled" type="checkbox" class="sr-only" />
                            <span
                                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                                :class="outboundEnabled ? 'bg-teal-600' : 'bg-gray-300 dark:bg-gray-700'">
                                <span
                                    class="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
                                    :class="outboundEnabled ? 'translate-x-5' : 'translate-x-1'"></span>
                            </span>
                            <span class="text-sm text-gray-700 dark:text-gray-300">
                                {{ outboundEnabled ? 'Activo' : 'Inactivo' }}
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="mt-6 space-y-4">
                <div
                    v-if="feedbackMessage"
                    class="px-3 py-2 rounded-lg text-sm font-medium"
                    :class="
                        feedbackIsError
                            ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                            : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                    ">
                    {{ feedbackMessage }}
                </div>

                <div class="flex justify-end">
                    <button
                        @click="saveConfig"
                        :disabled="saving"
                        class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 min-w-[100px]">
                        <span v-if="saving" class="flex items-center gap-2">
                            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle
                                    class="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    stroke-width="4"
                                    fill="none"></circle>
                                <path
                                    class="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Guardando
                        </span>
                        <span v-else>Guardar</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { inject, onMounted, ref } from 'vue';

    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
import { versaFetch } from '@/dashboard/js/functions';

    const csrf_token = inject<string>('csrf_token');
    const panelUrl = inject<string>('panelUrl', '');

    const loading = ref(false);
    const saving = ref(false);
    const ticketTtlHours = ref(24);
    const mediaUrlTtlHours = ref(24);
    const assignmentAlgorithm = ref('least_connections');
    const outboundEnabled = ref(false);
    const algorithmOptions = [
        {
            value: 'weighted_least_connections',
            label: 'Weighted Least Connections',
            description: 'Equilibra por carga y capacidad configurada por agente/cola.',
            recommended: true,
            tag: 'Alta demanda',
        },
        {
            value: 'power_of_two_choices',
            label: 'Power of Two Choices',
            description: 'Elige al mejor entre dos agentes al azar para reducir sesgos.',
            tag: 'Equilibrio rapido',
        },
        {
            value: 'least_connections',
            label: 'Least Connections',
            description: 'Prioriza al agente con menos tickets activos en el momento.',
            tag: 'Preciso',
        },
        {
            value: 'round_robin',
            label: 'Round Robin',
            description: 'Rota de forma secuencial para repartir carga de manera uniforme.',
            tag: 'Simple',
        },
    ];
    const feedbackMessage = ref('');
    const feedbackIsError = ref(false);

    const showFeedback = (message: string, isError: boolean) => {
        feedbackMessage.value = message;
        feedbackIsError.value = isError;
        setTimeout(() => {
            feedbackMessage.value = '';
        }, 4000);
    };

    const loadConfig = async () => {
        loading.value = true;
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/config`,
                method: 'GET',
            });
            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                const data = response.data as {
                    ticket_ttl_hours?: number;
                    media_url_ttl_hours?: number;
                    assignment_algorithm?: string;
                    outbound_enabled?: boolean;
                };
                ticketTtlHours.value = data.ticket_ttl_hours ?? 24;
                mediaUrlTtlHours.value = data.media_url_ttl_hours ?? 24;
                assignmentAlgorithm.value = data.assignment_algorithm ?? 'least_connections';
                outboundEnabled.value = Boolean(data.outbound_enabled);
            }
        } catch (error) {
            console.error('[InboxGeneralConfig] Error al cargar configuración:', error);
        } finally {
            loading.value = false;
        }
    };

    const saveConfig = async () => {
        if (ticketTtlHours.value < 1 || ticketTtlHours.value > 720) {
            showFeedback('El TTL de tickets debe estar entre 1 y 720 horas', true);
            return;
        }

        if (mediaUrlTtlHours.value < 1 || mediaUrlTtlHours.value > 720) {
            showFeedback('El TTL de media debe estar entre 1 y 720 horas', true);
            return;
        }

        saving.value = true;
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/config`,
                method: 'POST',
                data: JSON.stringify({
                    ticket_ttl_hours: ticketTtlHours.value,
                    media_url_ttl_hours: mediaUrlTtlHours.value,
                    assignment_algorithm: assignmentAlgorithm.value,
                    outbound_enabled: outboundEnabled.value,
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrf_token ?? '',
                },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                showFeedback('Configuración guardada correctamente', false);
            } else {
                showFeedback('Error al guardar la configuración', true);
            }
        } catch (error) {
            console.error('[InboxGeneralConfig] Error al guardar configuración:', error);
            showFeedback('Error al guardar la configuración', true);
        } finally {
            saving.value = false;
        }
    };

    onMounted(loadConfig);
</script>
