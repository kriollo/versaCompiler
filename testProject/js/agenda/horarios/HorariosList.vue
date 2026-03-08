<script setup lang="ts">
    import Swal from 'sweetalert2';
    import { inject, ref, type Ref } from 'vue';

    import HorarioForm from '@/dashboard/js/agenda/horarios/HorarioForm.vue';
    import { defaultHorario, ShowModalHorarioInject } from '@/dashboard/js/agenda/InjectKeys';
    import customTable from '@/dashboard/js/components/customTable.vue';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaFetch } from '@/dashboard/js/functions';
    import type { AccionData, actionsType, VersaParamsFetch } from '@/dashboard/types/versaTypes';

    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', '');
    const refreshTable = ref(false);
    const modalState = ShowModalHorarioInject.inject();

    const accion = (data: AccionData) => {
        const actions: actionsType = {
            closeModalReloadTable: () => {
                refreshTable.value = !refreshTable.value;
                modalState.show = false;
                modalState.item = null;
            },
            closeModal: () => {
                modalState.show = false;
                modalState.item = null;
            },
            editHorario: () => {
                modalState.show = true;
                modalState.item = {
                    ...data.item,
                    action: 'edit',
                    dias_semana: JSON.parse(data.item.dias_semana || '[]'),
                };
            },
            deleteHorario: async () => {
                const result = await Swal.fire({
                    title: '¿Desactivar horario?',
                    text: `Se desactivará "${data.item.nombre}". Los recursos asociados quedarán sin horario activo.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, desactivar',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#ef4444',
                });
                if (!result.isConfirmed) {
                    return;
                }

                const params: VersaParamsFetch = {
                    url: `/${panelUrl}/agenda/api/horarios`,
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({ id: data.item.id, csrf_token: csrf_token.value }),
                };
                const response = await versaFetch(params);
                if (response.success === API_RESPONSE_CODES.SUCCESS) {
                    Swal.fire({ title: '¡Desactivado!', icon: 'success', timer: 1200, showConfirmButton: false });
                    refreshTable.value = !refreshTable.value;
                } else {
                    Swal.fire({ title: 'Error', text: response.message, icon: 'error' });
                }
            },
        };
        const fn = actions[data.accion];
        if (typeof fn === 'function') {
            fn();
        }
    };

    const openCreate = () => {
        modalState.show = true;
        modalState.item = { ...defaultHorario };
    };
</script>

<template>
    <div>
        <customTable
            id="agenda-horarios"
            tabla-title="Horarios de Atención"
            :urlData="`/${panelUrl}/agenda/api/horarios`"
            :refreshData="refreshTable"
            fieldOrder="nombre"
            @accion="accion">
            <template #buttons>
                <div class="flex justify-end px-2 pb-2">
                    <button
                        type="button"
                        @click="openCreate"
                        class="flex items-center gap-2 bg-brand hover:bg-brand-600 text-black font-bold rounded-lg px-4 py-2.5 text-sm transition-all">
                        <i class="bi bi-plus-lg"></i>
                        <span>Nuevo Horario</span>
                    </button>
                </div>
            </template>
        </customTable>
        <HorarioForm @accion="accion" />
    </div>
</template>
