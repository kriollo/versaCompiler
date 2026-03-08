<docs lang="JSDoc">
/**
 * @preserve
 * Selector visual de días de la semana mediante botones toggle.
 *
 * Props:
 * @property {number[]} modelValue - Array de números de días activos (1=Lun...7=Dom)
 * @property {boolean} [disabled=false]
 * @property {string} [label]
 *
 * Emits:
 * @event update:modelValue - Emite el array actualizado de días
 */
</docs>

<script setup lang="ts">
    import { computed } from 'vue';

    interface Props {
        modelValue: number[];
        disabled?: boolean;
        label?: string;
    }

    const props = withDefaults(defineProps<Props>(), {
        disabled: false,
        label: '',
    });

    const emit = defineEmits<{ 'update:modelValue': [value: number[]] }>();

    const DAYS = [
        { num: 1, label: 'L', full: 'Lunes' },
        { num: 2, label: 'M', full: 'Martes' },
        { num: 3, label: 'X', full: 'Miércoles' },
        { num: 4, label: 'J', full: 'Jueves' },
        { num: 5, label: 'V', full: 'Viernes' },
        { num: 6, label: 'S', full: 'Sábado' },
        { num: 7, label: 'D', full: 'Domingo' },
    ] as const;

    const isActive = (dayNum: number) => (props.modelValue ?? []).includes(dayNum);

    const toggle = (dayNum: number) => {
        if (props.disabled) {
            return;
        }
        const current = [...(props.modelValue ?? [])];
        const idx = current.indexOf(dayNum);
        if (idx === -1) {
            current.push(dayNum);
            current.sort((a, b) => a - b);
        } else {
            current.splice(idx, 1);
        }
        emit('update:modelValue', current);
    };

    const activeCount = computed(() => (props.modelValue ?? []).length);
</script>

<template>
    <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
            <label v-if="label" class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {{ label }}
            </label>
            <span class="text-xs text-gray-400">{{ activeCount }} día{{ activeCount !== 1 ? 's' : '' }}</span>
        </div>
        <div class="flex gap-1.5">
            <button
                v-for="day in DAYS"
                :key="day.num"
                type="button"
                :title="day.full"
                :disabled="disabled"
                @click="toggle(day.num)"
                class="w-9 h-9 rounded-lg text-xs font-bold transition-all duration-200 select-none"
                :class="
                    isActive(day.num)
                        ? 'bg-brand text-black shadow-sm shadow-brand/30 scale-105'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                ">
                {{ day.label }}
            </button>
        </div>
    </div>
</template>
