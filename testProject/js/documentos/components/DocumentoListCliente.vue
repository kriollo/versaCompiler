<template>
    <div class="min-h-[200px]">
        <div v-if="cargando" class="text-center py-4">
            <div class="flex justify-center items-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 dark:border-brand-400"></div>
                <span class="ml-2 text-gray-600 dark:text-gray-300">Cargando...</span>
            </div>
        </div>

        <div v-else-if="documentos.length === 0" class="text-center py-12">
            <i class="bi bi-file-earmark text-gray-400 dark:text-gray-500 text-6xl mb-3"></i>
            <p class="text-gray-600 dark:text-gray-300 mb-0">No hay documentos disponibles</p>
        </div>

        <div v-else>
            <!-- Vista de tabla para pantallas grandes -->
            <div class="overflow-x-auto hidden md:block">
                <table
                    class="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <thead class="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th
                                class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Documento
                            </th>
                            <th
                                class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-32">
                                Tamaño
                            </th>
                            <th
                                class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-36">
                                Fecha
                            </th>
                            <th
                                class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-24">
                                Estado
                            </th>
                            <th
                                class="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-32">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                        <tr
                            v-for="documento in documentos"
                            :key="documento.id"
                            class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                            <td class="px-4 py-3">
                                <div class="flex items-center">
                                    <div class="w-8 mr-3">
                                        <i :class="obtenerIconoArchivo(documento.tipo_archivo)" class="text-2xl"></i>
                                    </div>
                                    <div>
                                        <div class="font-medium text-gray-900 dark:text-gray-100">
                                            {{ documento.nombre_original }}
                                        </div>
                                        <div class="text-sm text-gray-500 dark:text-gray-400">
                                            {{ documento.descripcion || 'Sin descripción' }}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-4 py-3">
                                <span
                                    class="inline-flex px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full">
                                    {{ formatearTamano(documento.tamano) }}
                                </span>
                            </td>
                            <td class="px-4 py-3">
                                <div>
                                    <div class="text-sm text-gray-900 dark:text-gray-100">
                                        {{ formatearFecha(documento.fecha_subida) }}
                                    </div>
                                    <div class="text-sm text-gray-500 dark:text-gray-400">
                                        {{ formatearHora(documento.fecha_subida) }}
                                    </div>
                                </div>
                            </td>
                            <td class="px-4 py-3">
                                <div class="flex items-center">
                                    <span
                                        class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                                        :class="
                                            documento.visto_por_cliente
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                        ">
                                        <i
                                            :class="
                                                documento.visto_por_cliente ? 'bi bi-eye-fill' : 'bi bi-eye-slash-fill'
                                            "
                                            class="mr-1"></i>
                                        {{ documento.visto_por_cliente ? 'Visto' : 'Nuevo' }}
                                    </span>
                                </div>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <div class="flex justify-center space-x-2">
                                    <button
                                        type="button"
                                        class="inline-flex items-center px-3 py-1.5 border border-brand/30 dark:border-brand-600 text-brand dark:text-brand-400 bg-white dark:bg-gray-800 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-md text-sm transition-colors duration-150"
                                        @click="$emit('previsualizar', documento)"
                                        :title="'Ver ' + documento.nombre_original">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    <button
                                        type="button"
                                        class="inline-flex items-center px-3 py-1.5 border border-green-300 dark:border-green-600 text-green-600 dark:text-green-400 bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md text-sm transition-colors duration-150"
                                        @click="$emit('descargar', documento.id)"
                                        :title="'Descargar ' + documento.nombre_original">
                                        <i class="bi bi-download"></i>
                                    </button>
                                    <button
                                        type="button"
                                        class="inline-flex items-center px-3 py-1.5 border border-brand/30 dark:border-brand-600 text-brand dark:text-brand-400 bg-white dark:bg-gray-800 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-md text-sm transition-colors duration-150"
                                        @click="$emit('compartir', documento)"
                                        :title="'Compartir ' + documento.nombre_original">
                                        <i class="bi bi-share"></i>
                                    </button>
                                    <button
                                        type="button"
                                        class="inline-flex items-center px-3 py-1.5 border border-yellow-300 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300 bg-white dark:bg-gray-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 rounded-md text-sm transition-colors duration-150"
                                        @click="abrirModalMover(documento)"
                                        :title="'Mover ' + documento.nombre_original"
                                        style="font-weight: 500">
                                        <i class="bi bi-arrows-move"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Vista de tarjetas para móviles -->
            <div class="block md:hidden">
                <div
                    v-for="documento in documentos"
                    :key="documento.id"
                    class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg mb-4 shadow-sm">
                    <div class="p-4">
                        <div class="flex items-center">
                            <div class="w-12 mr-4">
                                <i
                                    :class="obtenerIconoArchivo(documento.tipo_archivo)"
                                    class="text-3xl text-brand dark:text-brand-400"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h6 class="font-medium text-gray-900 dark:text-gray-100 mb-1 truncate">
                                    {{ documento.nombre_original }}
                                </h6>
                                <p class="text-sm text-gray-500 dark:text-gray-400 mb-1 truncate">
                                    {{ documento.descripcion || 'Sin descripción' }}
                                </p>
                                <div class="flex flex-wrap gap-2 mb-2">
                                    <span
                                        class="inline-flex px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full">
                                        {{ formatearTamano(documento.tamano) }}
                                    </span>
                                    <span
                                        class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                                        :class="
                                            documento.visto_por_cliente
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                        ">
                                        {{ documento.visto_por_cliente ? 'Visto' : 'Nuevo' }}
                                    </span>
                                </div>
                                <div class="text-sm text-gray-500 dark:text-gray-400">
                                    {{ formatearFecha(documento.fecha_subida) }}
                                    {{ formatearHora(documento.fecha_subida) }}
                                </div>
                            </div>
                            <div class="relative ml-3" :id="`dropdown-${documento.id}`">
                                <button
                                    @click="toggleDropdown(documento.id)"
                                    class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md text-sm transition-colors duration-150"
                                    type="button">
                                    <i class="bi bi-three-dots-vertical"></i>
                                </button>
                                <div
                                    v-show="dropdownOpen === documento.id"
                                    class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
                                    <div class="py-1">
                                        <button
                                            @click="
                                                $emit('previsualizar', documento);
                                                dropdownOpen = null;
                                            "
                                            class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                                            <i class="bi bi-eye mr-2"></i>
                                            Ver
                                        </button>
                                        <button
                                            @click="
                                                $emit('descargar', documento.id);
                                                dropdownOpen = null;
                                            "
                                            class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                                            <i class="bi bi-download mr-2"></i>
                                            Descargar
                                        </button>
                                        <button
                                            @click="
                                                $emit('compartir', documento);
                                                dropdownOpen = null;
                                            "
                                            class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                                            <i class="bi bi-share mr-2"></i>
                                            Compartir
                                        </button>
                                        <button
                                            @click="
                                                abrirModalMover(documento);
                                                dropdownOpen = null;
                                            "
                                            class="w-full text-left px-4 py-2 text-sm text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 flex items-center"
                                            style="font-weight: 500">
                                            <i class="bi bi-arrows-move mr-2"></i>
                                            Mover
                                        </button>
                                        <hr class="border-gray-200 dark:border-gray-600 my-1" />
                                        <button
                                            v-if="!documento.visto_por_cliente"
                                            @click="
                                                $emit('marcarVisto', documento.id);
                                                dropdownOpen = null;
                                            "
                                            class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                                            <i class="bi bi-check2 mr-2"></i>
                                            Marcar como visto
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <MoverDocumentoModal
        :visible="mostrarModalMover"
        :clientes="clientes"
        :carpetas="carpetas"
        :documento="documentoAMover"
        @cerrar="cerrarModalMover"
        @mover="moverDocumento" />
</template>

<script setup lang="ts">
    import { onMounted, onUnmounted, ref } from 'vue';

    import { useFileTypes } from '@/dashboard/js/composables/useFileTypes';
    import MoverDocumentoModal from '@/dashboard/js/documentos/components/MoverDocumentoModal.vue';

    // Props
    interface Props {
        documentos: any[];
        cargando?: boolean;
    }

    const props = withDefaults(defineProps<Props>(), {
        cargando: false,
    });

    // Eventos
    const emit = defineEmits<{
        descargar: [id: number];
        previsualizar: [documento: any];
        compartir: [documento: any];
        marcarVisto: [id: number];
        mover: [payload: { documento: any; clienteId: number; carpetaId: number }];
    }>();

    // Estado del dropdown
    const dropdownOpen = ref<number | null>(null);
    const mostrarModalMover = ref(false);
    const documentoAMover = ref<any | null>(null);

    // Estas listas deben ser proporcionadas por el padre, aquí se simulan como ejemplo:
    const clientes = ref<{ id: number; nombre: string }[]>([]);
    const carpetas = ref<{ id: number; nombre: string }[]>([]);

    // Función para manejar dropdown
    const toggleDropdown = (id: number): void => {
        dropdownOpen.value = dropdownOpen.value === id ? null : id;
    };

    // Cerrar dropdown al hacer clic fuera
    const handleClickOutside = (event: Event): void => {
        const target = event.target as HTMLElement;
        if (!target.closest('[id^="dropdown-"]')) {
            dropdownOpen.value = null;
        }
    };

    // Lifecycle hooks
    onMounted(() => {
        document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
        document.removeEventListener('click', handleClickOutside);
    });

    // Composables
    const { obtenerIconoArchivo, formatearTamano } = useFileTypes();

    function formatearFecha(fecha: string) {
        if (!fecha) {
            return '';
        }
        try {
            const d = new Date(fecha);
            return d.toLocaleDateString('es-ES');
        } catch {
            return fecha;
        }
    }
    function formatearHora(fecha: string) {
        if (!fecha) {
            return '';
        }
        try {
            const d = new Date(fecha);
            return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    }

    function abrirModalMover(documento: any) {
        documentoAMover.value = documento;
        mostrarModalMover.value = true;
        // Aquí podrías cargar clientes y carpetas dinámicamente si es necesario
    }
    function cerrarModalMover() {
        mostrarModalMover.value = false;
        documentoAMover.value = null;
    }
    function moverDocumento(payload: { documento: any; clienteId: number; carpetaId: number }) {
        // Emitir evento al padre para que realice la acción
        emit('mover', payload);
        cerrarModalMover();
    }
</script>

<style scoped>
    /* Estilos específicos si es necesario - la mayoría se manejan con TailwindCSS */
</style>
