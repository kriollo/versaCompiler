<script setup lang="ts">
    import Swal from 'sweetalert2';
    import { inject, ref, type Ref } from 'vue';

    import CitaForm from '@/dashboard/js/agenda/citas/CitaForm.vue';
    import { ShowModalCitaInject } from '@/dashboard/js/agenda/InjectKeys';
    import customTable from '@/dashboard/js/components/customTable.vue';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaFetch, VersaToast } from '@/dashboard/js/functions';
    import type { AccionData, actionsType, VersaParamsFetch } from '@/dashboard/types/versaTypes';

    const emit = defineEmits(['accion']);

    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', '');
    const refreshTable = ref(false);
    const modalCita = ShowModalCitaInject.inject();

    const cambiarEstado = async (id: number, estado: string, nombre: string) => {
        const textos: Record<string, string> = {
            confirmada: `¿Confirmar la cita de ${nombre}?`,
            cancelada: `¿Cancelar la cita de ${nombre}? Esta acción liberará el horario.`,
            completada: `¿Marcar como completada la cita de ${nombre}?`,
        };

        const result = await Swal.fire({
            title: textos[estado] ?? '¿Cambiar estado?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, confirmar',
            cancelButtonText: 'No',
        });

        if (!result.isConfirmed) {
            return;
        }

        const params: VersaParamsFetch = {
            url: `/${panelUrl}/agenda/api/citas/estado`,
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({ id, estado, csrf_token: csrf_token.value }),
        };

        const response = await versaFetch(params);
        if (response.success === API_RESPONSE_CODES.SUCCESS) {
            refreshTable.value = !refreshTable.value;
            emit('accion', { accion: 'refreshCalendar' });
        } else {
            Swal.fire({ title: 'Error', text: response.message, icon: 'error' });
        }
    };

    const enviarRecordatorio = async (id: number, nombre: string) => {
        const result = await Swal.fire({
            title: `¿Enviar recordatorio a ${nombre}?`,
            text: 'Se enviará el correo de recordatorio al cliente.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, enviar',
            cancelButtonText: 'No',
        });

        if (!result.isConfirmed) {
            return;
        }

        const params: VersaParamsFetch = {
            url: `/${panelUrl}/agenda/api/citas/recordatorio`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({ id, csrf_token: csrf_token.value }),
        };

        const response = await versaFetch(params);
        if (response.success === API_RESPONSE_CODES.SUCCESS) {
            VersaToast.fire({ title: response.message ?? 'Recordatorio enviado', icon: 'success' });
        } else {
            Swal.fire({ title: 'Error', text: response.message, icon: 'error' });
        }
    };

    const accion = (data: AccionData) => {
        const actions: actionsType = {
            closeModalReloadTable: () => {
                refreshTable.value = !refreshTable.value;
                modalCita.show = false;
                emit('accion', { accion: 'refreshCalendar' });
            },
            closeModal: () => {
                modalCita.show = false;
            },
            confirmarCita: () => cambiarEstado(data.item.id, 'confirmada', data.item.nombre_cliente),
            cancelarCita: () => cambiarEstado(data.item.id, 'cancelada', data.item.nombre_cliente),
            completarCita: () => cambiarEstado(data.item.id, 'completada', data.item.nombre_cliente),
            enviarRecordatorio: () => enviarRecordatorio(data.item.id, data.item.nombre_cliente),
        };
        const fn = actions[data.accion];
        if (typeof fn === 'function') {
            fn();
        }
    };
</script>

<template>
    <div>
        <customTable
            id="agenda-citas"
            tabla-title="Listado de Citas"
            :urlData="`/${panelUrl}/agenda/api/citas`"
            :refreshData="refreshTable"
            fieldOrder="fecha"
            @accion="accion" />
        <CitaForm @accion="accion" />
    </div>
</template>
