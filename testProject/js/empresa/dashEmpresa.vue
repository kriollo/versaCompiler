<script setup lang="ts">
    import { inject, reactive } from 'vue';

    import breadcrumb from '@/dashboard/js/components/breadcrumb.vue';
    import lineHr from '@/dashboard/js/components/lineHr.vue';
    import empresaList from '@/dashboard/js/empresa/empresaList.vue';
    import {
        type AdicionalFactura,
        AdicionalFacturaInjection,
        type ShowModalAsociaModulo,
        showModalAsociaModuloInjection,
        type ShowModalAsociaPlan,
        showModalAsociaPlanInjection,
        type ShowModalEmpresa,
        ShowModalEmpresaInjection,
    } from '@/dashboard/js/empresa/InjectKeys';

    const panelUrl = inject<string>('panelUrl', ''); // Obtiene el panel URL desde la inyección

    const breadCrumb = [
        {
            type: 'link',
            title: 'Home',
            icon: '<svg class="w-3 h-3 me-2.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z"/></svg>',
            link: `/${panelUrl}/dashboard`,
        },
        {
            type: 'link',
            title: 'Empresas',
            icon: '<svg class="w-3 h-3 text-gray-400 mx-1" fill="none" viewBox="0 0 6 10" xmlns="http://www.w3.org/2000/svg"><path d="m1 9 4-4-4-4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
            link: `/${panelUrl}/empresas`,
        },
        {
            type: 'text',
            title: 'Mantenedor de Empresa',
            icon: '<svg class="w-3 h-3 text-gray-400 mx-1" fill="none" viewBox="0 0 6 10" xmlns="http://www.w3.org/2000/svg"><path d="m1 9 4-4-4-4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
            link: '',
        },
    ];

    const showModalEmpresa = reactive<ShowModalEmpresa>({
        showModalEmpresa: false,
        itemSelected: null,
        action: 'create',
    });
    ShowModalEmpresaInjection.provide(showModalEmpresa);

    const showModalAsociaModulo = reactive<ShowModalAsociaModulo>({
        showModalAsociaModulo: false,
        itemSelected: null,
    });
    showModalAsociaModuloInjection.provide(showModalAsociaModulo);

    const showModalAsociaPlan = reactive<ShowModalAsociaPlan>({
        showModalAsociaPlan: false,
        itemSelected: null,
    });
    showModalAsociaPlanInjection.provide(showModalAsociaPlan);

    const adicionalFactura = reactive<AdicionalFactura>({
        empresa_id: 0,
        showModal: false,
    });
    AdicionalFacturaInjection.provide(adicionalFactura);
</script>
<template>
    <div class="w-full h-full flex flex-col">
        <breadcrumb
            title="Empresas"
            iconSVG="<svg class='w-6 h-6 text-gray-800 dark:text-white' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' viewBox='0 0 24 24'> <path stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M7 6H5m2 3H5m2 3H5m2 3H5m2 3H5m11-1a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2M7 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm8 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z'/> </svg>"
            :items="breadCrumb" />
        <div class="flex-1 relative shadow-md sm:rounded-lg mx-4 overflow-y-auto">
            <lineHr />
            <empresaList />
        </div>
    </div>
</template>
