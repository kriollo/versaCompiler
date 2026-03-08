<script setup lang="ts">
    import { inject, reactive } from 'vue';

    import breadcrumb from '@/dashboard/js/components/breadcrumb.vue';
    import lineHr from '@/dashboard/js/components/lineHr.vue';
    import { factura, type showModalFactura, useModalFactura } from '@/dashboard/js/facturacion/facturacionType';
    import FormGenerarFactura from '@/dashboard/js/facturacion/FormGenerarFactura.vue';
    import ListAllFacturas from '@/dashboard/js/facturacion/ListAllFacturas.vue';

    const panelUrl = inject<string>('panelUrl', '');

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
            title: 'Facturación',
            icon: '<svg class="w-3 h-3 text-gray-400 mx-1" fill="none" viewBox="0 0 6 10" xmlns="http://www.w3.org/2000/svg"><path d="m1 9 4-4-4-4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
            link: '',
        },
    ];
</script>

<template>
    <div class="w-full h-full flex flex-col">
        <breadcrumb
            title="Facturación"
            iconSVG='<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/>
                </svg>'
            :items="breadCrumb" />

        <div class="flex-1 relative shadow-md sm:rounded-lg mx-4 overflow-y-auto">
            <lineHr />
            <ListAllFacturas />
        </div>

        <FormGenerarFactura />
    </div>
</template>
