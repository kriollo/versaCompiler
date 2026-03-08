<script setup lang="ts">
    import Swal from 'sweetalert2';
    import { computed, inject, ref, type Ref, watch } from 'vue';

    import { defaultHorario, ShowModalHorarioInject } from '@/dashboard/js/agenda/InjectKeys';
    import modal from '@/dashboard/js/components/modal.vue';
    import timeInput from '@/dashboard/js/components/timeInput.vue';
    import weekDayPicker from '@/dashboard/js/components/weekDayPicker.vue';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaFetch } from '@/dashboard/js/functions';
    import type { VersaParamsFetch } from '@/dashboard/types/versaTypes';

    const emit = defineEmits(['accion']);
    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', '');

    const modalState = ShowModalHorarioInject.inject();

    const form = ref({ ...defaultHorario });
    const loading = ref(false);
    const errors = ref<Record<string, string>>({});

    // Sincronizar form cuando se abre el modal con un item
    watch(
        () => modalState.item,
        item => {
            if (item) {
                form.value = {
                    ...item,
                    dias_semana: Array.isArray(item.dias_semana)
                        ? item.dias_semana
                        : JSON.parse((item.dias_semana as unknown as string) || '[]'),
                };
            } else {
                form.value = { ...defaultHorario };
            }
            errors.value = {};
        },
    );

    const title = computed(() => (form.value.action === 'edit' ? 'Editar Horario' : 'Nuevo Horario'));

    // Preview de slots generados
    const slotsPreview = computed(() => {
        const ini = form.value.hora_inicio;
        const fin = form.value.hora_fin;
        const dur = Number(form.value.duracion_minutos);
        if (!ini || !fin || !dur) {
            return '';
        }
        const [ih = 0, im = 0] = ini.split(':').map(Number);
        const [fh = 0, fm = 0] = fin.split(':').map(Number);
        const totalMin = fh * 60 + fm - (ih * 60 + im);
        if (totalMin <= 0) {
            return '';
        }
        const slots = Math.floor(totalMin / dur);
        return `Se generan ${slots} slot${slots !== 1 ? 's' : ''} por día de ${ini} a ${fin} cada ${dur} min`;
    });

    const validate = (): boolean => {
        errors.value = {};
        if (!form.value.nombre.trim()) {
            errors.value.nombre = 'El nombre es requerido';
        }
        if (!form.value.hora_inicio) {
            errors.value.hora_inicio = 'Hora inicio requerida';
        }
        if (!form.value.hora_fin) {
            errors.value.hora_fin = 'Hora fin requerida';
        }
        if (form.value.hora_inicio >= form.value.hora_fin) {
            errors.value.hora_fin = 'La hora de fin debe ser mayor a la de inicio';
        }
        if (!form.value.duracion_minutos) {
            errors.value.duracion_minutos = 'La duración es requerida';
        }
        if (form.value.dias_semana.length === 0) {
            errors.value.dias_semana = 'Selecciona al menos un día';
        }
        return Object.keys(errors.value).length === 0;
    };

    const save = async () => {
        if (!validate()) {
            return;
        }
        loading.value = true;

        const isEdit = form.value.action === 'edit';
        const payload = {
            ...form.value,
            dias_semana: JSON.stringify(form.value.dias_semana),
            csrf_token: csrf_token.value,
        };

        const params: VersaParamsFetch = {
            url: `/${panelUrl}/agenda/api/horarios`,
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
    <modal idModal="modal-horario" :showModal="modalState.show" size="max-w-lg" @accion="close">
        <template #modalTitle>
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                    <i class="bi bi-clock text-brand"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ title }}</h3>
            </div>
        </template>

        <template #modalBody>
            <div class="space-y-5">
                <!-- Nombre -->
                <div class="flex flex-col gap-1">
                    <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Nombre del horario
                        <span class="text-red-500">*</span>
                    </label>
                    <input
                        v-model="form.nombre"
                        type="text"
                        placeholder="Ej: Turno Mañana, Atención General..."
                        class="w-full px-4 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                        :class="
                            errors.nombre
                                ? 'border-red-400 dark:border-red-600'
                                : 'border-gray-200 dark:border-gray-700'
                        " />
                    <span v-if="errors.nombre" class="text-xs text-red-500">{{ errors.nombre }}</span>
                </div>

                <!-- Días de semana -->
                <div class="flex flex-col gap-1">
                    <weekDayPicker v-model="form.dias_semana" label="Días activos *" />
                    <span v-if="errors.dias_semana" class="text-xs text-red-500">{{ errors.dias_semana }}</span>
                </div>

                <!-- Horas -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <timeInput
                            v-model="form.hora_inicio"
                            label="Hora inicio *"
                            :step="30"
                            :max="form.hora_fin || '23:30'" />
                        <span v-if="errors.hora_inicio" class="text-xs text-red-500">{{ errors.hora_inicio }}</span>
                    </div>
                    <div>
                        <timeInput
                            v-model="form.hora_fin"
                            label="Hora fin *"
                            :step="30"
                            :min="form.hora_inicio || '00:30'" />
                        <span v-if="errors.hora_fin" class="text-xs text-red-500">{{ errors.hora_fin }}</span>
                    </div>
                </div>

                <!-- Duración -->
                <div class="flex flex-col gap-1">
                    <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Duración de cada cita
                        <span class="text-red-500">*</span>
                    </label>
                    <div class="flex gap-2">
                        <button
                            v-for="min in [15, 20, 30, 45, 60]"
                            :key="min"
                            type="button"
                            @click="form.duracion_minutos = min"
                            class="flex-1 py-2 rounded-xl text-sm font-bold border transition-all"
                            :class="
                                form.duracion_minutos === min
                                    ? 'bg-brand text-black border-brand shadow-sm'
                                    : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-brand/50'
                            ">
                            {{ min }}'
                        </button>
                    </div>
                    <span v-if="errors.duracion_minutos" class="text-xs text-red-500">
                        {{ errors.duracion_minutos }}
                    </span>
                </div>

                <!-- Preview -->
                <div
                    v-if="slotsPreview"
                    class="flex items-center gap-2 p-3 bg-brand/5 border border-brand/20 rounded-xl">
                    <i class="bi bi-info-circle text-brand text-sm"></i>
                    <span class="text-xs text-gray-600 dark:text-gray-400">{{ slotsPreview }}</span>
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
                class="flex items-center gap-2 px-5 py-2 bg-brand text-black rounded-lg text-sm font-bold hover:bg-brand-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <i v-if="loading" class="bi bi-arrow-repeat animate-spin"></i>
                <i v-else class="bi bi-check-lg"></i>
                {{ loading ? 'Guardando...' : 'Guardar' }}
            </button>
        </template>
    </modal>
</template>
