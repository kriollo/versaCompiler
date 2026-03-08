<script setup lang="ts">
    import Swal from 'sweetalert2';
    import { computed, ref } from 'vue';

    import FlowInstrucciones from '@/dashboard/js/chatbot/flowBuilder/components/FlowInstrucciones.vue';
    import FlowNodeComponent from '@/dashboard/js/chatbot/flowBuilder/components/FlowNode.vue';
    import FlowZoomControls from '@/dashboard/js/chatbot/flowBuilder/components/FlowZoomControls.vue';
    import type { Connection, FlowNode, NodeType, Position } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
    import { versaAlert } from '@/dashboard/js/functions';

    interface Props {
        nodes: FlowNode[];
        connections: Connection[];
        nodeValidationMap?: Record<string, 'error' | 'warning'>;
        zoom: number;
        panOffset: Position;
        activeNodeId?: string | null;
        visitedNodeIds?: string[];
        isZenMode?: boolean;
    }

    const props = withDefaults(defineProps<Props>(), {
        isZenMode: false,
    });

    const emit = defineEmits<{
        nodeSelect: [nodeId: string];
        nodeDelete: [nodeId: string];
        nodeAdd: [nodeType: NodeType, position: Position];
        connectionCreate: [connection: Omit<Connection, 'id'>];
        connectionDelete: [connectionId: string];
        updateZoom: [zoom: number];
        updatePan: [offset: Position];
        canvasClick: [];
        nodeMove: [nodeId: string, newPosition: Position];
        nodeDblClick: [nodeId: string];
        toggleZenMode: [];
    }>();

    // Referencias
    const canvasRef = ref<HTMLElement | null>(null);
    const svgRef = ref<SVGSVGElement | null>(null);

    // Estado del canvas
    const isPanning = ref(false);
    const panStart = ref<Position>({ x: 0, y: 0 });
    const isPanMode = ref(false); // Modo mano para mover el canvas
    const isConnecting = ref(false);
    const connectionStart = ref<{
        nodeId: string;
        portIndex: number;
        position: Position;
    } | null>(null);
    const currentMousePosition = ref<Position>({ x: 0, y: 0 });

    // Estado de selección múltiple
    const isSelectionMode = ref(false);
    const isSelecting = ref(false);
    const selectionStart = ref<Position>({ x: 0, y: 0 });
    const selectionEnd = ref<Position>({ x: 0, y: 0 });
    const selectedNodeIds = ref<Set<string>>(new Set());
    const isDraggingSelection = ref(false);
    const showUnconnectedMarkers = ref(true);
    const dragStartPositions = ref<Map<string, Position>>(new Map());
    let currentNodeHeightCache: Map<string, number> | null = null;

    // Mini Map state
    const showMiniMap = ref(true);
    const miniMapWidth = 180;
    const miniMapHeight = 120;

    // Calcular bounds del flujo
    const flowBounds = computed(() => {
        if (props.nodes.length === 0) {
            return { minX: 0, minY: 0, maxX: 1000, maxY: 800 };
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        props.nodes.forEach(node => {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + 180);
            maxY = Math.max(maxY, node.position.y + 80);
        });

        const padding = 100;
        return {
            minX: minX - padding,
            minY: minY - padding,
            maxX: maxX + padding,
            maxY: maxY + padding,
        };
    });

    const flowWidth = computed(() => flowBounds.value.maxX - flowBounds.value.minX);
    const flowHeight = computed(() => flowBounds.value.maxY - flowBounds.value.minY);

    const miniMapScale = computed(() => {
        const scaleX = miniMapWidth / flowWidth.value;
        const scaleY = miniMapHeight / flowHeight.value;
        return Math.min(scaleX, scaleY, 0.15);
    });

    const miniMapNodes = computed(() => {
        const scale = miniMapScale.value;
        const offsetX = -flowBounds.value.minX * scale;
        const offsetY = -flowBounds.value.minY * scale;

        const colorMap: Record<string, string> = {
            start: '#22c55e',
            message: '#3b82f6',
            question: '#8b5cf6',
            menu: '#06b6d4',
            customer_register: '#f43f5e',
            condition: '#f59e0b',
            api_call: '#6366f1',
            webhook: '#ec4899',
            delay: '#f97316',
            variable: '#14b8a6',
            send_to: '#10b981',
            flow: '#8b5cf6',
            end: '#ef4444',
            ai_agent: '#6366f1',
            router: '#f59e0b',
            error_handler: '#f87171',
            loop: '#14b8a6',
            parallel: '#6366f1',
            cache: '#10b981',
            json_menu: '#f97316',
            ai_tool_variable: '#14b8a6',
            ai_tool_json_extract: '#0ea5e9',
            ai_tool_template_render: '#d946ef',
            ai_tool_condition_eval: '#f59e0b',
            ai_tool_datetime: '#10b981',
            ai_tool_text_utils: '#06b6d4',
            ai_tool_http: '#f43f5e',
            list_render: '#84cc16',
            merge: '#a855f7',
        };

        return props.nodes.map(node => ({
            id: node.id,
            x: node.position.x * scale + offsetX,
            y: node.position.y * scale + offsetY,
            width: 20,
            height: 12,
            color: colorMap[node.type] || '#6b7280',
        }));
    });

    const miniMapConnections = computed(() => {
        const scale = miniMapScale.value;
        const offsetX = -flowBounds.value.minX * scale;
        const offsetY = -flowBounds.value.minY * scale;

        return props.connections.map(conn => {
            const sourceNode = props.nodes.find(n => n.id === conn.sourceNodeId);
            const targetNode = props.nodes.find(n => n.id === conn.targetNodeId);

            if (!sourceNode || !targetNode) {
                return { id: conn.id, x1: 0, y1: 0, x2: 0, y2: 0 };
            }

            const sourceX = sourceNode.position.x * scale + offsetX + 10;
            const sourceY = sourceNode.position.y * scale + offsetY + 6;
            const targetX = targetNode.position.x * scale + offsetX + 10;
            const targetY = targetNode.position.y * scale + offsetY + 6;

            return {
                id: conn.id,
                x1: sourceX,
                y1: sourceY,
                x2: targetX,
                y2: targetY,
            };
        });
    });

    const miniMapViewport = computed(() => {
        if (!canvasRef.value) {
            return { x: 0, y: 0, width: 50, height: 40 };
        }

        const scale = miniMapScale.value;
        const offsetX = -flowBounds.value.minX * scale;
        const offsetY = -flowBounds.value.minY * scale;

        const canvasRect = canvasRef.value.getBoundingClientRect();
        const viewWidth = canvasRect.width / props.zoom;
        const viewHeight = canvasRect.height / props.zoom;
        const viewX = -props.panOffset.x / props.zoom;
        const viewY = -props.panOffset.y / props.zoom;

        return {
            x: viewX * scale + offsetX,
            y: viewY * scale + offsetY,
            width: viewWidth * scale,
            height: viewHeight * scale,
        };
    });

    const handleMiniMapClick = (event: MouseEvent) => {
        const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        const scale = miniMapScale.value;
        const offsetX = -flowBounds.value.minX * scale;
        const offsetY = -flowBounds.value.minY * scale;

        const targetFlowX = (clickX - offsetX) / scale;
        const targetFlowY = (clickY - offsetY) / scale;

        if (canvasRef.value) {
            const canvasRect = canvasRef.value.getBoundingClientRect();
            const newPanX = -targetFlowX * props.zoom + canvasRect.width / 2;
            const newPanY = -targetFlowY * props.zoom + canvasRect.height / 2;

            emit('updatePan', { x: newPanX, y: newPanY });
        }
    };

    // Calcular transform del canvas
    const canvasTransform = computed(
        () => `translate(${props.panOffset.x}px, ${props.panOffset.y}px) scale(${props.zoom})`,
    );

    // Manejar clic en el canvas (deseleccionar nodos)
    const handleCanvasClick = (event: MouseEvent) => {
        if (event.target === canvasRef.value) {
            emit('canvasClick');
        }
    };

    // Manejar selección de nodo
    const handleNodeSelect = (nodeId: string) => {
        emit('nodeSelect', nodeId);
    };

    // Manejar eliminación de nodo
    const handleNodeDelete = (nodeId: string) => {
        emit('nodeDelete', nodeId);
    };

    // Manejar movimiento de nodo
    const handleNodeMove = (nodeId: string, deltaX: number, deltaY: number) => {
        const node = props.nodes.find(n => n.id === nodeId);
        if (!node) {
            return;
        }

        const newPosition: Position = {
            x: node.position.x + deltaX,
            y: node.position.y + deltaY,
        };

        emit('nodeMove', nodeId, newPosition);
    };

    // Manejar doble clic en nodo
    const handleNodeDblClick = (nodeId: string) => {
        emit('nodeDblClick', nodeId);
    };

    // Iniciar conexión desde un puerto de salida
    const handleConnectStart = (nodeId: string, portIndex: number, portType: 'input' | 'output') => {
        if (portType !== 'output') {
            return;
        }

        const node = props.nodes.find(n => n.id === nodeId);
        if (!node) {
            return;
        }

        const portPosition = getPortPosition(nodeId, portIndex, 'output');
        if (!portPosition) {
            return;
        }

        isConnecting.value = true;
        connectionStart.value = {
            nodeId,
            portIndex,
            position: portPosition,
        };
    };

    // Finalizar conexión en un puerto de entrada
    const handleConnectEnd = (targetNodeId: string, targetPortIndex: number) => {
        if (!isConnecting.value || !connectionStart.value) {
            return;
        }

        // No permitir conectar un nodo consigo mismo
        if (connectionStart.value.nodeId === targetNodeId) {
            isConnecting.value = false;
            connectionStart.value = null;
            return;
        }

        // Crear la conexión
        emit('connectionCreate', {
            sourceNodeId: connectionStart.value.nodeId,
            sourcePortIndex: connectionStart.value.portIndex,
            targetNodeId,
            targetPortIndex,
        });

        // Limpiar estado de conexión
        setTimeout(() => {
            isConnecting.value = false;
            connectionStart.value = null;
        }, 50);
    };

    // Obtener altura real del nodo desde el DOM
    const getNodeHeight = (nodeId: string): number => {
        const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement;
        if (nodeElement) {
            const rect = nodeElement.getBoundingClientRect();
            return rect.height / props.zoom; // Ajustar por el zoom
        }
        return 100; // Altura por defecto si no se encuentra el elemento
    };

    // Obtener número de puertos de salida según tipo de nodo
    const getOutputPortsCount = (node: FlowNode): number => {
        if (node.type === 'menu') {
            if (node.config.menuSingleOutput === true) {
                return 1;
            }
            return node.config.menuOptions?.length || 1;
        }
        if (node.type === 'json_menu') {
            if (node.config.jsonMenuSingleOutput === true) {
                return 1;
            }
            return Math.min(node.config.jsonMenuMaxItems || 10, 10);
        }
        return node.outputs;
    };

    const getPortPosition = (nodeId: string, portIndex: number, portType: 'input' | 'output'): Position | null => {
        const node = props.nodes.find(n => n.id === nodeId);
        if (!node) {
            return null;
        }

        const nodeWidth = 200;
        const nodeHeight = currentNodeHeightCache?.get(nodeId) ?? getNodeHeight(nodeId);
        const portSize = 14;
        const portRadius = portSize / 2;

        if (currentNodeHeightCache && !currentNodeHeightCache.has(nodeId)) {
            currentNodeHeightCache.set(nodeId, nodeHeight);
        }

        const { x: nodeX, y: nodeY } = node.position;
        let x = nodeX + nodeWidth / 2;
        let y = nodeY;

        if (portType === 'input') {
            y = nodeY - portRadius;
        } else {
            y = nodeY + nodeHeight + portRadius;
        }

        const portCount = portType === 'input' ? node.inputs : getOutputPortsCount(node);
        if (portCount > 1) {
            const spacing = 28;
            const totalWidth = (portCount - 1) * spacing;
            x = x - totalWidth / 2 + portIndex * spacing;
        }

        return { x, y };
    };

    const generateSmoothPath = (sourcePos: Position, targetPos: Position): string => {
        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;

        if (dy >= -10) {
            const verticalOffset = Math.max(Math.abs(dy) * 0.6, 60);
            const horizontalMidpoint = sourcePos.x + dx * 0.5;

            return [
                `M ${sourcePos.x} ${sourcePos.y}`,
                `C ${sourcePos.x} ${sourcePos.y + verticalOffset}`,
                `${horizontalMidpoint} ${sourcePos.y + verticalOffset}`,
                `${horizontalMidpoint} ${(sourcePos.y + targetPos.y) / 2}`,
                `S ${targetPos.x} ${targetPos.y - verticalOffset}`,
                `${targetPos.x} ${targetPos.y}`,
            ].join(' ');
        }

        const midX = (sourcePos.x + targetPos.x) / 2;
        const midY = (sourcePos.y + targetPos.y) / 2;
        const spread = Math.min(Math.abs(dx) * 0.5, 150);
        const controlX = dx >= 0 ? sourcePos.x + spread : sourcePos.x - spread;

        return [
            `M ${sourcePos.x} ${sourcePos.y}`,
            `C ${sourcePos.x} ${sourcePos.y + 80}`,
            `${controlX} ${midY + 40}`,
            `${midX} ${midY}`,
            `S ${targetPos.x} ${targetPos.y - 80}`,
            `${targetPos.x} ${targetPos.y}`,
        ].join(' ');
    };

    const renderConnections = () => {
        const nodeHeightCache = new Map<string, number>();
        currentNodeHeightCache = nodeHeightCache;

        const renderedConnections = props.connections.map(connection => {
            const sourceNode = props.nodes.find(n => n.id === connection.sourceNodeId);
            const targetNode = props.nodes.find(n => n.id === connection.targetNodeId);

            if (!sourceNode || !targetNode) {
                return null;
            }

            const sourceHeight = nodeHeightCache.get(connection.sourceNodeId) ?? getNodeHeight(connection.sourceNodeId);
            nodeHeightCache.set(connection.sourceNodeId, sourceHeight);

            const sourcePos = getPortPosition(connection.sourceNodeId, connection.sourcePortIndex || 0, 'output');
            const targetPos = getPortPosition(connection.targetNodeId, connection.targetPortIndex || 0, 'input');

            if (!sourcePos || !targetPos) {
                return null;
            }

            const path = generateSmoothPath(sourcePos, targetPos);

            return {
                id: connection.id,
                path,
                sourcePos,
                targetPos,
                sourceNode: sourceNode.type,
                sourcePortIndex: connection.sourcePortIndex || 0,
            };
        });

        currentNodeHeightCache = null;

        return renderedConnections;
    };

    const handleCanvasMouseMove = (event: MouseEvent) => {
        if (!canvasRef.value) {
            return;
        }

        const rect = canvasRef.value.getBoundingClientRect();
        const canvasX = (event.clientX - rect.left - props.panOffset.x) / props.zoom;
        const canvasY = (event.clientY - rect.top - props.panOffset.y) / props.zoom;

        currentMousePosition.value = { x: canvasX, y: canvasY };

        // Actualizar rectángulo de selección
        if (isSelecting.value) {
            selectionEnd.value = { x: canvasX, y: canvasY };
            updateSelectedNodes();
            return;
        }

        // Mover nodos seleccionados
        if (isDraggingSelection.value) {
            const dx = canvasX - panStart.value.x;
            const dy = canvasY - panStart.value.y;

            selectedNodeIds.value.forEach(nodeId => {
                const startPos = dragStartPositions.value.get(nodeId);
                if (startPos) {
                    emit('nodeMove', nodeId, {
                        x: startPos.x + dx,
                        y: startPos.y + dy,
                    });
                }
            });
            return;
        }

        // Si está arrastrando para hacer pan
        if (isPanning.value) {
            const dx = event.clientX - panStart.value.x;
            const dy = event.clientY - panStart.value.y;

            emit('updatePan', {
                x: props.panOffset.x + dx,
                y: props.panOffset.y + dy,
            });

            panStart.value = { x: event.clientX, y: event.clientY };
        }
    };

    // Iniciar pan del canvas
    const handleCanvasMouseDown = (event: MouseEvent) => {
        // Verificar que no sea un clic en un nodo o puerto
        const target = event.target as HTMLElement;
        const isNodeClick = target.closest('.flow-node');
        const isPortClick = target.closest('.node-port');

        if (!canvasRef.value) {
            return;
        }

        const rect = canvasRef.value.getBoundingClientRect();
        const canvasX = (event.clientX - rect.left - props.panOffset.x) / props.zoom;
        const canvasY = (event.clientY - rect.top - props.panOffset.y) / props.zoom;

        // Modo selección múltiple
        if (isSelectionMode.value && event.button === 0) {
            // Si hay un clic en un puerto, ignorar (para conexiones)
            if (isPortClick) {
                return;
            }

            // Verificar si se hace clic en un nodo seleccionado para moverlo
            const clickedNode = props.nodes.find(node => {
                const nodeWidth = 200;
                const nodeHeight = 100;
                return (
                    canvasX >= node.position.x &&
                    canvasX <= node.position.x + nodeWidth &&
                    canvasY >= node.position.y &&
                    canvasY <= node.position.y + nodeHeight &&
                    selectedNodeIds.value.has(node.id)
                );
            });

            if (clickedNode) {
                // Iniciar arrastre de nodos seleccionados
                isDraggingSelection.value = true;
                dragStartPositions.value.clear();

                // Guardar posiciones iniciales de todos los nodos seleccionados
                selectedNodeIds.value.forEach(nodeId => {
                    const node = props.nodes.find(n => n.id === nodeId);
                    if (node) {
                        dragStartPositions.value.set(nodeId, { ...node.position });
                    }
                });

                panStart.value = { x: canvasX, y: canvasY };
                event.preventDefault();
            } else if (!isNodeClick) {
                // Iniciar nueva selección (solo si NO se hizo clic en un nodo)
                isSelecting.value = true;
                selectionStart.value = { x: canvasX, y: canvasY };
                selectionEnd.value = { x: canvasX, y: canvasY };
                if (!event.shiftKey) {
                    selectedNodeIds.value.clear();
                }
                event.preventDefault();
            }
            return;
        }

        // Solo si hace clic en el canvas (no en nodos ni puertos)
        // Con Ctrl presionado O con el modo mano activado
        if (!isNodeClick && !isPortClick && event.button === 0 && (event.ctrlKey || isPanMode.value)) {
            isPanning.value = true;
            panStart.value = { x: event.clientX, y: event.clientY };
            event.preventDefault();
        }
    };

    // Toggle del modo mano
    const togglePanMode = () => {
        isPanMode.value = !isPanMode.value;

        // Si se activa el modo mano, desactivar el modo selección
        if (isPanMode.value && isSelectionMode.value) {
            isSelectionMode.value = false;
            selectedNodeIds.value.clear();
        }
    };

    // Finalizar pan o conexión
    const handleCanvasMouseUp = (event: MouseEvent) => {
        isPanning.value = false;
        isSelecting.value = false;
        isDraggingSelection.value = false;
        dragStartPositions.value.clear();

        // Solo cancelar la conexión si NO se hizo clic en un puerto de entrada
        const target = event.target as HTMLElement;
        const isPortClick = target.closest('.node-port');

        if (!isPortClick && isConnecting.value) {
            isConnecting.value = false;
            connectionStart.value = null;
        }
    };

    // Manejar zoom con scroll
    // Nota: Este evento requiere preventDefault() para controlar el zoom/pan del canvas,
    // Por lo que no puede ser marcado como 'passive'. Vue lo maneja automáticamente.
    const handleWheel = (event: WheelEvent) => {
        event.preventDefault();
        const { deltaY } = event;

        if (event.ctrlKey) {
            // Zoom con Ctrl + Scroll
            const delta = deltaY > 0 ? -0.1 : 0.1;
            const newZoom = Math.max(0.1, Math.min(2, props.zoom + delta));
            emit('updateZoom', newZoom);
        } else {
            // Obtener límites del canvas
            const bounds = getCanvasBounds();
            const canvasWidth = canvasRef.value?.clientWidth || 1000;
            const canvasHeight = canvasRef.value?.clientHeight || 800;

            let newX = props.panOffset.x;
            let newY = props.panOffset.y;

            if (event.shiftKey) {
                // Pan horizontal con Shift + Scroll
                newX = props.panOffset.x - deltaY;
            } else {
                // Pan vertical con Scroll normal
                newY = props.panOffset.y - deltaY;
            }

            // Aplicar límites
            const maxX = Math.max(bounds.maxX - canvasWidth / 2, 0);
            const maxY = Math.max(bounds.maxY - canvasHeight / 2, 0);
            const minX = Math.min(bounds.minX + canvasWidth / 2, 0);
            const minY = Math.min(bounds.minY + canvasHeight / 2, 0);

            newX = Math.max(minX, Math.min(maxX, newX));
            newY = Math.max(minY, Math.min(maxY, newY));

            emit('updatePan', { x: newX, y: newY });
        }
    };

    // Controles de zoom desde los botones
    const handleZoomIn = () => {
        const newZoom = Math.min(2, props.zoom + 0.1);
        emit('updateZoom', newZoom);
    };

    const handleZoomOut = () => {
        const newZoom = Math.max(0.1, props.zoom - 0.1);
        emit('updateZoom', newZoom);
    };

    const handleResetZoom = () => {
        emit('updateZoom', 1);
    };

    const handleToggleZenMode = () => {
        emit('toggleZenMode');
    };

    // Calcular los límites del canvas basados en los nodos
    const getCanvasBounds = () => {
        if (props.nodes.length === 0) {
            return { minX: 0, minY: 0, maxX: 2000, maxY: 2000 };
        }

        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        props.nodes.forEach(node => {
            const nodeWidth = 200;
            const nodeHeight = 100;

            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + nodeWidth);
            maxY = Math.max(maxY, node.position.y + nodeHeight);
        });

        // Agregar margen
        const margin = 300;
        return {
            minX: minX - margin,
            minY: minY - margin,
            maxX: maxX + margin,
            maxY: maxY + margin,
        };
    };

    // Centrar la vista en el nodo inicial o en el centro del flujo
    const handleCenterView = () => {
        const startNode = props.nodes.find(n => n.type === 'start');
        if (startNode) {
            // Centrar en el nodo de inicio
            emit('updatePan', {
                x: 400 - startNode.position.x,
                y: 100 - startNode.position.y,
            });
        } else if (props.nodes.length > 0) {
            // Centrar en el primer nodo
            const [firstNode] = props.nodes;
            if (firstNode) {
                emit('updatePan', {
                    x: 400 - firstNode.position.x,
                    y: 100 - firstNode.position.y,
                });
            }
        } else {
            // Volver a posición inicial
            emit('updatePan', { x: 400, y: 100 });
        }
        emit('updateZoom', 1);
    };

    // Toggle del modo selección múltiple
    const toggleSelectionMode = () => {
        isSelectionMode.value = !isSelectionMode.value;

        // Si se activa el modo selección, desactivar el modo mano
        if (isSelectionMode.value && isPanMode.value) {
            isPanMode.value = false;
        }

        if (!isSelectionMode.value) {
            // Limpiar selección al desactivar
            selectedNodeIds.value.clear();
        }
    };

    // Calcular el rectángulo de selección
    const selectionRect = computed(() => {
        const x1 = Math.min(selectionStart.value.x, selectionEnd.value.x);
        const y1 = Math.min(selectionStart.value.y, selectionEnd.value.y);
        const x2 = Math.max(selectionStart.value.x, selectionEnd.value.x);
        const y2 = Math.max(selectionStart.value.y, selectionEnd.value.y);

        return {
            x: x1,
            y: y1,
            width: x2 - x1,
            height: y2 - y1,
        };
    });

    // Verificar si un nodo está dentro del rectángulo de selección
    const isNodeInSelection = (node: FlowNode) => {
        const nodeWidth = 200;
        const nodeHeight = 100;
        const rect = selectionRect.value;

        return (
            node.position.x + nodeWidth > rect.x &&
            node.position.x < rect.x + rect.width &&
            node.position.y + nodeHeight > rect.y &&
            node.position.y < rect.y + rect.height
        );
    };

    // Actualizar nodos seleccionados
    const updateSelectedNodes = () => {
        selectedNodeIds.value.clear();
        props.nodes.forEach(node => {
            if (isNodeInSelection(node)) {
                selectedNodeIds.value.add(node.id);
            }
        });
    };

    // Manejar drop de nodos desde la paleta
    const handleDrop = (event: DragEvent) => {
        event.preventDefault();
        if (!event.dataTransfer || !canvasRef.value) {
            return;
        }

        try {
            const data = JSON.parse(event.dataTransfer.getData('application/json'));
            const rect = canvasRef.value.getBoundingClientRect();

            const position: Position = {
                x: (event.clientX - rect.left - props.panOffset.x) / props.zoom,
                y: (event.clientY - rect.top - props.panOffset.y) / props.zoom,
            };

            emit('nodeAdd', data.nodeType, position);
        } catch {
            versaAlert({
                type: 'error',
                title: 'Drop inválido',
                message: 'No se pudo procesar el nodo arrastrado al canvas.',
            });
        }
    };

    const handleDragOver = (event: DragEvent) => {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'copy';
        }
    };

    // Calcular punto de conexión en el borde del nodo según la dirección
    const getConnectionPoint = (
        nodeId: string,
        direction: string,
        nodeHeightCache?: Map<string, number>,
    ): Position | null => {
        const node = props.nodes.find(n => n.id === nodeId);
        if (!node) {
            return null;
        }

        const nodeWidth = 200;
        const nodeHeight = nodeHeightCache?.get(nodeId) ?? getNodeHeight(nodeId); // Usar altura real del DOM

        if (nodeHeightCache && !nodeHeightCache.has(nodeId)) {
            nodeHeightCache.set(nodeId, nodeHeight);
        }

        const centerX = node.position.x + nodeWidth / 2;
        const centerY = node.position.y + nodeHeight / 2;

        // Sin offset - conectar exactamente en el borde
        switch (direction) {
            case 'right': {
                return { x: node.position.x + nodeWidth, y: centerY };
            }
            case 'left': {
                return { x: node.position.x, y: centerY };
            }
            case 'bottom': {
                return { x: centerX, y: node.position.y + nodeHeight };
            }
            case 'top': {
                return { x: centerX, y: node.position.y };
            }
            default: {
                return { x: centerX, y: centerY };
            }
        }
    };

    const connections = computed(() => renderConnections());

    const unconnectedOutputMarkers = computed(() => {
        if (!showUnconnectedMarkers.value) {
            return [];
        }

        const nodeHeightCache = new Map<string, number>();
        currentNodeHeightCache = nodeHeightCache;

        const markers: {
            key: string;
            nodeId: string;
            portIndex: number;
            position: Position;
        }[] = [];

        props.nodes.forEach(node => {
            const outputCount = getOutputPortsCount(node);
            if (!outputCount || outputCount <= 0) {
                return;
            }

            for (let portIndex = 0; portIndex < outputCount; portIndex++) {
                const hasConnection = props.connections.some(
                    connection => connection.sourceNodeId === node.id && connection.sourcePortIndex === portIndex,
                );

                if (!hasConnection) {
                    const position = getPortPosition(node.id, portIndex, 'output');
                    if (position) {
                        markers.push({
                            key: `${node.id}-out-${portIndex}`,
                            nodeId: node.id,
                            portIndex,
                            position,
                        });
                    }
                }
            }
        });

        currentNodeHeightCache = null;
        return markers;
    });

    // Línea temporal de conexión (mientras se arrastra)
    const tempConnectionPath = computed(() => {
        if (!isConnecting.value || !connectionStart.value) {
            return null;
        }

        const start = connectionStart.value.position;
        const end = currentMousePosition.value;

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const controlOffset = Math.max(Math.abs(dy) * 0.5, 50);

        return `M ${start.x} ${start.y} C ${start.x} ${start.y + controlOffset}, ${end.x} ${end.y - controlOffset}, ${end.x} ${end.y}`;
    });

    // Manejar clic en una conexión para eliminarla
    const handleConnectionClick = async (connectionId: string, event: MouseEvent) => {
        event.stopPropagation();
        const result = await Swal.fire({
            title: '¿Eliminar conexión?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
        });

        if (result.isConfirmed) {
            emit('connectionDelete', connectionId);
        }
    };

    const centerOnNode = (nodeId: string) => {
        const node = props.nodes.find(n => n.id === nodeId);
        if (!node || !canvasRef.value) {
            return;
        }

        const canvasRect = canvasRef.value.getBoundingClientRect();
        const nodeWidth = 200;
        const nodeHeight = 100;

        const nodeCenterX = node.position.x + nodeWidth / 2;
        const nodeCenterY = node.position.y + nodeHeight / 2;

        const newPanX = canvasRect.width / 2 - nodeCenterX * props.zoom;
        const newPanY = canvasRect.height / 2 - nodeCenterY * props.zoom;

        emit('updatePan', { x: newPanX, y: newPanY });
    };

    defineExpose({
        centerOnNode,
    });
</script>

<template>
    <div
        ref="canvasRef"
        class="flow-canvas relative w-full h-full overflow-hidden bg-gray-50 dark:bg-gray-950"
        :class="{
            'cursor-grabbing': isPanning || isDraggingSelection,
            'cursor-grab': isPanMode && !isPanning,
            'cursor-crosshair': isConnecting || (isSelectionMode && !isSelecting && !isDraggingSelection),
            'cursor-move': isDraggingSelection,
        }"
        @click="handleCanvasClick"
        @mousedown="handleCanvasMouseDown"
        @mousemove="handleCanvasMouseMove"
        @mouseup="handleCanvasMouseUp"
        @mouseleave="handleCanvasMouseUp"
        @wheel="handleWheel"
        @drop="handleDrop"
        @dragover="handleDragOver">
        <!-- Grid Pattern de Fondo -->
        <div class="absolute inset-0 grid-pattern opacity-50 dark:opacity-30"></div>

        <!-- SVG para las conexiones (fuera de la transformación) -->
        <svg
            ref="svgRef"
            class="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
            style="overflow: visible">
            <defs>
                <!-- Gradientes para las conexiones -->
                <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color: #9ca3af; stop-opacity: 0.6" />
                    <stop offset="50%" style="stop-color: #6b7280; stop-opacity: 0.8" />
                    <stop offset="100%" style="stop-color: #9ca3af; stop-opacity: 0.6" />
                </linearGradient>

                <linearGradient id="connectionGradientDark" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color: #4b5563; stop-opacity: 0.6" />
                    <stop offset="50%" style="stop-color: #6b7280; stop-opacity: 0.8" />
                    <stop offset="100%" style="stop-color: #4b5563; stop-opacity: 0.6" />
                </linearGradient>

                <linearGradient id="connectionGradientHover" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color: #60a5fa; stop-opacity: 0.8" />
                    <stop offset="50%" style="stop-color: #3b82f6; stop-opacity: 1" />
                    <stop offset="100%" style="stop-color: #60a5fa; stop-opacity: 0.8" />
                </linearGradient>

                <linearGradient id="connectionGradientActive" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color: #22d3ee; stop-opacity: 0.8" />
                    <stop offset="50%" style="stop-color: #06b6d4; stop-opacity: 1" />
                    <stop offset="100%" style="stop-color: #22d3ee; stop-opacity: 0.8" />
                </linearGradient>

                <!-- Filtro de resplandor para las conexiones -->
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>

                <!-- Filtro de sombra para las conexiones -->
                <filter id="shadow">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3" />
                </filter>

                <!-- Marcadores de flecha modernos (más pequeños y elegantes) -->
                <marker
                    id="arrowhead-light"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="5"
                    orient="auto"
                    markerUnits="strokeWidth">
                    <path d="M 0 0 L 10 5 L 0 10 L 3 5 z" fill="#9ca3af" />
                </marker>

                <marker
                    id="arrowhead-dark"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="5"
                    orient="auto"
                    markerUnits="strokeWidth">
                    <path d="M 0 0 L 10 5 L 0 10 L 3 5 z" fill="#4b5563" />
                </marker>

                <marker
                    id="arrowhead-hover"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="5"
                    orient="auto"
                    markerUnits="strokeWidth">
                    <path d="M 0 0 L 10 5 L 0 10 L 3 5 z" fill="#3b82f6" />
                </marker>

                <marker
                    id="arrowhead-temp"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="5"
                    orient="auto"
                    markerUnits="strokeWidth">
                    <path d="M 0 0 L 10 5 L 0 10 L 3 5 z" fill="#06b6d4" />
                </marker>

                <!-- Patrón de puntos animados para la conexión temporal -->
                <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="10" r="1.5" fill="#06b6d4" opacity="0.6">
                        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                </pattern>
            </defs>

            <!-- Grupo con transformación para zoom y pan -->
            <g :transform="`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`">
                <!-- Conexiones existentes -->
                <g v-for="conn in connections" :key="conn?.id" class="connection-group">
                    <template v-if="conn?.path">
                        <!-- Línea de fondo más gruesa para área de click -->
                        <path
                            :d="conn.path"
                            class="connection-hitbox"
                            fill="none"
                            stroke="transparent"
                            stroke-width="20"
                            stroke-linecap="round"
                            cursor="pointer"
                            @click="e => handleConnectionClick(conn.id, e)" />

                        <!-- Línea principal punteada estilo n8n -->
                        <path
                            :d="conn.path"
                            class="connection-path"
                            fill="none"
                            stroke="#9ca3af"
                            stroke-width="2"
                            stroke-dasharray="5,5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            opacity="0.6" />

                        <!-- Punto grande en el origen (estilo n8n) -->
                        <circle
                            v-if="conn.sourcePos"
                            :cx="conn.sourcePos.x"
                            :cy="conn.sourcePos.y"
                            r="6"
                            class="connection-dot-source"
                            fill="#10b981"
                            opacity="0.9" />

                        <!-- Anillo exterior del punto origen -->
                        <circle
                            v-if="conn.sourcePos"
                            :cx="conn.sourcePos.x"
                            :cy="conn.sourcePos.y"
                            r="9"
                            class="connection-dot-source-ring"
                            fill="none"
                            stroke="#10b981"
                            stroke-width="2"
                            opacity="0.4">
                            <animate attributeName="r" values="9;11;9" dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
                        </circle>

                        <!-- Punto grande en el destino (estilo n8n) -->
                        <circle
                            v-if="conn.targetPos"
                            :cx="conn.targetPos.x"
                            :cy="conn.targetPos.y"
                            r="6"
                            class="connection-dot-target"
                            fill="#6b7280"
                            opacity="0.8" />

                        <!-- Anillo exterior del punto destino -->
                        <circle
                            v-if="conn.targetPos"
                            :cx="conn.targetPos.x"
                            :cy="conn.targetPos.y"
                            r="9"
                            class="connection-dot-target-ring"
                            fill="none"
                            stroke="#6b7280"
                            stroke-width="2"
                            opacity="0.3">
                            <animate attributeName="r" values="9;11;9" dur="2s" repeatCount="indefinite" begin="0.5s" />
                            <animate
                                attributeName="opacity"
                                values="0.3;0.1;0.3"
                                dur="2s"
                                repeatCount="indefinite"
                                begin="0.5s" />
                        </circle>
                    </template>
                </g>

                <!-- Marcadores de puertos de salida sin conexión -->
                <g v-if="unconnectedOutputMarkers.length > 0" class="unconnected-markers-group">
                    <g v-for="marker in unconnectedOutputMarkers" :key="marker.key">
                        <circle :cx="marker.position.x" :cy="marker.position.y" r="5" class="unconnected-port-dot" />

                        <circle :cx="marker.position.x" :cy="marker.position.y" r="9" class="unconnected-port-ring">
                            <animate attributeName="r" values="9;12;9" dur="1.4s" repeatCount="indefinite" />
                            <animate
                                attributeName="opacity"
                                values="0.45;0.12;0.45"
                                dur="1.4s"
                                repeatCount="indefinite" />
                        </circle>
                        <title>Salida sin conexión</title>
                    </g>
                </g>

                <!-- Conexión temporal (mientras se arrastra) -->
                <g v-if="tempConnectionPath">
                    <!-- Línea principal animada punteada -->
                    <path
                        :d="tempConnectionPath"
                        class="connection-temp"
                        fill="none"
                        stroke="#10b981"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-dasharray="5,5"
                        opacity="0.7">
                        <animate
                            attributeName="stroke-dashoffset"
                            from="0"
                            to="-10"
                            dur="0.5s"
                            repeatCount="indefinite" />
                    </path>

                    <!-- Punto de origen grande con anillo -->
                    <circle
                        v-if="connectionStart"
                        :cx="connectionStart.position.x"
                        :cy="connectionStart.position.y"
                        class="connection-origin"
                        fill="#10b981"
                        r="6"
                        opacity="0.9" />

                    <!-- Anillo pulsante del origen -->
                    <circle
                        v-if="connectionStart"
                        :cx="connectionStart.position.x"
                        :cy="connectionStart.position.y"
                        class="connection-origin-ring"
                        fill="none"
                        stroke="#10b981"
                        stroke-width="2"
                        r="9"
                        opacity="0.5">
                        <animate attributeName="r" values="9;13;9" dur="1.2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.2s" repeatCount="indefinite" />
                    </circle>

                    <!-- Punto del cursor grande -->
                    <circle
                        :cx="currentMousePosition.x"
                        :cy="currentMousePosition.y"
                        class="connection-cursor"
                        fill="#10b981"
                        r="6"
                        opacity="0.8">
                        <animate attributeName="opacity" values="0.8;0.4;0.8" dur="0.8s" repeatCount="indefinite" />
                    </circle>

                    <!-- Anillo del cursor -->
                    <circle
                        :cx="currentMousePosition.x"
                        :cy="currentMousePosition.y"
                        class="connection-cursor-ring"
                        fill="none"
                        stroke="#10b981"
                        stroke-width="2"
                        r="9"
                        opacity="0.4">
                        <animate attributeName="r" values="9;11;9" dur="0.8s" repeatCount="indefinite" />
                    </circle>
                </g>
            </g>
        </svg>

        <!-- Rectángulo de selección múltiple -->
        <div
            v-if="isSelecting"
            class="absolute pointer-events-none z-20 border-2 border-purple-500 dark:border-purple-400 bg-purple-100 dark:bg-purple-900/30 rounded"
            :style="{
                left: `${selectionRect.x * zoom + panOffset.x}px`,
                top: `${selectionRect.y * zoom + panOffset.y}px`,
                width: `${selectionRect.width * zoom}px`,
                height: `${selectionRect.height * zoom}px`,
            }"></div>

        <!-- Canvas transformado con zoom y pan para los nodos -->
        <div class="canvas-content" :style="{ transform: canvasTransform }">
            <!-- Nodos -->
            <FlowNodeComponent
                v-for="node in nodes"
                :key="node.id"
                :node="node"
                :zoom="zoom"
                :is-active="activeNodeId === node.id"
                :is-visited="visitedNodeIds?.includes(node.id) || false"
                :is-selected="selectedNodeIds.has(node.id)"
                :is-selection-mode="isSelectionMode"
                :validation-state="nodeValidationMap?.[node.id] || null"
                @select="handleNodeSelect"
                @delete="handleNodeDelete"
                @connect-start="handleConnectStart"
                @connect-end="handleConnectEnd"
                @node-move="handleNodeMove"
                @dblclick="handleNodeDblClick" />
        </div>

        <!-- Indicador de Modo Seleccion -->
        <transition name="fade">
            <div
                v-if="isSelectionMode"
                class="absolute top-20 right-6 bg-green-500 dark:bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
                <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"></path>
                </svg>
                <span class="text-sm font-semibold">Modo Selección activado</span>
            </div>
        </transition>

        <!-- Indicador de Modo Mano -->
        <transition name="fade">
            <div
                v-if="isPanMode"
                class="absolute top-20 right-6 bg-green-500 dark:bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
                <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"></path>
                </svg>
                <span class="text-sm font-semibold">Modo Mano Activo</span>
            </div>
        </transition>

        <FlowInstrucciones :is-zen-mode="isZenMode" />

        <!-- Toggle marcadores de puertos sin conexión -->
        <button
            type="button"
            class="absolute top-32 right-6 z-30 px-3 py-2 rounded-lg text-xs font-semibold transition-colors border"
            :class="
                showUnconnectedMarkers
                    ? 'bg-red-500/90 hover:bg-red-600 text-white border-red-400 dark:border-red-700'
                    : 'bg-white/90 hover:bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
            "
            @click="showUnconnectedMarkers = !showUnconnectedMarkers">
            <span class="inline-flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" :class="showUnconnectedMarkers ? 'bg-white' : 'bg-red-500'"></span>
                {{ showUnconnectedMarkers ? 'Ocultar puertos libres' : 'Mostrar puertos libres' }}
            </span>
        </button>

        <!-- Indicador de estado de conexión -->
        <transition name="slide-down">
            <div
                v-if="isConnecting"
                class="absolute top-6 left-1/2 transform -translate-x-1/2 bg-brand dark:bg-brand text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-pulse">
                <svg
                    class="w-6 h-6 animate-bounce"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                <span class="text-sm font-semibold">Conectando nodo... Click en puerto de entrada</span>
            </div>
        </transition>

        <!-- Controles de Zoom -->
        <FlowZoomControls
            :zoom="zoom"
            :is-zen-mode="isZenMode"
            :is-pan-mode="isPanMode"
            :is-selection-mode="isSelectionMode"
            @zoom-in="handleZoomIn"
            @zoom-out="handleZoomOut"
            @reset-zoom="handleResetZoom"
            @toggle-zen-mode="handleToggleZenMode"
            @toggle-pan-mode="togglePanMode"
            @toggle-selection-mode="toggleSelectionMode"
            @center-view="handleCenterView" />

        <!-- Mini Map -->
        <div
            v-if="showMiniMap && nodes.length > 0"
            class="absolute z-30 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            :class="isZenMode ? 'top-5 left-5' : 'top-6 left-[350px]'"
            :style="{ width: `${miniMapWidth}px`, height: `${miniMapHeight}px` }">
            <div class="absolute top-1 right-1 z-10">
                <button
                    type="button"
                    class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                    @click="showMiniMap = false">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <svg :width="miniMapWidth" :height="miniMapHeight" class="w-full h-full" @click="handleMiniMapClick">
                <!-- Fondo -->
                <rect width="100%" height="100%" fill="currentColor" class="text-gray-100 dark:text-gray-900" />

                <!-- Viewport indicator -->
                <rect
                    :x="miniMapViewport.x"
                    :y="miniMapViewport.y"
                    :width="miniMapViewport.width"
                    :height="miniMapViewport.height"
                    fill="none"
                    stroke="#3b82f6"
                    stroke-width="2"
                    rx="2"
                    class="cursor-pointer" />

                <!-- Nodos -->
                <g>
                    <rect
                        v-for="miniNode in miniMapNodes"
                        :key="miniNode.id"
                        :x="miniNode.x"
                        :y="miniNode.y"
                        :width="miniNode.width"
                        :height="miniNode.height"
                        :fill="miniNode.color"
                        rx="2"
                        class="cursor-pointer transition-all hover:opacity-80"
                        @click.stop="emit('nodeSelect', miniNode.id)" />
                </g>

                <!-- Conexiones -->
                <g>
                    <line
                        v-for="conn in miniMapConnections"
                        :key="conn.id"
                        :x1="conn.x1"
                        :y1="conn.y1"
                        :x2="conn.x2"
                        :y2="conn.y2"
                        stroke="#9ca3af"
                        stroke-width="1"
                        opacity="0.5" />
                </g>
            </svg>
        </div>

        <!-- Toggle Mini Map -->
        <button
            v-if="!showMiniMap"
            type="button"
            class="absolute bottom-4 left-4 z-30 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            @click="showMiniMap = true">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
        </button>
    </div>
</template>

<style scoped>
    .flow-canvas {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        background-image: radial-gradient(circle, #e5e7eb 1px, transparent 1px);
        background-size: 20px 20px;
        z-index: 0;
        isolation: isolate;
    }

    .dark .flow-canvas {
        background-image: radial-gradient(circle, #374151 1px, transparent 1px);
    }

    .canvas-content {
        position: absolute;
        top: 0;
        left: 0;
        transform-origin: 0 0;
        transition: transform 0.05s ease-out;
        pointer-events: none;
        width: 10000px;
        height: 10000px;
        z-index: 20;
    }

    .canvas-content > * {
        pointer-events: auto;
    }

    .grid-pattern {
        background-image:
            linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px);
        background-size: 20px 20px;
    }

    .dark .grid-pattern {
        background-image:
            linear-gradient(#374151 1px, transparent 1px), linear-gradient(90deg, #374151 1px, transparent 1px);
    }

    /* Estilos modernos para las conexiones estilo n8n */
    .connection-group:hover .connection-path {
        stroke: #10b981 !important;
        stroke-width: 2.5;
        opacity: 0.9 !important;
    }

    /* Estilos para los puntos de conexión */
    .connection-dot-source,
    .connection-dot-target,
    .connection-dot-source-ring,
    .connection-dot-target-ring {
        transition: all 0.3s ease;
    }

    .connection-group:hover .connection-dot-source {
        fill: #10b981 !important;
        r: 7;
        opacity: 1 !important;
        filter: drop-shadow(0 2px 8px rgba(16, 185, 129, 0.6));
    }

    .connection-group:hover .connection-dot-target {
        fill: #10b981 !important;
        r: 7;
        opacity: 1 !important;
        filter: drop-shadow(0 2px 8px rgba(16, 185, 129, 0.6));
    }

    .connection-group:hover .connection-dot-source-ring {
        stroke: #10b981 !important;
        opacity: 0.6 !important;
    }

    .connection-group:hover .connection-dot-target-ring {
        stroke: #10b981 !important;
        opacity: 0.6 !important;
    }

    /* Modo oscuro */
    .dark .connection-path {
        stroke: #6b7280;
        opacity: 0.5;
    }

    .dark .connection-group:hover .connection-path {
        stroke: #10b981 !important;
        opacity: 0.9 !important;
    }

    .dark .connection-dot-source {
        fill: #10b981;
    }

    .dark .connection-dot-target {
        fill: #4b5563;
    }

    /* Animación suave para las conexiones */
    .connection-path {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Efectos para la conexión temporal */
    .connection-temp {
        opacity: 0.7;
    }

    .connection-origin,
    .connection-cursor {
        filter: drop-shadow(0 2px 6px rgba(16, 185, 129, 0.4));
    }

    /* Área de click invisible más grande */
    .connection-hitbox {
        pointer-events: stroke;
    }

    .connection-hitbox:hover {
        stroke: rgba(16, 185, 129, 0.1);
    }

    .unconnected-markers-group {
        pointer-events: none;
    }

    .unconnected-port-dot {
        fill: #ef4444;
        stroke: #fecaca;
        stroke-width: 1.5;
        opacity: 0.95;
        filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.45));
    }

    .unconnected-port-ring {
        fill: none;
        stroke: #ef4444;
        stroke-width: 2;
        opacity: 0.45;
    }

    .dark .unconnected-port-dot {
        stroke: #7f1d1d;
    }

    /* Animaciones */
    .fade-enter-active,
    .fade-leave-active {
        transition: all 0.3s ease;
    }

    .fade-enter-from,
    .fade-leave-to {
        opacity: 0;
        transform: translateY(-10px);
    }

    .slide-down-enter-active,
    .slide-down-leave-active {
        transition: all 0.3s ease;
    }

    .slide-down-enter-from {
        opacity: 0;
        transform: translate(-50%, -20px);
    }

    .slide-down-leave-to {
        opacity: 0;
        transform: translate(-50%, -20px);
    }

    /* Estilo de kbd */
    kbd {
        font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
        font-weight: 600;
    }
</style>
