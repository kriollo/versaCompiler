import { html } from 'code-tag';

import { $dom } from '@/dashboard/js/composables/dom';
import { API_RESPONSE_CODES, GLOBAL_CONSTANTS } from '@/dashboard/js/constants';
import { getPanelUrl, versaAlert, versaFetch } from '@/dashboard/js/functions';
import type { VersaParamsFetch } from '@/dashboard/types/versaTypes';

// Login Form
const login = $dom('#login');
const panelUrl = getPanelUrl();
if (login) {
    login.addEventListener('click', async event => {
        event.preventDefault();

        const formulario = $dom('#formulario');
        if (!(formulario instanceof HTMLFormElement)) {
            return;
        }
        const datos = new FormData(formulario);

        const params = {
            url: `/${panelUrl}/login/autentication`,
            method: 'POST',
            data: datos,
        } as VersaParamsFetch;

        const data = await versaFetch(params);
        if (API_RESPONSE_CODES.ERROR === data.success) {
            const alerta = $dom('#alert') as HTMLDivElement;
            if (!(alerta instanceof HTMLDivElement)) {
                return false;
            }

            const errores = html`
                <ul class="max-w-md space-y-1 text-gray-500 list-disc list-inside dark:text-gray-400">
                    ${Object.keys(data.errors)
                        .map(
                            key => html`
                                <li>${data.errors[key]}</li>
                            `,
                        )
                        .join('')}
                </ul>
            `;

            alerta.innerHTML = html`
                <div
                    id="alert-1"
                    class="flex items-center p-4 mb-4 text-yellow-800 rounded-lg bg-yellow-50 dark:bg-gray-800 dark:text-yellow-300"
                    role="alert">
                    <svg
                        class="flex-shrink-0 w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
                    </svg>
                    <span class="sr-only">Info</span>
                    <div class="ms-3 text-sm font-medium">
                        ${data.message}
                        <div>${errores}</div>
                    </div>
                    <button
                        type="button"
                        class="ms-auto -mx-1.5 -my-1.5 bg-yellow-50 text-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-400 p-1.5 hover:bg-yellow-200 inline-flex items-center justify-center h-8 w-8 dark:bg-gray-800 dark:text-yellow-300 dark:hover:bg-gray-700"
                        aria-label="Close"
                        data-dismiss-target="#alert-1">
                        <span class="sr-only">Close</span>
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
            `;
            return false;
        }
        versaAlert({
            message: data.message,
            type: 'success',
            callback: () => {
                globalThis.location.href = data.redirect || `/${panelUrl}/dashboard`;
            },
        });
    });
}

// Show Password
const showPass = $dom('#togglePassword');
const imgShowPass = $dom('#imgShowPass');
const imgHiddenPass = $dom('#imgHiddenPass');
const password = $dom('#password');

if (showPass && imgShowPass && imgHiddenPass && password) {
    showPass.addEventListener('click', event => {
        event.preventDefault();

        if (!(password instanceof HTMLInputElement)) {
            return;
        }
        if ('password' === password.type) {
            password.type = 'text';
            imgShowPass.classList.remove('hidden');
            imgHiddenPass.classList.add('hidden');
        } else {
            password.type = 'password';
            imgShowPass.classList.add('hidden');
            imgHiddenPass.classList.remove('hidden');
        }
    });
}

if (password) {
    password.addEventListener('keypress', (event: Event) => {
        if ('Enter' === (event as KeyboardEvent).key) {
            event.preventDefault();
            if (login instanceof HTMLButtonElement) {
                login.click();
            }
        }
    });
}

// Lost Password
const btnlostPass = $dom('#btnLostPass');
if (btnlostPass) {
    btnlostPass.addEventListener('click', async event => {
        event.preventDefault();
        const alerta = $dom('#alert');
        const formLostPass = $dom('#formLostPass');

        if (!(alerta instanceof HTMLDivElement)) {
            return;
        }

        if (!(formLostPass instanceof HTMLFormElement)) {
            return;
        }
        const datos = new FormData(formLostPass);

        if (!(btnlostPass instanceof HTMLButtonElement)) {
            return;
        }
        btnlostPass.disabled = true;
        btnlostPass.innerHTML = html`
            <div class="flex items-center" role="status">
                <svg
                    class="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                    fill="none"
                    viewbox="0 0 100 101"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                        fill="currentColor" />
                    <path
                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                        fill="currentFill" />
                </svg>
                <span class="ms-2">Enviando...</span>
            </div>
        `;
        alerta.innerHTML = '';

        const objectData = Object.fromEntries(datos.entries());

        const params = {
            url: `/${panelUrl}/lost-password/send`,
            method: 'PATCH',
            headers: {
                'content-type': 'application/json',
            },
            data: JSON.stringify(objectData),
        } as VersaParamsFetch;
        const data = await versaFetch(params);
        if (API_RESPONSE_CODES.ERROR === data.success) {
            const errores = html`
                <ul class="max-w-md space-y-1 text-gray-500 list-disc list-inside dark:text-gray-400">
                    ${Object.keys(data.errors)
                        .map(
                            key => html`
                                <li>${data.errors[key]}</li>
                            `,
                        )
                        .join('')}
                </ul>
            `;

            alerta.innerHTML = html`
                <div
                    id="alert-5"
                    class="flex items-center p-4 mb-4 text-yellow-800 rounded-lg bg-yellow-50 dark:bg-gray-800 dark:text-yellow-300"
                    role="alert">
                    <svg
                        class="flex-shrink-0 w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
                    </svg>
                    <span class="sr-only">Info</span>
                    <div class="ms-3 text-sm font-medium">
                        ${data.message}
                        <div>${errores}</div>
                    </div>
                    <button
                        type="button"
                        class="ms-auto -mx-1.5 -my-1.5 bg-yellow-50 text-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-400 p-1.5 hover:bg-yellow-200 inline-flex items-center justify-center h-8 w-8 dark:bg-gray-800 dark:text-yellow-300 dark:hover:bg-gray-700"
                        aria-label="Close"
                        data-dismiss-target="#alert-5">
                        <span class="sr-only">Close</span>
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
            `;

            btnlostPass.disabled = false;
            btnlostPass.innerHTML = 'Solicitar Reset';
            return false;
        }

        alerta.innerHTML = html`
            <div
                id="alert-2"
                class="flex items-center p-4 mb-4 text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-300"
                role="alert">
                <svg
                    class="flex-shrink-0 w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                        clip-rule="evenodd"
                        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM9 6a1 1 0 0 1 2 0v5a1 1 0 1 1-2 0V6Zm1 11a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"
                        fill-rule="evenodd" />
                </svg>
                <span class="sr-only">Info</span>
                <div class="ms-3 text-sm font-medium">${data.message}</div>
                <button
                    type="button"
                    class="ms-auto -mx-1.5 -my-1.5 bg-green-50 text-green-500 rounded-lg focus:ring-2 focus:ring-green-400 p-1.5 hover:bg-green-200 inline-flex items-center justify-center h-8 w-8 dark:bg-gray-800 dark:text-green-300 dark:hover:bg-gray-700"
                    aria-label="Close"
                    data-dismiss-target="#alert-2">
                    <span class="sr-only">Close</span>
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
        `;

        btnlostPass.disabled = false;
        btnlostPass.innerHTML = 'Solicitar Reset';
    });
}

// Reset Password
const btnResetPass = $dom('#btnResetPass');
if (btnResetPass && btnResetPass instanceof HTMLButtonElement) {
    btnResetPass.addEventListener('click', async event => {
        event.preventDefault();

        const FormResetPass = $dom('#FormResetPass');
        if (!(FormResetPass instanceof HTMLFormElement)) {
            return;
        }
        const datos = new FormData(FormResetPass);
        const alerta = $dom('#alert');
        if (!(alerta instanceof HTMLDivElement)) {
            return;
        }
        alerta.innerHTML = '';

        const params = {
            url: `/${panelUrl}/login/apply-reset-password`,
            method: 'POST',
            data: datos,
        } as VersaParamsFetch;

        if (!(btnResetPass instanceof HTMLButtonElement)) {
            return;
        }
        btnResetPass.disabled = true;
        const data = await versaFetch(params);
        if (API_RESPONSE_CODES.ERROR === data.success) {
            const errores = html`
                <ul class="max-w-md space-y-1 text-gray-500 list-disc list-inside dark:text-gray-400">
                    ${Object.keys(data.errors)
                        .map(
                            key => html`
                                <li>${data.errors[key]}</li>
                            `,
                        )
                        .join('')}
                </ul>
            `;

            alerta.innerHTML = html`
                <div
                    id="alert-3"
                    class="flex items-center p-4 mb-4 text-yellow-800 rounded-lg bg-yellow-50 dark:bg-gray-800 dark:text-yellow-300"
                    role="alert">
                    <svg
                        class="flex-shrink-0 w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
                    </svg>
                    <span class="sr-only">Info</span>
                    <div class="ms-3 text-sm font-medium">
                        ${data.message}
                        <div>${errores}</div>
                    </div>
                    <button
                        type="button"
                        class="ms-auto -mx-1.5 -my-1.5 bg-yellow-50 text-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-400 p-1.5 hover:bg-yellow-200 inline-flex items-center justify-center h-8 w-8 dark:bg-gray-800 dark:text-yellow-300 dark:hover:bg-gray-700"
                        aria-label="Close"
                        data-dismiss-target="#alert-3">
                        <span class="sr-only">Close</span>
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
            `;
            btnResetPass.disabled = false;
            return false;
        }

        const divProgress = $dom('#divProgress') as HTMLDivElement;
        const progress = $dom('#progress') as HTMLDivElement;

        if (!(divProgress instanceof HTMLDivElement) || !(progress instanceof HTMLDivElement)) {
            btnResetPass.disabled = false;
            return;
        }

        divProgress.classList.remove('hidden');
        let width = 0;

        const frame = () => {
            if (GLOBAL_CONSTANTS.HUNDRED <= width) {
                clearInterval(id);

                alerta.innerHTML = html`
                    <div
                        id="alert-4"
                        class="flex items-center p-4 mb-4 text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-300"
                        role="alert">
                        <svg
                            class="flex-shrink-0 w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                clip-rule="evenodd"
                                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM9 6a1 1 0 0 1 2 0v5a1 1 0 1 1-2 0V6Zm1 11a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"
                                fill-rule="evenodd" />
                        </svg>
                        <span class="sr-only">Info</span>
                        <div class="ms-3 text-sm font-medium">${data.message}</div>
                        <button
                            type="button"
                            class="ms-auto -mx-1.5 -my-1.5 bg-green-50 text-green-500 rounded-lg focus:ring-2 focus:ring-green-400 p-1.5 hover:bg-green-200 inline-flex items-center justify-center h-8 w-8 dark:bg-gray-800 dark:text-green-300 dark:hover:bg-gray-700"
                            aria-label="Close"
                            data-dismiss-target="#alert-4">
                            <span class="sr-only">Close</span>
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
                `;

                setTimeout(() => {
                    globalThis.location.href = `/${panelUrl}/login`;
                }, GLOBAL_CONSTANTS.THOUSAND);
            } else {
                width += GLOBAL_CONSTANTS.ONE;
                progress.style.width = `${width}%`;
            }
        };
        const id = setInterval(frame, GLOBAL_CONSTANTS.TEN);
    });
}

// Show New Password
const togglePasswordNew = $dom('#togglePasswordNew');
const imgShowPassNew = $dom('#imgShowPassNew');
const imgHiddenPassNew = $dom('#imgHiddenPassNew');
const new_password = $dom('#new_password');

if (togglePasswordNew && imgShowPassNew && imgHiddenPassNew && new_password) {
    togglePasswordNew.addEventListener('click', event => {
        event.preventDefault();

        if (!(new_password instanceof HTMLInputElement)) {
            return;
        }
        if ('password' === new_password.type) {
            new_password.type = 'text';
            imgShowPassNew.classList.remove('hidden');
            imgHiddenPassNew.classList.add('hidden');
        } else {
            new_password.type = 'password';
            imgShowPassNew.classList.add('hidden');
            imgHiddenPassNew.classList.remove('hidden');
        }
    });
}

const togglePasswordConfirmNew = $dom('#togglePasswordConfirmNew');
const imgShowPassConfirmNew = $dom('#imgShowPassConfirmNew');
const imgHiddenPassConfirmNew = $dom('#imgHiddenPassConfirmNew');
const comfirm_new_password = $dom('#comfirm_new_password');

if (togglePasswordConfirmNew && imgShowPassConfirmNew && imgHiddenPassConfirmNew && comfirm_new_password) {
    togglePasswordConfirmNew.addEventListener('click', event => {
        event.preventDefault();

        if (!(comfirm_new_password instanceof HTMLInputElement)) {
            return;
        }
        if ('password' === comfirm_new_password.type) {
            comfirm_new_password.type = 'text';
            imgShowPassConfirmNew.classList.remove('hidden');
            imgHiddenPassConfirmNew.classList.add('hidden');
        } else {
            comfirm_new_password.type = 'password';
            imgShowPassConfirmNew.classList.add('hidden');
            imgHiddenPassConfirmNew.classList.remove('hidden');
        }
    });
}
