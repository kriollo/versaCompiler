<script setup lang="ts">
    import { computed } from 'vue';

    import modal from '@/js/components/modal.vue';

    const props = withDefaults(defineProps<{ showModal: boolean }>(), {
        showModal: false,
    });

    const showModal = computed(() => props.showModal);
    const emit = defineEmits(['accion']);

    const closeModal = () => {
        emit('accion', false);
    };
</script>
<template>
    <modal idModal="modal" :showModal="showModal" size="max-w-2xl">
        <template #modalTitle>
            <h1 class="text-lg font-bold text-gray-800 dark:text-gray-100">
                Título del Modals
            </h1>
        </template>
        <template #modalBody>
            <p class="text-gray-700 dark:text-gray-200">
                Contenido del otro modal
            </p>
        </template>
        <template #modalFooter>
            <button
                class="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold transition mr-2">
                Aceptar
            </button>
            <button
                class="px-4 py-2 rounded bg-gray-500 hover:bg-gray-600 text-white font-semibold transition"
                @click="closeModal">
                cerrar
            </button>
        </template>
    </modal>
</template>
<style scoped>
    /* Solo TailwindCSS, sin clases personalizadas */
</style>
