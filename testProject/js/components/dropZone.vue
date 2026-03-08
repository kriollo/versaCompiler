<script setup lang="ts">
    import { html } from 'code-tag';
    import Swal from 'sweetalert2';
    import { computed, type Ref, ref } from 'vue';

    import loader from '@/dashboard/js/components/loader.vue';
    import { $dom } from '@/dashboard/js/composables/dom';
    import { useFileZise, useValidFile } from '@/dashboard/js/composables/useValidFile';

    const emit = defineEmits(['accion']);
    const props = defineProps({
        multiple: {
            type: Boolean,
            required: false,
            default: false,
        },
        nfilesMultiple: {
            type: Number,
            required: false,
            default: 1,
        },
        files: {
            type: Array,
            required: false,
        },
        msgTiposArchivos: {
            type: String,
            required: false,
            default: 'Tipos Validos: .doc .docx .pdf .xlsx .xls .ppt .pptx - < 10 MB',
        },
        fileTypeValid: {
            type: Array,
            required: false,
            default: () => ['xlsx', 'xls', 'doc', 'docx', 'pdf', 'ppt', 'pptx'],
        },
        maxSizeFileMB: {
            type: Number,
            required: false,
            default: 10,
        },
    });
    const multiple = computed(() => props.multiple);
    const nfilesMultiple = computed(() => props.nfilesMultiple);
    const fileTypeValid = computed(() => props.fileTypeValid) as unknown as Ref<string[]>;
    const msgTiposArchivos = computed(() => props.msgTiposArchivos);
    const maxSizeFile = computed(() => props.maxSizeFileMB);
    interface FileError {
        name: string;
        error_msg: string;
        isValid?: boolean;
    }

    const ArrayFilesErrors = ref<FileError[]>([]);

    const files = computed(() => {
        if (props.files !== undefined && null !== props.files) {
            return props.files;
        }
        return [];
    });

    const mensaje = ref('Arrastra y Suelta Archivos');
    const classActive = ref(false);
    const loading = ref(false);

    const btn_SelectFile = () => {
        loading.value = true;
    };

    const showError = async () => {
        const htmlInner = html`
            <div>
                <div class="p-0 m-0 overflow-auto">
                    <ul class="list-group list-group-flush">
                        ${ArrayFilesErrors.value
                            .map(
                                (/** @type {{ name: string; error_msg: string; }} */ item) => html`
                                    <li>
                                        <i class="bi bi-exclamation-circle text-red-500"></i>
                                        ${item.name} - ${item.error_msg}
                                    </li>
                                `,
                            )
                            .join('')}
                    </ul>
                </div>
            </div>
        `;

        await Swal.fire({
            title: 'Error al cargar Archivos',
            html: htmlInner,
            icon: 'error',
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'Salir',
            customClass: {
                popup: 'swal-wide',
                htmlContainer: 'swal-target',
            },
        });
    };

    const validaFiles = (file: File): FileError | { name: string; isValid: true } => {
        if (!useValidFile(fileTypeValid.value, file)) {
            return {
                name: file.name,
                error_msg: 'Tipo de Archivo no permitido',
                isValid: false,
            };
        }
        if (!useFileZise(file, maxSizeFile.value)) {
            return {
                name: file.name,
                error_msg: 'Archivo no debe ser mayor a 10MB',
                isValid: false,
            };
        }

        if (null === files.value) {
            return {
                name: file.name,
                isValid: true,
            };
        }

        const indexFile = files.value.findIndex((item: any) => item?.archivo === file.name);
        if (-1 !== indexFile) {
            return {
                name: file.name,
                error_msg: 'Archivo ya existe en la lista',
                isValid: false,
            };
        }
        return {
            name: file.name,
            isValid: true,
        };
    };
    const setFilesLocal = (filesInput: FileList | null) => {
        ArrayFilesErrors.value = [];
        if (!filesInput || filesInput.length <= 0) {
            loading.value = false;
            return;
        }

        if (filesInput.length > nfilesMultiple.value) {
            ArrayFilesErrors.value.push({
                name: 'Multiples Archivos',
                error_msg: `Solo se permiten ${nfilesMultiple.value} archivo a la vez`,
            });
        }

        if (ArrayFilesErrors.value.length > 0) {
            showError();
            loading.value = false;
            return;
        }

        for (const file of filesInput) {
            const result = validaFiles(file);
            if (result.isValid) {
                files.value.push({
                    archivo: file.name,
                    type: file.type,
                    size: file.size,
                    file: file,
                });
            } else {
                ArrayFilesErrors.value.push(result);
            }
        }
        const inputFile = $dom('#file');
        if (inputFile && inputFile instanceof HTMLInputElement) {
            inputFile.value = '';
        }

        loading.value = false;

        if (ArrayFilesErrors.value.length > 0) {
            showError();
        } else if (files.value.length > 0) {
            emit('accion', {
                accion: 'addFiles',
                files: multiple.value ? files.value : files.value[0],
            });
        }
    };
    const DesdeInputChange = (e: Event) => {
        e.preventDefault();
        const target = e.target as HTMLInputElement;
        if (target.files) {
            setFilesLocal(target.files);
        }
    };
    const drag = (e: DragEvent) => {
        e.preventDefault();
        classActive.value = true;
        mensaje.value = 'Suelta para Subir';
    };
    const drop = (e: DragEvent) => {
        loading.value = true;
        e.preventDefault();
        classActive.value = false;
        mensaje.value = 'Arrastra y Suelta Archivos';
        if (e.dataTransfer?.files) {
            setFilesLocal(e.dataTransfer.files);
        }
    };
    const dragleave = (e: DragEvent) => {
        e.preventDefault();
        classActive.value = false;
        mensaje.value = 'Arrastra y Suelta Archivos';
    };
</script>
<template>
    <div class="w-full h-full flex items-center justify-center">
        <label
            class="relative flex flex-col items-center justify-center w-full h-64 border-4 border-dashed rounded-xl transition-all duration-300 cursor-pointer bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:border-brand hover:bg-brand-50 dark:hover:bg-brand-900/30"
            :class="classActive ? 'border-brand bg-brand-100 dark:bg-brand-700/40' : ''"
            @click="btn_SelectFile"
            @dragleave="dragleave"
            @dragover="drag"
            @drop="drop"
            ref="DragDropArea"
            title="Puedes dar click o arrastrar los archivos">
            <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
                <div class="mb-2">
                    <i class="bi bi-cloud-upload text-6xl text-brand-400 dark:text-brand-300 animate-bounce"></i>
                </div>
                <h4 class="text-lg font-semibold text-gray-700 dark:text-white text-center mb-1">
                    {{ mensaje }}
                    <loader v-if="loading" class="inline-block ml-2"></loader>
                </h4>
                <span class="font-medium text-xs text-gray-500 dark:text-gray-400 text-center">
                    {{ msgTiposArchivos }}
                </span>
            </div>
            <input
                id="file"
                type="file"
                :multiple="multiple"
                @change="DesdeInputChange"
                hidden
                name="file"
                ref="fileInput" />
        </label>
    </div>
</template>
<style scoped>
    /* Elimina estilos antiguos, todo el diseño ahora es TailwindCSS y modo oscuro */
</style>
