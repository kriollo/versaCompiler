<template>
    <div
        v-if="!ticket"
        class="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 overflow-hidden h-full">
        <svg
            class="w-32 h-32 text-gray-300 dark:text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <h3 class="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">Selecciona un ticket</h3>
        <p class="text-sm text-gray-400 dark:text-gray-500">Elige una conversación para comenzar a chatear</p>
    </div>

    <div v-else class="flex flex-col bg-white dark:bg-gray-800 overflow-hidden h-full min-h-0 max-h-full">
        <!-- Header del chat -->
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                        :class="getPlatformColor(ticket.platform)">
                        {{ getInitials(ticket.customer_name) }}
                    </div>
                    <div>
                        <h3 class="font-semibold text-gray-900 dark:text-white">
                            {{ ticket.customer_name || 'Desconocido' }}
                        </h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            {{ ticket.customer_phone || 'Sin teléfono' }}
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <button
                        v-if="ticket.status !== 'closed'"
                        @click="emitTransferTicket('agent')"
                        class="px-3 py-1.5 bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors border border-gray-300 dark:border-gray-600">
                        Derivar a agente
                    </button>
                    <button
                        v-if="ticket.status !== 'closed'"
                        @click="emitTransferTicket('queue')"
                        class="px-3 py-1.5 bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors border border-gray-300 dark:border-gray-600">
                        Enviar a cola
                    </button>
                    <!-- Botón de cerrar ticket con razón -->
                    <button
                        v-if="ticket.status !== 'closed'"
                        @click="showCloseModal = true"
                        class="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors">
                        Cerrar Ticket
                    </button>

                    <button
                        @click="toggleHistoryPanel"
                        aria-label="Mostrar historial del cliente"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 transition-colors"
                        :class="showHistoryPanel ? 'bg-gray-200 dark:bg-gray-700' : 'bg-transparent'">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6" />
                        </svg>
                        Historial
                    </button>

                    <!-- Botón de plantillas -->
                    <button
                        v-if="messageTemplates.length > 0"
                        type="button"
                        @click="toggleTemplatesPanel"
                        :disabled="!isConnected || ticket.status === 'closed'"
                        aria-label="Abrir plantillas de mensajes"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M7 8h10M7 12h8m-8 4h6m9-6a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Plantillas
                    </button>

                    <!-- Botón de info del ticket -->
                    <button
                        @click="showInfo = !showInfo"
                        aria-label="Mostrar información del ticket"
                        class="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <svg
                            class="w-5 h-5 text-gray-600 dark:text-gray-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Info expandible del ticket -->
            <div
                v-if="showInfo"
                class="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div class="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <span class="text-gray-500 dark:text-gray-400">ID:</span>
                        <span class="ml-2 font-medium text-gray-900 dark:text-white">{{ ticket.id }}</span>
                    </div>
                    <div>
                        <span class="text-gray-500 dark:text-gray-400">Estado:</span>
                        <span
                            class="ml-2 px-2 py-0.5 rounded text-xs font-medium"
                            :class="getStatusClass(ticket.status)">
                            {{ getStatusLabel(ticket.status) }}
                        </span>
                    </div>
                    <div>
                        <span class="text-gray-500 dark:text-gray-400">Prioridad:</span>
                        <span
                            class="ml-2 px-2 py-0.5 rounded text-xs font-medium"
                            :class="getPriorityClass(ticket.priority)">
                            {{ getPriorityLabel(ticket.priority) }}
                        </span>
                    </div>
                    <div>
                        <span class="text-gray-500 dark:text-gray-400">Creado:</span>
                        <span class="ml-2 font-medium text-gray-900 dark:text-white">
                            {{ formatDate(ticket.created_at) }}
                        </span>
                    </div>
                    <div>
                        <span class="text-gray-500 dark:text-gray-400">Asignado:</span>
                        <span class="ml-2 font-medium text-gray-900 dark:text-white">
                            {{ assignedDisplayDate ? formatDate(assignedDisplayDate) : '-' }}
                        </span>
                    </div>
                    <div>
                        <span class="text-gray-500 dark:text-gray-400">Cerrado:</span>
                        <span class="ml-2 font-medium text-gray-900 dark:text-white">
                            {{ ticket.closed_at ? formatDate(ticket.closed_at) : '-' }}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex-1 min-h-0 flex flex-col lg:flex-row">
            <div class="flex-1 min-h-0 min-w-0 flex flex-col">
                <!-- Área de mensajes -->
                <div
                    ref="messagesContainer"
                    class="flex-1 overflow-y-auto min-h-0 p-4 space-y-3 bg-gray-50 dark:bg-gray-900 bg-[url('/public/dashboard/img/chat/chat-bg-white.webp')] dark:bg-[url('/public/dashboard/img/chat/chat-bg-black.webp')]"
                    @scroll="handleScroll">
                    <!-- Mensaje de carga de historial -->
                    <div v-if="loadingHistory" class="flex justify-center py-2">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                    </div>

                    <!-- Mensajes -->
                    <div
                        v-for="message in messages"
                        :key="message.id"
                        class="flex"
                        :class="
                            message.sender_type === 'agent' || message.direction === 'outbound'
                                ? 'justify-end'
                                : 'justify-start'
                        ">
                        <MessageBubble
                            :message="message"
                            :panel-url="props.panelUrl"
                            :is-outbound="message.sender_type === 'agent' || message.direction === 'outbound'"
                            @media-loaded="handleMediaLoaded"
                            @retry-message="handleRetryMessage" />
                    </div>

                    <!-- Indicador de escribiendo -->
                    <div v-if="isTyping" class="flex justify-start">
                        <div class="bg-white dark:bg-gray-800 rounded-lg px-4 py-3 shadow-sm">
                            <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Escribiendo...</p>
                            <div class="flex gap-1">
                                <div
                                    class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                    style="animation-delay: 0ms"></div>
                                <div
                                    class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                    style="animation-delay: 150ms"></div>
                                <div
                                    class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                    style="animation-delay: 300ms"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Referencia para scroll automático -->
                    <div ref="messagesEnd"></div>
                </div>

                <!-- Área de entrada de mensaje -->
                <div
                    class="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 flex-shrink-0">
                    <!-- Preview de archivos adjuntos -->
                    <div v-if="attachments.length > 0" class="mb-3 flex flex-wrap gap-2">
                        <div
                            v-for="(file, idx) in attachments"
                            :key="idx"
                            class="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span class="text-sm text-gray-700 dark:text-gray-300">{{ file.name }}</span>
                            <button @click="removeAttachment(idx)" class="ml-1 text-gray-400 hover:text-red-500">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Input de mensaje -->
                    <div class="relative">
                        <div class="flex items-center gap-2">
                            <!-- Botón de adjuntar -->
                            <button
                                type="button"
                                @click="openFilePicker"
                                :disabled="!isConnected || ticket.status === 'closed'"
                                aria-label="Adjuntar archivo"
                                class="h-11 w-11 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0">
                                <svg
                                    class="w-6 h-6 text-gray-500 dark:text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                            </button>
                            <input ref="fileInput" type="file" multiple class="hidden" @change="handleFileSelect" />

                            <!-- Botón enviar ubicación -->
                            <button
                                ref="locationButtonRef"
                                type="button"
                                @click="toggleLocationPanel"
                                :disabled="!isConnected || ticket.status === 'closed'"
                                aria-label="Abrir panel de ubicación"
                                class="h-11 w-11 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0">
                                <svg
                                    v-if="!locationLoading && !locationSearching"
                                    class="w-6 h-6 text-gray-500 dark:text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M17.657 16.657L13.414 12.414M13.414 12.414L9.172 8.172M13.414 12.414L16.243 9.586M13.414 12.414L10.586 15.243M12 22l9-20-20 9 7 2 2 7z" />
                                </svg>
                                <svg
                                    v-else
                                    class="w-5 h-5 text-gray-500 dark:text-gray-400 animate-spin"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9M4.582 9H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>

                            <!-- Textarea de mensaje -->
                            <div class="flex-1">
                                <textarea
                                    v-model="messageText"
                                    @keydown.enter.exact="handleEnter"
                                    @input="handleTyping"
                                    @paste="handlePaste"
                                    :disabled="!isConnected || ticket.status === 'closed'"
                                    :placeholder="
                                        !isConnected
                                            ? 'Reconectando... envíos pausados'
                                            : ticket.status === 'closed'
                                              ? 'El ticket está cerrado'
                                              : 'Escribe un mensaje...'
                                    "
                                    rows="1"
                                    class="w-full h-11 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed resize-none text-gray-900 dark:text-white"></textarea>
                            </div>

                            <!-- Botón de enviar -->
                            <button
                                @click="sendMessage"
                                :disabled="!canSendMessage || !isConnected || ticket.status === 'closed'"
                                aria-label="Enviar mensaje"
                                class="h-11 w-11 flex items-center justify-center bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex-shrink-0">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>

                        <!-- Panel de ubicación -->
                        <div
                            v-if="showLocationPanel"
                            ref="locationPanelRef"
                            class="absolute left-0 bottom-full mb-2 w-[26rem] max-w-[calc(100vw-3rem)] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl z-20 overflow-hidden">
                            <div
                                class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <div>
                                    <h4 class="text-sm font-semibold text-gray-900 dark:text-white">
                                        Enviar ubicación
                                    </h4>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">
                                        Busca una dirección o usa tu ubicación actual
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    @click="showLocationPanel = false"
                                    class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    aria-label="Cerrar panel de ubicación">
                                    <svg
                                        class="w-4 h-4 text-gray-500"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24">
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div class="p-3 border-b border-gray-200 dark:border-gray-700">
                                <div class="flex gap-2">
                                    <input
                                        v-model="locationQuery"
                                        type="text"
                                        placeholder="Ej: Av. Apoquindo 3000, Las Condes"
                                        class="flex-1 h-9 px-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        @keydown.enter.prevent="searchLocationByAddress" />
                                    <button
                                        type="button"
                                        @click="searchLocationByAddress"
                                        :disabled="locationSearching"
                                        class="h-9 px-3 text-sm rounded-lg bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                        Buscar
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    @click="sendCurrentLocation"
                                    :disabled="locationLoading"
                                    class="mt-2 h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    Usar mi ubicación actual
                                </button>
                            </div>

                            <div class="max-h-72 overflow-y-auto p-3 space-y-2">
                                <div v-if="locationSearching" class="py-4 flex justify-center">
                                    <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600"></div>
                                </div>

                                <button
                                    v-for="result in locationResults"
                                    :key="`${result.lat}-${result.lon}-${result.display_name}`"
                                    type="button"
                                    @click="sendSelectedLocation(result)"
                                    class="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <p class="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                                        {{ result.display_name }}
                                    </p>
                                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        {{ result.lat }}, {{ result.lon }}
                                    </p>
                                </button>

                                <div
                                    v-if="
                                        !locationSearching &&
                                        locationResults.length === 0 &&
                                        locationQuery.trim() !== ''
                                    "
                                    class="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                    No se encontraron direcciones para esa búsqueda.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <aside
                v-if="showHistoryPanel"
                class="w-full lg:w-[360px] xl:w-[400px] border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/90 flex flex-col min-h-0">
                <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Historial del cliente</h4>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Conversaciones anteriores del mismo contacto</p>
                </div>

                <div class="flex-1 min-h-0 overflow-y-auto p-3">
                    <div v-if="customerHistoryLoading" class="h-full flex items-center justify-center">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                    </div>

                    <div
                        v-else-if="customerHistoryError"
                        class="p-3 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                        {{ customerHistoryError }}
                    </div>

                    <div
                        v-else-if="customerHistory.length === 0"
                        class="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 text-center px-4">
                        No hay historial previo para este contacto.
                    </div>

                    <div v-else class="space-y-2">
                        <article
                            v-for="item in customerHistory"
                            :key="item.id"
                            class="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/40">
                            <div class="flex items-center justify-between gap-2">
                                <p class="text-sm font-semibold text-gray-900 dark:text-white">#{{ item.id }}</p>
                                <span
                                    class="ml-2 px-2 py-0.5 rounded text-[10px] font-medium"
                                    :class="getStatusClass(item.status)">
                                    {{ getStatusLabel(item.status) }}
                                </span>
                            </div>

                            <div class="mt-1 flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-300">
                                <span class="uppercase tracking-wide">{{ getPlatformLabel(item.platform) }}</span>
                                <span>•</span>
                                <span>{{ getHistoryDate(item) }}</span>
                            </div>

                            <p class="mt-2 text-xs text-gray-700 dark:text-gray-300 line-clamp-3">
                                {{ item.last_message_text || 'Sin vista previa del último mensaje.' }}
                            </p>

                            <div
                                v-if="item.recent_messages && item.recent_messages.length > 0"
                                class="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-2">
                                <p class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Mensajes recientes
                                </p>
                                <div class="mt-2 space-y-1.5">
                                    <div
                                        v-for="preview in item.recent_messages"
                                        :key="`${item.id}-${preview.id}`"
                                        class="flex items-start gap-2">
                                        <span
                                            class="mt-0.5 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
                                            :class="getPreviewDirectionClass(preview.direction)">
                                            {{ getPreviewDirectionLabel(preview.direction) }}
                                        </span>
                                        <p class="text-[11px] text-gray-700 dark:text-gray-300 leading-4 line-clamp-2">
                                            {{ preview.content }}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div class="mt-3 flex justify-end">
                                <button
                                    type="button"
                                    @click="openHistoryConversation(item)"
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M15 12H9m12 0A9 9 0 113 12a9 9 0 0118 0z" />
                                    </svg>
                                    Ver conversación completa
                                </button>
                            </div>
                        </article>
                    </div>
                </div>

                <div
                    class="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400">
                    Total: {{ customerHistoryTotal }}
                </div>
                <div class="px-3 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button
                        type="button"
                        @click="showHistoryPanel = false"
                        class="h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        Cerrar
                    </button>
                </div>
            </aside>

            <aside
                v-if="showTemplatesPanel"
                class="w-full lg:w-[360px] xl:w-[400px] border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/90 flex flex-col min-h-0">
                <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Plantillas de mensajes</h4>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                        Selecciona una plantilla para insertarla en el mensaje
                    </p>
                </div>

                <div class="p-3 border-b border-gray-200 dark:border-gray-700">
                    <input
                        v-model="templateSearch"
                        type="text"
                        placeholder="Buscar plantilla por nombre o categoría..."
                        class="w-full h-9 px-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>

                <div class="flex-1 min-h-0 overflow-y-auto p-3">
                    <div
                        v-if="filteredTemplates.length === 0"
                        class="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 text-center px-4">
                        No hay plantillas que coincidan con la búsqueda.
                    </div>

                    <div v-else class="space-y-2">
                        <article
                            v-for="template in filteredTemplates"
                            :key="template.id"
                            class="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/40"
                            :class="
                                selectedTemplateId === String(template.id) ? 'border-teal-400 dark:border-teal-700' : ''
                            ">
                            <div class="flex items-center justify-between gap-2">
                                <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ template.name }}</p>
                                <span
                                    class="ml-2 px-2 py-0.5 rounded text-[10px] font-medium"
                                    :class="
                                        template.is_active
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                    ">
                                    {{ template.is_active ? 'Activa' : 'Inactiva' }}
                                </span>
                            </div>

                            <div class="mt-1 flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-300">
                                <span class="uppercase tracking-wide">{{ template.category || 'General' }}</span>
                                <span>•</span>
                                <span>ID {{ template.id }}</span>
                            </div>

                            <p class="mt-2 text-xs text-gray-700 dark:text-gray-300 line-clamp-3">
                                {{ template.content }}
                            </p>

                            <div class="mt-3 flex justify-end">
                                <button
                                    type="button"
                                    @click="selectTemplateAndInsert(template.id)"
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    Seleccionar plantilla
                                </button>
                            </div>
                        </article>
                    </div>
                </div>

                <div
                    class="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400">
                    Total: {{ filteredTemplates.length }}
                </div>

                <div class="px-3 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button
                        type="button"
                        @click="showTemplatesPanel = false"
                        class="h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        Cerrar
                    </button>
                </div>
            </aside>
        </div>

        <!-- Modal de cierre de ticket -->
        <CloseTicketModal
            :show="showCloseModal"
            :ticket-id="ticket?.id || ''"
            @close="showCloseModal = false"
            @closed="handleTicketClosed" />

        <div
            v-if="showHistoryConversationModal"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            @click.self="closeHistoryConversationModal">
            <div
                class="w-full max-w-3xl max-h-[85vh] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl overflow-hidden flex flex-col">
                <div
                    class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
                    <div>
                        <h4 class="text-sm font-semibold text-gray-900 dark:text-white">
                            Conversación completa #{{ historyConversationTicket?.id || '-' }}
                        </h4>

                        <div class="px-3 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                            <button
                                type="button"
                                @click="showHistoryPanel = false"
                                class="h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                Cerrar
                            </button>
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            {{ historyConversationTicket ? getPlatformLabel(historyConversationTicket.platform) : '' }}
                        </p>
                    </div>
                    <button
                        type="button"
                        @click="closeHistoryConversationModal"
                        class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Cerrar conversación histórica">
                        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
                    <div v-if="historyConversationLoading" class="h-full flex items-center justify-center">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                    </div>

                    <div
                        v-else-if="historyConversationError"
                        class="p-3 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                        {{ historyConversationError }}
                    </div>

                    <div
                        v-else-if="historyConversationMessages.length === 0"
                        class="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 text-center px-4">
                        Este ticket no tiene mensajes registrados.
                    </div>

                    <div v-else class="space-y-2">
                        <div
                            v-for="message in historyConversationMessages"
                            :key="`history-full-${message.id}`"
                            class="flex"
                            :class="message.direction === 'outbound' ? 'justify-end' : 'justify-start'">
                            <article
                                class="max-w-[85%] rounded-xl px-3 py-2 border"
                                :class="
                                    message.direction === 'outbound'
                                        ? 'bg-teal-100 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800'
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                ">
                                <p class="text-xs text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words">
                                    {{ getHistoryMessageBody(message) }}
                                </p>
                                <p class="mt-1 text-[10px] text-gray-500 dark:text-gray-400 text-right">
                                    {{ formatDate(message.message_timestamp || message.created_at || '') }}
                                </p>
                            </article>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

    import CloseTicketModal from '@/dashboard/js/chatbot/inbox/chat/CloseTicketModal.vue';
    import MessageBubble from '@/dashboard/js/chatbot/inbox/chat/MessageBubble.vue';
    import {
        formatDate,
        getInitials,
        getPlatformColor,
        getPriorityClass,
        getPriorityLabel,
        getStatusClass,
        getStatusLabel,
    } from '@/dashboard/js/chatbot/inbox/inboxUtils';
    import type {
        CustomerHistoryItem,
        CustomerHistoryMessagePreview,
        Message,
        MessageTemplate,
        PaginatedResponse,
        Platform,
        Ticket,
    } from '@/dashboard/js/chatbot/inbox/types';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaAlert, versaFetch } from '@/dashboard/js/functions';

    // Props
    interface Props {
        ticket: Ticket | null;
        messages: Message[];
        isTyping?: boolean;
        loadingHistory?: boolean;
        isConnected?: boolean;
        agentName?: string;
        csrfToken?: string;
        panelUrl?: string;
    }

    const props = withDefaults(defineProps<Props>(), {
        isTyping: false,
        loadingHistory: false,
        isConnected: false,
        agentName: 'Agente',
        csrfToken: '',
        panelUrl: '',
    });

    // Emits
    const emit = defineEmits<{
        'send-message': [data: { content: string; attachments: File[] }];
        'send-location': [
            data: {
                latitude: number;
                longitude: number;
                name?: string;
            },
        ];
        'close-ticket': [ticketId: string];
        'ticket-closed-with-reason': [ticketId: string];
        'transfer-ticket': [payload: { mode: 'agent' | 'queue' }];
        'load-more-messages': [];
        typing: [];
        'retry-message': [payload: { messageId: string }];
    }>();

    const emitSendMessage = (data: { content: string; attachments: File[] }) => {
        emit('send-message', data);
    };

    const emitCloseTicket = (ticketId: string) => {
        emit('close-ticket', ticketId);
    };

    const emitLoadMoreMessages = () => {
        emit('load-more-messages');
    };

    const emitTransferTicket = (mode: 'agent' | 'queue') => {
        emit('transfer-ticket', { mode });
    };

    const emitTyping = () => {
        emit('typing');
    };

    const emitSendLocation = (data: { latitude: number; longitude: number; name?: string }) => {
        emit('send-location', data);
    };

    const handleRetryMessage = (payload: { messageId: string }) => {
        emit('retry-message', payload);
    };

    // Estado local
    const messageText = ref('');
    const attachments = ref<File[]>([]);
    const showInfo = ref(false);
    const showCloseModal = ref(false);
    const messagesContainer = ref<HTMLElement | null>(null);
    const messagesEnd = ref<HTMLElement | null>(null);
    const fileInput = ref<HTMLInputElement | null>(null);
    const isPinnedToBottom = ref(true);
    const messageTemplates = ref<MessageTemplate[]>([]);
    const selectedTemplateId = ref<string>('');
    const showTemplatesPanel = ref(false);
    const templateSearch = ref('');
    const showLocationPanel = ref(false);
    const locationPanelRef = ref<HTMLElement | null>(null);
    const locationButtonRef = ref<HTMLButtonElement | null>(null);
    const locationLoading = ref(false);
    const locationSearching = ref(false);
    const locationQuery = ref('');
    const locationResults = ref<{ display_name: string; lat: string; lon: string }[]>([]);
    const showHistoryPanel = ref(false);
    const customerHistory = ref<CustomerHistoryItem[]>([]);
    const customerHistoryLoading = ref(false);
    const customerHistoryError = ref('');
    const customerHistoryTotal = ref(0);
    const showHistoryConversationModal = ref(false);
    const historyConversationTicket = ref<CustomerHistoryItem | null>(null);
    const historyConversationMessages = ref<Message[]>([]);
    const historyConversationLoading = ref(false);
    const historyConversationError = ref('');

    let typingTimeout: number | null = null;
    let historyRequestId = 0;
    let historyConversationRequestId = 0;
    const ignoreAsyncError = (): null => null;

    // Computed
    const canSendMessage = computed(
        () => (messageText.value.trim().length > 0 || attachments.value.length > 0) && props.ticket,
    );

    const assignedDisplayDate = computed(() => props.ticket?.assigned_at?.date || '');

    const filteredTemplates = computed(() => {
        const term = templateSearch.value.trim().toLowerCase();
        if (term === '') {
            return messageTemplates.value;
        }

        return messageTemplates.value.filter(template => {
            const name = template.name.toLowerCase();
            const category = (template.category || '').toLowerCase();
            const content = template.content.toLowerCase();

            return name.includes(term) || category.includes(term) || content.includes(term);
        });
    });

    // Watchers
    watch(
        () => {
            const { length } = props.messages;
            const last = length > 0 ? props.messages[length - 1] : null;

            return {
                length,
                lastId: last?.id ?? '',
                lastTs: last?.message_timestamp ?? last?.created_at ?? '',
            };
        },
        () => {
            nextTick(() => {
                if (isPinnedToBottom.value) {
                    scrollToBottom('auto');
                }
            });
        },
    );

    watch(
        () => props.ticket,
        () => {
            messageText.value = '';
            attachments.value = [];
            showInfo.value = false;
            showCloseModal.value = false;
            isPinnedToBottom.value = true;
            showTemplatesPanel.value = false;
            showLocationPanel.value = false;
            selectedTemplateId.value = '';
            templateSearch.value = '';
            locationQuery.value = '';
            locationResults.value = [];

            if (!showHistoryPanel.value) {
                customerHistory.value = [];
                customerHistoryTotal.value = 0;
                customerHistoryError.value = '';
            }

            nextTick(() => {
                scrollToBottom('auto');
            });
        },
    );

    watch(
        () => props.ticket?.id,
        () => {
            if (!showHistoryPanel.value) {
                return;
            }

            loadCustomerHistory().catch(ignoreAsyncError);
        },
    );

    watch(
        () => props.isTyping,
        isTypingNow => {
            if (!isTypingNow) {
                return;
            }

            if (!isNearBottom()) {
                return;
            }

            isPinnedToBottom.value = true;
            nextTick(() => {
                scrollToBottom('auto');
            });
        },
    );

    // Métodos
    const sendMessage = () => {
        if (!canSendMessage.value) {
            return;
        }

        emitSendMessage({
            content: messageText.value.trim(),
            attachments: attachments.value,
        });

        messageText.value = '';
        attachments.value = [];
    };

    const sendCurrentLocation = () => {
        if (locationLoading.value || !props.ticket || props.ticket.status === 'closed') {
            return;
        }

        if (!('geolocation' in navigator)) {
            versaAlert({
                title: 'Geolocalización no disponible',
                message: 'Tu navegador no soporta geolocalización.',
                type: 'warning',
            }).catch(ignoreAsyncError);
            return;
        }

        locationLoading.value = true;

        navigator.geolocation.getCurrentPosition(
            position => {
                emitSendLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    name: 'Ubicación compartida por agente',
                });

                showLocationPanel.value = false;
                locationQuery.value = '';
                locationResults.value = [];

                locationLoading.value = false;
            },
            () => {
                versaAlert({
                    title: 'No se pudo obtener la ubicación',
                    message: 'Revisa los permisos del navegador e inténtalo nuevamente.',
                    type: 'warning',
                }).catch(ignoreAsyncError);
                locationLoading.value = false;
            },
            {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 60000,
            },
        );
    };

    const searchLocationByAddress = async () => {
        const query = locationQuery.value.trim();
        if (query === '' || locationSearching.value) {
            return;
        }

        locationSearching.value = true;

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(query)}`,
                {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                    },
                },
            );

            if (!response.ok) {
                locationResults.value = [];
                return;
            }

            const results = (await response.json()) as { display_name?: string; lat?: string; lon?: string }[];

            locationResults.value = (results || [])
                .filter(
                    item =>
                        typeof item.display_name === 'string' &&
                        typeof item.lat === 'string' &&
                        typeof item.lon === 'string',
                )
                .map(item => ({
                    display_name: item.display_name as string,
                    lat: item.lat as string,
                    lon: item.lon as string,
                }));
        } catch {
            locationResults.value = [];
        } finally {
            locationSearching.value = false;
        }
    };

    const sendSelectedLocation = (result: { display_name: string; lat: string; lon: string }) => {
        const latitude = Number.parseFloat(result.lat);
        const longitude = Number.parseFloat(result.lon);

        if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
            return;
        }

        emitSendLocation({
            latitude,
            longitude,
            name: result.display_name,
        });

        showLocationPanel.value = false;
        locationQuery.value = '';
        locationResults.value = [];
    };

    const toggleLocationPanel = () => {
        showLocationPanel.value = !showLocationPanel.value;
        if (showLocationPanel.value) {
            showTemplatesPanel.value = false;
        }
    };

    const handleTicketClosed = () => {
        showCloseModal.value = false;
        // Emitir evento específico para cierre con razón: el padre solo enviará WS
        // Close_ticket y refrescará la UI, sin volver a llamar al endpoint HTTP close
        emit('ticket-closed-with-reason', String(props.ticket?.id));
    };

    const handleEnter = (event: KeyboardEvent) => {
        if (!event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    };

    const handleTyping = () => {
        emitTyping();

        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        typingTimeout = window.setTimeout(() => {
            // Emitir evento de "dejó de escribir" si es necesario
        }, 3000);
    };

    const loadMessageTemplates = async () => {
        try {
            const response = await versaFetch({
                url: `/${props.panelUrl}/inbox/api/message-templates`,
                method: 'GET',
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                messageTemplates.value = (response.data as MessageTemplate[]) || [];
            }
        } catch (error) {
            console.error('[ChatWindow] Error al cargar plantillas:', error);
        }
    };

    const getPlatformLabel = (platform: Platform): string => {
        const labels: Record<Platform, string> = {
            whatsapp: 'WhatsApp',
            facebook: 'Facebook',
            instagram: 'Instagram',
            telegram: 'Telegram',
            web: 'Web',
        };

        return labels[platform] ?? 'Canal';
    };

    const getHistoryDate = (item: CustomerHistoryItem): string => {
        const rawDate = item.last_message_at || item.created_at || '';

        return rawDate ? formatDate(rawDate) : '-';
    };

    const getPreviewDirectionLabel = (direction: CustomerHistoryMessagePreview['direction']): string =>
        direction === 'outbound' ? 'Agt' : 'Cli';

    const getPreviewDirectionClass = (direction: CustomerHistoryMessagePreview['direction']): string =>
        direction === 'outbound'
            ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';

    const getHistoryMessageBody = (message: Message): string => {
        const textContent = (message.content || '').trim();
        if (textContent.length > 0) {
            return textContent;
        }

        const typeLabels: Partial<Record<Message['message_type'], string>> = {
            image: '[Imagen]',
            video: '[Video]',
            audio: '[Audio]',
            voice: '[Nota de voz]',
            document: '[Documento]',
            location: '[Ubicación]',
            contact: '[Contacto]',
            sticker: '[Sticker]',
            interactive: '[Interacción]',
            button: '[Botón]',
            list: '[Lista]',
            reaction: '[Reacción]',
            system: '[Sistema]',
            unknown: '[Mensaje]',
        };

        return typeLabels[message.message_type] || '[Mensaje]';
    };

    const closeHistoryConversationModal = () => {
        showHistoryConversationModal.value = false;
        historyConversationTicket.value = null;
        historyConversationMessages.value = [];
        historyConversationError.value = '';
    };

    const openHistoryConversation = async (item: CustomerHistoryItem) => {
        const ticketId = String(item.id);
        if (!ticketId) {
            return;
        }

        showHistoryConversationModal.value = true;
        historyConversationTicket.value = item;
        historyConversationMessages.value = [];
        historyConversationError.value = '';
        historyConversationLoading.value = true;
        const currentRequestId = ++historyConversationRequestId;

        try {
            const allMessages: Message[] = [];
            const perPage = 100;
            const maxPages = 40;

            const fetchMessagesPage = async (pageNumber: number): Promise<PaginatedResponse<Message> | null> => {
                const response = await versaFetch({
                    url: `/${props.panelUrl}/inbox/api/tickets/${ticketId}/messages?page=${pageNumber}&per_page=${perPage}`,
                    method: 'GET',
                });

                if (currentRequestId !== historyConversationRequestId) {
                    return null;
                }

                if (API_RESPONSE_CODES.SUCCESS !== response.success) {
                    throw new Error('history_conversation_fetch_failed');
                }

                return (
                    (response.data as PaginatedResponse<Message>) || {
                        data: [],
                        total: 0,
                        page: pageNumber,
                        per_page: perPage,
                        total_pages: 1,
                    }
                );
            };

            const firstPage = await fetchMessagesPage(1);
            if (firstPage === null) {
                return;
            }

            allMessages.push(...(Array.isArray(firstPage.data) ? firstPage.data : []));

            const totalPages = Number.isFinite(firstPage.total_pages) ? Math.max(1, Number(firstPage.total_pages)) : 1;
            const limitedTotalPages = Math.min(totalPages, maxPages);

            if (limitedTotalPages > 1) {
                const pagesToFetch = Array.from({ length: limitedTotalPages - 1 }, (_, index) => index + 2);
                const remainingPages = await Promise.all(pagesToFetch.map(pageNumber => fetchMessagesPage(pageNumber)));

                if (currentRequestId !== historyConversationRequestId) {
                    return;
                }

                remainingPages.forEach(paginated => {
                    if (!paginated) {
                        return;
                    }

                    allMessages.push(...(Array.isArray(paginated.data) ? paginated.data : []));
                });
            }

            const uniqueMessages = new Map<string, Message>();
            for (const message of allMessages) {
                uniqueMessages.set(String(message.id), message);
            }

            historyConversationMessages.value = [...uniqueMessages.values()].toSorted((a, b) => {
                const dateA = new Date(a.message_timestamp || a.created_at || 0).getTime();
                const dateB = new Date(b.message_timestamp || b.created_at || 0).getTime();
                return dateA - dateB;
            });
        } catch {
            if (currentRequestId !== historyConversationRequestId) {
                return;
            }

            historyConversationError.value = 'No se pudo cargar la conversación completa.';
            historyConversationMessages.value = [];
        } finally {
            if (currentRequestId === historyConversationRequestId) {
                historyConversationLoading.value = false;
            }
        }
    };

    const loadCustomerHistory = async () => {
        const ticketId = props.ticket?.id;
        if (!ticketId) {
            customerHistory.value = [];
            customerHistoryTotal.value = 0;
            customerHistoryError.value = '';
            return;
        }

        customerHistoryLoading.value = true;
        customerHistoryError.value = '';
        const currentRequestId = ++historyRequestId;

        try {
            const response = await versaFetch({
                url: `/${props.panelUrl}/inbox/api/tickets/${ticketId}/customer-history?limit=15`,
                method: 'GET',
            });

            // Evita sobrescribir estado con respuestas antiguas si cambió el ticket.
            if (currentRequestId !== historyRequestId) {
                return;
            }

            if (API_RESPONSE_CODES.SUCCESS !== response.success) {
                customerHistory.value = [];
                customerHistoryTotal.value = 0;
                customerHistoryError.value = 'No se pudo cargar el historial del cliente.';
                return;
            }

            const data = (response.data as { items?: CustomerHistoryItem[]; total?: number }) || {};
            customerHistory.value = Array.isArray(data.items) ? data.items : [];
            customerHistoryTotal.value = Number.isFinite(data.total)
                ? Number(data.total)
                : customerHistory.value.length;
        } catch {
            if (currentRequestId !== historyRequestId) {
                return;
            }

            customerHistory.value = [];
            customerHistoryTotal.value = 0;
            customerHistoryError.value = 'No se pudo cargar el historial del cliente.';
        } finally {
            if (currentRequestId === historyRequestId) {
                customerHistoryLoading.value = false;
            }
        }
    };

    const toggleHistoryPanel = async () => {
        showHistoryPanel.value = !showHistoryPanel.value;

        if (!showHistoryPanel.value) {
            customerHistoryError.value = '';
            return;
        }

        showTemplatesPanel.value = false;

        await loadCustomerHistory();
    };

    const applySelectedTemplate = () => {
        if (selectedTemplateId.value === '') {
            return;
        }

        const selectedTemplate = messageTemplates.value.find(
            template => String(template.id) === selectedTemplateId.value,
        );

        if (!selectedTemplate) {
            return;
        }

        const currentText = messageText.value.trim();
        if (currentText.length > 0) {
            messageText.value = `${currentText}\n${selectedTemplate.content}`;
        } else {
            messageText.value = selectedTemplate.content;
        }

        selectedTemplateId.value = '';
        showTemplatesPanel.value = false;
    };

    const selectTemplateAndInsert = (templateId: number) => {
        selectedTemplateId.value = String(templateId);
        applySelectedTemplate();
    };

    const toggleTemplatesPanel = () => {
        showTemplatesPanel.value = !showTemplatesPanel.value;
        if (showTemplatesPanel.value) {
            templateSearch.value = '';
            showLocationPanel.value = false;
            showHistoryPanel.value = false;
        }
    };

    const handleClickOutsideTemplates = (event: MouseEvent) => {
        if (!showLocationPanel.value) {
            return;
        }

        const target = event.target as Node | null;
        if (target === null) {
            return;
        }

        const clickedInsideLocationPanel = locationPanelRef.value?.contains(target) ?? false;
        const clickedLocationToggleButton = locationButtonRef.value?.contains(target) ?? false;

        if (!clickedInsideLocationPanel && !clickedLocationToggleButton) {
            showLocationPanel.value = false;
        }
    };

    const openFilePicker = () => {
        fileInput.value?.click();
    };

    const handleFileSelect = (event: Event) => {
        const target = event.target as HTMLInputElement | null;
        if (target?.files) {
            attachments.value.push(...target.files);
        }
    };

    const handlePaste = (event: ClipboardEvent) => {
        if (!props.isConnected || props.ticket?.status === 'closed') {
            return;
        }

        const { clipboardData } = event;
        if (!clipboardData?.items || clipboardData.items.length === 0) {
            return;
        }

        const imageFiles: File[] = [];

        for (const item of clipboardData.items) {
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                if (blob) {
                    const mimeType = blob.type || 'image/png';
                    const ext = mimeType.split('/')[1] || 'png';
                    const fileName = `imagen-portapapeles-${Date.now()}-${imageFiles.length + 1}.${ext}`;
                    imageFiles.push(new File([blob], fileName, { type: mimeType }));
                }
            }
        }

        if (imageFiles.length === 0) {
            return;
        }

        event.preventDefault();
        attachments.value.push(...imageFiles);
    };

    const removeAttachment = (index: number) => {
        attachments.value.splice(index, 1);
    };

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (messagesEnd.value) {
            messagesEnd.value.scrollIntoView({ behavior });
        }
    };

    const isNearBottom = (): boolean => {
        if (!messagesContainer.value) {
            return true;
        }

        const container = messagesContainer.value;
        const threshold = 120;

        return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
    };

    const handleMediaLoaded = () => {
        if (!isNearBottom()) {
            return;
        }

        nextTick(() => {
            scrollToBottom('auto');
        });
    };

    const handleScroll = () => {
        if (messagesContainer.value) {
            const { scrollTop } = messagesContainer.value;
            isPinnedToBottom.value = isNearBottom();
            if (scrollTop === 0 && !props.loadingHistory) {
                emitLoadMoreMessages();
            }
        }
    };

    onUnmounted(() => {
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            typingTimeout = null;
        }

        document.removeEventListener('mousedown', handleClickOutsideTemplates);
    });

    onMounted(() => {
        loadMessageTemplates();
        document.addEventListener('mousedown', handleClickOutsideTemplates);
    });
</script>
