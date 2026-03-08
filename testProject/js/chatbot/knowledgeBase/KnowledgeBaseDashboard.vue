<script setup lang="ts">
    import { inject, onMounted, ref, type Ref } from 'vue';

    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaFetch } from '@/dashboard/js/functions';

    import KbDocuments from './components/KbDocuments.vue';
    import KbForm from './components/KbForm.vue';
    import KbList from './components/KbList.vue';

    interface KbItem {
        id: number;
        name: string;
        description?: string;
        embedding_model: string;
        chunk_size: number;
        status: string;
        created_at: string;
        stats?: {
            total_documents: number;
            ready_documents: number;
            pending_documents: number;
            error_documents: number;
            total_chunks: number;
        };
    }

    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', '');
    const empresaSelected = inject<string>('empresaSelected', '');

    const knowledgeBases = ref<KbItem[]>([]);
    const loading = ref(false);
    const showForm = ref(false);
    const showDocuments = ref(false);
    const selectedKb = ref<KbItem | null>(null);
    const editingKb = ref<KbItem | null>(null);

    const fetchKnowledgeBases = async () => {
        loading.value = true;
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/chatbot/knowledge-base/api/list/${empresaSelected}`,
                method: 'GET',
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                knowledgeBases.value = response.data || [];
            }
        } catch (error) {
            console.error('Error fetching knowledge bases:', error);
        } finally {
            loading.value = false;
        }
    };

    const handleCreate = () => {
        editingKb.value = null;
        showForm.value = true;
    };

    const handleEdit = (kb: KbItem) => {
        editingKb.value = kb;
        showForm.value = true;
    };

    const handleViewDocuments = (kb: KbItem) => {
        selectedKb.value = kb;
        showDocuments.value = true;
    };

    const handleDelete = async (kb: KbItem) => {
        // eslint-disable-next-line no-alert
        if (!confirm(`¿Estás seguro de eliminar la base de conocimiento "${kb.name}"?`)) {
            return;
        }

        try {
            const response = await versaFetch({
                url: `/${panelUrl}/chatbot/knowledge-base/api/delete/${empresaSelected}`,
                method: 'POST',
                data: JSON.stringify({ id: kb.id }),
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf_token.value,
                },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                await fetchKnowledgeBases();
            }
        } catch (error) {
            console.error('Error deleting knowledge base:', error);
        }
    };

    const handleFormSave = async () => {
        showForm.value = false;
        await fetchKnowledgeBases();
    };

    const handleFormCancel = () => {
        showForm.value = false;
        editingKb.value = null;
    };

    const handleDocumentsClose = () => {
        showDocuments.value = false;
        selectedKb.value = null;
    };

    const handleDocumentsUpdated = () => {
        fetchKnowledgeBases();
    };

    onMounted(() => {
        fetchKnowledgeBases();
    });
</script>

<template>
    <div class="w-full h-full flex flex-col">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="mb-8">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Bases de Conocimiento</h1>
                        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Gestiona documentos para búsqueda semántica (RAG)
                        </p>
                    </div>
                    <button
                        @click="handleCreate"
                        class="inline-flex items-center px-4 py-2 bg-brand hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Nueva Base
                    </button>
                </div>
            </div>

            <KbList
                v-if="!showForm && !showDocuments"
                :knowledge-bases="knowledgeBases"
                :loading="loading"
                @edit="handleEdit"
                @view-documents="handleViewDocuments"
                @delete="handleDelete" />

            <KbForm
                v-if="showForm"
                :kb="editingKb"
                :csrf-token="csrf_token.value"
                :panel-url="panelUrl"
                :empresa-selected="empresaSelected"
                @save="handleFormSave"
                @cancel="handleFormCancel" />

            <KbDocuments
                v-if="showDocuments && selectedKb"
                :kb="selectedKb"
                :csrf-token="csrf_token.value"
                :panel-url="panelUrl"
                :empresa-selected="empresaSelected"
                @close="handleDocumentsClose"
                @updated="handleDocumentsUpdated" />
        </div>
    </div>
</template>
