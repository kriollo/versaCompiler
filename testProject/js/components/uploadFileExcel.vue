<script setup lang="ts">
    import { html } from 'code-tag';
import Swal from 'sweetalert2';
import { ref, toRefs } from 'vue';

    import dropZone from '@/dashboard/js/components/dropZone.vue';
import loader from '@/dashboard/js/components/loader.vue';
import modal from '@/dashboard/js/components/modal.vue';
import { getSheetNames, readXlsx } from '@/dashboard/js/composables/useXlsx';
import { GLOBAL_CONSTANTS } from '@/dashboard/js/constants';
import type { AccionData, actionsType, SwalResult } from '@/dashboard/types/versaTypes';

    const emit = defineEmits(['accion']);

    interface Props {
        from?: string;
        files: unknown[];
        showModal: boolean;
        returnData?: boolean;
    }
    const props = withDefaults(defineProps<Props>(), {
        from: '',
        showModal: false,
        returnData: true,
    });

    const fileTypes = ['xlsx'];
    const showLoader = ref(false);

    const { files, showModal, from, returnData } = toRefs(props);
    const fromValue = computed(() => from.value ?? '');
    const returnDataValue = computed(() => returnData.value ?? true);

    const accion = (response: AccionData): void => {
        const actions: actionsType = {
            addFiles: (): Promise<void> => showDialogSelectSheet(response.files),
            closeModal: (): void =>
                emit('accion', {
                    accion: 'closeModalUploadExcel',
                    from: fromValue.value,
                }),
        };
        const fn = actions[response.accion];
        if ('function' === typeof fn) {
            fn();
        }
    };

    const showDialogSelectSheet = async file => {
        showLoader.value = true;
        const sheets = await getSheetNames(file.file);
        const result: SwalResult = await Swal.fire({
            title: '¿Está seguro de subir el archivo?',
            text: `Una vez subido el archivo: ${file.archivo}, no podrá ser revertido `,
            icon: 'warning',
            html: html`
                <div class="flex flex-wrap content-start ">
                    <label class="block text-sm font-medium text-gray-900 dark:text-white">
                        Una vez subido el archivo: ${file.archivo}, no podrá ser revertido
                    </label>
                    <div class="flex gap-2">
                        <input
                            id="checkPeraLinea"
                            type="checkbox"
                            checked
                            class="h-5 w-5 text-green-600 dark:text-green-400 focus:ring-green-500 dark:focus:ring-green-500" />
                        <label class="block text-sm font-medium text-gray-900 dark:text-white" for="checkPeraLinea">
                            Usar Primera línea como encabezado
                        </label>
                    </div>
                </div>
            `,
            input: 'select',
            inputOptions: {
                ...sheets,
            },
            inputPlaceholder: 'Seleccione la hoja',
            showCancelButton: true,
            confirmButtonText: 'Subir',
            cancelButtonText: 'Cancelar',
            inputValidator: (value: string) => {
                if (!value) {
                    return 'Debe seleccionar una hoja';
                }
            },
        });
        showLoader.value = false;
        if (result.isConfirmed) {
            const sheet = result.value;
            const data = returnDataValue.value ? await readXlsx(file.file, sheet) : [];

            let primeraLinea = false;
            const check = document.querySelector('#checkPeraLinea');
            if (check instanceof HTMLInputElement) {
                primeraLinea = check.checked;
            }

            if (returnDataValue.value && data.length === GLOBAL_CONSTANTS.ZERO) {
                Swal.fire({
                    title: 'Error',
                    text: 'No se encontraron datos en la hoja seleccionada',
                    icon: 'error',
                });
                accion({ accion: 'closeModal' });
                return;
            }
            emit('accion', {
                accion: 'responseUploadExcel',
                data,
                primeraLinea,
                hoja: sheet,
                files: file,
                from: fromValue.value,
            });
            accion({ accion: 'closeModal' });
        }
    };
</script>
<template>
    <modal idModal="uploadFile" :showModal="showModal">
        <template #modalTitle>
            <div class="flex justify-between">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white flex gap-2">
                    Importar Archivo
                    <loader v-if="showLoader" />
                </h3>

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
            <div class="h-40">
                <dropZone
                    :fileTypeValid="fileTypes"
                    @accion="accion"
                    :files="files"
                    :msgTiposArchivos="'Tipos Validos: ' + fileTypes.join(', ') + ' - < 10 MB'" />
            </div>
        </template>
        <template #modalFooter>
            <button
                type="button"
                @click="accion({ accion: 'closeModal' })"
                class="text-xs text-gray-400 dark:text-white border border-transparent p-2 bg-brand rounded-md shadow-sm hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand/30">
                Cerrar
            </button>
        </template>
    </modal>
</template>
