<docs lang="JSDoc">
/**
    * @preserve
    * @typedef {Object} Props
    * @property {String} id - Id de la tabla
    * @property {String} tablaTitle - Titulo de la tabla
    * @property {Array} columns - Columnas de la tabla
    * @property {Array} dataInput - Datos de la tabla
    * @property {String} fieldOrder - Campo de orden
    * @property {Number} perPage - Registros por página
    * @property {Boolean} showPerPage - Mostrar registros por página
    * @property {Boolean} showExportExcel - Mostrar exportar a excel
    * @property {Boolean} showSearch - Mostrar campo de búsqueda
    * @property {Object} itemSelected - Item seleccionado
    * @property {Boolean} smallLine - Linea pequeña
    */
</docs>

<script setup lang="ts">
    import { computed, reactive, ref, toRefs, watch, watchEffect } from 'vue';

    import dropDown from '@/dashboard/js/components/dropDown.vue';
    import loader from '@/dashboard/js/components/loader.vue';
    import { GLOBAL_CONSTANTS, PAGINATION } from '@/dashboard/js/constants';

    interface ItemSelected {
        id: string;
        fieldCompare: string;
    }

    interface Colspan {
        title: string;
        colspan: number;
    }

    interface Props {
        id?: string;
        tablaTitle?: string;
        columns: string[];
        dataInput: any[];
        fieldOrder?: string;
        perPage: number;
        showPerPage?: boolean;
        showExportExcel?: boolean;
        showSearch?: boolean;
        itemSelected?: ItemSelected;
        smallLine?: boolean;
        colspan?: Colspan[];
        reloadData?: boolean;
    }

    const props = withDefaults(defineProps<Props>(), {
        id: 'table',
        tablaTitle: '',
        fieldOrder: 'id',
        perPage: 25,
        showPerPage: true,
        showExportExcel: true,
        showSearch: true,
        smallLine: false,
        reloadData: false,
    });
    const emit = defineEmits(['accion', 'update:totalRegisters']);

    const loadingData = ref(false);

    const slots = defineSlots();

    const msg = ref('Cargando...');

    const {
        tablaTitle,
        id,
        fieldOrder,
        perPage,
        showPerPage,
        showExportExcel,
        showSearch,
        itemSelected,
        smallLine,
        columns,
        dataInput,
        colspan,
        reloadData,
    } = toRefs(props);

    const columnsValue = computed(() => columns.value ?? []);
    const dataInputValue = computed(() => dataInput.value ?? []);
    const fieldOrderValue = computed(() => fieldOrder.value ?? 'id');
    const perPageValue = computed(() => perPage.value ?? 25);

    const showPerPages = [...PAGINATION.PER_PAGE_OPTIONS];

    interface Data {
        data: any[];
        columns: string[];
        colspan: string[];
        meta: {
            total: number;
            per_page: number;
            page: number;
            total_pages: number;
            filter: string;
            from: number;
            to: number;
            order: string[];
        };
    }

    const data = reactive<Data>({
        data: [] as any[],
        columns: [] as string[],
        colspan: [] as string[],
        meta: {
            total: 0,
            per_page: perPageValue.value,
            page: PAGINATION.DEFAULT_PAGE,
            total_pages: 0,
            filter: '',
            from: 0,
            to: 0,
            order: [`${fieldOrderValue.value}`, 'asc'],
        },
    });

    const dataTemp = ref<any[]>([]);
    const refreshData = () => {
        data.columns = columnsValue.value;

        if ('' !== data.meta.filter) {
            const filter = data.meta.filter.toLowerCase();
            dataTemp.value = dataInputValue.value.filter(item =>
                Object.values(item).some((value: unknown) => value?.toString().toLowerCase().includes(filter)),
            );
        } else {
            dataTemp.value = dataInputValue.value;
        }
        // Paginación
        const start = (data.meta.page - PAGINATION.DEFAULT_PAGE) * data.meta.per_page;
        const end = data.meta.page * data.meta.per_page;
        data.data = dataTemp.value.slice(start, end);

        data.meta.total = dataTemp.value.length;
        data.meta.total_pages = Math.ceil(data.meta.total / data.meta.per_page);
        data.meta.from = start + PAGINATION.DEFAULT_PAGE;
        data.meta.to = end > data.meta.total ? data.meta.total : end;

        if (GLOBAL_CONSTANTS.ZERO === data.meta.total) {
            msg.value = 'No se encontraron registros';
        }
    };

    watch(
        () => dataInput.value,
        () => {
            refreshData();
        },
    );

    watch(
        columns.value,
        () => {
            refreshData();
        },
        { immediate: true },
    );

    watch(
        () => data.meta.per_page,
        () => {
            setPerPage(data.meta.per_page);
        },
    );

    watch(
        () => props.reloadData,
        () => {
            refreshData();
        },
    );

    watchEffect(() => {
        emit('update:totalRegisters', data.meta?.total ?? GLOBAL_CONSTANTS.ZERO);
    });

    const clearFiler = () => {
        data.meta.filter = '';
        refreshData();
    };
    const setPerPage = (per_page: number) => {
        data.meta.page = PAGINATION.DEFAULT_PAGE;
        data.meta.per_page = per_page;

        refreshData();
    };
    const setFilter = () => {
        data.meta.page = PAGINATION.DEFAULT_PAGE;
        refreshData();
    };
    const setOrder = (field: string, order: string) => {
        data.meta.page = PAGINATION.DEFAULT_PAGE;

        const newOrder = data.meta.order[PAGINATION.ARRAY_FIRST_INDEX] !== field ? 'asc' : order;

        data.meta.order = [field, newOrder];
        refreshData();
    };
    const changePage = (page: number | string) => {
        let goPage = GLOBAL_CONSTANTS.ZERO;
        if ('siguiente' === page) {
            if (data.meta.page < data.meta.total_pages) {
                goPage = data.meta.page + PAGINATION.DEFAULT_PAGE;
            } else {
                return;
            }
        }
        if ('anterior' === page) {
            if (PAGINATION.DEFAULT_PAGE < data.meta.page) {
                goPage = data.meta.page - PAGINATION.DEFAULT_PAGE;
            } else {
                return;
            }
        }

        data.meta.page = goPage;

        refreshData();
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

    //Detectar cambios en itemSelected y crear clase para linea de la tabla
    const classLineTable = (item: any): string => {
        if (itemSelected.value?.fieldCompare !== undefined && itemSelected.value.id === item.id) {
            return 'bg-brand-100 border border-brand dark:bg-brand-700 dark:border-brand-600';
        }
        return 'bg-white border-b dark:bg-gray-800 dark:border-gray-700';
    };
</script>

<template>
    <div class="flex flex-col">
        <slot name="buttons"></slot>
        <div
            v-if="showPerPage || showExportExcel || showSearch"
            class="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 py-2">
            <dropDown
                v-if="showPerPage"
                key="per_page"
                v-model="data.meta.per_page"
                title="Mostrar"
                from="per_page"
                :list="showPerPages" />

            <!-- input buscar -->
            <div v-if="showSearch" class="relative">
                <button
                    class="absolute inset-y-0 rtl:inset-r-0 end-0 flex items-center pe-3 cursor-pointer"
                    title="Click para buscar"
                    @click="setFilter">
                    <svg
                        class="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        fill="none"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2" />
                    </svg>
                </button>

                <button
                    v-if="data.meta.filter"
                    class="absolute inset-y-0 rtl:inset-r-0 end-5 flex items-center pe-3 cursor-pointer"
                    title="Limpiar filtro"
                    @click="clearFiler">
                    <svg
                        class="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-orange-900 dark:hover:text-orange-900"
                        fill="none"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M6 18L18 6M6 6l12 12"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2" />
                    </svg>
                </button>
                <input
                    :id="id + '_table-search-users'"
                    v-model="data.meta.filter"
                    type="text"
                    class="block p-2 ps-2 text-sm text-gray-900 border border-gray-300 rounded-lg w-80 bg-gray-50 focus:ring-brand focus:border-brand dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-brand dark:focus:border-brand"
                    placeholder="Ingrese y presione 'Enter' para buscar"
                    @keyup.enter="setFilter" />
            </div>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                <caption
                    v-if="tablaTitle !== ''"
                    class="py-2 px-2 text-lg font-semibold text-gray-900 bg-white dark:text-white dark:bg-gray-800 w-full">
                    <div class="flex justify-between w-full">
                        <div>
                            {{ tablaTitle }}
                        </div>
                        <div>
                            <loader v-if="loadingData" key="loadingData"></loader>
                        </div>
                    </div>
                </caption>
                <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th
                            v-for="(cols, index) in colspan"
                            :key="index + '_colspan'"
                            scope="colspan"
                            :colspan="cols.colspan">
                            <div class="flex justify-center">
                                {{ cols.title }}
                            </div>
                        </th>
                    </tr>
                </thead>
                <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th
                            v-for="(col, index) in data.columns"
                            :key="index + '_col'"
                            :class="smallLine ? 'py-1 px-2' : 'py-4 px-3'"
                            scope="col">
                            {{ col }}
                        </th>
                    </tr>
                </thead>
                <tbody class="overflow-y-auto max-h-72">
                    <tr v-if="data.data.length === 0" class="text-center">
                        <td :colspan="data.columns.length">
                            <span class="text-xl" v-html="msg"></span>
                        </td>
                    </tr>
                    <tr v-for="(row, index) in data.data" :key="index + '_row'" :class="classLineTable(row)">
                        <td
                            v-for="(col, key) in data.columns"
                            :key="key + '_col'"
                            :class="smallLine ? 'py-1 px-2' : 'py-4 px-3'">
                            <div v-if="col === 'acciones'" class="flex justify-end gap-2" v-html="row[key]"></div>
                            <div v-else>
                                {{ row[key] }}
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <nav class="grid justify-center md:content-center md:flex md:justify-between my-4 w-full px-2 overflow-auto">
            <span class="text-sm font-normal text-gray-500 dark:text-gray-400 h-8 flex items-center gap-1">
                Monstrando
                <span class="font-semibold text-gray-900 dark:text-white">
                    {{ data.meta.from }} al {{ data.meta.to }}
                </span>
                de
                <span class="font-semibold text-gray-900 dark:text-white">
                    {{ data.meta.total }}
                </span>
                Resultados
            </span>

            <ul class="inline-flex -space-x-px rtl:space-x-reverse text-sm h-8">
                <li>
                    <a
                        class="flex items-center justify-center px-3 h-8 ms-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-s-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                        :class="1 == data.meta.page ? 'cursor-not-allowed' : 'cursor-pointer'"
                        @click="changePage('anterior')">
                        Anterior
                    </a>
                </li>
                <li v-if="getLimitPages[0] > 1">
                    <a
                        class="flex items-center justify-center px-3 h-8 text-brand border border-gray-300 bg-brand-50 hover:bg-brand-100 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-700 dark:text-white cursor-pointer"
                        @click="changePage(1)">
                        1
                    </a>
                </li>

                <li v-if="getLimitPages[0] > 1">
                    <a
                        class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white cursor-not-allowed">
                        ...
                    </a>
                </li>

                <li v-for="(page, index) in getLimitPages" :key="index + '_page'">
                    <a
                        v-if="data.meta.page == page"
                        class="flex items-center justify-center px-3 h-8 text-brand border border-gray-300 bg-brand-50 hover:bg-brand-100 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-700 dark:text-white cursor-pointer"
                        aria-current="page"
                        @click="changePage(page)">
                        {{ page }}
                    </a>
                    <a
                        v-else
                        class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white cursor-pointer"
                        @click="changePage(page)">
                        {{ page }}
                    </a>
                </li>

                <li v-if="data.meta.page < data.meta.total_pages">
                    <a
                        class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white cursor-not-allowed">
                        ...
                    </a>
                </li>
                <li
                    v-if="
                        data.meta.page < data.meta.total_pages &&
                        getLimitPages[getLimitPages.length - 1] != data.meta.total_pages
                    ">
                    <a
                        class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white cursor-pointer"
                        @click="changePage(data.meta.total_pages)">
                        {{ data.meta.total_pages }}
                    </a>
                </li>

                <li>
                    <a
                        class="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                        :class="
                            data.meta.total_pages <= data.meta.page || data.meta.total_pages == undefined
                                ? 'cursor-not-allowed'
                                : 'cursor-pointer'
                        "
                        @click="changePage('siguiente')">
                        Siguiente
                    </a>
                </li>
            </ul>
        </nav>
    </div>
</template>
