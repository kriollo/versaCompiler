<script setup lang="ts">
    import { computed } from 'vue';

    interface Props {
        zoom: number;
        isZenMode?: boolean;
        isPanMode?: boolean;
        isSelectionMode?: boolean;
    }

    const props = withDefaults(defineProps<Props>(), {
        isZenMode: false,
        isPanMode: false,
        isSelectionMode: false,
    });

    const emit = defineEmits<{
        zoomIn: [];
        zoomOut: [];
        resetZoom: [];
        toggleZenMode: [];
        togglePanMode: [];
        toggleSelectionMode: [];
        centerView: [];
    }>();

    const zoomPercentage = computed(() => Math.round(props.zoom * 100));

    const handleZoomIn = () => {
        emit('zoomIn');
    };

    const handleZoomOut = () => {
        emit('zoomOut');
    };

    const handleResetZoom = () => {
        emit('resetZoom');
    };

    const handleToggleZenMode = () => {
        emit('toggleZenMode');
    };

    const handleTogglePanMode = () => {
        emit('togglePanMode');
    };

    const handleCenterView = () => {
        emit('centerView');
    };

    const handleToggleSelectionMode = () => {
        emit('toggleSelectionMode');
    };
</script>

<template>
    <!-- Controles de Zoom Mejorados -->
    <div
        class="absolute flex align-items-center items-center gap-1 rounded-xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 top-6 right-6 flex-row z-30">
        <!-- Botón Acercar -->
        <button
            @click="handleZoomIn"
            :disabled="zoom >= 2"
            class="px-1 py-1 hover:bg-brand-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed group rounded-l-lg"
            title="Acercar (Ctrl + Scroll)">
            <svg
                class="w-6 h-6 group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path>
            </svg>
        </button>

        <!-- Separador -->
        <div
            :class="
                isZenMode ? 'w-px h-full bg-gray-200 dark:bg-gray-700' : 'h-px w-full bg-gray-200 dark:bg-gray-700'
            "></div>

        <!-- Display de Zoom -->
        <button
            @click="handleResetZoom"
            class="px-1 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Restablecer (Click para resetear)">
            <div class="text-center">
                <div class="text-sm font-bold text-gray-900 dark:text-white">{{ zoomPercentage }}%</div>
            </div>
        </button>

        <!-- Separador -->
        <div
            :class="
                isZenMode ? 'w-px h-full bg-gray-200 dark:bg-gray-700' : 'h-px w-full bg-gray-200 dark:bg-gray-700'
            "></div>

        <!-- Botón Alejar -->
        <button
            @click="handleZoomOut"
            :disabled="zoom <= 0.1"
            class="px-1 py-1 hover:bg-brand-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            title="Alejar (Ctrl + Scroll)">
            <svg
                class="w-6 h-6 group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M20 12H4"></path>
            </svg>
        </button>

        <!-- Separador -->
        <div
            :class="
                isZenMode ? 'w-px h-full bg-gray-200 dark:bg-gray-700' : 'h-px w-full bg-gray-200 dark:bg-gray-700'
            "></div>

        <!-- Botón Centrar Vista -->
        <button
            @click="handleCenterView"
            class="px-1 py-1 hover:bg-brand-50 dark:hover:bg-brand-900/30 text-gray-700 dark:text-gray-300 transition-all group"
            title="Centrar Vista - Volver al Inicio">
            <svg
                class="w-6 h-6 group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path>
            </svg>
        </button>

        <!-- Separador -->
        <div
            :class="
                isZenMode ? 'w-px h-full bg-gray-200 dark:bg-gray-700' : 'h-px w-full bg-gray-200 dark:bg-gray-700'
            "></div>

        <!-- Botón Modo Zen -->
        <button
            @click="handleToggleZenMode"
            class="px-1 py-1 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-gray-700 dark:text-gray-300 transition-all group"
            :class="{ 'bg-purple-100 dark:bg-purple-900/50': isZenMode }"
            :title="isZenMode ? 'Salir de Modo Zen (ESC)' : 'Modo Zen - Pantalla Completa'">
            <svg
                v-if="!isZenMode"
                class="w-6 h-6 group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
            </svg>
            <svg
                v-else
                class="w-6 h-6 group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>

        <!-- Separador -->
        <div
            :class="
                isZenMode ? 'w-px h-full bg-gray-200 dark:bg-gray-700' : 'h-px w-full bg-gray-200 dark:bg-gray-700'
            "></div>

        <!-- Botón Modo Mano -->
        <button
            @click="handleTogglePanMode"
            class="px-1 py-1 hover:bg-green-50 dark:hover:bg-green-900/30 text-gray-700 dark:text-gray-300 transition-all group"
            :class="{ 'bg-green-100 dark:bg-green-900/50': isPanMode }"
            :title="isPanMode ? 'Desactivar Modo Mano' : 'Modo Mano - Mover Canvas Libremente'">
            <svg
                class="w-6 h-6 group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"></path>
            </svg>
        </button>

        <!-- Separador -->
        <div
            :class="
                isZenMode ? 'w-px h-full bg-gray-200 dark:bg-gray-700' : 'h-px w-full bg-gray-200 dark:bg-gray-700'
            "></div>

        <!-- Botón Modo Selección Múltiple -->
        <button
            @click="handleToggleSelectionMode"
            class="px-1 py-1 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-gray-700 dark:text-gray-300 transition-all group"
            :class="{ 'bg-purple-100 dark:bg-purple-900/50': isSelectionMode }"
            :title="
                isSelectionMode
                    ? 'Desactivar Selección Múltiple'
                    : 'Modo Selección Múltiple - Seleccionar y Mover Varios Nodos'
            ">
            <svg
                v-if="!isSelectionMode"
                class="w-6 h-6 group-hover:scale-110 transition-transform"
                fill="currentColor"
                stroke="currentColor"
                viewBox="0 0 256 256"
                id="Flat"
                xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M148,48a7.99977,7.99977,0,0,1-8,8H116a8,8,0,0,1,0-16h24A7.99977,7.99977,0,0,1,148,48Zm-8,152H116a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16ZM180,56h20V76a8,8,0,0,0,16,0V56a16.01833,16.01833,0,0,0-16-16H180a8,8,0,0,0,0,16Zm28,51.99951a7.99977,7.99977,0,0,0-8,8v24a8,8,0,0,0,16,0v-24A7.99977,7.99977,0,0,0,208,107.99951Zm-160,40a7.99977,7.99977,0,0,0,8-8v-24a8,8,0,1,0-16,0v24A7.99977,7.99977,0,0,0,48,147.99951ZM76,200H56V180a8,8,0,0,0-16,0v20a16.01833,16.01833,0,0,0,16,16H76a8,8,0,0,0,0-16ZM76,40H56A16.01833,16.01833,0,0,0,40,56V76a8,8,0,0,0,16,0V56H76a8,8,0,0,0,0-16ZM236,200H216V180a8,8,0,0,0-16,0v20H180a8,8,0,0,0,0,16h20v20a8,8,0,0,0,16,0V216h20a8,8,0,0,0,0-16Z" />
            </svg>
            <svg
                v-else
                class="w-6 h-6 group-hover:scale-110 transition-transform"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                xml:space="preserve">
                <g id="cusror">
                    <g>
                        <path
                            d="M11,24l-2.4-5.8l-4.6,4V0l16,15.1l-6.2,0.8l2.4,5.9L11,24z M9.4,15.1l2.7,6.4l1.7-0.8L11,14.4l4.7-0.6L5.8,4.4v13.8 L9.4,15.1z" />
                    </g>
                </g>
            </svg>
        </button>
    </div>
</template>
