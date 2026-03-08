<script setup lang="ts">
    import type { AccionData, actionsType } from 'versaTypes';
    import { inject, ref } from 'vue';

    import CustomTable from '@/dashboard/js/components/customTable.vue';

    const panelUrl = inject<string>('panelUrl', ''); // Obtiene el panel URL desde la inyección

    const emit = defineEmits<{
        accion: (data: AccionData) => void;
    }>();

    const empresaSelected = inject<string>('empresaSelected', '');
    const buttonSelected = ref('');
    const externalFilters = ref('');
    const refreshTable = ref(false);

    const setFilterExterno = (filter: string) => {
        externalFilters.value = filter;
        refreshTable.value = !refreshTable.value;
    };

    const accion = (accion: AccionData) => {
        const actions: actionsType = {
            default: () => {
                emit('accion', accion);
            },
        };
        const fn = actions[accion.accion] || actions['default'];
        if (typeof fn === 'function') {
            fn();
        }
    };
</script>
<template>
    <div class="flex-1 relative overflow-y-auto">
        <CustomTable
            title="Flujos Disponibles"
            id="tableFlujos"
            @accion="accion"
            :urlData="`/${panelUrl}/chatbot/flowBuilder/api/getFlow/${empresaSelected}`"
            :externalFilters="externalFilters"
            :refreshData="refreshTable">
            <template v-slot:buttons>
                <div class="flex justify-between gap-2">
                    <button
                        @click="$emit('accion', { accion: 'newFlow' })"
                        class="text-white bg-brand hover:bg-brand-600 focus:ring-4 focus:outline-none focus:ring-brand/30 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-brand dark:hover:bg-brand-600 dark:focus:ring-brand-600 cursor-pointer">
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

                        <span class="max-lg:hidden ms-2">Agregar Nuevo Flujo</span>
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
                                setFilterExterno(`cf.status='active'`);
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
                                setFilterExterno(`cf.status='archived'`);
                            ">
                            <span class="w-2 h-2 rounded-full bg-red-500" v-if="buttonSelected !== 'Inactivos'"></span>
                            Archivados
                        </button>
                        <button
                            type="button"
                            class="px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                            :class="
                                buttonSelected === 'draft'
                                    ? 'bg-white dark:bg-black text-orange-500 shadow-sm'
                                    : 'text-gray-500 hover:text-orange-500'
                            "
                            @click="
                                buttonSelected = 'draft';
                                setFilterExterno(`cf.status='draft'`);
                            ">
                            <span class="w-2 h-2 rounded-full bg-orange-500" v-if="buttonSelected !== 'draft'"></span>
                            En desarrollo
                        </button>
                    </div>
                </div>
            </template>
        </CustomTable>
    </div>
</template>
