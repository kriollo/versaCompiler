<script setup lang="ts">
    import operacionesMatematicas from '@/js/module/operacionesMatematicas.vue';
    import { ref } from 'vue';

    const message = ref('Hola desde versaCompiler!');

    setTimeout(() => {
        message.value = 'Hola desde versaCompiler después de 3 segundos!';
    }, 3000);
</script>
<template>
    <div
        class="flex flex-col items-center p-6 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
        <h1 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            componente Simple
        </h1>
        <div class="w-full mb-4">
            <input
                type="text"
                v-model="message"
                class="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
        </div>
        <div class="w-full">
            <operacionesMatematicas :message="message"></operacionesMatematicas>
        </div>
    </div>
</template>
<style scoped>
    /* Eliminadas las clases personalizadas, todo es TailwindCSS */
</style>
