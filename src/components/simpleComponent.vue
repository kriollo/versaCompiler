<script setup lang="ts">
    import vComponent from '@/components/vComponent.vue';
    import { ref } from 'vue';

    const message = ref('Hello from versaCompiler!');

    setTimeout(() => {
        message.value = 'Hello from versaCompiler after 3 seconds!';
    }, 3000);
</script>
<template>
    <div class="container">
        <h1>Simple Component</h1>
        <div class="inputContainer">
            <input type="text" v-model="message" />
        </div>
        <div class="componentContainer">
            <vComponent :message="message" />
        </div>
    </div>
</template>
<style lang="css" scoped>
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px;
        background-color: #f9f9f9;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }

    .inputContainer {
        width: 100%;
        margin-bottom: 20px;
    }

    input {
        width: 100%;
        padding: 10px;
        font-size: 16px;
        border: 1px solid #ccc;
        border-radius: 5px;
    }

    .componentContainer {
        width: 100%;
    }
</style>
