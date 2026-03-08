<script setup lang="ts">
    import { computed } from 'vue';

    import Modal from '@/dashboard/js/components/modal.vue';
    import type { Factura } from '@/dashboard/js/facturacion/facturacionType';
    import { formatCurrency } from '@/dashboard/js/functions';
    import { formatDate } from '@/dashboard/js/utils/DateUtils';

    interface Props {
        show: boolean;
        factura: Factura;
    }

    const props = defineProps<Props>();
    const emit = defineEmits(['update:show', 'accion']);

    const closeModal = () => {
        emit('update:show', false);
    };

    const estadoBadgeClass = computed(() => {
        const classes = {
            pendiente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            pagada: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
            vencida: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
            cancelada: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
        };
        return classes[props.factura.estado || 'pendiente'];
    });

    const estadoTexto = computed(() => {
        const textos = {
            pendiente: 'Pendiente',
            pagada: 'Pagada',
            vencida: 'Vencida',
            cancelada: 'Cancelada',
        };
        return textos[props.factura.estado || 'pendiente'];
    });

    const totalItems = computed(() => {
        if (!props.factura.items) {
            return 0;
        }
        return props.factura.items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
    });

    const convertDate = (date: any) => {
        if (!date) {
            return '';
        }

        let dateString: string = '';

        // Si es un objeto PHP DateTime { date: "...", timezone_type: 3, timezone: "..." }
        if (typeof date === 'object' && date.date) {
            dateString = date.date;
        }
        // Si es un string JSON
        else if (typeof date === 'string' && date.includes('{')) {
            try {
                const parsed = JSON.parse(date);
                dateString = parsed.date ?? '';
            } catch {
                return '';
            }
        }
        // Si es un string de fecha normal
        else if (typeof date === 'string') {
            dateString = date;
        } else {
            return '';
        }

        const dateObj = new Date(dateString);
        return formatDate(dateObj);
    };

    const formatCurrencyValue = (value: number | string) => formatCurrency(Number(value), props.factura.moneda);
</script>

<template>
    <Modal :idModal="'facturaDetalle'" :showModal="show" @accion="closeModal" :size="'max-w-4xl'">
        <template v-slot:modalTitle>
            <div class="flex justify-between items-center w-full border-b border-gray-200 dark:border-gray-800 pb-4">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
                        <i class="bi bi-file-earmark-text-fill text-xl text-white"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                            Factura {{ factura.numero_factura }}
                        </h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            Periodo: {{ factura.periodo_mes }}/{{ factura.periodo_anio }}
                        </p>
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
                <!-- Info General -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Estado</label>
                        <div class="mt-1">
                            <span :class="estadoBadgeClass" class="px-3 py-1 rounded-full text-sm font-bold">
                                {{ estadoTexto }}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Emisión</label>
                        <p class="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {{ convertDate(factura.fecha_emision) }}
                        </p>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Vencimiento</label>
                        <p class="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {{ convertDate(factura.fecha_vencimiento) }}
                        </p>
                    </div>
                    <div v-if="factura.fecha_pago">
                        <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Pago</label>
                        <p class="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {{ convertDate(factura.fecha_pago) }}
                        </p>
                    </div>
                </div>

                <!-- Items de la Factura -->
                <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                    <h4 class="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">
                        Detalle de Items
                    </h4>
                    <div class="space-y-2">
                        <div
                            v-for="item in factura.items"
                            :key="item.id"
                            class="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <div class="flex-1">
                                <p class="text-sm font-medium text-gray-900 dark:text-white">
                                    {{ item.descripcion }}
                                </p>
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    Cantidad: {{ item.cantidad }} × {{ formatCurrencyValue(item.precio_unitario) }}
                                    {{ factura.moneda }}
                                </p>
                            </div>
                            <div class="text-right">
                                <p class="text-sm font-bold text-gray-900 dark:text-white">
                                    {{ formatCurrencyValue(item.subtotal) }} {{ factura.moneda }}
                                </p>
                                <span
                                    class="text-xs px-2 py-0.5 rounded-full"
                                    :class="{
                                        'bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-300':
                                            item.tipo === 'plan_base',
                                        'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300':
                                            item.tipo === 'adicional',
                                        'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300':
                                            item.tipo === 'consumo',
                                    }">
                                    {{ item.tipo }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Totales -->
                <div
                    class="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6">
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Subtotal:</span>
                            <span class="text-lg font-semibold text-gray-900 dark:text-white">
                                {{ formatCurrencyValue(factura.subtotal) }}
                            </span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Impuestos:</span>
                            <span class="text-lg font-semibold text-gray-900 dark:text-white">
                                {{ formatCurrencyValue(factura.impuestos) }}
                            </span>
                        </div>
                        <div
                            class="flex justify-between items-center pt-3 border-t-2 border-gray-400 dark:border-gray-600">
                            <span class="text-lg font-bold text-gray-900 dark:text-white">TOTAL:</span>
                            <span class="text-2xl font-bold text-brand">
                                {{ formatCurrencyValue(factura.total) }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Notas -->
                <div
                    v-if="factura.notas"
                    class="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-4 border border-brand-200 dark:border-brand-800">
                    <h4 class="text-sm font-bold text-brand-900 dark:text-brand-100 mb-2">Notas:</h4>
                    <p class="text-sm text-brand-800 dark:text-brand-200">{{ factura.notas }}</p>
                </div>

                <!-- Info de Pago -->
                <div
                    v-if="factura.metodo_pago || factura.referencia_pago"
                    class="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                    <h4 class="text-sm font-bold text-green-900 dark:text-green-100 mb-2">Información de Pago:</h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div v-if="factura.metodo_pago">
                            <span class="text-green-700 dark:text-green-300 font-medium">Método:</span>
                            <span class="ml-2 text-green-900 dark:text-green-100">{{ factura.metodo_pago }}</span>
                        </div>
                        <div v-if="factura.referencia_pago">
                            <span class="text-green-700 dark:text-green-300 font-medium">Referencia:</span>
                            <span class="ml-2 text-green-900 dark:text-green-100">{{ factura.referencia_pago }}</span>
                        </div>
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
                    Cerrar
                </button>
                <button
                    type="button"
                    class="px-6 py-2.5 rounded-xl text-sm font-bold bg-brand text-white hover:bg-brand-600 transition-all shadow-lg flex items-center gap-2">
                    <i class="bi bi-download"></i>
                    Descargar PDF
                </button>
            </div>
        </template>
    </Modal>
</template>
