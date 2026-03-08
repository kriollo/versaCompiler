<script setup lang="ts">
    import { inject, ref, type Ref, watch } from 'vue';

    import modal from '@/dashboard/js/components/modal.vue';
    import { fetchGetAdicionalesFactura } from '@/dashboard/js/empresa/fetchEmpresa';
    import { AdicionalFacturaInjection, type AdicionalItem } from '@/dashboard/js/empresa/InjectKeys';
    import { showErrorResponse, versaAlert, versaFetch, VersaToast } from '@/dashboard/js/functions';
    import { monedasDisponibles } from '@/dashboard/js/planes/planType';
    import type { AccionData, actionsType, VersaParamsFetch } from '@/dashboard/types/versaTypes';

    const emit = defineEmits(['accion']);

    const adicionalFactura = AdicionalFacturaInjection.inject();

    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', '');

    const items = ref<AdicionalItem[]>([]);
    const currentItem = ref<AdicionalItem>({
        descripcion: '',
        valor: 0,
        moneda: monedasDisponibles[0]?.value || 'CLP',
        estado: true,
    });
    const editingIndex = ref<number | null>(null);
    const saveLoading = ref(false);

    const accion = (data: AccionData): void => {
        const actions: actionsType = {
            closeModal: () => {
                adicionalFactura.showModal = false;
                adicionalFactura.empresa_id = 0;
                items.value = [];
            },
            default: () => emit('accion', data),
        };
        const fn = actions[data.accion] || actions['default'];
        if ('function' === typeof fn) {
            fn();
        }
    };

    const addItem = () => {
        if (!currentItem.value.descripcion || !currentItem.value.valor) {
            VersaToast.fire({
                title: 'Campos incompletos',
                text: 'Por favor, completa el detalle y el valor.',
                icon: 'warning',
            });
            return;
        }

        if (editingIndex.value !== null) {
            // Editar item existente
            items.value[editingIndex.value] = { ...currentItem.value };
            editingIndex.value = null;
        } else {
            // Agregar nuevo item
            items.value.push({ ...currentItem.value });
        }

        // Limpiar formulario
        currentItem.value = {
            descripcion: '',
            valor: 0,
            moneda: monedasDisponibles[0]?.value || 'CLP',
            estado: true,
        };
    };

    const editItem = (index: number) => {
        const item = items.value[index];
        if (!item) {
            return;
        }

        currentItem.value = {
            id: item.id,
            descripcion: item.descripcion,
            valor: item.valor,
            moneda: item.moneda,
            estado: item.estado,
        };
        editingIndex.value = index;
    };

    const removeItem = (index: number) => {
        items.value.splice(index, 1);
        // Si estaba editando este item, cancelar la edición
        if (editingIndex.value === index) {
            cancelEdit();
        }
    };

    const cancelEdit = () => {
        currentItem.value = {
            descripcion: '',
            valor: 0,
            moneda: monedasDisponibles[0]?.value || 'CLP',
            estado: true,
        };
        editingIndex.value = null;
    };

    const saveAdicionales = async () => {
        if (items.value.length === 0) {
            VersaToast.fire({
                title: 'Sin items',
                text: 'Debes agregar al menos un item antes de guardar.',
                icon: 'warning',
            });
            return;
        }

        saveLoading.value = true;
        const params = {
            url: `/${panelUrl}/empresas/api/saveAdicionalEmpresa`,
            method: 'POST',
            data: {
                empresa_id: adicionalFactura.empresa_id,
                items: JSON.stringify(items.value),
                csrf_token: csrf_token.value,
            },
        } as VersaParamsFetch;

        const response = await versaFetch(params);

        if (response.success === 0) {
            saveLoading.value = false;
            showErrorResponse(response);
            return;
        }

        await versaAlert({
            title: 'Adicionales guardados',
            message: 'Los detalles adicionales se han guardado correctamente.',
            type: 'success',
        });
        saveLoading.value = false;
    };

    const formatCurrency = (value: string) => {
        const num = Number.parseFloat(value.replaceAll(/[^\d.-]/g, ''));
        if (Number.isNaN(num)) {
            return '';
        }
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
        }).format(num);
    };

    watch(
        () => adicionalFactura.showModal,
        async newVal => {
            if (newVal) {
                const response = await fetchGetAdicionalesFactura(adicionalFactura.empresa_id);
                items.value = response.data || [];
            }
        },
    );
</script>

<template>
    <modal :showModal="adicionalFactura.showModal" @accion="accion" idModal="modalAdicionalFactura" size="max-w-4xl">
        <template v-slot:modalTitle>
            <div class="flex justify-between">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">Detalles Adicionales de Factura</h3>

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

        <template v-slot:modalBody>
            <div class="space-y-6">
                <!-- Formulario para agregar/editar item -->
                <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="text-sm font-semibold text-gray-900 dark:text-white">
                            {{ editingIndex !== null ? 'Editar Item' : 'Agregar Nuevo Item' }}
                        </h4>
                        <div class="flex gap-2">
                            <button
                                type="button"
                                class="text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 rounded-lg text-sm px-4 py-2 text-center inline-flex items-center dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
                                @click="addItem">
                                <svg
                                    class="w-4 h-4 mr-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M12 4v16m8-8H4"></path>
                                </svg>
                                {{ editingIndex !== null ? 'Actualizar' : 'Agregar' }}
                            </button>
                            <button
                                v-if="editingIndex !== null"
                                type="button"
                                class="text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-4 focus:outline-none focus:ring-gray-300 rounded-lg text-sm px-4 py-2 text-center inline-flex items-center dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white"
                                @click="cancelEdit">
                                Cancelar
                            </button>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label
                                for="descripcion"
                                class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                Descripción
                            </label>
                            <input
                                v-model="currentItem.descripcion"
                                type="text"
                                id="descripcion"
                                class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand dark:focus:border-brand"
                                placeholder="Descripción del detalle"
                                @keyup.enter="addItem" />
                        </div>
                        <div>
                            <label for="valor" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                Valor
                            </label>
                            <input
                                v-model="currentItem.valor"
                                type="text"
                                id="valor"
                                class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand dark:focus:border-brand"
                                placeholder="$0"
                                @keyup.enter="addItem" />
                        </div>
                        <div>
                            <label for="moneda" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                Moneda
                            </label>
                            <select
                                v-model="currentItem.moneda"
                                id="moneda"
                                class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand dark:focus:border-brand">
                                <option v-for="moneda in monedasDisponibles" :key="moneda.value" :value="moneda.value">
                                    {{ moneda.label }}
                                </option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Lista de items -->
                <div class="space-y-2">
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-white">
                        Items Agregados ({{ items.length }})
                    </h4>

                    <div v-if="items.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
                        <svg
                            class="w-12 h-12 mx-auto mb-2 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <p>No hay items agregados aún</p>
                    </div>

                    <div class="max-h-64 overflow-y-auto space-y-2">
                        <div
                            v-for="(item, index) in items"
                            :key="index"
                            class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg dark:bg-gray-700 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            :class="{ 'ring-2 ring-brand': editingIndex === index }">
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {{ item.descripcion }}
                                </p>
                                <p class="text-sm text-gray-500 dark:text-gray-400">
                                    {{ formatCurrency(item.valor) }}
                                </p>
                                <p class="text-sm text-gray-500 dark:text-gray-400">Moneda: {{ item.moneda }}</p>
                            </div>
                            <div class="flex gap-2 ml-4">
                                <button
                                    v-if="item.estado"
                                    type="button"
                                    class="text-brand-600 hover:text-white border border-brand-600 hover:bg-brand-700 focus:ring-4 focus:outline-none focus:ring-brand/30 font-medium rounded-lg text-xs px-3 py-1.5 text-center dark:border-brand dark:text-brand dark:hover:text-white dark:hover:bg-brand dark:focus:ring-brand-600"
                                    @click="editItem(index)">
                                    <svg
                                        class="w-3 h-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg">
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                </button>
                                <button
                                    v-if="item.estado"
                                    type="button"
                                    class="text-red-700 hover:text-white border border-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-xs px-3 py-1.5 text-center dark:border-red-500 dark:text-red-500 dark:hover:text-white dark:hover:bg-red-600 dark:focus:ring-red-900"
                                    @click="removeItem(index)">
                                    <svg
                                        class="w-3 h-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg">
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                </button>
                                <button
                                    v-if="item.estado"
                                    type="button"
                                    title="Deshabilitar item"
                                    class="text-yellow-500 border border-yellow-500 hover:bg-yellow-500 hover:text-white focus:ring-4 focus:outline-none focus:ring-yellow-300 font-medium rounded-lg text-xs px-3 py-1.5 text-center dark:border-yellow-400 dark:text-yellow-400 dark:hover:bg-yellow-400 dark:hover:text-white dark:focus:ring-yellow-800"
                                    @click="item.estado = false">
                                    <svg
                                        class="w-3 h-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg">
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                </button>
                                <button
                                    v-else
                                    type="button"
                                    title="Habilitar item"
                                    class="text-green-600 border border-green-600 hover:bg-green-600 hover:text-white focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-xs px-3 py-1.5 text-center dark:border-green-500 dark:text-green-500 dark:hover:bg-green-500 dark:hover:text-white dark:focus:ring-green-800"
                                    @click="item.estado = true">
                                    <svg
                                        class="w-3 h-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg">
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M5 13l4 4L19 7"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </template>

        <template #modalFooter>
            <div class="flex justify-end gap-2">
                <button
                    type="button"
                    class="text-white bg-brand-600 hover:bg-brand-700 focus:ring-4 focus:outline-none focus:ring-brand/30 rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-brand dark:hover:bg-brand-600 dark:focus:ring-brand-600"
                    @click="saveAdicionales">
                    <span
                        v-if="saveLoading"
                        class="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"></span>
                    <svg
                        class="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Guardar Todos
                </button>
                <button
                    type="button"
                    class="text-white bg-corporate-orange-700 hover:bg-corporate-orange-800 focus:ring-4 focus:outline-none focus:ring-corporate-orange-300 rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-corporate-orange-600 dark:hover:bg-corporate-orange-700 dark:focus:ring-corporate-orange-800"
                    @click="accion({ accion: 'closeModal' })">
                    Cancelar
                </button>
            </div>
        </template>
    </modal>
</template>

<style scoped></style>
