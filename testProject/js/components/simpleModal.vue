<docs lang="JSDoc">
/**
 * @preserve
 * This Vue component is a modal dialog that can be shown or hidden based on the `showModal` prop.
 *
 * Props:
 * @property {string} idModal - (required): The ID of the modal.
 * @property {boolean} showModal - (required): Determines whether the modal is visible.
 * @property {('max-w-md'|'max-w-lg'|'max-w-2xl'|'max-w-4xl'|'max-w-7xl')} [size='max-w-md'] - (optional): The size of the modal.
 *
 * Emits:
 * @event {Object} accion - Emits an object with the action to be performed.
 */
</docs>
<script setup lang="ts">
    import { computed, ref } from 'vue';

    interface Props {
        idModal: string;
        showModal: boolean;
        size?: 'max-w-md' | 'max-w-lg' | 'max-w-2xl' | 'max-w-4xl' | 'max-w-7xl' | string;
    }

    const props = withDefaults(defineProps<Props>(), {
        showModal: true,
        size: 'max-w-md',
        showFooter: true,
    });

    const showModal = computed(() => props.showModal);
    const idModal = computed(() => props.idModal);
    const size = computed(() => props.size);
    const modal = ref(undefined);
</script>
<template>
    <div
        v-if="showModal"
        :id="idModal"
        ref="modal"
        class="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full backdrop-blur drop-shadow-versaWYS"
        tabindex="-1">
        <div class="relative p-4 w-full max-h-full" :class="size">
            <!-- Modal content -->
            <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
                <!-- Modal body -->
                <div class="p-4 md:p-5 space-y-4">
                    <slot name="modalBody"></slot>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
    .v-enter-active,
    .v-leave-active {
        transition: opacity 0.3s ease;
    }

    .v-enter-from,
    .v-leave-to {
        opacity: 0;
    }
</style>
