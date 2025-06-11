<script setup lang="ts">
    import Swal from 'sweetalert2';

    import { ref } from 'vue';

    // importar css de sweetalert2

    import operacionesMatematicas from 'e@/js/module/operacionesMatematicas.vue';

    const message = ref('Hola desde versaCompiler!ss');
    const showAlert = () => {
        Swal.fire({
            title: 'Alerta',
            text: message.value,
            icon: 'info',
            confirmButtonText: 'Aceptar',
        });
    };
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
        <div class="w-full mx-2">
            <button
                @click="showAlert"
                class="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400">
                Mostrar Alerta
            </button>
        </div>
        <div class="w-full">
            <operacionesMatematicas :message="message"></operacionesMatematicas>
        </div>
    </div>
</template>
<style scoped>
    /* Eliminadas las clases personalizadas, todo es TailwindCSS */
</style>
