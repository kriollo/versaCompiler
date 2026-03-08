<script setup lang="ts">
    import { html } from 'code-tag';
    import Swal from 'sweetalert2';
    import { inject, onWatcherCleanup, ref, type Ref, watchEffect } from 'vue';

    import check from '@/dashboard/js/components/check.vue';
    import modal from '@/dashboard/js/components/modal.vue';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { removeScape, versaAlert, versaFetch } from '@/dashboard/js/functions';
    import { type itemSelectedType, ShowModalFormInjection } from '@/dashboard/js/modules/InjectKeys';
    import type { AccionData, actionsType, VersaParamsFetch } from '@/dashboard/types/versaTypes';

    const showModalForm = ShowModalFormInjection.inject();
    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', ''); // Obtiene el panel URL desde la inyección
    const showModal = ref(false);
    const newModule: itemSelectedType = {
        id: 0,
        action: 'create',
        seccion: '',
        nombre: '',
        descripcion: '',
        icono: '',
        fill: false,
        url: '',
        estado: true,
        csrf_token: csrf_token.value,
    };

    const localFormData = ref<itemSelectedType>({ ...newModule });

    watchEffect(() => {
        if (showModalForm.showModalForm) {
            showModal.value = showModalForm.showModalForm;
            localFormData.value = {
                ...(showModalForm.itemSelected ? showModalForm.itemSelected : newModule),
            };
            if (showModalForm.itemSelected) {
                localFormData.value.action = 'edit';
                localFormData.value.icono = removeScape(showModalForm.itemSelected.icono);
                localFormData.value.fill = showModalForm.itemSelected.fill;
                localFormData.value.estado = showModalForm.itemSelected.estado;
                localFormData.value.csrf_token = csrf_token.value;
            }
        }

        onWatcherCleanup(() => {
            showModal.value = false;
            localFormData.value = { ...newModule };
        });
    });

    const saveModule = async () => {
        const params = {
            url: `/${panelUrl}/modules/saveModule`,
            method: 'POST',
            data: localFormData.value,
        } as VersaParamsFetch;

        const response = await versaFetch(params);
        if (API_RESPONSE_CODES.ERROR === response.success) {
            const errores = html`
                <ul class="max-w-md space-y-1 text-gray-500 list-disc list-inside dark:text-gray-400">
                    ${Object.keys(response.errors)
                        .map(
                            key => html`
                                <li>${response.errors[key]}</li>
                            `,
                        )
                        .join('')}
                </ul>
            `;
            versaAlert({
                title: 'Error',
                type: 'error',
                html: errores,
            });
        } else {
            versaAlert({
                title: 'Éxito',
                message: response.message,
                type: 'success',
                callback: async () => {
                    const result = await Swal.fire({
                        title: 'Recargar la página',
                        text: '¿Desea recargar la página para ver los cambios?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Recargar',
                        cancelButtonText: 'Cancelar',
                    });
                    if (result.isConfirmed) {
                        window.location.reload();
                    } else {
                        accion({ accion: 'closeModal' });
                    }
                },
            });
        }
    };

    const accion = (accion: AccionData) => {
        const actions: actionsType = {
            closeModal: () => {
                showModalForm.showModalForm = false;
                showModalForm.itemSelected = null;
            },
            default: () => console.log('Accion no encontrada'),
        };
        const selectedAction = actions[accion.accion] || actions['default'];
        if ('function' === typeof selectedAction) {
            selectedAction();
        }
    };
</script>

<template>
    <modal :showModal="showModal" @accion="accion" idModal="modalFormModule" size="max-w-xl">
        <template v-slot:modalTitle>
            <div class="flex justify-between">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">Configurar Módulo</h3>

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
            <form class="space-y-6 flex flex-col">
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2 col-span-2 sm:col-span-1">
                        <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white" for="seccion">
                            Sección
                        </label>
                        <input
                            id="seccion"
                            type="text"
                            class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-brand/30 focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand/30 dark:focus:border-brand"
                            placeholder="Ingrese la sección"
                            required
                            v-model="localFormData.seccion" />
                    </div>

                    <div class="space-y-2 col-span-2 sm:col-span-1">
                        <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white" for="nombre">
                            Nombre
                        </label>
                        <input
                            id="nombre"
                            type="text"
                            class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-brand/30 focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand/30 dark:focus:border-brand"
                            placeholder="Nombre que aparecerá en el menú"
                            required
                            v-model="localFormData.nombre" />
                    </div>
                </div>

                <div class="space-y-2">
                    <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white" for="descripcion">
                        Descripción
                    </label>
                    <textarea
                        id="descripcion"
                        class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-brand/30 focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand/30 dark:focus:border-brand"
                        placeholder="Descripción del módulo"
                        required
                        rows="3"
                        v-model="localFormData.descripcion"></textarea>
                </div>

                <div class="space-y-2">
                    <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white" for="iconoSvg">
                        Icono SVG
                    </label>
                    <div class="flex space-x-4">
                        <textarea
                            id="iconoSvg"
                            class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-brand/30 focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand/30 dark:focus:border-brand"
                            placeholder="Pegue la sección path '<path d=.... />' del SVG aquí"
                            required
                            rows="5"
                            v-model="localFormData.icono"></textarea>
                        <div>
                            <div class="flex gap-2 mb-2">
                                <check id="fill" label="Rellenar" v-model="localFormData.fill" />
                            </div>
                            <div
                                class="flex-shrink-0 w-20 h-20 border border-gray-300 rounded-md flex items-center justify-center overflow-hidden">
                                <div class="w-full h-full flex items-center justify-center">
                                    <svg
                                        class="w-full h-full text-gray-800 dark:text-white text-center"
                                        :fill="localFormData.fill === true ? 'currentColor' : 'none'"
                                        height="24"
                                        v-html="localFormData.icono"
                                        viewBox="0 0 24 24"
                                        width="24"
                                        xmlns="http://www.w3.org/2000/svg"></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2 col-span-2 sm:col-span-1">
                        <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white" for="url">
                            URL
                        </label>
                        <input
                            id="url"
                            type="url"
                            class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-brand/30 focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand/30 dark:focus:border-brand"
                            placeholder="/nombrePanel/modulo"
                            required
                            v-model="localFormData.url" />
                    </div>

                    <div class="space-y-2 col-span-2 sm:col-span-1 flex items-center justify-center">
                        <div class="flex gap-2 items-center justify-center">
                            <input
                                id="estado"
                                type="checkbox"
                                class="form-checkbox h-5 w-5 text-brand dark:text-brand-400 focus:ring-brand/30 dark:focus:ring-brand/30"
                                v-model="localFormData.estado" />
                            <label class="block text-sm font-medium text-gray-900 dark:text-white" for="estado">
                                Estado
                            </label>
                        </div>
                    </div>
                </div>
            </form>
        </template>
        <template v-slot:modalFooter>
            <button
                type="button"
                class="text-white bg-brand-600 hover:bg-brand-700 focus:ring-4 focus:outline-none focus:ring-brand/30 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-brand dark:hover:bg-brand-600 dark:focus:ring-brand-600"
                @click="accion({ accion: 'closeModal' })">
                Cancelar
            </button>
            <button
                type="button"
                class="text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-brand/30 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
                @click="saveModule">
                Guardar
            </button>
        </template>
    </modal>
</template>
