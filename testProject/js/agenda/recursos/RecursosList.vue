<script setup lang="ts">
    import Swal from 'sweetalert2';
    import { inject, ref, type Ref } from 'vue';

    import { defaultRecurso, ShowModalRecursoInject } from '@/dashboard/js/agenda/InjectKeys';
    import RecursoForm from '@/dashboard/js/agenda/recursos/RecursoForm.vue';
    import customTable from '@/dashboard/js/components/customTable.vue';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaFetch } from '@/dashboard/js/functions';
    import type { AccionData, actionsType, VersaParamsFetch } from '@/dashboard/types/versaTypes';

    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', '');
    const refreshTable = ref(false);
    const modalState = ShowModalRecursoInject.inject();

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
            editRecurso: async () => {
                // Cargar descansos del recurso
                const res = await versaFetch({
                    url: `/${panelUrl}/agenda/api/recursos/descansos?id_recurso=${data.item.id}`,
                    method: 'GET',
                });
                const rawDescansos: any[] = res.success === API_RESPONSE_CODES.SUCCESS ? res.data : [];
                const descansos = rawDescansos.map((d: any) => {
                    d.dias_semana = JSON.parse(d.dias_semana || '[]');
                    return d;
                });

                modalState.show = true;
                modalState.item = {
                    ...data.item,
                    action: 'edit',
                    descansos,
                };
            },
            deleteRecurso: async () => {
                const result = await Swal.fire({
                    title: '¿Desactivar recurso?',
                    text: `Se desactivará "${data.item.nombre}". Las citas futuras no se verán afectadas.`,
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
                    url: `/${panelUrl}/agenda/api/recursos`,
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
        modalState.item = { ...defaultRecurso };
    };
</script>

<template>
    <div>
        <customTable
            id="agenda-recursos"
            tabla-title="Recursos"
            :urlData="`/${panelUrl}/agenda/api/recursos`"
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
                        <span>Nuevo Recurso</span>
                    </button>
                </div>
            </template>
        </customTable>
        <RecursoForm @accion="accion" />
    </div>
</template>
