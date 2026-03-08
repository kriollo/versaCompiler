<script setup lang="ts">
    import { computed, ref, toRefs } from 'vue';

    import { useFileTypes } from '@/dashboard/js/composables/useFileTypes';
    import MoverDocumentoModal from '@/dashboard/js/documentos/components/MoverDocumentoModal.vue';

    const { obtenerIconoArchivo } = useFileTypes();

    interface Documento {
        id: number;
        nombre: string;
        mime: string;
        tamano: string;
        extension: string;
        visto_por_cliente: boolean;
        created_at: string;
    }

    interface Props {
        documentos: Documento[];
        cargando: boolean;
        paginaActual?: number;
        totalDocumentos?: number;
        documentosPorPagina?: number;
        vistaActual?: 'tarjeta' | 'lista';
    }

    const props = withDefaults(defineProps<Props>(), {
        documentos: () => [],
        cargando: false,
        paginaActual: 1,
        totalDocumentos: 0,
        documentosPorPagina: 20,
        vistaActual: 'tarjeta',
    });

    const { documentos, cargando, paginaActual, totalDocumentos, documentosPorPagina, vistaActual } = toRefs(props);

    const emit = defineEmits<{
        descargar: [documentoId: number];
        eliminar: [documentoId: number];
        previsualizar: [documento: Documento];
        compartir: [documento: Documento];
        cambiarPagina: [pagina: number];
        mover: [payload: { documento: Documento; clienteId: number; carpetaId: number }];
    }>();

    const totalPaginas = computed(() => Math.ceil((totalDocumentos?.value || 0) / (documentosPorPagina?.value || 1)));
    const puedeRetroceder = computed(() => (paginaActual?.value || 1) > 1);
    const puedeAvanzar = computed(() => (paginaActual?.value || 1) < totalPaginas.value);
    const irPagina = (pagina: number) => {
        if (pagina >= 1 && pagina <= totalPaginas.value) {
            emit('cambiarPagina', pagina);
        }
    };

    // Estado para el dropdown
    const dropdownAberto = ref<number | null>(null);

    const toggleDropdown = (documentoId: number) => {
        dropdownAberto.value = dropdownAberto.value === documentoId ? null : documentoId;
    };

    const cerrarDropdown = () => {
        dropdownAberto.value = null;
    };

    const puedePrevisualizar = (mime: string) => mime.includes('pdf') || mime.includes('image/');

    const truncarTexto = (texto: string, longitud: number) =>
        texto.length > longitud ? `${texto.slice(0, longitud)}...` : texto;

    const formatearFecha = (fecha: string) =>
        new Date(fecha).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    // Estado para el modal de mover
    const mostrarModalMover = ref(false);
    const documentoAMover = ref<Documento | null>(null);
    // Simulación de datos, en producción deben venir del padre o API
    const clientes = ref<{ id: number; nombre: string }[]>([]);
    const carpetas = ref<{ id: number; nombre: string }[]>([]);

    function abrirModalMover(documento: Documento) {
        documentoAMover.value = documento;
        mostrarModalMover.value = true;
    }
    function cerrarModalMover() {
        mostrarModalMover.value = false;
        documentoAMover.value = null;
    }
    function moverDocumento(payload: { documento: Documento; clienteId: number; carpetaId: number }) {
        // Emitir evento al padre o manejar aquí
        emit('mover', payload);
        cerrarModalMover();
    }
</script>

<template>
    <div>
        <!-- Controles de paginación -->
        <div v-if="totalPaginas > 1" class="flex justify-between items-center mb-4">
            <button
                class="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 mr-2 disabled:opacity-50"
                :disabled="!puedeRetroceder"
                @click="irPagina((paginaActual || 1) - 1)">
                <i class="bi bi-chevron-left"></i>
                Anterior
            </button>
            <span class="text-sm text-gray-600 dark:text-gray-300">
                Página {{ paginaActual }} de {{ totalPaginas }}
            </span>
            <button
                class="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 ml-2 disabled:opacity-50"
                :disabled="!puedeAvanzar"
                @click="irPagina((paginaActual || 1) + 1)">
                Siguiente
                <i class="bi bi-chevron-right"></i>
            </button>
        </div>

        <div v-if="cargando" class="text-center py-4">
            <div
                class="inline-block w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"
                role="status">
                <span class="sr-only">Cargando...</span>
            </div>
            <p class="mt-2 text-gray-500 dark:text-gray-400">Cargando documentos...</p>
        </div>

        <div v-else-if="!documentos.length" class="text-center py-4 text-gray-500 dark:text-gray-400">
            <i class="bi bi-file-earmark-x text-6xl"></i>
            <p class="mt-2">No hay documentos en esta carpeta</p>
        </div>

        <!-- Vista tipo tarjetas -->
        <div v-else-if="vistaActual === 'tarjeta'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
                v-for="documento in documentos"
                :key="documento.id"
                class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div class="p-4">
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex-shrink-0 mr-3">
                            <i :class="obtenerIconoArchivo(documento.extension)" class="text-3xl"></i>
                        </div>
                        <div class="relative">
                            <button
                                class="bg-transparent border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded text-sm dropdown-toggle"
                                type="button"
                                @click="toggleDropdown(documento.id)">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <div
                                v-if="dropdownAberto === documento.id"
                                class="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
                                <a
                                    class="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                    @click.prevent="
                                        () => {
                                            $emit('descargar', documento.id);
                                            cerrarDropdown();
                                        }
                                    ">
                                    <i class="bi bi-download mr-2"></i>
                                    Descargar
                                </a>
                                <a
                                    v-if="puedePrevisualizar(documento.mime)"
                                    class="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                    @click.prevent="
                                        () => {
                                            $emit('previsualizar', documento);
                                            cerrarDropdown();
                                        }
                                    ">
                                    <i class="bi bi-eye mr-2"></i>
                                    Previsualizar
                                </a>
                                <a
                                    class="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                    @click.prevent="
                                        () => {
                                            $emit('compartir', documento);
                                            cerrarDropdown();
                                        }
                                    ">
                                    <i class="bi bi-share mr-2"></i>
                                    Compartir
                                </a>
                                <a
                                    class="flex items-center px-3 py-2 text-sm text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 cursor-pointer font-medium"
                                    @click.prevent="
                                        abrirModalMover(documento);
                                        cerrarDropdown();
                                    ">
                                    <i class="bi bi-arrows-move mr-2"></i>
                                    Mover
                                </a>
                                <hr class="border-gray-200 dark:border-gray-600 my-1" />
                                <a
                                    class="flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                    @click.prevent="
                                        () => {
                                            $emit('eliminar', documento.id);
                                            cerrarDropdown();
                                        }
                                    ">
                                    <i class="bi bi-trash mr-2"></i>
                                    Eliminar
                                </a>
                            </div>
                        </div>
                    </div>

                    <h6 class="text-gray-900 dark:text-gray-100 font-medium mb-1 text-sm" :title="documento.nombre">
                        {{ truncarTexto(documento.nombre, 25) }}
                    </h6>

                    <div class="text-sm">
                        <small class="text-gray-500 dark:text-gray-400 block">
                            {{ documento.tamano }}
                        </small>
                        <small class="text-gray-500 dark:text-gray-400 block">
                            {{ formatearFecha(documento.created_at) }}
                        </small>
                        <div class="mt-2">
                            <span
                                v-if="documento.visto_por_cliente"
                                class="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded-full">
                                <i class="bi bi-eye mr-1"></i>
                                Visto
                            </span>
                            <span
                                v-else
                                class="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 rounded-full">
                                <i class="bi bi-eye-slash mr-1"></i>
                                Sin ver
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Vista tipo lista -->
        <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">
                            Acciones
                        </th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Nombre</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Tamaño</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Fecha</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Estado</th>
                    </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    <tr v-for="documento in documentos" :key="documento.id">
                        <td class="px-4 py-2 whitespace-nowrap">
                            <div class="flex gap-2">
                                <button
                                    class="text-brand dark:text-brand-400 hover:underline text-sm"
                                    @click="$emit('descargar', documento.id)">
                                    <i class="bi bi-download"></i>
                                </button>
                                <button
                                    v-if="puedePrevisualizar(documento.mime)"
                                    class="text-green-600 dark:text-green-400 hover:underline text-sm"
                                    @click="$emit('previsualizar', documento)">
                                    <i class="bi bi-eye"></i>
                                </button>
                                <button
                                    class="text-gray-600 dark:text-gray-400 hover:underline text-sm"
                                    @click="$emit('compartir', documento)">
                                    <i class="bi bi-share"></i>
                                </button>
                                <button
                                    class="text-yellow-700 dark:text-yellow-300 hover:underline text-sm font-medium"
                                    @click="abrirModalMover(documento)"
                                    :title="'Mover ' + documento.nombre">
                                    <i class="bi bi-arrows-move"></i>
                                </button>
                                <button
                                    class="text-red-600 dark:text-red-400 hover:underline text-sm"
                                    @click="$emit('eliminar', documento.id)">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                        <td class="px-4 py-2 whitespace-nowrap">
                            <i :class="obtenerIconoArchivo(documento.extension)" class="mr-2"></i>
                            <span :title="documento.nombre">{{ truncarTexto(documento.nombre, 40) }}</span>
                        </td>
                        <td class="px-4 py-2 whitespace-nowrap">{{ documento.tamano }}</td>
                        <td class="px-4 py-2 whitespace-nowrap">{{ formatearFecha(documento.created_at) }}</td>
                        <td class="px-4 py-2 whitespace-nowrap">
                            <span
                                v-if="documento.visto_por_cliente"
                                class="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded-full">
                                <i class="bi bi-eye mr-1"></i>
                                Visto
                            </span>
                            <span
                                v-else
                                class="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 rounded-full">
                                <i class="bi bi-eye-slash mr-1"></i>
                                Sin ver
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <MoverDocumentoModal
            :visible="mostrarModalMover"
            :clientes="clientes"
            :carpetas="carpetas"
            :documento="documentoAMover"
            @cerrar="cerrarModalMover"
            @mover="moverDocumento" />
    </div>
</template>
