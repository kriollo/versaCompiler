<template>
    <Modal id-modal="compartirModal" :show-modal="true" size="max-w-lg" :show-footer="true" @accion="handleAction">
        <template #modalTitle>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <i class="bi bi-share mr-2"></i>
                Compartir Documento
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
                    <h6 class="text-gray-900 dark:text-gray-100 font-medium">{{ documento.nombre }}</h6>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        Genera un enlace temporal para compartir este documento
                    </p>
                </div>

                <form @submit.prevent="compartir" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Tiempo de expiración
                        </label>
                        <select
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand dark:focus:border-brand"
                            v-model="form.horas_expiracion">
                            <option value="1">1 hora</option>
                            <option value="6">6 horas</option>
                            <option value="24">24 horas (1 día)</option>
                            <option value="72">72 horas (3 días)</option>
                            <option value="168">168 horas (1 semana)</option>
                        </select>
                    </div>

                    <div
                        class="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg p-4">
                        <div class="flex items-start">
                            <i class="bi bi-info-circle text-brand dark:text-brand-400 mt-0.5 mr-3"></i>
                            <p class="text-sm text-brand-800 dark:text-brand-200">
                                El enlace permitirá descargar el documento sin necesidad de iniciar sesión. Después del
                                tiempo seleccionado, el enlace dejará de funcionar.
                            </p>
                        </div>
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
                @click="compartir">
                <i class="bi bi-link-45deg"></i>
                Generar Enlace
            </button>
        </template>
    </Modal>
</template>

<script setup lang="ts">
    import { ref } from 'vue';

    import Modal from '@/dashboard/js/components/modal.vue';

    interface Documento {
        id: number;
        nombre: string;
    }

    defineProps<{
        documento: Documento;
    }>();

    const emit = defineEmits<{
        compartir: [datos: { horas_expiracion: number }];
        cerrar: [];
    }>();

    const form = ref({
        horas_expiracion: 24,
    });

    const compartir = () => {
        emit('compartir', form.value);
    };

    const handleAction = (action: any) => {
        // Manejar acciones del modal si es necesario
        console.log('Action:', action);
    };
</script>
