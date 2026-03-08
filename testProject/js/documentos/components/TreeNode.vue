<template>
    <div class="select-none" :style="{ paddingLeft: nivel * 20 + 'px' }">
        <div
            class="flex items-center px-2 py-1 rounded cursor-pointer transition-all duration-200 min-h-7 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent"
            :class="{
                'bg-brand-50 dark:bg-brand-900/20 text-brand dark:text-brand-400 font-medium border-brand ring-2 ring-brand/40 dark:ring-brand/30':
                    Number(carpetaSeleccionada) === Number(carpeta.id),
                'text-gray-900 dark:text-gray-100': carpetaSeleccionada !== carpeta.id,
            }"
            @click="seleccionar"
            @contextmenu.prevent="$emit('menu-contextual', $event, carpeta)">
            <!-- El icono de carpeta abierta debe mostrarse si la carpeta está seleccionada, sin requerir que esté expandida -->
            <div
                class="mx-1.5 text-base min-w-4"
                :class="
                    Number(carpetaSeleccionada) === Number(carpeta.id)
                        ? 'text-brand dark:text-brand-400'
                        : 'text-yellow-600 dark:text-yellow-400'
                ">
                <i
                    class="bi"
                    :class="
                        Number(carpetaSeleccionada) === Number(carpeta.id) ? ' bi-folder2-open' : ' bi-folder-fill'
                    "></i>
            </div>

            <div
                class="flex-1 text-xs whitespace-nowrap overflow-hidden text-ellipsis"
                :class="
                    Number(carpetaSeleccionada) === Number(carpeta.id)
                        ? 'text-brand dark:text-brand-400 font-semibold'
                        : 'text-gray-900 dark:text-gray-100'
                ">
                {{ carpeta.nombre }}
            </div>

            <div v-if="carpeta.documento_count !== undefined" class="ml-2">
                <span
                    class="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5 text-xs font-medium">
                    {{ carpeta.documento_count }}
                </span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    interface Carpeta {
        id: number;
        nombre: string;
        carpeta_padre_id?: number;
        documento_count?: number;
        updated_at: string;
    }

    interface Props {
        carpeta: Carpeta;
        nivel: number;
        carpetaSeleccionada: number | null;
    }

    const props = defineProps<Props>();

    const emit = defineEmits<{
        seleccionar: [carpetaId: number];
        'menu-contextual': [event: MouseEvent, carpeta: Carpeta];
    }>();

    // Métodos
    const seleccionar = () => {
        emit('seleccionar', props.carpeta.id);
    };
</script>

<style scoped>
    /* Animaciones personalizadas */
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(-4px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .select-none {
        animation: fadeIn 0.2s ease-out;
    }
</style>
