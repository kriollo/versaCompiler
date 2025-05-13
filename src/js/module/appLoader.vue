<script setup lang="ts">
    import primerModal from '@/js/module/modals/primerModal.vue';
    import simpleComponent from '@/js/module/simpleComponent.vue';
    import { ref } from 'vue';

    const showLocalModal = ref(false);
    const openModal = () => {
        showLocalModal.value = true;
    };
    const closeModal = () => {
        showLocalModal.value = false;
    };
</script>
<template>
    <div class="appContainer">
        <h1>App Loader VueJS</h1>
        <simpleComponent />
        <button @click="openModal" class="btn btn-primary">
            Abrir primer Modals
        </button>
        <primerModal :showModal="showLocalModal" @accion="closeModal" />
    </div>
</template>
<style lang="css">
    html {
        background-color: #f0f0f0;
        font-family: Arial, sans-serif;
    }

    body {
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
    }

    .appContainer {
        width: 80%;
        max-width: 800px;
        background-color: #fff;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }
</style>
