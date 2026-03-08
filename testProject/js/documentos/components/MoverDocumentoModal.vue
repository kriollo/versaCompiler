<template>
    <Modal
        id-modal="moverDocumentoModal"
        :show-modal="visible"
        size="max-w-lg"
        :show-footer="true"
        @accion="handleAction">
        <template #modalTitle>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <i class="bi bi-arrows-move mr-2"></i>
                Mover Documento
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
            <div class="space-y-4">
                <div>
                    <h6 class="text-gray-900 dark:text-gray-100 font-medium">
                        {{ documento?.nombre || documento?.nombre_original }}
                    </h6>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        Selecciona el cliente y la carpeta destino para mover el documento.
                    </p>
                </div>
                <form @submit.prevent="confirmarMovimiento" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Cliente destino
                        </label>
                        <select
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand dark:focus:border-brand"
                            v-model="clienteSeleccionado">
                            <option v-for="cliente in clientes" :key="cliente.id" :value="cliente.id">
                                {{ cliente.nombre }}
                            </option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Carpeta destino
                        </label>
                        <select
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand dark:focus:border-brand"
                            v-model="carpetaSeleccionada">
                            <option v-for="carpeta in carpetas" :key="carpeta.id" :value="carpeta.id">
                                {{ carpeta.nombre }}
                            </option>
                        </select>
                    </div>
                </form>
            </div>
        </template>

        <template #modalFooter>
            <button
                type="button"
                class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                @click="$emit('cerrar')">
                Cancelar
            </button>
            <button
                type="button"
                class="bg-brand hover:bg-brand text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                @click="confirmarMovimiento">
                <i class="bi bi-arrows-move"></i>
                Mover
            </button>
        </template>
    </Modal>
</template>

<script setup lang="ts">
    import { ref, watch } from 'vue';

    import Modal from '@/dashboard/js/components/modal.vue';

    interface Cliente {
        id: number;
        nombre: string;
    }
    interface Carpeta {
        id: number;
        nombre: string;
    }

    const props = defineProps<{
        visible: boolean;
        clientes: Cliente[];
        carpetas: Carpeta[];
        documento: any | null;
    }>();

    const emit = defineEmits<{
        cerrar: [];
        mover: [payload: { documento: any; clienteId: number; carpetaId: number }];
    }>();

    const clienteSeleccionado = ref<number | null>(null);
    const carpetaSeleccionada = ref<number | null>(null);

    watch(
        () => props.visible,
        nuevo => {
            if (nuevo) {
                const clientes: Cliente[] = Array.isArray(props.clientes) ? props.clientes : [];
                const carpetas: Carpeta[] = Array.isArray(props.carpetas) ? props.carpetas : [];
                clienteSeleccionado.value = clientes.length > 0 ? (clientes[0]?.id ?? null) : null;
                carpetaSeleccionada.value = carpetas.length > 0 ? (carpetas[0]?.id ?? null) : null;
            }
        },
    );

    function confirmarMovimiento() {
        if (clienteSeleccionado.value && carpetaSeleccionada.value && props.documento) {
            emit('mover', {
                documento: props.documento,
                clienteId: clienteSeleccionado.value,
                carpetaId: carpetaSeleccionada.value,
            });
        }
    }

    function handleAction(action: any) {
        // Manejar acciones del modal si es necesario
        // Console.log('Action:', action);
    }
</script>

<style scoped>
    /* El modal usa TailwindCSS para estilos y modo oscuro */
</style>
