<docs lang="JSDoc">
/**
 * @preserve
 * @typedef {Object} Props
 * @property {String} id - Id de la tabla
 * @property {String} tablaTitle - Titulo de la tabla
 * @property {String} urlData - Url de la data
 * @property {Boolean} refreshData - Refrescar data
 * @property {Number} totalRegisters - Total de registros
 * @property {String} externalFilters - Filtros externos
 * @property {String} fieldOrder - Campo de orden
 */
</docs>

<script setup lang="ts">
    import { computed, onMounted, onUnmounted, reactive, ref, toRefs, watch, watchEffect } from 'vue';

    import check from '@/dashboard/js/components/check.vue';
import dropDown from '@/dashboard/js/components/dropDown.vue';
import loader from '@/dashboard/js/components/loader.vue';
import { createXlsxFromJson } from '@/dashboard/js/composables/useXlsx';
import { API_RESPONSE_CODES, GLOBAL_CONSTANTS, PAGINATION } from '@/dashboard/js/constants';
import { sanitizeSvgContent, versaFetch, VersaToast } from '@/dashboard/js/functions';
import { formatDate } from '@/dashboard/js/utils/DateUtils';
import type { AccionData, actionsType } from '@/dashboard/types/versaTypes';

    // Tipos para las columnas de la tabla
    interface ActionButton {
        id: string;
        title: string;
        action: string;
        icon: string;
        class: string;
        condition?: string;
        condition_value?: string | number | boolean;
        type?: 'up' | 'down' | 'edit'; // Para posición o archivo
        loader?: string; // Nombre del campo que indica carga
    }

    interface TableColumn {
        field: string;
        title: string;
        type:
            | 'status'
            | 'affirmative'
            | 'datetime'
            | 'svg'
            | 'actions'
            | 'position'
            | 'file'
            | 'text'
            | 'currency'
            | 'money'
            | 'checkbox'
            | 'progress'
            | 'progressring'
            | 'link'
            | 'image'
            | 'badge'
            | 'copy'
            | 'color'
            | 'rating'
            | 'qr';
        buttons?: ActionButton[];
        visible?: boolean;
        export?: boolean; // Para exportación Excel
        config?: any; // Configuración adicional (ej. decimales)
        valueAditional?: string; // Valor adicional (ej. % o MB)
    }

    interface ColspanColumn {
        col: number;
        title: string;
        type?: string;
    }

    // Tipo para las filas de datos
    interface RowData {
        id: string | number;
        [key: string]: any;
    }

    interface Props {
        id?: string;
        tablaTitle?: string;
        urlData: string;
        refreshData?: boolean;
        totalRegisters?: number;
        externalFilters?: string;
        fieldOrder?: string;
        PerPage?: number;
        showPerPage?: boolean;
        showExportExcel?: boolean;
        showSearch?: boolean;
        itemSelected?: any;
        smallLine?: boolean;
        multipleSelected?: boolean;
        perPage?: number;
    }

    const props = withDefaults(defineProps<Props>(), {
        id: 'table',
        tablaTitle: '',
        refreshData: false,
        externalFilters: '',
        fieldOrder: 'id',
        perPage: 25,
        showPerPage: true,
        showExportExcel: true,
        showSearch: true,
        smallLine: false,
        multipleSelected: false,
    });
    const tablaTitle = computed(() => props.tablaTitle);
    const emit = defineEmits(['accion', 'update:totalRegisters']);

    const slots = defineSlots();

    const msg = ref('Cargando...');
    const url = computed(() => props.urlData);
    const refresh = computed(() => props.refreshData);
    const externalFilters = computed(() => props.externalFilters);
    const idTable = computed(() => props.id);
    const fieldOrder = computed(() => props.fieldOrder);
    const perPage = computed(() => props.perPage);

    const { showPerPage, showExportExcel, showSearch, itemSelected, smallLine, multipleSelected } = toRefs(props);

    const multipleSelectedValue = computed(() => Boolean(multipleSelected.value));
    const itemSelectedValue = computed(() => itemSelected.value ?? null);

    const loading = ref(false);
    const loadingData = ref(false);

    const showPerPages = [...PAGINATION.PER_PAGE_OPTIONS];
    const data = reactive({
        data: [] as RowData[],
        columns: [] as TableColumn[],
        colspan: [] as ColspanColumn[],
        meta: {
            total: 0,
            per_page: perPage.value,
            page: 1,
            total_pages: 0,
            filter: '',
            from: 0,
            to: 0,
            order: [`${fieldOrder.value}`, 'asc'],
        },
    });

    watch(
        () => data.meta.per_page,
        () => {
            setPerPage(data.meta.per_page);
        },
    );

    // --- Responsive Functionality ---
    const isSmallScreen = ref(false);
    const expandedRows = reactive<Record<string | number, boolean>>({});
    const tableContainer = ref<HTMLElement | null>(null);
    const maxVisibleColumns = ref(10);
    const viewMode = ref<'auto' | 'compact' | 'normal'>('normal');

    let resizeObserver: ResizeObserver | null = null;

    const checkAllValue = ref(false);

    // --- Utility Functions ---
    const formatCurrency = (value: number | string, currency: string = 'CLP') => {
        const num = typeof value === 'string' ? Number.parseFloat(value) : value;
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0,
        }).format(num || 0);
    };

    const getFileTypeIcon = (filename: string) => {
        if (!filename) {
            return 'bi-file-earmark';
        }
        const ext = filename.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'pdf': {
                return 'bi-file-earmark-pdf text-red-500';
            }
            case 'xls':
            case 'xlsx':
            case 'csv': {
                return 'bi-file-earmark-excel text-green-500';
            }
            case 'doc':
            case 'docx': {
                return 'bi-file-earmark-word text-brand';
            }
            case 'png':
            case 'jpg':
            case 'jpeg':
            case 'gif':
            case 'svg': {
                return 'bi-file-earmark-image text-purple-500';
            }
            case 'zip':
            case 'rar': {
                return 'bi-file-earmark-zip text-yellow-600';
            }
            default: {
                return 'bi-file-earmark-text text-gray-400';
            }
        }
    };

    const copyText = async (text: string) => {
        if (!text) {
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            VersaToast.fire({
                icon: 'success',
                title: '¡Copiado al portapapeles!',
            });
        } catch {
            VersaToast.fire({
                icon: 'error',
                title: 'No se pudo copiar el texto',
            });
        }
    };

    // --- Selection Functionality ---
    const isRowSelected = (row: RowData) => {
        if (!multipleSelectedValue.value || !itemSelectedValue.value?.itemsSelected) {
            return false;
        }
        const fieldCompare = itemSelectedValue.value.fieldCompare || 'id';
        return itemSelectedValue.value.itemsSelected.includes(row[fieldCompare]);
    };

    const toggleRowSelection = (row: RowData, selected: boolean) => {
        if (!multipleSelectedValue.value) {
            return;
        }

        const fieldCompare = itemSelectedValue.value?.fieldCompare || 'id';
        const itemValue = row[fieldCompare];
        const newSelectedItems = [...(itemSelectedValue.value?.itemsSelected || [])];

        if (selected) {
            if (!newSelectedItems.includes(itemValue)) {
                newSelectedItems.push(itemValue);
            }
        } else {
            const index = newSelectedItems.indexOf(itemValue);
            if (index !== -1) {
                newSelectedItems.splice(index, 1);
            }
        }

        emit('accion', {
            item: {
                ...itemSelectedValue.value,
                itemsSelected: newSelectedItems,
            },
            accion: 'setSelectedItems',
        });
    };

    const toggleAllRows = (selected: boolean) => {
        if (!multipleSelectedValue.value) {
            return;
        }

        const fieldCompare = itemSelectedValue.value?.fieldCompare || 'id';
        let newSelectedItems = [...(itemSelectedValue.value?.itemsSelected || [])];

        if (selected) {
            // Añadir todos los de la página actual que no estén
            data.data.forEach(row => {
                const itemValue = row[fieldCompare];
                if (!newSelectedItems.includes(itemValue)) {
                    newSelectedItems.push(itemValue);
                }
            });
        } else {
            // Quitar todos los de la página actual
            const currentPageIds = new Set(data.data.map(row => row[fieldCompare]));
            newSelectedItems = newSelectedItems.filter(id => !currentPageIds.has(id));
        }

        emit('accion', {
            item: {
                ...itemSelectedValue.value,
                itemsSelected: newSelectedItems,
            },
            accion: 'setSelectedItems',
        });
    };

    const shouldUseResponsiveMode = computed(() => {
        if (viewMode.value === 'compact') {
            return true;
        }
        if (viewMode.value === 'normal') {
            return false;
        }
        return isSmallScreen.value;
    });

    const getVisibleColumns = computed(() => {
        const isResponsive = shouldUseResponsiveMode.value;
        const { columns } = data;

        if (!isResponsive || columns.length === 0) {
            return columns;
        }

        let dataColumnCount = 0;
        return columns.filter(col => {
            if (col.type === 'actions') {
                return true;
            }
            if (dataColumnCount < maxVisibleColumns.value) {
                dataColumnCount++;
                return true;
            }
            return false;
        });
    });

    const getHiddenColumns = computed(() => {
        const isResponsive = shouldUseResponsiveMode.value;
        const { columns } = data;

        if (!isResponsive || columns.length === 0) {
            return [];
        }

        let dataColumnCount = 0;
        return columns.filter(col => {
            if (col.type === 'actions') {
                return false;
            }
            const isVisible = dataColumnCount < maxVisibleColumns.value;
            dataColumnCount++;
            return !isVisible;
        });
    });

    const toggleViewMode = () => {
        if (shouldUseResponsiveMode.value) {
            viewMode.value = 'normal';
        } else {
            viewMode.value = 'compact';
        }
        // Reset expansions
        Object.keys(expandedRows).forEach(key => {
            expandedRows[key] = false;
        });
    };

    const toggleRowExpansion = (row: RowData, index: number) => {
        const rowId = row.id ?? index;
        expandedRows[rowId] = !expandedRows[rowId];
    };

    onMounted(() => {
        getRefreshData();
        if (tableContainer.value) {
            resizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    const { width } = entry.contentRect;
                    // Aproximación: 200px por columna promedio
                    const calculatedCols = Math.floor((width - 150) / 200);
                    maxVisibleColumns.value = Math.max(calculatedCols, 1);

                    // Si hay desbordamiento o el ancho es pequeño, activar modo responsive
                    const isOverflowing = tableContainer.value?.scrollWidth
                        ? tableContainer.value.scrollWidth > width
                        : false;
                    isSmallScreen.value =
                        width < 1024 || isOverflowing || maxVisibleColumns.value < data.columns.length - 1;
                }
            });
            resizeObserver.observe(tableContainer.value);
        }
    });

    onUnmounted(() => {
        if (resizeObserver) {
            resizeObserver.disconnect();
        }
    });

    interface ResponseData {
        success: number;
        data: RowData[];
        columns: TableColumn[];
        colspan: ColspanColumn[];
        meta: {
            total: number;
            total_pages: number;
            from: number;
            to: number;
            filter: string;
        };
        message: string;
    }

    const getRefreshData = async () => {
        loadingData.value = true;
        const page = new URLSearchParams(url.value).get('page') ?? data.meta.page;
        const per_page = new URLSearchParams(url.value).get('per_page') ?? data.meta.per_page;
        const filter = new URLSearchParams(url.value).get('filter') ?? data.meta.filter;
        const order = new URLSearchParams(url.value).get('order') ?? data.meta.order;

        const response = (await versaFetch({
            url: `${url.value}?page=${page}&per_page=${per_page}&filter=${filter ?? ''}&order=${order}&externalFilters=${externalFilters.value ?? ''}`,
            method: 'GET',
        })) as ResponseData;

        data.data = [];
        data.columns = [];
        if (API_RESPONSE_CODES.SUCCESS === response.success) {
            data.data = response.data;
            data.columns = response.columns;
            data.colspan = response.colspan ?? [];

            data.meta.total = response.meta.total;
            data.meta.total_pages = response.meta.total_pages;
            data.meta.from = response.meta.from;
            data.meta.to = response.meta.to;
            // No sobrescribir el filtro del usuario con la respuesta del servidor
            // Data.meta.filter = response.meta.filter;

            if (data.data.length === GLOBAL_CONSTANTS.ZERO) {
                msg.value = 'No hay registros para mostrar';
            }
        } else {
            msg.value = response.message;
        }
        loadingData.value = false;
    };

    watch(url, () => {
        getRefreshData();
    });

    watch(
        () => refresh.value,
        () => {
            getRefreshData();
        },
    );

    const model = defineModel();

    watchEffect(() => {
        model.value = data.meta.total;
    });

    const exportExcelPage = async () => {
        loading.value = true;
        const newDataExport = data.data.map((item: any) => {
            const newItem: Record<string, any> = {};
            data.columns.forEach((col: TableColumn) => {
                if ((col as any)?.export) {
                    newItem[col.field] = (item as any)[col.field];
                }
            });
            return newItem;
        });

        await createXlsxFromJson(newDataExport, idTable.value);
        loading.value = false;
    };

    const exportExcelAll = async () => {
        loading.value = true;
        const response = await versaFetch({
            url: `${url.value}?page=1&per_page=${data.meta.total}&filter=${data.meta.filter}&order=${data.meta.order}&externalFilters=${externalFilters.value}`,
            method: 'GET',
        });

        if (!response.data || !Array.isArray(response.data)) {
            loading.value = false;
            return;
        }

        const newData = response.data.map((item: any) => {
            const newItem: Record<string, any> = {};
            data.columns.forEach((col: TableColumn) => {
                if ((col as any)?.export) {
                    newItem[col.field] = (item as any)[col.field];
                }
            });
            return newItem;
        });

        await createXlsxFromJson(newData, idTable.value);
        loading.value = false;
    };

    const sanitizeSvgLocal = (str: string) => sanitizeSvgContent(str);

    const modelExcel = ref('Excel');
    const accion = (accionData: AccionData) => {
        const { item, from, accion } = accionData;
        const actions: actionsType = {
            setButtonValue: () => {
                if ('excel' === from) {
                    if ('Exportar Página' === item) {
                        exportExcelPage();
                    } else {
                        exportExcelAll();
                    }
                    modelExcel.value = 'Excel';
                }
            },
            default: () => emit('accion', { item, accion }),
        };
        const fn = actions[accion] || actions.default;
        if ('function' === typeof fn) {
            fn();
        }
    };

    const clearFiler = () => {
        data.meta.filter = '';
        getRefreshData();
    };
    const setPerPage = (per_page: number) => {
        data.meta.page = 1;
        data.meta.per_page = per_page;

        getRefreshData();
    };
    const setFilter = () => {
        data.meta.page = 1;

        getRefreshData();
    };
    const setOrder = (field: string, order: string) => {
        data.meta.page = PAGINATION.DEFAULT_PAGE;
        let orderLocal = order;
        if (data.meta.order[PAGINATION.ARRAY_FIRST_INDEX] !== field) {
            orderLocal = 'asc';
        }

        data.meta.order = [field, orderLocal];
        getRefreshData();
    };
    const changePage = (page: number | string) => {
        let goPage = 0;
        if ('siguiente' === page) {
            if (data.meta.page < data.meta.total_pages) {
                goPage = data.meta.page + PAGINATION.DEFAULT_PAGE;
            } else {
                return;
            }
        } else if ('anterior' === page) {
            if (PAGINATION.DEFAULT_PAGE < data.meta.page) {
                goPage = data.meta.page - PAGINATION.DEFAULT_PAGE;
            } else {
                return;
            }
        } else if (typeof page === 'number') {
            goPage = page;
        } else {
            return;
        }

        data.meta.page = goPage;

        getRefreshData();
    };
    const getLimitPages = computed(() => {
        const limit = 3;
        const { total_pages, page } = data.meta;
        const from = page - limit;
        const to = page + limit;

        if (PAGINATION.DEFAULT_PAGE > from) {
            if (total_pages < limit * PAGINATION.PAGES_LIMIT_MULTIPLIER) {
                const arr = Array.from({ length: total_pages }, (_, i) => i + PAGINATION.DEFAULT_PAGE);
                return arr;
            }
            const arr = Array.from(
                { length: limit * PAGINATION.PAGES_LIMIT_MULTIPLIER },
                (_, i) => i + PAGINATION.DEFAULT_PAGE,
            );
            return arr;
        }

        if (to > total_pages) {
            if (total_pages < limit * PAGINATION.PAGES_LIMIT_MULTIPLIER) {
                const arr = Array.from({ length: total_pages }, (_, i) => i + PAGINATION.DEFAULT_PAGE);
                return arr;
            }
            const arr = Array.from({ length: limit * PAGINATION.PAGES_LIMIT_MULTIPLIER }, (_, i) => total_pages - i);
            return arr.toReversed();
        }

        const arr = Array.from({ length: limit * PAGINATION.PAGES_LIMIT_MULTIPLIER }, (_, i) => from + i);
        return arr;
    });

    // Garantizar que siempre sea un array (ya lo es, pero forzar tipo y evitar undefined en template)
    const safeLimitPages = computed(() => getLimitPages.value ?? []);

    const computedActionClass = (action, row) => {
        if ('object' !== typeof action.class) {
            return action.class;
        }

        return action.class.condition_value === row[action.class.condition_field]
            ? action.class.active
            : action.class.inactive;
    };

    //Detectar cambios en itemSelected y crear clase para linea de la tabla
    const classLineTable = item => {
        if (multipleSelected.value) {
            if (itemSelected.value?.fieldCompare !== undefined) {
                if (
                    itemSelected.value.itemsSelected.some(
                        (/** @type {any} */ itemSelectedValue) =>
                            itemSelectedValue === item[itemSelected.value?.fieldCompare],
                    )
                ) {
                    // Update for new design: selected row style
                    return 'bg-brand/10 border-b border-brand dark:bg-brand/5 dark:border-brand/50';
                }
            }
            return 'bg-white border-b border-gray-100 dark:bg-[#0a0a0a] dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors duration-200';
        }
        if (
            itemSelected.value?.fieldCompare !== undefined &&
            itemSelected.value[itemSelected.value?.fieldCompare] === item[itemSelected.value?.fieldCompare]
        ) {
            // Update for new design: selected row style
            return 'bg-brand/10 border-b border-brand dark:bg-brand/5 dark:border-brand/50';
        }
        return 'bg-white border-b border-gray-100 dark:bg-[#0a0a0a] dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors duration-200';
    };

    //Funcion para convertir fecha
    const convertDate = (date: any) => {
        if (!date) {
            return '';
        }

        let dateString: string = '';

        // Si es un objeto PHP DateTime { date: "...", timezone_type: 3, timezone: "..." }
        if (typeof date === 'object' && date.date) {
            dateString = date.date;
        }
        // Si es un string JSON
        else if (typeof date === 'string' && date.includes('{')) {
            try {
                const parsed = JSON.parse(date);
                dateString = parsed.date ?? '';
            } catch {
                return '';
            }
        }
        // Si es un string de fecha normal
        else if (typeof date === 'string') {
            dateString = date;
        } else {
            return '';
        }

        const dateObj = new Date(dateString);
        return formatDate(dateObj);
    };
</script>

<template>
    <div ref="tableContainer" class="flex flex-col space-y-6">
        <!-- Top Controls Section -->
        <div>
            <!-- Wrapper to separate slots from table controls if needed -->
            <slot name="buttons"></slot>
        </div>

        <div
            v-if="showPerPage || showExportExcel || showSearch"
            class="flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-[#0a0a0a] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div class="flex items-center gap-4">
                <!-- Dropdown por Pagina -->
                <dropDown
                    v-if="showPerPage"
                    v-model="data.meta.per_page"
                    key="per_page"
                    title="Mostrar"
                    from="per_page"
                    :list="showPerPages" />

                <!-- Dropdown Exportar Excel -->
                <dropDown
                    v-if="showExportExcel"
                    @update:model="accion"
                    v-model="modelExcel"
                    key="excel"
                    from="excel"
                    :list="['Exportar Página', 'Exportar todo']" />

                <!-- Botón Modo Vista (Responsive) -->
                <button
                    type="button"
                    @click="toggleViewMode"
                    class="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all border"
                    :class="
                        shouldUseResponsiveMode
                            ? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-[#0a0a0a] dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-900'
                            : 'bg-brand text-white border-brand shadow-lg shadow-brand/20'
                    "
                    :title="
                        shouldUseResponsiveMode
                            ? 'Pasar a vista compacta (columnas adaptables)'
                            : 'Pasar a vista normal (todas las columnas)'
                    ">
                    <i :class="shouldUseResponsiveMode ? 'bi bi-grid-fill' : 'bi bi-grid-3x3-gap'"></i>
                    <span class="hidden sm:inline">
                        {{ shouldUseResponsiveMode ? 'Vista Normal' : 'Vista Compacta' }}
                    </span>
                </button>
            </div>

            <!-- input buscar -->
            <div class="relative w-full md:w-auto" v-if="showSearch">
                <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                    <svg
                        class="w-4 h-4"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 20 20">
                        <path
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                    </svg>
                </div>
                <input
                    type="text"
                    :class="[
                        'block w-full md:w-80 p-3 pl-10 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand dark:bg-gray-900 dark:border-gray-700 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand dark:focus:border-brand outline-none transition-all placeholder-gray-500',
                        data.meta.filter ? 'pr-10' : 'pr-3',
                    ]"
                    :id="idTable + '_table-search-users'"
                    @keyup.enter="setFilter"
                    placeholder="Buscar..."
                    v-model="data.meta.filter" />

                <button
                    v-if="data.meta.filter"
                    type="button"
                    class="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-r-xl transition-all duration-200 cursor-pointer group"
                    @click="clearFiler"
                    title="Limpiar búsqueda">
                    <svg
                        class="w-4 h-4 group-hover:scale-110 transition-transform"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- Table Container -->
        <div
            class="relative overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl bg-white dark:bg-[#0a0a0a] w-full">
            <table
                :id="'table_' + idTable"
                class="w-full text-sm text-left text-gray-500 dark:text-gray-400 table-auto">
                <caption
                    v-if="tablaTitle !== ''"
                    class="p-5 text-lg font-bold text-left text-gray-900 bg-white dark:text-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-gray-800">
                    <div class="flex justify-between items-center w-full">
                        <div class="flex items-center gap-2">
                            <div class="w-1 h-6 bg-brand rounded-full"></div>
                            {{ tablaTitle }}
                        </div>
                        <div>
                            <loader key="loadingData" v-if="loadingData"></loader>
                        </div>
                    </div>
                </caption>

                <!-- Colspan Header -->
                <thead
                    v-if="data.colspan && data.colspan.length && !shouldUseResponsiveMode"
                    class="text-xs uppercase bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                        <th
                            :colspan="col.col"
                            scope="col"
                            v-for="col in data.colspan"
                            class="py-3 px-4 text-center font-bold tracking-wider">
                            {{ col.title }}
                        </th>
                    </tr>
                </thead>

                <!-- Main Header -->
                <thead class="text-xs text-white uppercase bg-black dark:bg-black/90 border-b-2 border-brand">
                    <tr>
                        <!-- Columna de selección -->
                        <th v-if="multipleSelected" class="w-12 text-center py-4 px-2 select-none">
                            <div class="flex justify-center">
                                <check id="check-all" v-model="checkAllValue" @update:modelValue="toggleAllRows" />
                            </div>
                        </th>

                        <!-- Columna de expansión (solo modo responsive) -->
                        <th
                            v-if="shouldUseResponsiveMode && getHiddenColumns.length > 0"
                            class="w-12 text-center py-4 px-2 select-none">
                            <i class="bi bi-plus-square text-brand/60"></i>
                        </th>

                        <!--TODO: descartar columnas atributo visible: false-->
                        <th
                            scope="col"
                            v-for="col in getVisibleColumns"
                            :class="[
                                smallLine ? 'py-2 px-3' : 'py-4 px-6',
                                'font-bold tracking-wider hover:bg-white/5 transition-colors cursor-pointer group select-none',
                            ]"
                            @click="
                                col.type !== 'actions' && col.type !== 'file' && col.type !== 'position'
                                    ? setOrder(col.field, data.meta.order[1] === 'asc' ? 'desc' : 'asc')
                                    : null
                            ">
                            <div class="flex items-center gap-2">
                                {{ col.title }}
                                <div
                                    v-if="col.type !== 'actions' && col.type !== 'file' && col.type !== 'position'"
                                    class="flex flex-col opacity-30 group-hover:opacity-100 transition-opacity">
                                    <i
                                        class="bi bi-caret-up-fill text-[8px] leading-none"
                                        :class="{
                                            'text-brand opacity-100':
                                                data.meta.order[0] === col.field && data.meta.order[1] === 'asc',
                                        }"></i>
                                    <i
                                        class="bi bi-caret-down-fill text-[8px] leading-none"
                                        :class="{
                                            'text-brand opacity-100':
                                                data.meta.order[0] === col.field && data.meta.order[1] === 'desc',
                                        }"></i>
                                </div>
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="text-center" v-if="data.data.length === 0">
                        <td
                            :colspan="
                                shouldUseResponsiveMode && getHiddenColumns.length > 0
                                    ? getVisibleColumns.length + 1
                                    : getVisibleColumns.length
                            "
                            class="py-12">
                            <div class="flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                                <i class="bi bi-inbox text-4xl mb-2 opacity-50"></i>
                                <span class="text-base font-medium" v-html="msg"></span>
                            </div>
                        </td>
                    </tr>
                    <template :key="row.id ?? index" v-for="(row, index) in data.data">
                        <!-- Fila Principal -->
                        <tr :class="classLineTable(row)">
                            <!-- Selección -->
                            <td v-if="multipleSelected" class="text-center align-middle w-12 py-2 px-2">
                                <div class="flex justify-center">
                                    <check
                                        :id="`check-${row.id ?? index}`"
                                        :model-value="isRowSelected(row)"
                                        @update:model-value="val => toggleRowSelection(row, val)" />
                                </div>
                            </td>

                            <!-- Botón expansión -->
                            <td
                                v-if="shouldUseResponsiveMode && getHiddenColumns.length > 0"
                                class="text-center align-middle w-12 py-2 px-2">
                                <button
                                    @click="toggleRowExpansion(row, index)"
                                    class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border border-black/5 dark:border-white/5"
                                    :class="
                                        expandedRows[row.id ?? index]
                                            ? 'bg-red-500 text-white rotate-180 hover:bg-red-600'
                                            : 'bg-brand text-white hover:scale-110 active:scale-95'
                                    "
                                    :title="expandedRows[row.id ?? index] ? 'Contraer fila' : 'Ver más detalles'">
                                    <i :class="expandedRows[row.id ?? index] ? 'bi bi-dash' : 'bi bi-plus'"></i>
                                </button>
                            </td>

                            <td
                                :class="smallLine ? 'py-2 px-3' : 'py-4 px-6'"
                                :key="col.field"
                                v-for="col in getVisibleColumns">
                                <!--datetime-->
                                <div v-if="col.type === 'datetime'" class="font-mono text-xs">
                                    <span>{{ convertDate(row[col.field]) }}</span>
                                </div>
                                <!--status-->
                                <div v-else-if="col.type === 'status'">
                                    <span
                                        class="inline-flex items-center justify-center px-3 py-1 text-xs font-bold leading-none rounded-full border-2 transition-all"
                                        :class="
                                            row[col.field] == '1' ||
                                            row[col.field] == 'activo' ||
                                            row[col.field] == true ||
                                            row[col.field] == 'true' ||
                                            row[col.field] == 1
                                                ? 'bg-white text-black border-brand dark:bg-black dark:text-white dark:border-brand'
                                                : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700'
                                        ">
                                        <i
                                            class="bi mr-1"
                                            :class="
                                                row[col.field] == '1' ||
                                                row[col.field] == 'activo' ||
                                                row[col.field] == true ||
                                                row[col.field] == 1
                                                    ? 'bi-check-circle-fill'
                                                    : 'bi-dash-circle'
                                            "></i>
                                        {{
                                            row[col.field] == '1' ||
                                            row[col.field] == 'activo' ||
                                            row[col.field] == true ||
                                            row[col.field] == 'true' ||
                                            row[col.field] == 1
                                                ? 'Activo'
                                                : 'Inactivo'
                                        }}
                                    </span>
                                </div>
                                <!--affirmative-->
                                <div v-else-if="col.type === 'affirmative'" class="flex justify-start">
                                    <span
                                        class="inline-flex items-center justify-center px-3 py-1 text-xs font-bold leading-none rounded-full"
                                        :class="
                                            row[col.field] == '1' || row[col.field] == 'si' || row[col.field] == true
                                                ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300'
                                                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                        ">
                                        {{
                                            row[col.field] == '1' || row[col.field] == 'si' || row[col.field] == true
                                                ? 'Si'
                                                : 'No'
                                        }}
                                    </span>
                                </div>
                                <!--svg-->
                                <div v-else-if="col.type === 'svg'" class="flex justify-start">
                                    <svg
                                        class="w-[20px] h-[20px] text-gray-800 dark:text-white"
                                        :fill="row['fill'] == 1 || row['fill'] == true ? 'currentColor' : 'none'"
                                        height="24"
                                        v-html="sanitizeSvgLocal(row[col.field])"
                                        viewBox="0 0 24 24"
                                        width="24"
                                        xmlns="http://www.w3.org/2000/svg"></svg>
                                </div>
                                <!--currency / money-->
                                <div
                                    v-else-if="col.type === 'currency' || col.type === 'money'"
                                    class="font-mono font-bold">
                                    {{ formatCurrency(row[col.field], row[col.moneda] || 'CLP') }}
                                </div>
                                <!--file-->
                                <div v-else-if="col.type === 'file'" class="flex items-center gap-3">
                                    <div
                                        class="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-black/5 dark:border-white/5">
                                        <i :class="['bi text-xl', getFileTypeIcon(row[col.field])]"></i>
                                    </div>
                                    <div class="flex flex-col">
                                        <a
                                            :href="row[col.field]"
                                            target="_blank"
                                            class="text-sm font-semibold hover:text-brand transition-colors truncate max-w-[150px]">
                                            {{
                                                row[col.config?.nameField] ||
                                                row[col.field]?.split('/').pop() ||
                                                'Archivo'
                                            }}
                                        </a>
                                        <span
                                            v-if="col.valueAditional"
                                            class="text-[10px] text-gray-500 uppercase font-black">
                                            {{ row[col.valueAditional] }}
                                        </span>
                                    </div>
                                    <!-- Botones de archivo -->
                                    <div v-if="col.buttons" class="flex gap-1 ml-auto">
                                        <button
                                            v-for="btn in col.buttons"
                                            :key="btn.id"
                                            @click="accion({ item: row, accion: btn.action })"
                                            class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-brand hover:text-white transition-all"
                                            :title="btn.title">
                                            <i :class="btn.icon"></i>
                                        </button>
                                    </div>
                                </div>
                                <!--progress-->
                                <div v-else-if="col.type === 'progress'" class="w-full min-w-[100px]">
                                    <div class="flex justify-between items-center mb-1">
                                        <span class="text-[10px] font-black uppercase text-gray-400">Progreso</span>
                                        <span class="text-[10px] font-mono font-bold">{{ row[col.field] }}%</span>
                                    </div>
                                    <div class="w-full bg-gray-100 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            class="h-full transition-all duration-1000"
                                            :class="[
                                                row[col.field] > 80
                                                    ? 'bg-brand'
                                                    : row[col.field] > 40
                                                      ? 'bg-brand'
                                                      : 'bg-red-500',
                                            ]"
                                            :style="{ width: `${row[col.field]}%` }"></div>
                                    </div>
                                </div>
                                <!--progressring-->
                                <div v-else-if="col.type === 'progressring'" class="flex justify-center">
                                    <div class="relative w-10 h-10">
                                        <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            <circle
                                                cx="18"
                                                cy="18"
                                                r="16"
                                                fill="none"
                                                class="stroke-gray-100 dark:stroke-white/10"
                                                stroke-width="3"></circle>
                                            <circle
                                                cx="18"
                                                cy="18"
                                                r="16"
                                                fill="none"
                                                class="stroke-brand transition-all duration-1000"
                                                stroke-width="3"
                                                stroke-dasharray="100 100"
                                                :stroke-dashoffset="100 - row[col.field]"
                                                stroke-linecap="round"></circle>
                                        </svg>
                                        <span
                                            class="absolute inset-0 flex items-center justify-center text-[8px] font-black">
                                            {{ row[col.field] }}%
                                        </span>
                                    </div>
                                </div>
                                <!--link-->
                                <div v-else-if="col.type === 'link'">
                                    <button
                                        @click="accion({ item: row, accion: col.config?.action || 'link' })"
                                        class="text-sm font-bold text-brand hover:underline transition-all underline-offset-4">
                                        {{ row[col.field] }}
                                    </button>
                                </div>
                                <!--image-->
                                <div v-else-if="col.type === 'image'" class="flex justify-start">
                                    <div class="relative group/img">
                                        <img
                                            :src="row[col.field]"
                                            class="w-10 h-10 rounded-xl object-cover border border-black/10 dark:border-white/10 shadow-sm"
                                            @error="
                                                (e: any) =>
                                                    (e.target.src =
                                                        'https://ui-avatars.com/api/?name=' +
                                                        (row[col.config?.nameField] || 'NA') +
                                                        '&background=random')
                                            " />
                                    </div>
                                </div>
                                <!--badge-->
                                <div v-else-if="col.type === 'badge'" class="flex justify-start">
                                    <span
                                        class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                                        :class="
                                            col.config?.classField
                                                ? row[col.config.classField]
                                                : col.config?.valueMap
                                                  ? col.config.valueMap[row[col.field]] ||
                                                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                                  : col.config?.class ||
                                                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                        ">
                                        {{ row[col.field] }}
                                    </span>
                                </div>
                                <!--copy-->
                                <div v-else-if="col.type === 'copy'" class="flex items-center gap-2 group/copy">
                                    <span class="font-mono text-xs truncate max-w-[120px]">{{ row[col.field] }}</span>
                                    <button
                                        @click="copyText(row[col.field])"
                                        class="p-1.5 rounded-lg bg-gray-50 dark:bg-white/5 opacity-0 group-hover/copy:opacity-100 transition-all hover:bg-brand hover:text-white">
                                        <i class="bi bi-clipboard text-xs"></i>
                                    </button>
                                </div>
                                <!--color-->
                                <div v-else-if="col.type === 'color'" class="flex items-center gap-2">
                                    <div
                                        class="w-4 h-4 rounded-full border border-black/10 dark:border-white/20"
                                        :style="{ backgroundColor: row[col.field] }"></div>
                                    <span class="font-mono text-[10px] uppercase text-gray-500">
                                        {{ row[col.field] }}
                                    </span>
                                </div>
                                <!--rating-->
                                <div v-else-if="col.type === 'rating'" class="flex gap-0.5 text-brand">
                                    <i
                                        v-for="i in 5"
                                        :key="i"
                                        class="bi"
                                        :class="i <= Number(row[col.field]) ? 'bi-star-fill' : 'bi-star'"></i>
                                </div>
                                <!--qr-->
                                <div v-else-if="col.type === 'qr'" class="flex justify-start">
                                    <div
                                        class="w-10 h-10 p-1 bg-white rounded-lg border border-black/10 cursor-pointer hover:scale-110 transition-transform"
                                        @click="accion({ item: row, accion: col?.action || 'view-qr' })">
                                        <img
                                            v-if="row[col.field]"
                                            :src="row[col.field]"
                                            class="w-full h-full object-contain" />
                                    </div>
                                </div>
                                <!--position-->
                                <div
                                    v-else-if="col.type === 'position'"
                                    class="flex justify-between items-center gap-2">
                                    <span class="font-mono font-bold">{{ row[col.field] }}</span>
                                    <div class="flex items-center justify-center gap-1">
                                        <div v-for="action in col.buttons">
                                            <button
                                                :class="action.class"
                                                :key="action.id"
                                                :title="action.title"
                                                class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                @click="
                                                    accion({
                                                        item: {
                                                            ...row,
                                                            direction: action.type,
                                                        },
                                                        accion: action.action,
                                                    })
                                                "
                                                v-if="
                                                    (Number(index) === 0 && row[col.field] == 1 && action.type === 'up'
                                                        ? false
                                                        : true) &&
                                                    (Number(index) === data.meta.total - 1 && action.type === 'down'
                                                        ? false
                                                        : true)
                                                ">
                                                <i :class="action.icon"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <!--actions-->
                                <div v-else-if="col.type === 'actions'" class="flex justify-start gap-2">
                                    <template v-for="action in col.buttons">
                                        <!-- Loader condition -->
                                        <div
                                            v-if="action.loader && row[action.loader]"
                                            class="w-8 h-8 flex items-center justify-center">
                                            <i class="bi bi-arrow-repeat animate-spin text-brand"></i>
                                        </div>
                                        <button
                                            v-else
                                            :class="computedActionClass(action, row)"
                                            :key="action.id"
                                            :title="action.title"
                                            class="transform hover:scale-110 transition-transform duration-200"
                                            @click="
                                                accion({
                                                    item: row,
                                                    accion: action.action,
                                                })
                                            "
                                            v-if="!action.condition || action.condition_value == row[action.condition]">
                                            <i :class="action.icon"></i>
                                        </button>
                                    </template>
                                </div>
                                <!--others-->
                                <div v-else class="text-gray-700 dark:text-gray-300">
                                    {{ row[col.field] }}
                                </div>
                            </td>
                        </tr>

                        <!-- Fila de Detalles (Surgida en modo responsive) -->
                        <tr
                            v-if="
                                shouldUseResponsiveMode && expandedRows[row.id ?? index] && getHiddenColumns.length > 0
                            "
                            class="bg-gray-50/80 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-800 animate-fade-in">
                            <td :colspan="getVisibleColumns.length + 1" class="p-0">
                                <div class="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div
                                        v-for="col in getHiddenColumns"
                                        :key="col.field"
                                        class="flex flex-col gap-2 p-3 rounded-xl bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/5">
                                        <span class="text-[10px] font-black uppercase tracking-widest text-brand">
                                            {{ col.title }}
                                        </span>
                                        <div class="text-sm font-medium text-gray-800 dark:text-gray-200">
                                            <!-- Mismo render que en la celda normal para paridad de datos -->
                                            <template v-if="col.type === 'datetime'">
                                                <span class="font-mono">{{ convertDate(row[col.field]) }}</span>
                                            </template>
                                            <template v-else-if="col.type === 'status'">
                                                <span
                                                    class="inline-flex items-center justify-center px-3 py-1 text-xs font-bold leading-none rounded-full border-2 transition-all"
                                                    :class="
                                                        row[col.field] == '1' ||
                                                        row[col.field] == 'activo' ||
                                                        row[col.field] == true ||
                                                        row[col.field] == 'true' ||
                                                        row[col.field] == 1
                                                            ? 'bg-white text-black border-brand dark:bg-black dark:text-white dark:border-brand'
                                                            : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700'
                                                    ">
                                                    {{
                                                        row[col.field] == '1' ||
                                                        row[col.field] == 'activo' ||
                                                        row[col.field] == true ||
                                                        row[col.field] == 'true' ||
                                                        row[col.field] == 1
                                                            ? 'Activo'
                                                            : 'Inactivo'
                                                    }}
                                                </span>
                                            </template>
                                            <template v-else-if="col.type === 'affirmative'">
                                                <span
                                                    class="inline-flex items-center justify-center px-3 py-1 text-xs font-bold leading-none rounded-full"
                                                    :class="
                                                        row[col.field] == '1' ||
                                                        row[col.field] == 'si' ||
                                                        row[col.field] == true
                                                            ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300'
                                                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                                    ">
                                                    {{
                                                        row[col.field] == '1' ||
                                                        row[col.field] == 'si' ||
                                                        row[col.field] == true
                                                            ? 'Si'
                                                            : 'No'
                                                    }}
                                                </span>
                                            </template>
                                            <template v-else-if="col.type === 'currency' || col.type === 'money'">
                                                <span class="font-mono font-bold">
                                                    {{ formatCurrency(row[col.field], row[col.moneda] || 'CLP') }}
                                                </span>
                                            </template>
                                            <template v-else-if="col.type === 'file'">
                                                <div class="flex items-center gap-2">
                                                    <i :class="['bi', getFileTypeIcon(row[col.field])]"></i>
                                                    <a
                                                        :href="row[col.field]"
                                                        target="_blank"
                                                        class="hover:text-brand truncate max-w-[200px]">
                                                        {{
                                                            row[col.config?.nameField] ||
                                                            row[col.field]?.split('/').pop() ||
                                                            'Archivo'
                                                        }}
                                                    </a>
                                                </div>
                                            </template>
                                            <template
                                                v-else-if="col.type === 'progress' || col.type === 'progressring'">
                                                <div class="flex items-center gap-3 w-full max-w-[150px]">
                                                    <div
                                                        class="flex-1 bg-gray-100 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            class="h-full bg-brand"
                                                            :style="{ width: `${row[col.field]}%` }"></div>
                                                    </div>
                                                    <span class="text-[10px] font-mono font-bold">
                                                        {{ row[col.field] }}%
                                                    </span>
                                                </div>
                                            </template>
                                            <template v-else-if="col.type === 'link'">
                                                <button
                                                    @click="accion({ item: row, accion: col.config?.action || 'link' })"
                                                    class="text-sm font-bold text-brand hover:underline">
                                                    {{ row[col.field] }}
                                                </button>
                                            </template>
                                            <template v-else-if="col.type === 'image'">
                                                <img
                                                    :src="row[col.field]"
                                                    class="w-12 h-12 rounded-xl object-cover border border-black/10"
                                                    @error="
                                                        (e: any) =>
                                                            (e.target.src =
                                                                'https://ui-avatars.com/api/?name=' +
                                                                (row[col.config?.nameField] || 'NA'))
                                                    " />
                                            </template>
                                            <template v-else-if="col.type === 'badge'">
                                                <span
                                                    class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                                                    :class="
                                                        col.config?.classField
                                                            ? row[col.config.classField]
                                                            : col.config?.valueMap
                                                              ? col.config.valueMap[row[col.field]] ||
                                                                'bg-gray-100 text-gray-700'
                                                              : col.config?.class || 'bg-gray-100 text-gray-700'
                                                    ">
                                                    {{ row[col.field] }}
                                                </span>
                                            </template>
                                            <template v-else-if="col.type === 'copy'">
                                                <div class="flex items-center gap-2">
                                                    <span class="font-mono text-sm">{{ row[col.field] }}</span>
                                                    <button @click="copyText(row[col.field])" class="text-brand">
                                                        <i class="bi bi-clipboard"></i>
                                                    </button>
                                                </div>
                                            </template>
                                            <template v-else-if="col.type === 'color'">
                                                <div class="flex items-center gap-2">
                                                    <div
                                                        class="w-5 h-5 rounded-full border"
                                                        :style="{ backgroundColor: row[col.field] }"></div>
                                                    <span class="font-mono text-xs">{{ row[col.field] }}</span>
                                                </div>
                                            </template>
                                            <template v-else-if="col.type === 'rating'">
                                                <div class="flex gap-1 text-brand">
                                                    <i
                                                        v-for="i in 5"
                                                        :key="i"
                                                        class="bi"
                                                        :class="
                                                            i <= Number(row[col.field]) ? 'bi-star-fill' : 'bi-star'
                                                        "></i>
                                                </div>
                                            </template>
                                            <template v-else-if="col.type === 'qr'">
                                                <div
                                                    class="w-16 h-16 p-1 bg-white rounded-lg border"
                                                    @click="accion({ item: row, accion: 'verQR' })">
                                                    <img :src="row[col.field]" class="w-full h-full object-contain" />
                                                </div>
                                            </template>
                                            <template v-else-if="col.type === 'svg'">
                                                <svg
                                                    class="w-[20px] h-[20px] text-gray-800 dark:text-white"
                                                    :fill="
                                                        row['fill'] == 1 || row['fill'] == true
                                                            ? 'currentColor'
                                                            : 'none'
                                                    "
                                                    height="24"
                                                    v-html="sanitizeSvgLocal(row[col.field])"
                                                    viewBox="0 0 24 24"
                                                    width="24"
                                                    xmlns="http://www.w3.org/2000/svg"></svg>
                                            </template>
                                            <template v-else-if="col.type === 'position'">
                                                <span class="font-mono font-bold">{{ row[col.field] }}</span>
                                            </template>
                                            <!-- others default -->
                                            <template v-else>
                                                {{ row[col.field] }}
                                            </template>
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <nav class="flex flex-col md:flex-row justify-between items-center w-full px-2 gap-4">
            <div
                class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-[#0a0a0a] px-4 py-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                <span>Mostrando</span>
                <span class="font-bold text-gray-900 dark:text-white">{{ data.meta.from || 0 }}</span>
                <span>al</span>
                <span class="font-bold text-gray-900 dark:text-white">{{ data.meta.to || 0 }}</span>
                <span>de</span>
                <span class="font-bold text-brand">{{ data.meta.total }}</span>
                <span>Resultados</span>
            </div>

            <ul
                class="inline-flex items-center -space-x-px text-sm bg-white dark:bg-[#0a0a0a] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-1">
                <template v-if="Array.isArray(getLimitPages)">
                    <li>
                        <a
                            class="flex items-center justify-center px-3 py-2 leading-tight text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors rounded-lg mx-0.5"
                            :class="
                                1 == data.meta.page
                                    ? 'cursor-not-allowed opacity-50'
                                    : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                            "
                            @click="changePage('anterior')">
                            <i class="bi bi-chevron-left"></i>
                        </a>
                    </li>
                    <li v-if="safeLimitPages.length > 1 && safeLimitPages[0] > 1">
                        <a
                            class="flex items-center justify-center px-3 py-2 mx-0.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 cursor-pointer transition-colors"
                            @click="changePage(1)">
                            1
                        </a>
                    </li>

                    <li v-if="safeLimitPages.length > 1 && safeLimitPages[0] > 1">
                        <span class="px-2 text-gray-400">...</span>
                    </li>

                    <li v-for="page in safeLimitPages">
                        <a
                            v-if="data.meta.page == page"
                            class="flex items-center justify-center w-8 h-8 mx-0.5 text-black bg-brand font-bold rounded-lg shadow-sm cursor-default"
                            aria-current="page">
                            {{ page }}
                        </a>
                        <a
                            v-else
                            class="flex items-center justify-center w-8 h-8 mx-0.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
                            @click="changePage(page)">
                            {{ page }}
                        </a>
                    </li>

                    <li v-if="data.meta.page < data.meta.total_pages">
                        <span class="px-2 text-gray-400">...</span>
                    </li>
                    <li
                        v-if="
                            data.meta.page < data.meta.total_pages &&
                            getLimitPages[getLimitPages.length - 1] != data.meta.total_pages
                        ">
                        <a
                            class="flex items-center justify-center px-3 py-2 mx-0.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 cursor-pointer transition-colors"
                            @click="changePage(data.meta.total_pages)">
                            {{ data.meta.total_pages }}
                        </a>
                    </li>

                    <li>
                        <a
                            class="flex items-center justify-center px-3 py-2 leading-tight text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors rounded-lg mx-0.5"
                            :class="
                                data.meta.total_pages <= data.meta.page || data.meta.total_pages == undefined
                                    ? 'cursor-not-allowed opacity-50'
                                    : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                            "
                            @click="changePage('siguiente')">
                            <i class="bi bi-chevron-right"></i>
                        </a>
                    </li>
                </template>
            </ul>
        </nav>
    </div>
</template>
