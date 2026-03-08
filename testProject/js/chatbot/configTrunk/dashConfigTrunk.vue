<script setup lang="ts">
    import type { AccionData, actionsType } from 'versaTypes';
    import { inject, ref } from 'vue';

    import { type ChannelSelected, channelSelectedInjection } from '@/dashboard/js/chatbot/configTrunk/InjectKeys';
    import ListChannels from '@/dashboard/js/chatbot/configTrunk/ListChannels.vue';
    import ListTrunksAvailables from '@/dashboard/js/chatbot/configTrunk/ListTrunksAvailables.vue';
    import Breadcrumb from '@/dashboard/js/components/breadcrumb.vue';
    import LineHr from '@/dashboard/js/components/lineHr.vue';

    const panelUrl = inject<string>('panelUrl', ''); // Obtiene el panel URL desde la inyección

    const channelSelected = ref<ChannelSelected>({
        value: {
            id: 9999999,
            nombre: '',
            codigo_interno: '',
            imagen: '',
            required_register: false,
            settings: [],
        },
    });
    channelSelectedInjection.provide(channelSelected.value);
    const breadCrumb = [
        {
            type: 'link',
            title: 'Home',
            icon: '<svg class="w-3 h-3 me-2.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z"/></svg>',
            link: `/${panelUrl}/dashboard`,
        },
        {
            type: 'link',
            title: 'Control Panel',
            icon: '<svg class="w-3 h-3 text-gray-400 mx-1" fill="none" viewBox="0 0 6 10" xmlns="http://www.w3.org/2000/svg"><path d="m1 9 4-4-4-4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
            link: `/${panelUrl}/usuarios`,
        },
        {
            type: 'text',
            title: 'Configurar Canales',
            icon: '<svg class="w-3 h-3 text-gray-400 mx-1" fill="none" viewBox="0 0 6 10" xmlns="http://www.w3.org/2000/svg"><path d="m1 9 4-4-4-4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
            link: '',
        },
    ];

    const refresh = ref(false);

    const accion = (accion: AccionData) => {
        const actions: actionsType = {
            reloadData: () => {
                refresh.value = !refresh.value;
            },
            default: () => console.log('Accion no encontrada'),
        };
        const selectedAction = actions[accion.accion] || actions['default'];
        if ('function' === typeof selectedAction) {
            selectedAction();
        }
    };
</script>
<template>
    <div class="w-full h-full flex flex-col">
        <Breadcrumb
            title="Control Panel"
            iconSVG="<svg class='w-[32px] h-[32px] text-gray-800 dark:text-white' fill='currentColor' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'>
            <svg xmlns='http://www.w3.org/2000/svg' version='1.0' viewBox='0 0 354 354'>
            <path d='M111.7 14.8c-1.2 1.3-1.7 3.7-1.7 8V29H99.7c-15.3 0-14.2-2.3-14.2 28.9V84H70c-8.5 0-17.2.5-19.4 1.1-5.5 1.5-12 8.4-13.4 14.1-.9 3.4-1.2 29.6-1.2 95.7V286h-8.3c-9.8 0-11.7 1.2-11.7 7.6 0 10.7 5.7 23.9 14.3 33.1 6.7 7.2 18.3 13.6 27.6 15.3 7.4 1.4 227 1.4 234.2 0 13.4-2.5 27.6-12.5 34.5-24.3 3.9-6.7 7.4-18.1 7.4-24.3 0-6.2-2-7.4-11.8-7.4H314v-91.1c0-66.1-.3-92.3-1.2-95.7-1.4-5.7-7.9-12.6-13.4-14.1-2.2-.6-9.3-1.1-15.9-1.1h-12l.3-25.7c.3-31.3 1.3-29.3-13.9-29.3H248v-6c0-4.7-.4-6.4-2-8-2-2-3.3-2-67.3-2-62.1 0-65.5.1-67 1.8zM237 74v50H121V24h116v50zM110 57.5v17.6l-6.7-.3-6.8-.3-.3-16c-.1-8.7 0-16.5.2-17.2.4-.9 2.7-1.3 7.1-1.3h6.5v17.5zm151 0V75h-13V40h13v17.5zm-151 55.7c0 15.5.2 18.4 1.7 20 1.4 1.6 3.3 1.8 14 1.8H138v4c0 4 0 4-3.9 4-5.7 0-18.5 4.3-26 8.7-8.3 5-18.7 16-23.3 24.8-7.2 13.7-9.7 29.6-6.2 39.7 3 8.9 13.5 15.8 24.2 15.8h4.7l2.2 6.3c2.5 7.2 15.5 30.8 17.5 31.9.7.3 2.1.9 3.1 1.2 1.1.4 1.7 1.6 1.7 3.5 0 5.2 2.7 6.1 17.5 6.1 7.1 0 14-.3 15.1-.6 2.3-.6 4.4-4.2 4.4-7.4 0-1.8.7-2 6-2s6 .2 6 2c0 3.2 2.1 6.8 4.4 7.4 1.1.3 8 .6 15.1.6 14.8 0 17.2-.8 17.7-6.2.2-2.5.9-3.4 2.8-3.8 1.9-.4 4.1-3.4 9.7-13 3.9-6.9 8.2-15.5 9.4-19.3l2.4-6.7h4.5c10.6 0 21.4-7 24.4-15.7 3.5-10.2 1-26-6.2-39.8-4.6-8.8-15-19.8-23.3-24.8-7.5-4.4-20.3-8.7-26-8.7-3.9 0-3.9 0-3.9-4v-4h16c21.4 0 20 1.5 20-22V95h48l3.2 2.9 3.3 2.9.3 92.6.2 92.6H47l.2-92.6.3-92.6 3.3-2.9L54 95h56v18.2zm91 25.8v4h-52v-8h52v4zm22.7 32.1c4 9 8 19.7 8.9 23.8 2.3 10.1 1.5 27.9-1.6 37.1-2.4 7-11 24-12.2 24-.5 0-.8-4.3-.8-9.5 0-8.3-.2-9.6-1.9-10.5-1.1-.5-8.4-1-16.5-1-19 0-18.6-.3-18.6 15v11h-12v-11c0-15.3.4-15-18.6-15-8.1 0-15.4.5-16.5 1-1.7.9-1.9 2.2-1.9 10.5 0 5.2-.3 9.5-.7 9.5-1.3 0-10-17.1-12.5-24.5-3.1-9.5-3.4-32.9-.4-41.5 1.5-4.3 13.9-33 15.1-35 .2-.3 18.9-.4 41.6-.4l41.3.2 7.3 16.3zm-104.6-10.9c-.5 1.3-2.6 5.9-4.6 10.3-7.1 15.5-8.7 21.7-9.2 36.7l-.6 13.8h-2.9c-4.2 0-10.5-3.6-12.3-7-3.1-6-1.2-20.7 4.2-31.7 3.5-7 11.5-15.8 18.7-20.5 6.8-4.4 7.9-4.6 6.7-1.6zm118.5 1.6c11.2 7.2 19.4 18.8 22.8 31.9 2 7.7 2 16.5.1 20.3-1.8 3.4-8.1 7-12.3 7h-2.9l-.6-13.8c-.5-15-2.1-21.2-9.2-36.7-6.7-14.6-6.8-14.4 2.1-8.7zm-79.8 95.9-.3 11.8-7.2.3-7.3.3V246h15.1l-.3 11.7zm49.2.3v12.1l-7.2-.3-7.3-.3-.3-11.8-.3-11.7H207v12zM65 310.5c3 3.6.4 9.5-4.1 9.5-2.5 0-4.9-2.7-4.9-5.5 0-4.7 6.2-7.4 9-4zm20 0c3 3.6.4 9.5-4.1 9.5-4.3 0-6.5-6.3-3.3-9.4 2-2 5.8-2.1 7.4-.1zm20 0c3 3.6.4 9.5-4.1 9.5-4.4 0-6.8-7.8-3.1-9.9 2.5-1.5 5.8-1.3 7.2.4zm20 0c3 3.6.4 9.5-4.1 9.5-4.4 0-6.8-7.8-3.1-9.9 2.5-1.5 5.8-1.3 7.2.4zm146.4.1c2.1 2 2 5.3-.1 7.6-1.5 1.7-4 1.8-37.1 1.8-31.7 0-35.7-.2-37.4-1.7-2.2-2-2.3-5.6-.2-7.7 1.3-1.4 6.1-1.6 37.4-1.6 31.3 0 36.1.2 37.4 1.6z'/>
            <path d='M148.6 47.2c-1.1 1.6-1.6 4.6-1.6 10.5 0 7 .3 8.6 2 10.3 2.4 2.4 3.8 2.5 6.8.4 2-1.4 2.2-2.3 2.2-10.9 0-7.2-.4-9.7-1.6-10.9-2.2-2.3-6-2-7.8.6zM200.6 47.2c-1.1 1.6-1.6 4.6-1.6 10.5 0 7 .3 8.6 2 10.3 2.4 2.4 3.8 2.5 6.8.4 2-1.4 2.2-2.3 2.2-10.9 0-7.2-.4-9.7-1.6-10.9-2.2-2.3-6-2-7.8.6zM195.9 84.6c-9.4 10-23.7 10.6-34.1 1.4-5.1-4.4-7.6-5-10.1-2.2-2.6 2.9-2 5.7 2.1 9.7 4.8 4.7 11.3 8 18.9 9.6 5.2 1.1 7 1 12.9-.4 9.4-2.4 17.9-8 21.1-14 1.3-2.5 1.3-3.1-.2-5.3-2.4-3.6-6.4-3.2-10.6 1.2zM142 185.5v8.5l2.6-1c1.4-.6 5-1 8.1-1 4.6 0 6.5-.6 10.5-3.1 2.7-1.7 6.1-3.2 7.5-3.2 2.8 0 5.3 2.6 5.3 5.2 0 1.4 1.7 1.6 13 1.2 7.5-.2 14.3.1 16 .7l3 1.1V177h-66v8.5zM163.5 201.6c-1.5 1.2-4.4 1.4-11.8 1.2l-9.7-.3V219h66v-16.5l-12.4.3-12.4.3-3.6 5.5c-3 4.5-4.1 5.4-6.6 5.4-3.6 0-6-3.1-6-8s-1-6.2-3.5-4.4z'/>
            </svg></svg>"
            :items="breadCrumb" />
        <div class="flex-1 relative overflow-y-auto">
            <LineHr />
            <ListChannels :refresh="refresh" />
            <ListTrunksAvailables @accion="accion" />
        </div>
    </div>
</template>
