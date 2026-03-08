<script setup lang="ts">
    import type { AccionData, actionsType, VersaFetchResponse, VersaParamsFetch } from 'versaTypes';
import { computed, inject, onWatcherCleanup, ref, type Ref, watch, watchEffect } from 'vue';

    import {
    channelSelectedInjection,
    FormTrunkInjection,
    type Trunk,
} from '@/dashboard/js/chatbot/configTrunk/InjectKeys';
import Modal from '@/dashboard/js/components/modal.vue';
import { $dom, blockedForm, validateFormRequired } from '@/dashboard/js/composables/dom';
import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
import { randomNumberToken, showErrorResponse, versaAlert, versaFetch } from '@/dashboard/js/functions';

    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));
    const panelUrl = inject<string>('panelUrl', '');
    const empresaSelected = inject<string>('empresaSelected', '');
    const channelSelected = channelSelectedInjection.inject();
    const formTrunk = FormTrunkInjection.inject();

    interface FlowOption {
        id: number;
        description: string;
        status: string;
    }

    const trunk: Trunk = {
        id: 0,
        action: 'create',
        nombre: '',
        descripcion: '',
        flow_id: null,
        token: '',
        url_webhook: '',
        token_trunk: '',
        created_at: '',
        updated_at: '',
        csrf_token: csrf_token.value || '',
        settings: {} as Record<string, string>,
    };

    const localFormData = ref<Trunk>({ ...trunk });
    const copiedToken = ref<boolean>(false);
    const copiedWebhook = ref<boolean>(false);
    const availableFlows = ref<FlowOption[]>([]);
    const loadingFlows = ref<boolean>(false);

    const META_CHANNEL_CODES = new Set(['instagram', 'facebookmessenger', 'facebook', 'messenger']);

    const isMetaChannel = computed(() => {
        const code = String(channelSelected.value.codigo_interno || '').toLowerCase();
        return META_CHANNEL_CODES.has(code);
    });

    const normalizeMetaSenderSettings = (settings: Record<string, string>): Record<string, string> => {
        const normalized = { ...settings };
        const candidateKeys = [
            'meta_sender_id',
            'page_id',
            'facebook_page_id',
            'instagram_business_account_id',
            'ig_business_account_id',
            'instagram_id',
            'business_account_id',
        ];

        const resolved = candidateKeys.map(key => String(normalized[key] || '').trim()).find(value => value !== '');

        if (resolved) {
            normalized.meta_sender_id = resolved;
        }

        return normalized;
    };

    const emit = defineEmits(['accion']);

    const accion = (accion: AccionData) => {
        const actions: actionsType = {
            closeModal: () => {
                formTrunk.showModal = false;
                formTrunk.itemSelected = null;
            },
            reloadData: () => emit('accion', { accion: 'reloadData' }),
            default: () => console.log('Accion no encontrada'),
        };
        const selectedAction = actions[accion.accion] || actions['default'];
        if ('function' === typeof selectedAction) {
            selectedAction();
        }
    };

    const generateToken = async () => {
        //El token debe ser numerico de 32 caracteres
        localFormData.value.token = await randomNumberToken(32);
    };

    const generateWebHook = async () => {
        if (localFormData.value.token === '') {
            await generateToken();
        }
        interface responseBaseUrl extends VersaFetchResponse {
            base_url: string;
            token_trunk: string;
        }
        const response = (await versaFetch({
            url: `/${panelUrl}/chatbot/api/getWebhookUrl?csrf_token=${csrf_token.value}`,
            method: 'GET',
        })) as responseBaseUrl;
        if (response.success === API_RESPONSE_CODES.ERROR) {
            versaAlert({
                title: 'Error',
                message: 'No se pudo obtener el URL Webhook, avisa al administrado',
                type: 'error',
            });
            return;
        }

        localFormData.value.token_trunk = response.token_trunk;
        localFormData.value.url_webhook = `${response.base_url}/api/wh/${channelSelected.value.codigo_interno}/${empresaSelected}/${response.token_trunk}`;
    };

    const saveForm = async () => {
        if (isMetaChannel.value) {
            localFormData.value.settings = normalizeMetaSenderSettings(localFormData.value.settings || {});
        }

        const params = {
            url: `/${panelUrl}/chatbot/api/troncal/saveTroncal/${empresaSelected}/${channelSelected.value.id}`,
            method: 'POST',
            data: JSON.stringify(localFormData.value),
            headers: {
                'Content-Type': 'application/json',
            },
        } as VersaParamsFetch;

        const $formTrunk = $dom('#form-trunk') as HTMLFormElement;
        if (!$formTrunk) {
            return;
        }

        blockedForm($formTrunk, 'true');

        if (validateFormRequired($formTrunk) === false) {
            versaAlert({
                title: 'Error',
                message: 'Por favor, completa todos los campos requeridos.',
                type: 'error',
            });
            blockedForm($formTrunk, 'false');
            return;
        }

        const response = await versaFetch(params);
        if (API_RESPONSE_CODES.ERROR === response.success) {
            showErrorResponse(response);
            blockedForm($formTrunk, 'false');
            return;
        }
        versaAlert({
            title: 'Éxito',
            message: response.message,
            type: 'success',
            callback: () => {
                accion({ accion: 'reloadData' });
                blockedForm($formTrunk, 'false');
                localFormData.value.id = response.id !== undefined ? response.id : 1;
                localFormData.value.action = 'edit';
            },
        });
    };

    const copyToClipboard = async (text: string, type: 'token' | 'webhook'): Promise<void> => {
        try {
            await navigator.clipboard.writeText(text);
            if (type === 'token') {
                copiedToken.value = true;
                setTimeout(() => (copiedToken.value = false), 2000);
            } else {
                copiedWebhook.value = true;
                setTimeout(() => (copiedWebhook.value = false), 2000);
            }
        } catch (error) {
            console.error('Error al copiar al portapapeles:', error);
        }
    };

    watchEffect(() => {
        if (formTrunk.showModal) {
            const item = formTrunk.itemSelected ? { ...formTrunk.itemSelected } : { ...trunk };
            // Parsear settings si vienen como string JSON del servidor
            if (typeof item.settings === 'string') {
                try {
                    item.settings = JSON.parse(item.settings);
                } catch {
                    item.settings = {};
                }
            }
            if (!item.settings) {
                item.settings = {};
            }

            if (isMetaChannel.value) {
                item.settings = normalizeMetaSenderSettings(item.settings as Record<string, string>);
            }

            localFormData.value = item;
            if (formTrunk.itemSelected) {
                localFormData.value.action = 'edit';
                localFormData.value.csrf_token = csrf_token.value;
            }
        }

        onWatcherCleanup(() => {
            localFormData.value = { ...trunk };
        });
    });

    const setWebHook = async () => {
        const response = await versaFetch({
            url: `/${panelUrl}/chatbot/api/troncal/setWebhook/${channelSelected.value.codigo_interno}/${empresaSelected}`,
            method: 'POST',
            data: {
                id: localFormData.value.id,
                token: localFormData.value.token,
                url_webhook: localFormData.value.url_webhook,
                csrf_token: localFormData.value.csrf_token,
            },
        });
        if (response.success === API_RESPONSE_CODES.ERROR) {
            showErrorResponse(response);
            return;
        }
        versaAlert({
            title: 'Éxito',
            message: response.message,
            type: 'success',
        });
    };

    const loadFlows = async (): Promise<void> => {
        if (!formTrunk.showModal) {
            return;
        }

        loadingFlows.value = true;
        try {
            const response = (await versaFetch({
                url: `/${panelUrl}/chatbot/flowBuilder/api/getFlow/${empresaSelected}?per_page=200&externalFilters=cf.status='active' AND cf.flow_type='inbound'`,
                method: 'GET',
            })) as VersaFetchResponse;

            if (response.success === API_RESPONSE_CODES.SUCCESS && Array.isArray(response.data)) {
                availableFlows.value = response.data;
            } else {
                availableFlows.value = [];
            }
        } catch (error) {
            console.error('Error loading flows:', error);
            availableFlows.value = [];
        } finally {
            loadingFlows.value = false;
        }
    };

    watch(
        () => formTrunk.showModal,
        newVal => {
            if (newVal) {
                loadFlows();
            }
        },
        { immediate: true },
    );
</script>
<template>
    <Modal id-modal="form-trunk-modal" :show-modal="formTrunk.showModal" @accion="accion" size="max-w-2xl">
        <template #modalTitle>
            <div class="flex justify-between">
                <div class="flex items-center gap-2">
                    <img
                        :src="channelSelected.value.imagen"
                        alt="Imagen de {{ channelSelected.value.nombre }}"
                        class="w-12 h-12 rounded-full" />
                    <h2>Configuración de Troncal: {{ channelSelected.value.nombre }}</h2>
                </div>

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
            <form id="form-trunk" class="flex flex-col gap-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="nombre" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                            Nombre
                        </label>
                        <input
                            class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-brand/30 focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand/30 dark:focus:border-brand"
                            type="text"
                            id="nombre"
                            v-model="localFormData.nombre"
                            required
                            autocomplete="off" />
                    </div>
                    <div>
                        <label for="descripcion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                            Descripción
                        </label>
                        <input
                            class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-brand/30 focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand/30 dark:focus:border-brand"
                            type="text"
                            id="descripcion"
                            v-model="localFormData.descripcion"
                            autocomplete="off"
                            required />
                    </div>
                </div>
                <div>
                    <label for="flow_id" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Flujo asociado
                    </label>
                    <select
                        id="flow_id"
                        v-model="localFormData.flow_id"
                        :disabled="loadingFlows"
                        class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-brand/30 focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand/30 dark:focus:border-brand disabled:opacity-60">
                        <option :value="null">Sin flujo asociado</option>
                        <option v-for="flow in availableFlows" :key="flow.id" :value="flow.id">
                            #{{ flow.id }} - {{ flow.description }}
                        </option>
                    </select>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Selecciona un flujo activo para esta troncal.
                    </p>
                </div>
                <div>
                    <label for="token" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Token de verificación
                    </label>
                    <div class="flex gap-0 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                        <input
                            class="bg-gray-50 border-0 text-gray-900 sm:text-sm focus:ring-brand/30 focus:border-brand flex-1 p-2.5 dark:bg-gray-700 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand/30 dark:focus:border-brand overflow-y-auto mask-hidden"
                            type="text"
                            autocomplete="off"
                            id="token"
                            v-model="localFormData.token"
                            required />
                        <div class="flex border-l border-gray-300 dark:border-gray-600">
                            <button
                                v-if="localFormData.token"
                                @click="copyToClipboard(localFormData.token, 'token')"
                                type="button"
                                class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2.5 transition-colors duration-200"
                                :title="copiedToken ? '¡Copiado!' : 'Copiar token'">
                                <svg
                                    v-if="!copiedToken"
                                    class="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                </svg>
                                <svg
                                    v-else
                                    class="w-5 h-5 text-green-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M5 13l4 4L19 7"></path>
                                </svg>
                            </button>
                            <button
                                @click="generateWebHook"
                                type="button"
                                class="text-white bg-brand-600 hover:bg-brand-700 focus:ring-4 focus:outline-none focus:ring-brand/30 text-sm px-4 py-2.5 text-center inline-flex items-center dark:bg-brand dark:hover:bg-brand-600 dark:focus:ring-brand-600 whitespace-nowrap border-l border-gray-300 dark:border-gray-600 flex-shrink-0">
                                Generar Parametros
                            </button>
                        </div>
                    </div>
                    <div v-if="copiedToken" class="mt-2 text-sm text-green-600 dark:text-green-400">
                        Token copiado al portapapeles!
                    </div>
                </div>
                <div>
                    <label for="url_webhook" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        URL Webhook
                    </label>
                    <div class="flex gap-0 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                        <textarea
                            class="bg-gray-50 border-0 text-gray-900 sm:text-sm focus:ring-brand/30 focus:border-brand flex-1 p-2.5 dark:bg-gray-700 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand/30 dark:focus:border-brand resize-none h-16 max-h-32 overflow-y-auto"
                            id="url_webhook"
                            v-model="localFormData.url_webhook"
                            required
                            rows="2"
                            spellcheck="false"></textarea>
                        <div class="flex border-l border-gray-300 dark:border-gray-600">
                            <button
                                v-if="localFormData.url_webhook"
                                @click="copyToClipboard(localFormData.url_webhook, 'webhook')"
                                type="button"
                                class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2.5 transition-colors duration-200"
                                :title="copiedWebhook ? '¡Copiado!' : 'Copiar URL'">
                                <svg
                                    v-if="!copiedWebhook"
                                    class="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                </svg>
                                <svg
                                    v-else
                                    class="w-5 h-5 text-green-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M5 13l4 4L19 7"></path>
                                </svg>
                            </button>
                            <!--<button
                                @click="generateWebHook"
                                type="button"
                                class="text-white bg-brand-600 hover:bg-brand-700 focus:ring-4 focus:outline-none focus:ring-brand/30 text-sm px-4 py-2.5 text-center inline-flex items-center dark:bg-brand dark:hover:bg-brand-600 dark:focus:ring-brand-600 whitespace-nowrap border-l border-gray-300 dark:border-gray-600 flex-shrink-0">
                                Generar URL
                            </button>-->
                        </div>
                    </div>
                    <div v-if="copiedWebhook" class="mt-2 text-sm text-green-600 dark:text-green-400">
                        URL copiada al portapapeles!
                    </div>
                    <div
                        v-if="channelSelected.value.required_register"
                        class="mt-2 text-sm text-brand dark:text-brand-400 grid gap-2">
                        <p class="mb-2 text-pretty">
                            * El canal {{ channelSelected.value.nombre }} requiere setear el webhook para que pueda
                            interactuar a través de este troncal, guarda la troncal y ya puedes enviar el webhook.
                        </p>
                        <button
                            type="button"
                            class="text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 rounded-lg text-sm px-5 py-2.5 text-center items-center dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800 flex justify-center *:mt-2"
                            :class="{ 'opacity-50 cursor-not-allowed': localFormData.id === 0 }"
                            :disabled="localFormData.id === 0"
                            @click="setWebHook">
                            Enviar Webhook
                        </button>
                    </div>
                </div>

                <div v-if="isMetaChannel">
                    <label for="meta_sender_id" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Meta Sender ID (Page / IG Business Account ID)
                        <span class="text-red-500">*</span>
                    </label>
                    <input
                        id="meta_sender_id"
                        v-model="localFormData.settings.meta_sender_id"
                        type="text"
                        autocomplete="off"
                        required
                        placeholder="Ej: 1784XXXXXXXXXXXX"
                        class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-brand/30 focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand/30 dark:focus:border-brand" />
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        ID de la cuenta emisora en Meta. Se usa para evitar errores de envío/typing con endpoint
                        <span class="font-mono">/me/messages</span>
                        .
                    </p>
                </div>

                <template
                    v-for="field in channelSelected.value.settings ?? []"
                    :key="field?.key || field?.name?.toLowerCase().replace(/ /g, '_') || Math.random()">
                    <div v-if="field?.name">
                        <label
                            :for="field.name.toLowerCase().replace(/ /g, '_')"
                            class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                            {{ field.name }}
                            <span v-if="field.required" class="text-red-500">*</span>
                        </label>
                        <input
                            :type="field.type || 'text'"
                            :id="field.name.toLowerCase().replace(/ /g, '_')"
                            v-model="localFormData.settings[field.key]"
                            class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-brand/30 focus:border-brand block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand/30 dark:focus:border-brand"
                            :class="{ 'mask-hidden': field?.class === 'mask-hidden' }"
                            :placeholder="'Ingrese ' + field.name"
                            :required="field.required"
                            autocomplete="off" />
                        <button
                            v-if="field.type === 'password' || field.class === 'mask-hidden'"
                            type="button"
                            class="mt-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            @click="field.class = field.class === 'mask-hidden' ? '' : 'mask-hidden'">
                            {{ field.class === 'mask-hidden' ? 'Mostrar' : 'Ocultar' }}
                        </button>
                    </div>
                </template>
            </form>
        </template>
        <template #modalFooter>
            <div class="flex justify-end">
                <button
                    type="button"
                    class="text-white bg-brand-600 hover:bg-brand-700 focus:ring-4 focus:outline-none focus:ring-brand/30 rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-brand dark:hover:bg-brand-600 dark:focus:ring-brand-600"
                    @click="saveForm">
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
    </Modal>
</template>
<style scoped>
    /* si existe la clase mask-hidden se reemplaza por asteriscos */
    .mask-hidden {
        -webkit-text-security: disc;
    }
</style>
