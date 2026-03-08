<script setup lang="ts">
    import { computed, onUnmounted, ref, watch } from 'vue';

    import ResizableDialog from './ResizableDialog.vue';

    interface Props {
        modelValue?: string;
        label?: string;
        placeholder?: string;
        rows?: number;
        modalTitle?: string;
        monospace?: boolean;
        id?: string;
    }

    const props = withDefaults(defineProps<Props>(), {
        modelValue: '',
        label: '',
        placeholder: '',
        rows: 4,
        modalTitle: '',
        monospace: false,
        id: undefined,
    });

    const emit = defineEmits<{
        'update:modelValue': [val: string];
    }>();

    const localValue = computed({
        get: () => props.modelValue ?? '',
        set: val => emit('update:modelValue', val ?? ''),
    });

    const showDialog = ref(false);

    const computedTitle = computed(() => props.modalTitle || props.label || 'Editor');

    const uniqueKey = computed(() => {
        if (props.id) {
            return `expandable-textarea-${props.id}`;
        }
        return `expandable-textarea-${Math.random().toString(36).slice(2, 9)}`;
    });

    watch(
        () => props.modelValue,
        newVal => {
            if (newVal === undefined && showDialog.value) {
                showDialog.value = false;
            }
        },
    );

    onUnmounted(() => {
        showDialog.value = false;
    });
</script>

<template>
    <div class="expandable-textarea-wrapper">
        <div v-if="label" class="flex items-center justify-between mb-1">
            <label :for="id" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ label }}
            </label>
            <button type="button" @click="showDialog = true" class="expand-btn" title="Expandir editor">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
            </button>
        </div>
        <div v-else class="flex justify-end mb-1">
            <button type="button" @click="showDialog = true" class="expand-btn" title="Expandir editor">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
            </button>
        </div>

        <textarea
            :id="id"
            v-model="localValue"
            :rows="rows"
            :placeholder="placeholder"
            :class="[
                'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-brand/50 focus:border-brand outline-none',
                monospace ? 'font-mono' : 'font-sans',
            ]"></textarea>

        <ResizableDialog
            v-if="showDialog"
            v-model:open="showDialog"
            :title="computedTitle"
            :storage-key="uniqueKey"
            :default-width="800"
            :default-height="500"
            :min-width="400"
            :min-height="300">
            <textarea
                v-model="localValue"
                :placeholder="placeholder"
                class="expanded-textarea"
                :class="{ 'is-monospace': monospace }"></textarea>
        </ResizableDialog>
    </div>
</template>

<style scoped>
    .expandable-textarea-wrapper {
        width: 100%;
    }

    .expand-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px;
        color: #6b7280;
        background: transparent;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .expand-btn:hover {
        color: #3b82f6;
        background: rgba(59, 130, 246, 0.1);
    }

    .expanded-textarea {
        width: 100%;
        height: 100%;
        min-height: 200px;
        padding: 12px;
        font-size: 14px;
        line-height: 1.6;
        color: #1f2937;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        resize: none;
        outline: none;
        transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
    }

    .expanded-textarea:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        background: #ffffff;
    }

    .expanded-textarea::placeholder {
        color: #9ca3af;
    }

    .expanded-textarea.is-monospace {
        font-family: 'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', monospace;
        font-size: 13px;
        line-height: 1.5;
    }

    :root.dark .expanded-textarea,
    .dark .expanded-textarea {
        color: #f3f4f6;
        background: #111827;
        border-color: #374151;
    }

    :root.dark .expanded-textarea:focus,
    .dark .expanded-textarea:focus {
        border-color: #3b82f6;
        background: #0f172a;
    }

    :root.dark .expanded-textarea::placeholder,
    .dark .expanded-textarea::placeholder {
        color: #6b7280;
    }
</style>
