<script setup lang="ts">
    import simpleComponent from '@/components/simpleComponent.vue';
</script>
<template>
    <div class="appContainer">
        <simpleComponent />
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
