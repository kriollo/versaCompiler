<script setup lang="ts">
    import { html } from 'code-tag';
    import type { Perfil } from 'perfilTypes';
    import Swal from 'sweetalert2';
    import { inject, onMounted, provide, ref } from 'vue';

    import breadcrumb from '@/dashboard/js/components/breadcrumb.vue';
    import lineHr from '@/dashboard/js/components/lineHr.vue';
    import { $dom } from '@/dashboard/js/composables/dom';
    import { versaFetch, VersaToast } from '@/dashboard/js/functions';
    import listPerfilesSide from '@/dashboard/js/perfil/listPerfilesSide.vue';
    import perfilSide from '@/dashboard/js/perfil/perfilSide.vue';
    import type { AccionData, actionsType } from '@/dashboard/types/versaTypes';

    const refreshData = ref(false);

    const perfil = ref<Perfil>({
        id: 0,
        nombre: '',
        pagina_inicio: '',
    });
    provide('perfil', perfil);
    const panelUrl = inject<string>('panelUrl', ''); // Obtiene el panel URL desde la inyección

    const newPerfil = async () => {
        const result = await Swal.fire({
            title: 'Nuevo Perfil',
            html: html`
                <input
                    id="nombre"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand focus:border-brand dark:bg-gray-800 dark:border-gray-600 dark:focus:ring-brand dark:focus:border-brand"
                    placeholder="Nombre del Perfil"
                    type="text" />
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            focusConfirm: false,
            preConfirm: () => {
                const $input = $dom('#nombre');
                if ($input instanceof HTMLInputElement) {
                    if (!$input.value) {
                        Swal.showValidationMessage('El nombre del perfil es requerido');
                        return false;
                    }
                    return {
                        nombre: $input.value,
                    };
                }
            },
        });

        if (result.isConfirmed) {
            const response = await versaFetch({
                url: `/${panelUrl}/perfiles/save`,
                method: 'POST',
                data: { nombre: result.value.nombre, estado: 1 },
            });

            if (response.success) {
                refreshData.value = !refreshData.value;
                VersaToast.fire({
                    icon: 'success',
                    title: 'Perfil guardado correctamente',
                });
            } else {
                VersaToast.fire({
                    icon: 'error',
                    title: 'Error al guardar el perfil',
                });
            }
        }
    };

    const accion = (accion: AccionData) => {
        const actions: actionsType = {
            refreshData: () => {
                refreshData.value = !refreshData.value;
            },
            default: () => console.log('Accion no encontrada'),
        };

        const selectedAction = actions[accion.accion] || actions['default'];
        if ('function' === typeof selectedAction) {
            selectedAction();
        }
    };

    onMounted(() => {
        refreshData.value = !refreshData.value;
    });

    const breadCrumb = [
        {
            type: 'link',
            title: 'Home',
            icon: '<svg class="w-3 h-3 me-2.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z"/></svg>',
            link: `/${panelUrl}/dashboard`,
        },
        {
            type: 'link',
            title: 'Perfiles',
            icon: '<svg class="w-3 h-3 text-gray-400 mx-1" fill="none" viewBox="0 0 6 10" xmlns="http://www.w3.org/2000/svg"><path d="m1 9 4-4-4-4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
            link: `/${panelUrl}/perfiles`,
        },
        {
            type: 'text',
            title: 'Mantenedor de Perfiles',
            icon: '<svg class="w-3 h-3 text-gray-400 mx-1" fill="none" viewBox="0 0 6 10" xmlns="http://www.w3.org/2000/svg"><path d="m1 9 4-4-4-4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
            link: '',
        },
    ];
</script>
<template>
    <div class="w-full h-full flex flex-col">
        <breadcrumb
            title="Perfiles"
            iconSVG='<svg
                    class="w-[32px] h-[32px] text-gray-800 dark:text-white"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="currentColor"
                    viewbox="0 0 24 24">
                    <path
                        d="M10.83 5a3.001 3.001 0 0 0-5.66 0H4a1 1 0 1 0 0 2h1.17a3.001 3.001 0 0 0 5.66 0H20a1 1 0 1 0 0-2h-9.17ZM4 11h9.17a3.001 3.001 0 0 1 5.66 0H20a1 1 0 1 1 0 2h-1.17a3.001 3.001 0 0 1-5.66 0H4a1 1 0 1 1 0-2Zm1.17 6H4a1 1 0 1 0 0 2h1.17a3.001 3.001 0 0 0 5.66 0H20a1 1 0 1 0 0-2h-9.17a3.001 3.001 0 0 0-5.66 0Z" />
                </svg>'
            :items="breadCrumb" />

        <div class="flex-1 relative shadow-md sm:rounded-lg mx-4 overflow-y-auto">
            <lineHr />
            <div class="flex justify-between items-center pb-2">
                <a
                    @click="newPerfil"
                    class="text-white bg-brand hover:bg-brand-600 focus:ring-4 focus:outline-none focus:ring-brand/30 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-brand dark:hover:bg-brand-600 dark:focus:ring-brand-600 cursor-pointer">
                    <svg
                        class="w-[20px] h-[20px] text-gray-800 dark:text-white"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="currentColor">
                        <path
                            d="M10.83 5a3.001 3.001 0 0 0-5.66 0H4a1 1 0 1 0 0 2h1.17a3.001 3.001 0 0 0 5.66 0H20a1 1 0 1 0 0-2h-9.17ZM4 11h9.17a3.001 3.001 0 0 1 5.66 0H20a1 1 0 1 1 0 2h-1.17a3.001 3.001 0 0 1-5.66 0H4a1 1 0 1 1 0-2Zm1.17 6H4a1 1 0 1 0 0 2h1.17a3.001 3.001 0 0 0 5.66 0H20a1 1 0 1 0 0-2h-9.17a3.001 3.001 0 0 0-5.66 0Z" />
                    </svg>
                    <span class="max-lg:hidden ms-2">Nuevo Perfil</span>
                </a>
            </div>
            <div class="grid lg:grid-cols-[1fr,2fr] gap-4 grid-cols-1">
                <listPerfilesSide :refreshData="refreshData" />
                <perfilSide @accion="accion" />
            </div>
        </div>
    </div>
</template>
