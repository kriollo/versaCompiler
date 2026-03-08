<template>
    <div class="p-6">
        <div class="flex items-center justify-between mb-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Razones de Cierre</h1>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Configura los motivos de cierre disponibles para los agentes
                </p>
            </div>
            <button
                @click="openCreateModal"
                class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Nueva Razón
            </button>
        </div>

        <div v-if="loading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
        </div>

        <div v-else-if="reasons.length === 0" class="text-center py-12">
            <svg
                class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p class="text-gray-500 dark:text-gray-400">No hay razones de cierre configuradas</p>
        </div>

        <div
            v-else
            class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table class="w-full">
                <thead class="bg-gray-50 dark:bg-gray-900">
                    <tr>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Nombre
                        </th>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Descripción
                        </th>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Tipo
                        </th>
                        <th
                            class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                    <tr v-for="reason in reasons" :key="reason.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td class="px-6 py-4 font-medium text-gray-900 dark:text-white">{{ reason.name }}</td>
                        <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {{ reason.description || '—' }}
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{{ reason.type || '' }}</td>
                        <td class="px-6 py-4 text-right">
                            <button
                                @click="confirmDelete(reason)"
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
                            <button
                                @click="openEditModal(reason)"
                                class="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/20 rounded transition-colors ml-2"
                                title="Editar">
                                <svg
                                    class="w-4 h-4 text-yellow-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M11 5h2M7 9h2m-2 4h6m4-6l3 3-4 4-3-3 4-4z" />
                                </svg>
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Modal crear razón -->
        <div
            v-if="showModal"
            class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            @click.self="showModal = false">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
                <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                        {{ editingReason ? 'Editar Razón de Cierre' : 'Nueva Razón de Cierre' }}
                    </h2>
                    <button @click="closeModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div class="p-6 space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                        <input
                            v-model="form.name"
                            type="text"
                            placeholder="Ej: Resuelto, Sin respuesta..."
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Descripción
                        </label>
                        <textarea
                            v-model="form.description"
                            rows="3"
                            placeholder="Descripción opcional..."
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                        <select
                            v-model="form.type"
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                            <option value="resolved">Resuelta</option>
                            <option value="cancelled">Cancelada</option>
                            <option value="duplicate">Duplicada</option>
                            <option value="spam">Spam</option>
                            <option value="needs_info">Necesita información</option>
                            <option value="other">Otro</option>
                        </select>
                    </div>
                    <div v-if="formError" class="text-sm text-red-600 dark:text-red-400">{{ formError }}</div>
                </div>
                <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button
                        @click="showModal = false"
                        class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button
                        @click="saveReason"
                        :disabled="saving"
                        class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50">
                        {{ saving ? 'Guardando...' : editingReason ? 'Actualizar' : 'Guardar' }}
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

    interface CloseReason {
        id: number;
        name: string;
        description?: string;
        type?: string;
    }

    const reasons = ref<CloseReason[]>([]);
    const loading = ref(false);
    const showModal = ref(false);
    const saving = ref(false);
    const formError = ref('');
    const form = ref({ name: '', description: '', type: 'resolved' as string });
    const editingReason = ref<CloseReason | null>(null);

    const loadReasons = async () => {
        loading.value = true;
        try {
            const response = await versaFetch({ url: `/${panelUrl}/inbox/api/close-reasons`, method: 'GET' });
            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                reasons.value = (response.data as CloseReason[]) || [];
            }
        } catch (error) {
            console.error('[CloseReasons] Error al cargar razones:', error);
        } finally {
            loading.value = false;
        }
    };

    const openCreateModal = () => {
        editingReason.value = null;
        form.value = { name: '', description: '', type: 'resolved' };
        formError.value = '';
        showModal.value = true;
    };

    const openEditModal = (reason: CloseReason) => {
        editingReason.value = reason;
        form.value = {
            name: reason.name,
            description: reason.description ?? '',
            type: reason.type ?? 'resolved',
        };
        formError.value = '';
        showModal.value = true;
    };

    const saveReasonInternal = async (payloadReason: Partial<CloseReason>) => {
        // Helper to perform POST for create
        const payload = {
            name: payloadReason.name,
            description: payloadReason.description ?? '',
            type: payloadReason.type ?? 'resolved',
        };
        const response = await versaFetch({
            url: `/${panelUrl}/inbox/api/close-reasons`,
            method: 'POST',
            data: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf_token ?? '' },
        });
        if (API_RESPONSE_CODES.SUCCESS === response.success) {
            showModal.value = false;
            await loadReasons();
        }
    };

    const createReason = async () => {
        if (!form.value.name.trim()) {
            formError.value = 'El nombre es requerido';
            return;
        }
        saving.value = true;
        try {
            await saveReasonInternal({
                name: form.value.name,
                description: form.value.description,
                type: form.value.type,
            });
        } catch (error) {
            console.error('[CloseReasons] Error al crear razón:', error);
        } finally {
            saving.value = false;
        }
    };

    const saveReason = async () => {
        if (editingReason.value) {
            // Update existing reason
            const payload = {
                name: form.value.name,
                description: form.value.description,
                type: form.value.type,
            };
            try {
                const response = await versaFetch({
                    url: `/${panelUrl}/inbox/api/close-reasons/${editingReason.value.id}`,
                    method: 'PUT',
                    data: JSON.stringify(payload),
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf_token ?? '' },
                });
                if (API_RESPONSE_CODES.SUCCESS === response.success) {
                    showModal.value = false;
                    editingReason.value = null;
                    await loadReasons();
                }
            } catch (error) {
                console.error('[CloseReasons] Error al actualizar razón:', error);
            }
        } else {
            await createReason();
        }
    };

    const closeModal = () => {
        showModal.value = false;
        editingReason.value = null;
        formError.value = '';
    };

    const confirmDelete = async (reason: CloseReason) => {
        // eslint-disable-next-line no-alert
        if (!confirm(`¿Eliminar la razón "${reason.name}"?`)) {
            return;
        }
        try {
            await versaFetch({
                url: `/${panelUrl}/inbox/api/close-reasons/${reason.id}`,
                method: 'DELETE',
                headers: { 'X-CSRF-Token': csrf_token ?? '' },
            });
            await loadReasons();
        } catch (error) {
            console.error('[CloseReasons] Error al eliminar razón:', error);
        }
    };

    onMounted(loadReasons);
</script>
