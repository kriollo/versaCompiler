<script setup lang="ts">
    import type { VersaFetchResponse } from 'versaTypes';
    import { inject, onMounted, ref } from 'vue';

    import LauncherMenu from '@/dashboard/js/dashboard/LauncherMenu.vue';
    import { versaFetch } from '@/dashboard/js/functions';

    const panelUrl = inject<string>('panelUrl', ''); // Obtiene el panel URL desde la inyección
    const contenido = ref('');

    const getPlanEmpresa = async () =>
        await versaFetch({
            method: 'GET',
            url: `/${panelUrl}/tuPlan`,
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

    onMounted(async () => {
        interface responsePlan extends VersaFetchResponse {
            content: string;
            type: string;
            url: string;
        }
        const response = (await getPlanEmpresa()) as responsePlan;

        if (response.type === 'html') {
            contenido.value = response.content;
        } else if (response.type === 'redirect') {
            window.location.href = response.url;
        }
    });
</script>
<template>
    <div class="w-full h-full flex flex-col">
        <div class="flex-1 relative shadow-md sm:rounded-lg mx-4 overflow-y-auto">
            <LauncherMenu />
        </div>

        <div v-html="contenido"></div>
    </div>
</template>
