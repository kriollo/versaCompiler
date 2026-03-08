<script setup lang="ts">
    import type { VersaFetchResponse } from 'versaTypes';
    import { inject, onMounted, ref, watch } from 'vue';

    import { type Channel, channelSelectedInjection } from '@/dashboard/js/chatbot/configTrunk/InjectKeys';
    import { versaFetch } from '@/dashboard/js/functions';

    const props = withDefaults(
        defineProps<{
            refresh: boolean;
        }>(),
        {
            refresh: false,
        },
    );

    const panelUrl = inject<string>('panelUrl', ''); // Obtiene el panel URL desde la inyección
    const empresaSelected = inject<string>('empresaSelected', '');

    interface ChannelResponse extends VersaFetchResponse {
        data: Channel[];
    }

    const channels = ref<Channel[]>([]);
    const channelSelected = channelSelectedInjection.inject();

    const getChannelsByEmpresa = async (idEmpresa: string) => {
        const response = (await versaFetch({
            url: `/${panelUrl}/chatbot/api/channels/${idEmpresa}`,
            method: 'GET',
        })) as ChannelResponse;
        return response.data;
    };

    onMounted(async () => {
        channels.value = await getChannelsByEmpresa(empresaSelected);
    });

    watch(
        () => props.refresh,
        async newVal => {
            if (newVal) {
                channels.value = await getChannelsByEmpresa(empresaSelected);
            }
        },
    );

    const setChannelSelected = (channel: Channel) => {
        channelSelected.value = channel;
    };
</script>
<template>
    <div class="flex gap-2 mx-2">
        <div
            v-for="(item, key) in channels"
            @click="setChannelSelected(item)"
            :key="item.id"
            class="w-full bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 cursor-pointer dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:hover:border-gray-500"
            :class="{
                'ring-2 ring-brand': channelSelected.value.id === item.id,
            }">
            <div class="flex flex-col space-y-3">
                <div class="flex items-center space-x-3">
                    <img
                        :src="item.imagen"
                        alt="Imagen de {{ item.nombre }}"
                        class="w-12 h-12 rounded-full flex-shrink-0" />
                    <div class="flex-1 min-w-0">
                        <h3 class="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {{ item.nombre }}
                        </h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Código: {{ item.codigo_interno }}</p>
                    </div>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-xs text-gray-600 dark:text-gray-300">Canales conectados</span>
                    <span
                        class="bg-brand-100 text-brand-800 text-xs font-medium px-2.5 py-1 rounded-full dark:bg-brand-900 dark:text-brand-300">
                        {{ item.count }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>
