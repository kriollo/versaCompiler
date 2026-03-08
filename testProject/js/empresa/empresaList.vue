<script setup lang="ts">
    import Swal from 'sweetalert2';
    import { inject, ref, type Ref } from 'vue';

    import customTable from '@/dashboard/js/components/customTable.vue';
    import { API_RESPONSE_CODES, GLOBAL_CONSTANTS } from '@/dashboard/js/constants';
    import AdicionalFactura from '@/dashboard/js/empresa/AdicionalFactura.vue';
    import AsociaModulos from '@/dashboard/js/empresa/AsociaModulos.vue';
    import AsociaPlan from '@/dashboard/js/empresa/AsociaPlan.vue';
    import empresaForm from '@/dashboard/js/empresa/empresaForm.vue';
    import {
        AdicionalFacturaInjection,
        type Empresa,
        showModalAsociaModuloInjection,
        showModalAsociaPlanInjection,
        ShowModalEmpresaInjection,
    } from '@/dashboard/js/empresa/InjectKeys';
    import { convertDataTypes, versaFetch } from '@/dashboard/js/functions';
    import type { AccionData, actionsType, VersaParamsFetch } from '@/dashboard/types/versaTypes';

    const externalFilters = ref('');
    const refreshTable = ref(false);
    const buttonSelected = ref('Todos');
    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', ''); // Obtiene el panel URL desde la inyección

    const showModalForm = ShowModalEmpresaInjection.inject();
    const showModalAsociaModulo = showModalAsociaModuloInjection.inject();
    const showModalAsociaPlan = showModalAsociaPlanInjection.inject();
    const adicionalFactura = AdicionalFacturaInjection.inject();

    const setFilterExterno = (filter: string) => {
        externalFilters.value = filter;
        refreshTable.value = !refreshTable.value;
    };

    const changeStatus = async (item: Empresa) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `Estás a punto de cambiar el estado de la empresa ${item.nombre}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, cambiar',
            cancelButtonText: 'Cancelar',
        });
        if (result.isConfirmed) {
            const newStatus = item.estado ? 0 : 1;
            const params = {
                url: `/${panelUrl}/empresas/api/changeStatus`,
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    id: item.id,
                    estado: newStatus,
                    csrf_token: csrf_token.value,
                }),
            } as VersaParamsFetch;
            const response = await versaFetch(params);
            if (response.success === API_RESPONSE_CODES.SUCCESS) {
                Swal.fire({
                    title: 'Éxito',
                    text: `El estado de la empresa ${item.nombre} ha sido cambiado.`,
                    icon: 'success',
                });
                refreshTable.value = !refreshTable.value;
            } else {
                Swal.fire({
                    title: 'Error',
                    text: response.message || 'No se pudo cambiar el estado de la empresa.',
                    icon: 'error',
                });
            }
        }
    };

    const accion = (data: AccionData) => {
        const actions: actionsType = {
            closeModalReloadTable: () => {
                refreshTable.value = !refreshTable.value;
                showModalForm.showModalEmpresa = false;
                showModalForm.itemSelected = null;
            },
            closeModal: () => {
                showModalForm.showModalEmpresa = false;
                showModalForm.itemSelected = null;
                showModalAsociaModulo.showModalAsociaModulo = false;
                showModalAsociaModulo.itemSelected = null;
                showModalAsociaPlan.showModalAsociaPlan = false;
                showModalAsociaPlan.itemSelected = null;
                adicionalFactura.showModal = false;
                adicionalFactura.empresa_id = 0;
            },
            editEmpresa: () => {
                showModalForm.showModalEmpresa = true;
                showModalForm.itemSelected = convertDataTypes<Empresa>(
                    [data.item],
                    [{ key: 'estado', type: 'boolean' }],
                )[GLOBAL_CONSTANTS.ZERO];
            },
            changeStatus: () =>
                changeStatus(
                    convertDataTypes<Empresa>([data.item], [{ key: 'estado', type: 'boolean' }])[GLOBAL_CONSTANTS.ZERO],
                ),
            showModalAsociaModulo: () => {
                showModalAsociaModulo.showModalAsociaModulo = true;
                showModalAsociaModulo.itemSelected = convertDataTypes<Empresa>(
                    [data.item],
                    [{ key: 'estado', type: 'boolean' }],
                )[GLOBAL_CONSTANTS.ZERO];
            },
            showModalAsociaPlan: () => {
                showModalAsociaPlan.showModalAsociaPlan = true;
                showModalAsociaPlan.itemSelected = convertDataTypes<Empresa>(
                    [data.item],
                    [{ key: 'estado', type: 'boolean' }],
                )[GLOBAL_CONSTANTS.ZERO];
            },
            showModalAdicionalesFacturacion: () => {
                adicionalFactura.empresa_id = data.item.id;
                adicionalFactura.showModal = true;
            },
            default: () => {
                console.log(data);
            },
        };
        const fn = actions[data.accion] || actions.default;
        if ('function' === typeof fn) {
            fn();
        }
    };
</script>
<template>
    <div>
        <customTable
            id="empresas"
            key="empresas"
            tabla-title="Listado de Empresas"
            :externalFilters="externalFilters"
            :refreshData="refreshTable"
            fieldOrder="nombre"
            :urlData="`/${panelUrl}/empresas/api/list`"
            @accion="accion">
            <template v-slot:buttons>
                <div class="flex justify-between gap-2 px-2">
                    <button
                        class="text-white bg-brand hover:bg-brand-600 focus:ring-4 focus:outline-none focus:ring-brand/30 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-brand dark:hover:bg-brand-600 dark:focus:ring-brand-600 cursor-pointer"
                        @click="showModalForm.showModalEmpresa = true">
                        <svg
                            class="w-[20px] h-[20px] text-gray-800 dark:text-white"
                            fill="currentColor"
                            height="24"
                            viewBox="0 0 24 24"
                            width="24"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                clip-rule="evenodd"
                                d="M9 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2 9a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1a4 4 0 0 0-4-4H7Zm8-1a1 1 0 0 1 1-1h1v-1a1 1 0 1 1 2 0v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1h-1a1 1 0 0 1-1-1Z"
                                fill-rule="evenodd" />
                        </svg>

                        <span class="max-lg:hidden ms-2">Agregar Nueva Empresa</span>
                    </button>

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
                            Todos
                        </button>
                        <button
                            type="button"
                            class="px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                            :class="
                                buttonSelected === 'Activos'
                                    ? 'bg-white dark:bg-black text-green-600 shadow-sm'
                                    : 'text-gray-500 hover:text-green-600'
                            "
                            @click="
                                buttonSelected = 'Activos';
                                setFilterExterno('empresas.estado=true');
                            ">
                            <span class="w-2 h-2 rounded-full bg-green-500" v-if="buttonSelected !== 'Activos'"></span>
                            Activos
                        </button>
                        <button
                            type="button"
                            class="px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                            :class="
                                buttonSelected === 'Inactivos'
                                    ? 'bg-white dark:bg-black text-red-500 shadow-sm'
                                    : 'text-gray-500 hover:text-red-500'
                            "
                            @click="
                                buttonSelected = 'Inactivos';
                                setFilterExterno('empresas.estado=false');
                            ">
                            <span class="w-2 h-2 rounded-full bg-red-500" v-if="buttonSelected !== 'Inactivos'"></span>
                            Inactivos
                        </button>
                    </div>
                </div>
            </template>
        </customTable>
        <empresaForm @accion="accion" />
        <AsociaModulos @accion="accion" />
        <AsociaPlan @accion="accion" />
        <AdicionalFactura @accion="accion" />
    </div>
</template>
<style scoped></style>
