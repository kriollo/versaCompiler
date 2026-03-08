<template>
    <div class="flex flex-col h-full bg-white dark:bg-gray-800 overflow-hidden min-h-0">
        <!-- Header de la lista -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div class="flex items-center justify-between mb-3">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ tickets.length }} ticket{{ tickets.length !== 1 ? 's' : '' }}
                </h2>
                <button
                    @click="$emit('refresh')"
                    :disabled="loading"
                    aria-label="Actualizar tickets"
                    class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title="Actualizar">
                    <svg
                        class="w-5 h-5 text-gray-600 dark:text-gray-300"
                        :class="{ 'animate-spin': loading }"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            <!-- Buscador -->
            <div class="relative">
                <input
                    v-model="searchQuery"
                    type="text"
                    aria-label="Buscar tickets"
                    placeholder="Buscar tickets..."
                    class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                <svg
                    class="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>

            <!-- Filtro de prioridad -->
            <div class="flex gap-2 mt-3 overflow-x-auto pb-1">
                <button
                    v-for="filter in priorityFilters"
                    :key="filter.value"
                    @click="selectedPriority = filter.value"
                    class="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0"
                    :class="
                        selectedPriority === filter.value
                            ? 'bg-teal-600 text-white dark:bg-teal-500'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    ">
                    {{ filter.label }}
                </button>
            </div>
        </div>

        <!-- Lista de tickets -->
        <div class="flex-1 overflow-y-auto min-h-0">
            <!-- Cargando -->
            <div v-if="loading" class="flex items-center justify-center h-32">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>

            <!-- Sin tickets -->
            <div v-else-if="filteredTickets.length === 0" class="p-8 text-center">
                <svg
                    class="w-14 h-14 mx-auto text-gray-300 dark:text-gray-600 mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p class="text-gray-500 dark:text-gray-400 text-sm">No hay tickets</p>
            </div>

            <!-- Tickets -->
            <div v-else>
                <div
                    v-for="ticket in filteredTickets"
                    :key="ticket.id"
                    @click="$emit('select-ticket', ticket)"
                    class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    :class="{
                        'bg-teal-50 dark:bg-teal-900/20 border-l-4 border-l-teal-600': selectedTicket?.id === ticket.id,
                    }">
                    <div class="flex items-start gap-3">
                        <!-- Avatar + badge plataforma -->
                        <div class="relative flex-shrink-0">
                            <div
                                class="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold"
                                :class="getPlatformColor(ticket.platform)">
                                {{ getInitials(ticket.customer_name) }}
                            </div>
                            <div class="absolute -bottom-1 -right-1">
                                <PlatformBadge :platform="ticket.platform" size="sm" />
                            </div>
                        </div>

                        <!-- Contenido -->
                        <div class="flex-1 min-w-0">
                            <div class="flex items-start justify-between mb-0.5">
                                <h3 class="font-semibold text-gray-900 dark:text-white truncate text-sm">
                                    {{ ticket.customer_name || 'Desconocido' }}
                                </h3>
                                <span class="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                                    {{ formatTime(ticket.last_message_at) }}
                                </span>
                            </div>

                            <p class="text-xs text-gray-600 dark:text-gray-400 truncate mb-1.5">
                                {{ (ticket.last_message_text || ticket.subject || 'Sin mensajes') as string }}
                            </p>

                            <div class="flex items-center gap-1.5 flex-wrap">
                                <!-- Prioridad -->
                                <span
                                    class="px-1.5 py-0.5 rounded text-xs font-medium"
                                    :class="getPriorityClass(ticket.priority)">
                                    {{ getPriorityLabel(ticket.priority) }}
                                </span>

                                <!-- Estado -->
                                <span
                                    class="px-1.5 py-0.5 rounded text-xs font-medium"
                                    :class="getStatusClass(ticket.status)">
                                    {{ getStatusLabel(ticket.status) }}
                                </span>

                                <!-- Calificación -->
                                <div
                                    v-if="hasTicketRating(ticket)"
                                    class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
                                    :title="`Calificación: ${normalizeTicketRating(ticket)}/5`"
                                    aria-label="Calificación del ticket">
                                    <svg
                                        v-for="star in 5"
                                        :key="`rating-${ticket.id}-${star}`"
                                        class="w-3.5 h-3.5"
                                        :class="
                                            star <= normalizeTicketRating(ticket)
                                                ? 'text-amber-500 dark:text-amber-300'
                                                : 'text-amber-200 dark:text-amber-700'
                                        "
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                        aria-hidden="true">
                                        <path
                                            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 00.95-.69l1.07-3.292z" />
                                    </svg>
                                </div>

                                <!-- Botón tomar ticket si está en cola -->
                                <button
                                    v-if="ticket.status === 'pending_assignment'"
                                    @click.stop="$emit('take-ticket', ticket)"
                                    aria-label="Tomar ticket"
                                    class="ml-auto px-2 py-0.5 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded font-medium transition-colors">
                                    Tomar
                                </button>

                                <!-- Badge mensajes no leídos -->
                                <span
                                    v-else-if="ticket.unread_count > 0"
                                    class="ml-auto w-5 h-5 bg-teal-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                                    {{ ticket.unread_count > 9 ? '9+' : ticket.unread_count }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { computed, onUnmounted, ref, watch } from 'vue';

    import {
        formatTime,
        getInitials,
        getPlatformColor,
        getPriorityClass,
        getPriorityLabel,
        getStatusClass,
        getStatusLabel,
    } from '@/dashboard/js/chatbot/inbox/inboxUtils';
    import type { Ticket } from '@/dashboard/js/chatbot/inbox/types';
    import PlatformBadge from '@/dashboard/js/components/PlatformBadge.vue';

    // Props
    interface Props {
        tickets: Ticket[];
        selectedTicket: Ticket | null;
        loading?: boolean;
        currentUserId?: number;
    }

    const props = withDefaults(defineProps<Props>(), {
        loading: false,
        currentUserId: 0,
    });

    // Emits
    defineEmits<{
        (e: 'select-ticket', ticket: Ticket): void;
        (e: 'take-ticket', ticket: Ticket): void;
        (e: 'refresh'): void;
    }>();

    // Estado local
    const searchQuery = ref('');
    const debouncedSearchQuery = ref('');
    const selectedPriority = ref('all');
    let searchDebounceTimer: number | null = null;

    const priorityFilters = [
        { value: 'all', label: 'Todos' },
        { value: 'urgent', label: 'Urgente' },
        { value: 'high', label: 'Alta' },
        { value: 'normal', label: 'Normal' },
        { value: 'low', label: 'Baja' },
    ];

    const getTs = (val: any) => {
        if (!val) {
            return 0;
        }
        if (typeof val === 'object' && val.date) {
            return new Date(val.date.replace(' ', 'T')).getTime();
        }
        if (typeof val === 'string') {
            return new Date(val.replace(' ', 'T')).getTime();
        }
        return 0;
    };

    watch(
        searchQuery,
        newValue => {
            if (searchDebounceTimer !== null) {
                clearTimeout(searchDebounceTimer);
            }

            searchDebounceTimer = window.setTimeout(() => {
                debouncedSearchQuery.value = newValue;
                searchDebounceTimer = null;
            }, 180);
        },
        { immediate: true },
    );

    onUnmounted(() => {
        if (searchDebounceTimer !== null) {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = null;
        }
    });

    // Tickets filtrados
    const filteredTickets = computed(() => {
        let filtered = props.tickets;

        if (debouncedSearchQuery.value.trim()) {
            const query = debouncedSearchQuery.value.toLowerCase();
            filtered = filtered.filter(
                ticket =>
                    (ticket.customer_name || '').toLowerCase().includes(query) ||
                    (ticket.customer_phone?.includes(query) ?? false) ||
                    (ticket.last_message_text?.toLowerCase() || '').includes(query) ||
                    (ticket.subject?.toLowerCase() || '').includes(query),
            );
        }

        if (selectedPriority.value !== 'all') {
            filtered = filtered.filter(t => t.priority === selectedPriority.value);
        }

        return filtered.toSorted((a, b) => getTs(b.last_message_at) - getTs(a.last_message_at));
    });

    const normalizeTicketRating = (ticket: Ticket): number => {
        const parsed = Number(ticket.rating ?? 0);
        if (!Number.isFinite(parsed)) {
            return 0;
        }

        const rounded = Math.round(parsed);
        if (rounded < 1) {
            return 0;
        }

        return Math.min(5, rounded);
    };

    const hasTicketRating = (ticket: Ticket): boolean => normalizeTicketRating(ticket) > 0;
</script>
