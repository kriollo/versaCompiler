<script setup>
    import { computed } from 'vue';

    const props = defineProps({
        id: {
            type: String,
            default: 'estado',
        },
        label: {
            type: String,
            default: '',
        },
        type: {
            type: String,
            default: 'success',
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    });
    const estado = defineModel();
    const type = computed(() => types[props.type]);
    const active = computed(() => actives[props.type]);
    const id = computed(() => props.id);
    const label = computed(() => props.label);
    const disabled = computed(() => props.disabled);

    const types = {
        success: 'bg-green-650 focus:ring-green-400 hover:bg-green-700',
        danger: 'bg-red-500 focus:ring-red-400 hover:bg-red-700',
        warning: 'bg-yellow-500 focus:ring-yellow-400 hover:bg-yellow-700',
        primary: 'bg-brand focus:ring-brand/40 hover:bg-brand-600',
        info: 'bg-gray-500 focus:ring-gray-400 hover:bg-gray-600',
    };
    const actives = {
        success: 'bg-green-700 hover:bg-green-700',
        danger: 'bg-red-700 hover:bg-red-700',
        warning: 'bg-yellow-700 hover:bg-yellow-700',
        primary: 'bg-brand-600 hover:bg-brand-600',
        info: 'bg-gray-800 hover:bg-gray-600',
    };
</script>
<template>
    <button
        class="inline-flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 w-[140px]"
        :class="estado ? active : type"
        @click="estado = !estado">
        {{ label }}
    </button>
</template>
