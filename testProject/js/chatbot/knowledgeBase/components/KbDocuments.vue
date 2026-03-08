<script setup lang="ts">
    import { onMounted, onUnmounted, ref } from 'vue';

    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaFetch } from '@/dashboard/js/functions';

    interface KbItem {
        id: number;
        name: string;
    }

    interface Document {
        id: number;
        original_name: string;
        file_type: string;
        file_size: number;
        status: string;
        error_message?: string;
        total_chunks: number;
        processed_at?: string | { date: string };
        created_at: string | { date: string };
    }

    interface Props {
        kb: KbItem;
        csrfToken: string;
        panelUrl: string;
        empresaSelected: string;
    }

    const props = defineProps<Props>();
    const emit = defineEmits<{
        close: [];
        updated: [];
    }>();

    const documents = ref<Document[]>([]);
    const loading = ref(false);
    const uploading = ref(false);
    const searchQuery = ref('');
    const searchResults = ref<any[]>([]);
    const searching = ref(false);
    const autoRefresh = ref(false);
    const queueStats = ref({ pending: 0, processing: 0, completed: 0, failed: 0 });
    let refreshInterval: ReturnType<typeof setInterval> | null = null;

    const fetchDocuments = async () => {
        loading.value = true;
        try {
            const response = await versaFetch({
                url: `/${props.panelUrl}/chatbot/knowledge-base/api/documents/${props.empresaSelected}?kb_id=${props.kb.id}`,
                method: 'GET',
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                documents.value = response.data || [];
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            loading.value = false;
        }
    };

    const fetchQueueStats = async () => {
        try {
            const response = await versaFetch({
                url: `/${props.panelUrl}/chatbot/knowledge-base/api/queue/stats`,
                method: 'GET',
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                queueStats.value = response.data || { pending: 0, processing: 0, completed: 0, failed: 0 };
            }
        } catch (error) {
            console.error('Error fetching queue stats:', error);
        }
    };

    const handleRefresh = async () => {
        await Promise.all([fetchDocuments(), fetchQueueStats()]);
    };

    const toggleAutoRefresh = () => {
        autoRefresh.value = !autoRefresh.value;
        if (autoRefresh.value) {
            refreshInterval = setInterval(handleRefresh, 3000);
        } else if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    };

    const handleFileUpload = async (event: Event) => {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) {
            return;
        }

        uploading.value = true;
        try {
            const formData = new FormData();
            formData.append('kb_id', String(props.kb.id));

            for (const file of input.files) {
                formData.append('document[]', file);
            }

            const response = await fetch(
                `/${props.panelUrl}/chatbot/knowledge-base/api/documents/upload/${props.empresaSelected}`,
                {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': props.csrfToken,
                    },
                    body: formData,
                },
            );

            const data = await response.json();

            if (data.success) {
                await handleRefresh();
                emit('updated');
                if (!autoRefresh.value) {
                    autoRefresh.value = true;
                    toggleAutoRefresh();
                    autoRefresh.value = true;
                }
            }
        } catch (error) {
            console.error('Error uploading documents:', error);
        } finally {
            uploading.value = false;
            input.value = '';
        }
    };

    const handleDelete = async (doc: Document) => {
        // eslint-disable-next-line no-alert
        if (!confirm(`¿Eliminar "${doc.original_name}"?`)) {
            return;
        }

        try {
            const response = await versaFetch({
                url: `/${props.panelUrl}/chatbot/knowledge-base/api/documents/delete/${props.empresaSelected}`,
                method: 'POST',
                data: JSON.stringify({
                    document_id: doc.id,
                    kb_id: props.kb.id,
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': props.csrfToken,
                },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                await handleRefresh();
                emit('updated');
            }
        } catch (error) {
            console.error('Error deleting document:', error);
        }
    };

    const top_k = ref(5);
    const min_score = ref(0.3);

    const handleSearch = async () => {
        if (!searchQuery.value.trim()) {
            searchResults.value = [];
            return;
        }

        searching.value = true;
        try {
            const response = await versaFetch({
                url: `/${props.panelUrl}/chatbot/knowledge-base/api/search/${props.empresaSelected}`,
                method: 'POST',
                data: JSON.stringify({
                    kb_id: props.kb.id,
                    query: searchQuery.value,
                    top_k: top_k.value,
                    min_score: min_score.value,
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                searchResults.value = response.data?.results || [];
            }
        } catch (error) {
            console.error('Error searching:', error);
        } finally {
            searching.value = false;
        }
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            ready: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            pending: 'Pendiente',
            processing: 'Procesando',
            ready: 'Listo',
            error: 'Error',
        };
        return labels[status] || status;
    };

    const getStatusIcon = (status: string) => {
        const icons: Record<string, string> = {
            pending: '⏳',
            processing: '⚙️',
            ready: '✅',
            error: '❌',
        };
        return icons[status] || '📁';
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) {
            return '0 B';
        }
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
    };

    const getFileIcon = (type: string) => {
        const icons: Record<string, string> = {
            pdf: '📄',
            docx: '📝',
            txt: '📃',
            md: '📑',
            json: '{ }',
            csv: '📊',
        };
        return icons[type] || '📁';
    };

    const formatDate = (date: string | { date: string } | undefined) => {
        if (!date) {
            return '-';
        }
        const dateStr = typeof date === 'string' ? date : date.date;
        try {
            return new Date(dateStr).toLocaleDateString();
        } catch {
            return dateStr || '-';
        }
    };

    const hasPendingDocs = () => documents.value.some(d => d.status === 'pending' || d.status === 'processing');

    onMounted(() => {
        handleRefresh();
    });

    onUnmounted(() => {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
    });
</script>

<template>
    <div class="space-y-6">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                <button
                    @click="emit('close')"
                    class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div>
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ kb.name }}</h2>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Gestionar documentos</p>
                </div>
            </div>

            <div class="flex items-center gap-2">
                <button
                    @click="toggleAutoRefresh"
                    :class="
                        autoRefresh
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    "
                    class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors">
                    <svg
                        class="w-4 h-4 mr-1.5"
                        :class="{ 'animate-spin': autoRefresh }"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {{ autoRefresh ? 'Auto' : 'Manual' }}
                </button>

                <button
                    @click="handleRefresh"
                    :disabled="loading"
                    class="inline-flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                    <svg
                        class="w-4 h-4 mr-1.5"
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
                    Actualizar
                </button>

                <label
                    class="inline-flex items-center px-4 py-2 bg-brand hover:bg-brand-600 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span v-if="uploading">Subiendo...</span>
                    <span v-else>Subir Documentos</span>
                    <input
                        type="file"
                        multiple
                        accept=".pdf,.docx,.txt,.md,.json,.csv"
                        class="hidden"
                        @change="handleFileUpload" />
                </label>
            </div>
        </div>

        <div class="grid grid-cols-4 gap-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-500 dark:text-gray-400">Pendientes</span>
                    <span class="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                        {{ queueStats.pending }}
                    </span>
                </div>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-500 dark:text-gray-400">Procesando</span>
                    <span class="text-lg font-semibold text-blue-600 dark:text-blue-400">
                        {{ queueStats.processing }}
                    </span>
                </div>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-500 dark:text-gray-400">Completados</span>
                    <span class="text-lg font-semibold text-green-600 dark:text-green-400">
                        {{ queueStats.completed }}
                    </span>
                </div>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-500 dark:text-gray-400">Errores</span>
                    <span class="text-lg font-semibold text-red-600 dark:text-red-400">{{ queueStats.failed }}</span>
                </div>
            </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Probar Búsqueda Semántica</h3>
            <div class="flex gap-2 flex-wrap">
                <input
                    v-model="top_k"
                    type="number"
                    min="1"
                    max="20"
                    placeholder="Top K"
                    class="w-20 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <input
                    v-model="min_score"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    placeholder="Min Score"
                    class="w-24 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Escribe una pregunta o término de búsqueda..."
                    class="flex-1 min-w-64 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    @keyup.enter="handleSearch" />
                <button
                    @click="handleSearch"
                    :disabled="searching || !searchQuery.trim()"
                    class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                    <span v-if="searching">Buscando...</span>
                    <span v-else>Buscar</span>
                </button>
            </div>

            <div v-if="searchResults.length > 0" class="mt-4 space-y-3">
                <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Resultados ({{ searchResults.length }})
                </h4>
                <div
                    v-for="result in searchResults"
                    :key="result.id"
                    class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-medium text-purple-600 dark:text-purple-400">
                            {{ result.document_name }}
                        </span>
                        <span
                            class="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                            {{ (result.score * 100).toFixed(1) }}% similar
                        </span>
                    </div>
                    <p class="text-sm text-gray-700 dark:text-gray-300">{{ result.content }}</p>
                </div>
            </div>
            <div
                v-else-if="searchQuery && !searching"
                class="mt-4 text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                No se encontraron resultados. Intenta con otros términos o baja el min_score.
            </div>
        </div>

        <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div v-if="loading && documents.length === 0" class="flex justify-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
            </div>

            <div v-else-if="documents.length === 0" class="text-center py-12">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No hay documentos</h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Sube documentos para comenzar.</p>
                <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Formatos soportados: PDF, DOCX, TXT, MD, JSON, CSV
                </p>
            </div>

            <table v-else class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Documento
                        </th>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Estado
                        </th>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Chunks
                        </th>
                        <th
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Fecha
                        </th>
                        <th
                            class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                    <tr v-for="doc in documents" :key="doc.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                                <span class="text-xl mr-3">{{ getFileIcon(doc.file_type) }}</span>
                                <div>
                                    <div class="text-sm font-medium text-gray-900 dark:text-white">
                                        {{ doc.original_name }}
                                    </div>
                                    <div class="text-xs text-gray-500 dark:text-gray-400">
                                        {{ formatBytes(doc.file_size) }} · {{ doc.file_type.toUpperCase() }}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center gap-2">
                                <span class="text-sm">{{ getStatusIcon(doc.status) }}</span>
                                <span
                                    :class="getStatusBadge(doc.status)"
                                    class="px-2 py-1 text-xs font-medium rounded-full">
                                    {{ getStatusLabel(doc.status) }}
                                </span>
                            </div>
                            <p
                                v-if="doc.error_message"
                                class="mt-1 text-xs text-red-500 dark:text-red-400 max-w-xs truncate"
                                :title="doc.error_message">
                                {{ doc.error_message }}
                            </p>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="text-sm text-gray-900 dark:text-white font-medium">
                                {{ doc.total_chunks }}
                            </span>
                            <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">fragmentos</span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {{ formatDate(doc.created_at) }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <button
                                @click="handleDelete(doc)"
                                class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium">
                                Eliminar
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div
            v-if="hasPendingDocs() && !autoRefresh"
            class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div class="flex items-center gap-3">
                <svg
                    class="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <div>
                    <p class="text-sm font-medium text-blue-800 dark:text-blue-200">Procesamiento en curso</p>
                    <p class="text-xs text-blue-600 dark:text-blue-400">
                        Los documentos se están procesando. Activa "Auto" para ver los cambios en tiempo real.
                    </p>
                </div>
                <button
                    @click="toggleAutoRefresh"
                    class="ml-auto px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
                    Activar Auto-Refresh
                </button>
            </div>
        </div>
    </div>
</template>
