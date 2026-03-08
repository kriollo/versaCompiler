<template>
    <div class="min-h-[600px]">
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
            <div>
                <h4 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Mis Documentos</h4>
                <p class="text-gray-600 dark:text-gray-400">Accede y descarga tus documentos</p>
            </div>
            <div v-if="estadisticas" class="flex gap-4">
                <div class="text-center">
                    <div class="bg-brand dark:bg-brand text-white p-4 rounded-lg shadow-sm">
                        <h6 class="text-lg font-semibold mb-1">{{ estadisticas.total_documentos }}</h6>
                        <small class="text-brand-100 dark:text-brand-50">Documentos</small>
                    </div>
                </div>
                <div class="text-center">
                    <div class="bg-green-600 dark:bg-green-500 text-white p-4 rounded-lg shadow-sm">
                        <h6 class="text-lg font-semibold mb-1">{{ estadisticas.tamano_total_formateado }}</h6>
                        <small class="text-green-100 dark:text-green-50">Espacio usado</small>
                    </div>
                </div>
            </div>
        </div>

        <!-- Buscador -->
        <div class="mb-6">
            <div class="max-w-md">
                <div class="flex">
                    <input
                        type="text"
                        class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent outline-none"
                        placeholder="Buscar documentos..."
                        v-model="terminoBusqueda"
                        @input="buscarDocumentos" />
                    <button
                        class="px-4 py-2 border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-r-lg transition-colors duration-150"
                        type="button">
                        <i class="bi bi-search"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Tabs -->
        <div class="mb-6">
            <nav class="flex space-x-8 border-b border-gray-200 dark:border-gray-700">
                <button
                    class="pb-4 px-1 border-b-2 font-medium text-sm transition-colors duration-150"
                    :class="
                        tabActivo === 'carpetas'
                            ? 'border-brand text-brand dark:text-brand-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                    "
                    @click="tabActivo = 'carpetas'">
                    <i class="bi bi-folder-fill mr-2"></i>
                    Explorar Carpetas
                </button>
                <button
                    class="pb-4 px-1 border-b-2 font-medium text-sm transition-colors duration-150"
                    :class="
                        tabActivo === 'recientes'
                            ? 'border-brand text-brand dark:text-brand-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                    "
                    @click="
                        tabActivo = 'recientes';
                        cargarDocumentosRecientes();
                    ">
                    <i class="bi bi-clock-history mr-2"></i>
                    Documentos Recientes
                </button>
                <button
                    class="pb-4 px-1 border-b-2 font-medium text-sm transition-colors duration-150"
                    :class="
                        tabActivo === 'compartidos'
                            ? 'border-brand text-brand dark:text-brand-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                    "
                    @click="
                        tabActivo = 'compartidos';
                        cargarEnlacesCompartidos();
                    ">
                    <i class="bi bi-share mr-2"></i>
                    Enlaces Compartidos
                </button>
            </nav>
        </div>

        <!-- Contenido de tabs -->
        <div class="tab-content">
            <!-- Tab Explorar Carpetas -->
            <div v-if="tabActivo === 'carpetas'">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div class="lg:col-span-4">
                        <div
                            class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                            <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <h6 class="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                                    <i class="bi bi-folder-fill mr-2 text-brand dark:text-brand-400"></i>
                                    Carpetas
                                </h6>
                            </div>
                            <div class="p-0">
                                <FileExplorer
                                    :carpetas="carpetas"
                                    :carpeta-seleccionada="carpetaSeleccionada"
                                    @seleccionar-carpeta="seleccionarCarpeta"
                                    :solo-lectura="true" />
                            </div>
                        </div>
                    </div>

                    <div class="lg:col-span-8">
                        <div
                            class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                            <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <h6 class="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                                    <i class="bi bi-file-earmark mr-2 text-gray-600 dark:text-gray-400"></i>
                                    Documentos
                                    <span v-if="carpetaSeleccionada" class="text-gray-500 dark:text-gray-400 ml-2">
                                        - {{ obtenerNombreCarpeta(carpetaSeleccionada) }}
                                    </span>
                                </h6>
                            </div>
                            <div class="p-6">
                                <DocumentoListCliente
                                    v-if="carpetaSeleccionada"
                                    :documentos="documentos"
                                    :cargando="cargandoDocumentos"
                                    @descargar="descargarDocumento"
                                    @previsualizar="previsualizarDocumento"
                                    @compartir="compartirDocumento"
                                    @marcarVisto="marcarComoVisto" />
                                <div v-else class="text-center py-12">
                                    <i class="bi bi-folder-fill text-gray-400 dark:text-gray-500 text-6xl mb-4"></i>
                                    <p class="text-gray-600 dark:text-gray-300 text-lg">
                                        Selecciona una carpeta para ver los documentos
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab Documentos Recientes -->
            <div v-if="tabActivo === 'recientes'">
                <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h6 class="text-lg font-medium text-gray-900 dark:text-gray-100">Últimos documentos subidos</h6>
                    </div>
                    <div class="p-6">
                        <DocumentoListCliente
                            :documentos="documentosRecientes"
                            :cargando="cargandoRecientes"
                            @descargar="descargarDocumento"
                            @previsualizar="previsualizarDocumento"
                            @compartir="compartirDocumento"
                            @marcarVisto="marcarComoVisto" />
                    </div>
                </div>
            </div>

            <!-- Tab Enlaces Compartidos -->
            <div v-if="tabActivo === 'compartidos'">
                <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h6 class="text-lg font-medium text-gray-900 dark:text-gray-100">Mis enlaces compartidos</h6>
                    </div>
                    <div class="p-6">
                        <SharedLinks
                            :enlaces="enlacesCompartidos"
                            :cargando="cargandoEnlaces"
                            @copiar-enlace="copiarEnlace" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Modales -->
        <DocumentoPreviewModal v-if="documentoPreview" :documento="documentoPreview" @cerrar="cerrarPreview" />

        <CompartirModal
            v-if="documentoParaCompartir"
            :documento="documentoParaCompartir"
            @compartir="procesarCompartir"
            @cerrar="cerrarModalCompartir" />

        <!-- Toast notifications -->
        <Toast
            v-for="notificacion in notificaciones"
            :key="notificacion.id"
            :tipo="notificacion.tipo"
            :mensaje="notificacion.mensaje"
            @cerrar="cerrarNotificacion(notificacion.id)" />
    </div>
</template>

<script setup lang="ts">
    import { inject, onMounted, ref, type Ref } from 'vue';

    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    // Componentes
    import CompartirModal from '@/dashboard/js/documentos/components/CompartirModal.vue';
    import DocumentoListCliente from '@/dashboard/js/documentos/components/DocumentoListCliente.vue';
    import DocumentoPreviewModal from '@/dashboard/js/documentos/components/DocumentoPreviewModal.vue';
    import FileExplorer from '@/dashboard/js/documentos/components/FileExplorer.vue';
    import SharedLinks from '@/dashboard/js/documentos/components/SharedLinks.vue';
    import Toast from '@/dashboard/js/documentos/components/Toast.vue';
    import { versaFetch } from '@/dashboard/js/functions';

    // Inyecciones globales
    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', '');
    const currentUser = inject<any>('current_user');

    // Estado reactivo
    const tabActivo = ref('carpetas');
    const carpetas = ref([]);
    const carpetaSeleccionada = ref<number | null>(null);
    const documentos = ref([]);
    const documentosRecientes = ref([]);
    const enlacesCompartidos = ref([]);
    const estadisticas = ref(null);
    const terminoBusqueda = ref('');

    // Estado de carga
    const cargandoDocumentos = ref(false);
    const cargandoRecientes = ref(false);
    const cargandoEnlaces = ref(false);

    // Modales
    const documentoPreview = ref(null);
    const documentoParaCompartir = ref<any | null>(null);

    // Notificaciones
    interface Notificacion {
        id: number;
        tipo: string;
        mensaje: string;
    }
    const notificaciones = ref<Notificacion[]>([]);

    // Métodos
    const cargarCarpetas = async () => {
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/api/documentos/carpetas/${currentUser.id_empresa}`,
                method: 'GET',
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                carpetas.value = response.data;
            }
        } catch {
            mostrarNotificacion('error', 'Error al cargar carpetas');
        }
    };

    const cargarEstadisticas = async () => {
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/api/documentos/estadisticas`,
                method: 'GET',
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                estadisticas.value = response.data;
            }
        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
        }
    };

    const seleccionarCarpeta = async (carpetaId: number) => {
        carpetaSeleccionada.value = carpetaId;
        await cargarDocumentos();
    };

    const cargarDocumentos = async () => {
        if (!carpetaSeleccionada.value) {
            return;
        }

        cargandoDocumentos.value = true;
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/api/documentos?carpeta_id=${carpetaSeleccionada.value}`,
                method: 'GET',
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                documentos.value = response.data;
            }
        } catch {
            mostrarNotificacion('error', 'Error al cargar documentos');
        } finally {
            cargandoDocumentos.value = false;
        }
    };

    const cargarDocumentosRecientes = async () => {
        cargandoRecientes.value = true;
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/api/documentos/ultimos?limite=20`,
                method: 'GET',
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                documentosRecientes.value = response.data;
            }
        } catch {
            mostrarNotificacion('error', 'Error al cargar documentos recientes');
        } finally {
            cargandoRecientes.value = false;
        }
    };

    const cargarEnlacesCompartidos = async () => {
        cargandoEnlaces.value = true;
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/api/documentos/enlaces-compartidos`,
                method: 'GET',
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                enlacesCompartidos.value = response.data;
            }
        } catch {
            mostrarNotificacion('error', 'Error al cargar enlaces compartidos');
        } finally {
            cargandoEnlaces.value = false;
        }
    };

    const buscarDocumentos = async () => {
        if (terminoBusqueda.value.length < 3) {
            return;
        }

        try {
            const response = await versaFetch({
                url: `/${panelUrl}/api/documentos/buscar?q=${encodeURIComponent(terminoBusqueda.value)}`,
                method: 'GET',
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                documentos.value = response.data;
                tabActivo.value = 'carpetas';
            }
        } catch {
            mostrarNotificacion('error', 'Error en la búsqueda');
        }
    };

    // Función auxiliar para buscar carpeta recursivamente
    const buscarCarpeta = (carpetasArray: any[], id: number): string => {
        for (const carpeta of carpetasArray) {
            if (carpeta.id === id) {
                return carpeta.nombre;
            }
            if (carpeta.hijos && carpeta.hijos.length > 0) {
                const resultado = buscarCarpeta(carpeta.hijos, id);
                if (resultado) {
                    return resultado;
                }
            }
        }
        return '';
    };

    const obtenerNombreCarpeta = (carpetaId: number): string => buscarCarpeta(carpetas.value, carpetaId);

    const descargarDocumento = async (documentoId: number) => {
        // Marcar como visto automáticamente al descargar
        await marcarComoVisto(documentoId);
        window.open(`/${panelUrl}/api/documentos/${documentoId}/descargar`, '_blank');
    };

    const marcarComoVisto = async (documentoId: number) => {
        try {
            await versaFetch({
                url: `/${panelUrl}/api/documentos/${documentoId}/visto`,
                method: 'PATCH',
            });

            // Actualizar el estado local
            const actualizar = (docs: any[]) => {
                const documento = docs.find(documento => documento.id === documentoId);
                if (documento) {
                    documento.visto_por_cliente = true;
                }
            };

            actualizar(documentos.value);
            actualizar(documentosRecientes.value);
        } catch (error) {
            console.error('Error al marcar como visto:', error);
        }
    };

    const previsualizarDocumento = async (documento: any) => {
        await marcarComoVisto(documento.id);
        documentoPreview.value = documento;
    };

    const cerrarPreview = () => {
        documentoPreview.value = null;
    };

    const compartirDocumento = (documento: any) => {
        documentoParaCompartir.value = documento;
    };

    const cerrarModalCompartir = () => {
        documentoParaCompartir.value = null;
    };

    const procesarCompartir = async (datosCompartir: any) => {
        if (!documentoParaCompartir.value) {
            return;
        }

        try {
            const response = await versaFetch({
                url: `/${panelUrl}/api/documentos/${documentoParaCompartir.value.id}/compartir`,
                method: 'POST',
                data: JSON.stringify(datosCompartir),
                headers: { 'Content-Type': 'application/json' },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                mostrarNotificacion('success', 'Enlace de compartir generado');
                cerrarModalCompartir();

                // Actualizar enlaces compartidos si está en esa tab
                if (tabActivo.value === 'compartidos') {
                    await cargarEnlacesCompartidos();
                }
            } else {
                mostrarNotificacion('error', response.message || 'Error al generar enlace');
            }
        } catch {
            mostrarNotificacion('error', 'Error al generar enlace');
        }
    };

    const copiarEnlace = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            mostrarNotificacion('success', 'Enlace copiado al portapapeles');
        } catch {
            mostrarNotificacion('error', 'Error al copiar enlace');
        }
    };

    const mostrarNotificacion = (tipo: string, mensaje: string) => {
        const id = Date.now();
        notificaciones.value.push({ id, tipo, mensaje });

        setTimeout(() => {
            cerrarNotificacion(id);
        }, 5000);
    };

    const cerrarNotificacion = (id: number) => {
        const index = notificaciones.value.findIndex(notificacion => notificacion.id === id);
        if (index !== -1) {
            notificaciones.value.splice(index, 1);
        }
    };

    // Inicialización
    onMounted(() => {
        cargarCarpetas();
        cargarEstadisticas();
    });
</script>

<style scoped>
    /* Estilos específicos si es necesario - la mayoría se manejan con TailwindCSS */
</style>
