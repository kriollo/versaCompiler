<script setup lang="ts">
/**
 * ContactModal.vue — Modal con Teleport + Transition + named slots
 * Prueba: <Teleport>, <Transition>, v-model open/close, named slots
 */
interface Props {
    title: string;
}

defineProps<Props>();

const isOpen = defineModel<boolean>({ default: false });

function close() {
    isOpen.value = false;
}
</script>

<template>
    <Teleport to="#modal-target">
        <Transition name="modal-fade">
            <div
                v-if="isOpen"
                data-modal="true"
                class="fixed inset-0 z-50 flex items-center justify-center p-4"
                @click.self="close">
                <!-- Backdrop -->
                <div class="absolute inset-0 bg-black/50" @click="close" />

                <!-- Panel -->
                <div
                    class="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
                    @click.stop>
                    <!-- Header — named slot -->
                    <div class="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700">
                        <slot name="header">
                            <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                {{ title }}
                            </h2>
                        </slot>
                        <button
                            @click="close"
                            aria-label="Cerrar modal"
                            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">
                            ✕
                        </button>
                    </div>

                    <!-- Body — named slot -->
                    <div class="flex-1 overflow-y-auto px-5 py-4">
                        <slot name="body" />
                    </div>

                    <!-- Footer — named slot -->
                    <div
                        class="flex justify-end gap-2 px-5 py-4 border-t dark:border-gray-700">
                        <slot name="footer">
                            <button
                                @click="close"
                                class="px-4 py-2 text-sm rounded-lg border dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                                Cancelar
                            </button>
                        </slot>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}
</style>
