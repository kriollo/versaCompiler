<script setup lang="ts">
    import type { VersaFetchResponse } from 'versaTypes';
    import { computed, inject, onMounted, ref, type Ref } from 'vue';

    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import type { ConsumoMes as ConsumoMesType } from '@/dashboard/js/facturacion/facturacionType';
    import { formatCurrency, versaAlert, versaFetch } from '@/dashboard/js/functions';

    const panelUrl = inject('panelUrl', '');
    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const empresaSelected = inject('empresaSelected', '');

    const loading = ref(true);
    const consumoData = ref<ConsumoMesType | null>(null);
    const mesSeleccionado = ref(new Date().getMonth() + 1);
    const anioSeleccionado = ref(new Date().getFullYear());

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
        for (let i = currentYear; i >= currentYear - 5; i--) {
            years.push(i);
        }
        return years;
    });

    const obtenerConsumo = async () => {
        loading.value = true;
        try {
            interface ResponseConsumo extends VersaFetchResponse {
                data: ConsumoMesType;
            }

            const response = (await versaFetch({
                url: `/${panelUrl}/facturacion/cartera/api/getConsumoMes/${empresaSelected}`,
                method: 'POST',
                data: {
                    csrf_token: csrf_token.value,
                    mes: mesSeleccionado.value,
                    anio: anioSeleccionado.value,
                },
            })) as ResponseConsumo;

            if (response.success === API_RESPONSE_CODES.ERROR) {
                versaAlert({
                    title: 'Error',
                    message: response.message || 'No se pudo obtener el consumo del mes',
                    type: 'error',
                });
                return;
            }

            consumoData.value = response.data;
        } catch {
            versaAlert({
                title: 'Error',
                message: 'Error al cargar el consumo del mes',
                type: 'error',
            });
        } finally {
            loading.value = false;
        }
    };

    const porcentajeCampanas = computed(() => {
        if (!consumoData.value?.consumo || !consumoData.value?.plan) {
            return 0;
        }
        const limite = consumoData.value.plan.max_campanas_activas;
        if (limite === 0) {
            return 0;
        }
        return Math.round((consumoData.value.consumo.campanas_activas / limite) * 100);
    });

    const totalAdicionales = computed(() => {
        if (!consumoData.value?.adicionales) {
            return 0;
        }
        return consumoData.value.adicionales.filter(a => a.estado).reduce((sum, a) => sum + Number(a.valor), 0);
    });

    const totalConsumo = computed(() => {
        const costoVideos = consumoData.value?.consumo?.costo_videos || 0;
        const adicionales = totalAdicionales.value;
        return costoVideos + adicionales;
    });

    onMounted(() => {
        obtenerConsumo();
    });

    const formatCurrencyValue = (value: number | string) =>
        formatCurrency(Number(value), consumoData.value?.plan?.moneda);
</script>

<template>
    <div class="rounded-2xl shadow-lg">
        <!-- Header con selectores -->
        <div
            class="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div class="flex items-center gap-3">
                <div
                    class="w-12 h-12 rounded-xl bg-gradient-to-br from-brand to-corporate-green flex items-center justify-center shadow-lg shadow-brand/20">
                    <i class="bi bi-graph-up-arrow text-2xl text-white"></i>
                </div>
                <div>
                    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Consumo del Mes</h2>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Revisa tu uso de recursos y límites del plan</p>
                </div>
            </div>

            <div class="flex gap-3">
                <select
                    v-model="mesSeleccionado"
                    @change="obtenerConsumo"
                    class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent">
                    <option v-for="mes in meses" :key="mes.value" :value="mes.value">
                        {{ mes.label }}
                    </option>
                </select>
                <select
                    v-model="anioSeleccionado"
                    @change="obtenerConsumo"
                    class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent">
                    <option v-for="anio in anios" :key="anio" :value="anio">
                        {{ anio }}
                    </option>
                </select>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
        </div>

        <!-- Contenido -->
        <div v-else-if="consumoData" class="space-y-6">
            <!-- Plan Actual -->
            <div
                class="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <i class="bi bi-award text-brand"></i>
                        Plan Actual: {{ consumoData.plan?.nombre }}
                    </h3>
                    <span
                        class="px-4 py-1.5 rounded-full text-sm font-bold bg-brand text-white shadow-lg shadow-brand/20 w-fit">
                        {{ formatCurrencyValue(consumoData.plan?.precio_por_video) }} {{ consumoData.plan?.moneda }} por
                        video
                    </span>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ consumoData.plan?.descripcion }}
                </p>
                <p class="mt-3 text-xs text-purple-700 dark:text-purple-300">
                    Max usuarios: {{ consumoData.plan?.max_usuarios_admin }}
                </p>
            </div>

            <!-- Métricas de Consumo -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- Campañas -->
                <div
                    class="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-4 border border-brand-200 dark:border-brand-800">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-semibold text-brand-800 dark:text-brand-300">Campañas Activas</span>
                        <i class="bi bi-megaphone text-brand dark:text-brand-400"></i>
                    </div>
                    <div class="flex items-baseline gap-2 flex-wrap">
                        <span class="text-3xl font-bold text-brand-900 dark:text-brand-100 break-all">
                            {{ consumoData.consumo?.campanas_activas }}
                        </span>
                        <span class="text-sm text-brand dark:text-brand-400 flex-shrink-0">
                            /
                            {{
                                consumoData.consumo?.limite_campanas === 0 ? '∞' : consumoData.consumo?.limite_campanas
                            }}
                        </span>
                    </div>
                    <div class="mt-3 w-full bg-brand-200 dark:bg-brand-900 rounded-full h-2">
                        <div
                            class="bg-brand dark:bg-brand-400 h-2 rounded-full transition-all duration-300"
                            :style="{ width: `${Math.min(porcentajeCampanas, 100)}%` }"></div>
                    </div>
                </div>

                <!-- Videos Totales -->
                <div
                    class="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-semibold text-green-800 dark:text-green-300">Videos Totales</span>
                        <i class="bi bi-camera-video text-green-600 dark:text-green-400"></i>
                    </div>
                    <div class="flex items-baseline gap-2">
                        <span class="text-3xl font-bold text-green-900 dark:text-green-100 break-all">
                            {{ consumoData.consumo?.total_videos }}
                        </span>
                    </div>
                    <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <span class="text-green-600 dark:text-green-400">Aprobados:</span>
                            <span class="font-bold text-green-900 dark:text-green-100 block truncate">
                                {{ consumoData.consumo?.videos_aprobados }}
                            </span>
                        </div>
                        <div>
                            <span class="text-red-600 dark:text-red-400">Rechazados:</span>
                            <span class="font-bold text-red-900 dark:text-red-100 block truncate">
                                {{ consumoData.consumo?.videos_rechazados }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Límite de Videos -->
                <div
                    class="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-semibold text-purple-800 dark:text-purple-300">Límite de Videos</span>
                        <i class="bi bi-collection text-purple-600 dark:text-purple-400"></i>
                    </div>
                    <div class="flex items-baseline gap-2 flex-wrap">
                        <span class="text-3xl font-bold text-purple-900 dark:text-purple-100 break-all">
                            {{
                                consumoData.consumo?.limite_videos_por_campana === 0
                                    ? '∞'
                                    : consumoData.consumo?.limite_videos_por_campana
                            }}
                        </span>
                        <span class="text-sm text-purple-600 dark:text-purple-400 flex-shrink-0">por campaña</span>
                    </div>
                </div>
            </div>

            <!-- Facturación del Mes -->
            <div
                class="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                <h4 class="text-lg font-bold text-orange-900 dark:text-orange-100 mb-4 flex items-center gap-2">
                    <i class="bi bi-calculator text-orange-600"></i>
                    Resumen de Facturación
                </h4>
                <div class="space-y-2">
                    <!-- Consumo de Videos -->
                    <div class="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <div class="flex-1">
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                                {{
                                    consumoData.plan?.tipo_plan === 'mensual' ? 'Consumo Mensual' : 'Consumo de Videos'
                                }}
                            </span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">
                                {{ consumoData.consumo?.total_videos }} videos ×
                                {{ formatCurrencyValue(consumoData.plan?.precio_por_video) }}
                                {{ consumoData.plan?.moneda }}
                            </span>
                        </div>
                        <span class="text-sm font-bold text-orange-700 dark:text-orange-300">
                            {{ formatCurrencyValue(consumoData.consumo?.costo_videos?.toFixed(2)) }}
                            {{ consumoData.plan?.moneda }}
                        </span>
                    </div>

                    <!-- Adicionales -->
                    <div
                        v-for="adicional in consumoData.adicionales?.filter(a => a.estado)"
                        :key="adicional.id"
                        class="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {{ adicional.descripcion }}
                        </span>
                        <span class="text-sm font-bold text-orange-700 dark:text-orange-300">
                            {{ formatCurrencyValue(adicional.valor) }} {{ adicional.moneda }}
                        </span>
                    </div>

                    <!-- Total -->
                    <div
                        class="flex items-center justify-between p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg border-t-2 border-orange-300 dark:border-orange-700">
                        <span class="font-bold text-orange-900 dark:text-orange-100">Total del Mes:</span>
                        <span class="text-lg font-bold text-orange-700 dark:text-orange-300">
                            {{ formatCurrencyValue(totalConsumo.toFixed(2)) }} {{ consumoData.plan?.moneda }}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- No Data -->
        <div v-else class="text-center py-12">
            <i class="bi bi-inbox text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
            <p class="text-gray-500 dark:text-gray-400">No se encontraron datos para este periodo</p>
        </div>
    </div>
</template>
