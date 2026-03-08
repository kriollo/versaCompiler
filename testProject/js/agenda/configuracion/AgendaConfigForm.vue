<script setup lang="ts">
    import { inject, onMounted, ref, type Ref } from 'vue';

    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
import { versaFetch, VersaToast } from '@/dashboard/js/functions';

    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', '');

    // Estado del formulario
    const recordatorioActivo = ref(true);
    const recordatorioHoras = ref(24);
    const recordatorioDigitalActivo = ref(false);
    const recordatorioDigitalFlowId = ref<number | null>(null);
    const outboundFlows = ref<{ id: number; description?: string | null }[]>([]);

    const cargando = ref(false);
    const guardando = ref(false);

    const opcionesHoras = [1, 2, 4, 6, 12, 24, 48];

    // ---- Carga inicial ----

    const cargarConfig = async () => {
        cargando.value = true;
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/agenda/api/config`,
                method: 'GET',
            });

            if (response.success === API_RESPONSE_CODES.SUCCESS && response.data) {
                recordatorioActivo.value = Boolean(response.data.recordatorio_activo);
                recordatorioHoras.value = Number(response.data.recordatorio_horas) || 24;
                recordatorioDigitalActivo.value = Boolean(response.data.recordatorio_digital_activo);
                recordatorioDigitalFlowId.value =
                    response.data.recordatorio_digital_flow_id !== null
                        ? Number(response.data.recordatorio_digital_flow_id)
                        : null;
            }
        } catch {
            // Silencioso: se usan los defaults del formulario
        } finally {
            cargando.value = false;
        }
    };

    onMounted(cargarConfig);

    const cargarFlowsOutbound = async () => {
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/agenda/api/flows/outbound`,
                method: 'GET',
            });

            if (response.success === API_RESPONSE_CODES.SUCCESS && Array.isArray(response.data)) {
                outboundFlows.value = response.data as { id: number; description?: string | null }[];
            } else {
                outboundFlows.value = [];
            }
        } catch {
            outboundFlows.value = [];
        }
    };

    onMounted(cargarFlowsOutbound);

    // ---- Guardar ----

    const guardarConfig = async () => {
        guardando.value = true;
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/agenda/api/config`,
                method: 'POST',
                data: {
                    recordatorio_activo: recordatorioActivo.value,
                    recordatorio_horas: recordatorioHoras.value,
                    recordatorio_digital_activo: recordatorioDigitalActivo.value,
                    recordatorio_digital_flow_id: recordatorioDigitalFlowId.value,
                    csrf_token: csrf_token.value,
                },
            });

            if (response.success === API_RESPONSE_CODES.SUCCESS) {
                VersaToast.fire({
                    title: 'Configuración guardada',
                    icon: 'success',
                });
            } else {
                VersaToast.fire({
                    title: response.message ?? 'Error al guardar',
                    icon: 'error',
                });
            }
        } catch {
            VersaToast.fire({
                title: 'Error de red al guardar la configuración',
                icon: 'error',
            });
        } finally {
            guardando.value = false;
        }
    };
</script>

<template>
    <div class="max-w-xl">
        <!-- Skeleton de carga -->
        <div v-if="cargando" class="space-y-4 animate-pulse">
            <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>

        <div v-else class="space-y-6">
            <!-- Toggle recordatorio activo -->
            <div
                class="flex items-start gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
                <div class="flex-1">
                    <p class="text-sm font-bold text-gray-900 dark:text-white">Activar recordatorios por correo</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Se enviará un correo automático al cliente antes de su cita.
                    </p>
                </div>
                <button
                    type="button"
                    role="switch"
                    :aria-checked="recordatorioActivo"
                    @click="recordatorioActivo = !recordatorioActivo"
                    class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                    :class="recordatorioActivo ? 'bg-brand' : 'bg-gray-300 dark:bg-gray-600'">
                    <span
                        class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200"
                        :class="recordatorioActivo ? 'translate-x-5' : 'translate-x-0'"></span>
                </button>
            </div>

            <!-- Selector de horas -->
            <div v-if="recordatorioActivo">
                <label for="recordatorio_horas" class="block mb-2 text-sm font-bold text-gray-900 dark:text-white">
                    Horas antes de la cita
                </label>
                <select
                    id="recordatorio_horas"
                    v-model="recordatorioHoras"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-brand dark:focus:border-brand">
                    <option v-for="h in opcionesHoras" :key="h" :value="h">
                        {{ h === 1 ? '1 hora antes' : `${h} horas antes` }}
                    </option>
                </select>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    El recordatorio se enviará aproximadamente {{ recordatorioHoras }} hora{{
                        recordatorioHoras === 1 ? '' : 's'
                    }}
                    antes de la cita.
                </p>
            </div>

            <div
                class="flex items-start gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
                <div class="flex-1">
                    <p class="text-sm font-bold text-gray-900 dark:text-white">Activar recordatorios digitales</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Envia recordatorios por WhatsApp, Telegram, Messenger o Instagram usando un flujo outbound.
                    </p>
                </div>
                <button
                    type="button"
                    role="switch"
                    :aria-checked="recordatorioDigitalActivo"
                    @click="recordatorioDigitalActivo = !recordatorioDigitalActivo"
                    class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                    :class="recordatorioDigitalActivo ? 'bg-brand' : 'bg-gray-300 dark:bg-gray-600'">
                    <span
                        class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200"
                        :class="recordatorioDigitalActivo ? 'translate-x-5' : 'translate-x-0'"></span>
                </button>
            </div>

            <div v-if="recordatorioDigitalActivo" class="grid gap-2">
                <label for="recordatorio_digital_flow" class="block text-sm font-bold text-gray-900 dark:text-white">
                    Flujo outbound para recordatorios
                </label>
                <select
                    id="recordatorio_digital_flow"
                    v-model="recordatorioDigitalFlowId"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-brand dark:focus:border-brand">
                    <option :value="null">Selecciona un flujo outbound</option>
                    <option v-for="flow in outboundFlows" :key="flow.id" :value="flow.id">
                        #{{ flow.id }} - {{ flow.description || 'Flujo outbound' }}
                    </option>
                </select>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                    El flujo debe iniciar con un template si es WhatsApp.
                </p>
            </div>

            <!-- Botón guardar -->
            <div class="flex items-center gap-3">
                <button
                    type="button"
                    @click="guardarConfig"
                    :disabled="guardando"
                    class="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-brand rounded-lg hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all">
                    <i class="bi" :class="guardando ? 'bi-hourglass-split animate-spin' : 'bi-floppy-fill'"></i>
                    {{ guardando ? 'Guardando...' : 'Guardar configuración' }}
                </button>
            </div>
        </div>
    </div>
</template>
