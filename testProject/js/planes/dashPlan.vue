<script setup lang="ts">
    import { inject, reactive } from 'vue';

    import breadcrumb from '@/dashboard/js/components/breadcrumb.vue';
    import lineHr from '@/dashboard/js/components/lineHr.vue';
    import planList from '@/dashboard/js/planes/planList.vue';
    import { type ShowModalPlan, useModalPlan } from '@/dashboard/js/planes/planType';

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
            title: 'Planes',
            icon: '<svg class="w-3 h-3 text-gray-400 mx-1" fill="none" viewBox="0 0 6 10" xmlns="http://www.w3.org/2000/svg"><path d="m1 9 4-4-4-4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
            link: `/${panelUrl}/planes`,
        },
        {
            type: 'text',
            title: 'Gestión de Planes',
            icon: '<svg class="w-3 h-3 text-gray-400 mx-1" fill="none" viewBox="0 0 6 10" xmlns="http://www.w3.org/2000/svg"><path d="m1 9 4-4-4-4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
            link: '',
        },
    ];

    const showModalPlan = reactive<ShowModalPlan>({
        show: false,
        itemSelected: {
            id: 0,
            nombre: '',
            descripcion: '',
            tipo_plan: 'mensual',
            duracion_almacenamiento_dias: 30,
            moderacion_ia: false,
            duracion_video_min_segundos: 5,
            duracion_video_max_segundos: 120,
            tiempo_vida_rechazado_dias: 0,
            max_videos_por_campana: null,
            max_tamano_video_mb: 100,
            max_usuarios_admin: 1,
            nivel_soporte: 'basico',
            precio_mensual: 0,
            moneda: 'CLP',
            estado: true,
        },
    });
    useModalPlan.provide(showModalPlan);
</script>

<template>
    <div class="w-full h-full flex flex-col">
        <breadcrumb
            title="Planes"
            iconSVG="<svg class='w-6 h-6 text-gray-800 dark:text-white' fill='none' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke='currentColor' stroke-linecap='round' stroke-width='2' d='M8 7V6a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-1M3 18v-7a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Zm8-3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z' /></svg>"
            :items="breadCrumb" />

        <div class="flex-1 relative shadow-md sm:rounded-lg mx-4 overflow-y-auto">
            <lineHr />
            <planList />
        </div>
    </div>
</template>
