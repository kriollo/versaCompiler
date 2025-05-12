<script setup lang="ts">
    import modal from '@/js/components/modal.vue';
    import ModalSobreModal from '@/js/module/otroModulo/ModalSobreModal.vue';
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
    const componentKey = ref(Date.now());

    const closeModal = () => {
        emit('accion', false);
    };
</script>
<template>
    <modal
        idModal="modal"
        :showModal="showModal"
        size="max-w-2xl"
        :key="componentKey">
        <template #modalTitle>
            <h1 class="text-lg font-bold">Título del Modal</h1>
        </template>
        <template #modalBody>
            <p>Contenido del modal</p>
            <ModalSobreModal
                :showModal="showOtroModal"
                @accion="closeOtroModal" />
        </template>
        <template #modalFooter>
            <button class="btn btn-primary" @click="openOtroModal">
                Abrir otro modal
            </button>
            <button class="btn btn-secondary" @click="closeModal">
                cerrar
            </button>
        </template>
    </modal>
</template>
<style scoped>
    .btn {
        padding: 10px 20px;
        border-radius: 5px;
        border: none;
        cursor: pointer;
    }

    .btn-primary {
        background-color: #007bff;
        color: white;
    }

    .btn-secondary {
        background-color: #6c757d;
        color: white;
    }
</style>
