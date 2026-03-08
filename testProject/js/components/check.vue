<docs lang="JSDoc">
/**
 * @preserve
    * This Vue component is a checkbox that can be checked or unchecked.
    *
    * Props:
    * @property {string} id - (required): The ID of the checkbox.
    * @property {string} [label=''] - (optional): The label of the checkbox.
    * @property {('success'|'danger'|'warning'|'info')} [type='success'] - (optional): The type of the checkbox.
    * @property {boolean} [disabled=false] - (optional): Determines whether the checkbox is disabled.
    *
    * Emits:
    * @event {Boolean} v-model - Emits a boolean value to determine whether the checkbox is checked or unchecked.
 */
</docs>

<script setup lang="ts">
    import { computed, toRefs } from 'vue';

    interface Props {
        id: string | number;
        label?: string;
        type?: 'success' | 'danger' | 'warning' | 'info' | 'primary';
        disabled?: boolean;
    }

    const props = withDefaults(defineProps<Props>(), {
        label: '',
        type: 'success',
        disabled: false,
    });

    const { id, label, type, disabled } = toRefs(props);

    enum CheckTypes {
        success = 'text-green-600 dark:text-green-400 focus:ring-green-500 dark:focus:ring-green-500',
        danger = 'text-red-600 dark:text-red-400 focus:ring-red-500 dark:focus:ring-red-500',
        warning = 'text-yellow-600 dark:text-yellow-400 focus:ring-yellow-500 dark:focus:ring-yellow-500',
        info = 'text-gray-600 dark:text-gray-400 focus:ring-gray-500 dark:focus:ring-gray-500',
        primary = 'text-brand dark:text-brand-400 focus:ring-brand dark:focus:ring-brand',
    }

    const estado = defineModel('modelValue', {
        type: Boolean,
        required: true,
    });
    const checkType = computed(() => {
        const selected = type.value || 'success';
        return CheckTypes[selected as keyof typeof CheckTypes];
    });
</script>
<template>
    <div class="flex gap-2">
        <input :id="id" type="checkbox" class="h-5 w-5" :class="checkType" v-model="estado" :disabled="disabled" />
        <label class="block text-sm font-medium text-gray-900 dark:text-white" :for="id">
            {{ label }}
        </label>
    </div>
</template>
