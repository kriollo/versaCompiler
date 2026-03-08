<script setup lang="ts">
    import { inject, onWatcherCleanup, ref, type Ref, watchEffect } from 'vue';

    import Check from '@/dashboard/js/components/check.vue';
    import modal from '@/dashboard/js/components/modal.vue';
    import { $dom, blockedForm, validateFormRequired } from '@/dashboard/js/composables/dom';
    import validateRut from '@/dashboard/js/composables/useRut';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { empresa, ShowModalEmpresaInjection } from '@/dashboard/js/empresa/InjectKeys';
    import { showErrorResponse, versaAlert, versaFetch, VersaToast } from '@/dashboard/js/functions';
    import type { AccionData, VersaParamsFetch } from '@/dashboard/types/versaTypes';

    // ---- Estado logo ----
    const logoFile = ref<File | null>(null);
    const logoPreviewUrl = ref<string>('');
    const logoActualUrl = ref<string>('');
    const subiendoLogo = ref(false);
    const logoMsgExito = ref(false);

    const showModalForm = ShowModalEmpresaInjection.inject();

    const localForm = ref({ ...empresa });
    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', ''); // Obtiene el panel URL desde la inyección

    watchEffect(() => {
        if (showModalForm.showModalEmpresa) {
            localForm.value = { ...(showModalForm.itemSelected ? showModalForm.itemSelected : empresa) };
            if (showModalForm.itemSelected) {
                localForm.value.action = 'edit';
                localForm.value.csrf_token = csrf_token.value;
            }

            // Cargar logo actual si existe
            const logoRel = showModalForm.itemSelected?.logo ?? '';
            logoActualUrl.value = logoRel ? `/dashboard/img/${logoRel}` : '';
            logoPreviewUrl.value = '';
            logoFile.value = null;
            logoMsgExito.value = false;
        }

        onWatcherCleanup(() => {
            localForm.value = { ...empresa };
            logoFile.value = null;
            logoPreviewUrl.value = '';
            logoActualUrl.value = '';
            logoMsgExito.value = false;
        });
    });

    const emit = defineEmits(['accion']);
    const accion = (data: AccionData): void => {
        emit('accion', data);
    };

    const onLogoSelected = (event: Event) => {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0] ?? null;
        if (!file) {
            return;
        }
        logoFile.value = file;
        logoPreviewUrl.value = URL.createObjectURL(file);
    };

    const saveEmpresa = async () => {
        const params = {
            url:
                localForm.value.action === 'edit'
                    ? `/${panelUrl}/empresas/api/editEmpresa`
                    : `/${panelUrl}/empresas/api/saveEmpresa`,
            method: localForm.value.action === 'edit' ? 'PUT' : 'POST',
            data: localForm.value,
        } as VersaParamsFetch;

        const $formEmpresa = $dom('#formEmpresa') as HTMLFormElement;
        if (!$formEmpresa) {
            return;
        }

        blockedForm($formEmpresa, 'true');

        if (validateFormRequired($formEmpresa) === false) {
            versaAlert({
                title: 'Error',
                message: 'Por favor, completa todos los campos requeridos.',
                type: 'error',
            });
            blockedForm($formEmpresa, 'false');
            return;
        }

        if (!validateRut(localForm.value.rut)) {
            VersaToast.fire({
                title: 'Validador de rut',
                text: 'El Rut Ingresado no es valido',
                icon: 'warning',
            });
            blockedForm($formEmpresa, 'false');
            return false;
        }

        const response = await versaFetch(params);
        blockedForm($formEmpresa, 'false');
        if (response.success === API_RESPONSE_CODES.ERROR) {
            showErrorResponse(response);
            return;
        }

        // Subir logo si se seleccionó uno nuevo
        const idEmpresa = response.id ?? localForm.value.id;
        if (logoFile.value && idEmpresa) {
            subiendoLogo.value = true;
            logoMsgExito.value = false;
            const formData = new FormData();
            formData.append('logo', logoFile.value);
            formData.append('id_empresa', String(idEmpresa));
            formData.append('csrf_token', csrf_token.value);

            try {
                const logoResponse = await versaFetch({
                    url: `/${panelUrl}/empresas/api/uploadLogo`,
                    method: 'POST',
                    data: formData,
                });
                if (logoResponse.success === API_RESPONSE_CODES.SUCCESS) {
                    logoMsgExito.value = true;
                } else {
                    VersaToast.fire({
                        title: logoResponse.message ?? 'Error al subir el logo',
                        icon: 'warning',
                    });
                }
            } catch {
                VersaToast.fire({
                    title: 'Error de red al subir el logo',
                    icon: 'warning',
                });
            } finally {
                subiendoLogo.value = false;
            }
        }

        await versaAlert({
            title: 'Empresa guardada',
            message: 'La empresa se ha guardado correctamente.',
            type: 'success',
            callback: () => {
                accion({ accion: 'closeModalReloadTable' });
            },
        });
    };
</script>
<template>
    <modal :showModal="showModalForm.showModalEmpresa" @accion="accion" idModal="modalEmpresaForm" size="max-w-xl">
        <template v-slot:modalTitle>
            <div class="flex justify-between">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">Empresa</h3>

                <div class="float-left">
                    <button
                        type="button"
                        class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
                        @click="accion({ accion: 'closeModal' })">
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                                stroke="currentColor"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2" />
                        </svg>
                    </button>
                </div>
            </div>
        </template>
        <template v-slot:modalBody>
            <form id="formEmpresa" class="space-y-6">
                <div>
                    <label for="nombre" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Nombre
                    </label>
                    <input
                        v-model="localForm.nombre"
                        type="text"
                        id="nombre"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand dark:focus:border-brand"
                        placeholder="Nombre de la empresa"
                        required />
                </div>
                <div>
                    <label for="rut" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">RUT</label>
                    <input
                        v-model="localForm.rut"
                        type="text"
                        id="rut"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand dark:focus:border-brand"
                        placeholder="RUT de la empresa"
                        required />
                </div>
                <div>
                    <label for="telefono" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Teléfono
                    </label>
                    <input
                        v-model="localForm.telefono"
                        type="text"
                        id="telefono"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand dark:focus:border-brand"
                        placeholder="Teléfono de la empresa" />
                </div>
                <div>
                    <label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        E-mail
                    </label>
                    <input
                        v-model="localForm.email"
                        type="text"
                        id="email"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand dark:focus:border-brand"
                        placeholder="Email de la empresa" />
                </div>
                <div class="flex items-center mb-4">
                    <Check id="requiere_plan" v-model="localForm.requiere_plan" label="Requiere Plan"></Check>
                </div>
                <div class="flex items-center mb-4">
                    <Check
                        id="cuenta_suspendida"
                        v-model="localForm.cuenta_suspendida"
                        label="Cuenta Suspendida"
                        type="danger"></Check>
                </div>

                <!-- Sección logo -->
                <div class="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <label class="block mb-3 text-sm font-medium text-gray-900 dark:text-white">Logo de empresa</label>

                    <!-- Preview -->
                    <div class="flex items-center gap-4 mb-3">
                        <div
                            class="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                            <img
                                v-if="logoPreviewUrl || logoActualUrl"
                                :src="logoPreviewUrl || logoActualUrl"
                                alt="Logo empresa"
                                class="w-full h-full object-contain" />
                            <i v-else class="bi bi-image text-2xl text-gray-400"></i>
                        </div>
                        <div class="flex-1">
                            <label
                                for="logo_empresa_input"
                                class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors">
                                <i class="bi bi-upload"></i>
                                Seleccionar imagen
                            </label>
                            <input
                                id="logo_empresa_input"
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                class="hidden"
                                @change="onLogoSelected" />
                            <p class="mt-1 text-xs text-gray-400">PNG, JPG o WebP · Máx 2MB</p>
                        </div>
                    </div>

                    <!-- Estados: subiendo / éxito -->
                    <p v-if="subiendoLogo" class="text-xs text-brand flex items-center gap-1">
                        <i class="bi bi-hourglass-split animate-spin"></i>
                        Subiendo logo...
                    </p>
                    <p v-if="logoMsgExito" class="text-xs text-green-600 flex items-center gap-1">
                        <i class="bi bi-check-circle-fill"></i>
                        Logo guardado correctamente
                    </p>
                </div>
            </form>
        </template>
        <template #modalFooter>
            <div class="flex justify-end">
                <button
                    type="button"
                    class="text-white bg-brand-600 hover:bg-brand-700 focus:ring-4 focus:outline-none focus:ring-brand/30 rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-brand dark:hover:bg-brand-600 dark:focus:ring-brand-600"
                    @click="saveEmpresa">
                    Guardar
                </button>
            </div>
            <div class="flex justify-end">
                <button
                    type="button"
                    class="text-white bg-corporate-orange-700 hover:bg-corporate-orange-800 focus:ring-4 focus:outline-none focus:ring-corporate-orange-300 rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-corporate-orange-600 dark:hover:bg-corporate-orange-700 dark:focus:ring-corporate-orange-800"
                    @click="accion({ accion: 'closeModal' })">
                    Cancelar
                </button>
            </div>
        </template>
    </modal>
</template>
<style scoped></style>
