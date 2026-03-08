<script setup lang="ts">
    import Swal from 'sweetalert2';
    import type { AccionData, actionsType } from 'versaTypes';
    import { inject, reactive, ref } from 'vue';

    import FormTrunk from '@/dashboard/js/chatbot/configTrunk/FormTrunk.vue';
    import {
        channelSelectedInjection,
        FormTrunkInjection,
        type ShowModalFormTrunk,
        type Trunk,
    } from '@/dashboard/js/chatbot/configTrunk/InjectKeys';
    import CustomTable from '@/dashboard/js/components/customTable.vue';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaFetch, VersaToast } from '@/dashboard/js/functions';

    const emit = defineEmits(['accion']);

    const showModalForm = reactive<ShowModalFormTrunk>({
        showModal: false,
        itemSelected: null,
        action: '',
    });
    FormTrunkInjection.provide(showModalForm);

    const channelSelected = channelSelectedInjection.inject();
    const panelUrl = inject<string>('panelUrl', ''); // Obtiene el panel URL desde la inyección
    const empresaSelected = inject<string>('empresaSelected', '');
    const refreshTable = ref(false);

    // Función para editar un troncal
    const editTrunk = (trunk: Trunk) => {
        showModalForm.itemSelected = trunk;
        showModalForm.action = 'edit';
        showModalForm.showModal = true;
    };

    // Función para eliminar un troncal
    const deleteTrunk = async (trunk: Trunk) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: trunk.estado
                ? `Se eliminará el troncal "${trunk.nombre}"`
                : `Se activará el troncal "${trunk.nombre}"`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, hazlo',
            cancelButtonText: 'Cancelar',
        });

        if (result.isConfirmed) {
            try {
                const response = await versaFetch({
                    url: `/${panelUrl}/chatbot/api/troncal/deleteTroncal/${empresaSelected}/${channelSelected.value.id}`,
                    method: 'DELETE',
                    data: {
                        troncalId: trunk.id,
                    },
                });

                if (response.success === API_RESPONSE_CODES.SUCCESS) {
                    refreshTable.value = !refreshTable.value;

                    VersaToast.fire({
                        icon: 'success',
                        title: 'Troncal eliminado correctamente',
                    });
                    return;
                }
                VersaToast.fire({
                    icon: 'error',
                    title: 'Error al eliminar el troncal',
                });
            } catch (error) {
                console.error('Error al eliminar el troncal:', error);
                VersaToast.fire({
                    icon: 'error',
                    title: 'Error al eliminar el troncal',
                });
            }
        }
    };

    const accion = (accion: AccionData) => {
        const actions: actionsType = {
            closeModal: () => {
                showModalForm.showModal = false;
                showModalForm.itemSelected = null;
            },
            reloadData: () => {
                refreshTable.value = !refreshTable.value;
            },
            editTrunk: () => editTrunk(accion.item),
            deleteTrunk: () => deleteTrunk(accion.item),
            default: () => console.log('Accion no encontrada'),
        };
        const selectedAction = actions[accion.accion] || actions['default'];
        if ('function' === typeof selectedAction) {
            selectedAction();
        }
    };
</script>
<template>
    <div class="px-2">
        <FormTrunk @accion="accion" />

        <!-- Contenedor con scroll para la tabla -->
        <div class="overflow-x-auto shadow-md sm:rounded-lg">
            <CustomTable
                @accion="accion"
                idTable="troncales"
                :refreshData="refreshTable"
                :urlData="`/${panelUrl}/chatbot/api/troncales/paginate/${empresaSelected}/${channelSelected.value.id}`">
                <template #buttons>
                    <div class="flex justify-between items-center py-4">
                        <h2>Canal seleccionado: {{ channelSelected.value.nombre }}</h2>
                        <div>
                            <button
                                :disabled="!channelSelected.value.id || channelSelected.value.id == 9999999"
                                @click="showModalForm.showModal = true"
                                type="button"
                                class="bg-brand text-white px-4 py-2 rounded"
                                :class="{
                                    'opacity-50 cursor-not-allowed':
                                        !channelSelected.value.id || channelSelected.value.id == 9999999,
                                }">
                                <i class="bi bi-plus"></i>
                                Agregar Troncal
                            </button>
                        </div>
                    </div>
                </template>
            </CustomTable>
        </div>
    </div>
</template>
<style scoped>
    /* Estilos personalizados para mejorar la apariencia de la tabla */
    .table-fixed {
        table-layout: fixed;
    }

    /* Asegurar que las columnas mantengan su ancho fijo */
    .table-fixed th:nth-child(1) {
        width: 25%;
    }
    .table-fixed th:nth-child(2) {
        width: 40%;
    }
    .table-fixed th:nth-child(3) {
        width: 16.666%;
    }
    .table-fixed th:nth-child(4) {
        width: 16.666%;
    }
    .table-fixed th:nth-child(5) {
        width: 8.333%;
    }

    /* Mejorar la legibilidad con mejor spacing */
    .table-fixed td {
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* Hover más suave en filas */
    .table-fixed tbody tr:hover {
        transform: scale(1.002);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    /* Efecto en botones de acción */
    .table-fixed button:hover {
        transform: scale(1.1);
    }

    /* Responsive para dispositivos móviles */
    @media (max-width: 768px) {
        .table-fixed th:nth-child(3),
        .table-fixed th:nth-child(4),
        .table-fixed td:nth-child(3),
        .table-fixed td:nth-child(4) {
            display: none;
        }

        .table-fixed th:nth-child(1) {
            width: 40%;
        }
        .table-fixed th:nth-child(2) {
            width: 45%;
        }
        .table-fixed th:nth-child(5) {
            width: 15%;
        }
    }
</style>
