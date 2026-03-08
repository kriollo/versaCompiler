<script setup lang="ts">
    import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

    interface Props {
        open?: boolean;
        title: string;
        storageKey?: string;
        defaultWidth?: number;
        defaultHeight?: number;
        minWidth?: number;
        minHeight?: number;
    }

    const props = withDefaults(defineProps<Props>(), {
        open: false,
        storageKey: '',
        defaultWidth: 600,
        defaultHeight: 400,
        minWidth: 300,
        minHeight: 200,
    });

    const emit = defineEmits<{
        'update:open': [value: boolean];
        close: [];
        resize: [{ width: number; height: number }];
    }>();

    const dialogRef = ref<HTMLDialogElement | null>(null);

    const MIN_WIDTH = computed(() => props.minWidth);
    const MIN_HEIGHT = computed(() => props.minHeight);
    const MAX_WIDTH = computed(() => window.innerWidth - 50);
    const MAX_HEIGHT = computed(() => window.innerHeight - 50);

    const getStorageKey = () => (props.storageKey ? `resizable-dialog-${props.storageKey}` : '');

    const loadStoredSize = (): { width: number; height: number } | null => {
        if (!props.storageKey) {
            return null;
        }
        try {
            const stored = localStorage.getItem(getStorageKey());
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.width && parsed.height) {
                    return {
                        width: Math.max(MIN_WIDTH.value, Math.min(MAX_WIDTH.value, parsed.width)),
                        height: Math.max(MIN_HEIGHT.value, Math.min(MAX_HEIGHT.value, parsed.height)),
                    };
                }
            }
        } catch {
            // Ignore parse errors
        }
        return null;
    };

    const saveStoredSize = (width: number, height: number) => {
        if (!props.storageKey) {
            return;
        }
        try {
            localStorage.setItem(getStorageKey(), JSON.stringify({ width, height }));
        } catch {
            // Ignore storage errors
        }
    };

    const storedSize = loadStoredSize();
    const dialogWidth = ref(storedSize?.width || props.defaultWidth);
    const dialogHeight = ref(storedSize?.height || props.defaultHeight);

    const isDragging = ref(false);
    const isResizing = ref(false);
    const resizeCorner = ref('');
    const dragStartX = ref(0);
    const dragStartY = ref(0);
    const initialWidth = ref(0);
    const initialHeight = ref(0);

    const dialogStyle = computed(() => ({
        '--dialog-width': `${dialogWidth.value}px`,
        '--dialog-height': `${dialogHeight.value}px`,
    }));

    const dimensionsLabel = computed(() => `${Math.round(dialogWidth.value)} × ${Math.round(dialogHeight.value)} px`);

    const openDialog = () => {
        if (dialogRef.value && !dialogRef.value.open) {
            dialogRef.value.showModal();
        }
    };

    const closeDialog = () => {
        if (dialogRef.value?.open) {
            dialogRef.value.close();
        }
        emit('update:open', false);
        emit('close');
    };

    const resetSize = () => {
        dialogWidth.value = props.defaultWidth;
        dialogHeight.value = props.defaultHeight;
        saveStoredSize(dialogWidth.value, dialogHeight.value);
    };

    const startDrag = (e: MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) {
            return;
        }
        isDragging.value = true;
        dragStartX.value = e.clientX;
        dragStartY.value = e.clientY;
        document.body.style.cursor = 'grabbing';
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
    };

    const onDrag = () => {
        // Dialog HTML element is always centered in top-layer
    };

    const stopDrag = () => {
        isDragging.value = false;
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
    };

    const startResize = (e: MouseEvent, corner: string) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing.value = true;
        resizeCorner.value = corner;
        dragStartX.value = e.clientX;
        dragStartY.value = e.clientY;
        initialWidth.value = dialogWidth.value;
        initialHeight.value = dialogHeight.value;
        document.addEventListener('mousemove', onResize);
        document.addEventListener('mouseup', stopResize);
    };

    const onResize = (e: MouseEvent) => {
        if (!isResizing.value) {
            return;
        }

        const deltaX = e.clientX - dragStartX.value;
        const deltaY = e.clientY - dragStartY.value;

        let newWidth = initialWidth.value;
        let newHeight = initialHeight.value;

        if (resizeCorner.value.includes('e')) {
            newWidth = Math.max(MIN_WIDTH.value, Math.min(MAX_WIDTH.value, initialWidth.value + deltaX));
        }
        if (resizeCorner.value.includes('w')) {
            newWidth = Math.max(MIN_WIDTH.value, Math.min(MAX_WIDTH.value, initialWidth.value - deltaX));
        }
        if (resizeCorner.value.includes('s')) {
            newHeight = Math.max(MIN_HEIGHT.value, Math.min(MAX_HEIGHT.value, initialHeight.value + deltaY));
        }
        if (resizeCorner.value.includes('n')) {
            newHeight = Math.max(MIN_HEIGHT.value, Math.min(MAX_HEIGHT.value, initialHeight.value - deltaY));
        }

        dialogWidth.value = newWidth;
        dialogHeight.value = newHeight;
    };

    const stopResize = () => {
        if (isResizing.value) {
            saveStoredSize(dialogWidth.value, dialogHeight.value);
            emit('resize', { width: dialogWidth.value, height: dialogHeight.value });
        }
        isResizing.value = false;
        resizeCorner.value = '';
        document.removeEventListener('mousemove', onResize);
        document.removeEventListener('mouseup', stopResize);
    };

    watch(
        () => props.open,
        newVal => {
            if (newVal) {
                openDialog();
            } else {
                closeDialog();
            }
        },
    );

    onMounted(() => {
        if (props.open) {
            openDialog();
        }
    });

    onUnmounted(() => {
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('mousemove', onResize);
        document.removeEventListener('mouseup', stopResize);
    });
</script>

<template>
    <Teleport to="body">
        <div v-if="open" class="dialog-overlay" @click.self="closeDialog">
            <div
                class="dialog-container"
                :class="{ 'is-resizing': isResizing, 'is-dragging': isDragging }"
                :style="dialogStyle">
                <header class="dialog-header" @mousedown="startDrag">
                    <div class="header-left">
                        <svg class="header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                        <span class="header-title">{{ title }}</span>
                    </div>
                    <div class="header-actions">
                        <button type="button" class="btn-icon" @click="resetSize" title="Restaurar tamaño">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                        </button>
                        <button type="button" class="btn-icon btn-close" @click="closeDialog" title="Cerrar (Esc)">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </header>

                <main class="dialog-body">
                    <slot />
                </main>

                <footer class="dialog-footer">
                    <span class="size-indicator">{{ dimensionsLabel }}</span>
                </footer>

                <!-- Resize handles -->
                <div class="resize-handle h-nw" @mousedown="e => startResize(e, 'nw')"></div>
                <div class="resize-handle h-ne" @mousedown="e => startResize(e, 'ne')"></div>
                <div class="resize-handle h-sw" @mousedown="e => startResize(e, 'sw')"></div>
                <div class="resize-handle h-se" @mousedown="e => startResize(e, 'se')"></div>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
    .dialog-overlay {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
    }

    .dialog-container {
        display: flex;
        flex-direction: column;
        width: var(--dialog-width, 600px);
        height: var(--dialog-height, 400px);
        max-width: calc(100vw - 50px);
        max-height: calc(100vh - 50px);
        background: #ffffff;
        border-radius: 12px;
        box-shadow:
            0 0 0 1px rgba(0, 0, 0, 0.05),
            0 20px 50px -10px rgba(0, 0, 0, 0.4);
        overflow: hidden;
        position: relative;
    }

    :root.dark .dialog-container,
    .dark .dialog-container {
        background: #1f2937;
        box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.05),
            0 20px 50px -10px rgba(0, 0, 0, 0.6);
    }

    .is-resizing,
    .is-dragging {
        user-select: none;
    }

    /* Header */
    .dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
        height: 48px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        cursor: grab;
        flex-shrink: 0;
    }

    :root.dark .dialog-header,
    .dark .dialog-header {
        background: #111827;
        border-bottom-color: #374151;
    }

    .dialog-header:active {
        cursor: grabbing;
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .header-icon {
        width: 18px;
        height: 18px;
        color: #94a3b8;
    }

    .header-title {
        font-size: 14px;
        font-weight: 600;
        color: #1e293b;
    }

    :root.dark .header-title,
    .dark .header-title {
        color: #f1f5f9;
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .btn-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        padding: 0;
        border: none;
        background: transparent;
        border-radius: 6px;
        cursor: pointer;
        color: #64748b;
        transition: all 0.15s ease;
    }

    .btn-icon:hover {
        background: #e2e8f0;
        color: #334155;
    }

    :root.dark .btn-icon:hover,
    .dark .btn-icon:hover {
        background: #374151;
        color: #e2e8f0;
    }

    .btn-icon svg {
        width: 18px;
        height: 18px;
    }

    .btn-close:hover {
        background: #ef4444 !important;
        color: #ffffff !important;
    }

    /* Body */
    .dialog-body {
        flex: 1;
        overflow: auto;
        padding: 16px;
        background: #ffffff;
    }

    :root.dark .dialog-body,
    .dark .dialog-body {
        background: #1f2937;
    }

    /* Footer */
    .dialog-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding: 8px 16px;
        height: 32px;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        flex-shrink: 0;
    }

    :root.dark .dialog-footer,
    .dark .dialog-footer {
        background: #111827;
        border-top-color: #374151;
    }

    .size-indicator {
        font-size: 11px;
        color: #94a3b8;
        font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
        letter-spacing: 0.02em;
    }

    /* Resize Handles */
    .resize-handle {
        position: absolute;
        width: 16px;
        height: 16px;
        z-index: 10;
    }

    .resize-handle::after {
        content: '';
        position: absolute;
        width: 6px;
        height: 6px;
        border: 1.5px solid #94a3b8;
        opacity: 0;
        transition: opacity 0.15s ease;
    }

    .dialog-container:hover .resize-handle::after {
        opacity: 0.6;
    }

    .resize-handle:hover::after {
        opacity: 1;
        border-color: #3b82f6;
    }

    .h-nw {
        top: 0;
        left: 0;
        cursor: nwse-resize;
    }
    .h-nw::after {
        top: 4px;
        left: 4px;
        border-right: none;
        border-bottom: none;
    }

    .h-ne {
        top: 0;
        right: 0;
        cursor: nesw-resize;
    }
    .h-ne::after {
        top: 4px;
        right: 4px;
        border-left: none;
        border-bottom: none;
    }

    .h-sw {
        bottom: 0;
        left: 0;
        cursor: nesw-resize;
    }
    .h-sw::after {
        bottom: 4px;
        left: 4px;
        border-right: none;
        border-top: none;
    }

    .h-se {
        bottom: 0;
        right: 0;
        cursor: nwse-resize;
    }
    .h-se::after {
        bottom: 4px;
        right: 4px;
        border-left: none;
        border-top: none;
    }
</style>
