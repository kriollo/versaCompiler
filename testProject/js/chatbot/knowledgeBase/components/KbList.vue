<script setup lang="ts">
    import { computed } from 'vue';

    interface KbStats {
        total_documents: number;
        ready_documents: number;
        pending_documents: number;
        error_documents: number;
        total_chunks: number;
    }

    interface KbItem {
        id: number;
        name: string;
        description?: string;
        embedding_model: string;
        chunk_size: number;
        status: string;
        created_at: string;
        stats?: KbStats;
    }

    interface Props {
        knowledgeBases: KbItem[];
        loading: boolean;
    }

    defineProps<Props>();
    const emit = defineEmits<{
        edit: [kb: KbItem];
        'view-documents': [kb: KbItem];
        delete: [kb: KbItem];
    }>();

    const getStatusBadge = (status: string) => {
        const badges: Record<string, string> = {
            active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
            deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        };
        return badges[status] || badges.inactive;
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            active: 'Activo',
            inactive: 'Inactivo',
            deleted: 'Eliminado',
        };
        return labels[status] || status;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) {
            return '';
        }
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
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
</script>

<template>
    <div>
        <div v-if="loading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        </div>

        <div v-else-if="knowledgeBases.length === 0" class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No hay bases de conocimiento</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Comienza creando una nueva base de conocimiento para tu chatbot.
            </p>
        </div>

        <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div
                v-for="kb in knowledgeBases"
                :key="kb.id"
                class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                <div class="p-5">
                    <div class="flex items-start justify-between">
                        <div class="flex-1 min-w-0">
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                {{ kb.name }}
                            </h3>
                            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                {{ kb.description || 'Sin descripción' }}
                            </p>
                        </div>
                        <span
                            :class="getStatusBadge(kb.status)"
                            class="ml-2 px-2 py-1 text-xs font-medium rounded-full">
                            {{ getStatusLabel(kb.status) }}
                        </span>
                    </div>

                    <div class="mt-4 flex flex-wrap gap-2">
                        <span
                            class="inline-flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded">
                            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {{ kb.embedding_model }}
                        </span>
                        <span
                            class="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                            Chunk: {{ kb.chunk_size }}
                        </span>
                    </div>

                    <div v-if="kb.stats" class="mt-4 grid grid-cols-4 gap-2 text-center">
                        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                            <div class="text-lg font-semibold text-gray-900 dark:text-white">
                                {{ kb.stats.total_documents }}
                            </div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">Docs</div>
                        </div>
                        <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                            <div class="text-lg font-semibold text-green-600 dark:text-green-400">
                                {{ kb.stats.ready_documents }}
                            </div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">Listos</div>
                        </div>
                        <div class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2">
                            <div class="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                                {{ kb.stats.pending_documents }}
                            </div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">Pendientes</div>
                        </div>
                        <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                            <div class="text-lg font-semibold text-red-600 dark:text-red-400">
                                {{ kb.stats.error_documents }}
                            </div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">Errores</div>
                        </div>
                    </div>

                    <div class="mt-4 text-xs text-gray-400">Creada: {{ formatDate(kb.created_at) }}</div>
                </div>

                <div
                    class="px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                    <button
                        @click="emit('view-documents', kb)"
                        class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/10 rounded-lg transition-colors">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Documentos
                    </button>
                    <button
                        @click="emit('edit', kb)"
                        class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                    </button>
                    <button
                        @click="emit('delete', kb)"
                        class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
