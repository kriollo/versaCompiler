<script setup lang="ts">
    import { computed, ref } from 'vue';

    type Props = {
        idModal: string;
        showModal: boolean;
        size?:
            | 'max-w-md'
            | 'max-w-lg'
            | 'max-w-2xl'
            | 'max-w-4xl'
            | 'max-w-7xl'
            | string;
        showFooter?: boolean;
    };

    const props = withDefaults(defineProps<Props>(), {
        showModal: true,
        size: 'max-w-md',
        showFooter: true,
    });

    const emit = defineEmits(['accion']);

    const showModal = computed(() => props.showModal);
    const idModal = computed(() => props.idModal);
    const size = computed(() => props.size);
    const showFooter = computed(() => props.showFooter);
    const modal = ref(null);
</script>
<template>
    <div
        v-if="showModal"
        class="flex overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full backdrop-blur drop-shadow-versaWYS"
        :id="idModal"
        ref="modal"
        tabindex="-1">
        <div class="relative p-4 w-full max-h-full" :class="size">
            <!-- Modal content -->
            <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
                <!-- Modal header -->
                <div class="p-4 md:p-3 border-b rounded-t dark:border-gray-600">
                    <slot name="modalTitle"></slot>
                </div>
                <!-- Modal body -->
                <div class="p-4 md:p-5 space-y-4">
                    <slot name="modalBody"></slot>
                </div>
                <!-- Modal footer -->
                <div
                    v-if="showFooter"
                    class="flex justify-between gap-2 items-center p-4 md:p-5 border-t border-gray-200 rounded-b dark:border-gray-600">
                    <slot name="modalFooter"></slot>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
    .flex {
        display: flex;
    }
    .overflow-y-auto {
        overflow-y: auto;
    }
    .overflow-x-hidden {
        overflow-x: hidden;
    }
    .fixed {
        position: fixed;
    }
    .top-0 {
        top: 0;
    }
    .right-0 {
        right: 0;
    }
    .left-0 {
        left: 0;
    }
    .z-50 {
        z-index: 50;
    }
    .justify-center {
        justify-content: center;
    }
    .items-center {
        align-items: center;
    }
    .w-full {
        width: 100%;
    }
    .md\:inset-0 {
        inset: 0;
    }
    .h-\[calc\(100\%-1rem\)\] {
        height: calc(100% - 1rem);
    }
    .max-h-full {
        max-height: 100%;
    }
    .backdrop-blur {
        backdrop-filter: blur(10px);
    }
    .drop-shadow-versaWYS {
        filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
    }
    .relative {
        position: relative;
    }
    .overflow-y-auto {
        overflow-y: auto;
    }
    .overflow-x-hidden {
        overflow-x: hidden;
    }
    .p-4 {
        padding: 1rem;
    }
    .max-h-full {
        max-height: 100%;
    }
    .bg-white {
        background-color: white;
    }
    .rounded-lg {
        border-radius: 0.5rem; /* Ejemplo */
    }
    .shadow {
        box-shadow:
            0 1px 3px 0 rgba(0, 0, 0, 0.1),
            0 1px 2px 0 rgba(0, 0, 0, 0.06); /* Ejemplo */
    }
    .dark\\:bg-gray-700 {
        /* Estilos para modo oscuro, ejemplo: */
        /* background-color: #374151; */
    }
    .md\\:p-3 {
        /* padding: 0.75rem; en md y superior */
    }
    .border-b {
        border-bottom-width: 1px; /* Ejemplo */
    }
    .rounded-t {
        border-top-left-radius: 0.5rem; /* Ejemplo */
        border-top-right-radius: 0.5rem; /* Ejemplo */
    }
    .dark\\:border-gray-600 {
        /* Estilos para modo oscuro, ejemplo: */
        /* border-color: #4B5563; */
    }
    .md\\:p-5 {
        /* padding: 1.25rem; en md y superior */
    }
    .space-y-4 > :not([hidden]) ~ :not([hidden]) {
        --tw-space-y-reverse: 0;
        margin-top: calc(1rem * calc(1 - var(--tw-space-y-reverse)));
        margin-bottom: calc(1rem * var(--tw-space-y-reverse));
    }
    .justify-between {
        justify-content: space-between;
    }
    .gap-2 {
        gap: 0.5rem; /* Ejemplo */
    }
    .border-t {
        border-top-width: 1px; /* Ejemplo */
    }
    .border-gray-200 {
        border-color: #e5e7eb; /* Ejemplo */
    }
    .rounded-b {
        border-bottom-left-radius: 0.5rem; /* Ejemplo */
        border-bottom-right-radius: 0.5rem; /* Ejemplo */
    }
</style>
