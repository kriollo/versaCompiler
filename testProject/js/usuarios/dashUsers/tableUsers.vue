<script setup lang="ts">
    import Swal, { type SweetAlertOptions } from 'sweetalert2';
    // Importar tipos
    import { inject, ref, watch } from 'vue';

    import customTable from '@/dashboard/js/components/customTable.vue';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaFetch, VersaToast } from '@/dashboard/js/functions';
    import modalUpdatePass from '@/dashboard/js/usuarios/dashUsers/modalUpdatePass.vue';
    import type { AccionData, actionsType, VersaParamsFetch } from '@/dashboard/types/versaTypes';

    // Definir una interfaz para el parámetro 'item'
    interface UserItem {
        status: '0' | '1' | string; // Ser específico si es posible, ej. '0' | '1'
        tokenid: string;
        // Otras propiedades que item pueda tener
    }
    const panelUrl = inject<string>('panelUrl', ''); // Obtiene el panel URL desde la inyección
    const showModal = ref(false);
    const tokenIdSelected = ref('');
    const refreshTable = ref(false);
    const externalFilters = ref('');
    const buttonSelected = ref('Todos');
    const selectedEmpresa = ref('');
    let estadoFilter = '';

    const editUser = (tokenid: string) => {
        // Tipar parámetro
        globalThis.location.href = `/${panelUrl}/usuarios/editUser/${tokenid}`;
    };

    const changePassword = (tokenid: string) => {
        // Tipar parámetro
        showModal.value = true;
        tokenIdSelected.value = tokenid;
    };

    const changeStatus = async (item: UserItem) => {
        // Aplicar tipo a 'item'
        // Define el objeto de opciones y tipifícalo explícitamente como SweetAlertOptions
        const options: SweetAlertOptions = item.status
            ? {
                  title: '¿Estas seguro?',
                  text: 'El usuario sera desactivado y no podra acceder al sistema',
                  icon: 'warning', // 'warning' es un SweetAlertIcon válido
                  showCancelButton: true,
                  confirmButtonText: 'Si, desactivar',
                  cancelButtonText: 'Cancelar',
              }
            : {
                  title: '¿Estas seguro?',
                  text: 'El usuario será activado',
                  icon: 'warning', // 'warning' es un SweetAlertIcon válido
                  showCancelButton: true,
                  confirmButtonText: 'Sí, activar',
                  cancelButtonText: 'Cancelar',
              };

        // Pasa el objeto de opciones directamente a Swal.fire()
        const result = await Swal.fire(options);

        if (result.isConfirmed) {
            const params: VersaParamsFetch = {
                url: `/${panelUrl}/users/deleteUser`,
                method: 'DELETE',
                headers: {
                    'content-type': 'application/json',
                },
                data: JSON.stringify({
                    tokenid: item.tokenid,
                }),
            };
            const response = await versaFetch(params);
            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                VersaToast.fire({
                    icon: 'success',
                    title: response.message,
                });
                refreshTable.value = !refreshTable.value;
            } else {
                await VersaToast.fire({
                    icon: 'error',
                    title: response.message,
                });
            }
        }
    };

    const closeModal = () => {
        showModal.value = false;
    };

    watch(selectedEmpresa, newValue => {
        setFilterExterno();
    });
    watch(buttonSelected, newValue => {
        if (newValue === 'Todos') {
            estadoFilter = '';
        } else if (newValue === 'Activos') {
            estadoFilter = 'status = true';
        } else if (newValue === 'Inactivos') {
            estadoFilter = 'status = false';
        }
        setFilterExterno();
    });

    const setFilterExterno = () => {
        if (selectedEmpresa.value === '' || selectedEmpresa.value === '0') {
            externalFilters.value = estadoFilter;
        } else {
            externalFilters.value = `${estadoFilter ? `${estadoFilter} AND ` : ''}id_empresa=${selectedEmpresa.value}`;
        }
        refreshTable.value = !refreshTable.value;
    };

    const accion = (accion: AccionData) => {
        const actions: actionsType = {
            editUser: () => editUser(accion.item.tokenid),
            changePassword: () => changePassword(accion.item.tokenid),
            changeStatus: () => changeStatus(accion.item),
            closeModal: () => closeModal(),
        };
        const action = actions[accion.accion] || (() => console.log('Accion no encontrada'));
        if ('function' === typeof action) {
            action();
        }
    };
</script>
<template>
    <div>
        <customTable
            :externalFilters="externalFilters"
            :refreshData="refreshTable"
            @accion="accion"
            tablaTitle="Listado de Usuarios"
            :urlData="`/${panelUrl}/users/getUsersPaginated`">
            <template v-slot:buttons>
                <div class="flex justify-between gap-2">
                    <a
                        class="text-white bg-brand hover:bg-brand-600 focus:ring-4 focus:outline-none focus:ring-brand/30 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-brand dark:hover:bg-brand-600 dark:focus:ring-brand-600 cursor-pointer"
                        :href="`/${panelUrl}/usuarios/addUser`">
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

                        <span class="max-lg:hidden ms-2">Agregar Nuevo usuario</span>
                    </a>
                    <!--<div class="flex justify-end gap-2">
                        <button
                            type="button"
                            class="text-white bg-brand-600 hover:bg-brand-700 focus:ring-4 focus:outline-none focus:ring-brand/30 rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-brand dark:hover:bg-brand-600 dark:focus:ring-brand-600"
                            :class="
                                buttonSelected === 'Todos'
                                    ? 'ring-4 ring-brand-600 font-bold text-current underline underline-offset-8'
                                    : 'font-medium '
                            "
                            @click="buttonSelected = 'Todos'">
                            Todos
                        </button>
                        <button
                            type="button"
                            class="text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-brand/30 rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
                            :class="
                                buttonSelected === 'Activos'
                                    ? 'ring-4 ring-green-800 font-bold text-current  underline underline-offset-8'
                                    : 'font-medium '
                            "
                            @click="buttonSelected = 'Activos'">
                            Activos
                        </button>
                        <button
                            type="button"
                            class="text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-brand/30 rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800"
                            :class="
                                buttonSelected === 'Inactivos'
                                    ? 'ring-4 ring-red-800 font-bold text-current  underline underline-offset-8'
                                    : 'font-medium '
                            "
                            @click="buttonSelected = 'Inactivos'">
                            Inactivos
                        </button>
                    </div>-->
                    <div class="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex items-center">
                        <button
                            type="button"
                            class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                            :class="
                                buttonSelected === 'Todos'
                                    ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                            "
                            @click="buttonSelected = 'Todos'">
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
                            @click="buttonSelected = 'Activos'">
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
                            @click="buttonSelected = 'Inactivos'">
                            <span class="w-2 h-2 rounded-full bg-red-500" v-if="buttonSelected !== 'Inactivos'"></span>
                            Inactivos
                        </button>
                    </div>
                </div>
            </template>
        </customTable>
        <modalUpdatePass
            :showModal="showModal"
            :tokenId="tokenIdSelected"
            @accion="showModal = false"
            origen="usersPpal" />
    </div>
</template>
