<script setup lang="ts">
    import { ref } from 'vue';

    import DropZone from '@/dashboard/js/components/dropZone.vue';
    import Modal from '@/dashboard/js/components/modal.vue';
    import { useFileTypes } from '@/dashboard/js/composables/useFileTypes';

    defineProps<{
        carpetaId: number;
    }>();

    const emit = defineEmits<{
        subir: [archivos: FileList];
        cerrar: [];
    }>();

    // Definición del tipo FilePayload para los archivos recibidos del DropZone
    interface FilePayload {
        file: File;
        [key: string]: any;
    }

    const { obtenerIconoArchivo, formatearTamano } = useFileTypes();

    const archivosSeleccionados = ref<File[]>([]);
    const subiendoArchivos = ref(false);
    const progreso = ref(0);

    function onDropZoneAccion(payload: any) {
        if (payload.accion === 'addFiles') {
            (payload.files as FilePayload[]).forEach((file: FilePayload) => {
                archivosSeleccionados.value.push(file.file);
            });
        }
    }

    const removerArchivo = (index: number) => {
        archivosSeleccionados.value.splice(index, 1);
    };

    const subirArchivos = () => {
        if (subiendoArchivos.value || archivosSeleccionados.value.length === 0) {
            return;
        }

        subiendoArchivos.value = true;
        progreso.value = 0;

        // Simular progreso
        const interval = setInterval(() => {
            progreso.value += 10;
            if (progreso.value >= 90) {
                clearInterval(interval);
            }
        }, 200);

        try {
            // Convertir array a FileList-like object
            const dt = new DataTransfer();
            for (const file of archivosSeleccionados.value) {
                dt.items.add(file);
            }

            emit('subir', dt.files);

            clearInterval(interval);
            progreso.value = 100;

            setTimeout(() => {
                subiendoArchivos.value = false;
                archivosSeleccionados.value = [];
            }, 1000);
        } catch (error) {
            console.error('Error al subir archivos:', error);
            clearInterval(interval);
            subiendoArchivos.value = false;
        }
    };
</script>

<template>
    <Modal :id-modal="`documento-uploader-modal`" :show-modal="true" size="max-w-2xl" @accion="$emit('cerrar')">
        <template #modalTitle>
            <div class="flex justify-between items-center">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    <i class="bi bi-cloud-upload me-2 text-green-600 dark:text-green-400"></i>
                    Subir Documentos
                </h3>
                <button
                    type="button"
                    class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
                    @click="$emit('cerrar')">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        </template>
        <template #modalBody>
            <!-- Sustituimos el área de subida por DropZone -->
            <DropZone
                :multiple="true"
                :nfilesMultiple="10"
                :fileTypeValid="['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif']"
                :maxSizeFileMB="10"
                :files="[]"
                msgTiposArchivos="Archivos permitidos: PDF, DOC, XLS, PNG, JPG, etc. Máx 10MB"
                @accion="onDropZoneAccion" />
            <!-- Lista y progreso se mantienen igual -->
            <div v-if="archivosSeleccionados.length" class="mt-6">
                <div class="flex justify-between items-center mb-4">
                    <h6 class="text-base font-medium text-gray-900 dark:text-white">
                        Archivos seleccionados ({{ archivosSeleccionados.length }})
                    </h6>
                    <button
                        type="button"
                        class="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        @click="archivosSeleccionados = []">
                        <i class="bi bi-trash me-1"></i>
                        Limpiar todo
                    </button>
                </div>

                <div class="space-y-2 max-h-64 overflow-y-auto">
                    <div
                        v-for="(archivo, index) in archivosSeleccionados"
                        :key="index"
                        class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div class="flex items-center space-x-3">
                            <div class="text-brand dark:text-brand-400">
                                <i class="bi bi-file-earmark text-xl"></i>
                            </div>
                            <div class="min-w-0 flex-1">
                                <div class="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {{ archivo.name }}
                                </div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">
                                    {{ formatearTamano(archivo.size) }}
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            class="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                            @click="removerArchivo(index)"
                            title="Eliminar archivo">
                            <i class="bi bi-x-circle"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Progreso de subida -->
            <div v-if="subiendoArchivos" class="mt-6">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center space-x-2">
                        <div
                            class="animate-spin w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full"></div>
                        <span class="text-sm font-medium text-gray-900 dark:text-white">Subiendo archivos...</span>
                    </div>
                    <span class="text-sm text-gray-500 dark:text-gray-400">{{ progreso }}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div
                        class="bg-brand h-2 rounded-full transition-all duration-300"
                        :style="{ width: progreso + '%' }"></div>
                </div>
            </div>
        </template>

        <template #modalFooter>
            <button
                type="button"
                class="py-2.5 px-5 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-brand-600 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700"
                @click="$emit('cerrar')"
                :disabled="subiendoArchivos">
                <i class="bi bi-x-circle me-1"></i>
                Cancelar
            </button>
            <button
                type="button"
                class="text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-green-600 dark:hover:bg-green-700 focus:outline-none dark:focus:ring-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                @click="subirArchivos"
                :disabled="!archivosSeleccionados.length || subiendoArchivos">
                <i class="bi bi-cloud-upload me-1"></i>
                {{ subiendoArchivos ? 'Subiendo...' : `Subir ${archivosSeleccionados.length} archivo(s)` }}
            </button>
        </template>
    </Modal>
</template>
