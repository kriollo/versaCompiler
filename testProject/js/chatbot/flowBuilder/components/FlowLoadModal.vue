<script setup lang="ts">
    import { ref } from 'vue';

    import type { Connection, FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
    import Modal from '@/dashboard/js/components/modal.vue';

    interface Props {
        show: boolean;
    }

    defineProps<Props>();

    interface ImportableFlowData {
        name?: string;
        nodes: FlowNode[];
        connections: Connection[];
    }

    const emit = defineEmits<{
        close: [];
        import: [data: ImportableFlowData];
    }>();

    const fileInput = ref<HTMLInputElement | null>(null);
    const importedData = ref<ImportableFlowData | null>(null);
    const errorMessage = ref<string>('');

    const handleFileSelect = async (event: Event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) {
            return;
        }

        try {
            const text = await file.text();
            const jsonData = JSON.parse(text) as Partial<ImportableFlowData>;

            if (!Array.isArray(jsonData.nodes) || !Array.isArray(jsonData.connections)) {
                errorMessage.value =
                    'El archivo JSON debe incluir las propiedades "nodes" y "connections" como arreglos.';
                importedData.value = null;
                return;
            }

            importedData.value = {
                name: file.name || 'Flujo sin nombre',
                nodes: jsonData.nodes,
                connections: jsonData.connections,
            };
            errorMessage.value = '';
        } catch {
            errorMessage.value = 'Error al leer el archivo. Asegúrate de que sea un JSON válido.';
            importedData.value = null;
        }
    };

    const handleImport = () => {
        if (importedData.value) {
            emit('import', importedData.value);
            handleClose();
        }
    };

    const handleClose = () => {
        importedData.value = null;
        errorMessage.value = '';
        if (fileInput.value) {
            fileInput.value.value = '';
        }
        emit('close');
    };
</script>

<template>
    <Modal :showModal="show" idModal="flowLoadModal" @accion="handleClose" size="max-w-2xl">
        <template #modalTitle>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white">📥 Cargar Flujo</h3>
        </template>

        <template #modalBody>
            <div class="space-y-4">
                <p class="text-sm text-gray-600 dark:text-gray-400">
                    Selecciona un archivo JSON con la configuración del flujo para importarlo.
                </p>

                <!-- Input de archivo -->
                <div>
                    <label
                        class="block w-full p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-brand dark:hover:border-brand-400 transition-colors cursor-pointer">
                        <div class="flex flex-col items-center">
                            <svg
                                class="w-12 h-12 text-gray-400 mb-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span class="text-sm text-gray-600 dark:text-gray-400">
                                {{
                                    importedData
                                        ? 'Archivo cargado correctamente'
                                        : 'Click para seleccionar un archivo JSON'
                                }}
                            </span>
                        </div>
                        <input ref="fileInput" type="file" accept=".json" @change="handleFileSelect" class="hidden" />
                    </label>
                </div>

                <!-- Error -->
                <div v-if="errorMessage" class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p class="text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>
                </div>

                <!-- Vista previa -->
                <div v-if="importedData" class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div class="flex items-start gap-2">
                        <svg
                            class="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <div class="flex-1">
                            <p class="text-sm font-semibold text-green-800 dark:text-green-200">
                                Archivo listo para importar
                            </p>
                            <p class="text-xs text-green-600 dark:text-green-400 mt-1">
                                {{ importedData.nodes?.length || 0 }} nodos y
                                {{ importedData.connections?.length || 0 }} conexiones
                            </p>
                        </div>
                    </div>
                </div>

                <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p class="text-xs text-yellow-800 dark:text-yellow-200">
                        <strong>⚠️ Advertencia:</strong>
                        Importar un flujo reemplazará el flujo actual. Asegúrate de guardar tu trabajo antes de
                        continuar.
                    </p>
                </div>
            </div>
        </template>

        <template #modalFooter>
            <div class="flex justify-end gap-2">
                <button
                    @click="handleClose"
                    class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors">
                    Cancelar
                </button>
                <button
                    @click="handleImport"
                    :disabled="!importedData"
                    class="px-4 py-2 text-sm font-medium text-white bg-brand hover:bg-brand-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Importar Flujo
                </button>
            </div>
        </template>
    </Modal>
</template>
