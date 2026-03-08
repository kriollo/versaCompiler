<script setup lang="ts">
    import { ref } from 'vue';

    import AgendaConfigForm from '@/dashboard/js/agenda/configuracion/AgendaConfigForm.vue';
    import HorariosList from '@/dashboard/js/agenda/horarios/HorariosList.vue';
    import { ShowModalHorarioInject, ShowModalRecursoInject } from '@/dashboard/js/agenda/InjectKeys';
    import RecursosList from '@/dashboard/js/agenda/recursos/RecursosList.vue';

    ShowModalHorarioInject.provide({ show: false, item: null });
    ShowModalRecursoInject.provide({ show: false, item: null });

    // ---- Tabs ----
    type TabId = 'configuracion';

    const activeTab = ref<TabId>('configuracion');

    const tabs: { id: TabId; label: string; icon: string }[] = [
        { id: 'configuracion', label: 'Configuración', icon: 'bi-gear-fill' },
    ];

    // Sub-tab de configuración
    type ConfigTab = 'horarios' | 'recursos' | 'notificaciones';
    const configTab = ref<ConfigTab>('horarios');
</script>

<template>
    <div class="min-h-screen bg-gray-50 dark:bg-[#050505]">
        <!-- Header -->
        <div class="bg-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-gray-800 px-6 py-4">
            <div class="max-w-screen-xl mx-auto flex items-center justify-between flex-wrap gap-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                        <i class="bi bi-calendar2-check-fill text-brand text-lg"></i>
                    </div>
                    <div>
                        <h1 class="text-xl font-black text-gray-900 dark:text-white tracking-tight">Agenda</h1>
                        <p class="text-xs text-gray-400">Gestión de citas y horarios</p>
                    </div>
                </div>
                <nav class="flex items-center gap-1 text-xs text-gray-400">
                    <i class="bi bi-house-fill"></i>
                    <span class="mx-1">/</span>
                    <span class="font-medium text-gray-600 dark:text-gray-300">Agenda</span>
                </nav>
            </div>
        </div>

        <!-- Tabs -->
        <div class="bg-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-gray-800 px-6">
            <div class="max-w-screen-xl mx-auto">
                <div class="flex gap-0 overflow-x-auto">
                    <button
                        v-for="tab in tabs"
                        :key="tab.id"
                        type="button"
                        @click="activeTab = tab.id"
                        class="flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 whitespace-nowrap transition-all"
                        :class="
                            activeTab === tab.id
                                ? 'border-brand text-brand'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-200 dark:hover:border-gray-700'
                        ">
                        <i class="bi" :class="tab.icon"></i>
                        {{ tab.label }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Contenido -->
        <div class="max-w-screen-xl mx-auto px-6 py-6">
            <!-- TAB: Configuración -->
            <div v-if="activeTab === 'configuracion'">
                <!-- Sub-tabs configuración -->
                <div class="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl w-fit">
                    <button
                        v-for="(cfg, key) in {
                            horarios: { label: 'Horarios', icon: 'bi-clock' },
                            recursos: { label: 'Recursos', icon: 'bi-person-badge' },
                            notificaciones: { label: 'Notificaciones', icon: 'bi-bell-fill' },
                        }"
                        :key="key"
                        type="button"
                        @click="configTab = key as ConfigTab"
                        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
                        :class="
                            configTab === key
                                ? 'bg-white dark:bg-black text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        ">
                        <i class="bi" :class="cfg.icon"></i>
                        {{ cfg.label }}
                    </button>
                </div>

                <!-- Info contextual -->
                <div
                    v-if="configTab === 'horarios'"
                    class="mb-4 flex items-start gap-3 p-3 bg-brand/5 border border-brand/15 rounded-xl">
                    <i class="bi bi-info-circle text-brand mt-0.5 flex-shrink-0"></i>
                    <p class="text-xs text-gray-600 dark:text-gray-400">
                        Define los
                        <strong>horarios de atención base</strong>
                        : días activos, rango de horas y duración de cada cita. Los recursos hereden este horario.
                    </p>
                </div>
                <div
                    v-if="configTab === 'recursos'"
                    class="mb-4 flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl">
                    <i class="bi bi-info-circle text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"></i>
                    <p class="text-xs text-gray-600 dark:text-gray-400">
                        Los
                        <strong>recursos</strong>
                        son las personas o elementos que atienden. Asigna un horario base y define períodos de descanso
                        específicos (ej: almuerzo).
                    </p>
                </div>
                <div
                    v-if="configTab === 'notificaciones'"
                    class="mb-4 flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <i class="bi bi-info-circle text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"></i>
                    <p class="text-xs text-gray-600 dark:text-gray-400">
                        Configura el
                        <strong>recordatorio automático</strong>
                        por correo. El sistema enviará un aviso al cliente con las horas de anticipación que definas,
                        siempre que el cliente tenga un correo registrado.
                    </p>
                </div>

                <HorariosList v-if="configTab === 'horarios'" />
                <RecursosList v-if="configTab === 'recursos'" />
                <AgendaConfigForm v-if="configTab === 'notificaciones'" />
            </div>
        </div>
    </div>
</template>
