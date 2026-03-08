<script setup lang="ts">
    import type { AccionData, actionsType, VersaFetchResponse, VersaParamsFetch } from 'versaTypes';
    import { computed, inject, onMounted, reactive, ref, type Ref, watch } from 'vue';

    import Check from '@/dashboard/js/components/check.vue';
    import Modal from '@/dashboard/js/components/modal.vue';
    import { $dom, blockedForm } from '@/dashboard/js/composables/dom';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { type PlanEmpresa, showModalAsociaPlanInjection } from '@/dashboard/js/empresa/InjectKeys';
    import { showErrorResponse, versaAlert, versaFetch } from '@/dashboard/js/functions';
    import { monedasDisponibles, nivelesSoporte } from '@/dashboard/js/planes/planType';

    interface Plan {
        id: number;
        nombre: string;
        descripcion: string;
        tipo_plan: string;
        duracion_almacenamiento_dias: number;
        moderacion_ia: boolean;
        duracion_video_min_segundos: number;
        duracion_video_max_segundos: number;
        tiempo_vida_rechazado_dias: number;
        max_videos_por_campana: number | null;
        max_campanas_activas: number | null;
        max_usuarios_admin: number;
        nivel_soporte: string;
        precio_mensual: number;
        moneda: string;
        [key: string]: any;
    }

    interface VersaFetchPlanesResponse extends VersaFetchResponse {
        data: Plan[];
    }

    interface VersaFetchPlanEmpresaResponse extends VersaFetchResponse {
        data: PlanEmpresa;
    }

    const showModalAsociaPlan = showModalAsociaPlanInjection.inject();
    const panelUrl = inject<string>('panelUrl', '');
    const token_csrf = inject<Ref<string>>('csrf_token', ref(''));

    const planes = ref<Plan[]>([]);
    const planSeleccionado = ref<number | null>(null);
    const planEmpresaActual = ref<PlanEmpresa | null>(null);
    const isLoading = ref(false);

    // Formulario reactivo con valores personalizados
    const formData = reactive({
        id_empresa: 0,
        id_plan: 0,
        duracion_almacenamiento_dias: null as number | null,
        moderacion_ia: null as boolean | null,
        duracion_video_min_segundos: null as number | null,
        duracion_video_max_segundos: null as number | null,
        tiempo_vida_rechazado_dias: null as number | null,
        max_videos_por_campana: null as number | null,
        max_campanas_activas: null as number | null,
        max_usuarios_admin: null as number | null,
        nivel_soporte: null as string | null,
        precio_mensual: null as number | null,
        moneda: null as string | null,
    });

    // Configuración de personalización (checkboxes)
    const customizar = reactive({
        duracion_almacenamiento_dias: false,
        moderacion_ia: false,
        duracion_video_min_segundos: false,
        duracion_video_max_segundos: false,
        tiempo_vida_rechazado_dias: false,
        max_videos_por_campana: false,
        max_campanas_activas: false,
        max_usuarios_admin: false,
        nivel_soporte: false,
        precio_mensual: false,
        moneda: false,
    });

    const planBase = computed(() => planes.value.find(p => p.id === planSeleccionado.value) || null);

    const emit = defineEmits(['accion']);

    const accion = (accion: AccionData): void => {
        const actions: actionsType = {
            closeModal: () => {
                resetForm();
                showModalAsociaPlan.showModalAsociaPlan = false;
                showModalAsociaPlan.itemSelected = null;
            },
            default: () => console.log('Accion no encontrada'),
        };
        const selectedAction = actions[accion.accion] || actions['default'];
        if ('function' === typeof selectedAction) {
            selectedAction();
        }
    };

    const resetForm = () => {
        planSeleccionado.value = null;
        planEmpresaActual.value = null;
        Object.keys(formData).forEach(key => {
            if (key !== 'id_empresa') {
                formData[key] = key === 'id_plan' ? 0 : null;
            }
        });
        Object.keys(customizar).forEach(key => {
            customizar[key] = false;
        });
    };

    // Cargar planes disponibles
    const loadPlanes = async () => {
        const response = (await versaFetch({
            url: `/${panelUrl}/planes/api/all`,
            method: 'GET',
        })) as VersaFetchPlanesResponse;

        if (response && response.success === API_RESPONSE_CODES.SUCCESS) {
            planes.value = response.data;
        }
    };

    // Cargar plan actual de la empresa (si existe)
    const loadPlanEmpresa = async (idEmpresa: number) => {
        isLoading.value = true;
        const response = (await versaFetch({
            url: `/${panelUrl}/empresas/api/getPlanEmpresa?idEmpresa=${idEmpresa}`,
            method: 'GET',
        })) as VersaFetchPlanEmpresaResponse;

        if (response && response.success === API_RESPONSE_CODES.SUCCESS) {
            planEmpresaActual.value = response.data;
            planSeleccionado.value = response.data.id_plan;
            formData.id_plan = response.data.id_plan;

            // Establecer valores personalizados si existen
            const customFields = [
                'duracion_almacenamiento_dias',
                'moderacion_ia',
                'duracion_video_min_segundos',
                'duracion_video_max_segundos',
                'tiempo_vida_rechazado_dias',
                'max_videos_por_campana',
                'max_campanas_activas',
                'max_usuarios_admin',
                'nivel_soporte',
                'precio_mensual',
                'moneda',
            ];

            customFields.forEach(field => {
                const customValue = response.data[`custom_${field}`];
                if (customValue !== null && customValue !== undefined) {
                    formData[field] = customValue;
                    customizar[field] = true;
                } else {
                    formData[field] = response.data[field];
                    customizar[field] = false;
                }
            });
        }
        isLoading.value = false;
    };

    // Watch cuando se selecciona un plan
    watch(planSeleccionado, newValue => {
        const base = planBase.value;
        if (newValue && base) {
            formData.id_plan = newValue;

            // Si no hay personalización, usar valores del plan base
            Object.keys(customizar).forEach(key => {
                if (!customizar[key as keyof typeof customizar]) {
                    (formData as any)[key] = base[key];
                }
            });
        }
    });

    // Watch de checkboxes de personalización
    Object.keys(customizar).forEach(key => {
        watch(
            () => customizar[key as keyof typeof customizar],
            isCustom => {
                const base = planBase.value;
                if (!isCustom && base) {
                    // Restaurar valor del plan base
                    (formData as any)[key] = base[key];
                }
            },
        );
    });

    watch(
        () => showModalAsociaPlan.showModalAsociaPlan,
        async newValue => {
            if (newValue && showModalAsociaPlan.itemSelected) {
                formData.id_empresa = showModalAsociaPlan.itemSelected.id;
                await loadPlanes();
                await loadPlanEmpresa(showModalAsociaPlan.itemSelected.id);
            }
        },
    );

    const savePlanEmpresa = async () => {
        const $formAsociarPlan = $dom('#formAsociarPlan') as HTMLFormElement;
        if (!$formAsociarPlan) {
            return;
        }

        if (!planSeleccionado.value) {
            await versaAlert({
                title: 'Error',
                message: 'Debe seleccionar un plan',
                type: 'error',
            });
            return;
        }

        blockedForm($formAsociarPlan, 'true');

        // Preparar datos - solo enviar valores personalizados
        const dataToSend: any = {
            id_empresa: formData.id_empresa,
            id_plan: formData.id_plan,
            csrf_token: token_csrf.value,
        };

        // Solo incluir campos que están personalizados
        Object.keys(customizar).forEach(key => {
            if (customizar[key]) {
                dataToSend[key] = formData[key];
            } else {
                dataToSend[key] = 'use_plan_value'; // Indicador para usar valor del plan
            }
        });

        const params = {
            url: `/${panelUrl}/empresas/api/savePlanEmpresa`,
            method: 'POST',
            data: dataToSend,
        } as VersaParamsFetch;

        const response = await versaFetch(params);
        blockedForm($formAsociarPlan, 'false');

        if (response.success === API_RESPONSE_CODES.ERROR) {
            showErrorResponse(response);
            return;
        }

        await versaAlert({
            title: 'Plan asociado',
            message: 'El plan se ha asociado correctamente a la empresa.',
            type: 'success',
            callback: () => {
                accion({ accion: 'closeModal' });
                emit('accion', { accion: 'reloadTable' });
            },
        });
    };

    onMounted(() => {
        loadPlanes();
    });
</script>

<template>
    <Modal
        @accion="accion"
        idModal="asociar-plan"
        :showModal="showModalAsociaPlan.showModalAsociaPlan"
        :size="'max-w-7xl'">
        <template #modalTitle>
            <div class="flex justify-between items-center w-full pb-6 mb-2">
                <div class="flex items-center gap-5">
                    <div
                        class="w-16 h-16 rounded-[1.5rem] bg-brand flex items-center justify-center text-white shadow-2xl shadow-brand/20 rotate-3 transition-transform hover:rotate-0">
                        <i class="bi bi-award-fill text-3xl"></i>
                    </div>
                    <div>
                        <h3 class="text-3xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">
                            Asociar Plan
                        </h3>
                        <p class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mt-1">
                            {{ showModalAsociaPlan.itemSelected?.nombre }}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    class="group w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-900 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all active:scale-95"
                    @click="accion({ accion: 'closeModal' })">
                    <i class="bi bi-x-lg text-lg"></i>
                </button>
            </div>
        </template>
        <template #modalBody>
            <form id="formAsociarPlan" class="space-y-8" v-if="!isLoading">
                <!-- Sección: Selector de Plan -->
                <div
                    class="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                    <h4
                        class="text-xs font-black text-gray-400 mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
                        <i class="bi bi-list-check text-brand"></i>
                        Seleccionar Plan Base
                    </h4>

                    <div class="group">
                        <label
                            for="plan_select"
                            class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                            Plan Base
                            <span class="text-red-500">*</span>
                        </label>
                        <div class="relative">
                            <div
                                class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
                                <i class="bi bi-box-seam text-lg"></i>
                            </div>
                            <select
                                id="plan_select"
                                v-model="planSeleccionado"
                                class="w-full pl-11 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all dark:text-white appearance-none">
                                <option :value="null">Seleccione un plan</option>
                                <option v-for="p in planes" :key="p.id" :value="p.id">
                                    {{ p.nombre }} - {{ p.tipo_plan }} ({{ p.precio_mensual }} {{ p.moneda }})
                                </option>
                            </select>
                        </div>
                        <p
                            v-if="planBase"
                            class="mt-6 text-sm text-gray-600 dark:text-gray-400 flex items-start gap-3 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 italic">
                            <i class="bi bi-info-circle-fill text-brand text-lg"></i>
                            <span>{{ planBase.descripcion }}</span>
                        </p>
                    </div>
                </div>

                <!-- Sección: Instrucciones de Personalización -->
                <div
                    v-if="planBase"
                    class="bg-[#F0F2FF] dark:bg-indigo-950/30 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30">
                    <div class="flex items-center gap-5">
                        <div
                            class="w-14 h-14 rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <i class="bi bi-lightbulb-fill text-indigo-500 text-2xl"></i>
                        </div>
                        <div>
                            <h4 class="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                                Personalización del Plan
                            </h4>
                            <p class="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
                                Active solo las opciones que desea sobrescribir para esta empresa.
                            </p>
                        </div>
                    </div>
                </div>

                <div v-if="planBase" class="space-y-8">
                    <!-- Sección: Almacenamiento -->
                    <div
                        class="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm"
                        v-if="planBase">
                        <h4
                            class="text-xs font-black text-gray-400 mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
                            <i class="bi bi-database-fill text-purple-500"></i>
                            Almacenamiento (Días)
                        </h4>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <!-- Duración de almacenamiento -->
                            <div
                                class="group bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 transition-all duration-300"
                                :class="
                                    customizar.duracion_almacenamiento_dias
                                        ? 'ring-2 ring-purple-500/20 border-purple-500/30'
                                        : ''
                                ">
                                <div class="flex items-center gap-4 mb-6">
                                    <Check
                                        id="custom_duracion_almacenamiento"
                                        label="Personalizar Vida Nube"
                                        v-model="customizar.duracion_almacenamiento_dias" />
                                </div>
                                <div v-if="customizar.duracion_almacenamiento_dias">
                                    <label
                                        class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                        Días de almacenamiento
                                    </label>
                                    <div class="relative">
                                        <div
                                            class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-purple-500">
                                            <i class="bi bi-calendar3 text-lg"></i>
                                        </div>
                                        <input
                                            type="number"
                                            id="duracion_almacenamiento_dias"
                                            v-model.number="formData.duracion_almacenamiento_dias"
                                            min="1"
                                            max="30"
                                            class="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl text-sm font-bold focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all dark:text-white" />
                                    </div>
                                </div>
                                <div v-else class="flex flex-col gap-1">
                                    <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        Valor Base
                                    </span>
                                    <p class="text-2xl font-black text-gray-900 dark:text-white">
                                        {{ planBase.duracion_almacenamiento_dias }}
                                        <span class="text-sm font-bold text-gray-400">días</span>
                                    </p>
                                </div>
                            </div>

                            <!-- Tiempo vida rechazado -->
                            <div
                                class="group bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 transition-all duration-300"
                                :class="
                                    customizar.tiempo_vida_rechazado_dias
                                        ? 'ring-2 ring-gray-500/20 border-gray-500/30'
                                        : ''
                                ">
                                <div class="flex items-center gap-4 mb-6">
                                    <Check
                                        id="custom_tiempo_rechazado"
                                        label="Personalizar Rechazos"
                                        v-model="customizar.tiempo_vida_rechazado_dias" />
                                </div>
                                <div v-if="customizar.tiempo_vida_rechazado_dias">
                                    <label
                                        class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                        Días de retención
                                    </label>
                                    <div class="relative">
                                        <div
                                            class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
                                            <i class="bi bi-hourglass-split text-lg"></i>
                                        </div>
                                        <input
                                            type="number"
                                            id="tiempo_vida_rechazado_dias"
                                            v-model.number="formData.tiempo_vida_rechazado_dias"
                                            min="0"
                                            class="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl text-sm font-bold focus:ring-4 focus:ring-gray-500/10 focus:border-gray-500 outline-none transition-all dark:text-white" />
                                    </div>
                                </div>
                                <div v-else class="flex flex-col gap-1">
                                    <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        Valor Base
                                    </span>
                                    <p class="text-2xl font-black text-gray-900 dark:text-white">
                                        {{ planBase.tiempo_vida_rechazado_dias }}
                                        <span class="text-sm font-bold text-gray-400">días</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Sección: Funcionalidades IA -->
                    <div
                        class="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm"
                        v-if="planBase">
                        <h4
                            class="text-xs font-black text-gray-400 mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
                            <i class="bi bi-robot text-brand"></i>
                            Funcionalidades IA
                        </h4>

                        <!-- Moderación IA Card -->
                        <div
                            class="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 transition-all duration-300"
                            :class="customizar.moderacion_ia ? 'ring-2 ring-indigo-500/20 border-indigo-500/30' : ''">
                            <div class="flex items-center gap-4 mb-6">
                                <Check
                                    id="custom_moderacion_ia"
                                    label="Personalizar Moderación IA"
                                    v-model="customizar.moderacion_ia" />
                            </div>

                            <div v-if="customizar.moderacion_ia">
                                <div
                                    class="flex items-start gap-4 p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl group cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    @click="formData.moderacion_ia = !formData.moderacion_ia">
                                    <div class="flex items-center pt-1">
                                        <input
                                            type="checkbox"
                                            id="moderacion_ia"
                                            v-model="formData.moderacion_ia"
                                            @click.stop
                                            class="w-6 h-6 rounded-lg border-gray-300 text-black focus:ring-brand cursor-pointer" />
                                    </div>
                                    <label for="moderacion_ia" class="flex-1 cursor-pointer" @click.stop>
                                        <div
                                            class="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                            Activar Moderación
                                        </div>
                                        <div
                                            class="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                            Análisis automático inteligente
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <div v-else class="flex flex-col gap-1">
                                <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    Valor Base
                                </span>
                                <p class="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    {{ planBase.moderacion_ia ? 'Activado' : 'Desactivado' }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Sección: Configuración de Videos -->
                    <div
                        class="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm"
                        v-if="planBase">
                        <h4
                            class="text-xs font-black text-gray-400 mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
                            <i class="bi bi-camera-video-fill text-brand"></i>
                            Configuración de Videos
                        </h4>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <!-- Duración mínima de video -->
                            <div
                                class="group bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 transition-all duration-300"
                                :class="
                                    customizar.duracion_video_min_segundos
                                        ? 'ring-2 ring-red-500/20 border-red-500/30'
                                        : ''
                                ">
                                <div class="flex items-center gap-4 mb-6">
                                    <Check
                                        id="custom_duracion_min"
                                        label="Personalizar Mínimo"
                                        v-model="customizar.duracion_video_min_segundos" />
                                </div>
                                <div v-if="customizar.duracion_video_min_segundos">
                                    <label
                                        class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                        Segundos mínimos
                                    </label>
                                    <div class="relative">
                                        <div
                                            class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-red-500">
                                            <i class="bi bi-dash-circle text-lg"></i>
                                        </div>
                                        <input
                                            type="number"
                                            id="duracion_video_min_segundos"
                                            v-model.number="formData.duracion_video_min_segundos"
                                            min="1"
                                            class="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl text-sm font-bold focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all dark:text-white" />
                                    </div>
                                </div>
                                <div v-else class="flex flex-col gap-1">
                                    <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        Valor Base
                                    </span>
                                    <p class="text-2xl font-black text-gray-900 dark:text-white">
                                        {{ planBase.duracion_video_min_segundos }}
                                        <span class="text-sm font-bold text-gray-400">seg</span>
                                    </p>
                                </div>
                            </div>

                            <!-- Duración máxima de video -->
                            <div
                                class="group bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 transition-all duration-300"
                                :class="
                                    customizar.duracion_video_max_segundos
                                        ? 'ring-2 ring-red-500/20 border-red-500/30'
                                        : ''
                                ">
                                <div class="flex items-center gap-4 mb-6">
                                    <Check
                                        id="custom_duracion_max"
                                        label="Personalizar Máximo"
                                        v-model="customizar.duracion_video_max_segundos" />
                                </div>
                                <div v-if="customizar.duracion_video_max_segundos">
                                    <label
                                        class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                        Segundos máximos
                                    </label>
                                    <div class="relative">
                                        <div
                                            class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-red-500">
                                            <i class="bi bi-plus-circle text-lg"></i>
                                        </div>
                                        <input
                                            type="number"
                                            id="duracion_video_max_segundos"
                                            v-model.number="formData.duracion_video_max_segundos"
                                            min="1"
                                            class="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl text-sm font-bold focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all dark:text-white" />
                                    </div>
                                </div>
                                <div v-else class="flex flex-col gap-1">
                                    <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        Valor Base
                                    </span>
                                    <p class="text-2xl font-black text-gray-900 dark:text-white">
                                        {{ planBase.duracion_video_max_segundos }}
                                        <span class="text-sm font-bold text-gray-400">seg</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Sección: Límites de Uso -->
                    <div
                        class="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm"
                        v-if="planBase">
                        <h4
                            class="text-xs font-black text-gray-400 mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
                            <i class="bi bi-speedometer2 text-brand"></i>
                            Límites de Uso
                        </h4>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <!-- Máx videos por campaña -->
                            <div
                                class="group bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 transition-all duration-300"
                                :class="
                                    customizar.max_videos_por_campana ? 'ring-2 ring-brand/20 border-brand/30' : ''
                                ">
                                <div class="flex items-center gap-4 mb-6">
                                    <Check
                                        id="custom_max_videos"
                                        label="Personalizar Máx. Videos"
                                        v-model="customizar.max_videos_por_campana" />
                                </div>
                                <div v-if="customizar.max_videos_por_campana">
                                    <label
                                        class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                        Videos por campaña
                                    </label>
                                    <div class="relative">
                                        <div
                                            class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
                                            <i class="bi bi-collection-play text-lg"></i>
                                        </div>
                                        <input
                                            type="number"
                                            id="max_videos_por_campana"
                                            v-model.number="formData.max_videos_por_campana"
                                            min="1"
                                            placeholder="Vacio si es ilimitado"
                                            class="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all dark:text-white" />
                                    </div>
                                </div>
                                <div v-else class="flex flex-col gap-1">
                                    <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        Valor Base
                                    </span>
                                    <p class="text-2xl font-black text-gray-900 dark:text-white">
                                        {{ planBase.max_videos_por_campana ?? 'Ilimitado' }}
                                    </p>
                                </div>
                            </div>

                            <!-- Máx campañas activas -->
                            <div
                                class="group bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 transition-all duration-300"
                                :class="customizar.max_campanas_activas ? 'ring-2 ring-brand/20 border-brand/30' : ''">
                                <div class="flex items-center gap-4 mb-6">
                                    <Check
                                        id="custom_max_campanas"
                                        label="Personalizar Máx. Campañas"
                                        v-model="customizar.max_campanas_activas" />
                                </div>
                                <div v-if="customizar.max_campanas_activas">
                                    <label
                                        class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                        Campañas activas
                                    </label>
                                    <div class="relative">
                                        <div
                                            class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
                                            <i class="bi bi-folder-fill text-lg"></i>
                                        </div>
                                        <input
                                            type="number"
                                            id="max_campanas_activas"
                                            v-model.number="formData.max_campanas_activas"
                                            min="1"
                                            placeholder="Vacio si es ilimitado"
                                            class="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all dark:text-white" />
                                    </div>
                                </div>
                                <div v-else class="flex flex-col gap-1">
                                    <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        Valor Base
                                    </span>
                                    <p class="text-2xl font-black text-gray-900 dark:text-white">
                                        {{ planBase.max_campanas_activas ?? 'Ilimitado' }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Sección: Usuarios y Soporte -->
                    <div
                        class="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm"
                        v-if="planBase">
                        <h4
                            class="text-xs font-black text-gray-400 mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
                            <i class="bi bi-people-fill text-brand"></i>
                            Usuarios y Soporte
                        </h4>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <!-- Máx usuarios admin -->
                            <div
                                class="group bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 transition-all duration-300"
                                :class="
                                    customizar.max_usuarios_admin ? 'ring-2 ring-cyan-500/20 border-cyan-500/30' : ''
                                ">
                                <div class="flex items-center gap-4 mb-6">
                                    <Check
                                        id="custom_max_usuarios"
                                        label="Personalizar Usuarios"
                                        v-model="customizar.max_usuarios_admin" />
                                </div>
                                <div v-if="customizar.max_usuarios_admin">
                                    <label
                                        class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                        Cantidad de usuarios
                                    </label>
                                    <div class="relative">
                                        <div
                                            class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-cyan-500">
                                            <i class="bi bi-person-fill-gear text-lg"></i>
                                        </div>
                                        <input
                                            type="number"
                                            id="max_usuarios_admin"
                                            v-model.number="formData.max_usuarios_admin"
                                            min="1"
                                            class="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl text-sm font-bold focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all dark:text-white" />
                                    </div>
                                </div>
                                <div v-else class="flex flex-col gap-1">
                                    <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        Valor Base
                                    </span>
                                    <p class="text-2xl font-black text-gray-900 dark:text-white">
                                        {{ planBase.max_usuarios_admin }}
                                        <span class="text-sm font-bold text-gray-400">usuarios</span>
                                    </p>
                                </div>
                            </div>

                            <!-- Nivel soporte -->
                            <div
                                class="group bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 transition-all duration-300"
                                :class="customizar.nivel_soporte ? 'ring-2 ring-cyan-500/20 border-cyan-500/30' : ''">
                                <div class="flex items-center gap-4 mb-6">
                                    <Check
                                        id="custom_nivel_soporte"
                                        label="Personalizar Soporte"
                                        v-model="customizar.nivel_soporte" />
                                </div>
                                <div v-if="customizar.nivel_soporte">
                                    <label
                                        class="block mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                        Nivel de Soporte
                                    </label>
                                    <div class="relative">
                                        <div
                                            class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-cyan-500">
                                            <i class="bi bi-headset text-lg"></i>
                                        </div>
                                        <select
                                            id="nivel_soporte"
                                            v-model="formData.nivel_soporte"
                                            class="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl text-sm font-bold focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all dark:text-white appearance-none">
                                            <option value="">Seleccione nivel</option>
                                            <option
                                                v-for="nivel in nivelesSoporte"
                                                :key="nivel.value"
                                                :value="nivel.value">
                                                {{ nivel.label }}
                                            </option>
                                        </select>
                                    </div>
                                </div>
                                <div v-else class="flex flex-col gap-1">
                                    <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        Valor Base
                                    </span>
                                    <p
                                        class="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                        {{ planBase.nivel_soporte }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Sección: Precios -->
                    <div
                        class="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                        <h4
                            class="text-sm font-bold text-amber-900 dark:text-amber-100 mb-6 uppercase tracking-wider flex items-center gap-2">
                            <i class="bi bi-cash-coin text-brand"></i>
                            Precios
                        </h4>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- Precio mensual -->
                            <div
                                class="group bg-white dark:bg-gray-800/50 p-4 rounded-xl hover:shadow-md transition-all duration-200">
                                <div class="flex items-center gap-4 mb-3">
                                    <Check
                                        id="custom_precio"
                                        label="Precio Mensual"
                                        v-model="customizar.precio_mensual" />
                                </div>
                                <div v-if="customizar.precio_mensual" class="pl-6">
                                    <label
                                        class="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Precio
                                    </label>
                                    <div class="relative">
                                        <div
                                            class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                            <i class="bi bi-currency-dollar text-gray-400"></i>
                                        </div>
                                        <input
                                            type="number"
                                            id="precio_mensual"
                                            v-model.number="formData.precio_mensual"
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                            class="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent block w-full pl-10 p-3" />
                                    </div>
                                </div>
                                <div v-else class="pl-6">
                                    <p class="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                        <i class="bi bi-info-circle"></i>
                                        Valor del plan:
                                        <span class="font-semibold text-gray-700 dark:text-gray-300">
                                            {{ planBase.precio_mensual }} {{ planBase.moneda }}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <!-- Moneda -->
                            <div
                                class="group bg-white dark:bg-gray-800/50 p-4 rounded-xl hover:shadow-md transition-all duration-200">
                                <div class="flex items-center gap-4 mb-3">
                                    <Check id="custom_moneda" label="Moneda" v-model="customizar.moneda" />
                                </div>
                                <div v-if="customizar.moneda" class="pl-6">
                                    <label
                                        class="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Tipo de moneda
                                    </label>
                                    <div class="relative">
                                        <div
                                            class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                            <i class="bi bi-currency-exchange text-gray-400"></i>
                                        </div>
                                        <select
                                            id="moneda"
                                            v-model="formData.moneda"
                                            class="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent block w-full pl-10 p-3">
                                            <option value="">Seleccione moneda</option>
                                            <option
                                                v-for="moneda in monedasDisponibles"
                                                :key="moneda.value"
                                                :value="moneda.value">
                                                {{ moneda.label }}
                                            </option>
                                        </select>
                                    </div>
                                </div>
                                <div v-else class="pl-6">
                                    <p class="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                        <i class="bi bi-info-circle"></i>
                                        Valor del plan:
                                        <span class="font-semibold text-gray-700 dark:text-gray-300">
                                            {{ planBase.moneda }}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-else class="text-center py-8 text-gray-500">Seleccione un plan para comenzar</div>
            </form>

            <div v-else class="flex justify-center items-center py-8">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
            </div>
        </template>
        <template #modalFooter>
            <div
                class="flex items-center justify-end gap-4 w-full border-t border-gray-100 dark:border-gray-800 pt-8 mt-10">
                <button
                    type="button"
                    @click="accion({ accion: 'closeModal' })"
                    class="px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                    Cancelar
                </button>
                <button
                    type="button"
                    @click="savePlanEmpresa"
                    :disabled="!planSeleccionado"
                    class="px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] bg-brand text-white hover:scale-105 transition-all shadow-xl shadow-brand/20 flex items-center gap-3">
                    <i class="bi bi-check-lg text-lg"></i>
                    Guardar Plan
                </button>
            </div>
        </template>
    </Modal>
</template>

<style scoped>
    .grid {
        display: grid;
    }
</style>
