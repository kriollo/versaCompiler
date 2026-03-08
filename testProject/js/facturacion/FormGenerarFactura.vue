<script setup lang="ts">
    import type { AccionData, actionsType, VersaFetchResponse } from 'versaTypes';
    import { computed, inject, ref, type Ref, watch } from 'vue';

    import Loader from '@/dashboard/js/components/loader.vue';
    import Modal from '@/dashboard/js/components/modal.vue';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { fetchGetEmpresas } from '@/dashboard/js/empresa/fetchEmpresa';
    import { useModalFactura } from '@/dashboard/js/facturacion/facturacionType';
    import { versaAlert, versaFetch } from '@/dashboard/js/functions';

    const showModalFactura = useModalFactura.inject();
    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject('panelUrl', '');

    const empresas = ref<any[]>([]);
    const loadingEmpresas = ref(false);

    const formData = ref({
        id_empresa: 0,
        mes: new Date().getMonth() + 1,
        anio: new Date().getFullYear(),
        porcentaje_impuesto: 19,
        notas: '',
    });

    const meses = [
        { value: 1, label: 'Enero' },
        { value: 2, label: 'Febrero' },
        { value: 3, label: 'Marzo' },
        { value: 4, label: 'Abril' },
        { value: 5, label: 'Mayo' },
        { value: 6, label: 'Junio' },
        { value: 7, label: 'Julio' },
        { value: 8, label: 'Agosto' },
        { value: 9, label: 'Septiembre' },
        { value: 10, label: 'Octubre' },
        { value: 11, label: 'Noviembre' },
        { value: 12, label: 'Diciembre' },
    ];

    const anios = computed(() => {
        const currentYear = new Date().getFullYear();
        const years: number[] = [];
        for (let i: number = currentYear; i >= currentYear - 3; i--) {
            years.push(i);
        }
        return years;
    });

    const cargarEmpresas = async () => {
        loadingEmpresas.value = true;
        try {
            interface ResponseEmpresas extends VersaFetchResponse {
                data: any[];
            }

            const response = (await fetchGetEmpresas()) as ResponseEmpresas;

            if (response.success === API_RESPONSE_CODES.SUCCESS) {
                empresas.value = response.data || [];
            }
        } catch (error) {
            console.error('Error al cargar empresas:', error);
        } finally {
            loadingEmpresas.value = false;
        }
    };

    const generarFactura = async () => {
        if (formData.value.id_empresa === 0) {
            versaAlert({
                title: 'Error',
                message: 'Debe seleccionar una empresa',
                type: 'error',
            });
            return;
        }

        showModalFactura.loading = true;
        try {
            interface ResponseGenerar extends VersaFetchResponse {
                data?: any;
            }

            const response = (await versaFetch({
                url: `/${panelUrl}/facturacion/api/generarFactura`,
                method: 'POST',
                data: {
                    csrf_token: csrf_token.value,
                    ...formData.value,
                },
            })) as ResponseGenerar;

            if (response.success === API_RESPONSE_CODES.ERROR) {
                versaAlert({
                    title: 'Error',
                    message: response.message || 'No se pudo generar la factura',
                    type: 'error',
                });
                return;
            }

            versaAlert({
                title: 'Éxito',
                message: 'Factura generada correctamente',
                type: 'success',
            });

            showModalFactura.show = false;
            // Emitir evento para refrescar tabla
            window.dispatchEvent(new CustomEvent('refreshFacturas'));
        } catch {
            versaAlert({
                title: 'Error',
                message: 'Error al generar la factura',
                type: 'error',
            });
        } finally {
            showModalFactura.loading = false;
        }
    };

    watch(
        () => showModalFactura.show,
        newVal => {
            if (newVal) {
                formData.value = {
                    id_empresa: 0,
                    mes: new Date().getMonth() + 1,
                    anio: new Date().getFullYear(),
                    porcentaje_impuesto: 19,
                    notas: '',
                };
                if (empresas.value.length === 0) {
                    cargarEmpresas();
                }
            }
        },
    );

    const accion = (data: AccionData) => {
        const actions: actionsType = {
            closeModal: () => {
                showModalFactura.show = false;
            },
            saveForm: () => {
                generarFactura();
            },
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
    <Modal :idModal="'generarFactura'" :showModal="showModalFactura.show" @accion="accion" :size="'max-w-2xl'">
        <template v-slot:modalTitle>
            <div class="flex justify-between items-center w-full border-b border-gray-200 dark:border-gray-800 pb-4">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
                        <i class="bi bi-file-earmark-plus text-xl text-white"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-900 dark:text-white">Generar Nueva Factura</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            Crear factura para una empresa específica
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    class="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-50 hover:text-red-500 transition-colors"
                    @click="accion({ accion: 'closeModal' })">
                    <i class="bi bi-x-lg text-sm"></i>
                </button>
            </div>
        </template>

        <template v-slot:modalBody>
            <div class="space-y-6">
                <!-- Empresa -->
                <div class="group">
                    <label
                        for="id_empresa"
                        class="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Empresa
                    </label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <i class="bi bi-building text-gray-400"></i>
                        </div>
                        <select
                            id="id_empresa"
                            v-model="formData.id_empresa"
                            :disabled="loadingEmpresas"
                            class="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent transition-all">
                            <option :value="0">Seleccione una empresa...</option>
                            <option v-for="empresa in empresas" :key="empresa.id" :value="empresa.id">
                                {{ empresa.nombre }} - {{ empresa.rut }}
                            </option>
                        </select>
                    </div>
                </div>

                <!-- Periodo -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="group">
                        <label
                            for="mes"
                            class="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Mes
                        </label>
                        <select
                            id="mes"
                            v-model="formData.mes"
                            class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent">
                            <option v-for="mes in meses" :key="mes.value" :value="mes.value">
                                {{ mes.label }}
                            </option>
                        </select>
                    </div>

                    <div class="group">
                        <label
                            for="anio"
                            class="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Año
                        </label>
                        <select
                            id="anio"
                            v-model="formData.anio"
                            class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent">
                            <option v-for="anio in anios" :key="anio" :value="anio">
                                {{ anio }}
                            </option>
                        </select>
                    </div>
                </div>

                <!-- Porcentaje Impuesto -->
                <div class="group">
                    <label
                        for="porcentaje_impuesto"
                        class="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Porcentaje Impuesto (%)
                    </label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <i class="bi bi-percent text-gray-400"></i>
                        </div>
                        <input
                            type="number"
                            id="porcentaje_impuesto"
                            v-model="formData.porcentaje_impuesto"
                            min="0"
                            max="100"
                            step="0.01"
                            class="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent"
                            placeholder="19.00" />
                    </div>
                </div>

                <!-- Notas -->
                <div class="group">
                    <label
                        for="notas"
                        class="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Notas (Opcional)
                    </label>
                    <textarea
                        id="notas"
                        v-model="formData.notas"
                        rows="3"
                        class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent resize-none"
                        placeholder="Observaciones adicionales..."></textarea>
                </div>

                <!-- Info -->
                <div
                    class="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-4 border border-brand-200 dark:border-brand-800 flex items-start gap-3">
                    <i class="bi bi-info-circle text-brand dark:text-brand-400 text-xl mt-0.5"></i>
                    <div class="text-sm text-brand-800 dark:text-brand-200">
                        <p class="font-semibold mb-1">Información:</p>
                        <ul class="list-disc list-inside space-y-1 text-xs">
                            <li>La factura incluirá el plan base y los adicionales activos</li>
                            <li>Se verificará que no exista una factura para el periodo seleccionado</li>
                            <li>La fecha de vencimiento será 15 días después de la emisión</li>
                        </ul>
                    </div>
                </div>
            </div>
        </template>

        <template v-slot:modalFooter>
            <div class="flex items-center justify-end gap-3 w-full border-t border-gray-200 dark:border-gray-800 pt-4">
                <button
                    type="button"
                    @click="accion({ accion: 'closeModal' })"
                    class="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    :disabled="showModalFactura.loading">
                    Cancelar
                </button>
                <button
                    type="button"
                    @click="accion({ accion: 'saveForm' })"
                    class="px-6 py-2.5 rounded-xl text-sm font-bold bg-brand text-white hover:bg-brand-600 transition-all shadow-lg shadow-brand/20 flex items-center gap-2"
                    :disabled="showModalFactura.loading">
                    <i v-if="!showModalFactura.loading" class="bi bi-check-lg"></i>
                    <Loader v-if="showModalFactura.loading" class="w-4 h-4 text-black" />
                    Generar Factura
                </button>
            </div>
        </template>
    </Modal>
</template>
