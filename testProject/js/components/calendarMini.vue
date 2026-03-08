<docs lang="JSDoc">
/**
 * @preserve
 * Calendario mensual compacto para selección de fecha.
 *
 * Props:
 * @property {string} modelValue       - Fecha seleccionada en formato "YYYY-MM-DD"
 * @property {number[]} availableDays  - Días de semana habilitados (1=Lun...7=Dom). Vacío = todos
 * @property {string[]} disabledDates  - Fechas específicas deshabilitadas "YYYY-MM-DD"
 * @property {string} [minDate]        - Fecha mínima seleccionable "YYYY-MM-DD" (default: hoy)
 * @property {Object} markedDates      - Mapa de fechas con marcas { "YYYY-MM-DD": count }
 *
 * Emits:
 * @event update:modelValue - Emite la fecha seleccionada "YYYY-MM-DD"
 */
</docs>

<script setup lang="ts">
    import { computed, ref } from 'vue';

    interface Props {
        modelValue: string;
        availableDays?: number[];
        disabledDates?: string[];
        minDate?: string;
        markedDates?: Record<string, number>;
    }

    const props = withDefaults(defineProps<Props>(), {
        availableDays: () => [],
        disabledDates: () => [],
        minDate: '',
        markedDates: () => ({}),
    });

    const emit = defineEmits<{
        'update:modelValue': [value: string];
        monthChange: [payload: { year: number; month: number }];
    }>();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const viewYear = ref(today.getFullYear());
    const viewMonth = ref(today.getMonth()); // 0-indexed

    const MONTH_NAMES = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
    ];
    const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    const prevMonth = () => {
        if (viewMonth.value === 0) {
            viewMonth.value = 11;
            viewYear.value--;
        } else {
            viewMonth.value--;
        }
        emit('monthChange', { year: viewYear.value, month: viewMonth.value });
    };

    const nextMonth = () => {
        if (viewMonth.value === 11) {
            viewMonth.value = 0;
            viewYear.value++;
        } else {
            viewMonth.value++;
        }
        emit('monthChange', { year: viewYear.value, month: viewMonth.value });
    };

    /** Construye el grid del calendario: 6 filas x 7 columnas */
    const calendarGrid = computed(() => {
        const year = viewYear.value;
        const month = viewMonth.value;

        const firstDay = new Date(year, month, 1);
        // GetDay() 0=Dom → convertir a Lun=0
        const startOffset = (firstDay.getDay() + 6) % 7;

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrev = new Date(year, month, 0).getDate();
        const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

        const cells: { date: string; day: number; currentMonth: boolean }[] = [];

        for (let i = 0; i < totalCells; i++) {
            if (i < startOffset) {
                const d = daysInPrev - startOffset + i + 1;
                const m = month === 0 ? 11 : month - 1;
                const y = month === 0 ? year - 1 : year;
                cells.push({ date: formatDate(y, m, d), day: d, currentMonth: false });
            } else if (i < startOffset + daysInMonth) {
                const d = i - startOffset + 1;
                cells.push({ date: formatDate(year, month, d), day: d, currentMonth: true });
            } else {
                const d = i - startOffset - daysInMonth + 1;
                const m = month === 11 ? 0 : month + 1;
                const y = month === 11 ? year + 1 : year;
                cells.push({ date: formatDate(y, m, d), day: d, currentMonth: false });
            }
        }

        return cells;
    });

    const formatDate = (y: number, m: number, d: number): string =>
        `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    /** Día de semana de una fecha (1=Lun...7=Dom) */
    const getDayOfWeek = (dateStr: string): number => {
        const d = new Date(`${dateStr}T00:00:00`);
        return d.getDay() === 0 ? 7 : d.getDay();
    };

    const isDisabled = (dateStr: string): boolean => {
        // Antes de hoy o antes de minDate
        const d = new Date(`${dateStr}T00:00:00`);
        const minD = props.minDate ? new Date(`${props.minDate}T00:00:00`) : today;
        if (d < minD) {
            return true;
        }

        // Fecha específica deshabilitada
        if ((props.disabledDates ?? []).includes(dateStr)) {
            return true;
        }

        // Día de semana no disponible
        if ((props.availableDays ?? []).length > 0) {
            return !(props.availableDays ?? []).includes(getDayOfWeek(dateStr));
        }

        return false;
    };

    const isSelected = (dateStr: string) => dateStr === props.modelValue;

    const isToday = (dateStr: string) => {
        const t = today;
        return dateStr === formatDate(t.getFullYear(), t.getMonth(), t.getDate());
    };

    const getMarkCount = (dateStr: string): number => (props.markedDates ?? {})[dateStr] ?? 0;

    const select = (dateStr: string, currentMonth: boolean) => {
        if (!currentMonth || isDisabled(dateStr)) {
            return;
        }
        emit('update:modelValue', dateStr);
    };
</script>

<template>
    <div class="bg-white dark:bg-[#0a0a0a] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 select-none">
        <!-- Header: nav mes -->
        <div class="flex items-center justify-between mb-4">
            <button
                type="button"
                @click="prevMonth"
                class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
                <i class="bi bi-chevron-left text-sm"></i>
            </button>
            <span class="text-sm font-bold text-gray-900 dark:text-white">
                {{ MONTH_NAMES[viewMonth] }} {{ viewYear }}
            </span>
            <button
                type="button"
                @click="nextMonth"
                class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
                <i class="bi bi-chevron-right text-sm"></i>
            </button>
        </div>

        <!-- Cabecera días -->
        <div class="grid grid-cols-7 mb-1">
            <div
                v-for="dl in DAY_LABELS"
                :key="dl"
                class="text-center text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-600 py-1">
                {{ dl }}
            </div>
        </div>

        <!-- Grid días -->
        <div class="grid grid-cols-7 gap-0.5">
            <button
                v-for="cell in calendarGrid"
                :key="cell.date"
                type="button"
                @click="select(cell.date, cell.currentMonth)"
                :disabled="!cell.currentMonth || isDisabled(cell.date)"
                class="relative h-9 w-full rounded-lg text-sm font-medium transition-all duration-150 flex flex-col items-center justify-center"
                :class="[
                    !cell.currentMonth
                        ? 'text-gray-200 dark:text-gray-800 cursor-default'
                        : isDisabled(cell.date)
                          ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
                          : isSelected(cell.date)
                            ? 'bg-brand text-black font-bold shadow-sm shadow-brand/30'
                            : isToday(cell.date)
                              ? 'border-2 border-brand text-brand font-bold hover:bg-brand/10'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer',
                ]">
                {{ cell.day }}
                <!-- Indicador de citas -->
                <span
                    v-if="cell.currentMonth && !isDisabled(cell.date) && getMarkCount(cell.date) > 0"
                    class="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                    <span
                        v-for="i in Math.min(getMarkCount(cell.date), 3)"
                        :key="i"
                        class="w-1 h-1 rounded-full"
                        :class="isSelected(cell.date) ? 'bg-black/50' : 'bg-brand'"></span>
                </span>
            </button>
        </div>
    </div>
</template>
