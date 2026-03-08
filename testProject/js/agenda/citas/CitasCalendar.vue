<script setup lang="ts">
    import Swal from 'sweetalert2';
    import { computed, inject, onMounted, ref, type Ref, watch } from 'vue';

    import CitaForm from '@/dashboard/js/agenda/citas/CitaForm.vue';
    import { type AgendaCita, type AgendaRecurso, ShowModalCitaInject } from '@/dashboard/js/agenda/InjectKeys';
    import calendarMini from '@/dashboard/js/components/calendarMini.vue';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaFetch, VersaToast } from '@/dashboard/js/functions';
    import type { VersaParamsFetch } from '@/dashboard/types/versaTypes';

    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', '');

    const modalCita = ShowModalCitaInject.inject();

    // ---- Estado base ----
    const today = new Date().toISOString().split('T')[0] ?? '';
    const fechaSel = ref(today);
    const citas = ref<AgendaCita[]>([]);
    const loading = ref(false);
    const recursos = ref<AgendaRecurso[]>([]);
    const filtroRecurso = ref(0);

    // ---- Vista activa ----
    type Vista = 'dia' | 'semana';
    const vistaActiva = ref<Vista>('dia');

    // Citas de la semana keyed por fecha 'YYYY-MM-DD'
    const citasSemana = ref<Record<string, AgendaCita[]>>({});

    // Mapa de fechas con cantidad de citas activas (para los puntitos del calendario)
    const markedDates = ref<Record<string, number>>({});

    // ---- Semana ----
    const semanaStart = computed(() => {
        const d = new Date(`${fechaSel.value}T00:00:00`);
        const dow = d.getDay() === 0 ? 6 : d.getDay() - 1; // 0 = Lunes
        d.setDate(d.getDate() - dow);
        return d;
    });

    const diasSemana = computed((): string[] => {
        const days: string[] = [];
        const start = new Date(semanaStart.value);
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            days.push(d.toISOString().split('T')[0] ?? '');
        }
        return days;
    });

    const semanaLabel = computed((): string => {
        const start = diasSemana.value[0] ?? '';
        const end = diasSemana.value[6] ?? '';
        if (!start || !end) {
            return '';
        }
        const [sy, sm, sd] = start.split('-');
        const [ey, em, ed] = end.split('-');
        const months = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        if (sm === em && sy === ey) {
            return `${sd} - ${ed} ${months[Number.parseInt(sm ?? '1', 10)]} ${sy}`;
        }
        return `${sd} ${months[Number.parseInt(sm ?? '1', 10)]} - ${ed} ${months[Number.parseInt(em ?? '1', 10)]} ${ey}`;
    });

    const prevSemana = () => {
        const d = new Date(`${fechaSel.value}T00:00:00`);
        d.setDate(d.getDate() - 7);
        fechaSel.value = d.toISOString().split('T')[0] ?? today;
    };

    const nextSemana = () => {
        const d = new Date(`${fechaSel.value}T00:00:00`);
        d.setDate(d.getDate() + 7);
        fechaSel.value = d.toISOString().split('T')[0] ?? today;
    };

    // ---- Carga de datos ----
    onMounted(async () => {
        await Promise.all([loadRecursos(), loadCitas(), loadMarkedMonth()]);
    });

    const loadRecursos = async () => {
        const res = await versaFetch({ url: `/${panelUrl}/agenda/api/select/recursos`, method: 'GET' });
        if (res.success === API_RESPONSE_CODES.SUCCESS) {
            recursos.value = res.data;
        }
    };

    const loadCitas = async () => {
        loading.value = true;
        const res = await versaFetch({
            url: `/${panelUrl}/agenda/api/citas/fecha?fecha=${fechaSel.value}`,
            method: 'GET',
        });
        loading.value = false;
        if (res.success === API_RESPONSE_CODES.SUCCESS) {
            citas.value = res.data;
            // Actualizar el puntito del día visible
            const count = (res.data as AgendaCita[]).filter(c => c.estado !== 'cancelada').length;
            markedDates.value = { ...markedDates.value, [fechaSel.value]: count };
        }
    };

    interface CitasRangoData {
        citas: Record<string, AgendaCita[]>;
        conteo: Record<string, number>;
    }

    const loadCitasRango = async (desde: string, hasta: string): Promise<CitasRangoData | null> => {
        const res = await versaFetch({
            url: `/${panelUrl}/agenda/api/citas/rango?desde=${desde}&hasta=${hasta}`,
            method: 'GET',
        });
        if (res.success === API_RESPONSE_CODES.SUCCESS) {
            return res.data as CitasRangoData;
        }
        return null;
    };

    const loadSemana = async () => {
        const desde = diasSemana.value[0] ?? '';
        const hasta = diasSemana.value[6] ?? '';
        if (!desde || !hasta) {
            return;
        }
        loading.value = true;
        const data = await loadCitasRango(desde, hasta);
        loading.value = false;
        if (data) {
            citasSemana.value = data.citas;
            markedDates.value = { ...markedDates.value, ...data.conteo };
        }
    };

    const loadMarkedMonth = async (year?: number, month?: number) => {
        const now = new Date();
        const y = year ?? now.getFullYear();
        const m = month ?? now.getMonth(); // 0-indexed
        const desde = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(y, m + 1, 0).getDate();
        const hasta = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        const data = await loadCitasRango(desde, hasta);
        if (data) {
            markedDates.value = { ...markedDates.value, ...data.conteo };
        }
    };

    // ---- Watchers ----
    watch(fechaSel, () => {
        if (vistaActiva.value === 'semana') {
            loadSemana();
        } else {
            loadCitas();
        }
    });

    watch(vistaActiva, v => {
        if (v === 'semana') {
            loadSemana();
        } else {
            loadCitas();
        }
    });

    const onMonthChange = ({ year, month }: { year: number; month: number }) => {
        loadMarkedMonth(year, month);
    };

    // ---- Computed ----
    const citasFiltradas = computed(() => {
        if (!filtroRecurso.value) {
            return citas.value;
        }
        return citas.value.filter(c => c.id_recurso === filtroRecurso.value);
    });

    const getCitasDia = (fecha: string): AgendaCita[] => {
        const all = citasSemana.value[fecha] ?? [];
        if (!filtroRecurso.value) {
            return all;
        }
        return all.filter(c => c.id_recurso === filtroRecurso.value);
    };

    // ---- Helpers de presentación ----
    const estadoBadge = (estado: string): string =>
        ({
            programada: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            confirmada: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
            cancelada: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
            completada: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
        })[estado] ?? 'bg-gray-100 text-gray-600';

    const estadoDot = (estado: string): string =>
        ({
            programada: 'bg-blue-500',
            confirmada: 'bg-green-500',
            cancelada: 'bg-red-400',
            completada: 'bg-gray-400',
        })[estado] ?? 'bg-gray-400';

    const openNuevaCita = (fecha?: string) => {
        modalCita.show = true;
        modalCita.fechaInicial = fecha ?? fechaSel.value;
    };

    const cambiarEstado = async (cita: AgendaCita, estado: string) => {
        const params: VersaParamsFetch = {
            url: `/${panelUrl}/agenda/api/citas/estado`,
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({ id: cita.id, estado, csrf_token: csrf_token.value }),
        };
        const response = await versaFetch(params);
        if (response.success === API_RESPONSE_CODES.SUCCESS) {
            if (vistaActiva.value === 'semana') {
                await loadSemana();
            } else {
                await loadCitas();
            }
        } else {
            Swal.fire({ title: 'Error', text: response.message, icon: 'error' });
        }
    };

    const enviarRecordatorio = async (cita: AgendaCita) => {
        const ok = await Swal.fire({
            title: `¿Enviar recordatorio a ${cita.nombre_cliente}?`,
            text: 'Se enviará el correo de recordatorio al cliente.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, enviar',
            cancelButtonText: 'No',
        });
        if (!ok.isConfirmed) {
            return;
        }

        const response = await versaFetch({
            url: `/${panelUrl}/agenda/api/citas/recordatorio`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({ id: cita.id, csrf_token: csrf_token.value }),
        });

        if (response.success === API_RESPONSE_CODES.SUCCESS) {
            VersaToast.fire({ title: response.message ?? 'Recordatorio enviado', icon: 'success' });
        } else {
            Swal.fire({ title: 'Error', text: response.message, icon: 'error' });
        }
    };

    const confirmar = (c: AgendaCita) => cambiarEstado(c, 'confirmada');
    const cancelar = async (c: AgendaCita) => {
        const ok = await Swal.fire({
            title: '¿Cancelar cita?',
            text: `Se liberará el horario de las ${c.hora_inicio}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No',
            confirmButtonColor: '#ef4444',
        });
        if (ok.isConfirmed) {
            cambiarEstado(c, 'cancelada');
        }
    };
    const completar = (c: AgendaCita) => cambiarEstado(c, 'completada');

    // Refresh externo (desde CitasList)
    const refresh = () => {
        if (vistaActiva.value === 'semana') {
            loadSemana();
        } else {
            loadCitas();
        }
    };
    defineExpose({ refresh });

    const onCitaFormAccion = (data: { accion: string }) => {
        if (data.accion === 'closeModalReloadTable' || data.accion === 'closeModal') {
            modalCita.show = false;
            if (vistaActiva.value === 'semana') {
                loadSemana();
            } else {
                loadCitas();
            }
            // Refrescar puntitos del mes activo
            const d = new Date(`${fechaSel.value}T00:00:00`);
            loadMarkedMonth(d.getFullYear(), d.getMonth());
        }
    };

    // ---- Formateo de fechas ----
    const dayOfWeekFull = (dateStr: string): string => {
        const names = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const d = new Date(`${dateStr}T00:00:00`);
        const n = d.getDay() === 0 ? 7 : d.getDay();
        return names[n] ?? '';
    };

    const dayOfWeekShort = (dateStr: string): string => {
        const names = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const d = new Date(`${dateStr}T00:00:00`);
        const n = d.getDay() === 0 ? 7 : d.getDay();
        return names[n] ?? '';
    };

    const dayNumber = (dateStr: string): string => dateStr.split('-')[2] ?? '';

    const isToday = (dateStr: string): boolean => dateStr === today;

    const formatDateFull = (dateStr: string): string => {
        if (!dateStr) {
            return '';
        }
        const [y, m, d] = dateStr.split('-');
        const months = [
            '',
            'enero',
            'febrero',
            'marzo',
            'abril',
            'mayo',
            'junio',
            'julio',
            'agosto',
            'septiembre',
            'octubre',
            'noviembre',
            'diciembre',
        ];
        return `${d} de ${months[Number.parseInt(m ?? '1', 10)]} de ${y}`;
    };
</script>

<template>
    <div class="flex flex-col lg:flex-row gap-6">
        <!-- ============ Columna Izquierda: Calendario ============ -->
        <div class="lg:w-72 flex-shrink-0 space-y-4">
            <calendarMini v-model="fechaSel" :markedDates="markedDates" :minDate="''" @monthChange="onMonthChange" />

            <!-- Botón nueva cita -->
            <button
                type="button"
                @click="openNuevaCita()"
                class="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-600 text-black font-bold rounded-xl py-3 text-sm transition-all shadow-sm shadow-brand/20">
                <i class="bi bi-plus-lg text-base"></i>
                Nueva Cita
            </button>

            <!-- Leyenda -->
            <div
                class="p-3 bg-white dark:bg-[#0a0a0a] rounded-xl border border-gray-100 dark:border-gray-800 space-y-2">
                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Estados</p>
                <div class="space-y-1.5">
                    <div
                        v-for="(cfg, estado) in {
                            programada: { color: 'bg-blue-500', label: 'Programada' },
                            confirmada: { color: 'bg-green-500', label: 'Confirmada' },
                            cancelada: { color: 'bg-red-500', label: 'Cancelada' },
                            completada: { color: 'bg-gray-400', label: 'Completada' },
                        }"
                        :key="estado"
                        class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :class="cfg.color"></span>
                        <span class="text-xs text-gray-600 dark:text-gray-400">{{ cfg.label }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- ============ Columna Derecha ============ -->
        <div class="flex-1 min-w-0">
            <!-- Toggle vista + filtro -->
            <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
                <!-- Selector Día / Semana -->
                <div class="flex items-center gap-0.5 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
                    <button
                        type="button"
                        @click="vistaActiva = 'dia'"
                        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        :class="
                            vistaActiva === 'dia'
                                ? 'bg-white dark:bg-black text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        ">
                        <i class="bi bi-calendar3"></i>
                        Día
                    </button>
                    <button
                        type="button"
                        @click="vistaActiva = 'semana'"
                        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        :class="
                            vistaActiva === 'semana'
                                ? 'bg-white dark:bg-black text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        ">
                        <i class="bi bi-calendar-week"></i>
                        Semana
                    </button>
                </div>

                <!-- Filtro por recurso -->
                <select
                    v-model="filtroRecurso"
                    class="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-[#0a0a0a] text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-brand transition-all">
                    <option :value="0">Todos los recursos</option>
                    <option v-for="r in recursos" :key="r.id" :value="r.id">{{ r.nombre }}</option>
                </select>
            </div>

            <!-- ===== VISTA DÍA ===== -->
            <template v-if="vistaActiva === 'dia'">
                <!-- Header del día -->
                <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div>
                        <h2 class="text-lg font-bold text-gray-900 dark:text-white capitalize">
                            {{ dayOfWeekFull(fechaSel) }}
                            <span class="text-gray-400 font-normal text-base ml-1">{{ formatDateFull(fechaSel) }}</span>
                        </h2>
                        <p class="text-sm text-gray-400">
                            {{ citasFiltradas.length }} cita{{ citasFiltradas.length !== 1 ? 's' : '' }}
                            <span v-if="filtroRecurso">
                                para {{ recursos.find(r => r.id === filtroRecurso)?.nombre }}
                            </span>
                        </p>
                    </div>
                </div>

                <!-- Loading -->
                <div v-if="loading" class="flex justify-center py-12">
                    <i class="bi bi-arrow-repeat animate-spin text-3xl text-brand"></i>
                </div>

                <!-- Empty state -->
                <div
                    v-else-if="!citasFiltradas.length"
                    class="flex flex-col items-center justify-center py-16 text-center">
                    <div
                        class="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center mb-4">
                        <i class="bi bi-calendar2 text-3xl text-gray-300 dark:text-gray-700"></i>
                    </div>
                    <p class="text-gray-500 dark:text-gray-400 font-medium">No hay citas para este día</p>
                    <p class="text-sm text-gray-400 mt-1">Haz clic en "Nueva Cita" para agendar</p>
                    <button
                        type="button"
                        @click="openNuevaCita()"
                        class="mt-4 flex items-center gap-2 px-4 py-2 bg-brand/10 hover:bg-brand/20 text-brand rounded-lg text-sm font-bold transition-colors">
                        <i class="bi bi-plus-lg"></i>
                        Nueva Cita
                    </button>
                </div>

                <!-- Lista de citas -->
                <div v-else class="space-y-3">
                    <div
                        v-for="cita in citasFiltradas"
                        :key="cita.id"
                        class="bg-white dark:bg-[#0a0a0a] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-start gap-4 hover:shadow-md dark:hover:shadow-none dark:hover:border-gray-700 transition-all group">
                        <!-- Hora -->
                        <div class="flex flex-col items-center flex-shrink-0 w-14 text-center">
                            <span class="text-lg font-black font-mono text-brand leading-none">
                                {{ cita.hora_inicio }}
                            </span>
                            <span class="text-[10px] text-gray-400 font-mono">{{ cita.hora_fin }}</span>
                            <div
                                class="w-1 flex-1 mt-1 rounded-full min-h-[20px]"
                                :class="{
                                    'bg-blue-200 dark:bg-blue-900': cita.estado === 'programada',
                                    'bg-green-200 dark:bg-green-900': cita.estado === 'confirmada',
                                    'bg-red-200 dark:bg-red-900': cita.estado === 'cancelada',
                                    'bg-gray-200 dark:bg-gray-800': cita.estado === 'completada',
                                }"></div>
                        </div>

                        <!-- Contenido -->
                        <div class="flex-1 min-w-0">
                            <div class="flex items-start justify-between gap-2 flex-wrap">
                                <div>
                                    <p class="font-bold text-gray-900 dark:text-white">{{ cita.nombre_cliente }}</p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                        {{ cita.rut_cliente }}
                                    </p>
                                </div>
                                <span
                                    class="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide flex-shrink-0"
                                    :class="estadoBadge(cita.estado)">
                                    {{ cita.estado }}
                                </span>
                            </div>

                            <div class="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                <span class="flex items-center gap-1">
                                    <i class="bi bi-person-badge text-brand text-xs"></i>
                                    {{ cita.nombre_recurso }}
                                </span>
                                <span v-if="cita.telefono_cliente" class="flex items-center gap-1">
                                    <i class="bi bi-telephone text-xs"></i>
                                    {{ cita.telefono_cliente }}
                                </span>
                            </div>

                            <p v-if="cita.notas" class="text-xs text-gray-500 dark:text-gray-500 mt-1 italic truncate">
                                <i class="bi bi-chat-left-text mr-1"></i>
                                {{ cita.notas }}
                            </p>
                        </div>

                        <!-- Acciones rápidas -->
                        <div
                            class="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                                v-if="cita.estado === 'programada'"
                                type="button"
                                @click="confirmar(cita)"
                                title="Confirmar"
                                class="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                                <i class="bi bi-check-lg text-green-600 dark:text-green-400 text-sm"></i>
                            </button>
                            <button
                                v-if="cita.estado === 'confirmada'"
                                type="button"
                                @click="completar(cita)"
                                title="Completar"
                                class="w-8 h-8 rounded-lg flex items-center justify-center bg-brand/10 hover:bg-brand/20 transition-colors">
                                <i class="bi bi-check2-all text-brand text-sm"></i>
                            </button>
                            <button
                                v-if="['programada', 'confirmada'].includes(cita.estado)"
                                type="button"
                                @click="enviarRecordatorio(cita)"
                                title="Enviar recordatorio"
                                class="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors">
                                <i class="bi bi-bell-fill text-orange-400 text-sm"></i>
                            </button>
                            <button
                                v-if="['programada', 'confirmada'].includes(cita.estado)"
                                type="button"
                                @click="cancelar(cita)"
                                title="Cancelar"
                                class="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                                <i class="bi bi-x-lg text-red-500 text-sm"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </template>

            <!-- ===== VISTA SEMANA ===== -->
            <template v-else>
                <!-- Navegación de semana -->
                <div class="flex items-center justify-between mb-4">
                    <button
                        type="button"
                        @click="prevSemana"
                        class="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
                        <i class="bi bi-chevron-left text-sm"></i>
                    </button>
                    <div class="text-center">
                        <p class="text-sm font-bold text-gray-900 dark:text-white capitalize">{{ semanaLabel }}</p>
                        <p class="text-xs text-gray-400">
                            {{ diasSemana.reduce((t, f) => t + getCitasDia(f).length, 0) }} cita{{
                                diasSemana.reduce((t, f) => t + getCitasDia(f).length, 0) !== 1 ? 's' : ''
                            }}
                            esta semana
                        </p>
                    </div>
                    <button
                        type="button"
                        @click="nextSemana"
                        class="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
                        <i class="bi bi-chevron-right text-sm"></i>
                    </button>
                </div>

                <!-- Loading -->
                <div v-if="loading" class="flex justify-center py-12">
                    <i class="bi bi-arrow-repeat animate-spin text-3xl text-brand"></i>
                </div>

                <!-- Grid semanal -->
                <div v-else class="overflow-x-auto -mx-1">
                    <div class="grid grid-cols-7 gap-2 min-w-[700px] px-1">
                        <div v-for="fecha in diasSemana" :key="fecha" class="flex flex-col min-h-[200px]">
                            <!-- Encabezado del día -->
                            <div
                                class="text-center py-2 px-1 rounded-xl mb-2 cursor-pointer transition-all"
                                :class="
                                    isToday(fecha)
                                        ? 'bg-brand text-black'
                                        : fecha === fechaSel
                                          ? 'bg-brand/10 text-brand'
                                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
                                "
                                @click="
                                    fechaSel = fecha;
                                    vistaActiva = 'dia';
                                ">
                                <div class="text-[10px] font-black uppercase tracking-wide leading-none">
                                    {{ dayOfWeekShort(fecha) }}
                                </div>
                                <div class="text-xl font-black leading-tight mt-0.5">
                                    {{ dayNumber(fecha) }}
                                </div>
                                <div v-if="getCitasDia(fecha).length" class="text-[9px] font-bold mt-0.5 opacity-75">
                                    {{ getCitasDia(fecha).length }}
                                </div>
                            </div>

                            <!-- Citas del día -->
                            <div class="flex-1 space-y-1.5">
                                <div
                                    v-for="cita in getCitasDia(fecha)"
                                    :key="cita.id"
                                    class="p-2 rounded-xl bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-gray-800 hover:shadow-sm dark:hover:border-gray-700 transition-all cursor-pointer group/card"
                                    @click="
                                        fechaSel = fecha;
                                        vistaActiva = 'dia';
                                    "
                                    :title="`${cita.hora_inicio} - ${cita.nombre_cliente}`">
                                    <!-- Barra de color + hora -->
                                    <div class="flex items-center gap-1.5 mb-1">
                                        <span
                                            class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                            :class="estadoDot(cita.estado)"></span>
                                        <span class="text-[11px] font-black font-mono text-brand">
                                            {{ cita.hora_inicio }}
                                        </span>
                                    </div>
                                    <!-- Cliente -->
                                    <p
                                        class="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate leading-tight">
                                        {{ cita.nombre_cliente }}
                                    </p>
                                    <!-- Recurso -->
                                    <p class="text-[10px] text-gray-400 truncate mt-0.5">
                                        {{ cita.nombre_recurso }}
                                    </p>
                                </div>
                            </div>

                            <!-- Sin citas -->
                            <div v-if="!getCitasDia(fecha).length" class="flex-1 flex items-center justify-center">
                                <p class="text-[10px] text-gray-300 dark:text-gray-700 text-center">—</p>
                            </div>

                            <!-- Botón agregar -->
                            <button
                                type="button"
                                @click="openNuevaCita(fecha)"
                                class="mt-2 w-full py-1.5 text-[10px] text-gray-400 hover:text-brand hover:bg-brand/5 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 hover:border-brand/30 transition-all">
                                <i class="bi bi-plus-lg"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </div>

    <!-- Modal wizard nueva cita -->
    <CitaForm @accion="onCitaFormAccion" />
</template>
