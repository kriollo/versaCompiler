<script setup lang="ts">
    import { computed, toRefs } from 'vue';

    interface Props {
        id: string;
        label?: string;
        options: { id: string; name: string; value: string }[];
        direction?: string;
        type?: 'success' | 'danger' | 'warning' | 'info' | 'primary';
        disabled?: boolean;
    }

    const props = withDefaults(defineProps<Props>(), {
        label: '',
        id: 'radio',
        direction: 'row',
        type: 'success',
        disabled: false,
    });

    const { id, label, direction, type, disabled } = toRefs(props);

    interface Option {
        id: string;
        name: string;
        value: string;
    }

    enum Optiontypes {
        success = 'text-green-600 dark:text-green-400 focus:ring-green-500 dark:focus:ring-green-500',
        danger = 'text-red-600 dark:text-red-400 focus:ring-red-500 dark:focus:ring-red-500',
        warning = 'text-yellow-600 dark:text-yellow-400 focus:ring-yellow-500 dark:focus:ring-yellow-500',
        info = 'text-brand dark:text-brand-400 focus:ring-brand dark:focus:ring-brand',
    }

    const options = computed(() => props.options) as unknown as Option[];
    const value = defineModel();

    const typeOption = computed(() => {
        const selected = type.value || 'success';
        return Optiontypes[selected as keyof typeof Optiontypes];
    });
</script>
<template>
    <div class="flex flex-col">
        <label class="block text-sm font-medium text-gray-700 dark:text-white" :for="id + '_' + options[0]?.id">
            {{ label }}
        </label>
        <div class="gap-2" :class="direction === 'row' ? 'flex' : 'flex flex-col'">
            <div v-for="(option, index) in options" :key="index + '_radio'" class="flex gap-2">
                <input
                    :id="id + '_' + option.id"
                    v-model="value"
                    :name="id"
                    type="radio"
                    class="h-5 w-5"
                    :class="typeOption"
                    :value="option?.value"
                    :disabled="disabled" />
                <label class="block text-sm font-medium text-gray-900 dark:text-white" :for="id + '_' + option?.id">
                    {{ option?.name }}
                </label>
            </div>
        </div>
    </div>
</template>
