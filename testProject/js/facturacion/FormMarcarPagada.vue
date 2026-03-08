<script setup lang="ts">
    import { ref, watch } from 'vue';

    import Modal from '@/dashboard/js/components/modal.vue';
    import type { Factura } from '@/dashboard/js/facturacion/facturacionType';
    import { versaAlert } from '@/dashboard/js/functions';
    import type { AccionData, actionsType } from '@/dashboard/types/versaTypes';

    interface Props {
        show: boolean;
        factura: Factura;
    }

    const props = defineProps<Props>();
    const emit = defineEmits(['update:show', 'confirmar']);

    const formData = ref({
        id: 0,
        fecha_pago: new Date().toISOString().split('T')[0],
        metodo_pago: '',
        referencia_pago: '',
    });

    const metodosPago = [
        { value: 'Transferencia', label: 'Transferencia Bancaria' },
        { value: 'Tarjeta', label: 'Tarjeta de Crédito/Débito' },
        { value: 'Efectivo', label: 'Efectivo' },
        { value: 'Cheque', label: 'Cheque' },
        { value: 'Otro', label: 'Otro' },
    ];

    watch(
        () => props.show,
        newVal => {
            if (newVal && props.factura.id) {
                formData.value = {
                    id: props.factura.id,
                    fecha_pago: new Date().toISOString().split('T')[0],
                    metodo_pago: '',
                    referencia_pago: '',
                };
            }
        },
    );

    const closeModal = () => {
        emit('update:show', false);
    };

    const confirmar = () => {
        if (!formData.value.metodo_pago) {
            versaAlert({
                title: 'Error',
                message: 'Debe seleccionar un método de pago',
                type: 'error',
            });
            return;
        }

        emit('confirmar', formData.value);
    };

    const accion = (data: AccionData) => {
        const actions: actionsType = {
            closeModal: () => closeModal(),
            confirmar: () => confirmar(),
            default: () => {
                console.log('Acción:', data);
            },
        };
        const fn = actions[data.accion] || actions.default;
        if (typeof fn === 'function') {
            fn();
        }
    };
</script>

<template>
    <Modal :idModal="'marcarPagada'" :showModal="show" @accion="accion" :size="'max-w-lg'">
        <template v-slot:modalTitle>
            <div class="flex justify-between items-center w-full border-b border-gray-200 dark:border-gray-800 pb-4">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/20">
                        <i class="bi bi-check-circle text-xl text-white"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-900 dark:text-white">Marcar como Pagada</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400">Factura {{ factura.numero_factura }}</p>
                    </div>
                </div>

                <button
                    type="button"
                    class="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-50 hover:text-red-500 transition-colors"
                    @click="closeModal">
                    <i class="bi bi-x-lg text-sm"></i>
                </button>
            </div>
        </template>

        <template v-slot:modalBody>
            <div class="space-y-6">
                <!-- Info Factura -->
                <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-gray-500 dark:text-gray-400">Total:</span>
                            <p class="font-bold text-gray-900 dark:text-white">
                                {{ factura.total }} {{ factura.moneda }}
                            </p>
                        </div>
                        <div>
                            <span class="text-gray-500 dark:text-gray-400">Periodo:</span>
                            <p class="font-bold text-gray-900 dark:text-white">
                                {{ factura.periodo_mes }}/{{ factura.periodo_anio }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Fecha de Pago -->
                <div class="group">
                    <label
                        for="fecha_pago"
                        class="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Fecha de Pago
                    </label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <i class="bi bi-calendar-check text-gray-400"></i>
                        </div>
                        <input
                            type="date"
                            id="fecha_pago"
                            v-model="formData.fecha_pago"
                            class="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    </div>
                </div>

                <!-- Método de Pago -->
                <div class="group">
                    <label
                        for="metodo_pago"
                        class="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Método de Pago
                    </label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <i class="bi bi-credit-card text-gray-400"></i>
                        </div>
                        <select
                            id="metodo_pago"
                            v-model="formData.metodo_pago"
                            class="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent">
                            <option value="">Seleccione...</option>
                            <option v-for="metodo in metodosPago" :key="metodo.value" :value="metodo.value">
                                {{ metodo.label }}
                            </option>
                        </select>
                    </div>
                </div>

                <!-- Referencia de Pago -->
                <div class="group">
                    <label
                        for="referencia_pago"
                        class="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Referencia de Pago (Opcional)
                    </label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <i class="bi bi-hash text-gray-400"></i>
                        </div>
                        <input
                            type="text"
                            id="referencia_pago"
                            v-model="formData.referencia_pago"
                            class="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="N° de transacción, cheque, etc." />
                    </div>
                </div>
            </div>
        </template>

        <template v-slot:modalFooter>
            <div class="flex items-center justify-end gap-3 w-full border-t border-gray-200 dark:border-gray-800 pt-4">
                <button
                    type="button"
                    @click="closeModal"
                    class="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    Cancelar
                </button>
                <button
                    type="button"
                    @click="accion({ accion: 'confirmar' })"
                    class="px-6 py-2.5 rounded-xl text-sm font-bold bg-green-600 text-white hover:bg-green-700 transition-all shadow-lg flex items-center gap-2">
                    <i class="bi bi-check-lg"></i>
                    Confirmar Pago
                </button>
            </div>
        </template>
    </Modal>
</template>
