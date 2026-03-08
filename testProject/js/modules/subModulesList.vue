<script setup lang="ts">
    import Swal from 'sweetalert2';
    import { inject, provide, reactive, ref, type Ref, toRefs } from 'vue';

    import customTable from '@/dashboard/js/components/customTable.vue';
    import modal from '@/dashboard/js/components/modal.vue';
    import { API_RESPONSE_CODES, GLOBAL_CONSTANTS } from '@/dashboard/js/constants';
    import { convertDataTypes, versaFetch, VersaToast } from '@/dashboard/js/functions';
    import {
        type ItemSubModule,
        type ShowModalSubForm,
        ShowModalSubFormInjection,
    } from '@/dashboard/js/modules/InjectKeys';
    import subModulesForm from '@/dashboard/js/modules/subModulesForm.vue';
    import type { AccionData, actionsType, VersaParamsFetch } from '@/dashboard/types/versaTypes';

    const emit = defineEmits(['accion']);

    const props = defineProps<{
        showModal: boolean;
        idModule: number;
    }>();
    const { showModal, idModule } = toRefs(props);
    const panelUrl = inject<string>('panelUrl', ''); // Obtiene el panel URL desde la inyección

    const showModalSubForm = reactive<ShowModalSubForm>({
        showModalSubForm: false,
        itemSelected: null,
        action: '',
    });

    ShowModalSubFormInjection.provide(showModalSubForm);
    provide('id_menu', idModule);

    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const refreshTable = ref(false);

    const changeStatus = async (
        /** @type {Object} */ item: {
            id: number;
            id_menu: number;
            estado: string;
            nombre: string;
        },
    ) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `Estás a punto de cambiar el estado del sub módulo ${item.nombre}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, cambiar estado',
            cancelButtonText: 'Cancelar',
        });
        if (result.isConfirmed) {
            const params = {
                url: `/${panelUrl}/submodules/changeStatus`,
                method: 'PATCH',
                data: JSON.stringify({
                    id: item.id,
                    id_menu: item.id_menu,
                    estado: '1' === item.estado ? '0' : '1',
                    csrf_token: csrf_token.value,
                }),
                headers: { 'Content-Type': 'application/json' },
            } as VersaParamsFetch;
            const response = await versaFetch(params);
            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                refreshTable.value = !refreshTable.value;
                await VersaToast.fire({
                    icon: 'success',
                    title: response.message,
                });
                emit('accion', { accion: 'refreshData' });
            } else {
                await VersaToast.fire({
                    icon: 'warning',
                    title: response.message,
                });
            }
        }
    };

    const changePosition = async (
        /** @type {Object} */ item: {
            id: number;
            id_menu: number;
            posicion: number;
        },
    ) => {
        const { value } = await Swal.fire({
            title: 'Cambiar posición',
            icon: 'question',
            input: 'number',
            inputValue: item.posicion.toString(),
            inputOptions: {
                min: '1',
            },
            inputAttributes: {
                min: '1',
            },
            showCancelButton: true,
            confirmButtonText: 'Cambiar',
            cancelButtonText: 'Cancelar',
            inputValidator: value => {
                if (!value) {
                    return 'Debes ingresar una posición';
                }
            },
        });
        if (value) {
            const params = {
                url: `/${panelUrl}/submodules/changePositionSubModule`,
                method: 'PATCH',
                data: JSON.stringify({
                    id: item.id,
                    id_menu: item.id_menu,
                    position: value,
                    csrf_token: csrf_token.value,
                }),
                headers: { 'Content-Type': 'application/json' },
            } as VersaParamsFetch;
            const response = await versaFetch(params);
            if (API_RESPONSE_CODES.SUCCESS === response.success) {
                refreshTable.value = !refreshTable.value;
                await VersaToast.fire({
                    icon: 'success',
                    title: response.message,
                });
                emit('accion', { accion: 'refreshData' });
            } else {
                await VersaToast.fire({
                    icon: 'warning',
                    title: response.message,
                });
            }
        }
    };

    const accion = (payload: AccionData): void => {
        const actions: actionsType = {
            create: () => {
                showModalSubForm.itemSelected = null;
                showModalSubForm.action = 'new';
                showModalSubForm.showModalSubForm = true;
            },
            showEditSubModule: () => {
                showModalSubForm.itemSelected =
                    convertDataTypes<ItemSubModule>(
                        [payload.item],
                        [
                            {
                                key: 'estado',
                                type: 'boolean',
                            },
                        ],
                    )[GLOBAL_CONSTANTS.ZERO] ?? null;
                showModalSubForm.action = 'edit';
                showModalSubForm.showModalSubForm = true;
            },
            changeStatusSubMenu: () => changeStatus(payload.item),
            closeModal: () => emit('accion', { accion: 'closeModal' }),
            changePosition: () => changePosition(payload.item),
            default: () => console.log('Accion no encontrada'),
        };

        const selectedAction = actions[payload.accion] || actions['default'];
        if ('function' === typeof selectedAction) {
            selectedAction();
        }
    };
</script>
<template>
    <modal :showModal="showModal" idModal="modalSubModule" size="max-w-7xl" @accion="accion">
        <template #modalTitle>
            <div class="flex justify-between">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                    <i class="bi bi-menu-app-fill text-2xl text-brand dark:text-brand-300"></i>
                    Listado de Sub Módulos: {{ idModule }}
                </h3>
                <div class="float-left">
                    <button
                        type="button"
                        class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
                        @click="accion({ accion: 'closeModal' })">
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                                stroke="currentColor"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2" />
                        </svg>
                    </button>
                </div>
            </div>
        </template>
        <template #modalBody>
            <subModulesForm />
            <customTable
                @accion="accion"
                v-if="showModal"
                id="subModulesTable"
                key="subModulesTable"
                tablaTitle="Listado de Sub Módulos"
                :urlData="`/${panelUrl}/modules/getSubModules`"
                :externalFilters="'id_menu=' + idModule"
                fieldOrder="posicion"
                :refreshData="refreshTable">
                <template v-slot:buttons>
                    <div class="flex justify-end gap-2">
                        <button
                            type="button"
                            class="text-white bg-brand-600 hover:bg-brand-700 focus:ring-4 focus:outline-none focus:ring-brand/30 rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-brand dark:hover:bg-brand-600 dark:focus:ring-brand-600"
                            @click="accion({ accion: 'create' })">
                            Crear
                        </button>
                    </div>
                </template>
            </customTable>
        </template>
        <template #modalFooter>
            <button
                type="button"
                class="text-white bg-gray-700 hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-gray-300 rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-800"
                @click="accion({ accion: 'closeModal' })">
                Cerrar
            </button>
        </template>
    </modal>
</template>
