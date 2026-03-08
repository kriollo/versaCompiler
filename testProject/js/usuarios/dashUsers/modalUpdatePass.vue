<script setup lang="ts">
    import { html } from 'code-tag';
    import { computed, inject, ref, type Ref } from 'vue';

    import modal from '@/dashboard/js/components/modal.vue';
    import { $dom } from '@/dashboard/js/composables/dom';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { versaAlert, versaFetch, VersaToast } from '@/dashboard/js/functions';
    import type { AccionData, VersaParamsFetch } from '@/dashboard/types/versaTypes';

    interface Props {
        showModal: boolean;
        tokenId: string;
        origen: string;
    }

    const props = withDefaults(defineProps<Props>(), {
        showModal: false,
        tokenId: '',
        origen: '',
    });

    const emit = defineEmits(['accion']);

    const showModalLocal = computed(() => props.showModal);
    const tokenId = computed(() => props.tokenId);
    const origen = computed(() => props.origen);
    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', ''); // Obtiene el panel URL desde la inyección

    const tooglePassword = (
        /** @type {String} */ idInput: string,
        /** @type {String} */ idImgShow: string,
        /** @type {String} */ idImgHidden: string,
    ) => {
        const togglePassword = $dom(`#${idInput}`) as HTMLInputElement;
        const imgShowPass = $dom(`#${idImgShow}`) as HTMLImageElement;
        const imgHiddenPass = $dom(`#${idImgHidden}`) as HTMLImageElement;

        if (!togglePassword || !imgShowPass || !imgHiddenPass) {
            return;
        }
        if ('password' === togglePassword.type) {
            togglePassword.type = 'text';
            imgShowPass.classList.remove('hidden');
            imgHiddenPass.classList.add('hidden');
        } else {
            togglePassword.type = 'password';
            imgShowPass.classList.add('hidden');
            imgHiddenPass.classList.remove('hidden');
        }
    };

    const accion = (/** @type {Object} */ accion: AccionData) => {
        emit('accion', accion);
    };

    const sendResetPass = async () => {
        const formChangePass = $dom('#formChangePass');
        if (!(formChangePass instanceof HTMLFormElement)) {
            return false;
        }
        const formData = new FormData(formChangePass);
        const newPass = document.querySelector('#new_password');
        const confirmNewPass = document.querySelector('#comfirm_new_password');

        if (!(newPass instanceof HTMLInputElement)) {
            return;
        }
        if (!(confirmNewPass instanceof HTMLInputElement)) {
            return;
        }

        if (newPass.value !== confirmNewPass.value) {
            versaAlert({
                message: 'Las contraseñas no coinciden',
                title: 'Error',
                type: 'error',
            });
            return false;
        }

        const objectData = Object.fromEntries(formData.entries());
        const params = {
            url: `/${panelUrl}/users/changePassword`,
            method: 'PATCH',
            headers: {
                'content-type': 'application/json',
            },
            data: JSON.stringify(objectData),
        } as VersaParamsFetch;
        const response = await versaFetch(params);
        if (API_RESPONSE_CODES.SUCCESS === response.success) {
            await VersaToast.fire({
                icon: 'success',
                title: response.message,
            });
            accion({ accion: 'closeModal' });
        } else {
            let errors = '';
            if (response?.errors) {
                errors = html`
                    <ul class="w-full text-left space-y-1 text-gray-500 list-disc list-inside dark:text-gray-400">
                        ${Object.keys(response.errors)
                            .map(
                                key => html`
                                    <li>${response.errors[key]}</li>
                                `,
                            )
                            .join('')}
                    </ul>
                `;
            }

            versaAlert({
                message: response.message,
                html: `${response.message}<br>${errors}`,
                title: 'Error',
                type: 'error',
                customClass: {
                    popup: 'swal-wide',
                    // HtmlContainer: 'swal-target',
                },
            });
        }
    };
</script>
<template>
    <modal :id-modal="origen + 'resetPass'" :show-modal="showModalLocal" @accion="accion">
        <template #modalTitle>
            <div class="flex justify-between">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">Actualizar Contraseña de usuario</h3>

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
        <template #modalBody>
            <form id="formChangePass" class="space-y-4">
                <input type="hidden" :value="csrf_token.value" name="csrf_token" />
                <input type="hidden" :value="tokenId" name="tokenid" />
                <div class="relative">
                    <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white" for="new_password">
                        Nueva Contraseña
                    </label>
                    <span
                        id="togglePasswordNew"
                        class="absolute end-0 flex items-center cursor-pointer pr-2 top-[60%]"
                        @click="tooglePassword('new_password', 'imgShowPassNew', 'imgHiddenPassNew')">
                        <svg
                            id="imgShowPassNew"
                            class="hidden w-6 h-6 text-gray-800 dark:text-slate-400"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M1.933 10.909A4.357 4.357 0 0 1 1 9c0-1 4-6 9-6m7.6 3.8A5.068 5.068 0 0 1 19 9c0 1-3 6-9 6-.314 0-.62-.014-.918-.04M2 17 18 1m-5 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                                stroke="currentColor"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2" />
                        </svg>
                        <svg
                            id="imgHiddenPassNew"
                            class="show w-6 h-6 text-gray-800 dark:text-slate-400"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg">
                            <g stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                                <path d="M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                                <path d="M10 13c4.97 0 9-2.686 9-6s-4.03-6-9-6-9 2.686-9 6 4.03 6 9 6Z" />
                            </g>
                        </svg>
                    </span>
                    <input
                        id="new_password"
                        type="password"
                        class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-brand/30 focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand/30 dark:focus:border-brand"
                        name="new_password"
                        placeholder="••••••••"
                        autocomplete="off"
                        required />
                </div>

                <div class="relative">
                    <label
                        class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                        for="comfirm_new_password">
                        Confirmar Contraseña
                    </label>
                    <span
                        id="togglePasswordConfirmNew"
                        class="absolute end-0 flex items-center cursor-pointer pr-2 top-[60%]"
                        @click="
                            tooglePassword('comfirm_new_password', 'imgShowPassConfirmNew', 'imgHiddenPassConfirmNew')
                        ">
                        <svg
                            id="imgShowPassConfirmNew"
                            class="hidden w-6 h-6 text-gray-800 dark:text-slate-400"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M1.933 10.909A4.357 4.357 0 0 1 1 9c0-1 4-6 9-6m7.6 3.8A5.068 5.068 0 0 1 19 9c0 1-3 6-9 6-.314 0-.62-.014-.918-.04M2 17 18 1m-5 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                                stroke="currentColor"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2" />
                        </svg>
                        <svg
                            id="imgHiddenPassConfirmNew"
                            class="show w-6 h-6 text-gray-800 dark:text-slate-400"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg">
                            <g stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                                <path d="M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                                <path d="M10 13c4.97 0 9-2.686 9-6s-4.03-6-9-6-9 2.686-9 6 4.03 6 9 6Z" />
                            </g>
                        </svg>
                    </span>
                    <input
                        id="comfirm_new_password"
                        type="password"
                        class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-brand/30 focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand/30 dark:focus:border-brand"
                        name="comfirm_new_password"
                        placeholder="••••••••"
                        autocomplete="off"
                        required />
                </div>
            </form>
        </template>
        <template #modalFooter>
            <button
                type="button"
                class="text-white bg-brand-600 hover:bg-brand-700 focus:ring-4 focus:outline-none focus:ring-brand/30 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-brand dark:hover:bg-brand-600 dark:focus:ring-brand-600"
                @click="sendResetPass()">
                Actualizar Contraseña
            </button>
            <button
                type="button"
                class="text-white bg-corporate-orange-700 hover:bg-corporate-orange-800 focus:ring-4 focus:outline-none focus:ring-brand/30 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-corporate-orange-600 dark:hover:bg-corporate-orange-700 dark:focus:ring-corporate-orange-800"
                @click="accion({ accion: 'closeModal' })">
                Cancelar
            </button>
        </template>
    </modal>
</template>
