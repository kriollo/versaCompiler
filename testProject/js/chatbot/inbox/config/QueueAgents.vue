<template>
    <div class="p-6">
        <div class="flex items-center justify-between mb-6">
            <div>
                <button
                    @click="$emit('back')"
                    class="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver
                </button>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ queue?.name }}</h1>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {{ queue?.description || 'Sin descripción' }}
                </p>
            </div>
            <button
                @click="openAddModal()"
                class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Agregar Agente
            </button>
        </div>

        <div v-if="loading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
        </div>

        <div v-else-if="agents.length === 0" class="text-center py-12">
            <svg
                class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <p class="text-gray-500 dark:text-gray-400">No hay agentes en esta cola</p>
            <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">Agrega agentes para comenzar a recibir tickets</p>
        </div>

        <div
            v-else
            class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table class="w-full">
                <thead class="bg-gray-50 dark:bg-gray-900">
                    <tr>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Agente
                        </th>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Estado
                        </th>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Concurrentes
                        </th>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Activos
                        </th>
                        <th
                            class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                    <tr v-for="agent in agents" :key="agent.user_id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <div
                                    class="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
                                    <span class="text-teal-700 dark:text-teal-300 font-medium">
                                        {{ getInitials(agent.user_name) }}
                                    </span>
                                </div>
                                <div>
                                    <p class="font-medium text-gray-900 dark:text-white">{{ agent.user_name }}</p>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">{{ agent.user_email }}</p>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4">
                            <span
                                class="px-2 py-1 text-xs font-medium rounded-full"
                                :class="getAgentStatusClass(agent.agent_status)">
                                {{ getAgentStatusLabel(agent.agent_status) }}
                            </span>
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="0"
                                    :max="queue.metadata.capacity"
                                    :value="agent.max_concurrent_tickets"
                                    @input="updateConcurrent(agent.user_id, ($event.target as HTMLInputElement).value)"
                                    class="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
                                <span class="text-sm text-gray-600 dark:text-gray-400 w-8">
                                    {{ agent.max_concurrent_tickets }}
                                </span>
                            </div>
                        </td>
                        <td class="px-6 py-4">
                            <span
                                class="font-medium"
                                :class="
                                    (agent.active_tickets || 0) >= agent.max_concurrent_tickets
                                        ? 'text-red-600'
                                        : 'text-green-600'
                                ">
                                {{ agent.active_tickets || 0 }}
                            </span>
                            <span class="text-gray-400">/ {{ agent.max_concurrent_tickets }}</span>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <button
                                @click="removeAgent(agent)"
                                class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                title="Eliminar agente">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div
            v-if="showAddAgent"
            class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            @click.self="showAddAgent = false">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
                <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Agregar Agente</h2>
                </div>
                <div class="p-6">
                    <div v-if="availableAgentsLoading" class="flex justify-center py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    </div>
                    <div v-else-if="availableAgents.length === 0" class="text-center py-8">
                        <p class="text-gray-500 dark:text-gray-400">No hay agentes disponibles</p>
                    </div>
                    <div v-else class="space-y-2 max-h-64 overflow-y-auto">
                        <button
                            v-for="agent in availableAgents"
                            :key="agent.user_id"
                            @click="addAgent(agent)"
                            class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left">
                            <div
                                class="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center flex-shrink-0">
                                <span class="text-teal-700 dark:text-teal-300 font-medium text-sm">
                                    {{ getInitials(agent.user_name) }}
                                </span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="font-medium text-gray-900 dark:text-white truncate">{{ agent.user_name }}</p>
                                <p class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ agent.user_email }}</p>
                            </div>
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { inject, ref } from 'vue';

    import { getAgentStatusClass, getAgentStatusLabel, getInitials } from '@/dashboard/js/chatbot/inbox/inboxUtils';
    import type { Queue, QueueAgent } from '@/dashboard/js/chatbot/inbox/types';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaFetch } from '@/dashboard/js/functions';

    const props = defineProps<{
        queue: Queue;
    }>();

    const emit = defineEmits<{
        (e: 'back'): void;
    }>();

    const csrf_token = inject<string>('csrf_token');
    const panelUrl = inject<string>('panelUrl', '');

    const agents = ref<QueueAgent[]>([]);
    const availableAgents = ref<any[]>([]);
    const loading = ref(false);
    const availableAgentsLoading = ref(false);
    const showAddAgent = ref(false);
    const updateTimeouts = ref<Map<string, number>>(new Map());

    const loadAgents = async () => {
        loading.value = true;
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/queues/${props.queue.id}/agents`,
                method: 'GET',
            });
            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                agents.value = response.data as QueueAgent[];
            }
        } catch (error) {
            console.error('[QueueAgents] Error al cargar agentes:', error);
        } finally {
            loading.value = false;
        }
    };

    const loadAvailableAgents = async () => {
        availableAgentsLoading.value = true;
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/queues/${props.queue.id}/agents/available`,
                method: 'GET',
            });
            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                availableAgents.value = response.data as any[];
            }
        } catch (error) {
            console.error('[QueueAgents] Error al cargar agentes disponibles:', error);
        } finally {
            availableAgentsLoading.value = false;
        }
    };

    const addAgent = async (agent: any) => {
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/queues/${props.queue.id}/agents`,
                method: 'POST',
                data: JSON.stringify({
                    user_id: agent.user_id,
                    max_concurrent_tickets: 5,
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrf_token ?? '',
                },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                showAddAgent.value = false;
                await loadAgents();
            }
        } catch (error) {
            console.error('[QueueAgents] Error al agregar agente:', error);
        }
    };

    const removeAgent = async (agent: QueueAgent) => {
        // eslint-disable-next-line no-alert
        const confirmed = confirm(`¿Eliminar a ${agent.user_name} de esta cola?`);
        if (!confirmed) {
            return;
        }

        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/queues/${props.queue.id}/agents/${agent.user_id}`,
                method: 'DELETE',
                headers: { 'X-CSRF-Token': csrf_token ?? '' },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                await loadAgents();
            }
        } catch (error) {
            console.error('[QueueAgents] Error al eliminar agente:', error);
        }
    };

    const updateConcurrent = (userId: string, value: string) => {
        const newValue = Number.parseInt(value, 10);

        // Actualizar inmediatamente en la UI para feedback visual
        const uid = Number(userId);
        const agentIndex = agents.value.findIndex(a => a.user_id === uid);
        if (agentIndex !== -1) {
            const agent = agents.value[agentIndex];
            if (agent) {
                agent.max_concurrent_tickets = newValue;
            }
        }

        // Limpiar timeout anterior si existe
        const existingTimeout = updateTimeouts.value.get(userId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Crear nuevo timeout para hacer la llamada a la API (debounce de 500ms)
        const timeout = window.setTimeout(async () => {
            try {
                const response = await versaFetch({
                    url: `/${panelUrl}/inbox/api/queues/${props.queue.id}/agents/${userId}`,
                    method: 'PUT',
                    data: JSON.stringify({ max_concurrent_tickets: newValue }),
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrf_token ?? '',
                    },
                });

                if (API_RESPONSE_CODES.SUCCESS !== response.success) {
                    // Si falla, revertir al valor anterior
                    console.error('[QueueAgents] Error al actualizar concurrentes:', response);
                    await loadAgents(); // Recargar para obtener el valor correcto
                }
            } catch (error) {
                console.error('[QueueAgents] Error al actualizar concurrentes:', error);
                await loadAgents(); // Recargar para obtener el valor correcto
            } finally {
                updateTimeouts.value.delete(userId);
            }
        }, 500);

        updateTimeouts.value.set(userId, timeout);
    };

    const openAddModal = async () => {
        showAddAgent.value = true;
        await loadAvailableAgents();
    };

    loadAgents();
</script>
