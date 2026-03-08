<script setup lang="ts">
    import { computed, inject, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

    // Inyectar el menú desde el provider
    const menu_user = inject<any[]>('menu_user', []);

    const props = defineProps({
        placeholder: {
            type: String,
            default: 'Buscar opciones de menú...',
        },
    });

    const panelUrl = inject<string>('panelUrl', ''); // Obtiene el panel URL desde la inyección

    const searchQuery = ref('');
    const isOpen = ref(false);
    const selectedIndex = ref<number>(0);
    const inputRef = ref<HTMLInputElement | null>(null);
    const resultsContainerRef = ref<HTMLElement | null>(null);

    // Computed para obtener los items del menú
    const items = computed(() => (Array.isArray(menu_user) ? menu_user : []));

    const filteredItems = computed(() => {
        if (!searchQuery.value.trim()) {
            return items.value;
        }
        const query = searchQuery.value.toLowerCase().trim();
        return items.value.filter((item: any) => {
            const submenuName = item.desc_submenu?.toLowerCase() || '';
            const menuName = item.desc_menu?.toLowerCase() || '';
            const seccion = item.seccion?.toLowerCase() || '';
            return submenuName.includes(query) || menuName.includes(query) || seccion.includes(query);
        });
    });

    const openLauncher = () => {
        isOpen.value = true;
        selectedIndex.value = 0;
        nextTick(() => {
            inputRef.value?.focus();
        });
    };

    const closeLauncher = () => {
        isOpen.value = false;
        searchQuery.value = '';
        selectedIndex.value = 0;
    };

    const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (selectedIndex.value < filteredItems.value.length - 1) {
                selectedIndex.value++;
            }
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (selectedIndex.value > 0) {
                selectedIndex.value--;
            }
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (filteredItems.value[selectedIndex.value]) {
                navigateTo(filteredItems.value[selectedIndex.value]);
            }
        } else if (event.key === 'Escape') {
            closeLauncher();
        }
    };

    const navigateTo = (item: any) => {
        if (item.url_submenu) {
            window.location.href = `/${panelUrl}/${item.url_submenu}`;
        }
        closeLauncher();
    };

    // Atajo de teclado global para abrir/cerrar el launcher
    const handleGlobalKeydown = (event: KeyboardEvent) => {
        // Ctrl+K o Cmd+K para abrir/cerrar
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            if (isOpen.value) {
                closeLauncher();
            } else {
                openLauncher();
            }
        }
        // ESC para cerrar el launcher cuando está abierto
        if (event.key === 'Escape' && isOpen.value) {
            event.preventDefault();
            closeLauncher();
        }
    };

    onMounted(() => {
        document.addEventListener('keydown', handleGlobalKeydown);
    });

    onUnmounted(() => {
        document.removeEventListener('keydown', handleGlobalKeydown);
    });

    // Reset selectedIndex cuando cambia la búsqueda
    watch(searchQuery, () => {
        selectedIndex.value = 0;
    });

    // Scroll al elemento seleccionado cuando cambia el índice
    const scrollToSelected = () => {
        nextTick(() => {
            const container = resultsContainerRef.value;
            if (!container) {
                return;
            }

            const selectedElement = container.querySelector(`[data-index="${selectedIndex.value}"]`) as HTMLElement;
            if (selectedElement) {
                // Calcular si el elemento está fuera de la vista
                const containerRect = container.getBoundingClientRect();
                const elementRect = selectedElement.getBoundingClientRect();

                // Si el elemento está por debajo de la vista
                if (elementRect.bottom > containerRect.bottom) {
                    container.scrollTop += elementRect.bottom - containerRect.bottom + 10;
                }
                // Si el elemento está por encima de la vista
                else if (elementRect.top < containerRect.top) {
                    container.scrollTop -= containerRect.top - elementRect.top + 10;
                }
            }
        });
    };

    // Observar cambios en selectedIndex para hacer scroll
    watch(selectedIndex, () => {
        scrollToSelected();
    });
</script>
<template>
    <div class="raycast-launcher-container">
        <!-- Botón para abrir el launcher -->
        <button
            @click="openLauncher"
            type="button"
            class="raycast-trigger group flex items-center gap-3 w-full max-w-xl mx-auto px-4 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ease-out hover:border-brand-400 dark:hover:border-brand hover:bg-white dark:hover:bg-gray-800">
            <svg
                class="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-brand transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <span class="flex-1 text-left text-gray-500 dark:text-gray-400 text-sm">Buscar opciones de menú...</span>
            <kbd
                class="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600"
                title="Control (o Comando en Mac) + K">
                <span class="text-xs">⌘/Ctrl</span>
                + K
            </kbd>
        </button>

        <!-- Modal/Overlay del launcher (sin teleport, usando position fixed) -->
        <transition name="raycast-fade">
            <div
                v-if="isOpen"
                class="raycast-overlay fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]"
                @click.self="closeLauncher">
                <!-- Backdrop blur -->
                <div class="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"></div>

                <!-- Launcher panel -->
                <transition name="raycast-scale">
                    <div
                        v-if="isOpen"
                        class="raycast-panel relative w-full max-w-2xl mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <!-- Header con input de búsqueda -->
                        <div
                            class="raycast-header flex items-center gap-3 px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                            <svg
                                class="w-5 h-5 text-gray-400 dark:text-gray-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <input
                                ref="inputRef"
                                v-model="searchQuery"
                                @keydown="handleKeydown"
                                type="text"
                                :placeholder="placeholder"
                                class="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white text-lg placeholder-gray-400 dark:placeholder-gray-500"
                                autocomplete="off" />
                            <kbd
                                class="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                                @click="closeLauncher">
                                ESC
                            </kbd>
                        </div>

                        <!-- Lista de resultados -->
                        <div ref="resultsContainerRef" class="raycast-results max-h-[400px] overflow-y-auto">
                            <div v-if="filteredItems.length === 0" class="px-4 py-8 text-center">
                                <svg
                                    class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="1.5"
                                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <p class="text-gray-500 dark:text-gray-400 text-sm">No se encontraron opciones</p>
                            </div>

                            <div v-else class="py-2">
                                <div
                                    v-for="(item, index) in filteredItems"
                                    :key="'raycast-item-' + index"
                                    :data-index="index"
                                    @click="navigateTo(item)"
                                    @mouseenter="selectedIndex = index"
                                    :class="[
                                        'raycast-item flex items-center gap-4 px-4 py-3 mx-2 rounded-xl cursor-pointer transition-all duration-150',
                                        selectedIndex === index
                                            ? 'bg-brand text-white shadow-lg shadow-blue-500/25'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-200',
                                    ]">
                                    <!-- Icono SVG del menú -->
                                    <div
                                        :class="[
                                            'raycast-item-icon flex items-center justify-center w-10 h-10 rounded-xl',
                                            selectedIndex === index
                                                ? 'bg-white/20'
                                                : 'bg-brand-100 dark:bg-brand-900/30',
                                        ]">
                                        <svg
                                            class="w-5 h-5"
                                            :class="[
                                                selectedIndex === index
                                                    ? 'text-white'
                                                    : 'text-brand dark:text-brand-400',
                                            ]"
                                            :fill="item.fill_menu ? 'currentColor' : 'none'"
                                            :stroke="item.fill_menu ? 'none' : 'currentColor'"
                                            viewBox="0 0 24 24"
                                            v-html="item.ico_menu"></svg>
                                    </div>

                                    <!-- Contenido -->
                                    <div class="flex-1 min-w-0">
                                        <div
                                            :class="[
                                                'font-medium truncate',
                                                selectedIndex === index
                                                    ? 'text-white'
                                                    : 'text-gray-900 dark:text-white',
                                            ]">
                                            {{ item.desc_submenu }}
                                        </div>
                                        <div
                                            :class="[
                                                'text-sm truncate mt-0.5',
                                                selectedIndex === index
                                                    ? 'text-white/70'
                                                    : 'text-gray-500 dark:text-gray-400',
                                            ]">
                                            {{ item.seccion }} → {{ item.desc_menu }}
                                        </div>
                                    </div>

                                    <!-- Indicador de selección -->
                                    <div v-if="selectedIndex === index" class="flex items-center gap-2">
                                        <span class="text-xs text-white/70">Abrir</span>
                                        <kbd class="px-1.5 py-0.5 bg-white/20 text-white text-xs rounded">↵</kbd>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div
                            class="raycast-footer flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                            <div class="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                                <span class="flex items-center gap-1">
                                    <kbd
                                        class="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600 shadow-sm">
                                        ↑
                                    </kbd>
                                    <kbd
                                        class="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600 shadow-sm">
                                        ↓
                                    </kbd>
                                    <span>Navegar</span>
                                </span>
                                <span class="flex items-center gap-1">
                                    <kbd
                                        class="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600 shadow-sm">
                                        ↵
                                    </kbd>
                                    <span>Abrir</span>
                                </span>
                                <span class="flex items-center gap-1">
                                    <kbd
                                        class="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600 shadow-sm">
                                        ESC
                                    </kbd>
                                    <span>Cerrar</span>
                                </span>
                            </div>
                            <span class="text-xs text-gray-500 dark:text-gray-500">
                                {{ filteredItems.length }} resultados
                            </span>
                        </div>
                    </div>
                </transition>
            </div>
        </transition>
    </div>
</template>
