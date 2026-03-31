<script setup lang="ts">
/**
 * FormField.vue — Input genérico con v-model passthrough y slot de error
 * Prueba: v-model en componente custom, slot con datos, conditional rendering
 */
interface Props {
    label: string;
    name: string;
    type?: 'text' | 'email' | 'tel' | 'textarea' | 'select';
    placeholder?: string;
    error?: string;
    options?: { value: string; label: string }[];
    required?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    type: 'text',
    placeholder: '',
    required: false,
});

const model = defineModel<string>({ default: '' });
</script>

<template>
    <div class="flex flex-col gap-1">
        <label :for="name" class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ label }}
            <span v-if="required" class="text-red-500 ml-0.5">*</span>
        </label>

        <textarea
            v-if="type === 'textarea'"
            :id="name"
            v-model="model"
            :name="name"
            :placeholder="placeholder"
            rows="3"
            class="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:border-gray-600 resize-none"
            :class="{ 'border-red-400': error }" />

        <select
            v-else-if="type === 'select'"
            :id="name"
            v-model="model"
            :name="name"
            class="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:border-gray-600"
            :class="{ 'border-red-400': error }">
            <option value="" disabled>Seleccionar...</option>
            <option
                v-for="opt in options"
                :key="opt.value"
                :value="opt.value">
                {{ opt.label }}
            </option>
        </select>

        <input
            v-else
            :id="name"
            v-model="model"
            :name="name"
            :type="type"
            :placeholder="placeholder"
            class="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:border-gray-600"
            :class="{ 'border-red-400': error }" />

        <!-- Slot de error — permite personalizar el mensaje -->
        <slot name="error" :error="error">
            <p v-if="error" class="text-xs text-red-500 mt-0.5" :data-field-error="name">
                {{ error }}
            </p>
        </slot>
    </div>
</template>
