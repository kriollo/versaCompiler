<script setup lang="ts">
    import { inject, reactive, ref } from 'vue';

    import breadcrumb from '@/dashboard/js/components/breadcrumb.vue';
    import lineHr from '@/dashboard/js/components/lineHr.vue';
    import ConsumoMes from '@/dashboard/js/facturacion/cliente/ConsumoMes.vue';
    import ListFacturas from '@/dashboard/js/facturacion/cliente/ListFacturas.vue';
    import { factura, type showModalFactura, useModalFactura } from '@/dashboard/js/facturacion/facturacionType';

    const panelUrl = inject<string>('panelUrl', '');

    const activeTab = ref<'consumo' | 'facturas'>('consumo');

    const showModalForm = reactive<showModalFactura>({
        show: false,
        itemSelected: { ...factura },
        loading: false,
    });
    useModalFactura.provide(showModalForm);

    const breadCrumb = [
        {
            type: 'link',
            title: 'Home',
            icon: '<svg class="w-3 h-3 me-2.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z"/></svg>',
            link: `/${panelUrl}/dashboard`,
        },
        {
            type: 'text',
            title: 'Mi Cartera',
            icon: '<svg class="w-3 h-3 text-gray-400 mx-1" fill="none" viewBox="0 0 6 10" xmlns="http://www.w3.org/2000/svg"><path d="m1 9 4-4-4-4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
            link: '',
        },
    ];
</script>

<template>
    <div class="w-full h-full flex flex-col">
        <breadcrumb
            title="Mi Cartera"
            iconSVG='<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                    <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"/>
                </svg>'
            :items="breadCrumb" />

        <div class="flex-1 relative mx-4 overflow-y-auto">
            <lineHr />

            <!-- Navegación tipo carpetas -->
            <div class="mb-6">
                <div class="border-b border-gray-200 dark:border-gray-700">
                    <ul class="flex flex-wrap -mb-px text-sm font-medium text-center">
                        <li class="me-2">
                            <button
                                @click="activeTab = 'consumo'"
                                :class="[
                                    'inline-flex items-center justify-center p-4 border-b-2 rounded-t-lg group',
                                    activeTab === 'consumo'
                                        ? 'text-brand border-brand-600 dark:text-brand dark:border-brand'
                                        : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300',
                                ]"
                                type="button">
                                <svg
                                    class="w-4 h-4 me-2"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                    xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                                </svg>
                                Consumo del Mes
                            </button>
                        </li>
                        <li class="me-2">
                            <button
                                @click="activeTab = 'facturas'"
                                :class="[
                                    'inline-flex items-center justify-center p-4 border-b-2 rounded-t-lg group',
                                    activeTab === 'facturas'
                                        ? 'text-brand border-brand-600 dark:text-brand dark:border-brand'
                                        : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300',
                                ]"
                                type="button">
                                <svg
                                    class="w-4 h-4 me-2"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                    xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        fill-rule="evenodd"
                                        d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z"
                                        clip-rule="evenodd" />
                                </svg>
                                Facturas
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Contenido según tab activa -->
            <div class="mt-6">
                <!-- Consumo del Mes -->
                <ConsumoMes v-if="activeTab === 'consumo'" class="mb-6" />

                <!-- Lista de Facturas -->
                <ListFacturas v-if="activeTab === 'facturas'" />
            </div>
        </div>
    </div>
</template>
