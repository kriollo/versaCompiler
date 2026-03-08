<template>
    <div class="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
        <!-- Header -->
        <div
            class="bg-teal-600 dark:bg-teal-700 text-white px-6 py-4 flex items-center justify-between shadow-md flex-shrink-0">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <div>
                    <h1 class="text-xl font-bold">Configuración de Inbox</h1>
                    <p class="text-sm text-teal-100">Administración de colas y agentes</p>
                </div>
            </div>
        </div>

        <!-- Tabs de secciones -->
        <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div class="flex px-6">
                <button
                    v-for="tab in configTabs"
                    :key="tab.key"
                    @click="activeSection = tab.key"
                    class="py-4 px-4 text-sm font-medium border-b-2 transition-colors mr-2"
                    :class="
                        activeSection === tab.key
                            ? 'border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    ">
                    <div class="flex items-center gap-2">
                        <component :is="tab.icon" class="w-4 h-4" />
                        {{ tab.label }}
                    </div>
                </button>
            </div>
        </div>

        <!-- Contenido de la sección activa -->
        <div class="flex-1 overflow-y-auto">
            <!-- Sección: Colas -->
            <div v-if="activeSection === 'queues'" class="max-w-5xl mx-auto">
                <QueueManager v-if="!selectedQueueForAgents" @manage-agents="openQueueAgents" />
                <QueueAgents v-else :queue="selectedQueueForAgents" @back="selectedQueueForAgents = null" />
            </div>

            <!-- Sección: Razones de Cierre -->
            <div v-else-if="activeSection === 'close-reasons'" class="max-w-5xl mx-auto p-6">
                <CloseReasonsManager />
            </div>

            <!-- Sección: Configuración General -->
            <div v-else-if="activeSection === 'general'" class="max-w-5xl mx-auto p-6">
                <InboxGeneralConfig />
            </div>

            <!-- Sección: Plantillas -->
            <div v-else-if="activeSection === 'templates'" class="max-w-5xl mx-auto">
                <MessageTemplatesManager />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { defineComponent, h, ref } from 'vue';

    import CloseReasonsManager from '@/dashboard/js/chatbot/inbox/config/CloseReasonsManager.vue';
    import InboxGeneralConfig from '@/dashboard/js/chatbot/inbox/config/InboxGeneralConfig.vue';
    import MessageTemplatesManager from '@/dashboard/js/chatbot/inbox/config/MessageTemplatesManager.vue';
    import QueueAgents from '@/dashboard/js/chatbot/inbox/config/QueueAgents.vue';
    import QueueManager from '@/dashboard/js/chatbot/inbox/config/QueueManager.vue';
    import type { Queue } from '@/dashboard/js/chatbot/inbox/types';

    type SectionKey = 'queues' | 'close-reasons' | 'general' | 'templates';

    const activeSection = ref<SectionKey>('queues');
    const selectedQueueForAgents = ref<Queue | null>(null);

    const openQueueAgents = (queue: Queue) => {
        selectedQueueForAgents.value = queue;
    };

    // Íconos SVG inline como componentes
    const IconQueues = defineComponent({
        render: () =>
            h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
                h('path', {
                    'stroke-linecap': 'round',
                    'stroke-linejoin': 'round',
                    'stroke-width': '2',
                    d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
                }),
            ]),
    });

    const IconCloseReasons = defineComponent({
        render: () =>
            h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
                h('path', {
                    'stroke-linecap': 'round',
                    'stroke-linejoin': 'round',
                    'stroke-width': '2',
                    d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
                }),
            ]),
    });

    const IconGeneral = defineComponent({
        render: () =>
            h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
                h('path', {
                    'stroke-linecap': 'round',
                    'stroke-linejoin': 'round',
                    'stroke-width': '2',
                    d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
                }),
            ]),
    });

    const IconTemplates = defineComponent({
        render: () =>
            h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
                h('path', {
                    'stroke-linecap': 'round',
                    'stroke-linejoin': 'round',
                    'stroke-width': '2',
                    d: 'M7 8h10M7 12h8m-8 4h6m9-6a9 9 0 11-18 0 9 9 0 0118 0z',
                }),
            ]),
    });

    const configTabs = [
        { key: 'queues' as SectionKey, label: 'Colas de Atención', icon: IconQueues },
        { key: 'close-reasons' as SectionKey, label: 'Razones de Cierre', icon: IconCloseReasons },
        { key: 'general' as SectionKey, label: 'Configuración General', icon: IconGeneral },
        { key: 'templates' as SectionKey, label: 'Plantillas', icon: IconTemplates },
    ];
</script>
