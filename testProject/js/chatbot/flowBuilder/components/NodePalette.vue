<script setup lang="ts">
    import { ref } from 'vue';

    import type { NodeDefinition, NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
    import { getNodesByCategory, NODE_DEFINITIONS } from '@/dashboard/js/chatbot/flowBuilder/types/nodeDefinitions';

    type PaletteCategory = NodeDefinition['category'] | 'all';

    const emit = defineEmits<{
        addNode: [nodeType: NodeType];
    }>();

    // Estado del panel
    const searchQuery = ref('');
    const selectedCategory = ref<PaletteCategory>('all');
    const isCollapsed = ref(false);

    // Categorías disponibles
    const categories: { id: PaletteCategory; label: string; icon: string }[] = [
        { id: 'all', label: 'Todos', icon: '🔷' },
        { id: 'flow', label: 'Eventos y Flujo', icon: '⚡' },
        { id: 'interaction', label: 'Interacción', icon: '💬' },
        { id: 'logic', label: 'Lógica y Control', icon: '🧠' },
        { id: 'integration', label: 'Datos e Integración', icon: '🔗' },
        { id: 'ai_tool', label: 'IA Tools', icon: '🛠️' },
    ];

    // Filtrar nodos según búsqueda y categoría
    const filteredNodes = ref<NodeDefinition[]>([]);

    const updateFilteredNodes = () => {
        let nodes = NODE_DEFINITIONS;

        // Filtrar por categoría
        if (selectedCategory.value !== 'all') {
            nodes = getNodesByCategory(selectedCategory.value);
        }

        // Filtrar por búsqueda
        if (searchQuery.value.trim()) {
            const query = searchQuery.value.toLowerCase();
            nodes = nodes.filter(
                node => node.label.toLowerCase().includes(query) || node.description.toLowerCase().includes(query),
            );
        }

        filteredNodes.value = nodes;
    };

    // Inicializar nodos filtrados
    updateFilteredNodes();

    // Manejar cambio de categoría
    const handleCategoryChange = (categoryId: PaletteCategory) => {
        selectedCategory.value = categoryId;
        updateFilteredNodes();
    };

    // Manejar búsqueda
    const handleSearch = () => {
        updateFilteredNodes();
    };

    // Iniciar drag de un nodo
    const handleDragStart = (event: DragEvent, nodeType: NodeType) => {
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'copy';
            event.dataTransfer.setData('application/json', JSON.stringify({ nodeType }));
        }
    };

    // Agregar nodo con doble clic
    const handleNodeDoubleClick = (nodeType: NodeType) => {
        emit('addNode', nodeType);
    };

    // Toggle colapsar panel
    const toggleCollapse = () => {
        isCollapsed.value = !isCollapsed.value;
    };
</script>

<template>
    <div
        class="node-palette h-full flex flex-col border-r border-gray-200 dark:border-gray-700 transition-all duration-300"
        :class="isCollapsed ? 'w-12' : 'w-64'">
        <!-- Header del Panel -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 v-if="!isCollapsed" class="text-sm font-semibold text-gray-900 dark:text-white">Nodos Disponibles</h2>
            <button
                @click="toggleCollapse"
                class="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                :title="isCollapsed ? 'Expandir panel' : 'Colapsar panel'">
                <svg
                    class="w-5 h-5 transition-transform duration-300"
                    :class="{ 'rotate-180': isCollapsed }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
                </svg>
            </button>
        </div>

        <!-- Contenido del Panel (solo visible cuando no está colapsado) -->
        <div v-if="!isCollapsed" class="flex-1 flex flex-col overflow-hidden">
            <!-- Barra de Búsqueda -->
            <div class="px-3 py-3">
                <div class="relative">
                    <input
                        v-model="searchQuery"
                        @input="handleSearch"
                        type="text"
                        placeholder="Buscar nodos..."
                        class="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
                    <svg
                        class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </div>
            </div>

            <!-- Filtros de Categoría -->
            <div class="px-3 pb-2">
                <div class="flex flex-wrap gap-1">
                    <button
                        v-for="category in categories"
                        :key="category.id"
                        @click="handleCategoryChange(category.id)"
                        class="px-2 py-1 text-xs rounded-md transition-all duration-200"
                        :class="
                            selectedCategory === category.id
                                ? 'bg-brand dark:bg-brand text-white font-medium'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        ">
                        <span class="mr-1">{{ category.icon }}</span>
                        {{ category.label }}
                    </button>
                </div>
            </div>

            <!-- Lista de Nodos -->
            <div class="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                <!-- Mensaje cuando no hay resultados -->
                <div
                    v-if="filteredNodes.length === 0"
                    class="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                    <svg
                        class="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p>No se encontraron nodos</p>
                </div>

                <!-- Nodos Disponibles -->
                <div
                    v-for="node in filteredNodes"
                    :key="node.type"
                    :draggable="true"
                    @dragstart="e => handleDragStart(e, node.type)"
                    @dblclick="handleNodeDoubleClick(node.type)"
                    class="node-item group cursor-move bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 hover:shadow-md">
                    <div class="flex items-start gap-3">
                        <!-- Icono del Nodo -->
                        <div
                            :class="node.color"
                            class="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
                            <div v-html="node.icon"></div>
                        </div>

                        <!-- Información del Nodo -->
                        <div class="flex-1 min-w-0">
                            <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-0.5">
                                {{ node.label }}
                            </h3>
                            <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                {{ node.description }}
                            </p>
                        </div>

                        <!-- Indicador de Drag -->
                        <div
                            class="flex-shrink-0 text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors">
                            <svg
                                class="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M4 8h16M4 16h16"></path>
                            </svg>
                        </div>
                    </div>

                    <!-- Hint de Drag -->
                    <div
                        class="mt-2 text-xs text-gray-400 dark:text-gray-500 italic opacity-0 group-hover:opacity-100 transition-opacity">
                        Arrastra o haz doble clic para añadir
                    </div>
                </div>
            </div>
        </div>

        <!-- Vista Colapsada - Iconos -->
        <div v-else class="flex-1 overflow-y-auto py-2">
            <div class="flex flex-col items-center gap-2">
                <button
                    v-for="node in NODE_DEFINITIONS.slice(0, 10)"
                    :key="node.type"
                    @click="handleNodeDoubleClick(node.type)"
                    :title="node.label"
                    :class="node.color"
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:scale-110 transition-transform shadow-sm">
                    <div v-html="node.icon" class="w-5 h-5"></div>
                </button>
            </div>
        </div>

        <!-- Footer con Tips -->
        <div
            v-if="!isCollapsed"
            class="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div class="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                <svg
                    class="w-4 h-4 flex-shrink-0 mt-0.5 text-brand dark:text-brand-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p>Arrastra los nodos al canvas o haz doble clic para añadirlos al centro</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
    .node-item {
        user-select: none;
    }

    .node-item:active {
        cursor: grabbing;
        opacity: 0.7;
    }

    /* Estilos para el scroll */
    .overflow-y-auto::-webkit-scrollbar {
        width: 6px;
    }

    .overflow-y-auto::-webkit-scrollbar-track {
        @apply bg-gray-100 dark:bg-gray-800;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb {
        @apply bg-gray-300 dark:bg-gray-600 rounded-full;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb:hover {
        @apply bg-gray-400 dark:bg-gray-500;
    }

    /* Animación para line-clamp */
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
</style>
