<script setup lang="ts">
    /**
     * TabPanel.vue — Tabs con provide/inject para estado activo
     * Prueba: provide/inject, scoped slots para contenido de tabs
     */
    import { ref, provide, computed } from 'vue';
    import type { TabId } from '../contactStore';

    interface Tab {
        id: TabId;
        label: string;
        count?: number;
    }

    interface Props {
        tabs: Tab[];
        modelValue: TabId;
    }

    const props = defineProps<Props>();
    const emit = defineEmits<{ 'update:modelValue': [TabId] }>();

    const activeTab = computed(() => props.modelValue);

    // provide para que AccordionItem u otros hijos puedan leer el tab activo
    provide('activeTab', activeTab);

    function selectTab(id: TabId) {
        emit('update:modelValue', id);
    }
</script>

<template>
    <div>
        <!-- Tab headers -->
        <div
            class="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto"
            role="tablist">
            <button
                v-for="tab in tabs"
                :key="tab.id"
                role="tab"
                :aria-selected="activeTab === tab.id"
                :data-tab="tab.id"
                :data-active="activeTab === tab.id"
                @click="selectTab(tab.id)"
                class="px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
                :class="
                    activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                ">
                {{ tab.label }}
                <span
                    v-if="tab.count !== undefined"
                    class="ml-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full px-1.5">
                    {{ tab.count }}
                </span>
            </button>
        </div>

        <!-- Tab content via scoped slot -->
        <div class="pt-4">
            <slot :activeTab="activeTab" />
        </div>
    </div>
</template>
