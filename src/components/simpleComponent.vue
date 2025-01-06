<script setup lang="ts">
    import vComponent from '@/components/vComponent.vue';
    import { ref } from 'vue';

    const message = ref('Hello from versaCompiler!');

    setTimeout(() => {
        message.value = 'Hello from versaCompiler after 2 seconds!';
    }, 2000);
</script>
<template>
    <div class="divId">
        <input type="text" v-model="message" />
    </div>
    <div>
        <vComponent :message="message" />
    </div>
</template>
<style lang="css" scoped>
    input {
        width: 100%;
        padding: 10px;
        font-size: 16px;
    }
    .divId {
        border: 1px solid #ccc;
        padding: 50px;
        margin-bottom: 10px;
    }
</style>
