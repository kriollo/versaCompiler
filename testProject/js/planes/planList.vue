<script setup lang="ts">
    import Swal from 'sweetalert2';
    import { inject, ref, type Ref } from 'vue';

    import customTable from '@/dashboard/js/components/customTable.vue';
    import { API_RESPONSE_CODES, GLOBAL_CONSTANTS } from '@/dashboard/js/constants';
    import { convertDataTypes, versaAlert, versaFetch } from '@/dashboard/js/functions';
    import FormPlan from '@/dashboard/js/planes/FormPlan.vue';
    import { plan, type Plan, useModalPlan } from '@/dashboard/js/planes/planType';
    import type { AccionData, actionsType, VersaFetchResponse, VersaParamsFetch } from '@/dashboard/types/versaTypes';

    const externalFilters = ref('');
    const refreshTable = ref(false);
    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', ''); // Obtiene el panel URL desde la inyección
    const buttonSelected = ref('Todos');

    const showModalPlan = useModalPlan.inject();

    const setFilterExterno = (filter: string) => {
        externalFilters.value = filter;
        refreshTable.value = !refreshTable.value;
    };

    const savePlan = async (item: Plan) => {
        const method = item.id > 0 ? 'PUT' : 'POST';
        const url = item.id > 0 ? `/${panelUrl}/planes/api/update` : `/${panelUrl}/planes/api/save`;

        const params: VersaParamsFetch = {
            url,
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            data: JSON.stringify(item),
        };

        const response = (await versaFetch(params)) as VersaFetchResponse;

        if (response.success === API_RESPONSE_CODES.SUCCESS) {
            versaAlert({
                title: 'Éxito',
                message: item.id > 0 ? 'Plan actualizado correctamente' : 'Plan creado correctamente',
                type: 'success',
            });
            showModalPlan.show = false;
            refreshTable.value = !refreshTable.value;
        } else {
            versaAlert({
                title: 'Error',
                message: response.message || 'No se pudo guardar el plan',
                type: 'error',
            });
        }
    };

    const changeStatus = async (item: Plan) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `Estás a punto de ${item.estado ? 'desactivar' : 'activar'} el plan ${item.nombre}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, cambiar',
            cancelButtonText: 'Cancelar',
        });

        if (result.isConfirmed) {
            const params: VersaParamsFetch = {
                url: `/${panelUrl}/planes/api/changeStatus`,
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    id: item.id,
                    csrf_token: csrf_token.value,
                }),
            };

            const response = (await versaFetch(params)) as VersaFetchResponse;

            if (response.success === API_RESPONSE_CODES.SUCCESS) {
                Swal.fire({
                    title: 'Éxito',
                    text: `El estado del plan ${item.nombre} ha sido actualizado.`,
                    icon: 'success',
                });
                refreshTable.value = !refreshTable.value;
            } else {
                Swal.fire({
                    title: 'Error',
                    text: response.message || 'No se pudo cambiar el estado del plan.',
                    icon: 'error',
                });
            }
        }
    };

    const deletePlan = async (item: Plan) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `Estás a punto de eliminar el plan ${item.nombre}. Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });

        if (result.isConfirmed) {
            const params: VersaParamsFetch = {
                url: `/${panelUrl}/planes/api/delete`,
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    id: item.id,
                    csrf_token: csrf_token.value,
                }),
            };

            const response = (await versaFetch(params)) as VersaFetchResponse;

            if (response.success === API_RESPONSE_CODES.SUCCESS) {
                Swal.fire({
                    title: 'Eliminado',
                    text: `El plan ${item.nombre} ha sido eliminado.`,
                    icon: 'success',
                });
                refreshTable.value = !refreshTable.value;
            } else {
                Swal.fire({
                    title: 'Error',
                    text: response.message || 'No se pudo eliminar el plan.',
                    icon: 'error',
                });
            }
        }
    };

    const accion = (data: AccionData) => {
        const actions: actionsType = {
            closeModalReloadTable: () => {
                refreshTable.value = !refreshTable.value;
                showModalPlan.show = false;
            },
            closeModal: () => {
                showModalPlan.show = false;
            },
            editPlan: () => {
                showModalPlan.show = true;
                showModalPlan.itemSelected = convertDataTypes<Plan>(
                    [data.item],
                    [
                        { key: 'estado', type: 'boolean' },
                        { key: 'moderacion_ia', type: 'boolean' },
                        { key: 'descargas_permitidas', type: 'boolean' },
                    ],
                )[GLOBAL_CONSTANTS.ZERO];
            },
            saveForm: () => {
                savePlan(data.item as Plan);
            },
            changeStatus: () => {
                changeStatus(
                    convertDataTypes<Plan>(
                        [data.item],
                        [
                            { key: 'estado', type: 'boolean' },
                            { key: 'moderacion_ia', type: 'boolean' },
                            { key: 'descargas_permitidas', type: 'boolean' },
                        ],
                    )[GLOBAL_CONSTANTS.ZERO],
                );
            },
            deletePlan: () => {
                deletePlan(
                    convertDataTypes<Plan>(
                        [data.item],
                        [
                            { key: 'estado', type: 'boolean' },
                            { key: 'moderacion_ia', type: 'boolean' },
                            { key: 'descargas_permitidas', type: 'boolean' },
                        ],
                    )[GLOBAL_CONSTANTS.ZERO],
                );
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
    <div class="w-full">
        <customTable
            id="planes"
            key="planes"
            tabla-title="Gestión de Planes"
            :externalFilters="externalFilters"
            :refreshData="refreshTable"
            fieldOrder="nombre"
            :urlData="`/${panelUrl}/planes/api/list`"
            @accion="accion">
            <template v-slot:buttons>
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                    <FormPlan @accion="accion" />
                    <button
                        class="bg-brand text-white font-extrabold text-sm uppercase px-6 py-3 rounded-xl hover:bg-brand-600 transition-all transform hover:scale-105 shadow-lg shadow-brand/20 flex items-center gap-2"
                        @click="
                            showModalPlan.show = true;
                            showModalPlan.itemSelected = { ...plan };
                        ">
                        <i class="bi bi-plus-circle-fill text-lg"></i>
                        <span>Crear Nuevo Plan</span>
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
                                setFilterExterno('estado=true');
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
                                setFilterExterno('estado=false');
                            ">
                            <span class="w-2 h-2 rounded-full bg-red-500" v-if="buttonSelected !== 'Inactivos'"></span>
                            Inactivos
                        </button>
                    </div>
                </div>
            </template>
        </customTable>
    </div>
</template>
<style scoped>
    /* No specific styles needed, Tailwind handles it */
</style>
