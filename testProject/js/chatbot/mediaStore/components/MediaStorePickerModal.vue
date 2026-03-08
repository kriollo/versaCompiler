<script setup lang="ts">
    import type { VersaFetchResponse } from 'versaTypes';
    import { computed, ref, watch } from 'vue';

    import type { ChatbotMediaAsset, MediaType } from '@/dashboard/js/chatbot/mediaStore/types';
    import Modal from '@/dashboard/js/components/modal.vue';
    import { versaAlert, versaFetch } from '@/dashboard/js/functions';

    import MediaThumbnail from './MediaThumbnail.vue';

    interface Props {
        show: boolean;
        panelUrl: string;
        empresaToken: string;
        csrfToken: string;
        mediaType: MediaType;
    }

    const props = defineProps<Props>();

    const emit = defineEmits<{
        close: [];
        select: [asset: ChatbotMediaAsset];
    }>();

    const loading = ref(false);
    const uploading = ref(false);
    const deletingId = ref<number | null>(null);
    const selectedFiles = ref<File[]>([]);
    const assets = ref<ChatbotMediaAsset[]>([]);

    const acceptByType = computed(() => {
        switch (props.mediaType) {
            case 'image': {
                return 'image/*';
            }
            case 'video': {
                return 'video/*';
            }
            case 'audio': {
                return 'audio/*';
            }
            default: {
                return '.pdf,.txt,.doc,.docx,.xls,.xlsx,.zip';
            }
        }
    });

    const closeModal = () => {
        emit('close');
    };

    const formatBytes = (bytes: number): string => {
        if (!bytes || bytes <= 0) {
            return '0 B';
        }

        const units = ['B', 'KB', 'MB', 'GB'];
        let value = bytes;
        let index = 0;
        while (value >= 1024 && index < units.length - 1) {
            value /= 1024;
            index += 1;
        }

        return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
    };

    const loadAssets = async () => {
        if (!props.show) {
            return;
        }
        loading.value = true;
        try {
            const response: VersaFetchResponse = await versaFetch({
                url: `/${props.panelUrl}/chatbot/mediaStore/api/list/${props.empresaToken}?per_page=200&media_type=${props.mediaType}`,
                method: 'GET',
            });

            if (response.success === 1 && Array.isArray(response.data)) {
                assets.value = response.data as ChatbotMediaAsset[];
            } else {
                assets.value = [];
            }
        } catch {
            assets.value = [];
            versaAlert({
                type: 'error',
                title: 'Error al cargar archivos',
                message: 'No fue posible obtener la biblioteca de archivos.',
            });
        } finally {
            loading.value = false;
        }
    };

    const uploadFile = async () => {
        if (selectedFiles.value.length === 0) {
            versaAlert({
                type: 'warning',
                title: 'Archivos requeridos',
                message: 'Selecciona al menos un archivo antes de subir.',
            });
            return;
        }

        uploading.value = true;
        try {
            const formData = new FormData();
            selectedFiles.value.forEach(file => {
                formData.append('media[]', file);
            });
            formData.append('media_type', props.mediaType);
            formData.append('csrf_token', props.csrfToken);

            const response: VersaFetchResponse = await versaFetch({
                url: `/${props.panelUrl}/chatbot/mediaStore/api/upload/${props.empresaToken}`,
                method: 'POST',
                data: formData,
            });

            if (response.success === 1) {
                selectedFiles.value = [];
                // Reset file input
                const fileInput = document.querySelector('#modal-upload-input') as HTMLInputElement;
                if (fileInput) {
                    fileInput.value = '';
                }

                await loadAssets();
                versaAlert({
                    type: 'success',
                    title: 'Archivos subidos',
                    message: 'Los archivos se subieron correctamente.',
                });
            } else {
                versaAlert({
                    type: 'error',
                    title: 'No se pudo subir',
                    message: response.message || 'Error al subir archivo.',
                });
            }
        } catch {
            versaAlert({
                type: 'error',
                title: 'Error de red',
                message: 'No fue posible subir el archivo.',
            });
        } finally {
            uploading.value = false;
        }
    };

    const deleteAsset = async (assetId: number) => {
        deletingId.value = assetId;
        try {
            const response: VersaFetchResponse = await versaFetch({
                url: `/${props.panelUrl}/chatbot/mediaStore/api/delete/${props.empresaToken}`,
                method: 'POST',
                data: {
                    id: assetId,
                    csrf_token: props.csrfToken,
                },
            });

            if (response.success === 1) {
                await loadAssets();
            } else {
                versaAlert({
                    type: 'error',
                    title: 'No se pudo eliminar',
                    message: response.message || 'Error al eliminar archivo.',
                });
            }
        } catch {
            versaAlert({
                type: 'error',
                title: 'Error de red',
                message: 'No fue posible eliminar el archivo.',
            });
        } finally {
            deletingId.value = null;
        }
    };

    const handleFileChange = (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (target.files) {
            selectedFiles.value.push(...target.files);
        }
    };

    const removeSelectedFile = (index: number) => {
        selectedFiles.value.splice(index, 1);
        if (selectedFiles.value.length === 0) {
            const fileInput = document.querySelector('#modal-upload-input') as HTMLInputElement;
            if (fileInput) {
                fileInput.value = '';
            }
        }
    };

    const selectAsset = (asset: ChatbotMediaAsset) => {
        emit('select', asset);
        emit('close');
    };

    watch(
        () => props.show,
        show => {
            if (show) {
                selectedFiles.value = [];
                loadAssets();
            }
        },
    );
</script>

<template>
    <Modal
        :showModal="show"
        idModal="mediaStorePickerModal"
        size="max-w-4xl"
        :drag="true"
        :resizable="true"
        :blurBackground="false"
        @accion="closeModal">
        <template #modalTitle>
            <div class="flex items-center gap-2">
                <i class="bi bi-images text-brand"></i>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">Biblioteca de Archivos</h3>
            </div>
        </template>

        <template #modalBody>
            <div class="space-y-6">
                <!-- Dropzone/Upload area simplification -->
                <div
                    class="flex flex-col md:flex-row items-start md:items-end gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <div class="flex-1 w-full">
                        <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">
                            Subir nuevos archivos
                        </label>
                        <div class="flex flex-wrap gap-2 mb-2" v-if="selectedFiles.length > 0">
                            <div
                                v-for="(file, index) in selectedFiles"
                                :key="index"
                                class="flex items-center gap-2 px-3 py-1 bg-brand/10 text-brand border border-brand/20 rounded-full text-[10px]">
                                <span class="max-w-[120px] truncate">{{ file.name }}</span>
                                <button @click="removeSelectedFile(index)" class="hover:text-red-500 transition-colors">
                                    <i class="bi bi-x-lg"></i>
                                </button>
                            </div>
                        </div>
                        <div class="relative">
                            <input
                                id="modal-upload-input"
                                type="file"
                                multiple
                                :accept="acceptByType"
                                class="hidden"
                                @change="handleFileChange" />
                            <label
                                for="modal-upload-input"
                                class="flex items-center gap-2 px-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:border-brand transition-colors truncate">
                                <i class="bi bi-cloud-arrow-up text-brand"></i>
                                <span class="text-gray-600 dark:text-gray-300">
                                    {{
                                        selectedFiles.length > 0
                                            ? `${selectedFiles.length} archivos seleccionados`
                                            : 'Seleccionar archivos...'
                                    }}
                                </span>
                            </label>
                        </div>
                    </div>
                    <button
                        :disabled="uploading || selectedFiles.length === 0"
                        class="px-6 py-2.5 rounded-xl text-white bg-brand font-bold hover:shadow-lg hover:shadow-brand/20 active:scale-95 transition-all disabled:opacity-50"
                        @click="uploadFile">
                        <span v-if="uploading" class="spinner-border spinner-border-sm mr-2"></span>
                        {{ uploading ? 'Subiendo' : 'Subir' }}
                    </button>
                </div>

                <!-- Grid view for the picker -->
                <div class="relative">
                    <div v-if="loading" class="flex flex-col items-center justify-center py-12">
                        <div class="spinner-border text-brand mb-4"></div>
                        <p class="text-sm text-gray-500">Cargando biblioteca...</p>
                    </div>

                    <div
                        v-else-if="assets.length === 0"
                        class="flex flex-col items-center justify-center py-12 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                        <i class="bi bi-folder2-open text-3xl text-gray-300 mb-2"></i>
                        <p class="text-sm text-gray-500">No hay archivos disponibles</p>
                    </div>

                    <div
                        v-else
                        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[450px] overflow-y-auto p-1 custom-scrollbar">
                        <div
                            v-for="asset in assets"
                            :key="asset.id"
                            class="group relative bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer"
                            @click="selectAsset(asset)">
                            <div class="aspect-square relative">
                                <MediaThumbnail
                                    :type="asset.media_type"
                                    :url="asset.public_url"
                                    :mime="asset.mime"
                                    className="w-full h-full border-0 rounded-none" />

                                <div
                                    class="absolute inset-0 bg-brand/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div
                                        class="bg-brand text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                                        SELECCIONAR
                                    </div>
                                </div>
                            </div>

                            <div class="p-2 border-t border-gray-50 dark:border-gray-800">
                                <p
                                    class="text-[11px] font-medium text-gray-700 dark:text-gray-300 truncate"
                                    :title="asset.original_name">
                                    {{ asset.original_name }}
                                </p>
                            </div>

                            <!-- Single Delete Button for Picker -->
                            <button
                                @click.stop="deleteAsset(asset.id)"
                                class="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-lg bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                :disabled="deletingId === asset.id">
                                <i v-if="deletingId === asset.id" class="spinner-border spinner-border-sm w-3 h-3"></i>
                                <i v-else class="bi bi-trash text-xs"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </template>

        <template #modalFooter>
            <div class="w-full flex justify-end">
                <button
                    class="px-5 py-2 text-sm font-bold rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    @click="closeModal">
                    Cerrar
                </button>
            </div>
        </template>
    </Modal>
</template>

<style scoped>
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 10px;
    }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #475569;
    }
</style>
