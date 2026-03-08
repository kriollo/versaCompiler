<script setup lang="ts">
    import Swal from 'sweetalert2';
    import { computed, inject, onMounted, ref, type Ref, watch } from 'vue';

    import { type AgendaDescanso, defaultRecurso, ShowModalRecursoInject } from '@/dashboard/js/agenda/InjectKeys';
    import modal from '@/dashboard/js/components/modal.vue';
    import timeInput from '@/dashboard/js/components/timeInput.vue';
    import weekDayPicker from '@/dashboard/js/components/weekDayPicker.vue';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaFetch } from '@/dashboard/js/functions';
    import type { VersaParamsFetch } from '@/dashboard/types/versaTypes';

    interface HorarioOption {
        id: number;
        nombre: string;
        hora_inicio: string;
        hora_fin: string;
        duracion_minutos: number;
    }

    const emit = defineEmits(['accion']);
    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', '');

    const modalState = ShowModalRecursoInject.inject();
    const form = ref({ ...defaultRecurso });
    const loading = ref(false);
    const errors = ref<Record<string, string>>({});
    const horarios = ref<HorarioOption[]>([]);

    // Form de descanso inline
    const showDescansoForm = ref(false);
    const nuevoDescanso = ref<AgendaDescanso>({ nombre: '', hora_inicio: '13:00', hora_fin: '14:00', dias_semana: [] });

    onMounted(loadHorarios);

    watch(
        () => modalState.item,
        item => {
            if (item) {
                form.value = {
                    ...item,
                    descansos: item.descansos ?? [],
                };
            } else {
                form.value = { ...defaultRecurso };
            }
            errors.value = {};
            showDescansoForm.value = false;
        },
    );

    async function loadHorarios() {
        const response = await versaFetch({ url: `/${panelUrl}/agenda/api/select/horarios`, method: 'GET' });
        if (response.success === API_RESPONSE_CODES.SUCCESS) {
            horarios.value = response.data;
        }
    }

    const title = computed(() => (form.value.action === 'edit' ? 'Editar Recurso' : 'Nuevo Recurso'));

    const validate = (): boolean => {
        errors.value = {};
        if (!form.value.nombre.trim()) {
            errors.value.nombre = 'El nombre es requerido';
        }
        if (!form.value.id_horario) {
            errors.value.id_horario = 'Selecciona un horario';
        }
        return Object.keys(errors.value).length === 0;
    };

    const addDescanso = () => {
        if (!nuevoDescanso.value.nombre || !nuevoDescanso.value.hora_inicio || !nuevoDescanso.value.hora_fin) {
            return;
        }
        form.value.descansos = [...(form.value.descansos ?? []), { ...nuevoDescanso.value }];
        nuevoDescanso.value = { nombre: '', hora_inicio: '13:00', hora_fin: '14:00', dias_semana: [] };
        showDescansoForm.value = false;
    };

    const removeDescanso = (idx: number) => {
        form.value.descansos = (form.value.descansos ?? []).filter((_, i) => i !== idx);
    };

    const save = async () => {
        if (!validate()) {
            return;
        }
        loading.value = true;

        const isEdit = form.value.action === 'edit';
        const payload = {
            ...form.value,
            descansos: form.value.descansos ?? [],
            csrf_token: csrf_token.value,
        };

        const params: VersaParamsFetch = {
            url: `/${panelUrl}/agenda/api/recursos`,
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify(payload),
        };

        const response = await versaFetch(params);
        loading.value = false;

        if (response.success === API_RESPONSE_CODES.SUCCESS) {
            Swal.fire({
                title: '¡Guardado!',
                text: response.message,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
            });
            emit('accion', { accion: 'closeModalReloadTable' });
        } else {
            if (response.errors) {
                errors.value = response.errors;
            }
            Swal.fire({ title: 'Error', text: response.message, icon: 'error' });
        }
    };

    const close = () => emit('accion', { accion: 'closeModal' });
</script>

<template>
    <modal idModal="modal-recurso" :showModal="modalState.show" size="max-w-2xl" @accion="close">
        <template #modalTitle>
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <i class="bi bi-person-badge text-green-600 dark:text-green-400"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ title }}</h3>
            </div>
        </template>

        <template #modalBody>
            <div class="space-y-5">
                <!-- Datos básicos -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Nombre -->
                    <div class="flex flex-col gap-1">
                        <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Nombre
                            <span class="text-red-500">*</span>
                        </label>
                        <input
                            v-model="form.nombre"
                            type="text"
                            placeholder="Ej: Dr. Juan Pérez"
                            class="w-full px-4 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                            :class="errors.nombre ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'" />
                        <span v-if="errors.nombre" class="text-xs text-red-500">{{ errors.nombre }}</span>
                    </div>

                    <!-- Email -->
                    <div class="flex flex-col gap-1">
                        <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Email (opcional)
                        </label>
                        <input
                            v-model="form.email"
                            type="email"
                            placeholder="correo@ejemplo.com"
                            class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all" />
                    </div>
                </div>

                <!-- Descripción -->
                <div class="flex flex-col gap-1">
                    <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Descripción (opcional)
                    </label>
                    <textarea
                        v-model="form.descripcion"
                        rows="2"
                        placeholder="Especialidad, cargo, información adicional..."
                        class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all resize-none"></textarea>
                </div>

                <!-- Horario base -->
                <div class="flex flex-col gap-1">
                    <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Horario base
                        <span class="text-red-500">*</span>
                    </label>
                    <select
                        v-model="form.id_horario"
                        class="w-full px-4 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                        :class="errors.id_horario ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'">
                        <option :value="0">— Seleccionar horario —</option>
                        <option v-for="h in horarios" :key="h.id" :value="h.id">
                            {{ h.nombre }} ({{ h.hora_inicio }} - {{ h.hora_fin }}, {{ h.duracion_minutos }}')
                        </option>
                    </select>
                    <span v-if="errors.id_horario" class="text-xs text-red-500">{{ errors.id_horario }}</span>
                </div>

                <!-- Descansos -->
                <div class="flex flex-col gap-3">
                    <div class="flex items-center justify-between">
                        <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Períodos de descanso
                        </label>
                        <button
                            type="button"
                            @click="showDescansoForm = !showDescansoForm"
                            class="flex items-center gap-1 text-xs font-bold text-brand hover:text-brand-600 transition-colors">
                            <i class="bi" :class="showDescansoForm ? 'bi-dash-lg' : 'bi-plus-lg'"></i>
                            Agregar descanso
                        </button>
                    </div>

                    <!-- Lista de descansos -->
                    <div v-if="(form.descansos ?? []).length" class="flex flex-wrap gap-2">
                        <div
                            v-for="(d, idx) in form.descansos"
                            :key="idx"
                            class="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm">
                            <i class="bi bi-moon text-brand text-xs"></i>
                            <span class="font-medium">{{ d.nombre }}</span>
                            <span class="text-gray-500 text-xs">{{ d.hora_inicio }}-{{ d.hora_fin }}</span>
                            <button
                                type="button"
                                @click="removeDescanso(idx)"
                                class="text-gray-400 hover:text-red-500 transition-colors ml-1">
                                <i class="bi bi-x text-sm"></i>
                            </button>
                        </div>
                    </div>

                    <div v-else-if="!showDescansoForm" class="text-xs text-gray-400 italic">
                        Sin descansos definidos — el recurso atiende todo el horario.
                    </div>

                    <!-- Formulario inline descanso -->
                    <div
                        v-if="showDescansoForm"
                        class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div class="flex flex-col gap-1">
                                <label
                                    class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Nombre
                                </label>
                                <input
                                    v-model="nuevoDescanso.nombre"
                                    type="text"
                                    placeholder="Ej: Almuerzo"
                                    class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-brand" />
                            </div>
                            <timeInput v-model="nuevoDescanso.hora_inicio" label="Desde" :step="30" />
                            <timeInput v-model="nuevoDescanso.hora_fin" label="Hasta" :step="30" />
                        </div>
                        <weekDayPicker v-model="nuevoDescanso.dias_semana" label="Días (vacío = todos)" />
                        <div class="flex justify-end gap-2">
                            <button
                                type="button"
                                @click="showDescansoForm = false"
                                class="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                Cancelar
                            </button>
                            <button
                                type="button"
                                @click="addDescanso"
                                class="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand text-black hover:bg-brand-600 transition-colors">
                                Agregar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </template>

        <template #modalFooter>
            <button
                type="button"
                @click="close"
                class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                Cancelar
            </button>
            <button
                type="button"
                @click="save"
                :disabled="loading"
                class="flex items-center gap-2 px-5 py-2 bg-brand text-black rounded-lg text-sm font-bold hover:bg-brand-600 transition-all disabled:opacity-50">
                <i v-if="loading" class="bi bi-arrow-repeat animate-spin"></i>
                <i v-else class="bi bi-check-lg"></i>
                {{ loading ? 'Guardando...' : 'Guardar' }}
            </button>
        </template>
    </modal>
</template>
