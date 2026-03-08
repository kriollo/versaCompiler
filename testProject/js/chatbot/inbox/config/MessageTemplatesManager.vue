<template>
    <div class="p-6">
        <div class="flex items-center justify-between mb-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Plantillas de Mensajes</h1>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Crea respuestas predefinidas para acelerar la atención de tus agentes
                </p>
            </div>
            <button
                @click="openCreateModal"
                class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Nueva Plantilla
            </button>
        </div>

        <div v-if="loading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
        </div>

        <div v-else-if="templates.length === 0" class="text-center py-12">
            <svg
                class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 8h10M7 12h8m-8 4h6m9-6a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-gray-500 dark:text-gray-400">No hay plantillas configuradas</p>
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
                            Contenido
                        </th>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Categoría
                        </th>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Estado
                        </th>
                        <th
                            class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                    <tr v-for="item in templates" :key="item.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td class="px-6 py-4 font-medium text-gray-900 dark:text-white">{{ item.name }}</td>
                        <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-[420px]">
                            <p class="line-clamp-2">{{ item.content }}</p>
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {{ item.category || 'General' }}
                        </td>
                        <td class="px-6 py-4">
                            <span
                                class="text-xs font-medium px-2 py-0.5 rounded"
                                :class="
                                    item.is_active
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                ">
                                {{ item.is_active ? 'Activa' : 'Inactiva' }}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <button
                                @click="openEditModal(item)"
                                class="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/20 rounded transition-colors"
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
                            <button
                                @click="confirmDelete(item)"
                                class="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors ml-2"
                                title="Eliminar">
                                <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            v-if="showModal"
            class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            @click.self="closeModal">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl mx-4">
                <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                        {{ editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla' }}
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
                            placeholder="Ej: Saludo inicial"
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Contenido *
                        </label>
                        <textarea
                            v-model="form.content"
                            rows="5"
                            placeholder="Escribe el mensaje predefinido..."
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Categoría
                            </label>
                            <input
                                v-model="form.category"
                                type="text"
                                placeholder="General"
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Prioridad
                            </label>
                            <input
                                v-model.number="form.priority"
                                type="number"
                                min="0"
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                        </div>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40">
                        <div>
                            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Plantilla activa</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">Solo las activas aparecen en el chat</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" v-model="form.is_active" class="sr-only peer" />
                            <div
                                class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 dark:peer-focus:ring-teal-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-teal-600"></div>
                        </label>
                    </div>
                    <p v-if="formError" class="text-sm text-red-600 dark:text-red-400">{{ formError }}</p>
                </div>
                <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button
                        @click="closeModal"
                        class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button
                        @click="saveTemplate"
                        :disabled="saving"
                        class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50">
                        {{ saving ? 'Guardando...' : editingTemplate ? 'Actualizar' : 'Guardar' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { inject, onMounted, ref } from 'vue';

    import type { MessageTemplate } from '@/dashboard/js/chatbot/inbox/types';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaFetch } from '@/dashboard/js/functions';

    const csrf_token = inject<string>('csrf_token');
    const panelUrl = inject<string>('panelUrl', '');

    const templates = ref<MessageTemplate[]>([]);
    const loading = ref(false);
    const saving = ref(false);
    const showModal = ref(false);
    const formError = ref('');
    const editingTemplate = ref<MessageTemplate | null>(null);

    const form = ref({
        name: '',
        content: '',
        category: '',
        is_active: true,
        priority: 0,
    });

    const loadTemplates = async () => {
        loading.value = true;
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/inbox/api/message-templates?include_inactive=1`,
                method: 'GET',
            });
            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                templates.value = (response.data as MessageTemplate[]) || [];
            }
        } catch (error) {
            console.error('[MessageTemplatesManager] Error al cargar plantillas:', error);
        } finally {
            loading.value = false;
        }
    };

    const openCreateModal = () => {
        editingTemplate.value = null;
        form.value = {
            name: '',
            content: '',
            category: '',
            is_active: true,
            priority: 0,
        };
        formError.value = '';
        showModal.value = true;
    };

    const openEditModal = (item: MessageTemplate) => {
        editingTemplate.value = item;
        form.value = {
            name: item.name,
            content: item.content,
            category: item.category ?? '',
            is_active: item.is_active,
            priority: item.priority,
        };
        formError.value = '';
        showModal.value = true;
    };

    const closeModal = () => {
        showModal.value = false;
        editingTemplate.value = null;
        formError.value = '';
    };

    const saveTemplate = async () => {
        if (!form.value.name.trim()) {
            formError.value = 'El nombre es requerido';
            return;
        }

        if (!form.value.content.trim()) {
            formError.value = 'El contenido es requerido';
            return;
        }

        saving.value = true;
        formError.value = '';

        try {
            const payload = {
                name: form.value.name.trim(),
                content: form.value.content.trim(),
                category: form.value.category.trim() || null,
                is_active: form.value.is_active,
                priority: form.value.priority,
            };

            const isEditing = editingTemplate.value !== null;
            const url = isEditing
                ? `/${panelUrl}/inbox/api/message-templates/${editingTemplate.value?.id}`
                : `/${panelUrl}/inbox/api/message-templates`;
            const method = isEditing ? 'PUT' : 'POST';

            const response = await versaFetch({
                url,
                method,
                data: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrf_token ?? '',
                },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                closeModal();
                await loadTemplates();
                return;
            }

            formError.value = 'No se pudo guardar la plantilla';
        } catch (error) {
            console.error('[MessageTemplatesManager] Error al guardar plantilla:', error);
            formError.value = 'Error al guardar la plantilla';
        } finally {
            saving.value = false;
        }
    };

    const confirmDelete = async (item: MessageTemplate) => {
        // eslint-disable-next-line no-alert
        if (!confirm(`¿Eliminar la plantilla "${item.name}"?`)) {
            return;
        }

        try {
            await versaFetch({
                url: `/${panelUrl}/inbox/api/message-templates/${item.id}`,
                method: 'DELETE',
                headers: { 'X-CSRF-Token': csrf_token ?? '' },
            });
            await loadTemplates();
        } catch (error) {
            console.error('[MessageTemplatesManager] Error al eliminar plantilla:', error);
        }
    };

    onMounted(loadTemplates);
</script>
