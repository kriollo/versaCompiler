<script setup lang="ts">
    import type { VersaFetchResponse } from 'versaTypes';
    import { computed, inject, onMounted, ref, type Ref, watch } from 'vue';

    import type { ChatbotMediaAsset, MediaType } from '@/dashboard/js/chatbot/mediaStore/types';
    import Breadcrumb from '@/dashboard/js/components/breadcrumb.vue';
    import { versaAlert, versaFetch } from '@/dashboard/js/functions';

    import MediaThumbnail from './components/MediaThumbnail.vue';

    interface BreadcrumbItem {
        type: string;
        title: string;
        icon: string;
        link: string;
    }

    const panelUrl = inject<string>('panelUrl', '');
    const empresaSelected = inject<string>('empresaSelected', '');
    const csrfToken = inject<Ref<string>>('csrf_token', ref(''));

    const mediaTypes: { value: MediaType; label: string; icon: string }[] = [
        { value: 'image', label: 'Imágenes', icon: 'bi-image' },
        { value: 'video', label: 'Videos', icon: 'bi-film' },
        { value: 'audio', label: 'Audios', icon: 'bi-mic' },
        { value: 'file', label: 'Archivos', icon: 'bi-file-earmark' },
    ];

    const breadCrumbList: BreadcrumbItem[] = [
        {
            type: 'link',
            title: 'Home',
            icon: '<svg class="w-3 h-3 me-2.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z"/></svg>',
            link: `/${panelUrl}/dashboard`,
        },
        {
            type: 'text',
            title: 'Media Store',
            icon: '<svg class="w-3 h-3 text-gray-400 mx-1" fill="none" viewBox="0 0 6 10" xmlns="http://www.w3.org/2000/svg"><path d="m1 9 4-4-4-4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
            link: '',
        },
    ];

    const selectedType = ref<MediaType>('image');
    const loading = ref(false);
    const uploading = ref(false);
    const deletingId = ref<number | null>(null);
    const renamingId = ref<number | null>(null);
    const renameText = ref('');
    const selectedFiles = ref<File[]>([]);
    const assets = ref<ChatbotMediaAsset[]>([]);

    const currentLabel = computed(() => mediaTypes.find(t => t.value === selectedType.value)?.label || 'Archivos');

    const acceptByType = computed(() => {
        switch (selectedType.value) {
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

    const handleFileChange = (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (target.files) {
            selectedFiles.value.push(...target.files);
        }
    };

    const removeSelectedFile = (index: number) => {
        selectedFiles.value.splice(index, 1);
        if (selectedFiles.value.length === 0) {
            const fileInput = document.querySelector('#upload-input') as HTMLInputElement;
            if (fileInput) {
                fileInput.value = '';
            }
        }
    };

    const loadAssets = async () => {
        loading.value = true;
        try {
            const response: VersaFetchResponse = await versaFetch({
                url: `/${panelUrl}/chatbot/mediaStore/api/list/${empresaSelected}?per_page=200&media_type=${selectedType.value}`,
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
                title: 'Error al cargar biblioteca',
                message: 'No fue posible obtener los archivos.',
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
            formData.append('media_type', selectedType.value);
            formData.append('csrf_token', csrfToken.value);

            const response: VersaFetchResponse = await versaFetch({
                url: `/${panelUrl}/chatbot/mediaStore/api/upload/${empresaSelected}`,
                method: 'POST',
                data: formData,
            });

            if (response.success === 1) {
                selectedFiles.value = [];
                // Reset file input
                const fileInput = document.querySelector('#upload-input') as HTMLInputElement;
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
                    title: 'Error al subir',
                    message: response.message || 'No fue posible subir los archivos.',
                });
            }
        } catch {
            versaAlert({
                type: 'error',
                title: 'Error de red',
                message: 'Ocurrió un error al intentar subir los archivos.',
            });
        } finally {
            uploading.value = false;
        }
    };

    const deleteAsset = async (assetId: number) => {
        deletingId.value = assetId;
        try {
            const response: VersaFetchResponse = await versaFetch({
                url: `/${panelUrl}/chatbot/mediaStore/api/delete/${empresaSelected}`,
                method: 'POST',
                data: {
                    id: assetId,
                    csrf_token: csrfToken.value,
                },
            });

            if (response.success === 1) {
                await loadAssets();
                return;
            }

            versaAlert({
                type: 'error',
                title: 'No se pudo eliminar',
                message: response.message || 'Error al eliminar archivo.',
            });
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

    const startRenaming = (asset: ChatbotMediaAsset) => {
        renamingId.value = asset.id;
        renameText.value = asset.original_name;
    };

    const cancelRename = () => {
        renamingId.value = null;
        renameText.value = '';
    };

    const saveRename = async (assetId: number) => {
        if (!renameText.value.trim()) {
            versaAlert({
                type: 'warning',
                title: 'Nombre inválido',
                message: 'El nombre no puede estar vacío.',
            });
            return;
        }

        try {
            const response: VersaFetchResponse = await versaFetch({
                url: `/${panelUrl}/chatbot/mediaStore/api/rename/${empresaSelected}`,
                method: 'POST',
                data: {
                    id: assetId,
                    new_name: renameText.value.trim(),
                    csrf_token: csrfToken.value,
                },
            });

            if (response.success === 1) {
                renamingId.value = null;
                await loadAssets();
                versaAlert({
                    type: 'success',
                    title: 'Renombrado',
                    message: 'El archivo se renombró correctamente.',
                });
                return;
            }

            versaAlert({
                type: 'error',
                title: 'Error',
                message: response.message || 'No fue posible renombrar el archivo.',
            });
        } catch {
            versaAlert({
                type: 'error',
                title: 'Error de red',
                message: 'No fue posible renombrar el archivo.',
            });
        }
    };

    watch(
        () => selectedType.value,
        () => {
            loadAssets();
        },
    );

    onMounted(() => {
        loadAssets();
    });
</script>

<template>
    <div class="w-full p-4 md:p-6 space-y-6 animate-fade-in">
        <Breadcrumb
            title="Media Store"
            iconSVG="<svg class='w-[32px] h-[32px] text-gray-800 dark:text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2 1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-8h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z'></path></svg>"
            :items="breadCrumbList" />

        <!-- Header y Filtros -->
        <div
            class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-6">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex flex-wrap items-center gap-2 p-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl w-fit">
                    <button
                        v-for="type in mediaTypes"
                        :key="type.value"
                        @click="selectedType = type.value"
                        class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                        :class="
                            selectedType === type.value
                                ? 'bg-white dark:bg-gray-700 text-brand shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        ">
                        <i :class="['bi', type.icon]"></i>
                        {{ type.label }}
                    </button>
                </div>

                <!-- Upload Area Replacement -->
                <div class="flex flex-col md:flex-row items-start md:items-end gap-3 flex-1">
                    <div class="flex-1 w-full">
                        <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">
                            Subir nuevos archivos
                        </label>
                        <div class="flex flex-wrap gap-2 mb-2" v-if="selectedFiles.length > 0">
                            <div
                                v-for="(file, index) in selectedFiles"
                                :key="index"
                                class="flex items-center gap-2 px-3 py-1 bg-brand/10 text-brand border border-brand/20 rounded-full text-xs">
                                <span class="max-w-[150px] truncate">{{ file.name }}</span>
                                <button @click="removeSelectedFile(index)" class="hover:text-red-500 transition-colors">
                                    <i class="bi bi-x-lg"></i>
                                </button>
                            </div>
                        </div>
                        <div class="relative">
                            <input
                                id="upload-input"
                                type="file"
                                multiple
                                :accept="acceptByType"
                                class="hidden"
                                @change="handleFileChange" />
                            <label
                                for="upload-input"
                                class="flex items-center gap-2 px-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-brand transition-colors truncate">
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
                        class="px-8 py-2.5 rounded-2xl text-white bg-brand font-bold hover:shadow-lg hover:shadow-brand/20 active:scale-95 transition-all disabled:opacity-50"
                        @click="uploadFile">
                        <span v-if="uploading" class="spinner-border spinner-border-sm mr-2"></span>
                        {{ uploading ? 'Subiendo' : 'Subir' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Grid de Contenido -->
        <div class="space-y-4">
            <div class="flex items-center justify-between px-2">
                <h2 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <i class="bi bi-grid-3x3-gap-fill text-brand"></i>
                    {{ currentLabel }}
                    <span
                        class="text-xs font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full ml-1">
                        {{ assets.length }}
                    </span>
                </h2>
            </div>

            <div v-if="loading" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div
                    v-for="i in 8"
                    :key="i"
                    class="aspect-square bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse"></div>
            </div>

            <div
                v-else-if="assets.length === 0"
                class="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                <div class="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <i class="bi bi-folder2-open text-3xl text-gray-300"></i>
                </div>
                <h3 class="text-sm font-medium text-gray-900 dark:text-white">Sin elementos</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">Sube tu primer archivo para comenzar</p>
            </div>

            <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                <div
                    v-for="asset in assets"
                    :key="asset.id"
                    class="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-brand/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                    <!-- Media Preview -->
                    <div class="aspect-square relative overflow-hidden bg-gray-50 dark:bg-gray-800/50">
                        <MediaThumbnail
                            :type="asset.media_type"
                            :url="asset.public_url"
                            :mime="asset.mime"
                            className="w-full h-full border-0 rounded-none shadow-none" />

                        <!-- Overlay Actions -->
                        <div
                            class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                            <a
                                :href="asset.public_url"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Ver pantalla completa"
                                class="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-all">
                                <i class="bi bi-eye"></i>
                            </a>
                            <button
                                @click="startRenaming(asset)"
                                title="Renombrar"
                                class="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-all">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button
                                v-if="deletingId !== asset.id"
                                @click="deleteAsset(asset.id)"
                                title="Eliminar"
                                class="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/80 hover:bg-red-500 text-white backdrop-blur-md transition-all">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Details -->
                    <div class="p-3">
                        <div v-if="renamingId === asset.id" class="space-y-2">
                            <input
                                v-model="renameText"
                                type="text"
                                class="w-full text-xs px-2 py-1.5 rounded-lg border border-brand bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
                                @keyup.enter="saveRename(asset.id)"
                                @keyup.esc="cancelRename"
                                autofocus />
                            <div class="flex gap-1 justify-end">
                                <button
                                    @click="cancelRename"
                                    class="text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                    Cancelar
                                </button>
                                <button @click="saveRename(asset.id)" class="text-[10px] text-brand font-bold">
                                    Guardar
                                </button>
                            </div>
                        </div>
                        <template v-else>
                            <h3
                                class="text-[13px] font-semibold text-gray-900 dark:text-white truncate mb-0.5"
                                :title="asset.original_name">
                                {{ asset.original_name }}
                            </h3>
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] text-gray-400 font-medium">
                                    {{ formatBytes(asset.size_bytes) }}
                                </span>
                                <span
                                    class="text-[10px] text-gray-400 capitalize bg-gray-50 dark:bg-gray-800/50 px-1.5 py-0.5 rounded-md border border-gray-100 dark:border-gray-800">
                                    {{ asset.mime.split('/')[1] || asset.media_type }}
                                </span>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
    .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
