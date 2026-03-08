<script setup lang="ts">
    import { inject, reactive, ref, type Ref } from 'vue';

    import customTable from '@/dashboard/js/components/customTable.vue';
    import { type Factura, useModalFactura } from '@/dashboard/js/facturacion/facturacionType';
    import ViewFacturaDetalle from '@/dashboard/js/facturacion/ViewFacturaDetalle.vue';
    import { versaAlert } from '@/dashboard/js/functions';
    import type { AccionData, actionsType } from '@/dashboard/types/versaTypes';

    const showModalFactura = useModalFactura.inject();

    const externalFilters = ref('');
    const refreshTable = ref(false);
    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', '');
    const empresaSelected = inject<string>('empresaSelected', '');

    const viewDetalle = reactive({
        show: false,
        factura: {} as Factura,
    });

    const descargarPDF = (facturaItem: Factura) => {
        versaAlert({
            title: 'Función en desarrollo',
            message: 'La descarga de PDF estará disponible próximamente',
            type: 'info',
        });
    };

    const accion = (data: AccionData) => {
        const actions: actionsType = {
            verDetalle: () => {
                viewDetalle.factura = data.item;
                viewDetalle.show = true;
            },
            descargarPDF: () => descargarPDF(data.item),
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
        <div
            class="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
                        <i class="bi bi-file-earmark-text-fill text-xl text-white"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-900 dark:text-white">Mis Facturas</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            Historial de facturación y estados de pago
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tabla -->
        <customTable
            :urlData="`/${panelUrl}/facturacion/cartera/api/getFacturasPaginated/${empresaSelected}`"
            :externalFilters="externalFilters"
            :refresh="refreshTable"
            :csrf_token="csrf_token.value"
            @accion="accion" />

        <!-- Modal Detalle -->
        <ViewFacturaDetalle v-model:show="viewDetalle.show" :factura="viewDetalle.factura" />
    </div>
</template>
