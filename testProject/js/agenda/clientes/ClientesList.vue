<script setup lang="ts">
    import { inject, ref } from 'vue';

    import ClienteForm from '@/dashboard/js/agenda/clientes/ClienteForm.vue';
    import { defaultCliente, ShowModalClienteInject } from '@/dashboard/js/agenda/InjectKeys';
    import customTable from '@/dashboard/js/components/customTable.vue';
    import type { AccionData, actionsType } from '@/dashboard/types/versaTypes';

    const panelUrl = inject<string>('panelUrl', '');
    const refreshTable = ref(false);
    const modalState = ShowModalClienteInject.inject();

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
            editCliente: () => {
                modalState.show = true;
                modalState.item = { ...data.item, action: 'edit' };
            },
        };
        const fn = actions[data.accion];
        if (typeof fn === 'function') {
            fn();
        }
    };

    const openCreate = () => {
        modalState.show = true;
        modalState.item = { ...defaultCliente };
    };
</script>

<template>
    <div>
        <customTable
            id="agenda-clientes"
            tabla-title="Clientes"
            :urlData="`/${panelUrl}/agenda/api/clientes`"
            :refreshData="refreshTable"
            fieldOrder="nombre"
            @accion="accion">
            <template #buttons>
                <div class="flex justify-end px-2 pb-2">
                    <button
                        type="button"
                        @click="openCreate"
                        class="flex items-center gap-2 bg-brand hover:bg-brand-600 text-black font-bold rounded-lg px-4 py-2.5 text-sm transition-all">
                        <i class="bi bi-person-plus-fill"></i>
                        <span>Nuevo Cliente</span>
                    </button>
                </div>
            </template>
        </customTable>
        <ClienteForm @accion="accion" />
    </div>
</template>
