<script setup>
    import { computed } from 'vue';

    // Props del componente
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
    const id = computed(() => props.id);
    const label = computed(() => props.label);
    const disabled = computed(() => props.disabled);

    const types = {
        success: 'bg-green-600',
        primary: 'bg-blue-600',
        danger: 'bg-red-600',
        orange: 'bg-orange-600',
        purple: 'bg-purple-600',
    };
</script>

<template>
    <div class="flex flex-col items-center gap-2">
        <!-- Label -->
        <label
            :for="id"
            class="text-sm font-medium text-gray-900 dark:text-white">
            {{ label }}
        </label>

        <!-- Toggle Container -->
        <div
            :class="[
                'relative inline-flex items-center h-6 w-11 cursor-pointer rounded-full transition',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ]"
            :aria-disabled="disabled"
            @click="!disabled && (estado = !estado)">
            <input :id="id" type="checkbox" class="hidden" v-model="estado" />
            <!-- Fondo del switch -->
            <span
                :class="[
                    'absolute inset-0 rounded-full transition',
                    estado ? type : 'bg-gray-200 dark:bg-gray-600',
                ]"></span>

            <!-- Círculo del toggle -->
            <span
                :class="[
                    'inline-block h-4 w-4 transform rounded-full bg-white transition',
                    estado ? 'translate-x-5' : 'translate-x-1',
                ]"></span>
        </div>
    </div>
</template>
