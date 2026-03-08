<docs lang="JSDoc">
/**
 * @preserve
 * This Vue component is a modal dialog that can be shown or hidden based on the `showModal` prop.
 *
 * Props:
 * @property {string} idModal - (required): The ID of the modal.
 * @property {boolean} showModal - (required): Determines whether the modal is visible.
 * @property {('max-w-md'|'max-w-lg'|'max-w-2xl'|'max-w-4xl'|'max-w-7xl')} [size='max-w-md'] - (optional): The size of the modal.
 * @property {boolean} [drag=false] - (optional): Enables dragging functionality for the modal.
 * @property {boolean} [resizable=false] - (optional): Enables resizing functionality for the modal.
 * @property {number} [minWidth=300] - (optional): Minimum width in pixels when resizable.
 * @property {number} [minHeight=200] - (optional): Minimum height in pixels when resizable.
 *
 * Emits:
 * @event {Object} accion - Emits an object with the action to be performed.
 */
</docs>
<script setup lang="ts">
    import { computed, onMounted, onUnmounted, ref, toRefs, watch } from 'vue';

    import { GLOBAL_CONSTANTS } from '@/dashboard/js/constants';

    interface Props {
        idModal: string;
        showModal: boolean;
        size?: 'max-w-md' | 'max-w-lg' | 'max-w-2xl' | 'max-w-4xl' | 'max-w-7xl' | string;
        showFooter?: boolean;
        blurBackground?: boolean;
        drag?: boolean;
        resizable?: boolean;
        minWidth?: number;
        minHeight?: number;
    }

    const props = withDefaults(defineProps<Props>(), {
        showModal: true,
        size: 'max-w-md',
        showFooter: true,
        blurBackground: true,
        drag: false,
        resizable: false,
        minWidth: 300,
        minHeight: 200,
    });

    const emit = defineEmits(['accion']);
    const componentKey = ref(GLOBAL_CONSTANTS.ZERO);

    const showFooter = computed(() => props.showFooter);

    const { blurBackground, showModal, idModal, size, drag, resizable, minWidth, minHeight } = toRefs(props);

    const dragEnabled = computed(() => Boolean(drag.value));
    const resizableEnabled = computed(() => Boolean(resizable.value));
    const minWidthValue = computed(() => minWidth.value ?? 300);
    const minHeightValue = computed(() => minHeight.value ?? 200);

    const modal = ref(undefined);
    const modalContent = ref<HTMLElement | null>(null);
    const modalHeader = ref<HTMLElement | null>(null);
    const resizeHandle = ref<HTMLElement | null>(null);

    // Variables para el drag
    const isDragging = ref(false);
    const currentX = ref(0);
    const currentY = ref(0);
    const initialX = ref(0);
    const initialY = ref(0);
    const xOffset = ref(0);
    const yOffset = ref(0);

    // Variables para el resize
    const isResizing = ref(false);
    const modalWidth = ref<number | null>(null);
    const modalHeight = ref<number | null>(null);
    const resizeStartX = ref(0);
    const resizeStartY = ref(0);
    const resizeStartWidth = ref(0);
    const resizeStartHeight = ref(0);

    // Funciones para el drag
    const dragStart = (e: MouseEvent | TouchEvent) => {
        if (!dragEnabled.value) {
            return;
        }

        if (e.type === 'touchstart') {
            const [touch] = (e as TouchEvent).touches;
            if (touch) {
                initialX.value = touch.clientX - xOffset.value;
                initialY.value = touch.clientY - yOffset.value;
            }
        } else {
            initialX.value = (e as MouseEvent).clientX - xOffset.value;
            initialY.value = (e as MouseEvent).clientY - yOffset.value;
        }

        if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
            isDragging.value = true;
        }
    };

    const dragEnd = () => {
        if (!dragEnabled.value) {
            return;
        }

        initialX.value = currentX.value;
        initialY.value = currentY.value;
        isDragging.value = false;
    };

    const dragMove = (e: MouseEvent | TouchEvent) => {
        if (!dragEnabled.value || !isDragging.value) {
            return;
        }

        e.preventDefault();

        if (e.type === 'touchmove') {
            const [touch] = (e as TouchEvent).touches;
            if (touch) {
                currentX.value = touch.clientX - initialX.value;
                currentY.value = touch.clientY - initialY.value;
            }
        } else {
            currentX.value = (e as MouseEvent).clientX - initialX.value;
            currentY.value = (e as MouseEvent).clientY - initialY.value;
        }

        xOffset.value = currentX.value;
        yOffset.value = currentY.value;

        if (modalContent.value) {
            modalContent.value.style.transform = `translate(${currentX.value}px, ${currentY.value}px)`;
        }
    };

    // Inicializar eventos de drag
    const initDrag = () => {
        if (!dragEnabled.value || !modalHeader.value || !modalContent.value) {
            return;
        }

        modalHeader.value.addEventListener('mousedown', dragStart);
        modalHeader.value.addEventListener('touchstart', dragStart, { passive: true });
        document.addEventListener('mousemove', dragMove);
        document.addEventListener('touchmove', dragMove, { passive: false });
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchend', dragEnd);
    };

    // Limpiar eventos de drag
    const cleanupDrag = () => {
        if (modalHeader.value) {
            modalHeader.value.removeEventListener('mousedown', dragStart);
            modalHeader.value.removeEventListener('touchstart', dragStart, { passive: true } as EventListenerOptions);
        }
        document.removeEventListener('mousemove', dragMove);
        document.removeEventListener('touchmove', dragMove, { passive: false } as EventListenerOptions);
        document.removeEventListener('mouseup', dragEnd);
        document.removeEventListener('touchend', dragEnd);
    };

    // Funciones para el resize
    const resizeStart = (e: MouseEvent | TouchEvent) => {
        if (!resizableEnabled.value) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        if (e.type === 'touchstart') {
            const [touch] = (e as TouchEvent).touches;
            if (touch) {
                resizeStartX.value = touch.clientX;
                resizeStartY.value = touch.clientY;
            }
        } else {
            resizeStartX.value = (e as MouseEvent).clientX;
            resizeStartY.value = (e as MouseEvent).clientY;
        }

        if (modalContent.value) {
            const rect = modalContent.value.getBoundingClientRect();
            resizeStartWidth.value = rect.width;
            resizeStartHeight.value = rect.height;

            // Si es la primera vez que se redimensiona, establecer dimensiones actuales
            if (!modalWidth.value) {
                modalWidth.value = rect.width;
                modalHeight.value = rect.height;
                modalContent.value.style.width = `${rect.width}px`;
                modalContent.value.style.height = `${rect.height}px`;
                modalContent.value.style.maxWidth = 'none';
            }

            isResizing.value = true;
        }
    };

    const resizeMove = (e: MouseEvent | TouchEvent) => {
        if (!resizableEnabled.value || !isResizing.value || !modalContent.value) {
            return;
        }

        e.preventDefault();

        let clientX = 0;
        let clientY = 0;

        if (e.type === 'touchmove') {
            const [touch] = (e as TouchEvent).touches;
            if (touch) {
                const { clientX: touchX, clientY: touchY } = touch;
                clientX = touchX;
                clientY = touchY;
            }
        } else {
            const { clientX: mouseX, clientY: mouseY } = e as MouseEvent;
            clientX = mouseX;
            clientY = mouseY;
        }

        const deltaX = clientX - resizeStartX.value;
        const deltaY = clientY - resizeStartY.value;

        let newWidth = resizeStartWidth.value + deltaX;
        let newHeight = resizeStartHeight.value + deltaY;

        // Aplicar límites mínimos
        newWidth = Math.max(minWidthValue.value, newWidth);
        newHeight = Math.max(minHeightValue.value, newHeight);

        // Aplicar límites máximos (viewport)
        const maxWidth = window.innerWidth - 32; // 32px de padding
        const maxHeight = window.innerHeight - 32;
        newWidth = Math.min(maxWidth, newWidth);
        newHeight = Math.min(maxHeight, newHeight);

        modalWidth.value = newWidth;
        modalHeight.value = newHeight;

        modalContent.value.style.width = `${newWidth}px`;
        modalContent.value.style.height = `${newHeight}px`;
        modalContent.value.style.maxWidth = 'none';
    };

    const resizeEnd = () => {
        if (!resizableEnabled.value) {
            return;
        }

        isResizing.value = false;
    };

    // Inicializar eventos de resize
    const initResize = () => {
        if (!resizableEnabled.value || !resizeHandle.value) {
            return;
        }

        resizeHandle.value.addEventListener('mousedown', resizeStart);
        resizeHandle.value.addEventListener('touchstart', resizeStart, { passive: true });
        document.addEventListener('mousemove', resizeMove);
        document.addEventListener('touchmove', resizeMove, { passive: false });
        document.addEventListener('mouseup', resizeEnd);
        document.addEventListener('touchend', resizeEnd);
    };

    // Limpiar eventos de resize
    const cleanupResize = () => {
        if (resizeHandle.value) {
            resizeHandle.value.removeEventListener('mousedown', resizeStart);
            resizeHandle.value.removeEventListener('touchstart', resizeStart, {
                passive: true,
            } as EventListenerOptions);
        }
        document.removeEventListener('mousemove', resizeMove);
        document.removeEventListener('touchmove', resizeMove, { passive: false } as EventListenerOptions);
        document.removeEventListener('mouseup', resizeEnd);
        document.removeEventListener('touchend', resizeEnd);
    };

    // Resetear posición y tamaño cuando el modal se cierra
    watch(showModal, newVal => {
        if (!newVal) {
            // Resetear drag
            currentX.value = 0;
            currentY.value = 0;
            initialX.value = 0;
            initialY.value = 0;
            xOffset.value = 0;
            yOffset.value = 0;

            // Resetear resize
            modalWidth.value = null;
            modalHeight.value = null;

            if (modalContent.value) {
                modalContent.value.style.transform = 'translate(0px, 0px)';
                modalContent.value.style.width = '';
                modalContent.value.style.height = '';
                modalContent.value.style.maxWidth = '';
            }
        } else {
            // Reinicializar cuando se abre el modal
            setTimeout(() => {
                if (drag.value) {
                    initDrag();
                }
                if (resizable.value) {
                    initResize();
                }
            }, 100);
        }
    });

    onMounted(() => {
        if (drag.value) {
            initDrag();
        }
        if (resizable.value) {
            initResize();
        }
    });

    onUnmounted(() => {
        cleanupDrag();
        cleanupResize();
    });
</script>
<template>
    <Transition mode="in-out">
        <div
            v-if="showModal"
            class="flex overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full drop-shadow-versaWYS"
            :class="{
                'backdrop-blur': blurBackground,
            }"
            :id="idModal"
            ref="modal"
            tabindex="-1">
            <div class="relative p-4 w-full max-h-full" :class="size" ref="modalContent">
                <!-- Modal content -->
                <div class="relative bg-white rounded-lg shadow dark:bg-[#050505]">
                    <!-- Modal header -->
                    <div
                        class="p-4 md:p-3 border-b rounded-t dark:border-gray-600"
                        :class="{
                            'cursor-move select-none': drag,
                        }"
                        :data-drag-handle="drag ? 'true' : undefined"
                        ref="modalHeader">
                        <slot name="modalTitle"></slot>
                    </div>
                    <!-- Modal body -->
                    <div class="p-4 md:p-5 space-y-4">
                        <slot name="modalBody"></slot>
                    </div>
                    <!-- Modal footer -->
                    <div
                        v-if="showFooter"
                        class="flex justify-between gap-2 items-center p-4 md:p-5 border-t border-gray-200 rounded-b dark:border-gray-600">
                        <slot name="modalFooter"></slot>
                    </div>

                    <!-- Resize handle -->
                    <div
                        v-if="resizable"
                        ref="resizeHandle"
                        class="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize select-none group"
                        title="Arrastrar para redimensionar">
                        <svg
                            class="w-full h-full text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M14 12L12 14M10 10L6 14M14 8L8 14"
                                stroke="currentColor"
                                stroke-width="1.5"
                                stroke-linecap="round"
                                fill="none" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>
<style scoped>
    .v-enter-active,
    .v-leave-active {
        transition: opacity 0.3s ease;
    }

    .v-enter-from,
    .v-leave-to {
        opacity: 0;
    }
</style>
