<script setup lang="ts">
    import type { AccionData, actionsType, VersaFetchResponse, VersaParamsFetch } from 'versaTypes';
    import { inject, ref, type Ref, watch } from 'vue';

    import Check from '@/dashboard/js/components/check.vue';
    import Modal from '@/dashboard/js/components/modal.vue';
    import { $dom, blockedForm } from '@/dashboard/js/composables/dom';
    import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
    import { showModalAsociaModuloInjection } from '@/dashboard/js/empresa/InjectKeys';
    import { removeScape, showErrorResponse, versaAlert, versaFetch } from '@/dashboard/js/functions';

    interface ModuleEmpresa {
        id: number;
        nombre: string;
        asociado: boolean;
        icono: string;
        fill: string;
    }
    interface versaFetchModuloEmpresa extends VersaFetchResponse {
        data: ModuleEmpresa[];
    }

    const showModalAsociaModulo = showModalAsociaModuloInjection.inject();
    const modulos = ref<ModuleEmpresa[]>([]);
    const panelUrl = inject<string>('panelUrl', ''); // Obtiene el panel URL desde la inyección
    const token_csrf = inject<Ref<string>>('csrf_token', ref(''));

    const emit = defineEmits(['accion']);
    const accion = (accion: AccionData): void => {
        const actions: actionsType = {
            closeModal: () => {
                showModalAsociaModulo.showModalAsociaModulo = false;
                showModalAsociaModulo.itemSelected = null;
            },
            default: () => console.log('Accion no encontrada'),
        };
        const selectedAction = actions[accion.accion] || actions['default'];
        if ('function' === typeof selectedAction) {
            selectedAction();
        }
    };

    const getModulesEmpresa = async idEmpresa => {
        const response = (await versaFetch({
            url: `/${panelUrl}/empresas/api/getModulesEmpresa?idEmpresa=${idEmpresa}`,
            method: 'GET',
        })) as versaFetchModuloEmpresa;
        if (response) {
            modulos.value = response.data;
        }
    };

    watch(
        () => showModalAsociaModulo.showModalAsociaModulo,
        async newValue => {
            if (newValue) {
                await getModulesEmpresa(showModalAsociaModulo.itemSelected?.id);
            }
        },
    );
    const removeScapeLocal = (str: string) => removeScape(str);

    const saveAsociado = async () => {
        const params = {
            url: `/${panelUrl}/empresas/api/saveModuloEmpresaAsociado`,

            method: 'POST',
            data: {
                id: showModalAsociaModulo.itemSelected?.id,
                modulos: JSON.stringify(modulos.value),
                csrf_token: token_csrf.value,
            },
        } as VersaParamsFetch;

        const $formAsociarModulos = $dom('#formAsociarModulos') as HTMLFormElement;
        if (!$formAsociarModulos) {
            return;
        }

        blockedForm($formAsociarModulos, 'true');

        const response = await versaFetch(params);
        blockedForm($formAsociarModulos, 'false');
        if (response.success === API_RESPONSE_CODES.ERROR) {
            showErrorResponse(response);
            return;
        }
        await versaAlert({
            title: 'Empresa guardada',
            message: 'La empresa se ha guardado correctamente.',
            type: 'success',
            callback: () => {
                accion({ accion: 'closeModal' });
            },
        });
    };
</script>
<template>
    <Modal @accion="accion" idModal="asociar-modulos" :showModal="showModalAsociaModulo.showModalAsociaModulo">
        <template #modalTitle>
            <h2>Asociar Módulos</h2>
        </template>
        <template #modalBody>
            <form id="formAsociarModulos">
                <ul>
                    <li v-for="(modulo, index) in modulos" :key="modulo.id" class="flex *:items-center mb-4">
                        <svg
                            class="flex-shrink-0 w-6 h-6 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            :fill="modulo.fill === '1' || modulo.fill ? 'currentColor' : 'none'"
                            v-html="removeScapeLocal(modulo.icono)"></svg>
                        <Check :id="'modulo-' + index" :label="modulo.nombre" v-model="modulo.asociado" />
                    </li>
                </ul>
            </form>
        </template>
        <template #modalFooter>
            <div class="flex justify-end">
                <button
                    type="button"
                    class="text-white bg-brand-600 hover:bg-brand-700 focus:ring-4 focus:outline-none focus:ring-brand/30 rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-brand dark:hover:bg-brand-600 dark:focus:ring-brand-600"
                    @click="saveAsociado">
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
