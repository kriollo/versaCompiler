<template>
    <div
        class="fixed top-4 right-4 min-w-80 max-w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 animate-fade-in"
        :class="[colorClasses, 'border-l-4']"
        role="alert">
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center space-x-2">
                <i :class="icono" class="text-lg"></i>
                <h4 class="font-semibold text-gray-900 dark:text-white">{{ titulo }}</h4>
            </div>
            <button
                type="button"
                class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white transition-colors"
                @click="$emit('cerrar')">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>

        <div class="p-4">
            <p class="text-sm text-gray-700 dark:text-gray-300">{{ mensaje }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { computed } from 'vue';

    const props = defineProps<{
        tipo: 'success' | 'error' | 'warning' | 'info';
        mensaje: string;
    }>();

    defineEmits<{
        cerrar: [];
    }>();

    const titulo = computed(() => {
        const titulos = {
            success: 'Éxito',
            error: 'Error',
            warning: 'Advertencia',
            info: 'Información',
        };
        return titulos[props.tipo];
    });

    const icono = computed(() => {
        const iconos = {
            success: 'bi bi-check-circle-fill text-green-500',
            error: 'bi bi-exclamation-triangle-fill text-red-500',
            warning: 'bi bi-exclamation-triangle-fill text-yellow-500',
            info: 'bi bi-info-circle-fill text-brand',
        };
        return iconos[props.tipo];
    });

    const colorClasses = computed(() => {
        const clases = {
            success: 'border-l-green-500',
            error: 'border-l-red-500',
            warning: 'border-l-yellow-500',
            info: 'border-l-blue-500',
        };
        return clases[props.tipo];
    });
</script>

<style scoped>
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
    }
</style>
