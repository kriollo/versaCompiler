<script setup lang="ts">
    import Swal from 'sweetalert2';
    import { inject, ref, type Ref } from 'vue';

    import customTable from '@/dashboard/js/components/customTable.vue';
    import { API_RESPONSE_CODES, GLOBAL_CONSTANTS } from '@/dashboard/js/constants';
    import { convertDataTypes, versaFetch, VersaToast } from '@/dashboard/js/functions';
    import { type itemSelectedType, ShowModalFormInjection } from '@/dashboard/js/modules/InjectKeys';
    import subModulesList from '@/dashboard/js/modules/subModulesList.vue';
    import type { AccionData, actionsType, VersaParamsFetch } from '@/dashboard/types/versaTypes';

    const externalFilters = ref('');
    const buttonSelected = ref('Todos');
    const refreshTable = ref(false);
    const showModalSubMenu = ref(false);

    const showModalForm = ShowModalFormInjection.inject();

    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', ''); // Obtiene el panel URL desde la inyección
    const setFilterExterno = (/** @type {string} */ filter) => {
        externalFilters.value = filter;
        refreshTable.value = !refreshTable.value;
    };

    const changeStatus = async (/** @type {Object} */ item) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `Estás a punto de cambiar el estado del módulo ${item.nombre}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, cambiar estado',
            cancelButtonText: 'Cancelar',
        });
        if (result.isConfirmed) {
            const params = {
                url: `/${panelUrl}/modules/changeStatus`,
                method: 'PATCH',
                data: JSON.stringify({
                    id: item.id,
                    estado: '1' === item.estado ? '0' : '1',
                    csrf_token: csrf_token.value,
                }),
                headers: { 'Content-Type': 'application/json' },
            } as VersaParamsFetch;
            const response = await versaFetch(params);
            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                await VersaToast.fire({
                    icon: 'success',
                    title: response.message,
                });
                location.reload();
            } else {
                await VersaToast.fire({
                    icon: 'warning',
                    title: response.message,
                });
            }
        }
    };

    const changePosition = async (/** @type {Object} */ item) => {
        const params = {
            url: `/${panelUrl}/modules/movePosition`,
            method: 'PATCH',
            data: JSON.stringify({
                id: item.id,
                currentPosition: item.posicion,
                direction: item.direction,
                csrf_token: csrf_token.value,
            }),
            headers: { 'Content-Type': 'application/json' },
        } as VersaParamsFetch;
        const response = await versaFetch(params);
        if (API_RESPONSE_CODES.SUCCESS === response.success) {
            refreshTable.value = !refreshTable.value;
        } else {
            await VersaToast.fire({
                icon: 'warning',
                title: response.message,
            });
        }
    };

    const idModuleSelected = ref(GLOBAL_CONSTANTS.ZERO);

    const accion = (accion: AccionData) => {
        const actions: actionsType = {
            openModalForm: () => {
                showModalForm.itemSelected = null;
                showModalForm.action = 'new';
                showModalForm.showModalForm = true;
            },
            showEditModule: () => {
                showModalForm.showModalForm = true;
                showModalForm.itemSelected =
                    convertDataTypes<itemSelectedType[]>(
                        [accion.item],
                        [
                            { key: 'estado', type: 'boolean' },
                            { key: 'fill', type: 'boolean' },
                        ],
                    )[GLOBAL_CONSTANTS.ZERO] ?? null;
                showModalForm.action = 'edit';
            },
            changePosition: () => changePosition(accion.item),
            changeStatus: () => changeStatus(accion.item),
            viewSubmenus: () => {
                idModuleSelected.value = accion.item.id;
                showModalSubMenu.value = true;
            },
            refreshData: () => {
                refreshTable.value = !refreshTable.value;
            },
            closeModal: () => {
                showModalSubMenu.value = false;
            },
            default: () => console.log('Accion no encontrada'),
        };
        const action = actions[accion.accion] || actions.default;
        if ('function' === typeof action) {
            action();
        }
    };
</script>

<template>
    <div>
        <customTable
            id="modulesTable"
            key="modulesTable"
            :externalFilters="externalFilters"
            :refreshData="refreshTable"
            @accion="accion"
            fieldOrder="seccion"
            tablaTitle="Listado de Modulos de la Aplicación"
            :urlData="`/${panelUrl}/modules/getModulesPaginated`">
            <template v-slot:buttons>
                <div class="flex justify-between gap-2">
                    <a
                        class="text-white bg-brand hover:bg-brand-600 focus:ring-4 focus:outline-none focus:ring-brand/30 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-brand dark:hover:bg-brand-600 dark:focus:ring-brand-600 cursor-pointer"
                        @click="accion({ accion: 'openModalForm' })">
                        <svg
                            class="w-[20px] h-[20px] text-gray-800 dark:text-white"
                            fill="currentColor"
                            height="24"
                            viewBox="0 0 24 24"
                            width="24"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                clip-rule="evenodd"
                                d="M4.857 3A1.857 1.857 0 0 0 3 4.857v4.286C3 10.169 3.831 11 4.857 11h4.286A1.857 1.857 0 0 0 11 9.143V4.857A1.857 1.857 0 0 0 9.143 3H4.857Zm10 0A1.857 1.857 0 0 0 13 4.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 21 9.143V4.857A1.857 1.857 0 0 0 19.143 3h-4.286Zm-10 10A1.857 1.857 0 0 0 3 14.857v4.286C3 20.169 3.831 21 4.857 21h4.286A1.857 1.857 0 0 0 11 19.143v-4.286A1.857 1.857 0 0 0 9.143 13H4.857ZM18 14a1 1 0 1 0-2 0v2h-2a1 1 0 1 0 0 2h2v2a1 1 0 1 0 2 0v-2h2a1 1 0 1 0 0-2h-2v-2Z"
                                fill-rule="evenodd" />
                        </svg>

                        <span class="max-lg:hidden ms-2">Nuevo Modulo</span>
                    </a>

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
        <subModulesList :showModal="showModalSubMenu" @accion="accion" :idModule="Number(idModuleSelected)" />
    </div>
</template>
