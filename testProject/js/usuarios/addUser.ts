import { html } from 'code-tag';

import { $dom, validateFormRequired } from '@/dashboard/js/composables/dom';
import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
import { getPanelUrl, versaAlert, versaFetch } from '@/dashboard/js/functions';
import type { VersaParamsFetch } from '@/dashboard/types/versaTypes';

const panelUrl = getPanelUrl();
const btnAddUser = $dom('#btnAddUser') as HTMLButtonElement | null;
if (btnAddUser) {
    btnAddUser.addEventListener('click', async () => {
        const formNewUser = $dom('#formNewUser') as HTMLFormElement | null;
        if (!formNewUser) {
            return false;
        }

        if (false === validateFormRequired(formNewUser)) {
            return false;
        }

        const formData = new FormData(formNewUser);

        const existsId = null !== formData.get('tokenid');

        const objectData = Object.fromEntries(formData.entries());

        const paramsFetch = {
            url: existsId ? `/${panelUrl}/users/editUser` : `/${panelUrl}/users/addUser`,
            method: existsId ? 'PUT' : 'POST',
            headers: {
                'content-type': 'application/json',
            },
            data: JSON.stringify(objectData),
        } as VersaParamsFetch;

        const alerta = $dom('#alert');
        if (!(alerta instanceof HTMLDivElement)) {
            return false;
        }
        alerta.innerHTML = '';

        const data = await versaFetch(paramsFetch);
        if (API_RESPONSE_CODES.SUCCESS !== data.success) {
            let errores = `<ul class="max-w-md space-y-1 text-gray-500 list-disc list-inside dark:text-gray-400">`;
            for (const key in data.errors) {
                if (Object.hasOwn(data.errors, key)) {
                    errores += `<li>${data.errors[key]}</li>`;
                }
            }
            errores += `</ul>`;

            alerta.innerHTML = html`
                <div
                    id="alert-4"
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

            return false;
        }
        versaAlert({
            message: data.message,
            type: 'success',
            callback: () => {
                globalThis.location.href = `/${panelUrl}/usuarios`;
            },
        });
    });
    // Show Password
    const showPass = $dom('#togglePassword') as HTMLSpanElement | null;
    const imgShowPass = $dom('#imgShowPass') as HTMLImageElement;
    const imgHiddenPass = $dom('#imgHiddenPass') as HTMLImageElement;
    const password = $dom('#password') as HTMLInputElement;
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
}
