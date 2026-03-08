<template>
    <div
        class="h-[calc(100vh-13rem)] min-h-0 flex flex-col bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <!-- Header -->
        <div
            class="bg-teal-600 dark:bg-teal-700 text-white px-6 py-4 flex items-center justify-between shadow-md flex-shrink-0">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                </div>
                <div>
                    <h1 class="text-xl font-bold">Inbox — Atención al Cliente</h1>
                    <p class="text-sm text-teal-100">{{ agentName }}</p>
                </div>
            </div>

            <div class="flex items-center gap-4">
                <!-- Stats rápidas -->
                <div class="hidden lg:flex items-center gap-4 text-sm">
                    <span class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-yellow-300"></span>
                        Cola:
                        <strong>{{ stats.pending_assignment }}</strong>
                    </span>
                    <span class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-green-300"></span>
                        Mis activos:
                        <strong>{{ myActiveCount }}</strong>
                    </span>
                </div>

                <!-- Estado de conexión WS -->
                <div
                    class="flex items-center gap-2"
                    :title="isConnected ? 'WebSocket Conectado' : 'WebSocket Desconectado'">
                    <div
                        class="w-2 h-2 rounded-full animate-pulse"
                        :class="isConnected ? 'bg-green-300' : 'bg-red-500'"></div>
                </div>

                <!-- Control de volumen de notificaciones -->
                <div class="hidden lg:flex items-center gap-2" title="Volumen de notificaciones">
                    <svg
                        class="w-4 h-4 text-white/70 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15.536 8.464a5 5 0 010 7.072M12 6v12m0 0l-3-3m3 3l3-3M9 9H5.5A1.5 1.5 0 004 10.5v3A1.5 1.5 0 005.5 15H9l4 4V5l-4 4z" />
                    </svg>
                    <input
                        v-model.number="notificationVolume"
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        class="w-20 h-1 accent-white cursor-pointer" />
                </div>

                <!-- Selector de estado del agente -->
                <button
                    type="button"
                    @click="openOutboundModal"
                    :disabled="!outboundEnabled"
                    :title="
                        outboundEnabled
                            ? 'Iniciar flujo outbound'
                            : 'Outbound deshabilitado en la configuracion del inbox'
                    "
                    class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/30 text-white/90 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 13l4 4L19 7M12 4v8m0 0l-3-3m3 3l3-3" />
                    </svg>
                    Nuevo outbound
                </button>
                <AgentStatusSelector
                    :initial-status="agentStatus"
                    :initial-custom-label="agentCustomStatus"
                    @status-changed="handleStatusChange" />

                <!-- Notificaciones no leídas globales -->
                <div class="relative">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span
                        v-if="totalUnread > 0"
                        class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
                        {{ totalUnread > 9 ? '9+' : totalUnread }}
                    </span>
                </div>
            </div>
        </div>

        <div
            v-if="uiErrorMessage"
            class="mx-4 mt-3 px-4 py-3 rounded-lg border border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200 flex items-center justify-between gap-3">
            <p class="text-sm font-medium">{{ uiErrorMessage }}</p>
            <div class="flex items-center gap-2 flex-shrink-0">
                <button
                    @click="refreshAll"
                    class="px-3 py-1.5 text-xs rounded bg-red-600 hover:bg-red-700 text-white transition-colors">
                    Reintentar
                </button>
                <button
                    @click="clearUiError"
                    aria-label="Cerrar alerta"
                    class="px-2 py-1 text-xs rounded border border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                    Cerrar
                </button>
            </div>
        </div>

        <!-- Contenido principal -->
        <div class="flex-1 flex overflow-hidden min-h-0">
            <!-- Sidebar: tabs + lista de tickets -->
            <div
                class="w-full md:w-96 flex flex-col border-r border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 h-full overflow-hidden min-h-0">
                <!-- Tabs Cola / Mis tickets / Todos -->
                <div class="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <button
                        v-for="tab in sidebarTabs"
                        :key="tab.key"
                        @click="activeTab = tab.key"
                        class="flex-1 py-3 text-sm font-medium transition-colors relative"
                        :class="[
                            activeTab === tab.key
                                ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
                            tab.key === 'active' && highlightActiveTab ? 'animate-pulse-teal' : '',
                        ]">
                        {{ tab.label }}
                        <span
                            v-if="tab.badge > 0"
                            class="ml-1 px-1.5 py-0.5 text-xs rounded-full"
                            :class="
                                activeTab === tab.key
                                    ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            ">
                            {{ tab.badge }}
                        </span>
                    </button>
                </div>

                <!-- Lista de tickets -->
                <TicketList
                    class="flex-1 min-h-0"
                    :tickets="tabTickets"
                    :selected-ticket="selectedTicket"
                    :loading="loadingTickets"
                    :current-user-id="currentUserId"
                    @select-ticket="selectTicket"
                    @take-ticket="takeTicket"
                    @refresh="loadTickets" />
            </div>

            <ChatWindow
                v-if="selectedTicket"
                :ticket="selectedTicket"
                :messages="currentMessages"
                :is-typing="currentTicketTyping"
                :loading-history="loadingMessages"
                :is-connected="isConnected"
                :agent-name="agentName"
                :csrf-token="csrf_token ?? ''"
                :panel-url="panelUrl"
                @send-message="handleSendMessage"
                @send-location="handleSendLocation"
                @close-ticket="handleCloseTicket"
                @ticket-closed-with-reason="handleTicketClosedWithReason"
                @transfer-ticket="openTransferModal"
                @load-more-messages="handleLoadMoreMessages"
                @typing="handleTypingSignal"
                @retry-message="handleRetryMessage"
                class="flex-1 min-h-0" />

            <!-- Estado vacío -->
            <div v-else class="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                <div class="text-center">
                    <svg
                        class="w-24 h-24 mx-auto text-gray-400 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h3 class="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                        Selecciona un ticket para comenzar
                    </h3>
                    <p class="text-gray-500 dark:text-gray-500">
                        Elige una conversación de la lista para ver los mensajes
                    </p>
                </div>
            </div>
        </div>

        <div
            v-if="showTransferModal"
            class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            @click.self="closeTransferModal">
            <div class="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg p-6 shadow-xl">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                        {{ transferMode === 'agent' ? 'Derivar a agente' : 'Enviar a cola' }}
                    </h3>
                    <button
                        @click="closeTransferModal"
                        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div class="mt-4 space-y-3">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {{ transferMode === 'agent' ? 'Agente destino' : 'Cola destino' }}
                    </label>
                    <select
                        v-model="transferTargetId"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                        <option value="">Selecciona una opción</option>
                        <option v-for="option in transferOptions" :key="option.id" :value="option.id">
                            {{ option.label }}
                        </option>
                    </select>
                </div>

                <div class="mt-6 flex justify-end gap-2">
                    <button
                        @click="closeTransferModal"
                        class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200">
                        Cancelar
                    </button>
                    <button
                        @click="confirmTransfer"
                        :disabled="!transferTargetId || transferSubmitting"
                        class="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50">
                        {{ transferSubmitting ? 'Enviando...' : 'Confirmar' }}
                    </button>
                </div>
            </div>
        </div>

        <div
            v-if="showOutboundModal"
            class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            @click.self="closeOutboundModal">
            <div class="bg-white dark:bg-gray-800 rounded-xl w-full max-w-xl p-6 shadow-xl">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Iniciar flujo outbound</h3>
                    <button
                        @click="closeOutboundModal"
                        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div class="mt-4 grid gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Flujo outbound
                        </label>
                        <select
                            v-model="outboundForm.flow_id"
                            :disabled="loadingOutboundFlows"
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                            <option value="">Selecciona un flujo</option>
                            <option v-for="flow in outboundFlows" :key="flow.id" :value="flow.id">
                                #{{ flow.id }} — {{ flow.description || 'Flujo outbound' }}
                            </option>
                        </select>
                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Solo flujos outbound activos.</p>
                    </div>

                    <div class="flex items-center gap-2">
                        <button
                            type="button"
                            @click="outboundCustomerMode = 'existing'"
                            class="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                            :class="
                                outboundCustomerMode === 'existing'
                                    ? 'bg-teal-600 text-white border-teal-600'
                                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                            ">
                            Buscar cliente
                        </button>
                        <button
                            type="button"
                            @click="outboundCustomerMode = 'new'"
                            class="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                            :class="
                                outboundCustomerMode === 'new'
                                    ? 'bg-teal-600 text-white border-teal-600'
                                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                            ">
                            Crear cliente
                        </button>
                    </div>

                    <div v-if="outboundCustomerMode === 'existing'" class="grid gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Buscar cliente
                            </label>
                            <input
                                v-model="outboundSearch"
                                type="text"
                                placeholder="Buscar por nombre o telefono"
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Escribe al menos {{ MIN_OUTBOUND_SEARCH_CHARS }} caracteres. Se muestran hasta
                                {{ OUTBOUND_CUSTOMER_LIMIT }} resultados.
                            </p>
                        </div>

                        <div class="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                            <div v-if="loadingOutboundCustomers" class="p-3 text-sm text-gray-500 dark:text-gray-400">
                                Cargando clientes...
                            </div>
                            <div
                                v-else-if="!isOutboundSearchReady"
                                class="p-3 text-sm text-gray-500 dark:text-gray-400">
                                Ingresa mas caracteres para buscar clientes.
                            </div>
                            <button
                                v-for="customer in outboundCustomers"
                                :key="customer.id"
                                type="button"
                                @click="outboundSelectedCustomerId = customer.id"
                                class="w-full text-left px-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                :class="
                                    outboundSelectedCustomerId === customer.id
                                        ? 'bg-teal-50 dark:bg-teal-900/30'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                ">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-semibold text-gray-900 dark:text-white">
                                            {{ customer.nombre || 'Cliente sin nombre' }}
                                        </p>
                                        <p class="text-xs text-gray-500 dark:text-gray-400">
                                            {{ customer.telefono || customer.sender_id || 'Sin telefono' }}
                                        </p>
                                    </div>
                                    <span class="text-xs uppercase text-gray-400 dark:text-gray-500">
                                        {{ customer.platform || 'whatsapp' }}
                                    </span>
                                </div>
                            </button>
                            <div
                                v-if="
                                    !loadingOutboundCustomers && isOutboundSearchReady && outboundCustomers.length === 0
                                "
                                class="p-3 text-sm text-gray-500 dark:text-gray-400">
                                Sin resultados.
                            </div>
                        </div>
                    </div>

                    <div v-else class="grid gap-4">
                        <div class="grid gap-4 md:grid-cols-2">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nombre del cliente
                                </label>
                                <input
                                    v-model="outboundForm.customer_name"
                                    type="text"
                                    placeholder="Ej: Maria Perez"
                                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Telefono
                                </label>
                                <input
                                    v-model="outboundForm.customer_phone"
                                    type="text"
                                    placeholder="Ej: +56911112222"
                                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                            </div>
                        </div>

                        <div class="grid gap-4 md:grid-cols-2">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Correo (opcional)
                                </label>
                                <input
                                    v-model="outboundForm.customer_email"
                                    type="email"
                                    placeholder="maria@correo.com"
                                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Canal
                                </label>
                                <select
                                    v-model="outboundForm.customer_platform"
                                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="facebookmessenger">Messenger</option>
                                    <option value="telegram">Telegram</option>
                                    <option value="instagram">Instagram</option>
                                </select>
                            </div>
                        </div>

                        <div v-if="outboundForm.customer_platform !== 'whatsapp'">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Identificador del canal (opcional)
                            </label>
                            <input
                                v-model="outboundForm.customer_sender_id"
                                type="text"
                                placeholder="Ej: 123456789"
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Mensaje inicial (opcional)
                        </label>
                        <textarea
                            v-model="outboundForm.initial_message"
                            rows="3"
                            placeholder="Ej: Hola, queremos confirmar tu cita"
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"></textarea>
                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Se inyecta como variable si el flujo la requiere.
                        </p>
                    </div>
                </div>

                <div class="mt-6 flex justify-end gap-2">
                    <button
                        @click="closeOutboundModal"
                        class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200">
                        Cancelar
                    </button>
                    <button
                        @click="submitOutbound"
                        :disabled="outboundSubmitting"
                        class="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50">
                        {{ outboundSubmitting ? 'Iniciando...' : 'Iniciar flujo' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import Swal from 'sweetalert2';
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue';

    import AgentStatusSelector from '@/dashboard/js/chatbot/inbox/chat/AgentStatusSelector.vue';
import ChatWindow from '@/dashboard/js/chatbot/inbox/chat/ChatWindow.vue';
import TicketList from '@/dashboard/js/chatbot/inbox/chat/TicketList.vue';
import type {
    AgentStatusValue,
    Message,
    PaginatedResponse,
    Ticket,
    TicketStats,
} from '@/dashboard/js/chatbot/inbox/types';
import { useWebSocket } from '@/dashboard/js/composables/useWebSocket';
import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
import { versaFetch } from '@/dashboard/js/functions';

    // =====================================================
    // UTILIDADES INTERNAS
    // =====================================================

    /** Máximo de tickets con mensajes cacheados en memoria (LRU simple) */
    const MAX_MESSAGES_CACHED_TICKETS = 30;
    const MESSAGES_PER_PAGE = 50;

    /**
     * Crea una versión debounced de una función sin argumentos.
     * Evita múltiples llamadas API en ráfagas de eventos WS.
     */
    const createDebounced = (fn: () => void, delay: number): (() => void) => {
        let timer: number | null = null;
        return () => {
            if (timer !== null) {
                clearTimeout(timer);
            }
            timer = window.setTimeout(() => {
                fn();
                timer = null;
            }, delay);
        };
    };

    /** Instancia de audio reutilizable (evita crear un objeto nuevo por cada sonido) */
    const notificationAudio = new Audio('/public/dashboard/audio/notification.mp3');

    /**
     * Throttle para notificaciones: al reconectar el servidor puede enviar decenas de
     * mensajes buffereados en el mismo ciclo. Limitamos a 1 sonido cada 2s y
     * 1 notificación desktop cada 3s para evitar spam de alertas.
     */
    let lastSoundTime = 0;
    let lastDesktopNotifTime = 0;
    const SOUND_THROTTLE_MS = 2000;
    const NOTIF_THROTTLE_MS = 3000;

    /**
     * Ventana de tiempo post-reconexión durante la cual se suprime la notificación
     * de mensajes cuyo ticket aún no está en el estado local (mensajes buffereados).
     * El agente verá el badge actualizado cuando loadTickets() resuelva.
     */
    const RECONNECT_BURST_WINDOW_MS = 5000;
    let lastConnectTime = 0;

    const INBOX_DEBUG_FLAG = 'versa_inbox_debug';

    const isInboxDebugEnabled = (): boolean => {
        try {
            return localStorage.getItem(INBOX_DEBUG_FLAG) === '1';
        } catch {
            return false;
        }
    };

    const debugLog = (message: string, context?: Record<string, unknown>) => {
        if (!isInboxDebugEnabled()) {
            return;
        }

        if (context) {
            console.info(`[InboxDebug] ${message}`, context);
            return;
        }

        console.info(`[InboxDebug] ${message}`);
    };

    const debugError = (message: string, context?: Record<string, unknown>) => {
        if (!isInboxDebugEnabled()) {
            return;
        }

        if (context) {
            console.error(`[InboxDebug] ${message}`, context);
            return;
        }

        console.error(`[InboxDebug] ${message}`);
    };

    const normalizePlatform = (platform: unknown): string => String(platform ?? '').toLowerCase();

    const isTelegramPlatform = (platform: unknown): boolean => {
        const normalized = normalizePlatform(platform);
        return normalized === 'telegram' || normalized === 'tg' || normalized === 'telegram_bot';
    };

    const trackTiming = (operation: string, context?: Record<string, unknown>) => {
        const startedAt = performance.now();

        return (status: 'ok' | 'error', extra?: Record<string, unknown>) => {
            if (!isInboxDebugEnabled()) {
                return;
            }

            const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
            console.info('[InboxPerf]', {
                operation,
                status,
                durationMs,
                ...context,
                ...extra,
            });
        };
    };

    // Inyecciones del framework
    const csrf_token = inject<string>('csrf_token');
    const panelUrl = inject<string>('panelUrl', '');
    const current_user = inject<Record<string, unknown>>('current_user', {});
    const currentUser = current_user; // Keep variable name for rest of file
    const ws_url = inject<string>('ws_url', '');

    const agentName = computed(() => (currentUser.name as string) || 'Agente');
    const currentUserId = computed(() => (currentUser.id as number) || 0);

    // =====================================================
    // ESTADO DEL AGENTE
    // =====================================================

    const agentStatus = ref<AgentStatusValue>('offline');
    const agentCustomStatus = ref<string>('');
    const agentQueues = ref<number[]>([]);
    const agentCapacity = ref<number>(5);
    const showTransferModal = ref(false);
    const transferMode = ref<'agent' | 'queue'>('agent');
    const transferTargetId = ref<number | ''>('');
    const transferSubmitting = ref(false);
    const transferAgents = ref<{ id: number; name: string; email?: string }[]>([]);
    const transferQueues = ref<{ id: number; name: string }[]>([]);

    const outboundEnabled = ref(false);
    const showOutboundModal = ref(false);

    interface OutboundFlow {
        id: number;
        description?: string | null;
        flow_type?: string | null;
    }

    interface OutboundCustomer {
        id: number;
        nombre?: string | null;
        telefono?: string | null;
        correo?: string | null;
        platform?: string | null;
        sender_id?: string | null;
    }

    const outboundFlows = ref<OutboundFlow[]>([]);
    const outboundCustomers = ref<OutboundCustomer[]>([]);
    const outboundSearch = ref('');
    const outboundCustomerMode = ref<'existing' | 'new'>('existing');
    const outboundSelectedCustomerId = ref<number | null>(null);
    const loadingOutboundFlows = ref(false);
    const loadingOutboundCustomers = ref(false);
    const OUTBOUND_CUSTOMER_LIMIT = 10;
    const MIN_OUTBOUND_SEARCH_CHARS = 2;
    const outboundSubmitting = ref(false);
    const outboundForm = ref({
        flow_id: '',
        initial_message: '',
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        customer_platform: 'whatsapp',
        customer_sender_id: '',
    });

    const { isConnected, send, on, off, connect, disconnect } = useWebSocket({
        url: ws_url.replaceAll('\\', ''),
        debug: false,
        lazy: true,
    });

    const handleStatusChange = (data: {
        status: AgentStatusValue;
        customLabel?: string;
        queues?: number[];
        capacity?: number;
    }) => {
        agentStatus.value = data.status;
        agentCustomStatus.value = data.customLabel || '';
        if (data.queues !== undefined) {
            agentQueues.value = data.queues;
        }
        if (data.capacity !== undefined) {
            // Capacity = 0 es válido: significa "usar capacidad de la cola" en el routing engine
            agentCapacity.value = data.capacity;
        }

        if (data.status === 'offline') {
            if (isConnected.value) {
                disconnect();
            }
        } else if (!isConnected.value) {
            connect();
        }

        if (isConnected.value && currentUserId.value) {
            send('manual_status', {
                user_id: String(currentUserId.value),
                status: data.status,
                custom_status_label: data.customLabel || '',
            });
        }
    };

    const openTransferModal = async (payload: { mode: 'agent' | 'queue' }) => {
        if (!selectedTicket.value) {
            return;
        }
        transferMode.value = payload.mode;
        transferTargetId.value = '';
        showTransferModal.value = true;
        await loadTransferOptions();
    };

    const closeTransferModal = () => {
        showTransferModal.value = false;
        transferTargetId.value = '';
    };

    const loadOutboundConfig = async () => {
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/config`,
                method: 'GET',
            });
            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                outboundEnabled.value = Boolean(response.data?.outbound_enabled ?? false);
            }
        } catch (error) {
            debugError('Error al cargar config outbound', { error: error as unknown });
        }
    };

    const loadOutboundFlows = async () => {
        loadingOutboundFlows.value = true;
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/outbound/flows`,
                method: 'GET',
            });
            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                outboundFlows.value = (response.data as OutboundFlow[]) || [];
            } else {
                outboundFlows.value = [];
            }
        } catch (error) {
            debugError('Error al cargar flujos outbound', { error: error as unknown });
            outboundFlows.value = [];
        } finally {
            loadingOutboundFlows.value = false;
        }
    };

    const loadOutboundCustomers = async (query = '') => {
        const trimmedQuery = query.trim();
        if (trimmedQuery.length < MIN_OUTBOUND_SEARCH_CHARS) {
            outboundCustomers.value = [];
            loadingOutboundCustomers.value = false;
            return;
        }

        loadingOutboundCustomers.value = true;
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/outbound/customers?q=${encodeURIComponent(trimmedQuery)}&limit=${OUTBOUND_CUSTOMER_LIMIT}`,
                method: 'GET',
            });
            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                outboundCustomers.value = (response.data as OutboundCustomer[]) || [];
            } else {
                outboundCustomers.value = [];
            }
        } catch (error) {
            debugError('Error al cargar clientes outbound', { error: error as unknown });
            outboundCustomers.value = [];
        } finally {
            loadingOutboundCustomers.value = false;
        }
    };

    const isOutboundSearchReady = computed(() => outboundSearch.value.trim().length >= MIN_OUTBOUND_SEARCH_CHARS);

    const debouncedOutboundSearch = createDebounced(() => {
        if (!showOutboundModal.value) {
            return;
        }
        if (outboundCustomerMode.value !== 'existing') {
            return;
        }
        loadOutboundCustomers(outboundSearch.value);
    }, 300);

    const openOutboundModal = async () => {
        if (!outboundEnabled.value) {
            setUiError('Outbound esta deshabilitado en la configuracion del inbox.');
            return;
        }

        showOutboundModal.value = true;
        outboundCustomerMode.value = 'existing';
        outboundSelectedCustomerId.value = null;
        outboundSearch.value = '';
        outboundCustomers.value = [];
        outboundForm.value = {
            flow_id: '',
            initial_message: '',
            customer_name: '',
            customer_phone: '',
            customer_email: '',
            customer_platform: 'whatsapp',
            customer_sender_id: '',
        };
        await loadOutboundFlows();
    };

    const closeOutboundModal = () => {
        showOutboundModal.value = false;
    };

    watch(outboundSearch, () => {
        if (!isOutboundSearchReady.value) {
            outboundCustomers.value = [];
            return;
        }
        debouncedOutboundSearch();
    });

    watch(outboundCustomerMode, mode => {
        if (mode === 'existing') {
            if (isOutboundSearchReady.value) {
                loadOutboundCustomers(outboundSearch.value);
            } else {
                outboundCustomers.value = [];
            }
        }
    });

    const submitOutbound = async () => {
        if (!outboundForm.value.flow_id) {
            setUiError('Selecciona un flujo outbound para iniciar la conversación.');
            return;
        }

        if (outboundCustomerMode.value === 'existing') {
            if (!outboundSelectedCustomerId.value) {
                setUiError('Selecciona un cliente para iniciar el outbound.');
                return;
            }
        } else {
            if (!outboundForm.value.customer_name.trim()) {
                setUiError('El nombre del cliente es requerido.');
                return;
            }

            const platform = outboundForm.value.customer_platform;
            if (platform === 'whatsapp' && !outboundForm.value.customer_phone.trim()) {
                setUiError('El telefono del cliente es requerido para WhatsApp.');
                return;
            }

            if (
                platform !== 'whatsapp' &&
                !outboundForm.value.customer_sender_id.trim() &&
                !outboundForm.value.customer_phone.trim()
            ) {
                setUiError('Debes indicar un identificador del canal o telefono del cliente.');
                return;
            }
        }

        outboundSubmitting.value = true;
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/outbound/start`,
                method: 'POST',
                data: JSON.stringify({
                    flow_id: Number(outboundForm.value.flow_id),
                    initial_message: outboundForm.value.initial_message.trim(),
                    customer_id:
                        outboundCustomerMode.value === 'existing' ? outboundSelectedCustomerId.value : undefined,
                    customer_phone:
                        outboundCustomerMode.value === 'new' ? outboundForm.value.customer_phone.trim() : undefined,
                    customer_name:
                        outboundCustomerMode.value === 'new' ? outboundForm.value.customer_name.trim() : undefined,
                    customer_email:
                        outboundCustomerMode.value === 'new' ? outboundForm.value.customer_email.trim() : undefined,
                    customer_platform:
                        outboundCustomerMode.value === 'new' ? outboundForm.value.customer_platform : undefined,
                    customer_sender_id:
                        outboundCustomerMode.value === 'new' ? outboundForm.value.customer_sender_id.trim() : undefined,
                }),
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf_token ?? '' },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                closeOutboundModal();
                await Promise.all([loadTickets(), loadStats()]);
                const createdTicketId = String(response.data?.ticket_id ?? '');
                if (createdTicketId) {
                    const createdTicket = tickets.value.find(t => String(t.id) === createdTicketId);
                    if (createdTicket) {
                        await selectTicket(createdTicket);
                    }
                }
            } else {
                setUiError(response.message || 'No se pudo iniciar el flujo outbound.');
            }
        } catch (error) {
            debugError('Error al iniciar outbound', { error: error as unknown });
            setUiError('No se pudo iniciar el flujo outbound en este momento.');
        } finally {
            outboundSubmitting.value = false;
        }
    };

    const loadTransferOptions = async () => {
        if (transferMode.value === 'agent') {
            try {
                const response = await versaFetch({
                    url: `/${panelUrl}/inbox/api/agents/available`,
                    method: 'GET',
                });
                if (API_RESPONSE_CODES.SUCCESS === response.success) {
                    transferAgents.value = (response.data as any[])
                        .filter(item => item?.status !== false)
                        .map(item => ({
                            id: Number(item.id),
                            name: String(item.name || ''),
                            email: String(item.email || ''),
                        }));
                }
            } catch (error) {
                debugError('Error al cargar agentes', { error: error as unknown });
            }
        } else {
            try {
                const response = await versaFetch({
                    url: `/${panelUrl}/inbox/api/queues?per_page=200`,
                    method: 'GET',
                });
                if (API_RESPONSE_CODES.SUCCESS === response.success) {
                    const list = (response.data?.data || response.data || []) as any[];
                    transferQueues.value = list
                        .filter(item => String(item.status || 'active') === 'active')
                        .map(item => ({
                            id: Number(item.id),
                            name: String(item.name || ''),
                        }));
                }
            } catch (error) {
                debugError('Error al cargar colas', { error: error as unknown });
            }
        }
    };

    const confirmTransfer = async () => {
        if (!selectedTicket.value || !transferTargetId.value) {
            return;
        }
        const targetLabel = transferOptions.value.find(opt => Number(opt.id) === Number(transferTargetId.value))?.label;
        const confirmed = await Swal.fire({
            icon: 'warning',
            title: 'Confirmar traspaso',
            text:
                transferMode.value === 'agent'
                    ? `¿Deseas transferir el ticket al agente ${targetLabel || 'seleccionado'}?`
                    : `¿Deseas transferir el ticket a la cola ${targetLabel || 'seleccionada'}?`,
            confirmButtonText: 'Transferir',
            cancelButtonText: 'Cancelar',
            showCancelButton: true,
        });

        if (!confirmed) {
            return;
        }

        transferSubmitting.value = true;
        try {
            const payload =
                transferMode.value === 'agent'
                    ? { agent_id: Number(transferTargetId.value) }
                    : { queue_id: Number(transferTargetId.value) };

            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/tickets/${selectedTicket.value.id}/transfer`,
                method: 'POST',
                data: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf_token ?? '' },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                closeTransferModal();
                selectedTicket.value = null;
                await Promise.all([loadTickets(), loadStats()]);
            } else {
                setUiError('No se pudo transferir el ticket.');
            }
        } catch (error) {
            debugError('Error al transferir ticket', { error: error as unknown });
            setUiError('No se pudo transferir el ticket en este momento.');
        } finally {
            transferSubmitting.value = false;
        }
    };

    // Referencias nombradas a los handlers WS para poder desregistrarlos en onUnmounted
    // Y evitar acumulación cuando el componente se monta/desmonta varias veces.
    const wsOnConnected = () => {
        debugLog('WS connected', { currentUserId: currentUserId.value });
        // Marcar el momento de conexión para suprimir spam de notificaciones
        // Durante la ráfaga de mensajes buffereados que el servidor envía al reconectar
        lastConnectTime = Date.now();
        if (currentUserId.value) {
            debugLog('Enviando auth al websocket');
            send('auth', {
                user_id: String(currentUserId.value),
                user_data: JSON.stringify({ name: agentName.value, role: 'agent' }),
                capacity: agentCapacity.value,
                queues: agentQueues.value,
            });
            send('manual_status', {
                user_id: String(currentUserId.value),
                status: agentStatus.value,
                custom_status_label: agentCustomStatus.value || '',
            });
        }
        // Recargar tickets al (re)conectar para tener estado fresco
        // Y evitar notificaciones de tickets ya cerrados que el servidor pueda reenviar
        loadTickets();
    };

    const wsOnDisconnected = () => {
        isConnected.value = false;
    };

    const wsOnNewTicket = () => {
        debouncedLoadStats();
        debouncedLoadTickets();
        playNotificationSound();
        showDesktopNotification('Nuevo ticket en cola', 'Hay un nuevo ticket esperando asignación');
    };

    const wsOnNewMessage = (data: any) => {
        debugLog('Evento wsOnNewMessage', { data });
        // Data es el envelope completo {type, data, timestamp}
        // Data.data contiene el wrapper PHP {message, ticket_id, direction, sender_type, ...}
        handleIncomingMessage(data.data ?? data);
    };

    const wsOnMessageStatus = (data: any) => {
        handleMessageStatusUpdate(data.data ?? data);
    };

    const wsOnMessageAck = (data: any) => {
        const payload = data.data ?? data;
        const { ticket_id, message_id, status } = payload;
        const ticketId = String(ticket_id);
        if (ticketId === '') {
            return;
        }

        const msgs = messages.value.get(ticketId);
        if (msgs) {
            const tempIdx = msgs.findLastIndex(m => String(m.id).startsWith('temp-'));
            const tempMsg = tempIdx !== -1 ? msgs[tempIdx] : undefined;
            if (tempMsg) {
                tempMsg.id = String(message_id);
                tempMsg.status = status;
                messages.value.set(ticketId, [...msgs]);
            }

            const ticket =
                tickets.value.find(t => String(t.id) === ticketId) ??
                (selectedTicket.value && String(selectedTicket.value.id) === ticketId ? selectedTicket.value : null);

            if (!isTelegramPlatform(ticket?.platform)) {
                return;
            }

            const persistedId = String(message_id ?? '');
            if (persistedId === '') {
                return;
            }

            // Telegram no siempre devuelve doble check por WS; emulamos estados locales seguros.
            const setTelegramUiStatus = (nextStatus: 'delivered' | 'read', delayMs = 0) => {
                window.setTimeout(() => {
                    const currentMsgs = messages.value.get(ticketId);
                    if (!currentMsgs) {
                        return;
                    }

                    const idx = currentMsgs.findIndex(m => String(m.id) === persistedId);
                    const currentMsg = idx !== -1 ? currentMsgs[idx] : undefined;
                    if (!currentMsg || currentMsg.status === 'failed') {
                        return;
                    }

                    if (nextStatus === 'read' && currentMsg.status === 'read') {
                        return;
                    }

                    currentMsg.status = nextStatus;
                    messages.value.set(ticketId, [...currentMsgs]);
                }, delayMs);
            };

            setTelegramUiStatus('delivered');
            setTelegramUiStatus('read', 500);
        }
    };

    const wsOnTicketAssigned = () => {
        debouncedLoadStats();
        debouncedLoadTickets();
    };

    const wsOnAssignedTicket = (data: any) => {
        const payload = data.data ?? data;
        debouncedLoadStats();
        debouncedLoadTickets();
        if (payload.ticket_id) {
            // No notificar si el ticket ya está cerrado en el estado local
            // (puede ocurrir al reconectar y recibir eventos buffereados de tickets cerrados)
            const existingTicket = tickets.value.find(t => String(t.id) === String(payload.ticket_id));
            if (!existingTicket || existingTicket.status !== 'closed') {
                playNotificationSound();
                showDesktopNotification('Ticket asignado', `Se te ha asignado el ticket #${payload.ticket_id}`);
            }
        }
    };

    const clearSelectedTicketView = (ticketId: string) => {
        if (!selectedTicket.value || String(selectedTicket.value.id) !== ticketId) {
            return;
        }

        selectedTicket.value = null;

        const timeoutId = typingTimeoutByTicket.get(ticketId);
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
            typingTimeoutByTicket.delete(ticketId);
        }

        typingByTicket.value.delete(ticketId);
        typingByTicket.value = new Map(typingByTicket.value);
        typingOriginByTicket.value.delete(ticketId);
        typingOriginByTicket.value = new Map(typingOriginByTicket.value);
        typingStartedAtByTicket.value.delete(ticketId);
        typingStartedAtByTicket.value = new Map(typingStartedAtByTicket.value);
    };

    const wsOnTicketUpdated = (data: any) => {
        const payload = data.data ?? data;
        const ticketId = String(payload.ticket_id ?? '');
        const ticket = tickets.value.find(t => String(t.id) === String(payload.ticket_id));
        if (ticket && payload.status) {
            ticket.status = payload.status;
        }

        if (payload.status === 'closed' && ticketId !== '') {
            clearSelectedTicketView(ticketId);
        }

        const isAutoInactivityClose =
            payload.status === 'closed' &&
            (payload.close_reason_type === 'auto_inactivity' || payload.origin === 'context_ttl_expired');

        if (isAutoInactivityClose && ticketId !== '') {
            setUiError(`El ticket #${ticketId} se cerró automáticamente por inactividad.`);
        }

        debouncedLoadStats();
        debouncedLoadTickets();
    };

    const wsOnTyping = (data: any) => {
        const payload = data.data ?? data;
        const ticketId = String(payload.ticket_id ?? '');
        if (!ticketId) {
            return;
        }

        const senderId = String(payload.sender_id ?? '');
        if (senderId && senderId === String(currentUserId.value)) {
            return;
        }

        const origin = String(payload.origin ?? 'customer');
        const expiresMs = Number(payload.expires_ms ?? 3000);
        const timeoutMs = Number.isFinite(expiresMs) && expiresMs > 0 ? expiresMs : 3000;

        const currentTimeout = typingTimeoutByTicket.get(ticketId);
        if (currentTimeout !== undefined) {
            clearTimeout(currentTimeout);
        }

        typingByTicket.value.set(ticketId, true);
        typingByTicket.value = new Map(typingByTicket.value);
        typingOriginByTicket.value.set(ticketId, origin);
        typingOriginByTicket.value = new Map(typingOriginByTicket.value);
        typingStartedAtByTicket.value.set(ticketId, Date.now());
        typingStartedAtByTicket.value = new Map(typingStartedAtByTicket.value);

        const timeoutId = window.setTimeout(() => {
            typingByTicket.value.set(ticketId, false);
            typingByTicket.value = new Map(typingByTicket.value);
            typingOriginByTicket.value.delete(ticketId);
            typingOriginByTicket.value = new Map(typingOriginByTicket.value);
            typingStartedAtByTicket.value.delete(ticketId);
            typingStartedAtByTicket.value = new Map(typingStartedAtByTicket.value);
            typingTimeoutByTicket.delete(ticketId);
        }, timeoutMs);

        typingTimeoutByTicket.set(ticketId, timeoutId);
    };

    on('connected', wsOnConnected);
    on('disconnected', wsOnDisconnected);
    on('new_ticket', wsOnNewTicket);
    on('new_message', wsOnNewMessage);
    on('message_status', wsOnMessageStatus);
    on('message_ack', wsOnMessageAck);
    on('ticket_assigned', wsOnTicketAssigned);
    on('assigned_ticket', wsOnAssignedTicket);
    on('ticket_updated', wsOnTicketUpdated);
    on('typing', wsOnTyping);

    // Versiones debounced para evitar múltiples llamadas API en ráfagas de eventos WS.
    // Usan arrow functions para captura lazy: loadStats/loadTickets se resuelven en tiempo
    // De ejecución (cuando el handler se invoca), no en tiempo de declaración.
    const debouncedLoadStats = createDebounced(() => loadStats(), 1500);
    const debouncedLoadTickets = createDebounced(() => loadTickets(), 1000);
    const debouncedTypingSignal = createDebounced(() => {
        if (!selectedTicket.value || !isConnected.value) {
            return;
        }

        send('typing', {
            ticket_id: String(selectedTicket.value.id),
            sender_name: agentName.value,
        });
    }, 800);

    type MessageStatus = NonNullable<Message['status']>;
    type MessageStatusSource = NonNullable<Message['status_source']>;

    const VALID_MESSAGE_STATUSES = new Set<MessageStatus>(['sending', 'sent', 'delivered', 'read', 'failed']);
    const VALID_MESSAGE_STATUS_SOURCES = new Set<MessageStatusSource>(['message_id', 'watermark', 'unknown']);

    const normalizeMessageStatus = (value: unknown): Message['status'] => {
        if (typeof value !== 'string') {
            return undefined;
        }

        return VALID_MESSAGE_STATUSES.has(value as MessageStatus) ? (value as MessageStatus) : undefined;
    };

    const normalizeMessageStatusSource = (value: unknown): Message['status_source'] => {
        if (typeof value !== 'string') {
            return undefined;
        }

        return VALID_MESSAGE_STATUS_SOURCES.has(value as MessageStatusSource)
            ? (value as MessageStatusSource)
            : undefined;
    };

    // =====================================================
    // ESTADO
    // =====================================================

    const tickets = ref<Ticket[]>([]);
    const selectedTicket = ref<Ticket | null>(null);
    const messages = ref<Map<string, Message[]>>(new Map());
    const typingByTicket = ref<Map<string, boolean>>(new Map());
    const typingTimeoutByTicket = new Map<string, number>();
    const typingOriginByTicket = ref<Map<string, string>>(new Map());
    const typingStartedAtByTicket = ref<Map<string, number>>(new Map());
    // Race condition WS: message_status puede llegar antes que new_message.
    // Guardamos estado pendiente por ticket+id para aplicarlo cuando se monte el mensaje.
    const pendingMessageStatusByKey = ref<
        Map<
            string,
            {
                status?: Message['status'];
                status_source?: Message['status_source'];
            }
        >
    >(new Map());
    const TELEGRAM_HEURISTIC_TYPING_MIN_MS = 900;
    const WHATSAPP_HEURISTIC_TYPING_MIN_MS = 800;
    const messagePageByTicket = ref<Map<string, number>>(new Map());
    const messageHasMoreByTicket = ref<Map<string, boolean>>(new Map());
    const loadingTickets = ref(false);
    const loadingMessages = ref(false);
    const stats = ref<TicketStats>({
        pending_assignment: 0,
        assigned: 0,
        in_progress: 0,
        transferred: 0,
        cancelled: 0,
        closed: 0,
        total: 0,
    });

    type TabKey = 'queue' | 'mine' | 'active';
    const activeTab = ref<TabKey>('queue');
    const highlightActiveTab = ref(false);

    const notificationVolume = ref(Number.parseFloat(localStorage.getItem('versa_chat_volume') || '0.5'));
    const activeBlobUrls = new Set<string>();
    const uiErrorMessage = ref('');
    let uiErrorTimeout: number | null = null;

    const clearUiError = () => {
        uiErrorMessage.value = '';

        if (uiErrorTimeout !== null) {
            clearTimeout(uiErrorTimeout);
            uiErrorTimeout = null;
        }
    };

    const setUiError = (message: string, autoClearMs = 7000) => {
        uiErrorMessage.value = message;

        if (uiErrorTimeout !== null) {
            clearTimeout(uiErrorTimeout);
        }

        if (autoClearMs > 0) {
            uiErrorTimeout = window.setTimeout(() => {
                uiErrorMessage.value = '';
                uiErrorTimeout = null;
            }, autoClearMs);
        }
    };

    const refreshAll = async () => {
        clearUiError();
        await Promise.all([loadTickets(), loadStats()]);
    };

    const safeRevokeObjectUrl = (blobUrl: string, delayMs = 0) => {
        const revoke = () => {
            if (!activeBlobUrls.has(blobUrl)) {
                return;
            }

            try {
                URL.revokeObjectURL(blobUrl);
            } catch {
                // Ignorar silenciosamente
            } finally {
                activeBlobUrls.delete(blobUrl);
            }
        };

        if (delayMs > 0) {
            window.setTimeout(revoke, delayMs);
            return;
        }

        revoke();
    };

    watch(notificationVolume, newVolume => {
        localStorage.setItem('versa_chat_volume', newVolume.toString());
    });

    const ticketBuckets = computed(() => {
        const queue: Ticket[] = [];
        const mine: Ticket[] = [];
        const active: Ticket[] = [];
        let unread = 0;

        for (const ticket of tickets.value) {
            unread += ticket.unread_count || 0;

            if (ticket.status === 'pending_assignment') {
                queue.push(ticket);
            }

            if (String(ticket.assigned_to) === String(currentUserId.value)) {
                mine.push(ticket);
            }

            if (ticket.status !== 'closed') {
                active.push(ticket);
            }
        }

        return {
            queue,
            mine,
            active,
            unread,
        };
    });

    const sidebarTabs = computed(() => [
        { key: 'queue' as TabKey, label: 'Cola', badge: stats.value.pending_assignment },
        { key: 'mine' as TabKey, label: 'Mis tickets', badge: ticketBuckets.value.mine.length },
        { key: 'active' as TabKey, label: 'Activos', badge: ticketBuckets.value.active.length },
    ]);

    const tabTickets = computed(() => {
        if (activeTab.value === 'queue') {
            return ticketBuckets.value.queue;
        }
        if (activeTab.value === 'mine') {
            return ticketBuckets.value.mine;
        }
        if (activeTab.value === 'active') {
            return ticketBuckets.value.active;
        }
        return tickets.value;
    });

    const currentMessages = computed(() => {
        if (!selectedTicket.value) {
            return [];
        }
        return messages.value.get(String(selectedTicket.value.id)) || [];
    });

    const transferOptions = computed(() => {
        const currentQueueId = Number(selectedTicket.value?.queue_id ?? 0);
        const currentAssignedId = Number(selectedTicket.value?.assigned_to ?? 0);
        const currentUserIdValue = Number(currentUserId.value || 0);
        if (transferMode.value === 'agent') {
            return transferAgents.value
                .filter(agent => agent.id !== currentAssignedId && agent.id !== currentUserIdValue)
                .map(agent => ({
                    id: agent.id,
                    label: agent.email ? `${agent.name} — ${agent.email}` : agent.name,
                }));
        }
        return transferQueues.value
            .filter(queue => queue.id !== currentQueueId)
            .map(queue => ({
                id: queue.id,
                label: queue.name,
            }));
    });

    const currentTicketTyping = computed(() => {
        const ticketId = String(selectedTicket.value?.id ?? '');
        if (!ticketId) {
            return false;
        }

        return typingByTicket.value.get(ticketId) === true;
    });

    const totalUnread = computed(() => ticketBuckets.value.unread);

    const myActiveCount = computed(() => ticketBuckets.value.mine.filter(t => t.status !== 'closed').length);

    const activeCount = computed(() => ticketBuckets.value.active.length);

    // =====================================================
    // API
    // =====================================================

    const loadTickets = async () => {
        // Guard: evitar múltiples peticiones concurrentes (ej: ráfaga de eventos WS al reconectar)
        if (loadingTickets.value) {
            return;
        }
        const stopTiming = trackTiming('loadTickets');
        loadingTickets.value = true;
        // Filtrar por el día actual y sólo tickets relevantes para el agente:
        // - tickets pendientes de asignación (cola visible para todos los agentes)
        // - tickets asignados al agente actual (agent_view=1 aplica este filtro en backend)
        const [today] = new Date().toISOString().split('T');
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/tickets?per_page=200&date_from=${today}&agent_view=1`,
                method: 'GET',
            });
            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                const fetchedTickets = (response.data as PaginatedResponse<Ticket>).data;

                // Preservar unread_count=0 del ticket actualmente seleccionado:
                // Si ya lo limpiamos localmente, el servidor puede devolverlo con valor > 0
                // Antes de que la DB registre el reset (race condition leve).
                const selectedId = String(selectedTicket.value?.id ?? '');
                if (selectedId) {
                    const fetched = fetchedTickets.find(t => String(t.id) === selectedId);
                    if (fetched) {
                        fetched.unread_count = 0;
                    }

                    if (!fetched || fetched.status === 'closed') {
                        clearSelectedTicketView(selectedId);
                    }
                }

                tickets.value = fetchedTickets;

                // Si estamos en la cola y no hay nada, saltamos a Activos para que no se vea vacío
                if (
                    activeTab.value === 'queue' &&
                    fetchedTickets.filter(t => t.status === 'pending_assignment').length === 0
                ) {
                    activeTab.value = 'active';
                }

                stopTiming('ok', { tickets: fetchedTickets.length });
            } else {
                stopTiming('error', { success: response.success });
            }
        } catch (error) {
            debugError('Error al cargar tickets', { error: error as unknown });
            stopTiming('error');
            setUiError('No se pudieron cargar los tickets. Verifica tu conexión e inténtalo nuevamente.');
        } finally {
            loadingTickets.value = false;
        }
    };

    const loadStats = async () => {
        const stopTiming = trackTiming('loadStats');
        try {
            const response = await versaFetch({ url: `/${panelUrl}/inbox/api/tickets/stats`, method: 'GET' });
            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                stats.value = response.data as TicketStats;
                stopTiming('ok');
            } else {
                stopTiming('error', { success: response.success });
            }
        } catch (error) {
            debugError('Error al cargar stats', { error: error as unknown });
            stopTiming('error');
            setUiError('No se pudieron cargar las estadísticas del inbox.');
        }
    };

    const loadMessages = async (ticketId: string, appendOlder = false) => {
        if (loadingMessages.value) {
            return;
        }
        const stopTiming = trackTiming('loadMessages', { ticketId, appendOlder });

        const currentPage = messagePageByTicket.value.get(ticketId) ?? 0;
        const nextPage = appendOlder ? currentPage + 1 : 1;

        loadingMessages.value = true;
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/tickets/${ticketId}/messages?page=${nextPage}&per_page=${MESSAGES_PER_PAGE}`,
                method: 'GET',
            });
            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                const paginated = response.data as PaginatedResponse<Message>;
                const msgs = paginated.data;

                // LRU simple: si al agregar un ticket nuevo superamos el límite, eliminar
                // La entrada más antigua que no sea el ticket actualmente seleccionado.
                if (!messages.value.has(ticketId) && messages.value.size >= MAX_MESSAGES_CACHED_TICKETS) {
                    for (const key of messages.value.keys()) {
                        if (key !== String(selectedTicket.value?.id)) {
                            messages.value.delete(key);
                            messagePageByTicket.value.delete(key);
                            messageHasMoreByTicket.value.delete(key);
                            break;
                        }
                    }
                }

                if (!appendOlder) {
                    messages.value.set(ticketId, msgs);
                } else {
                    const current = messages.value.get(ticketId) || [];

                    if (current.length === 0) {
                        messages.value.set(ticketId, msgs);
                    } else {
                        const firstCurrentTs = new Date(
                            current[0]?.message_timestamp || current[0]?.created_at || 0,
                        ).getTime();
                        const firstIncomingTs = new Date(
                            msgs[0]?.message_timestamp || msgs[0]?.created_at || 0,
                        ).getTime();

                        const merged =
                            firstIncomingTs <= firstCurrentTs ? [...msgs, ...current] : [...current, ...msgs];
                        const deduped = [...new Map(merged.map(item => [String(item.id), item])).values()];
                        messages.value.set(ticketId, deduped);
                    }
                }

                messagePageByTicket.value.set(ticketId, nextPage);
                messageHasMoreByTicket.value.set(ticketId, nextPage < paginated.total_pages);
                stopTiming('ok', {
                    page: nextPage,
                    totalPages: paginated.total_pages,
                    batchSize: msgs.length,
                });
            } else {
                stopTiming('error', { success: response.success, page: nextPage });
            }
        } catch (error) {
            debugError('Error al cargar mensajes', { error: error as unknown, ticketId, page: nextPage });
            stopTiming('error', { page: nextPage });
            setUiError('No se pudo cargar el historial del ticket.');
        } finally {
            loadingMessages.value = false;
        }
    };

    const selectTicket = async (ticket: Ticket) => {
        selectedTicket.value = ticket;
        ticket.unread_count = 0;

        const ticketId = String(ticket.id);
        messagePageByTicket.value.set(ticketId, 0);
        messageHasMoreByTicket.value.set(ticketId, true);

        await loadMessages(ticketId);
    };

    const takeTicket = async (ticket: Ticket) => {
        const stopTiming = trackTiming('takeTicket', { ticketId: String(ticket.id) });
        // Selección optimista: evita que mensajes WS entrantes disparen alertas/sonidos
        // Mientras la asignación se procesa de forma asíncrona
        selectedTicket.value = ticket;
        ticket.unread_count = 0;

        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/tickets/${ticket.id}/assign`,
                method: 'POST',
                data: JSON.stringify({}),
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf_token ?? '' },
            });
            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                await Promise.all([loadTickets(), loadStats()]);

                // Animación para indicar que se asignó exitosamente
                highlightActiveTab.value = true;
                setTimeout(() => {
                    highlightActiveTab.value = false;
                }, 2000);

                // LoadTickets() reemplaza tickets.value con objetos nuevos del servidor;
                // Buscar el objeto actualizado para limpiar su badge correctamente
                const updatedTicket = tickets.value.find(t => String(t.id) === String(ticket.id));
                await selectTicket(updatedTicket ?? ticket);
                stopTiming('ok');
            } else {
                // Revertir la selección optimista si la asignación falló
                selectedTicket.value = null;
                stopTiming('error', { success: response.success });
            }
        } catch (error) {
            debugError('Error al tomar ticket', { error: error as unknown, ticketId: String(ticket.id) });
            selectedTicket.value = null;
            stopTiming('error');
            setUiError('No se pudo tomar el ticket en este momento.');
        }
    };

    const mimeToMessageType = (mime: string): Message['message_type'] => {
        if (mime.startsWith('image/')) {
            return 'image';
        }
        if (mime.startsWith('video/')) {
            return 'video';
        }
        if (mime.startsWith('audio/')) {
            return 'audio';
        }
        return 'document';
    };

    const handleSendMessage = async (payload: { content: string; attachments: File[] }) => {
        if (!selectedTicket.value || (!payload.content.trim() && payload.attachments.length === 0)) {
            return;
        }

        const ticketId = String(selectedTicket.value.id);

        // Si hay archivos adjuntos: subir vía HTTP en paralelo
        if (payload.attachments.length > 0) {
            await Promise.all(
                payload.attachments.map((file, index) =>
                    // El caption solo va en el primer archivo
                    uploadMediaMessage(ticketId, file, index === 0 ? payload.content.trim() : ''),
                ),
            );
            return;
        }

        // Texto sin adjuntos: flujo WebSocket existente
        const content = payload.content.trim();
        const tempId = `temp-${Date.now()}`;
        const tempMessage: Message = {
            id: tempId,
            ticket_id: ticketId,
            direction: 'outbound',
            sender_type: 'agent',
            sender_name: agentName.value,
            sender_id: String(currentUserId.value),
            message_type: 'text',
            content,
            message_timestamp: new Date().toISOString(),
            seen_by_agent: true,
            created_at: new Date().toISOString(),
            status: 'sending',
        };

        // Actualización optimista
        const ticketMessages = messages.value.get(ticketId) || [];
        ticketMessages.push(tempMessage);
        messages.value.set(ticketId, [...ticketMessages]);

        // Actualizar sidebar
        selectedTicket.value.last_message_text = content;
        selectedTicket.value.last_message_at = new Date().toISOString();

        // Enviar vía WebSocket
        debugLog('Enviando mensaje vía WS', { ticketId, hasContent: content.length > 0 });
        if (isConnected.value) {
            send('send_message', {
                ticket_id: ticketId,
                content,
                sender_name: agentName.value,
                message_type: 'text',
            });
        } else {
            debugError('No conectado al WebSocket al enviar mensaje', { ticketId });
            tempMessage.status = 'failed';
        }
    };

    /**
     * Sube un archivo adjunto al servidor y lo envía a la red social.
     * Usa actualización optimista: muestra el archivo en el chat antes de confirmar.
     */
    const uploadMediaMessage = async (ticketId: string, file: File, caption: string): Promise<void> => {
        const stopTiming = trackTiming('uploadMediaMessage', {
            ticketId,
            fileSize: file.size,
            mime: file.type,
        });
        const messageType = mimeToMessageType(file.type);
        const tempId = `temp-${Date.now()}-${Math.random()}`;

        // URL temporal de objeto para previsualización local
        const blobUrl = URL.createObjectURL(file);
        activeBlobUrls.add(blobUrl);

        const tempMessage: Message = {
            id: tempId,
            ticket_id: ticketId,
            direction: 'outbound',
            sender_type: 'agent',
            sender_name: agentName.value,
            sender_id: String(currentUserId.value),
            message_type: messageType,
            content: caption,
            media_url: blobUrl,
            media_mime: file.type,
            message_timestamp: new Date().toISOString(),
            seen_by_agent: true,
            created_at: new Date().toISOString(),
            status: 'sending',
            metadata: {
                original_file_name: file.name,
            },
        };

        const ticketMessages = messages.value.get(ticketId) || [];
        ticketMessages.push(tempMessage);
        messages.value.set(ticketId, [...ticketMessages]);

        if (selectedTicket.value && String(selectedTicket.value.id) === ticketId) {
            selectedTicket.value.last_message_text = caption || `[${file.name}]`;
            selectedTicket.value.last_message_at = new Date().toISOString();
        }

        const formData = new FormData();
        formData.append('file', file);
        if (caption) {
            formData.append('caption', caption);
        }

        try {
            const result = (await versaFetch({
                url: `/${panelUrl}/inbox/api/tickets/${ticketId}/send-media`,
                method: 'POST',
                headers: { 'X-CSRF-Token': csrf_token ?? '' },
                data: formData,
            })) as {
                success: number;
                message?: string;
                data?: {
                    id: string;
                    media_url: string;
                    media_mime: string;
                    message_type: Message['message_type'];
                    content: string;
                    metadata?: Record<string, unknown>;
                };
            };

            const msgs = messages.value.get(ticketId) || [];
            const idx = msgs.findIndex(m => m.id === tempId);

            if (result.success === 1 && result.data) {
                // Reemplazar mensaje temporal con datos reales del servidor
                safeRevokeObjectUrl(blobUrl);
                const original = idx !== -1 ? msgs[idx] : undefined;
                if (original !== undefined) {
                    msgs[idx] = {
                        ...original,
                        id: String(result.data.id),
                        media_url: result.data.media_url,
                        media_mime: result.data.media_mime,
                        message_type: result.data.message_type,
                        status: 'sent',
                        metadata: result.data.metadata ?? original.metadata,
                    };
                    messages.value.set(ticketId, [...msgs]);
                }
                stopTiming('ok');
            } else {
                // Marcar como fallido
                const failedMsg = idx !== -1 ? msgs[idx] : undefined;
                if (failedMsg !== undefined) {
                    failedMsg.status = 'failed';
                    messages.value.set(ticketId, [...msgs]);
                }
                safeRevokeObjectUrl(blobUrl, 30_000);
                debugError('Error al subir archivo', { result });
                stopTiming('error', { success: result.success });
                setUiError(result.message || 'No se pudo enviar el archivo adjunto.');
            }
        } catch (error) {
            debugError('Error de red al subir archivo', { error: error as unknown, ticketId });
            const msgs = messages.value.get(ticketId) || [];
            const idx = msgs.findIndex(m => m.id === tempId);
            const failedMsg = idx !== -1 ? msgs[idx] : undefined;
            if (failedMsg !== undefined) {
                failedMsg.status = 'failed';
                messages.value.set(ticketId, [...msgs]);
            }

            safeRevokeObjectUrl(blobUrl, 30_000);
            stopTiming('error');
            setUiError('Error de red al subir el archivo adjunto.');
        }
    };

    const handleCloseTicket = async () => {
        if (!selectedTicket.value) {
            return;
        }
        const ticketId = String(selectedTicket.value.id);
        const stopTiming = trackTiming('handleCloseTicket', { ticketId });
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/tickets/${ticketId}/close`,
                method: 'POST',
                data: JSON.stringify({}),
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf_token ?? '' },
            });
            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                // Notificar al motor de routing vía WS
                send('close_ticket', {
                    ticket_id: ticketId,
                    queue_id: selectedTicket.value.queue_id,
                });

                selectedTicket.value = null;
                await Promise.all([loadTickets(), loadStats()]);
                stopTiming('ok');
            } else {
                stopTiming('error', { success: response.success });
            }
        } catch (error) {
            debugError('Error al cerrar ticket', { error: error as unknown, ticketId });
            stopTiming('error');
            setUiError('No se pudo cerrar el ticket en este momento.');
        }
    };

    /**
     * Cierre iniciado desde CloseTicketModal (ya incluyó la llamada HTTP close-with-reason).
     * Solo notifica al motor de routing vía WS y refresca la UI — sin rellamar al endpoint HTTP close.
     */
    const handleTicketClosedWithReason = async () => {
        if (!selectedTicket.value) {
            return;
        }
        const ticketId = String(selectedTicket.value.id);
        // Notificar al motor de routing para liberar capacidad del agente
        send('close_ticket', {
            ticket_id: ticketId,
            queue_id: selectedTicket.value.queue_id,
        });
        selectedTicket.value = null;
        await Promise.all([loadTickets(), loadStats()]);
    };

    const handleLoadMoreMessages = async () => {
        if (!selectedTicket.value || loadingMessages.value) {
            return;
        }

        const ticketId = String(selectedTicket.value.id);
        const hasMore = messageHasMoreByTicket.value.get(ticketId) ?? true;
        if (!hasMore) {
            return;
        }

        await loadMessages(ticketId, true);
    };

    const handleTypingSignal = () => {
        debouncedTypingSignal();
    };

    const handleSendLocation = async (payload: { latitude: number; longitude: number; name?: string }) => {
        if (!selectedTicket.value) {
            return;
        }

        const ticketId = String(selectedTicket.value.id);
        const tempId = `temp-location-${Date.now()}`;

        const tempMessage: Message = {
            id: tempId,
            ticket_id: ticketId,
            direction: 'outbound',
            sender_type: 'agent',
            sender_name: agentName.value,
            sender_id: String(currentUserId.value),
            message_type: 'location',
            content: payload.name || 'Ubicación compartida',
            message_timestamp: new Date().toISOString(),
            seen_by_agent: true,
            created_at: new Date().toISOString(),
            status: 'sending',
            metadata: {
                location: {
                    latitude: payload.latitude,
                    longitude: payload.longitude,
                    name: payload.name || 'Ubicación compartida',
                },
            },
        };

        const ticketMessages = messages.value.get(ticketId) || [];
        ticketMessages.push(tempMessage);
        messages.value.set(ticketId, [...ticketMessages]);

        selectedTicket.value.last_message_text = 'Ubicación compartida';
        selectedTicket.value.last_message_at = new Date().toISOString();

        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/tickets/${ticketId}/messages`,
                method: 'POST',
                data: JSON.stringify({
                    message_type: 'location',
                    content: payload.name || 'Ubicación compartida',
                    metadata: {
                        location: {
                            latitude: payload.latitude,
                            longitude: payload.longitude,
                            name: payload.name || 'Ubicación compartida',
                        },
                    },
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrf_token ?? '',
                },
            });

            const msgs = messages.value.get(ticketId) || [];
            const idx = msgs.findIndex(m => m.id === tempId);
            if (idx === -1) {
                return;
            }

            const currentMsg = msgs[idx];
            if (!currentMsg) {
                return;
            }

            if (API_RESPONSE_CODES.SUCCESS === response.success && response.data) {
                const serverMsg = response.data as Message;
                msgs[idx] = {
                    ...currentMsg,
                    id: String(serverMsg.id || currentMsg.id),
                    status: serverMsg.status || 'sent',
                    message_timestamp: serverMsg.message_timestamp || currentMsg.message_timestamp,
                    created_at: serverMsg.created_at || currentMsg.created_at,
                    metadata: serverMsg.metadata || currentMsg.metadata,
                };
                messages.value.set(ticketId, [...msgs]);
            } else {
                currentMsg.status = 'failed';
                messages.value.set(ticketId, [...msgs]);
                setUiError(response.message || 'No se pudo enviar la ubicación.');
            }
        } catch (error) {
            const msgs = messages.value.get(ticketId) || [];
            const idx = msgs.findIndex(m => m.id === tempId);
            if (idx !== -1) {
                const currentMsg = msgs[idx];
                if (currentMsg) {
                    currentMsg.status = 'failed';
                }
                messages.value.set(ticketId, [...msgs]);
            }

            debugError('Error al enviar ubicación', { error: error as unknown, ticketId });
            setUiError('Error de red al enviar ubicación.');
        }
    };

    const handleMessageStatusUpdate = (data: any) => {
        const { ticket_id, message_id, db_message_id, status, status_source } = data;
        const ticketId = String(ticket_id);
        const messageId = String(message_id);
        const dbMessageId = String(db_message_id ?? '');
        const normalizedStatus = normalizeMessageStatus(status);
        const normalizedStatusSource = normalizeMessageStatusSource(status_source);

        const ticketMessages = messages.value.get(ticketId);
        let messageFound = false;
        if (ticketMessages) {
            // Buscamos por external_id (message_id) o por el ID temporal si fuera el caso (aunque ACTION_STATUS suele venir con ID real)
            const msgIdx = ticketMessages.findIndex(m => {
                const candidatePlatformId = String(m.message_id ?? '');
                return (
                    (dbMessageId !== '' && String(m.id) === dbMessageId) ||
                    (messageId !== '' && candidatePlatformId === messageId) ||
                    (messageId !== '' && String(m.id) === messageId)
                );
            });
            const targetMsg = msgIdx !== -1 ? ticketMessages[msgIdx] : undefined;
            if (targetMsg) {
                if (normalizedStatus) {
                    targetMsg.status = normalizedStatus;
                }

                if (normalizedStatusSource) {
                    targetMsg.status_source = normalizedStatusSource;
                }

                messages.value.set(ticketId, [...ticketMessages]);
                messageFound = true;
            }
        }

        if (messageFound || ticketId === '') {
            return;
        }

        if (!normalizedStatus && !normalizedStatusSource) {
            return;
        }

        const pendingStatus = {
            status: normalizedStatus,
            status_source: normalizedStatusSource,
        };

        // Si no existe en cache aún, persistimos el estado en ambas claves posibles.
        if (dbMessageId !== '') {
            pendingMessageStatusByKey.value.set(`${ticketId}:${dbMessageId}`, pendingStatus);
        }
        if (messageId !== '' && messageId !== dbMessageId) {
            pendingMessageStatusByKey.value.set(`${ticketId}:${messageId}`, pendingStatus);
        }
    };

    const handleRetryMessage = async (payload: { messageId: string }) => {
        if (!selectedTicket.value) {
            setUiError('No hay un ticket seleccionado para reenviar el mensaje.');
            return;
        }

        const ticketId = String(selectedTicket.value.id);
        const messageId = String(payload.messageId);

        const ticketMessages = messages.value.get(ticketId) || [];
        const msgIdx = ticketMessages.findIndex(m => String(m.id) === messageId);
        const targetMsg = msgIdx !== -1 ? ticketMessages[msgIdx] : undefined;

        if (!targetMsg) {
            setUiError('No se encontró el mensaje a reenviar en la conversación actual.');
            return;
        }

        targetMsg.status = 'sending';
        messages.value.set(ticketId, [...ticketMessages]);

        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/tickets/${ticketId}/messages/${messageId}/retry`,
                method: 'POST',
                data: JSON.stringify({}),
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrf_token ?? '',
                },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success && response.data) {
                const updatedMessage = response.data as Message;
                targetMsg.status = updatedMessage.status || 'sent';
                targetMsg.message_timestamp = updatedMessage.message_timestamp || targetMsg.message_timestamp;
                targetMsg.message_id = updatedMessage.message_id || targetMsg.message_id;
                targetMsg.status_source = updatedMessage.status_source || targetMsg.status_source;
                targetMsg.metadata = updatedMessage.metadata || targetMsg.metadata;
                messages.value.set(ticketId, [...ticketMessages]);
                return;
            }

            targetMsg.status = 'failed';
            messages.value.set(ticketId, [...ticketMessages]);
            setUiError(response.message || 'No se pudo reenviar el mensaje.');
        } catch (error) {
            debugError('Error al reenviar mensaje', {
                error: error as unknown,
                ticketId,
                messageId,
            });
            targetMsg.status = 'failed';
            messages.value.set(ticketId, [...ticketMessages]);
            setUiError('Error de red al reenviar el mensaje.');
        }
    };

    const handleIncomingMessage = (data: any) => {
        // Data = wrapper PHP: { message, ticket_id, direction, sender_type, timestamp, platform, ... }
        // Data.message = ChatbotMessage.toArray() + campos extra (id, content)
        const payload = data.message || data.data?.message || data;
        const ticketId = String(data.ticket_id || payload.ticket_id);

        // Los campos direction y sender_type vienen en el wrapper (data), no en el ChatbotMessage
        const direction = (data.direction || payload.direction || 'inbound') as 'inbound' | 'outbound';
        const senderType = (data.sender_type || payload.sender_type || 'customer') as 'customer' | 'agent' | 'system';

        // El ID definitivo usa el DB ID (payload.id) o el platform message ID como fallback
        const messageId = String(payload.id || payload.message_id || `ws-${ticketId}-${Date.now()}`);

        const ticketMessages = messages.value.get(ticketId) || [];

        // Evitar duplicados por ID real (DB id o platform message id)
        if (payload.id !== null && payload.id !== undefined && ticketMessages.some(m => String(m.id) === messageId)) {
            return;
        }

        // PHP envía message_text (ChatbotMessage); el campo normalizado es content
        const content = String(payload.content || payload.message_text || '');

        // PHP puede mandar timestamp unix (segundos) o un string de fecha (ej. 2026-...)
        let msgTimestamp = payload.message_timestamp || payload.created_at || new Date().toISOString();
        if (payload.timestamp) {
            const numTs = Number(payload.timestamp);
            if (!Number.isNaN(numTs)) {
                // Es unix timestamp (segundos)
                msgTimestamp = new Date(numTs * 1000).toISOString();
            } else {
                // Es un string de fecha (YYYY-MM-DD HH:mm:ss)
                msgTimestamp = payload.timestamp;
            }
        }

        const message: Message = {
            id: messageId,
            ticket_id: ticketId,
            direction,
            sender_type: senderType,
            sender_name: payload.sender_name || data.sender_name || '',
            sender_id: String(payload.sender_id || payload.channel_id || ''),
            message_type: (payload.message_type || 'text') as Message['message_type'],
            content,
            media_url: payload.media_url || undefined,
            media_mime: payload.media_mime || undefined,
            message_id: payload.message_id ? String(payload.message_id) : undefined,
            metadata: payload.metadata || undefined,
            message_timestamp: msgTimestamp,
            seen_by_agent: payload.seen_by_agent ?? false,
            created_at: payload.created_at || new Date().toISOString(),
            status: payload.status || (direction === 'outbound' ? 'sent' : 'received'),
        };

        // Race condition WS: si message_status llegó antes que new_message,
        // Aplicamos aquí el estado pendiente antes de guardar en memoria reactiva.
        const pendingByDbId = pendingMessageStatusByKey.value.get(`${ticketId}:${message.id}`);
        const pendingByPlatformId =
            message.message_id && message.message_id !== message.id
                ? pendingMessageStatusByKey.value.get(`${ticketId}:${message.message_id}`)
                : undefined;
        const pendingStatus = pendingByDbId ?? pendingByPlatformId;

        if (pendingStatus) {
            if (pendingStatus.status) {
                message.status = pendingStatus.status;
            }
            if (pendingStatus.status_source) {
                message.status_source = pendingStatus.status_source;
            }

            pendingMessageStatusByKey.value.delete(`${ticketId}:${message.id}`);
            if (message.message_id && message.message_id !== message.id) {
                pendingMessageStatusByKey.value.delete(`${ticketId}:${message.message_id}`);
            }
        }

        const appendMessage = () => {
            // Para mensajes salientes propios ya agregados de forma optimista, evitar duplicar
            const isDuplicateOptimistic =
                direction === 'outbound' &&
                ticketMessages.some(
                    m =>
                        m.id.toString().startsWith('temp-') &&
                        m.content === content &&
                        m.sender_id === message.sender_id,
                );

            if (!isDuplicateOptimistic) {
                ticketMessages.push(message);
                messages.value.set(ticketId, [...ticketMessages]);
            }

            if (typingByTicket.value.get(ticketId) === true) {
                typingByTicket.value.set(ticketId, false);
                typingByTicket.value = new Map(typingByTicket.value);
                typingOriginByTicket.value.delete(ticketId);
                typingOriginByTicket.value = new Map(typingOriginByTicket.value);
                typingStartedAtByTicket.value.delete(ticketId);
                typingStartedAtByTicket.value = new Map(typingStartedAtByTicket.value);

                const timeoutId = typingTimeoutByTicket.get(ticketId);
                if (timeoutId !== undefined) {
                    clearTimeout(timeoutId);
                    typingTimeoutByTicket.delete(ticketId);
                }
            }

            const ticket = tickets.value.find(t => String(t.id) === ticketId);
            if (ticket) {
                // Tickets cerrados: solo actualizar el cache de mensajes, sin notificar.
                // Esto evita alertas/sonidos al reconectar y recibir eventos buffereados de
                // Conversaciones que ya fueron cerradas mientras el agente estaba desconectado.
                if (ticket.status === 'closed') {
                    return;
                }

                ticket.last_message_text = content;
                ticket.last_message_at = msgTimestamp;

                // Incrementar no leídos si no está en este ticket, o si la pestaña está oculta
                const isCurrentTicket = String(selectedTicket.value?.id) === ticketId;
                if (!isCurrentTicket || document.hidden) {
                    if (!isCurrentTicket) {
                        ticket.unread_count = (ticket.unread_count || 0) + 1;
                    }
                    playNotificationSound();
                    showDesktopNotification(`Nuevo mensaje de ${message.sender_name || 'Cliente'}`, content);
                }
                // Mover el ticket al principio de la lista
                tickets.value = [ticket, ...tickets.value.filter(t => String(t.id) !== ticketId)];
            } else {
                // El ticket no está en la lista local: puede ser recién asignado (normal)
                // O un mensaje buffereado del reconectar (hay que ignorar la notificación).
                // Usamos debounce para que múltiples mensajes del mismo burst
                // Solo generen una sola recarga de la lista.
                debouncedLoadTickets();

                // Solo notificar si estamos fuera de la ventana post-reconexión.
                // En los primeros RECONNECT_BURST_WINDOW_MS ms después de conectar,
                // Los mensajes buffereados no deben generar sonido ni alerta desktop
                // Porque el agente aún no tiene el estado actualizado.
                const isReconnectBurst = Date.now() - lastConnectTime < RECONNECT_BURST_WINDOW_MS;
                if (!isReconnectBurst) {
                    playNotificationSound();
                    showDesktopNotification(`Nuevo mensaje de ${message.sender_name || 'Cliente'}`, content);
                }
            }
        };

        const inboundPlatform = normalizePlatform(data.platform || '');
        const isInboundTelegram = direction === 'inbound' && inboundPlatform === 'telegram';
        const isInboundWhatsApp = direction === 'inbound' && inboundPlatform === 'whatsapp';
        const typingOrigin = typingOriginByTicket.value.get(ticketId) ?? '';
        const typingStartedAt = typingStartedAtByTicket.value.get(ticketId) ?? 0;
        const isHeuristicTelegramTyping =
            isInboundTelegram &&
            typingByTicket.value.get(ticketId) === true &&
            typingOrigin === 'customer_heuristic_telegram';
        const isHeuristicWhatsAppTyping =
            isInboundWhatsApp &&
            typingByTicket.value.get(ticketId) === true &&
            typingOrigin === 'customer_heuristic_whatsapp';

        if (isHeuristicTelegramTyping || isHeuristicWhatsAppTyping) {
            const elapsed = Date.now() - typingStartedAt;
            const minTypingMs = isHeuristicTelegramTyping
                ? TELEGRAM_HEURISTIC_TYPING_MIN_MS
                : WHATSAPP_HEURISTIC_TYPING_MIN_MS;
            const waitMs = Math.max(0, minTypingMs - elapsed);
            if (waitMs > 0) {
                window.setTimeout(() => {
                    appendMessage();
                }, waitMs);

                return;
            }
        }

        appendMessage();
    };

    const playNotificationSound = () => {
        // Throttle: máximo 1 sonido cada SOUND_THROTTLE_MS ms.
        // Evita spam de sonidos en ráfagas de mensajes buffereados al reconectar.
        const now = Date.now();
        if (now - lastSoundTime < SOUND_THROTTLE_MS) {
            return;
        }
        lastSoundTime = now;

        // Reutilizar la instancia singleton para evitar crear un objeto Audio por cada sonido
        notificationAudio.volume = notificationVolume.value;
        notificationAudio.currentTime = 0; // Rebobinar para poder reproducir inmediatamente
        notificationAudio.play().catch((_err: unknown) => {
            // Ignorado silenciosamente — el usuario puede tener audio muteado o bloqueado
        });
    };

    const showDesktopNotification = (title: string, body: string) => {
        // Throttle: máximo 1 notificación desktop cada NOTIF_THROTTLE_MS ms
        const now = Date.now();
        if (now - lastDesktopNotifTime < NOTIF_THROTTLE_MS) {
            return;
        }
        lastDesktopNotifTime = now;

        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, { body });
            notification.addEventListener('click', () => {
                window.focus();
                notification.close();
            });
        }
    };

    onMounted(async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        await Promise.all([loadTickets(), loadStats(), loadOutboundConfig()]);
    });

    onUnmounted(() => {
        // Desregistrar todos los handlers WS para evitar acumulación en el singleton
        off('connected', wsOnConnected);
        off('disconnected', wsOnDisconnected);
        off('new_ticket', wsOnNewTicket);
        off('new_message', wsOnNewMessage);
        off('message_status', wsOnMessageStatus);
        off('message_ack', wsOnMessageAck);
        off('ticket_assigned', wsOnTicketAssigned);
        off('assigned_ticket', wsOnAssignedTicket);
        off('ticket_updated', wsOnTicketUpdated);
        off('typing', wsOnTyping);

        for (const timeoutId of typingTimeoutByTicket.values()) {
            clearTimeout(timeoutId);
        }
        typingTimeoutByTicket.clear();
        typingByTicket.value = new Map();
        typingOriginByTicket.value = new Map();
        typingStartedAtByTicket.value = new Map();

        for (const blobUrl of activeBlobUrls) {
            try {
                URL.revokeObjectURL(blobUrl);
            } catch {
                // Ignorar silenciosamente
            }
        }
        activeBlobUrls.clear();
        clearUiError();
    });
</script>

<style scoped>
    @keyframes pulse-teal {
        0%,
        100% {
            background-color: transparent;
        }
        50% {
            background-color: rgba(20, 184, 166, 0.2);
        }
    }

    .animate-pulse-teal {
        animation: pulse-teal 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        border-radius: 0.5rem;
    }
</style>
