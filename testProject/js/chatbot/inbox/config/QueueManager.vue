<template>
    <div class="p-6">
        <div class="flex items-center justify-between mb-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Colas</h1>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Administra las colas de atención y asigna agentes
                </p>
            </div>
            <button
                @click="openCreateModal"
                class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Nueva Cola
            </button>
        </div>

        <div v-if="loading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
        </div>

        <div v-else-if="queues.length === 0" class="text-center py-12">
            <svg
                class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p class="text-gray-500 dark:text-gray-400">No hay colas creadas</p>
            <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">Crea tu primera cola para comenzar</p>
        </div>

        <div v-else class="flex flex-col gap-4">
            <div
                v-for="queue in queues"
                :key="queue.id"
                class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <div
                            class="w-10 h-10 rounded-lg flex items-center justify-center"
                            :class="getStatusColor(queue.status)">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 class="font-semibold text-gray-900 dark:text-white">{{ queue.name }}</h3>
                            <div class="flex items-center gap-2 mt-1">
                                <span
                                    class="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold"
                                    :class="getStatusBadge(queue.status)">
                                    {{ getStatusLabel(queue.status) }}
                                </span>
                                <span
                                    v-if="queue.metadata?.business_hours?.enabled"
                                    class="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded uppercase font-bold"
                                    title="Horario Comercial Activado">
                                    Horario
                                </span>
                                <span
                                    v-else
                                    class="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-1.5 py-0.5 rounded uppercase font-bold"
                                    title="Horario Comercial Desactivado">
                                    Sin Horario
                                </span>
                                <span
                                    v-if="(queue.metadata?.capacity ?? 0) > 0"
                                    class="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-1.5 py-0.5 rounded uppercase font-bold"
                                    :title="`Límite: ${queue.metadata?.capacity} tickets por agente`">
                                    Cap: {{ queue.metadata?.capacity }}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-1">
                        <button
                            @click="openEditModal(queue)"
                            class="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Editar">
                            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button
                            @click="confirmDelete(queue)"
                            class="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Eliminar">
                            <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>

                <p v-if="queue.description" class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {{ queue.description }}
                </p>

                <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-500 dark:text-gray-400">
                        <span class="font-medium text-gray-900 dark:text-white">{{ queue.agent_count || 0 }}</span>
                        agentes
                    </span>
                    <div class="flex gap-1">
                        <button
                            v-if="queue.status !== 'active'"
                            @click="updateStatus(queue.id, 'active')"
                            class="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">
                            Activar
                        </button>
                        <button
                            v-if="queue.status === 'active'"
                            @click="updateStatus(queue.id, 'paused')"
                            class="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors">
                            Pausar
                        </button>
                        <button
                            @click="$emit('manage-agents', queue)"
                            class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            Agentes
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Crear/Editar -->
        <div
            v-if="showModal"
            class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto"
            @click.self="closeModal">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 my-8">
                <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                        {{ editingQueue ? 'Editar Cola' : 'Nueva Cola' }}
                    </h2>
                    <button @click="closeModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <!-- Tabs -->
                <div class="px-6 border-b border-gray-200 dark:border-gray-700 flex gap-6">
                    <button
                        @click="activeTab = 'general'"
                        class="py-3 text-sm font-medium border-b-2 transition-colors"
                        :class="
                            activeTab === 'general'
                                ? 'border-teal-600 text-teal-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        ">
                        General
                    </button>
                    <button
                        @click="activeTab = 'schedule'"
                        class="py-3 text-sm font-medium border-b-2 transition-colors"
                        :class="
                            activeTab === 'schedule'
                                ? 'border-teal-600 text-teal-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        ">
                        Horario Comercial
                    </button>
                </div>

                <form @submit.prevent="saveQueue" class="flex flex-col h-full max-h-[70vh]">
                    <div class="p-6 overflow-y-auto space-y-4">
                        <!-- TAB GENERAL -->
                        <div v-show="activeTab === 'general'" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nombre *
                                </label>
                                <input
                                    v-model="form.name"
                                    type="text"
                                    required
                                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="Ej: Soporte Técnico" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Descripción
                                </label>
                                <textarea
                                    v-model="form.description"
                                    rows="3"
                                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="Descripción opcional de la cola"></textarea>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Prioridad
                                    </label>
                                    <input
                                        v-model.number="form.priority"
                                        type="number"
                                        min="0"
                                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        placeholder="0" />
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Estado
                                    </label>
                                    <select
                                        v-model="form.status"
                                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                                        <option value="active">Activa</option>
                                        <option value="paused">Pausada</option>
                                        <option value="inactive">Inactiva</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Límite de tickets por cola
                                </label>
                                <p class="text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                                    0 = sin límite de cola (cada agente usa su propio límite configurado)
                                </p>
                                <input
                                    v-model.number="form.capacity"
                                    type="number"
                                    min="0"
                                    max="100"
                                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="0" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Algoritmo de asignación
                                </label>
                                <p class="text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                                    Puedes definir un algoritmo específico o usar el global.
                                </p>
                                <select
                                    v-model="form.assignmentAlgorithm"
                                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                                    <option
                                        v-for="option in algorithmOptions"
                                        :key="option.value"
                                        :value="option.value">
                                        {{ option.label }} — {{ option.description }}
                                    </option>
                                </select>
                            </div>
                        </div>

                        <!-- TAB HORARIO -->
                        <div v-show="activeTab === 'schedule'" class="space-y-6">
                            <div
                                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                <div>
                                    <h4 class="text-sm font-medium text-gray-900 dark:text-white">
                                        Activar Horario Comercial
                                    </h4>
                                    <p class="text-xs text-gray-500">
                                        Si está desactivado, la cola recibirá tickets 24/7.
                                    </p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" v-model="form.businessHours.enabled" class="sr-only peer" />
                                    <div
                                        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 dark:peer-focus:ring-teal-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-teal-600"></div>
                                </label>
                            </div>

                            <div v-if="form.businessHours.enabled" class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Zona Horaria
                                    </label>
                                    <select
                                        v-model="form.businessHours.timezone"
                                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                                        <option v-for="tz in commonTimezones" :key="tz" :value="tz">{{ tz }}</option>
                                    </select>
                                </div>

                                <div class="space-y-2">
                                    <div
                                        v-for="day in weekDays"
                                        :key="day.id"
                                        class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                        <div
                                            class="px-4 py-2 bg-gray-50 dark:bg-gray-900/30 flex items-center justify-between">
                                            <span class="text-xs font-bold uppercase text-gray-600 dark:text-gray-400">
                                                {{ day.label }}
                                            </span>
                                            <button
                                                type="button"
                                                @click="addSlot(day.id)"
                                                class="text-teal-600 hover:text-teal-700 text-xs font-medium flex items-center gap-1">
                                                <svg
                                                    class="w-4 h-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24">
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="2"
                                                        d="M12 4v16m8-8H4" />
                                                </svg>
                                                Añadir slot
                                            </button>
                                        </div>
                                        <div class="p-3 space-y-2">
                                            <div
                                                v-if="!form.businessHours.schedule[day.id]?.length"
                                                class="text-center py-2">
                                                <span class="text-xs text-gray-400 italic">Cerrado</span>
                                            </div>
                                            <div
                                                v-for="(slot, index) in form.businessHours.schedule[day.id]"
                                                :key="index"
                                                class="flex items-center gap-3">
                                                <input
                                                    type="time"
                                                    v-model="slot.start"
                                                    class="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
                                                <span class="text-gray-400 text-xs">a</span>
                                                <input
                                                    type="time"
                                                    v-model="slot.end"
                                                    class="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
                                                <button
                                                    type="button"
                                                    @click="removeSlot(day.id, index)"
                                                    class="p-1 text-red-400 hover:text-red-600 rounded">
                                                    <svg
                                                        class="w-4 h-4"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24">
                                                        <path
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            stroke-width="2"
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        class="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            @click="closeModal"
                            class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            Cancelar
                        </button>
                        <button
                            type="submit"
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
                </form>
            </div>
        </div>

        <!-- Confirmar Eliminación -->
        <div
            v-if="showDeleteConfirm"
            class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
            @click.self="showDeleteConfirm = false">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Confirmar eliminación</h3>
                <p class="text-gray-600 dark:text-gray-400 mb-6">
                    ¿Estás seguro de eliminar la cola "{{ queueToDelete?.name }}"? Esta acción no se puede deshacer.
                </p>
                <div class="flex justify-end gap-3">
                    <button
                        @click="showDeleteConfirm = false"
                        class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button
                        @click="deleteQueue"
                        :disabled="deleting"
                        class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 min-w-[100px]">
                        {{ deleting ? 'Eliminando...' : 'Eliminar' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { inject, ref } from 'vue';

    import type { BusinessHours, Queue, QueueStatus } from '@/dashboard/js/chatbot/inbox/types';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaFetch } from '@/dashboard/js/functions';

    const emit = defineEmits<{
        (e: 'manage-agents', queue: Queue): void;
    }>();

    const csrf_token = inject<string>('csrf_token');
    const panelUrl = inject<string>('panelUrl', '');

    const queues = ref<Queue[]>([]);
    const loading = ref(false);
    const saving = ref(false);
    const deleting = ref(false);

    const showModal = ref(false);
    const showDeleteConfirm = ref(false);
    const editingQueue = ref<Queue | null>(null);
    const queueToDelete = ref<Queue | null>(null);
    const activeTab = ref<'general' | 'schedule'>('general');

    const commonTimezones = [
        'America/Santiago',
        'America/Argentina/Buenos_Aires',
        'America/Bogota',
        'America/Mexico_City',
        'America/Lima',
        'America/New_York',
        'Europe/Madrid',
        'UTC',
    ];

    const weekDays = [
        { id: 1, label: 'Lunes' },
        { id: 2, label: 'Martes' },
        { id: 3, label: 'Miércoles' },
        { id: 4, label: 'Jueves' },
        { id: 5, label: 'Viernes' },
        { id: 6, label: 'Sábado' },
        { id: 7, label: 'Domingo' },
    ];

    const form = ref({
        name: '',
        description: '',
        priority: 0,
        capacity: 0,
        status: 'active' as QueueStatus,
        assignmentAlgorithm: '',
        businessHours: {
            enabled: false,
            timezone: 'America/Santiago',
            schedule: {} as Record<number, { start: string; end: string }[]>,
        },
    });

    const initSchedule = () => {
        const schedule: Record<number, { start: string; end: string }[]> = {};
        weekDays.forEach(d => {
            schedule[d.id] = [];
        });
        return schedule;
    };

    const algorithmOptions = [
        {
            value: '',
            label: 'Usar configuración global',
            description: 'Aplica el algoritmo general del inbox',
        },
        {
            value: 'weighted_least_connections',
            label: 'Weighted Least Connections',
            description: 'Pondera por capacidad antes de asignar',
        },
        {
            value: 'power_of_two_choices',
            label: 'Power of Two Choices',
            description: 'Compara 2 candidatos y elige el mejor',
        },
        {
            value: 'least_connections',
            label: 'Least Connections',
            description: 'Asigna al agente con menos tickets',
        },
        {
            value: 'round_robin',
            label: 'Round Robin',
            description: 'Distribución equitativa secuencial',
        },
    ];

    const loadQueues = async () => {
        loading.value = true;
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/queues`,
                method: 'GET',
            });
            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                const paged = response.data as { data: Queue[] };
                queues.value = paged.data;
            }
        } catch (error) {
            console.error('[QueueManager] Error al cargar colas:', error);
        } finally {
            loading.value = false;
        }
    };

    const openCreateModal = () => {
        editingQueue.value = null;
        activeTab.value = 'general';
        form.value = {
            name: '',
            description: '',
            priority: 0,
            capacity: 0,
            status: 'active',
            assignmentAlgorithm: '',
            businessHours: {
                enabled: false,
                timezone: 'America/Santiago',
                schedule: initSchedule(),
            },
        };
        showModal.value = true;
    };

    const openEditModal = (queue: Queue) => {
        editingQueue.value = queue;
        activeTab.value = 'general';

        const bh = queue.metadata?.business_hours as BusinessHours | undefined;

        form.value = {
            name: queue.name,
            description: queue.description || '',
            priority: queue.priority,
            capacity: (queue.metadata?.capacity as number) ?? 0,
            status: queue.status,
            assignmentAlgorithm: (queue as any).assignment_algorithm ?? '',
            businessHours: {
                enabled: bh?.enabled ?? false,
                timezone: bh?.timezone ?? 'America/Santiago',
                schedule: bh?.schedule ? JSON.parse(JSON.stringify(bh.schedule)) : initSchedule(),
            },
        };
        showModal.value = true;
    };

    const closeModal = () => {
        showModal.value = false;
        editingQueue.value = null;
    };

    const addSlot = (dayId: number) => {
        if (!form.value.businessHours.schedule[dayId]) {
            form.value.businessHours.schedule[dayId] = [];
        }
        form.value.businessHours.schedule[dayId].push({ start: '09:00', end: '18:00' });
    };

    const removeSlot = (dayId: number, index: number) => {
        const arr = form.value.businessHours.schedule[dayId];
        if (Array.isArray(arr)) {
            arr.splice(index, 1);
        }
    };

    const saveQueue = async () => {
        saving.value = true;
        try {
            const url = editingQueue.value
                ? `/${panelUrl}/inbox/api/queues/${editingQueue.value.id}`
                : `/${panelUrl}/inbox/api/queues`;

            const payload = {
                name: form.value.name,
                description: form.value.description,
                priority: form.value.priority,
                status: form.value.status,
                assignment_algorithm: form.value.assignmentAlgorithm,
                metadata: {
                    capacity: form.value.capacity,
                    business_hours: form.value.businessHours,
                },
            };

            const response = await versaFetch({
                url,
                method: editingQueue.value ? 'PUT' : 'POST',
                data: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrf_token ?? '',
                },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                closeModal();
                await loadQueues();
            }
        } catch (error) {
            console.error('[QueueManager] Error al guardar cola:', error);
        } finally {
            saving.value = false;
        }
    };

    const confirmDelete = (queue: Queue) => {
        queueToDelete.value = queue;
        showDeleteConfirm.value = true;
    };

    const deleteQueue = async () => {
        if (!queueToDelete.value) {
            return;
        }

        deleting.value = true;
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/queues/${queueToDelete.value.id}`,
                method: 'DELETE',
                headers: { 'X-CSRF-Token': csrf_token ?? '' },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                showDeleteConfirm.value = false;
                queueToDelete.value = null;
                await loadQueues();
            }
        } catch (error) {
            console.error('[QueueManager] Error al eliminar cola:', error);
        } finally {
            deleting.value = false;
        }
    };

    const updateStatus = async (queueId: number, status: QueueStatus) => {
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/queues/${queueId}/status`,
                method: 'POST',
                data: JSON.stringify({ status }),
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrf_token ?? '',
                },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                await loadQueues();
            }
        } catch (error) {
            console.error('[QueueManager] Error al actualizar status:', error);
        }
    };

    const getStatusColor = (status: QueueStatus): string => {
        const colors: Record<QueueStatus, string> = {
            active: 'bg-green-500',
            paused: 'bg-yellow-500',
            inactive: 'bg-gray-500',
        };
        return colors[status] || 'bg-gray-500';
    };

    const getStatusBadge = (status: QueueStatus): string => {
        const badges: Record<QueueStatus, string> = {
            active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        };
        return badges[status] || '';
    };

    const getStatusLabel = (status: QueueStatus): string => {
        const labels: Record<QueueStatus, string> = {
            active: 'Activa',
            paused: 'Pausada',
            inactive: 'Inactiva',
        };
        return labels[status] || status;
    };

    loadQueues();
</script>
