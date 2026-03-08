<script setup lang="ts">
    import Swal from 'sweetalert2';
    import { computed, inject, ref, type Ref, watch } from 'vue';

    import { defaultCliente, ShowModalClienteInject } from '@/dashboard/js/agenda/InjectKeys';
    import modal from '@/dashboard/js/components/modal.vue';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaFetch } from '@/dashboard/js/functions';
    import type { VersaParamsFetch } from '@/dashboard/types/versaTypes';

    const emit = defineEmits(['accion']);
    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', '');

    const modalState = ShowModalClienteInject.inject();
    const form = ref({ ...defaultCliente });
    const loading = ref(false);
    const errors = ref<Record<string, string>>({});

    watch(
        () => modalState.item,
        item => {
            form.value = item ? { ...item } : { ...defaultCliente };
            errors.value = {};
        },
    );

    const title = computed(() => (form.value.action === 'edit' ? 'Editar Cliente' : 'Nuevo Cliente'));

    // Formateo de RUT chileno
    const formatRut = (rut: string): string => {
        const clean = rut.replaceAll(/[^0-9kK]/g, '').toUpperCase();
        if (clean.length < 2) {
            return clean;
        }
        const body = clean.slice(0, -1);
        const dv = clean.slice(-1);
        const formatted = body.replaceAll(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `${formatted}-${dv}`;
    };

    const onRutInput = (e: Event) => {
        const raw = (e.target as HTMLInputElement).value;
        form.value.rut = formatRut(raw);
    };

    // Validar dígito verificador RUT chileno
    const validarRut = (rut: string): boolean => {
        const clean = rut.replaceAll(/[^0-9kK]/g, '').toUpperCase();
        if (clean.length < 2) {
            return false;
        }
        const body = clean.slice(0, -1);
        const dv = clean.slice(-1);
        let sum = 0;
        let factor = 2;
        for (let i = body.length - 1; i >= 0; i--) {
            sum += Number.parseInt(body[i] ?? '0', 10) * factor;
            factor = factor === 7 ? 2 : factor + 1;
        }
        const expected = 11 - (sum % 11);
        let dvCalc = '';
        if (expected === 11) {
            dvCalc = '0';
        } else if (expected === 10) {
            dvCalc = 'K';
        } else {
            dvCalc = String(expected);
        }
        return dvCalc === dv;
    };

    const validate = (): boolean => {
        errors.value = {};
        const rut = form.value.rut.replaceAll(/[^0-9kK]/g, '').toUpperCase();
        if (!rut) {
            errors.value.rut = 'El RUT es requerido';
        } else if (!validarRut(form.value.rut)) {
            errors.value.rut = 'RUT inválido';
        }
        if (!form.value.nombre.trim()) {
            errors.value.nombre = 'El nombre es requerido';
        }
        if (!form.value.correo.trim()) {
            errors.value.correo = 'El correo es requerido';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.correo)) {
            errors.value.correo = 'Correo inválido';
        }
        if (!form.value.telefono.trim()) {
            errors.value.telefono = 'El teléfono es requerido';
        }
        return Object.keys(errors.value).length === 0;
    };

    const save = async () => {
        if (!validate()) {
            return;
        }
        loading.value = true;

        const isEdit = form.value.action === 'edit';
        const params: VersaParamsFetch = {
            url: `/${panelUrl}/agenda/api/clientes`,
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({
                ...form.value,
                platform: form.value.platform || 'whatsapp',
                csrf_token: csrf_token.value,
            }),
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
    <modal idModal="modal-cliente-agenda" :showModal="modalState.show" size="max-w-lg" @accion="close">
        <template #modalTitle>
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <i class="bi bi-person text-purple-600 dark:text-purple-400"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ title }}</h3>
            </div>
        </template>

        <template #modalBody>
            <div class="space-y-4">
                <!-- RUT -->
                <div class="flex flex-col gap-1">
                    <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        RUT
                        <span class="text-red-500">*</span>
                    </label>
                    <input
                        :value="form.rut"
                        @input="onRutInput"
                        type="text"
                        placeholder="12.345.678-9"
                        maxlength="12"
                        class="w-full px-4 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all font-mono"
                        :class="
                            errors.rut ? 'border-red-400 dark:border-red-600' : 'border-gray-200 dark:border-gray-700'
                        " />
                    <span v-if="errors.rut" class="text-xs text-red-500">{{ errors.rut }}</span>
                </div>

                <!-- Nombre -->
                <div class="flex flex-col gap-1">
                    <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Nombre completo
                        <span class="text-red-500">*</span>
                    </label>
                    <input
                        v-model="form.nombre"
                        type="text"
                        placeholder="Juan Pérez González"
                        class="w-full px-4 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                        :class="
                            errors.nombre
                                ? 'border-red-400 dark:border-red-600'
                                : 'border-gray-200 dark:border-gray-700'
                        " />
                    <span v-if="errors.nombre" class="text-xs text-red-500">{{ errors.nombre }}</span>
                </div>

                <!-- Correo -->
                <div class="flex flex-col gap-1">
                    <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Correo electrónico
                        <span class="text-red-500">*</span>
                    </label>
                    <input
                        v-model="form.correo"
                        type="email"
                        placeholder="correo@ejemplo.com"
                        class="w-full px-4 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                        :class="
                            errors.correo
                                ? 'border-red-400 dark:border-red-600'
                                : 'border-gray-200 dark:border-gray-700'
                        " />
                    <span v-if="errors.correo" class="text-xs text-red-500">{{ errors.correo }}</span>
                </div>

                <!-- Teléfono -->
                <div class="flex flex-col gap-1">
                    <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Teléfono
                        <span class="text-red-500">*</span>
                    </label>
                    <input
                        v-model="form.telefono"
                        type="tel"
                        placeholder="+56 9 1234 5678"
                        class="w-full px-4 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                        :class="
                            errors.telefono
                                ? 'border-red-400 dark:border-red-600'
                                : 'border-gray-200 dark:border-gray-700'
                        " />
                    <span v-if="errors.telefono" class="text-xs text-red-500">{{ errors.telefono }}</span>
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
