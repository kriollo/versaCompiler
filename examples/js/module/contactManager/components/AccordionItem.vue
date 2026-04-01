<script setup lang="ts">
    /**
     * AccordionItem.vue — Acordeón con inject + Transition animada
     * Prueba: inject desde padre, <Transition>, toggle con height animation
     */
    import { ref } from 'vue';

    interface Props {
        title: string;
        initialOpen?: boolean;
    }

    const props = withDefaults(defineProps<Props>(), {
        initialOpen: false,
    });

    const isOpen = ref(props.initialOpen);

    function toggle() {
        isOpen.value = !isOpen.value;
    }
</script>

<template>
    <div
        class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
            @click="toggle"
            :aria-expanded="isOpen"
            class="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <span>{{ title }}</span>
            <span
                class="text-gray-400 transition-transform duration-200"
                :class="{ 'rotate-180': isOpen }">
                ▼
            </span>
        </button>

        <Transition name="accordion">
            <div
                v-if="isOpen"
                class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900">
                <slot />
            </div>
        </Transition>
    </div>
</template>

<style scoped>
    .accordion-enter-active,
    .accordion-leave-active {
        transition: all 0.25s ease;
        overflow: hidden;
    }

    .accordion-enter-from,
    .accordion-leave-to {
        max-height: 0;
        opacity: 0;
    }

    .accordion-enter-to,
    .accordion-leave-from {
        max-height: 200px;
        opacity: 1;
    }
</style>
