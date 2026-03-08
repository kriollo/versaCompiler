<docs lang="JSDoc">
/**
 * @preserve
 * Componente de entrada de hora (HH:MM) con selects de hora y minuto.
 *
 * Props:
 * @property {string} modelValue - Hora en formato "HH:MM"
 * @property {number} [step=30]  - Paso en minutos para las opciones de minutos
 * @property {string} [min]      - Hora mínima en formato "HH:MM"
 * @property {string} [max]      - Hora máxima en formato "HH:MM"
 * @property {boolean} [disabled=false]
 * @property {string} [label]
 *
 * Emits:
 * @event update:modelValue - Emite el nuevo valor "HH:MM"
 */
</docs>

<script setup lang="ts">
    import { computed } from 'vue';

    interface Props {
        modelValue: string;
        step?: number;
        min?: string;
        max?: string;
        disabled?: boolean;
        label?: string;
    }

    const props = withDefaults(defineProps<Props>(), {
        step: 30,
        min: '00:00',
        max: '23:59',
        disabled: false,
        label: '',
    });

    const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

    const hours = computed(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')));

    const minutes = computed(() => {
        const mins: string[] = [];
        for (let m = 0; m < 60; m += props.step) {
            mins.push(String(m).padStart(2, '0'));
        }
        return mins;
    });

    const currentHour = computed(() => {
        const [h] = (props.modelValue || '00:00').split(':');
        return h?.padStart(2, '0') ?? '00';
    });

    const currentMinute = computed(() => {
        const [, m] = (props.modelValue || '00:00').split(':');
        return m?.padStart(2, '0') ?? '00';
    });

    const onHourChange = (h: string) => {
        const m = currentMinute.value;
        const newValue = `${h}:${m}`;
        if (isInRange(newValue)) {
            emit('update:modelValue', newValue);
        }
    };

    const onMinuteChange = (m: string) => {
        const h = currentHour.value;
        const newValue = `${h}:${m}`;
        if (isInRange(newValue)) {
            emit('update:modelValue', newValue);
        }
    };

    const isInRange = (val: string): boolean => {
        if (!props.min && !props.max) {
            return true;
        }
        const [h = 0, m = 0] = val.split(':').map(Number);
        const totalMin = h * 60 + m;
        const [minH = 0, minM = 0] = (props.min || '00:00').split(':').map(Number);
        const [maxH = 23, maxM = 59] = (props.max || '23:59').split(':').map(Number);
        return totalMin >= minH * 60 + minM && totalMin <= maxH * 60 + maxM;
    };

    const isMinuteAvailable = (h: string, m: string): boolean => isInRange(`${h}:${m}`);
</script>

<template>
    <div class="flex flex-col gap-1">
        <label v-if="label" class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {{ label }}
        </label>
        <div
            class="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-brand focus-within:border-brand transition-all"
            :class="{ 'opacity-50 pointer-events-none': disabled }">
            <i class="bi bi-clock text-brand text-sm"></i>
            <select
                :value="currentHour"
                @change="onHourChange(($event.target as HTMLSelectElement).value)"
                class="bg-transparent text-sm font-mono font-bold text-gray-900 dark:text-white outline-none cursor-pointer"
                :disabled="disabled">
                <option v-for="h in hours" :key="h" :value="h">{{ h }}</option>
            </select>
            <span class="font-bold text-gray-400">:</span>
            <select
                :value="currentMinute"
                @change="onMinuteChange(($event.target as HTMLSelectElement).value)"
                class="bg-transparent text-sm font-mono font-bold text-gray-900 dark:text-white outline-none cursor-pointer"
                :disabled="disabled">
                <option v-for="m in minutes" :key="m" :value="m" :disabled="!isMinuteAvailable(currentHour, m)">
                    {{ m }}
                </option>
            </select>
        </div>
    </div>
</template>
