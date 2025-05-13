<script setup lang="ts">
    import modal from '@/js/components/modal.vue';
    import ModalSobreModal from '@/js/module/modals/ModalSobreModal.vue';
    import { computed, ref } from 'vue';

    const props = withDefaults(defineProps<{ showModal: boolean }>(), {
        showModal: false,
    });

    const showModal = computed(() => props.showModal);
    const emit = defineEmits(['accion']);

    const showOtroModal = ref(false);
    const openOtroModal = () => {
        showOtroModal.value = true;
    };
    const closeOtroModal = () => {
        showOtroModal.value = false;
    };

    const closeModal = () => {
        emit('accion', false);
    };
</script>
<template>
    <modal idModal="modal" :showModal="showModal" size="max-w-2xl">
        <template #modalTitle>
            <h1 class="text-lg font-bold text-gray-800 dark:text-gray-100">
                Título del primer Modal
            </h1>
        </template>
        <template #modalBody>
            <p class="text-gray-700 dark:text-gray-200">
                Contenido del primer modal, probando el hot reload module
            </p>
            <ModalSobreModal
                :showModal="showOtroModal"
                @accion="closeOtroModal" />
        </template>
        <template #modalFooter>
            <button
                class="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold transition mr-2"
                @click="openOtroModal">
                Abrir segundo modal
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
