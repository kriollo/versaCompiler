<script setup lang="ts">
    import modal from '@/js/components/modal.vue';
    import { computed } from 'vue';

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
            <h1 class="text-lg font-bold">Título del Modals</h1>
        </template>
        <template #modalBody>
            <p>Contenido del otro modal tratando de actualizar</p>
        </template>
        <template #modalFooter>
            <button class="btn btn-primary">Aceptar</button>
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
