<script setup lang="ts">
    import Swal from 'sweetalert2';
    import { inject, reactive, ref, type Ref } from 'vue';

    import customTable from '@/dashboard/js/components/customTable.vue';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { type Factura, factura, useModalFactura } from '@/dashboard/js/facturacion/facturacionType';
    import FormMarcarPagada from '@/dashboard/js/facturacion/FormMarcarPagada.vue';
    import ViewFacturaDetalle from '@/dashboard/js/facturacion/ViewFacturaDetalle.vue';
    import { versaAlert, versaFetch } from '@/dashboard/js/functions';
    import type { AccionData, actionsType, VersaFetchResponse } from '@/dashboard/types/versaTypes';

    const showModalFactura = useModalFactura.inject();

    const externalFilters = ref('');
    const refreshTable = ref(false);
    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', '');
    const buttonSelected = ref<'Todos' | 'Pendientes' | 'Vencidas'>('Todos');

    const viewDetalle = reactive({
        show: false,
        factura: {} as Factura,
    });

    const formMarcarPagada = reactive({
        show: false,
        factura: {} as Factura,
    });

    const generarFactura = () => {
        showModalFactura.show = true;
        showModalFactura.itemSelected = { ...factura };
    };

    const marcarPagada = (facturaItem: Factura) => {
        formMarcarPagada.factura = facturaItem;
        formMarcarPagada.show = true;
    };

    const confirmarPago = async (data: any) => {
        try {
            interface ResponsePago extends VersaFetchResponse {
                data?: any;
            }

            const response = (await versaFetch({
                url: `/${panelUrl}/facturacion/api/marcarComoPagada`,
                method: 'POST',
                data: {
                    csrf_token: csrf_token.value,
                    id: data.id,
                    fecha_pago: data.fecha_pago,
                    metodo_pago: data.metodo_pago,
                    referencia_pago: data.referencia_pago,
                },
            })) as ResponsePago;

            if (response.success === API_RESPONSE_CODES.ERROR) {
                versaAlert({
                    title: 'Error',
                    message: response.message || 'No se pudo marcar la factura como pagada',
                    type: 'error',
                });
                return;
            }

            versaAlert({
                title: 'Éxito',
                message: 'Factura marcada como pagada correctamente',
                type: 'success',
            });

            formMarcarPagada.show = false;
            refreshTable.value = !refreshTable.value;
        } catch {
            versaAlert({
                title: 'Error',
                message: 'Error al marcar la factura como pagada',
                type: 'error',
            });
        }
    };

    const generarFacturaMasiva = async () => {
        try {
            const response = (await versaFetch({
                url: `/${panelUrl}/facturacion/api/generarFacturasMasivas`,
                method: 'POST',
                data: {
                    csrf_token: csrf_token.value,
                },
            })) as VersaFetchResponse;

            if (response.success === API_RESPONSE_CODES.ERROR) {
                versaAlert({
                    title: 'Error',
                    message: response.message || 'No se pudieron generar las facturas',
                    type: 'error',
                });
                return;
            }

            versaAlert({
                title: 'Éxito',
                message: 'Facturas generadas correctamente',
                type: 'success',
            });

            refreshTable.value = !refreshTable.value;
        } catch {
            versaAlert({
                title: 'Error',
                message: 'Error al generar las facturas',
                type: 'error',
            });
        }
    };

    const descargarPDF = (facturaItem: Factura) => {
        versaAlert({
            title: 'Función en desarrollo',
            message: 'La descarga de PDF estará disponible próximamente',
            type: 'info',
        });
    };

    const setFilterExterno = (filter: string) => {
        externalFilters.value = filter;
        refreshTable.value = !refreshTable.value;
    };

    const eliminarFactura = async (facturaItem: Factura) => {
        const confirm = await Swal.fire({
            title: '¿Estás seguro?',
            text: `¿Deseas eliminar la factura ${facturaItem.numero_factura}? Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (confirm.isConfirmed) {
            const response = await versaFetch({
                url: `/${panelUrl}/facturacion/api/eliminarFactura`,
                method: 'DELETE',
                data: {
                    csrf_token: csrf_token.value,
                    id: facturaItem.id,
                },
            });
            if (response.success === API_RESPONSE_CODES.SUCCESS) {
                versaAlert({
                    title: 'Éxito',
                    message: 'Factura eliminada correctamente',
                    type: 'success',
                });
                refreshTable.value = !refreshTable.value;
                return;
            }
            versaAlert({
                title: 'Error',
                message: response.message || 'No se pudo eliminar la factura',
                type: 'error',
            });
        }
    };

    const accion = (data: AccionData) => {
        const actions: actionsType = {
            generarFactura: () => generarFactura(),
            generarFacturaMasiva: () => generarFacturaMasiva(),
            verDetalle: () => {
                viewDetalle.factura = data.item;
                viewDetalle.show = true;
            },
            marcarPagada: () => marcarPagada(data.item),
            descargarPDF: () => descargarPDF(data.item),
            eliminarFactura: () => eliminarFactura(data.item),
            default: () => {
                console.log('Acción no implementada:', data.accion);
            },
        };
        const fn = actions[data.accion] || actions.default;
        if (typeof fn === 'function') {
            fn();
        }
    };
</script>

<template>
    <div class="relative">
        <!-- Header de la tabla -->

        <!-- Tabla -->
        <customTable
            id="facturas"
            tablaTitle="Facturas Emitidas"
            :urlData="`/${panelUrl}/facturacion/api/getAllFacturasPaginated`"
            :externalFilters="externalFilters"
            :refreshData="refreshTable"
            @accion="accion">
            <template #buttons>
                <div
                    class="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 border-b border-gray-200 dark:border-gray-700 mb-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div
                                class="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
                                <i class="bi bi-receipt text-xl text-white"></i>
                            </div>
                            <div>
                                <h3 class="text-xl font-bold text-gray-900 dark:text-white">Gestión de Facturas</h3>
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    Administra facturas de todas las empresas
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex justify-between gap-2 px-2">
                    <div class="flex gap-3">
                        <button
                            @click="accion({ accion: 'generarFacturaMasiva' })"
                            class="px-4 py-2 rounded-xl text-sm font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-lg flex items-center gap-2">
                            <i class="bi bi-calendar-check"></i>
                            Generar Masivo
                        </button>
                        <button
                            @click="accion({ accion: 'generarFactura' })"
                            class="px-4 py-2 rounded-xl text-sm font-bold bg-brand text-white hover:bg-brand-600 transition-all shadow-lg shadow-brand/20 flex items-center gap-2">
                            <i class="bi bi-plus-lg"></i>
                            Nueva Factura
                        </button>
                    </div>

                    <div class="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex items-center">
                        <button
                            type="button"
                            class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                            :class="
                                buttonSelected === 'Todos'
                                    ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                            "
                            @click="
                                buttonSelected = 'Todos';
                                setFilterExterno('');
                            ">
                            Todas
                        </button>
                        <button
                            type="button"
                            class="px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                            :class="
                                buttonSelected === 'Pendientes'
                                    ? 'bg-white dark:bg-black text-green-600 shadow-sm'
                                    : 'text-gray-500 hover:text-green-600'
                            "
                            @click="
                                buttonSelected = 'Pendientes';
                                setFilterExterno(`facturas.estado='pendiente'`);
                            ">
                            <span
                                class="w-2 h-2 rounded-full bg-green-500"
                                v-if="buttonSelected !== 'Pendientes'"></span>
                            Pendientes
                        </button>
                        <button
                            type="button"
                            class="px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                            :class="
                                buttonSelected === 'Vencidas'
                                    ? 'bg-white dark:bg-black text-red-500 shadow-sm'
                                    : 'text-gray-500 hover:text-red-500'
                            "
                            @click="
                                buttonSelected = 'Vencidas';
                                setFilterExterno(`facturas.estado='vencida'`);
                            ">
                            <span class="w-2 h-2 rounded-full bg-red-500" v-if="buttonSelected !== 'Vencidas'"></span>
                            Vencidas
                        </button>
                    </div>
                </div>
            </template>
        </customTable>

        <!-- Modal Detalle -->
        <ViewFacturaDetalle v-model:show="viewDetalle.show" :factura="viewDetalle.factura" />

        <!-- Modal Marcar Pagada -->
        <FormMarcarPagada
            v-model:show="formMarcarPagada.show"
            :factura="formMarcarPagada.factura"
            @confirmar="confirmarPago" />
    </div>
</template>
