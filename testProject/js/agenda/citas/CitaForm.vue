<script setup lang="ts">
    import Swal from 'sweetalert2';
    import { computed, inject, ref, type Ref, watch } from 'vue';

    import { type AgendaCliente, type AgendaRecurso, ShowModalCitaInject } from '@/dashboard/js/agenda/InjectKeys';
    import calendarMini from '@/dashboard/js/components/calendarMini.vue';
    import modal from '@/dashboard/js/components/modal.vue';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaFetch } from '@/dashboard/js/functions';
    import type { VersaParamsFetch } from '@/dashboard/types/versaTypes';

    interface Slot {
        hora: string;
        disponible: boolean;
    }

    const emit = defineEmits(['accion']);
    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', '');

    const modalState = ShowModalCitaInject.inject();

    // ---- Estado del wizard ----
    const step = ref(1);
    const TOTAL_STEPS = 4;

    // Paso 1: Recurso
    const recursos = ref<AgendaRecurso[]>([]);
    const recursoSelected = ref<AgendaRecurso | null>(null);
    const loadingRecursos = ref(false);

    // Paso 2: Fecha
    const fechaSelected = ref('');
    const today = new Date().toISOString().split('T')[0] ?? '';

    // Mapa de citas por fecha para el calendario (puntos indicadores)
    const markedDates = ref<Record<string, number>>({});

    // Paso 3: Hora
    const slots = ref<Slot[]>([]);
    const horaSelected = ref('');
    const loadingSlots = ref(false);

    // Paso 4: Cliente
    const rutBusqueda = ref('');
    const clienteFound = ref<AgendaCliente | null>(null);
    const clienteNewForm = ref({ nombre: '', correo: '', telefono: '' });
    const showNewClienteForm = ref(false);
    const loadingCliente = ref(false);
    const notas = ref('');

    const loading = ref(false);

    // ---- Computados ----
    const diasActivosRecurso = computed((): number[] => {
        if (!recursoSelected.value?.dias_semana) {
            return [];
        }
        const ds = recursoSelected.value.dias_semana;
        return Array.isArray(ds) ? ds : JSON.parse((ds as unknown as string) || '[]');
    });

    const canGoNext = computed((): boolean => {
        if (step.value === 1) {
            return Boolean(recursoSelected.value);
        }
        if (step.value === 2) {
            return Boolean(fechaSelected.value);
        }
        if (step.value === 3) {
            return Boolean(horaSelected.value);
        }
        if (step.value === 4) {
            return Boolean(clienteFound.value || (showNewClienteForm.value && clienteNewForm.value.nombre));
        }
        return false;
    });

    const stepLabels = ['Recurso', 'Fecha', 'Hora', 'Cliente'];

    // ---- Reset al abrir/cerrar ----
    watch(
        () => modalState.show,
        async show => {
            if (show) {
                resetWizard();
                await loadRecursos();
                if (modalState.fechaInicial) {
                    fechaSelected.value = modalState.fechaInicial;
                }
            }
        },
    );

    const resetWizard = () => {
        step.value = 1;
        recursoSelected.value = null;
        fechaSelected.value = modalState.fechaInicial ?? '';
        slots.value = [];
        horaSelected.value = '';
        clienteFound.value = null;
        clienteNewForm.value = { nombre: '', correo: '', telefono: '' };
        showNewClienteForm.value = false;
        rutBusqueda.value = '';
        notas.value = '';
    };

    // ---- Carga de datos ----
    const loadRecursos = async () => {
        loadingRecursos.value = true;
        const res = await versaFetch({ url: `/${panelUrl}/agenda/api/select/recursos`, method: 'GET' });
        loadingRecursos.value = false;
        if (res.success === API_RESPONSE_CODES.SUCCESS) {
            recursos.value = res.data;
        }
    };

    const loadSlots = async () => {
        if (!recursoSelected.value || !fechaSelected.value) {
            return;
        }
        loadingSlots.value = true;
        horaSelected.value = '';
        const res = await versaFetch({
            url: `/${panelUrl}/agenda/api/citas/slots?id_recurso=${recursoSelected.value.id}&fecha=${fechaSelected.value}`,
            method: 'GET',
        });
        loadingSlots.value = false;
        slots.value = res.success === API_RESPONSE_CODES.SUCCESS ? res.data : [];
    };

    // ---- Navegación del wizard ----
    const goNext = async () => {
        if (!canGoNext.value) {
            return;
        }
        if (step.value === 2) {
            await loadSlots();
        }
        step.value++;
    };

    const goPrev = () => {
        if (step.value > 1) {
            step.value--;
        }
    };

    const selectRecurso = (r: AgendaRecurso) => {
        recursoSelected.value = r;
        fechaSelected.value = '';
        horaSelected.value = '';
    };

    watch(fechaSelected, () => {
        horaSelected.value = '';
    });

    // ---- Búsqueda de cliente por RUT ----
    const formatRut = (rut: string): string => {
        const clean = rut.replaceAll(/[^0-9kK]/g, '').toUpperCase();
        if (clean.length < 2) {
            return clean;
        }
        const body = clean.slice(0, -1);
        const dv = clean.slice(-1);
        return `${body}-${dv}`;
    };

    const onRutInput = (e: Event) => {
        rutBusqueda.value = formatRut((e.target as HTMLInputElement).value);
    };

    const buscarCliente = async () => {
        const rut = formatRut(rutBusqueda.value);
        if (!rut) {
            return;
        }
        loadingCliente.value = true;
        const res = await versaFetch({ url: `/${panelUrl}/agenda/api/clientes/buscar?rut=${rut}`, method: 'GET' });
        loadingCliente.value = false;
        if (res.success === API_RESPONSE_CODES.SUCCESS) {
            clienteFound.value = res.data;
            showNewClienteForm.value = false;
        } else {
            clienteFound.value = null;
            showNewClienteForm.value = true;
        }
    };

    // ---- Guardar cita ----
    const save = async () => {
        if (!recursoSelected.value || !fechaSelected.value || !horaSelected.value) {
            return;
        }

        loading.value = true;

        // Si hay cliente nuevo, crearlo primero
        let idCliente = clienteFound.value?.id ?? 0;

        if (!idCliente && showNewClienteForm.value) {
            const rut = formatRut(rutBusqueda.value);
            const resCliente = await versaFetch({
                url: `/${panelUrl}/agenda/api/clientes`,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({
                    action: 'create',
                    rut,
                    nombre: clienteNewForm.value.nombre,
                    correo: clienteNewForm.value.correo,
                    telefono: clienteNewForm.value.telefono,
                    platform: 'whatsapp',
                    csrf_token: csrf_token.value,
                }),
            });

            if (resCliente.success !== API_RESPONSE_CODES.SUCCESS) {
                loading.value = false;
                Swal.fire({
                    title: 'Error',
                    text: resCliente.message || 'No se pudo registrar el cliente',
                    icon: 'error',
                });
                return;
            }
            idCliente = resCliente.id ?? 0;
        }

        const params: VersaParamsFetch = {
            url: `/${panelUrl}/agenda/api/citas`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({
                action: 'create',
                id_cliente: idCliente,
                id_recurso: recursoSelected.value.id,
                fecha: fechaSelected.value,
                hora_inicio: horaSelected.value,
                notas: notas.value,
                csrf_token: csrf_token.value,
            }),
        };

        const response = await versaFetch(params);
        loading.value = false;

        if (response.success === API_RESPONSE_CODES.SUCCESS) {
            Swal.fire({
                title: '¡Cita agendada!',
                text: `${fechaSelected.value} a las ${horaSelected.value}`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
            });
            emit('accion', { accion: 'closeModalReloadTable' });
        } else {
            Swal.fire({ title: 'Error', text: response.message, icon: 'error' });
        }
    };

    const close = () => emit('accion', { accion: 'closeModal' });

    // Nombre del día de semana
    const dayOfWeek = (dateStr: string): string => {
        if (!dateStr) {
            return '';
        }
        const names = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
        const d = new Date(`${dateStr}T00:00:00`);
        const n = d.getDay() === 0 ? 7 : d.getDay();
        return names[n] ?? '';
    };
</script>

<template>
    <modal idModal="modal-cita-wizard" :showModal="modalState.show" size="max-w-2xl" :showFooter="true" @accion="close">
        <template #modalTitle>
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                        <i class="bi bi-calendar2-plus text-brand"></i>
                    </div>
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">Nueva Cita</h3>
                </div>
                <!-- Progreso -->
                <div class="flex items-center gap-1.5">
                    <template v-for="(label, i) in stepLabels" :key="i">
                        <div
                            class="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all"
                            :class="
                                step === Number(i) + 1
                                    ? 'bg-brand text-black'
                                    : step > Number(i) + 1
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                            ">
                            <i v-if="step > Number(i) + 1" class="bi bi-check text-xs"></i>
                            <span v-else>{{ Number(i) + 1 }}</span>
                            <span class="hidden sm:inline">{{ label }}</span>
                        </div>
                        <i
                            v-if="stepLabels[stepLabels.length - 1] !== label"
                            class="bi bi-chevron-right text-gray-300 text-xs"></i>
                    </template>
                </div>
            </div>
        </template>

        <template #modalBody>
            <!-- PASO 1: SELECCIONAR RECURSO -->
            <div v-if="step === 1">
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Selecciona quién atenderá la cita:</p>
                <div v-if="loadingRecursos" class="flex justify-center py-8">
                    <i class="bi bi-arrow-repeat animate-spin text-2xl text-brand"></i>
                </div>
                <div v-else-if="!recursos.length" class="text-center py-8 text-gray-400">
                    <i class="bi bi-person-x text-3xl mb-2 block"></i>
                    <p class="text-sm">No hay recursos disponibles. Crea uno primero en Configuración.</p>
                </div>
                <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        v-for="r in recursos"
                        :key="r.id"
                        type="button"
                        @click="selectRecurso(r)"
                        class="flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left"
                        :class="
                            recursoSelected?.id === r.id
                                ? 'border-brand bg-brand/5 dark:bg-brand/10'
                                : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-[#0a0a0a]'
                        ">
                        <!-- Avatar inicial -->
                        <div
                            class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                            :class="
                                recursoSelected?.id === r.id
                                    ? 'bg-brand text-black'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                            ">
                            {{ r.nombre.charAt(0).toUpperCase() }}
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="font-bold text-sm text-gray-900 dark:text-white truncate">{{ r.nombre }}</p>
                            <p v-if="r.descripcion" class="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {{ r.descripcion }}
                            </p>
                            <p class="text-xs text-gray-400 mt-0.5">
                                <i class="bi bi-clock text-brand text-[10px]"></i>
                                {{ r.hora_inicio }} - {{ r.hora_fin }} · {{ r.duracion_minutos }}'
                            </p>
                        </div>
                        <i
                            v-if="recursoSelected?.id === r.id"
                            class="bi bi-check-circle-fill text-brand flex-shrink-0"></i>
                    </button>
                </div>
            </div>

            <!-- PASO 2: SELECCIONAR FECHA -->
            <div v-if="step === 2" class="flex flex-col items-center gap-4">
                <p class="text-sm text-gray-500 dark:text-gray-400 self-start">
                    Selecciona una fecha disponible para
                    <strong class="text-gray-900 dark:text-white">{{ recursoSelected?.nombre }}</strong>
                    :
                </p>
                <div class="w-full max-w-xs">
                    <calendarMini
                        v-model="fechaSelected"
                        :availableDays="diasActivosRecurso"
                        :minDate="today"
                        :markedDates="markedDates" />
                </div>
                <div
                    v-if="fechaSelected"
                    class="flex items-center gap-2 px-4 py-2 bg-brand/10 rounded-xl border border-brand/20">
                    <i class="bi bi-calendar-check text-brand"></i>
                    <span class="text-sm font-bold text-gray-900 dark:text-white capitalize">
                        {{ dayOfWeek(fechaSelected) }} {{ fechaSelected }}
                    </span>
                </div>
            </div>

            <!-- PASO 3: SELECCIONAR HORA -->
            <div v-if="step === 3">
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Horarios disponibles para el
                    <strong class="capitalize text-gray-900 dark:text-white">
                        {{ dayOfWeek(fechaSelected) }} {{ fechaSelected }}
                    </strong>
                    :
                </p>
                <div v-if="loadingSlots" class="flex justify-center py-8">
                    <i class="bi bi-arrow-repeat animate-spin text-2xl text-brand"></i>
                </div>
                <div v-else-if="!slots.length" class="text-center py-8 text-gray-400">
                    <i class="bi bi-calendar-x text-3xl mb-2 block"></i>
                    <p class="text-sm">No hay horarios disponibles para esta fecha.</p>
                </div>
                <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    <button
                        v-for="slot in slots"
                        :key="slot.hora"
                        type="button"
                        :disabled="!slot.disponible"
                        @click="slot.disponible && (horaSelected = slot.hora)"
                        class="py-2.5 px-3 rounded-xl text-sm font-bold border-2 transition-all"
                        :class="[
                            !slot.disponible
                                ? 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-700 cursor-not-allowed line-through'
                                : horaSelected === slot.hora
                                  ? 'border-brand bg-brand text-black shadow-sm shadow-brand/30 scale-105'
                                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-gray-700 dark:text-gray-300 hover:border-brand/60 hover:bg-brand/5',
                        ]">
                        {{ slot.hora }}
                    </button>
                </div>
                <div class="flex items-center gap-4 mt-4 text-xs text-gray-400">
                    <span class="flex items-center gap-1.5">
                        <span class="w-3 h-3 rounded bg-brand inline-block"></span>
                        Seleccionado
                    </span>
                    <span class="flex items-center gap-1.5">
                        <span class="w-3 h-3 rounded border-2 border-gray-200 dark:border-gray-700 inline-block"></span>
                        Disponible
                    </span>
                    <span class="flex items-center gap-1.5">
                        <span class="w-3 h-3 rounded bg-gray-100 dark:bg-gray-900 inline-block"></span>
                        Ocupado
                    </span>
                </div>
            </div>

            <!-- PASO 4: CLIENTE -->
            <div v-if="step === 4" class="space-y-4">
                <!-- Resumen de la cita -->
                <div
                    class="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-3 text-center">
                    <div>
                        <p class="text-[10px] text-gray-400 uppercase font-bold">Recurso</p>
                        <p class="text-sm font-bold text-gray-900 dark:text-white truncate">
                            {{ recursoSelected?.nombre }}
                        </p>
                    </div>
                    <div>
                        <p class="text-[10px] text-gray-400 uppercase font-bold">Fecha</p>
                        <p class="text-sm font-bold text-gray-900 dark:text-white capitalize">
                            {{ dayOfWeek(fechaSelected) }} {{ fechaSelected }}
                        </p>
                    </div>
                    <div>
                        <p class="text-[10px] text-gray-400 uppercase font-bold">Hora</p>
                        <p class="text-sm font-bold text-brand">{{ horaSelected }}</p>
                    </div>
                </div>

                <!-- Búsqueda de cliente -->
                <div>
                    <label
                        class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-2">
                        Buscar cliente por RUT
                    </label>
                    <div class="flex gap-2">
                        <input
                            :value="rutBusqueda"
                            @input="onRutInput"
                            type="text"
                            placeholder="12.345.678-9"
                            maxlength="12"
                            class="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand focus:border-brand font-mono transition-all" />
                        <button
                            type="button"
                            @click="buscarCliente"
                            :disabled="loadingCliente"
                            class="px-4 py-2.5 rounded-xl bg-brand text-black text-sm font-bold hover:bg-brand-600 transition-all disabled:opacity-50 flex items-center gap-2">
                            <i v-if="loadingCliente" class="bi bi-arrow-repeat animate-spin"></i>
                            <i v-else class="bi bi-search"></i>
                        </button>
                    </div>
                </div>

                <!-- Cliente encontrado -->
                <div
                    v-if="clienteFound"
                    class="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <div
                        class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                        <i class="bi bi-person-check text-green-600 dark:text-green-400"></i>
                    </div>
                    <div>
                        <p class="font-bold text-sm text-gray-900 dark:text-white">{{ clienteFound.nombre }}</p>
                        <p class="text-xs text-gray-500">{{ clienteFound.rut }} · {{ clienteFound.telefono }}</p>
                    </div>
                    <button
                        type="button"
                        @click="
                            clienteFound = null;
                            showNewClienteForm = false;
                            rutBusqueda = '';
                        "
                        class="ml-auto text-gray-400 hover:text-red-500">
                        <i class="bi bi-x-lg text-sm"></i>
                    </button>
                </div>

                <!-- Formulario nuevo cliente -->
                <div
                    v-if="showNewClienteForm && !clienteFound"
                    class="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl space-y-3">
                    <div class="flex items-center gap-2 text-sm font-bold text-yellow-700 dark:text-yellow-400">
                        <i class="bi bi-person-plus"></i>
                        Cliente no encontrado — Registrar nuevo
                    </div>
                    <div class="grid grid-cols-1 gap-3">
                        <input
                            v-model="clienteNewForm.nombre"
                            type="text"
                            placeholder="Nombre completo *"
                            class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand transition-all" />
                        <input
                            v-model="clienteNewForm.correo"
                            type="email"
                            placeholder="Correo electrónico *"
                            class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand transition-all" />
                        <input
                            v-model="clienteNewForm.telefono"
                            type="tel"
                            placeholder="Teléfono *"
                            class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand transition-all" />
                    </div>
                </div>

                <!-- Notas -->
                <div class="flex flex-col gap-1">
                    <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Notas (opcional)
                    </label>
                    <textarea
                        v-model="notas"
                        rows="2"
                        placeholder="Observaciones adicionales para la cita..."
                        class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand transition-all resize-none"></textarea>
                </div>
            </div>
        </template>

        <template #modalFooter>
            <div class="flex gap-2">
                <button
                    type="button"
                    @click="step === 1 ? close() : goPrev()"
                    class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <i class="bi" :class="step === 1 ? 'bi-x-lg' : 'bi-chevron-left'"></i>
                    {{ step === 1 ? 'Cancelar' : 'Anterior' }}
                </button>
                <button
                    v-if="step > 1"
                    type="button"
                    @click="close()"
                    class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <i class="bi bi-x-lg"></i>
                    Cancelar
                </button>
            </div>

            <button
                v-if="step < TOTAL_STEPS"
                type="button"
                @click="goNext"
                :disabled="!canGoNext"
                class="flex items-center gap-2 px-5 py-2 bg-brand text-black rounded-lg text-sm font-bold hover:bg-brand-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                Siguiente
                <i class="bi bi-chevron-right"></i>
            </button>

            <button
                v-else
                type="button"
                @click="save"
                :disabled="loading || !canGoNext"
                class="flex items-center gap-2 px-5 py-2 bg-brand text-black rounded-lg text-sm font-bold hover:bg-brand-600 transition-all disabled:opacity-40">
                <i v-if="loading" class="bi bi-arrow-repeat animate-spin"></i>
                <i v-else class="bi bi-calendar2-check"></i>
                {{ loading ? 'Guardando...' : 'Confirmar Cita' }}
            </button>
        </template>
    </modal>
</template>
