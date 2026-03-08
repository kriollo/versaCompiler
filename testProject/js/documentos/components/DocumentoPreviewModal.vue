<template>
    <Modal id-modal="previewModal" :show-modal="true" size="max-w-4xl" :show-footer="true" @accion="handleAction">
        <template #modalTitle>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <i class="bi bi-eye mr-2"></i>
                Previsualizar Documento
            </h3>
            <button
                type="button"
                class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
                @click="$emit('cerrar')">
                <i class="bi bi-x-lg"></i>
                <span class="sr-only">Cerrar modal</span>
            </button>
        </template>

        <template #modalBody>
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg">
                <!-- Preview para PDFs -->
                <iframe
                    v-if="documento.mime.includes('pdf')"
                    :src="urlPreview"
                    class="w-full h-[600px] border-none rounded-lg"></iframe>

                <!-- Preview para imágenes -->
                <div v-else-if="documento.mime.includes('image')" class="text-center p-4">
                    <img
                        :src="urlPreview"
                        :alt="documento.nombre"
                        class="max-w-full h-auto max-h-[600px] mx-auto rounded-lg" />
                </div>

                <!-- Fallback para otros tipos -->
                <div v-else class="text-center p-12">
                    <i class="bi bi-file-earmark text-8xl text-gray-400 dark:text-gray-500"></i>
                    <h5 class="mt-3 text-gray-900 dark:text-gray-100 text-lg font-medium">{{ documento.nombre }}</h5>
                    <p class="text-gray-500 dark:text-gray-400 mt-2">
                        Este tipo de archivo no se puede previsualizar.
                        <br />
                        Haz clic en descargar para abrirlo.
                    </p>
                    <button
                        class="bg-brand hover:bg-brand text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 mx-auto mt-4"
                        @click="descargar">
                        <i class="bi bi-download"></i>
                        Descargar
                    </button>
                </div>
            </div>
        </template>

        <template #modalFooter>
            <button
                type="button"
                class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                @click="$emit('cerrar')">
                Cerrar
            </button>
            <button
                type="button"
                class="bg-brand hover:bg-brand text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                @click="descargar">
                <i class="bi bi-download"></i>
                Descargar
            </button>
        </template>
    </Modal>
</template>

<script setup lang="ts">
    import { computed, inject } from 'vue';

    import Modal from '@/dashboard/js/components/modal.vue';

    interface Documento {
        id: number;
        nombre: string;
        mime: string;
    }

    const props = defineProps<{
        documento: Documento;
    }>();

    const emit = defineEmits<{
        cerrar: [];
    }>();

    const panelUrl = inject<string>('panelUrl', '');

    const urlPreview = computed(() => `/${panelUrl}/documentos/archivos/api/descargar/${props.documento.id}`);

    const descargar = () => {
        window.open(urlPreview.value, '_blank');
    };

    const handleAction = (action: any) => {
        // Manejar acciones del modal si es necesario
        console.log('Action:', action);
    };
</script>
