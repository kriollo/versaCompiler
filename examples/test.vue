<script setup lang="ts">
    import Swal from 'sweetalert2';
    import type { AccionData, actionsType } from 'versaTypes';
    import { computed, inject, onMounted, onUnmounted, ref } from 'vue';

    import FlowCanvas from '@/dashboard/js/chatbot/flowBuilder/components/FlowCanvas.vue';
    import FlowLoadModal from '@/dashboard/js/chatbot/flowBuilder/components/FlowLoadModal.vue';
    import FlowTestModal from '@/dashboard/js/chatbot/flowBuilder/components/FlowTestModal.vue';
    import NodeEditor from '@/dashboard/js/chatbot/flowBuilder/components/NodeEditor.vue';
    import NodePalette from '@/dashboard/js/chatbot/flowBuilder/components/NodePalette.vue';
    import FlowBuilderTable from '@/dashboard/js/chatbot/flowBuilder/FlowBuilderTable.vue';
    import {
        type Connection,
        type FlowNode,
        type NodeType,
        NodeType as NodeTypeEnum,
        type Position,
    } from '@/dashboard/js/chatbot/flowBuilder/types/flow.types';
    import { getNodeDefinition } from '@/dashboard/js/chatbot/flowBuilder/types/nodeDefinitions';
    import Breadcrumb from '@/dashboard/js/components/breadcrumb.vue';
    import LineHr from '@/dashboard/js/components/lineHr.vue';

    const panelShow = ref('table');

    // Definir la interfaz para los items del breadcrumb
    interface BreadcrumbItem {
        type: string;
        title: string;
        icon: string;
        link: string;
    }

    const panelUrl = inject<string>('panelUrl', '');

    const breadCrumbList: BreadcrumbItem[] = [
        {
            type: 'link',
            title: 'Home',
            icon: '<svg class="w-3 h-3 me-2.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z"/></svg>',
            link: `/${panelUrl}/dashboard`,
        },
        {
            type: 'link',
            title: 'Control Panel',
            icon: '<svg class="w-3 h-3 text-gray-400 mx-1" fill="none" viewBox="0 0 6 10" xmlns="http://www.w3.org/2000/svg"><path d="m1 9 4-4-4-4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
            link: `/${panelUrl}/usuarios`,
        },
        {
            type: 'text',
            title: 'Flow Builder',
            icon: '<svg class="w-3 h-3 text-gray-400 mx-1" fill="none" viewBox="0 0 6 10" xmlns="http://www.w3.org/2000/svg"><path d="m1 9 4-4-4-4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
            link: '',
        },
    ];

    // Estado del Flow Builder
    const nodes = ref<FlowNode[]>([]);
    const connections = ref<Connection[]>([]);
    const selectedNodeId = ref<string | null>(null);
    const editorNodeId = ref<string | null>(null); // ID del nodo con editor abierto
    const zoom = ref(1);
    const panOffset = ref<Position>({ x: 400, y: 100 });
    const nodeIdCounter = ref(1);
    const connectionIdCounter = ref(1);
    const isZenMode = ref(false); // Estado del modo zen (pantalla completa)

    // Nodo seleccionado
    const selectedNode = computed(() => {
        if (!editorNodeId.value) {
            return null;
        }
        return nodes.value.find(n => n.id === editorNodeId.value) || null;
    });

    // Panel del editor visible (solo cuando se hace doble clic)
    const isEditorVisible = computed(() => editorNodeId.value !== null);

    // Inicializar con un nodo de inicio
    const initializeFlow = () => {
        const startNode: FlowNode = {
            id: 'node-0',
            type: NodeTypeEnum.START,
            position: { x: 400, y: 100 },
            label: 'Inicio',
            config: {},
            inputs: 0,
            outputs: 1,
            isSelected: false,
        };
        nodes.value.push(startNode);
    };

    // Agregar un nodo al canvas
    const handleAddNode = (nodeType: NodeType, position?: Position) => {
        const definition = getNodeDefinition(nodeType);
        if (!definition) {
            return;
        }

        const newPosition = position || {
            x: 400 + Math.random() * 200,
            y: 200 + Math.random() * 200,
        };

        const newNode: FlowNode = {
            id: `node-${nodeIdCounter.value++}`,
            type: nodeType,
            position: newPosition,
            label: definition.label,
            config: {},
            inputs: definition.defaultInputs,
            outputs: definition.defaultOutputs,
            isSelected: false,
        };

        nodes.value.push(newNode);
    };

    // Seleccionar un nodo
    const handleNodeSelect = (nodeId: string) => {
        // Deseleccionar todos los nodos
        nodes.value.forEach(n => {
            n.isSelected = false;
        });

        // Seleccionar el nodo clickeado
        const node = nodes.value.find(n => n.id === nodeId);
        if (node) {
            node.isSelected = true;
            selectedNodeId.value = nodeId;
        }
    };

    // Eliminar un nodo
    const handleNodeDelete = (nodeId: string) => {
        // No permitir eliminar el nodo de inicio
        const node = nodes.value.find(n => n.id === nodeId);
        if (node?.type === NodeTypeEnum.START) {
            // eslint-disable-next-line no-alert
            alert('No se puede eliminar el nodo de inicio');
            return;
        }

        // Eliminar conexiones relacionadas
        connections.value = connections.value.filter(
            c => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId,
        );

        // Eliminar el nodo
        nodes.value = nodes.value.filter(n => n.id !== nodeId);

        // Deseleccionar si estaba seleccionado
        if (selectedNodeId.value === nodeId) {
            selectedNodeId.value = null;
        }

        // Cerrar editor si estaba abierto para este nodo
        if (editorNodeId.value === nodeId) {
            editorNodeId.value = null;
        }
    };

    // Crear una conexión entre nodos
    const handleConnectionCreate = (connection: Omit<Connection, 'id'>) => {
        // Verificar que no exista ya esta conexión
        const exists = connections.value.some(
            c =>
                c.sourceNodeId === connection.sourceNodeId &&
                c.sourcePortIndex === connection.sourcePortIndex &&
                c.targetNodeId === connection.targetNodeId &&
                c.targetPortIndex === connection.targetPortIndex,
        );

        if (exists) {
            // eslint-disable-next-line no-alert
            alert('Esta conexión ya existe');
            return;
        }

        // Crear la conexión
        const newConnection: Connection = {
            ...connection,
            id: `conn-${connectionIdCounter.value++}`,
        };

        connections.value.push(newConnection);
    };

    // Eliminar una conexión
    const handleConnectionDelete = (connectionId: string) => {
        connections.value = connections.value.filter(
            c => c.id !== connectionId,
        );
    };

    // Actualizar configuración de un nodo
    const handleUpdateNode = (nodeId: string, updates: Partial<FlowNode>) => {
        const node = nodes.value.find(n => n.id === nodeId);
        if (node) {
            Object.assign(node, updates);

            // Si es un nodo de menú, ajustar outputs según la cantidad de opciones
            if (node.type === 'menu' && updates.config?.menuOptions) {
                const optionsCount = updates.config.menuOptions.length;
                // Mínimo 1 output, máximo según las opciones configuradas
                node.outputs = Math.max(1, optionsCount);
            }
        }
    };

    // Mover un nodo a una nueva posición
    const handleNodeMove = (nodeId: string, newPosition: Position) => {
        const node = nodes.value.find(n => n.id === nodeId);
        if (node) {
            node.position = newPosition;
        }
    };

    // Manejar doble click en nodo (abrir editor)
    const handleNodeDblClick = (nodeId: string) => {
        // Seleccionar el nodo visualmente
        handleNodeSelect(nodeId);
        // Abrir el editor solo con doble clic
        editorNodeId.value = nodeId;
    };

    // Actualizar zoom
    const handleUpdateZoom = (newZoom: number) => {
        zoom.value = newZoom;
    };

    // Actualizar pan
    const handleUpdatePan = (newOffset: Position) => {
        panOffset.value = newOffset;
    };

    // Deseleccionar todos los nodos al hacer clic en el canvas
    const handleCanvasClick = () => {
        nodes.value.forEach(n => {
            n.isSelected = false;
        });
        selectedNodeId.value = null;
        editorNodeId.value = null; // Cerrar editor también
    };

    // Cerrar editor
    const handleEditorClose = () => {
        nodes.value.forEach(n => {
            n.isSelected = false;
        });
        selectedNodeId.value = null;
        editorNodeId.value = null; // Cerrar editor
    };

    // Guardar el flujo (simulación - aquí iría la llamada a la API)
    const handleSaveFlow = () => {
        const flowData = {
            nodes: nodes.value,
            connections: connections.value,
        };
        console.log('Guardando flujo:', flowData);
        // eslint-disable-next-line no-alert
        alert('Flujo guardado exitosamente (simulación)');
    };

    // Limpiar el canvas
    const handleClearCanvas = () => {
        // eslint-disable-next-line no-alert
        if (
            confirm(
                '¿Estás seguro de que deseas limpiar el canvas? Esta acción no se puede deshacer.',
            )
        ) {
            nodes.value = [];
            connections.value = [];
            selectedNodeId.value = null;
            editorNodeId.value = null; // Cerrar editor
            nodeIdCounter.value = 1;
            connectionIdCounter.value = 1;
            initializeFlow();
        }
    };

    // Estado de prueba del flujo
    const showTestModal = ref(false);
    const testActiveNodeId = ref<string | null>(null);
    const testVisitedNodeIds = ref<string[]>([]);

    // Abrir modal de prueba
    const handleOpenTestModal = () => {
        if (nodes.value.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Sin nodos',
                text: 'Agrega nodos al flujo antes de probarlo',
            });
            return;
        }
        showTestModal.value = true;
    };

    // Cerrar modal de prueba
    const handleCloseTestModal = () => {
        showTestModal.value = false;
        testActiveNodeId.value = null;
        testVisitedNodeIds.value = [];
    };

    // Actualizar nodo activo desde el modal de prueba
    const handleUpdateActiveNode = (nodeId: string | null) => {
        testActiveNodeId.value = nodeId;
    };

    // Actualizar nodos visitados desde el modal de prueba
    const handleUpdateVisitedNodes = (nodeIds: string[]) => {
        testVisitedNodeIds.value = nodeIds;
    };

    // Modo Zen - Pantalla Completa
    const toggleZenMode = () => {
        isZenMode.value = !isZenMode.value;
    };

    // Cerrar modo zen con tecla ESC
    const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && isZenMode.value) {
            isZenMode.value = false;
        }
    };

    // Agregar listener de teclado
    onMounted(() => {
        window.addEventListener('keydown', handleKeydown);
    });

    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeydown);
    });

    // Modal de importación
    const showImportModal = ref(false);

    // Abrir modal de importación
    const handleOpenImportModal = () => {
        showImportModal.value = true;
    };

    // Cerrar modal de importación
    const handleCloseImportModal = () => {
        showImportModal.value = false;
    };

    // Importar flujo desde el modal
    const handleImportFromModal = (flowData: {
        nodes: FlowNode[];
        connections: Connection[];
    }) => {
        // Limpiar flujo actual
        nodes.value = [];
        connections.value = [];

        // Importar nodos y conexiones
        nodes.value = flowData.nodes;
        connections.value = flowData.connections;

        // Actualizar contadores
        const maxNodeId = Math.max(
            ...nodes.value.map(n => {
                const match = n.id.match(/node-(\d+)/);
                return match && match[1] ? Number.parseInt(match[1], 10) : 0;
            }),
            0,
        );
        nodeIdCounter.value = maxNodeId + 1;

        const maxConnectionId = Math.max(
            ...connections.value.map(c => {
                const match = c.id.match(/conn-(\d+)/);
                return match && match[1] ? Number.parseInt(match[1], 10) : 0;
            }),
            0,
        );
        connectionIdCounter.value = maxConnectionId + 1;
    };

    // Exportar flujo como JSON
    const handleExportFlow = () => {
        const flowData = {
            nodes: nodes.value,
            connections: connections.value,
        };
        const dataStr = JSON.stringify(flowData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'chatbot-flow.json';
        link.click();
        URL.revokeObjectURL(url);
    };

    const accion = (accion: AccionData) => {
        console.log('Acción recibida en FlowBuilderDashboard:', accion.accion);
        const actions: actionsType = {
            newFlow: () => {
                panelShow.value = 'flowBuilder';
            },
            openTable: () => {
                panelShow.value = 'table';
            },
        };
        const fn = actions[accion.accion];
        if (typeof fn === 'function') {
            fn();
        }
    };

    // Inicializar el flujo al montar el componente
    initializeFlow();
</script>

<template>
    <div class="flow-builder-container" :class="{ 'zen-mode': isZenMode }">
        <!-- Breadcrumb -->
        <Breadcrumb
            v-if="!isZenMode"
            title="Flow Builder"
            iconSVG="<svg class='w-[32px] h-[32px] text-gray-800 dark:text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
            <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M13 10V3L4 14h7v7l9-11h-7z'></path>
        </svg>"
            :items="breadCrumbList" />

        <FlowBuilderTable v-if="panelShow === 'table'" @accion="accion" />
        <div
            v-else
            class="flex-1 relative overflow-y-auto"
            :class="{ 'zen-content': isZenMode }">
            <LineHr v-if="!isZenMode" />

            <!-- Toolbar -->
            <div
                class="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
                :class="{ 'zen-toolbar': isZenMode, relative: !isZenMode }">
                <div v-if="!isZenMode" class="flex items-center gap-2">
                    <h2
                        class="text-lg font-semibold text-gray-900 dark:text-white">
                        Editor de Flujo del Chatbot
                    </h2>
                    <span
                        class="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                        {{ nodes.length }} nodos
                    </span>
                    <span
                        class="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                        {{ connections.length }} conexiones
                    </span>
                </div>

                <div class="flex items-center gap-2">
                    <button
                        @click="handleClearCanvas"
                        class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors flex items-center gap-2"
                        title="Limpiar canvas">
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                        Limpiar
                    </button>

                    <button
                        @click="handleOpenImportModal"
                        class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors flex items-center gap-2"
                        title="Importar flujo desde JSON">
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
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L9 8m4-4v12"></path>
                        </svg>
                        Importar
                    </button>

                    <button
                        @click="handleExportFlow"
                        class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors flex items-center gap-2"
                        title="Exportar flujo como JSON">
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
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                        Exportar
                    </button>

                    <button
                        @click="handleOpenTestModal"
                        class="px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 rounded-lg transition-colors flex items-center gap-2"
                        title="Probar flujo">
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
                                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Probar
                    </button>

                    <button
                        @click="handleSaveFlow"
                        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-2"
                        title="Guardar flujo">
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
                                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                        </svg>
                        Guardar
                    </button>
                    <button
                        v-if="!isZenMode"
                        @click="accion({ accion: 'openTable' })"
                        class="p-2 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors flex items-center gap-2"
                        title="Volver a la tabla">
                        <i class="bi bi-arrow-left"></i>
                        Volver a la tabla
                    </button>
                </div>
            </div>

            <!-- Flow Builder Content -->
            <div class="flow-content">
                <!-- Panel Izquierdo: Paleta de Nodos -->
                <NodePalette
                    :class="{ 'zen-palette': isZenMode }"
                    @add-node="nodeType => handleAddNode(nodeType)" />

                <!-- Canvas Central -->
                <div class="canvas-wrapper">
                    <FlowCanvas
                        :nodes="nodes"
                        :connections="connections"
                        :zoom="zoom"
                        :pan-offset="panOffset"
                        :active-node-id="testActiveNodeId"
                        :visited-node-ids="testVisitedNodeIds"
                        :is-zen-mode="isZenMode"
                        @node-select="handleNodeSelect"
                        @node-delete="handleNodeDelete"
                        @node-add="handleAddNode"
                        @connection-create="handleConnectionCreate"
                        @connection-delete="handleConnectionDelete"
                        @update-zoom="handleUpdateZoom"
                        @update-pan="handleUpdatePan"
                        @canvas-click="handleCanvasClick"
                        @node-move="handleNodeMove"
                        @node-dbl-click="handleNodeDblClick"
                        @toggle-zen-mode="toggleZenMode" />
                </div>

                <!-- Panel Derecho: Editor de Nodos (solo visible cuando hay un nodo seleccionado) -->
                <Transition name="slide-left">
                    <NodeEditor
                        v-if="isEditorVisible"
                        :selected-node="selectedNode"
                        :is-zen-mode="isZenMode"
                        @update-node="handleUpdateNode"
                        @close="handleEditorClose" />
                </Transition>
            </div>

            <!-- Modal de Importación -->
            <FlowLoadModal
                :show="showImportModal"
                @close="handleCloseImportModal"
                @import="handleImportFromModal" />

            <!-- Modal de Prueba del Flujo -->
            <FlowTestModal
                :show="showTestModal"
                :nodes="nodes"
                :connections="connections"
                @close="handleCloseTestModal"
                @update-active-node="handleUpdateActiveNode"
                @update-visited-nodes="handleUpdateVisitedNodes" />
        </div>
    </div>
</template>

<style scoped>
    /* Contenedor principal - ocupa toda la altura disponible */
    .flow-builder-container {
        width: 100%;
        height: calc(100vh - 0px);
        min-height: 800px;
        display: flex;
        flex-direction: column;
        background-color: rgb(249 250 251);
        transition: all 0.3s ease;
    }

    .dark .flow-builder-container {
        background-color: rgb(17 24 39);
    }

    /* Modo Zen - Pantalla Completa */
    .flow-builder-container.zen-mode {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 9999;
        background-color: rgb(249 250 251);
    }

    .dark .flow-builder-container.zen-mode {
        background-color: rgb(17 24 39);
    }

    /* Contenido en modo zen */
    .zen-content {
        width: 100%;
        height: 100%;
    }

    /* Contenido del flow builder */
    .flow-content {
        flex: 1 1 0%;
        display: flex;
        overflow: hidden;
        min-height: calc(
            100vh - 140px
        ); /* Altura mínima del viewport menos header y toolbar */
        height: 100vh;
    }

    /* Contenido del flow builder en modo zen */
    .zen-mode .flow-content {
        height: 100%;
        width: 100%;
        min-height: 100vh;
    }

    /* Paleta de nodos - ancho fijo, no se encoge */
    .flow-content > :first-child {
        flex-shrink: 0;
        height: 100%;
    }

    /* Wrapper del canvas - se expande para ocupar todo el espacio disponible */
    .canvas-wrapper {
        flex: 1 1 0%;
        position: relative;
        min-width: 0;
        height: 100%;
        overflow: hidden;
    }

    /* Canvas wrapper en modo zen */
    .zen-mode .canvas-wrapper {
        width: 100%;
        height: 100%;
    }

    /* Paleta de nodos en modo zen - flotante y semi-transparente */
    .zen-palette {
        position: absolute;
        left: 20px;
        top: 120px;
        z-index: 10000;
        max-height: calc(100vh - 140px);
        overflow-y: auto;
        background-color: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    }

    .dark .zen-palette {
        background-color: rgba(31, 41, 55, 0.95);
    }

    /* Toolbar en modo zen - flotante en la parte superior */
    .zen-toolbar {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        background-color: rgba(255, 255, 255, 0.95) !important;
        backdrop-filter: blur(10px);
        border-radius: 12px !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        border: 2px solid rgba(229, 231, 235, 0.5) !important;
        width: auto;
        max-width: calc(100vw - 40px);
    }

    .dark .zen-toolbar {
        background-color: rgba(31, 41, 55, 0.95) !important;
        border: 2px solid rgba(75, 85, 99, 0.5) !important;
    }

    /* Transición para el panel del editor */
    .slide-left-enter-active,
    .slide-left-leave-active {
        transition: all 0.3s ease;
    }

    .slide-left-enter-from {
        transform: translateX(100%);
        opacity: 0;
    }

    .slide-left-leave-to {
        transform: translateX(100%);
        opacity: 0;
    }
</style>
