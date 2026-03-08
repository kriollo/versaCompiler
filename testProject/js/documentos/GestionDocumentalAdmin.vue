<script setup lang="ts">
    import Swal from 'sweetalert2';
    import { computed, inject, onMounted, ref, type Ref } from 'vue';

    // Componentes
    import { storage } from '@/dashboard/js/composables/storage';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import CarpetaForm from '@/dashboard/js/documentos/components/CarpetaForm.vue';
    import CompartirModal from '@/dashboard/js/documentos/components/CompartirModal.vue';
    import DocumentoList from '@/dashboard/js/documentos/components/DocumentoList.vue';
    import DocumentoPreviewModal from '@/dashboard/js/documentos/components/DocumentoPreviewModal.vue';
    import DocumentoUploader from '@/dashboard/js/documentos/components/DocumentoUploader.vue';
    import FileExplorer from '@/dashboard/js/documentos/components/FileExplorer.vue';
    import Toast from '@/dashboard/js/documentos/components/Toast.vue';
    import { fetchGetEmpresas } from '@/dashboard/js/empresa/fetchEmpresa';
    import { versaFetch } from '@/dashboard/js/functions';

    // Inyecciones globales
    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', '');
    const currentUser = inject<any>('current_user');
    const empresaSelected = inject<any>('empresaSelected', null);

    // Tipos
    type NotificationType = 'success' | 'error' | 'warning' | 'info';

    // Estado reactivo
    const clientes = ref<any[]>([]);
    const clienteSeleccionado = ref<string>('');
    const carpetas = ref<any[]>([]);
    const carpetaSeleccionada = ref<number | null>(null);
    const documentos = ref<any[]>([]);
    const estadisticas = ref<any>(null);
    const terminoBusqueda = ref<string>('');
    const cargandoDocumentos = ref<boolean>(false);
    // Estado de paginación
    const paginaActual = ref<number>(1);
    const DOCS_PER_PAGE_KEY = 'documentos-por-pagina';
    const documentosPorPagina = ref<number>(Number(storage.get(DOCS_PER_PAGE_KEY)) || 20);
    const totalDocumentos = ref<number>(0);
    // Estado de vista de documentos
    export type DocumentoListVista = 'tarjeta' | 'lista';
    const VISTA_KEY = 'documento-list-vista';
    const vistaActual = ref<DocumentoListVista>((storage.get(VISTA_KEY as any) as DocumentoListVista) || 'tarjeta');
    const alternarVista = () => {
        vistaActual.value = vistaActual.value === 'tarjeta' ? 'lista' : 'tarjeta';
        storage.set(VISTA_KEY as any, vistaActual.value);
    };

    // Modales
    const mostrarModalCarpeta = ref<boolean>(false);
    const mostrarModalSubida = ref<boolean>(false);
    const carpetaEditando = ref<any>(null);
    const documentoPreview = ref<any>(null);
    const documentoParaCompartir = ref<any>(null);

    // Notificaciones
    const notificaciones = ref<{ id: number; tipo: NotificationType; mensaje: string }[]>([]);
    let notificacionCounter = 0;

    // Función auxiliar fuera del computed
    const buscarEnCarpetas = (carpetasList: any[], targetId: number): string => {
        for (const carpeta of carpetasList) {
            if (Number(carpeta.id) === Number(targetId)) {
                return carpeta.nombre;
            }
            if (carpeta.subcarpetas && carpeta.subcarpetas.length > 0) {
                const resultado = buscarEnCarpetas(carpeta.subcarpetas, targetId);
                if (resultado) {
                    return resultado;
                }
            }
        }
        return '';
    };

    // Computed properties
    const obtenerNombreCarpeta = computed(
        () =>
            (carpetaId: number): string =>
                buscarEnCarpetas(carpetas.value, carpetaId),
    );

    // Utilidades
    const mostrarNotificacion = (tipo: NotificationType, mensaje: string) => {
        const id = ++notificacionCounter;
        notificaciones.value.push({ id, tipo, mensaje });
        setTimeout(() => cerrarNotificacion(id), 5000);
    };

    // Implementación simplificada de confirmación
    const mostrarModalConfirmacion = async (mensaje: string): Promise<boolean> => {
        const result = await Swal.fire({
            title: 'Confirmación',
            text: mensaje,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Cancelar',
        });
        return result.isConfirmed;
    };

    // Métodos principales
    const cargarClientes = async () => {
        try {
            const response = await fetchGetEmpresas();

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                clientes.value = response.data || [];
            }
        } catch {
            mostrarNotificacion('error', 'Error al cargar clientes');
        }
    };

    const cargarCarpetasCliente = async () => {
        documentos.value = []; // Limpiar documentos al cambiar de empresa
        carpetaSeleccionada.value = null; // Limpiar selección de carpeta
        if (!clienteSeleccionado.value) {
            return;
        }

        try {
            const response = await versaFetch({
                url: `/${panelUrl}/documentos/carpetas/api/${clienteSeleccionado.value}`,
                method: 'GET',
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                carpetas.value = response.data?.carpetas || [];
                estadisticas.value = response.data?.estadisticas || null;
            }
        } catch {
            mostrarNotificacion('error', 'Error al cargar carpetas');
        }
    };

    const seleccionarCarpeta = (carpetaId: number) => {
        carpetaSeleccionada.value = carpetaId;
        cargarDocumentos();
    };

    const cargarDocumentos = async (pagina = 1) => {
        if (!carpetaSeleccionada.value) {
            return;
        }

        cargandoDocumentos.value = true;
        terminoBusqueda.value = '';
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/documentos/archivos/api/${clienteSeleccionado.value}/${carpetaSeleccionada.value}?page=${pagina}&per_page=${documentosPorPagina.value}`,
                method: 'GET',
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                documentos.value = response.data || [];
                totalDocumentos.value = response.total || 0;
                paginaActual.value = response.page || pagina;
            }
        } catch {
            mostrarNotificacion('error', 'Error al cargar documentos');
        } finally {
            cargandoDocumentos.value = false;
        }
    };

    const buscarDocumentos = async (pagina = 1) => {
        if (terminoBusqueda.value.trim().length === 0) {
            return;
        }

        cargandoDocumentos.value = true;

        try {
            const response = await versaFetch({
                url: `/${panelUrl}/documentos/archivos/api/buscar/${clienteSeleccionado.value}/${carpetaSeleccionada.value}`,
                method: 'POST',
                data: JSON.stringify({
                    termino: terminoBusqueda.value,
                    csrf_token: csrf_token.value,
                    page: pagina,
                    per_page: documentosPorPagina.value,
                }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                documentos.value = response.data || [];
                totalDocumentos.value = response.total || 0;
                paginaActual.value = response.page || pagina;
            }
        } catch {
            mostrarNotificacion('error', 'Error en la búsqueda');
        } finally {
            cargandoDocumentos.value = false;
        }
    };

    // Gestión de carpetas
    const abrirModalCarpeta = (carpeta: any = null) => {
        carpetaEditando.value = carpeta;
        mostrarModalCarpeta.value = true;
    };

    const cerrarModalCarpeta = () => {
        mostrarModalCarpeta.value = false;
        carpetaEditando.value = null;
    };

    const guardarCarpeta = async (datosCarpeta: any) => {
        try {
            const url = carpetaEditando.value
                ? `/${panelUrl}/documentos/carpetas/api/${clienteSeleccionado.value}/${carpetaEditando.value.id}`
                : `/${panelUrl}/documentos/carpetas/api/${clienteSeleccionado.value}`;

            const method = carpetaEditando.value ? 'PUT' : 'POST';

            const response = await versaFetch({
                url,
                method,
                data: JSON.stringify({
                    ...datosCarpeta,
                    csrf_token: csrf_token.value,
                }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                mostrarNotificacion('success', carpetaEditando.value ? 'Carpeta actualizada' : 'Carpeta creada');
                await cargarCarpetasCliente();
                cerrarModalCarpeta();
            }
        } catch {
            mostrarNotificacion('error', 'Error al guardar carpeta');
        }
    };

    const editarCarpeta = (carpeta: any) => {
        abrirModalCarpeta(carpeta);
    };

    const eliminarCarpeta = async (carpetaId: number) => {
        const confirmado = await mostrarModalConfirmacion('¿Está seguro de eliminar esta carpeta?');
        if (!confirmado) {
            return;
        }

        try {
            const response = await versaFetch({
                url: `/${panelUrl}/documentos/carpetas/api/${clienteSeleccionado.value}/${carpetaId}`,
                method: 'DELETE',
                data: JSON.stringify({ csrf_token: csrf_token.value }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                mostrarNotificacion('success', 'Carpeta eliminada');
                await cargarCarpetasCliente();
                if (carpetaSeleccionada.value === carpetaId) {
                    carpetaSeleccionada.value = null;
                    documentos.value = [];
                }
            }
        } catch {
            mostrarNotificacion('error', 'Error al eliminar carpeta');
        }
    };

    // Gestión de documentos
    const cerrarModalSubida = () => {
        mostrarModalSubida.value = false;
    };

    const procesarSubida = async (archivos: FileList) => {
        const formData = new FormData();
        formData.append('csrf_token', csrf_token.value || '');

        for (const archivo of archivos) {
            formData.append('documentos[]', archivo);
        }

        try {
            const response = await versaFetch({
                url: `/${panelUrl}/documentos/archivos/api/subir/${clienteSeleccionado.value}/${carpetaSeleccionada.value}`,
                method: 'POST',
                data: formData,
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                mostrarNotificacion('success', 'Documentos subidos correctamente');
                await cargarDocumentos();
                await cargarCarpetasCliente(); // Actualizar estadísticas
                cerrarModalSubida();
            }
        } catch {
            mostrarNotificacion('error', 'Error al subir documentos');
        }
    };

    const descargarDocumento = async (documentoId: number) => {
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/documentos/archivos/api/descargar/${documentoId}`,
                method: 'GET',
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                // Crear enlace temporal para descarga
                const link = document.createElement('a');
                link.href = response.data.url;
                link.download = response.data.nombre;
                document.body.append(link);
                link.click();
                link.remove();
            }
        } catch {
            mostrarNotificacion('error', 'Error al descargar documento');
        }
    };

    const eliminarDocumento = async (documentoId: number) => {
        const confirmado = await mostrarModalConfirmacion('¿Está seguro de eliminar este documento?');
        if (!confirmado) {
            return;
        }

        try {
            const response = await versaFetch({
                url: `/${panelUrl}/documentos/archivos/api/eliminar/${documentoId}`,
                method: 'DELETE',
                data: JSON.stringify({ csrf_token: csrf_token.value }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                mostrarNotificacion('success', 'Documento eliminado');
                await cargarDocumentos();
                await cargarCarpetasCliente(); // Actualizar estadísticas
            }
        } catch {
            mostrarNotificacion('error', 'Error al eliminar documento');
        }
    };

    const previsualizarDocumento = (documento: any) => {
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
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/documentos/archivos/api/compartir`,
                method: 'POST',
                data: JSON.stringify({
                    ...datosCompartir,
                    csrf_token: csrf_token.value,
                }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                mostrarNotificacion('success', 'Documento compartido');
                cerrarModalCompartir();
            }
        } catch {
            mostrarNotificacion('error', 'Error al compartir documento');
        }
    };

    const cerrarNotificacion = (targetId: number) => {
        const index = notificaciones.value.findIndex(notificacion => notificacion.id === targetId);
        if (index !== -1) {
            notificaciones.value.splice(index, 1);
        }
    };

    // Cambio en la paginación de documentos
    const onChangeDocumentosPorPagina = () => {
        storage.set(DOCS_PER_PAGE_KEY, documentosPorPagina.value);
        paginaActual.value = 1;
        cargarDocumentos(1);
    };

    // Lifecycle
    onMounted(() => {
        cargarClientes();
        if (clienteSeleccionado.value) {
            cargarCarpetasCliente();
        }
    });
</script>

<template>
    <div class="w-full h-full flex flex-col transition-colors duration-300">
        <!-- Header con acciones principales -->
        <div class="border-b border-gray-200 dark:border-gray-700 shadow-sm mb-2">
            <div class="px-8 py-2 flex justify-between items-center">
                <div class="header-info">
                    <h3 class="text-3xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                        <i class="bi bi-folder2-open me-3 text-brand dark:text-brand-400"></i>
                        Gestión Documental
                    </h3>
                    <p class="text-gray-600 dark:text-gray-400 mt-1">
                        Administración avanzada de documentos por cliente
                    </p>
                </div>

                <!-- Selector de cliente mejorado -->
                <div class="lg:col-span-4">
                    <div class="relative">
                        <select
                            class="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand focus:border-brand transition-colors appearance-none"
                            v-model="clienteSeleccionado"
                            @change="cargarCarpetasCliente"
                            id="clienteSelect">
                            <option value="">Seleccione un cliente...</option>
                            <option
                                v-for="cliente in clientes"
                                :key="cliente.token_empresa"
                                :value="cliente.token_empresa">
                                {{ cliente.nombre }}
                            </option>
                        </select>
                        <label
                            for="clienteSelect"
                            class="absolute -top-2 left-3 px-1 bg-white dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400">
                            <i class="bi bi-building me-1"></i>
                            Cliente
                        </label>
                        <i
                            class="bi bi-chevron-down absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                    </div>
                </div>
            </div>
        </div>

        <!-- Panel de control moderno -->
        <div class="px-8 mb-8">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <!-- Estadísticas modernizadas -->
                <div class="lg:col-span-8" v-if="estadisticas && clienteSeleccionado">
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div
                            class="stat-card bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
                            <div class="flex items-center gap-4">
                                <div
                                    class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                                    <i class="bi bi-file-earmark-text text-xl"></i>
                                </div>
                                <div>
                                    <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                        {{ estadisticas.total_documentos || 0 }}
                                    </div>
                                    <div class="text-sm text-gray-600 dark:text-gray-400">Documentos</div>
                                </div>
                            </div>
                        </div>

                        <div
                            class="stat-card bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
                            <div class="flex items-center gap-4">
                                <div
                                    class="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center text-white">
                                    <i class="bi bi-hdd-stack text-xl"></i>
                                </div>
                                <div>
                                    <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                        {{ estadisticas.tamano_total_formateado || '0 MB' }}
                                    </div>
                                    <div class="text-sm text-gray-600 dark:text-gray-400">Espacio usado</div>
                                </div>
                            </div>
                        </div>

                        <div
                            class="stat-card bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
                            <div class="flex items-center gap-4">
                                <div
                                    class="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white">
                                    <i class="bi bi-eye-fill text-xl"></i>
                                </div>
                                <div>
                                    <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                        {{ estadisticas.vistos || 0 }}
                                    </div>
                                    <div class="text-sm text-gray-600 dark:text-gray-400">Vistos</div>
                                </div>
                            </div>
                        </div>

                        <div
                            class="stat-card bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
                            <div class="flex items-center gap-4">
                                <div
                                    class="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center text-white">
                                    <i class="bi bi-exclamation-circle text-xl"></i>
                                </div>
                                <div>
                                    <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                        {{ estadisticas.no_vistos || 0 }}
                                    </div>
                                    <div class="text-sm text-gray-600 dark:text-gray-400">Sin ver</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Contenido principal con diseño mejorado -->
        <div class="px-2" v-if="clienteSeleccionado">
            <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
                <!-- Panel de explorador de archivos -->
                <div class="md:col-span-4">
                    <div
                        class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 h-[70vh] flex flex-col overflow-hidden">
                        <div
                            class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-xl flex justify-between items-center">
                            <div class="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                                <i class="bi bi-folder-fill me-2 text-yellow-600 dark:text-yellow-400"></i>
                                Explorador de Carpetas
                            </div>
                            <button
                                class="p-2 text-brand dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
                                @click="mostrarModalCarpeta = true"
                                title="Nueva carpeta">
                                <i class="bi bi-plus-lg"></i>
                            </button>
                        </div>
                        <div class="flex-1 overflow-auto p-4">
                            <FileExplorer
                                :carpetas="carpetas"
                                :carpeta-seleccionada="carpetaSeleccionada"
                                @seleccionar-carpeta="seleccionarCarpeta"
                                @crear-carpeta="abrirModalCarpeta"
                                @editar-carpeta="editarCarpeta"
                                @eliminar-carpeta="eliminarCarpeta" />
                        </div>
                    </div>
                </div>

                <!-- Panel de documentos -->
                <div class="md:col-span-8">
                    <div
                        class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 h-[70vh] flex flex-col overflow-hidden">
                        <div
                            class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-xl flex justify-between items-center">
                            <div class="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                                <i class="bi bi-file-earmark me-2 text-green-600 dark:text-green-400"></i>
                                Documentos
                                <span v-if="carpetaSeleccionada" class="text-gray-600 dark:text-gray-400 font-normal">
                                    / {{ obtenerNombreCarpeta(carpetaSeleccionada) }}
                                </span>
                            </div>
                            <div class="flex gap-2 items-center">
                                <div class="relative min-w-[200px]">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <i class="bi bi-search text-gray-400"></i>
                                    </div>
                                    <input
                                        type="text"
                                        class="w-full pl-10 pr-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-brand focus:border-brand"
                                        placeholder="Buscar documentos..."
                                        v-model="terminoBusqueda"
                                        @input="buscarDocumentos(1)" />
                                </div>
                                <button
                                    class="p-2 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-lg transition-colors"
                                    @click="mostrarModalSubida = true"
                                    v-if="carpetaSeleccionada"
                                    title="Subir documentos">
                                    <i class="bi bi-cloud-upload"></i>
                                </button>
                            </div>
                        </div>
                        <div class="flex-1 overflow-auto p-4">
                            <div
                                class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4"
                                v-if="carpetaSeleccionada">
                                <div class="flex items-center gap-2">
                                    <label
                                        for="select-docs-por-pagina"
                                        class="text-sm text-gray-700 dark:text-gray-300">
                                        Mostrar
                                    </label>
                                    <select
                                        id="select-docs-por-pagina"
                                        v-model.number="documentosPorPagina"
                                        @change="onChangeDocumentosPorPagina"
                                        class="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-brand focus:border-brand">
                                        <option :value="1">1</option>
                                        <option :value="5">5</option>
                                        <option :value="10">10</option>
                                        <option :value="20">20</option>
                                        <option :value="50">50</option>
                                        <option :value="100">100</option>
                                    </select>
                                    <span class="text-sm text-gray-700 dark:text-gray-300">por página</span>
                                </div>
                                <button
                                    @click="alternarVista"
                                    class="inline-flex items-center px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded shadow hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                                    <i
                                        :class="
                                            vistaActual === 'tarjeta'
                                                ? 'bi bi-list-ul mr-2'
                                                : 'bi bi-grid-3x3-gap-fill mr-2'
                                        "></i>
                                    {{ vistaActual === 'tarjeta' ? 'Vista de lista' : 'Vista de tarjetas' }}
                                </button>
                            </div>
                            <DocumentoList
                                v-if="carpetaSeleccionada"
                                :documentos="documentos"
                                :cargando="cargandoDocumentos"
                                :pagina-actual="paginaActual"
                                :total-documentos="totalDocumentos"
                                :documentos-por-pagina="documentosPorPagina"
                                :vista-actual="vistaActual"
                                @cambiar-pagina="cargarDocumentos"
                                @descargar="descargarDocumento"
                                @eliminar="eliminarDocumento"
                                @previsualizar="previsualizarDocumento"
                                @compartir="compartirDocumento" />
                            <div
                                v-else
                                class="h-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
                                <div class="text-6xl mb-4 opacity-50">
                                    <i class="bi bi-folder-symlink"></i>
                                </div>
                                <h5 class="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">
                                    Selecciona una carpeta
                                </h5>
                                <p>Elige una carpeta del explorador para ver y gestionar los documentos</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Estado inicial mejorado -->
        <div v-else class="py-16 px-8 text-center">
            <div class="max-w-2xl mx-auto">
                <div class="text-8xl text-brand dark:text-brand-400 mb-8">
                    <i class="bi bi-building"></i>
                </div>
                <h4 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Bienvenido al Sistema de Gestión Documental
                </h4>
                <p class="text-gray-600 dark:text-gray-400 mb-12">
                    Selecciona un cliente para comenzar a gestionar sus documentos de forma profesional
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
                    <div
                        class="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <i class="bi bi-check-circle-fill text-green-500 text-xl"></i>
                        <span class="text-gray-700 dark:text-gray-300">Organización por carpetas</span>
                    </div>
                    <div
                        class="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <i class="bi bi-check-circle-fill text-green-500 text-xl"></i>
                        <span class="text-gray-700 dark:text-gray-300">Subida múltiple de archivos</span>
                    </div>
                    <div
                        class="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <i class="bi bi-check-circle-fill text-green-500 text-xl"></i>
                        <span class="text-gray-700 dark:text-gray-300">Sistema de compartición</span>
                    </div>
                    <div
                        class="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <i class="bi bi-check-circle-fill text-green-500 text-xl"></i>
                        <span class="text-gray-700 dark:text-gray-300">Auditoría completa</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modales modernos -->
        <CarpetaForm
            v-if="mostrarModalCarpeta"
            :carpeta="carpetaEditando"
            :carpetas="carpetas"
            :cliente-id="clienteSeleccionado"
            @guardar="guardarCarpeta"
            @cerrar="cerrarModalCarpeta" />

        <DocumentoUploader
            v-if="mostrarModalSubida"
            :carpeta-id="carpetaSeleccionada || 0"
            @subir="procesarSubida"
            @cerrar="cerrarModalSubida" />

        <DocumentoPreviewModal v-if="documentoPreview" :documento="documentoPreview" @cerrar="cerrarPreview" />

        <CompartirModal
            v-if="documentoParaCompartir"
            :documento="documentoParaCompartir"
            @compartir="procesarCompartir"
            @cerrar="cerrarModalCompartir" />

        <!-- Sistema de notificaciones mejorado -->
        <div class="toast-container position-fixed top-0 end-0 p-3">
            <Toast
                v-for="notificacion in notificaciones"
                :key="notificacion.id"
                :tipo="notificacion.tipo"
                :mensaje="notificacion.mensaje"
                @cerrar="cerrarNotificacion(notificacion.id)" />
        </div>
    </div>
</template>

<style scoped>
    /* Estilos personalizados mínimos para complementar Tailwind */
    .btn-modern {
        transition: all 0.2s ease-in-out;
    }

    .btn-modern:hover {
        transform: translateY(-1px);
    }

    .stat-card {
        transition: all 0.2s ease-in-out;
    }

    .stat-card:hover {
        transform: translateY(-2px);
    }

    /* Scrollbars personalizados */
    .overflow-auto::-webkit-scrollbar {
        width: 6px;
    }

    .overflow-auto::-webkit-scrollbar-track {
        background: #f3f4f6;
    }

    .dark .overflow-auto::-webkit-scrollbar-track {
        background: #1f2937;
    }

    .overflow-auto::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 9999px;
    }

    .dark .overflow-auto::-webkit-scrollbar-thumb {
        background: #4b5563;
    }

    .overflow-auto::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
    }

    .dark .overflow-auto::-webkit-scrollbar-thumb:hover {
        background: #6b7280;
    }

    /* Animaciones suaves */
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

    .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
    }
</style>
