<script setup lang="ts">
    import Swal from 'sweetalert2';
import type { AccionData, actionsType, VersaFetchResponse } from 'versaTypes';
import { computed, inject, nextTick, onMounted, onUnmounted, ref, type Ref, watch } from 'vue';

    import FlowCanvas from '@/dashboard/js/chatbot/flowBuilder/components/FlowCanvas.vue';
import FlowLoadModal from '@/dashboard/js/chatbot/flowBuilder/components/FlowLoadModal.vue';
import FlowTestModal from '@/dashboard/js/chatbot/flowBuilder/components/FlowTestModal.vue';
import NodeEditor from '@/dashboard/js/chatbot/flowBuilder/components/NodeEditor.vue';
import NodePalette from '@/dashboard/js/chatbot/flowBuilder/components/NodePalette.vue';
import FlowBuilderTable from '@/dashboard/js/chatbot/flowBuilder/FlowBuilderTable.vue';
import { initNodeRegistry } from '@/dashboard/js/chatbot/flowBuilder/nodes/index';
import {
    type Connection,
    type FlowNode,
    type FlowType,
    type NodeType,
    NodeType as NodeTypeEnum,
    type Position,
} from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
import { getNodeDefinition } from '@/dashboard/js/chatbot/flowBuilder/types/nodeDefinitions';
import Breadcrumb from '@/dashboard/js/components/breadcrumb.vue';
import LineHr from '@/dashboard/js/components/lineHr.vue';
import { versaAlert, versaFetch } from '@/dashboard/js/functions';

    // Inicializar el registro de nodos modulares
    initNodeRegistry();

    const panelShow = ref('table');
    const panelUrl = inject<string>('panelUrl', ''); // Obtiene el panel URL desde la inyección
    const empresaSelected = inject<string>('empresaSelected', ''); // Obtiene el tokenEmpresa desde la inyección
    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));

    interface FlowData {
        nodes: FlowNode[];
        connections: Connection[];
        description?: string;
        flow_type?: FlowType;
        csrf_token?: string;
        id?: number | null;
    }

    interface ImportedFlowData {
        name?: string;
        nodes: FlowNode[];
        connections: Connection[];
    }

    interface FlowValidationResult {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    }

    interface LocalFlowDraft {
        version: number;
        savedAt: number;
        flowId: number | null;
        description: string;
        flowType: FlowType;
        nodes: FlowNode[];
        connections: Connection[];
    }

    type NodeValidationState = 'error' | 'warning';

    // Definir la interfaz para los items del breadcrumb
    interface BreadcrumbItem {
        type: string;
        title: string;
        icon: string;
        link: string;
    }

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
    const editorWidth = ref('28rem');
    const description = ref('Nombre del flujo'); // Descripción del flujo
    const flowType = ref<FlowType>('inbound');
    const isEditingDescription = ref(false); // Estado de edición de la descripción
    const descriptionInput = ref<HTMLInputElement | null>(null); // Referencia al input de descripción
    // Tipado explícito con lo que expone el componente vía defineExpose
    const flowCanvasRef = ref<{ centerOnNode(nodeId: string): void } | null>(null);
    let id: number | null = null;
    const tableRefreshKey = ref(0);
    const LOCAL_DRAFT_VERSION = 1;
    const AUTO_SAVE_DELAY_MS = 800;
    let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
    let isRestoringLocalDraft = false;
    const lastPersistedSnapshot = ref('');

    const UNDO_MAX_HISTORY = 50;
    const undoHistory = ref<
        { nodes: FlowNode[]; connections: Connection[]; description: string; flowType: FlowType }[]
    >([]);
    const redoHistory = ref<
        { nodes: FlowNode[]; connections: Connection[]; description: string; flowType: FlowType }[]
    >([]);
    const isUndoRedoAction = ref(false);

    const canUndo = computed(() => undoHistory.value.length > 1);
    const canRedo = computed(() => redoHistory.value.length > 0);

    const saveToUndoHistory = () => {
        if (isUndoRedoAction.value) {
            return;
        }
        const snapshot = {
            nodes: JSON.parse(JSON.stringify(nodes.value)) as FlowNode[],
            connections: JSON.parse(JSON.stringify(connections.value)) as Connection[],
            description: description.value,
            flowType: flowType.value,
        };
        undoHistory.value.push(snapshot);
        if (undoHistory.value.length > UNDO_MAX_HISTORY) {
            undoHistory.value.shift();
        }
        redoHistory.value = [];
    };

    const handleUndo = () => {
        if (undoHistory.value.length <= 1) {
            return;
        }
        isUndoRedoAction.value = true;
        const current = undoHistory.value.pop();
        if (current) {
            redoHistory.value.push(current);
        }
        const previous = undoHistory.value.at(-1);
        if (previous) {
            nodes.value = JSON.parse(JSON.stringify(previous.nodes)) as FlowNode[];
            connections.value = JSON.parse(JSON.stringify(previous.connections)) as Connection[];
            description.value = previous.description;
            flowType.value = previous.flowType;
            recalculateCounters();
        }
        selectedNodeId.value = null;
        editorNodeId.value = null;
        nextTick(() => {
            isUndoRedoAction.value = false;
        });
    };

    const handleRedo = () => {
        if (redoHistory.value.length === 0) {
            return;
        }
        isUndoRedoAction.value = true;
        const next = redoHistory.value.pop();
        if (next) {
            undoHistory.value.push(next);
            nodes.value = JSON.parse(JSON.stringify(next.nodes)) as FlowNode[];
            connections.value = JSON.parse(JSON.stringify(next.connections)) as Connection[];
            description.value = next.description;
            flowType.value = next.flowType;
            recalculateCounters();
        }
        selectedNodeId.value = null;
        editorNodeId.value = null;
        nextTick(() => {
            isUndoRedoAction.value = false;
        });
    };

    const searchNodeQuery = ref('');
    const searchResults = ref<{ id: string; label: string; type: string }[]>([]);

    const getNodeColor = (type: string): string => {
        const colors: Record<string, string> = {
            start: '#22c55e',
            message: '#3b82f6',
            question: '#8b5cf6',
            menu: '#f59e0b',
            condition: '#f97316',
            api_call: '#06b6d4',
            webhook: '#ec4899',
            delay: '#6b7280',
            variable: '#84cc16',
            send_to: '#14b8a6',
            flow: '#6366f1',
            end: '#ef4444',
            ai_agent: '#a855f7',
            router: '#f59e0b',
            error_handler: '#ef4444',
            loop: '#14b8a6',
            parallel: '#6366f1',
            cache: '#22c55e',
        };
        return colors[type] || '#6b7280';
    };

    const handleNodeSearch = () => {
        const query = searchNodeQuery.value.trim().toLowerCase();
        if (!query) {
            searchResults.value = [];
            return;
        }

        searchResults.value = nodes.value
            .filter(node => {
                const labelMatch = node.label.toLowerCase().includes(query);
                const typeMatch = node.type.toLowerCase().includes(query);
                return labelMatch || typeMatch;
            })
            .slice(0, 10)
            .map(node => ({
                id: node.id,
                label: node.label || 'Sin nombre',
                type: node.type,
            }));
    };

    const handleSelectSearchResult = (nodeId: string) => {
        const node = nodes.value.find(n => n.id === nodeId);
        if (node) {
            searchNodeQuery.value = '';
            searchResults.value = [];
            handleNodeSelect(nodeId);
            handleNodeDblClick(nodeId);
            panOffset.value = {
                x: 400 - node.position.x * zoom.value,
                y: 200 - node.position.y * zoom.value,
            };
        }
    };

    const handleAutoLayout = () => {
        if (nodes.value.length <= 1) {
            versaAlert({
                type: 'info',
                title: 'Auto-layout',
                message: 'Necesitas al menos 2 nodos para organizar.',
            });
            return;
        }

        saveToUndoHistory();

        const nodeWidth = 180;
        const nodeHeight = 100;
        const horizontalGap = 80;
        const verticalGap = 60;
        const startX = 100;
        const startY = 100;

        const visited = new Set<string>();
        const levels = new Map<string, number>();
        const levelNodes = new Map<number, string[]>();

        const startNode = nodes.value.find(n => n.type === 'start');
        if (startNode) {
            levels.set(startNode.id, 0);
        }

        const queue: string[] = startNode ? [startNode.id] : [];

        while (queue.length > 0) {
            const currentId = queue.shift();
            if (currentId && !visited.has(currentId)) {
                visited.add(currentId);

                const currentLevel = levels.get(currentId) || 0;

                const outgoingConnections = connections.value.filter(c => c.sourceNodeId === currentId);
                outgoingConnections.forEach(conn => {
                    if (!levels.has(conn.targetNodeId)) {
                        levels.set(conn.targetNodeId, currentLevel + 1);
                        queue.push(conn.targetNodeId);
                    }
                });
            }
        }

        nodes.value.forEach(node => {
            if (!levels.has(node.id)) {
                levels.set(node.id, Math.max(...levels.values()) + 1);
            }
        });

        levels.forEach((level, nodeId) => {
            if (!levelNodes.has(level)) {
                levelNodes.set(level, []);
            }
            const nodesAtLevel = levelNodes.get(level);
            if (nodesAtLevel) {
                nodesAtLevel.push(nodeId);
            }
        });

        const maxLevel = Math.max(...levels.values());

        for (let level = 0; level <= maxLevel; level++) {
            const nodesAtLevel = levelNodes.get(level) || [];
            nodesAtLevel.forEach((nodeId, index) => {
                const node = nodes.value.find(n => n.id === nodeId);
                if (node) {
                    node.position = {
                        x: startX + level * (nodeWidth + horizontalGap),
                        y: startY + index * (nodeHeight + verticalGap),
                    };
                }
            });
        }

        versaAlert({
            type: 'success',
            title: 'Auto-layout',
            message: `Se organizaron ${nodes.value.length} nodos en ${maxLevel + 1} niveles.`,
        });
    };

    const buildFlowSnapshot = (): string =>
        JSON.stringify({
            id,
            description: description.value,
            flowType: flowType.value,
            nodes: nodes.value,
            connections: connections.value,
        });

    const markFlowAsPersisted = (): void => {
        lastPersistedSnapshot.value = buildFlowSnapshot();
    };

    const hasUnsavedChanges = computed(() => {
        if (panelShow.value !== 'flowBuilder') {
            return false;
        }

        return buildFlowSnapshot() !== lastPersistedSnapshot.value;
    });

    const getDraftStorageKey = (flowId: number | null = id): string => {
        const empresaKey = empresaSelected && empresaSelected.trim() !== '' ? empresaSelected : 'global';
        const flowKey = flowId === null ? 'new' : String(flowId);
        return `versawys:flowbuilder:draft:${empresaKey}:${flowKey}`;
    };

    const clearLocalDraft = (flowId: number | null = id): void => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            localStorage.removeItem(getDraftStorageKey(flowId));
        } catch {
            // Ignorar errores de almacenamiento local (modo privado o cuotas)
        }
    };

    const saveDraftToLocalStorage = (): void => {
        if (typeof window === 'undefined' || panelShow.value !== 'flowBuilder' || isRestoringLocalDraft) {
            return;
        }

        if (!hasUnsavedChanges.value) {
            clearLocalDraft();
            return;
        }

        if (nodes.value.length === 0) {
            return;
        }

        const draft: LocalFlowDraft = {
            version: LOCAL_DRAFT_VERSION,
            savedAt: Date.now(),
            flowId: id,
            description: description.value,
            flowType: flowType.value,
            nodes: nodes.value,
            connections: connections.value,
        };

        try {
            localStorage.setItem(getDraftStorageKey(), JSON.stringify(draft));
        } catch {
            // Ignorar errores de almacenamiento local (modo privado o cuotas)
        }
    };

    const flushDraftSave = (): void => {
        if (autoSaveTimeout) {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = null;
        }
        saveDraftToLocalStorage();
    };

    const scheduleDraftSave = (): void => {
        if (autoSaveTimeout) {
            clearTimeout(autoSaveTimeout);
        }

        autoSaveTimeout = setTimeout(() => {
            autoSaveTimeout = null;
            saveDraftToLocalStorage();
        }, AUTO_SAVE_DELAY_MS);
    };

    const promptRestoreLocalDraft = async (): Promise<boolean> => {
        if (typeof window === 'undefined') {
            return false;
        }

        const rawDraft = localStorage.getItem(getDraftStorageKey());
        if (!rawDraft) {
            return false;
        }

        let parsedDraft: LocalFlowDraft | null = null;
        try {
            parsedDraft = JSON.parse(rawDraft) as LocalFlowDraft;
        } catch {
            clearLocalDraft();
            return false;
        }

        const hasValidStructure =
            parsedDraft &&
            parsedDraft.version === LOCAL_DRAFT_VERSION &&
            Array.isArray(parsedDraft.nodes) &&
            Array.isArray(parsedDraft.connections);

        if (!hasValidStructure) {
            clearLocalDraft();
            return false;
        }

        const normalizedDraft = normalizeImportedFlowData({
            nodes: parsedDraft.nodes,
            connections: parsedDraft.connections,
        });

        if (!normalizedDraft) {
            clearLocalDraft();
            return false;
        }

        const hasContent = normalizedDraft.nodes.length > 1 || normalizedDraft.connections.length > 0;
        if (!hasContent) {
            return false;
        }

        const savedAtLabel =
            typeof parsedDraft.savedAt === 'number'
                ? new Date(parsedDraft.savedAt).toLocaleString('es-CL')
                : 'fecha desconocida';

        const result = await Swal.fire({
            icon: 'question',
            title: 'Se encontró un borrador local',
            text: `Hay un borrador autoguardado (${savedAtLabel}). ¿Quieres restaurarlo?`,
            showCancelButton: true,
            confirmButtonText: 'Sí, restaurar',
            cancelButtonText: 'No, continuar',
            confirmButtonColor: '#2563eb',
        });

        if (!result.isConfirmed) {
            clearLocalDraft();
            return false;
        }

        isRestoringLocalDraft = true;
        const normalizedWithStart = ensureStartNodeExists(normalizedDraft);

        nodes.value = normalizedWithStart.nodes;
        connections.value = normalizedWithStart.connections;
        description.value = parsedDraft.description || description.value;
        if (parsedDraft.flowType === 'outbound' || parsedDraft.flowType === 'inbound') {
            flowType.value = parsedDraft.flowType;
        }
        recalculateCounters();

        isRestoringLocalDraft = false;
        return true;
    };

    // Habilitar edición de descripción
    const enableDescriptionEdit = () => {
        isEditingDescription.value = true;
        setTimeout(() => {
            descriptionInput.value?.focus();
            descriptionInput.value?.select();
        }, 50);
    };

    // Deshabilitar edición de descripción
    const disableDescriptionEdit = () => {
        isEditingDescription.value = false;
    };

    // Nodo seleccionado
    const selectedNode = computed(() => {
        if (!editorNodeId.value) {
            return null;
        }
        return nodes.value.find(n => n.id === editorNodeId.value) || null;
    });

    // Panel del editor visible (solo cuando se hace doble clic)
    const isEditorVisible = computed(() => editorNodeId.value !== null);

    const refreshTable = () => {
        tableRefreshKey.value += 1;
    };

    const recalculateCounters = () => {
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

    const parseJsonArray = <T,>(rawValue: unknown): T[] => {
        if (Array.isArray(rawValue)) {
            return rawValue as T[];
        }

        if (typeof rawValue !== 'string' || rawValue.trim() === '') {
            return [];
        }

        try {
            const parsed = JSON.parse(rawValue);
            return Array.isArray(parsed) ? (parsed as T[]) : [];
        } catch {
            return [];
        }
    };

    const isStartNodeType = (value: unknown): boolean =>
        typeof value === 'string' && value.toLowerCase() === NodeTypeEnum.START;

    const isStartNode = (node: Pick<FlowNode, 'type'> | null | undefined): boolean => isStartNodeType(node?.type);

    const normalizeImportedFlowData = (raw: unknown): ImportedFlowData | null => {
        if (!raw || typeof raw !== 'object') {
            return null;
        }

        const source = raw as { nodes?: unknown; connections?: unknown };
        const importedNodes = Array.isArray(source.nodes) ? (source.nodes as FlowNode[]) : [];
        const importedConnections = Array.isArray(source.connections) ? (source.connections as Connection[]) : [];

        const normalizedNodes: FlowNode[] = [];
        importedNodes.forEach((node, index) => {
            if (!node || typeof node !== 'object') {
                return;
            }

            const definition = getNodeDefinition(node.type as NodeType);

            normalizedNodes.push({
                ...node,
                id: typeof node.id === 'string' && node.id.trim() !== '' ? node.id : `node-${index + 1}`,
                config: node.config && typeof node.config === 'object' ? node.config : {},
                inputs: typeof node.inputs === 'number' ? node.inputs : (definition?.defaultInputs ?? 1),
                outputs: typeof node.outputs === 'number' ? node.outputs : (definition?.defaultOutputs ?? 1),
                isSelected: false,
            });
        });

        if (normalizedNodes.length === 0) {
            return null;
        }

        const normalizedConnections: Connection[] = [];
        importedConnections
            .filter(connection => {
                const sourceExists = normalizedNodes.some(node => node.id === connection.sourceNodeId);
                const targetExists = normalizedNodes.some(node => node.id === connection.targetNodeId);
                return sourceExists && targetExists;
            })
            .forEach((connection, index) => {
                normalizedConnections.push({
                    ...connection,
                    id:
                        typeof connection.id === 'string' && connection.id.trim() !== ''
                            ? connection.id
                            : `conn-${index + 1}`,
                });
            });

        return {
            nodes: normalizedNodes,
            connections: normalizedConnections,
        };
    };

    const ensureStartNodeExists = (flowData: ImportedFlowData): ImportedFlowData => {
        const hasStartNode = flowData.nodes.some(node => isStartNode(node));
        if (hasStartNode) {
            return flowData;
        }

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

        return {
            name: flowData.name,
            nodes: [startNode, ...flowData.nodes],
            connections: flowData.connections,
        };
    };

    const validateFlowIntegrity = (flowData: FlowData): { isValid: boolean; message: string } => {
        if (flowData.nodes.length === 0) {
            return {
                isValid: false,
                message: 'Debes agregar al menos un nodo al flujo.',
            };
        }

        const startNodeCount = flowData.nodes.filter(node => isStartNode(node)).length;
        if (startNodeCount === 0) {
            return {
                isValid: false,
                message: 'El flujo debe incluir un nodo de inicio.',
            };
        }

        if (startNodeCount > 1) {
            return {
                isValid: false,
                message: 'El flujo solo puede tener un nodo de inicio.',
            };
        }

        const nodeIds = flowData.nodes.map(node => node.id);
        const uniqueNodeIds = new Set(nodeIds);
        if (uniqueNodeIds.size !== nodeIds.length) {
            return {
                isValid: false,
                message: 'Existen nodos con IDs duplicados. Reimporta o corrige el flujo.',
            };
        }

        const hasInvalidConnections = flowData.connections.some(connection => {
            const hasSource = uniqueNodeIds.has(connection.sourceNodeId);
            const hasTarget = uniqueNodeIds.has(connection.targetNodeId);
            return !hasSource || !hasTarget;
        });

        if (hasInvalidConnections) {
            return {
                isValid: false,
                message: 'Hay conexiones inválidas que apuntan a nodos inexistentes.',
            };
        }

        return { isValid: true, message: '' };
    };

    const validateNodesConfiguration = (flowData: FlowData): FlowValidationResult => {
        const errors: string[] = [];
        const warnings: string[] = [];

        flowData.nodes.forEach(node => {
            const nodeLabel = `${node.label || 'Sin nombre'} (${node.id})`;

            switch (node.type) {
                case NodeTypeEnum.MESSAGE: {
                    if (
                        (!node.config.messageType || node.config.messageType === 'text') &&
                        (!node.config.message || node.config.message.trim() === '')
                    ) {
                        warnings.push(`Nodo mensaje sin contenido: ${nodeLabel}`);
                    }

                    if (
                        node.config.messageType &&
                        node.config.messageType !== 'text' &&
                        (!node.config.messageMediaUrl || node.config.messageMediaUrl.trim() === '')
                    ) {
                        errors.push(`Nodo mensaje multimedia sin URL de recurso: ${nodeLabel}`);
                    }
                    break;
                }

                case NodeTypeEnum.QUESTION: {
                    if (!node.config.question || node.config.question.trim() === '') {
                        errors.push(`Nodo pregunta sin texto: ${nodeLabel}`);
                    }

                    if (!node.config.variableName || node.config.variableName.trim() === '') {
                        warnings.push(`Nodo pregunta sin variable destino: ${nodeLabel}`);
                    }

                    if (
                        node.config.expectedAnswer === 'regex' &&
                        (!node.config.validationPattern || node.config.validationPattern.trim() === '')
                    ) {
                        errors.push(`Nodo pregunta regex sin patrón configurado: ${nodeLabel}`);
                    }
                    break;
                }

                case NodeTypeEnum.MENU: {
                    const options = node.config.menuOptions || [];
                    if (options.length === 0) {
                        errors.push(`Nodo menú sin opciones: ${nodeLabel}`);
                    }

                    options.forEach((option, index) => {
                        if (!option.label || option.label.trim() === '') {
                            errors.push(`Opción ${index + 1} sin etiqueta en nodo menú: ${nodeLabel}`);
                        }
                    });
                    break;
                }

                case NodeTypeEnum.CONDITION: {
                    const conditions = node.config.conditions || [];
                    if (conditions.length === 0) {
                        errors.push(`Nodo condición sin reglas: ${nodeLabel}`);
                    }

                    conditions.forEach((condition, index) => {
                        if (!condition.field || condition.field.trim() === '') {
                            errors.push(`Condición ${index + 1} sin variable/campo en: ${nodeLabel}`);
                        }
                        if (!condition.value || condition.value.trim() === '') {
                            warnings.push(`Condición ${index + 1} sin valor en: ${nodeLabel}`);
                        }
                    });
                    break;
                }

                case NodeTypeEnum.API_CALL: {
                    if (!node.config.apiUrl || node.config.apiUrl.trim() === '') {
                        errors.push(`Nodo API sin URL configurada: ${nodeLabel}`);
                    }

                    if (
                        node.config.apiResponseFormat === 'json' &&
                        node.config.apiResponseTemplate &&
                        node.config.apiResponseTemplate.trim() !== ''
                    ) {
                        try {
                            JSON.parse(node.config.apiResponseTemplate);
                        } catch {
                            errors.push(`Nodo API con estructura JSON inválida: ${nodeLabel}`);
                        }
                    }
                    break;
                }

                case NodeTypeEnum.DELAY: {
                    if (!node.config.delayTime || node.config.delayTime <= 0) {
                        errors.push(`Nodo delay con tiempo inválido: ${nodeLabel}`);
                    }
                    break;
                }

                case NodeTypeEnum.VARIABLE: {
                    if (!node.config.variableName || node.config.variableName.trim() === '') {
                        errors.push(`Nodo variable sin nombre de variable: ${nodeLabel}`);
                    }
                    break;
                }

                case NodeTypeEnum.SEND_TO: {
                    if (!node.config.queueId) {
                        errors.push(`Nodo Enviar a sin cola destino: ${nodeLabel}`);
                    }
                    break;
                }

                case NodeTypeEnum.FLOW: {
                    if (!node.config.linkedFlowId) {
                        errors.push(`Nodo flujo sin flujo vinculado: ${nodeLabel}`);
                    }
                    break;
                }

                case NodeTypeEnum.WEBHOOK: {
                    if (node.config.webhookPayloadVariable && node.config.webhookPayloadVariable.trim() === '') {
                        errors.push(`Nodo webhook con variable de payload vacía: ${nodeLabel}`);
                    }
                    break;
                }

                case NodeTypeEnum.AI_AGENT: {
                    if (!node.config.aiPrompt || node.config.aiPrompt.trim() === '') {
                        warnings.push(`Nodo Agente IA sin prompt configurado: ${nodeLabel}`);
                    }
                    break;
                }

                case NodeTypeEnum.AI_TOOL_VARIABLE:
                case NodeTypeEnum.AI_TOOL_JSON_EXTRACT:
                case NodeTypeEnum.AI_TOOL_TEMPLATE_RENDER:
                case NodeTypeEnum.AI_TOOL_CONDITION_EVAL:
                case NodeTypeEnum.AI_TOOL_DATETIME:
                case NodeTypeEnum.AI_TOOL_TEXT_UTILS:
                case NodeTypeEnum.AI_TOOL_HTTP: {
                    if (!node.config.toolName || node.config.toolName.trim() === '') {
                        warnings.push(`AI Tool sin nombre técnico configurado: ${nodeLabel}`);
                    }
                    break;
                }

                case NodeTypeEnum.ROUTER: {
                    if (!node.config.routerVariable || node.config.routerVariable.trim() === '') {
                        warnings.push(`Nodo Router sin variable configurada: ${nodeLabel}`);
                    }
                    if (!node.config.routerCases || node.config.routerCases.length === 0) {
                        warnings.push(`Nodo Router sin casos configurados: ${nodeLabel}`);
                    }
                    break;
                }

                case NodeTypeEnum.ERROR_HANDLER: {
                    if (node.config.errorHandlerEnabled === undefined) {
                        warnings.push(`Nodo Manejo de Error sin configurar: ${nodeLabel}`);
                    }
                    break;
                }

                case NodeTypeEnum.LOOP: {
                    if (
                        node.config.loopMode === 'foreach' &&
                        (!node.config.loopArrayVariable || node.config.loopArrayVariable.trim() === '')
                    ) {
                        warnings.push(`Nodo Bucle ForEach sin variable de array: ${nodeLabel}`);
                    }
                    if (node.config.loopMode === 'times' && (!node.config.loopCount || node.config.loopCount <= 0)) {
                        warnings.push(`Nodo Bucle Times sin cantidad de repeticiones: ${nodeLabel}`);
                    }
                    if (
                        node.config.loopMode === 'while' &&
                        (!node.config.loopConditionField || node.config.loopConditionField.trim() === '')
                    ) {
                        warnings.push(`Nodo Bucle While sin campo de condición: ${nodeLabel}`);
                    }
                    break;
                }

                case NodeTypeEnum.PARALLEL: {
                    if (!node.config.parallelBranches || node.config.parallelBranches < 2) {
                        warnings.push(`Nodo Paralelo debe tener al menos 2 ramas: ${nodeLabel}`);
                    }
                    break;
                }

                case NodeTypeEnum.CACHE: {
                    if (!node.config.cacheKey || node.config.cacheKey.trim() === '') {
                        warnings.push(`Nodo Cache sin clave configurada: ${nodeLabel}`);
                    }
                    break;
                }

                case NodeTypeEnum.MERGE: {
                    if (!node.config.mergeExpectedInputs || node.config.mergeExpectedInputs < 2) {
                        warnings.push(`Nodo Merge debe esperar al menos 2 entradas: ${nodeLabel}`);
                    }
                    break;
                }

                case NodeTypeEnum.JSON_MENU: {
                    if (!node.config.jsonMenuSourceVariable || node.config.jsonMenuSourceVariable.trim() === '') {
                        warnings.push(`Nodo Menú JSON sin variable fuente configurada: ${nodeLabel}`);
                    }
                    if (!node.config.jsonMenuLabelField || node.config.jsonMenuLabelField.trim() === '') {
                        warnings.push(`Nodo Menú JSON sin campo de etiqueta: ${nodeLabel}`);
                    }
                    break;
                }

                case NodeTypeEnum.CUSTOMER_REGISTER: {
                    const fields = node.config.customerFields || [];
                    if (fields.length === 0) {
                        errors.push(`Nodo Registro cliente sin campos configurados: ${nodeLabel}`);
                    }
                    fields.forEach((field, index) => {
                        if (!field.key || field.key.trim() === '') {
                            errors.push(`Campo ${index + 1} sin key en nodo Registro cliente: ${nodeLabel}`);
                        }
                        if (field.validation === 'regex' && (!field.pattern || field.pattern.trim() === '')) {
                            errors.push(`Campo ${index + 1} sin regex en nodo Registro cliente: ${nodeLabel}`);
                        }
                    });
                    break;
                }

                default: {
                    break;
                }
            }
        });

        flowData.connections.forEach(connection => {
            const sourceNode = flowData.nodes.find(node => node.id === connection.sourceNodeId);
            const targetNode = flowData.nodes.find(node => node.id === connection.targetNodeId);

            if (!sourceNode || !targetNode) {
                return;
            }

            const isAgentToolPort = sourceNode.type === NodeTypeEnum.AI_AGENT && connection.sourcePortIndex === 1;
            if (isAgentToolPort && !String(targetNode.type).startsWith('ai_tool_')) {
                errors.push(
                    `Conexión inválida en TOOL: ${sourceNode.label || sourceNode.id} -> ${targetNode.label || targetNode.id}`,
                );
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    };

    const nodeValidationMap = computed<Record<string, NodeValidationState>>(() => {
        const validationMap: Record<string, NodeValidationState> = {};

        nodes.value.forEach(node => {
            let state: NodeValidationState | null = null;

            switch (node.type) {
                case NodeTypeEnum.MESSAGE: {
                    if (
                        (!node.config.messageType || node.config.messageType === 'text') &&
                        (!node.config.message || node.config.message.trim() === '')
                    ) {
                        state = 'warning';
                    }

                    if (
                        node.config.messageType &&
                        node.config.messageType !== 'text' &&
                        (!node.config.messageMediaUrl || node.config.messageMediaUrl.trim() === '')
                    ) {
                        state = 'error';
                    }
                    break;
                }

                case NodeTypeEnum.QUESTION: {
                    const hasQuestionText = Boolean(node.config.question && node.config.question.trim() !== '');
                    const hasVariableName = Boolean(node.config.variableName && node.config.variableName.trim() !== '');

                    if (!hasQuestionText) {
                        state = 'error';
                    } else if (
                        node.config.expectedAnswer === 'regex' &&
                        (!node.config.validationPattern || node.config.validationPattern.trim() === '')
                    ) {
                        state = 'error';
                    } else if (!hasVariableName) {
                        state = 'warning';
                    }
                    break;
                }

                case NodeTypeEnum.MENU: {
                    const options = node.config.menuOptions || [];
                    const hasInvalidOption = options.some(option => !option.label || option.label.trim() === '');

                    if (options.length === 0 || hasInvalidOption) {
                        state = 'error';
                    }
                    break;
                }

                case NodeTypeEnum.CONDITION: {
                    const conditions = node.config.conditions || [];
                    const hasMissingField = conditions.some(
                        condition => !condition.field || condition.field.trim() === '',
                    );
                    const hasMissingValue = conditions.some(
                        condition => !condition.value || condition.value.trim() === '',
                    );

                    if (conditions.length === 0 || hasMissingField) {
                        state = 'error';
                    } else if (hasMissingValue) {
                        state = 'warning';
                    }
                    break;
                }

                case NodeTypeEnum.API_CALL: {
                    if (!node.config.apiUrl || node.config.apiUrl.trim() === '') {
                        state = 'error';
                    } else if (
                        node.config.apiResponseFormat === 'json' &&
                        node.config.apiResponseTemplate &&
                        node.config.apiResponseTemplate.trim() !== ''
                    ) {
                        try {
                            JSON.parse(node.config.apiResponseTemplate);
                        } catch {
                            state = 'error';
                        }
                    }
                    break;
                }

                case NodeTypeEnum.DELAY: {
                    if (!node.config.delayTime || node.config.delayTime <= 0) {
                        state = 'error';
                    }
                    break;
                }

                case NodeTypeEnum.VARIABLE: {
                    if (!node.config.variableName || node.config.variableName.trim() === '') {
                        state = 'error';
                    }
                    break;
                }

                case NodeTypeEnum.SEND_TO: {
                    if (!node.config.queueId) {
                        state = 'error';
                    }
                    break;
                }

                case NodeTypeEnum.FLOW: {
                    if (!node.config.linkedFlowId) {
                        state = 'error';
                    }
                    break;
                }

                case NodeTypeEnum.WEBHOOK: {
                    if (node.config.webhookPayloadVariable && node.config.webhookPayloadVariable.trim() === '') {
                        state = 'error';
                    }
                    break;
                }

                case NodeTypeEnum.AI_AGENT: {
                    if (!node.config.aiPrompt || node.config.aiPrompt.trim() === '') {
                        state = 'warning';
                    }
                    break;
                }

                case NodeTypeEnum.ROUTER: {
                    if (!node.config.routerVariable || node.config.routerVariable.trim() === '') {
                        state = 'warning';
                    }
                    if (!node.config.routerCases || node.config.routerCases.length === 0) {
                        state = 'warning';
                    }
                    break;
                }

                case NodeTypeEnum.ERROR_HANDLER: {
                    if (node.config.errorHandlerEnabled === undefined) {
                        state = 'warning';
                    }
                    break;
                }

                case NodeTypeEnum.LOOP: {
                    if (
                        node.config.loopMode === 'foreach' &&
                        (!node.config.loopArrayVariable || node.config.loopArrayVariable.trim() === '')
                    ) {
                        state = 'warning';
                    }
                    if (node.config.loopMode === 'times' && (!node.config.loopCount || node.config.loopCount <= 0)) {
                        state = 'warning';
                    }
                    break;
                }

                case NodeTypeEnum.PARALLEL: {
                    if (!node.config.parallelBranches || node.config.parallelBranches < 2) {
                        state = 'warning';
                    }
                    break;
                }

                case NodeTypeEnum.CACHE: {
                    if (!node.config.cacheKey || node.config.cacheKey.trim() === '') {
                        state = 'warning';
                    }
                    break;
                }

                case NodeTypeEnum.MERGE: {
                    if (!node.config.mergeExpectedInputs || node.config.mergeExpectedInputs < 2) {
                        state = 'warning';
                    }
                    break;
                }

                case NodeTypeEnum.AI_TOOL_VARIABLE:
                case NodeTypeEnum.AI_TOOL_JSON_EXTRACT:
                case NodeTypeEnum.AI_TOOL_TEMPLATE_RENDER:
                case NodeTypeEnum.AI_TOOL_CONDITION_EVAL:
                case NodeTypeEnum.AI_TOOL_DATETIME:
                case NodeTypeEnum.AI_TOOL_TEXT_UTILS:
                case NodeTypeEnum.AI_TOOL_HTTP: {
                    if (!node.config.toolName || node.config.toolName.trim() === '') {
                        state = 'warning';
                    }
                    break;
                }

                case NodeTypeEnum.JSON_MENU: {
                    if (!node.config.jsonMenuSourceVariable || node.config.jsonMenuSourceVariable.trim() === '') {
                        state = 'warning';
                    }
                    if (!node.config.jsonMenuLabelField || node.config.jsonMenuLabelField.trim() === '') {
                        state = 'warning';
                    }
                    break;
                }

                case NodeTypeEnum.CUSTOMER_REGISTER: {
                    const fields = node.config.customerFields || [];
                    const hasMissingKey = fields.some(field => !field.key || field.key.trim() === '');
                    const hasRegexMissing = fields.some(
                        field => field.validation === 'regex' && (!field.pattern || field.pattern.trim() === ''),
                    );
                    if (fields.length === 0 || hasMissingKey || hasRegexMissing) {
                        state = 'error';
                    }
                    break;
                }

                case NodeTypeEnum.INTERNAL_FUNCTION: {
                    if (!node.config.internalFunctionName || node.config.internalFunctionName.trim() === '') {
                        state = 'warning';
                    }
                    break;
                }

                case NodeTypeEnum.AI_TOOL_INTERNAL_FUNCTION: {
                    if (!node.config.internalFunctionName || node.config.internalFunctionName.trim() === '') {
                        state = 'warning';
                    }
                    break;
                }

                default: {
                    break;
                }
            }

            if (state) {
                validationMap[node.id] = state;
            }
        });

        return validationMap;
    });

    const initializeFlow = () => {
        nodes.value = [];
        connections.value = [];
        undoHistory.value = [];
        redoHistory.value = [];
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
        description.value = 'Nuevo flujo';
        flowType.value = 'inbound';
        id = null;
        saveToUndoHistory();
        markFlowAsPersisted();
    };

    // Agregar un nodo al canvas
    const handleAddNode = (nodeType: NodeType, position?: Position) => {
        const definition = getNodeDefinition(nodeType);
        if (!definition) {
            return;
        }

        if (nodeType === NodeTypeEnum.START && nodes.value.some(node => isStartNode(node))) {
            versaAlert({
                type: 'warning',
                title: 'Nodo inicio existente',
                message: 'Ya existe un nodo de inicio en el flujo.',
            });
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

        saveToUndoHistory();
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
        const node = nodes.value.find(n => n.id === nodeId);
        if (isStartNode(node)) {
            versaAlert({
                type: 'warning',
                title: 'Nodo protegido',
                message: 'No se puede eliminar el nodo de inicio.',
            });
            return;
        }

        saveToUndoHistory();
        connections.value = connections.value.filter(c => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId);
        nodes.value = nodes.value.filter(n => n.id !== nodeId);

        if (selectedNodeId.value === nodeId) {
            selectedNodeId.value = null;
        }

        if (editorNodeId.value === nodeId) {
            editorNodeId.value = null;
        }
    };

    // Crear una conexión entre nodos
    const handleConnectionCreate = (connection: Omit<Connection, 'id'>) => {
        const sourceNode = nodes.value.find(n => n.id === connection.sourceNodeId);
        const targetNode = nodes.value.find(n => n.id === connection.targetNodeId);

        if (!sourceNode || !targetNode) {
            return;
        }

        const isAgentToolPort = sourceNode.type === NodeTypeEnum.AI_AGENT && connection.sourcePortIndex === 1;
        const isTargetAiTool = String(targetNode.type).startsWith('ai_tool_');

        if (isAgentToolPort && !isTargetAiTool) {
            versaAlert({
                type: 'warning',
                title: 'Conexión inválida',
                message: 'El puerto TOOL del agente solo puede conectarse a nodos AI Tool.',
            });
            return;
        }

        const samePortConnectionIndex = connections.value.findIndex(
            c => c.sourceNodeId === connection.sourceNodeId && c.sourcePortIndex === connection.sourcePortIndex,
        );

        if (samePortConnectionIndex !== -1 && !isAgentToolPort) {
            connections.value.splice(samePortConnectionIndex, 1);
        }

        const exists = connections.value.some(
            c =>
                c.sourceNodeId === connection.sourceNodeId &&
                c.sourcePortIndex === connection.sourcePortIndex &&
                c.targetNodeId === connection.targetNodeId &&
                c.targetPortIndex === connection.targetPortIndex,
        );

        if (exists) {
            versaAlert({
                type: 'warning',
                title: 'Conexión duplicada',
                message: 'Esta conexión ya existe.',
            });
            return;
        }

        saveToUndoHistory();
        const newConnection: Connection = {
            ...connection,
            id: `conn-${connectionIdCounter.value++}`,
        };

        connections.value.push(newConnection);
    };

    const handleConnectionDelete = (connectionId: string) => {
        saveToUndoHistory();
        connections.value = connections.value.filter(c => c.id !== connectionId);
    };

    const handleUpdateNode = (nodeId: string, updates: Partial<FlowNode>) => {
        const node = nodes.value.find(n => n.id === nodeId);
        if (node) {
            saveToUndoHistory();
            const cleanUpdates = Object.fromEntries(
                Object.entries(updates).filter(([, value]) => value !== undefined),
            ) as Partial<FlowNode>;

            Object.assign(node, cleanUpdates);

            if (node.type === 'menu' && updates.config?.menuOptions) {
                const optionsCount = updates.config.menuOptions.length;
                node.outputs = Math.max(1, optionsCount);
            }

            if (node.type === 'condition' && updates.config?.conditions) {
                const conditionsCount = updates.config.conditions.length;
                node.outputs = Math.max(1, conditionsCount + 1);
            }

            if (node.type === 'router' && updates.config?.routerCases) {
                const casesCount = updates.config.routerCases.length;
                node.outputs = Math.max(1, casesCount + 1);
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

    const saveFlowFetch = async (data: FlowData): Promise<VersaFetchResponse> => {
        const response = await versaFetch({
            url: `/${panelUrl}/chatbot/flowBuilder/api/save/${empresaSelected}`,
            method: 'POST',
            data: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response;
    };

    const cloneFlowFetch = (flowId: number): Promise<VersaFetchResponse> =>
        versaFetch({
            url: `/${panelUrl}/chatbot/flowBuilder/api/clone/${empresaSelected}`,
            method: 'POST',
            data: JSON.stringify({ id: flowId, csrf_token: csrf_token.value }),
            headers: {
                'Content-Type': 'application/json',
            },
        });

    const deleteFlowFetch = (flowId: number): Promise<VersaFetchResponse> =>
        versaFetch({
            url: `/${panelUrl}/chatbot/flowBuilder/api/delete/${empresaSelected}`,
            method: 'POST',
            data: JSON.stringify({ id: flowId, csrf_token: csrf_token.value }),
            headers: {
                'Content-Type': 'application/json',
            },
        });

    const activeFlowFetch = (flowId: number): Promise<VersaFetchResponse> =>
        versaFetch({
            url: `/${panelUrl}/chatbot/flowBuilder/api/active/${empresaSelected}`,
            method: 'POST',
            data: JSON.stringify({ id: flowId, csrf_token: csrf_token.value }),
            headers: {
                'Content-Type': 'application/json',
            },
        });

    // Guardar el flujo
    const handleSaveFlow = async (): Promise<void> => {
        const flowData = {
            nodes: nodes.value,
            connections: connections.value,
            csrf_token: csrf_token.value,
            description: description.value,
            flow_type: flowType.value,
            id,
        };
        //Validar que el flujo tenga al menos un nodo aparte del inicio
        if (nodes.value.length <= 1 || connections.value.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Flujo vacío',
                text: 'Debes agregar a lo menos un nodo al flujo y una conexión antes de guardarlo.',
            });
            return;
        }

        if (
            description.value === '' ||
            description.value === null ||
            description.value === undefined ||
            description.value === 'Nuevo flujo'
        ) {
            Swal.fire({
                icon: 'warning',
                title: 'Descripción no valida',
                text: 'Debes agregar una descripción valida al flujo.',
            });
            return;
        }

        const validation = validateFlowIntegrity({
            nodes: flowData.nodes,
            connections: flowData.connections,
        });
        if (!validation.isValid) {
            versaAlert({
                type: 'warning',
                title: 'Flujo inválido',
                message: validation.message,
            });
            return;
        }

        const nodeConfigValidation = validateNodesConfiguration({
            nodes: flowData.nodes,
            connections: flowData.connections,
        });
        if (!nodeConfigValidation.isValid) {
            Swal.fire({
                icon: 'error',
                title: 'Configuración incompleta',
                html: `<div class="text-left"><p class="mb-2">No se puede guardar hasta corregir:</p><ul class="list-disc pl-5">${nodeConfigValidation.errors
                    .slice(0, 10)
                    .map(error => `<li>${error}</li>`)
                    .join('')}</ul></div>`,
            });
            return;
        }

        if (nodeConfigValidation.warnings.length > 0) {
            versaAlert({
                type: 'warning',
                title: 'Guardado con advertencias',
                message: `Se detectaron ${nodeConfigValidation.warnings.length} advertencias. El flujo se guardará igualmente.`,
            });
        }

        await Swal.fire({
            title: 'Guardando flujo...',
            text: 'Por favor espera mientras se guarda el flujo del chatbot.',
            allowOutsideClick: false,
            didOpen: async () => {
                Swal.showLoading();
                const res = await saveFlowFetch(flowData);
                if (res.success === 1) {
                    let savedId: number | null = id;
                    if (typeof (res as { id?: unknown }).id === 'number') {
                        savedId = (res as { id?: number }).id ?? null;
                    } else if (typeof (res as { data?: { id?: unknown } }).data?.id === 'number') {
                        savedId = Number((res as { data?: { id?: number } }).data?.id);
                    }

                    id = savedId ?? id;
                    markFlowAsPersisted();
                    clearLocalDraft();
                    versaAlert({
                        type: 'success',
                        title: 'Flujo guardado',
                        message: 'El flujo del chatbot se ha guardado correctamente.',
                        callback: () => {
                            Swal.close();
                        },
                    });

                    return;
                }
                versaAlert({
                    type: 'error',
                    title: 'Error al guardar',
                    message: res.message || 'Hubo un error al guardar el flujo del chatbot.',
                    callback: () => {
                        Swal.close();
                    },
                });
            },
        });
    };

    // Limpiar el canvas
    const handleClearCanvas = async () => {
        const result = await Swal.fire({
            title: '¿Limpiar canvas?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, limpiar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
        });

        if (result.isConfirmed) {
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
    const testPanelHeight = ref(0);
    const showVariablesHelp = ref(false);

    const contextVariables = [
        {
            name: 'sender_id',
            description: 'ID único del usuario en la red social',
            example: '56912345678 (WhatsApp) / 123456789 (Telegram)',
        },
        { name: 'sender_name', description: 'Nombre del usuario', example: 'Juan Pérez' },
        { name: 'platform', description: 'Canal de comunicación', example: 'whatsapp, telegram, facebook, instagram' },
        { name: 'channel', description: 'Código interno del canal', example: 'whatsapp, telegram' },
        { name: 'trunk_id', description: 'ID de la troncal (modo trunk)', example: '15' },
        { name: 'trunk_token', description: 'Token de la troncal (modo trunk)', example: 'abc123...' },
        {
            name: 'message_type',
            description: 'Tipo de mensaje recibido',
            example: 'text, image, video, audio, document',
        },
        { name: 'media_url', description: 'URL del archivo multimedia (si aplica)', example: 'https://...' },
    ];

    const handleOpenVariablesHelp = () => {
        showVariablesHelp.value = true;
    };

    const handleCloseTestModal = () => {
        showTestModal.value = false;
        testActiveNodeId.value = null;
        testVisitedNodeIds.value = [];
        testPanelHeight.value = 0;
    };

    const handleOpenTestModal = () => {
        if (nodes.value.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Sin nodos',
                text: 'Agrega nodos al flujo antes de probarlo',
            });
            return;
        }

        const validation = validateNodesConfiguration({
            nodes: nodes.value,
            connections: connections.value,
        });

        if (validation.errors.length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'Flujo incompleto para prueba',
                html: `<div class="text-left"><p class="mb-2">Corrige los siguientes puntos:</p><ul class="list-disc pl-5">${validation.errors
                    .slice(0, 8)
                    .map(error => `<li>${error}</li>`)
                    .join('')}</ul></div>`,
            });
            return;
        }

        if (validation.warnings.length > 0) {
            versaAlert({
                type: 'warning',
                title: 'Advertencias en el flujo',
                message: validation.warnings.join('\n'),
            });
        }

        showTestModal.value = true;
    };

    // Actualizar nodo activo desde el modal de prueba
    const handleUpdateActiveNode = (nodeId: string | null) => {
        testActiveNodeId.value = nodeId;
    };

    // Actualizar nodos visitados desde el modal de prueba
    const handleUpdateVisitedNodes = (nodeIds: string[]) => {
        testVisitedNodeIds.value = nodeIds;
    };

    // Actualizar altura del panel de pruebas
    const handleUpdatePanelHeight = (height: number) => {
        testPanelHeight.value = height;
    };

    // Auto-centrar el canvas en el nodo activo durante la prueba
    watch(testActiveNodeId, async nodeId => {
        if (nodeId && showTestModal.value) {
            await nextTick();
            setTimeout(() => {
                if (flowCanvasRef.value) {
                    flowCanvasRef.value.centerOnNode(nodeId);
                }
            }, 100);
        }
    });

    watch(
        [nodes, connections, description, flowType, panelShow],
        () => {
            if (isRestoringLocalDraft || panelShow.value !== 'flowBuilder') {
                return;
            }
            scheduleDraftSave();
        },
        { deep: true },
    );

    // Modo Zen - Pantalla Completa
    const toggleZenMode = () => {
        isZenMode.value = !isZenMode.value;
    };

    // Cerrar modo zen con tecla ESC
    const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && isZenMode.value) {
            isZenMode.value = false;
        }
        if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
            event.preventDefault();
            if (event.shiftKey) {
                handleRedo();
            } else {
                handleUndo();
            }
        }
        if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
            event.preventDefault();
            handleRedo();
        }
    };

    const handleBeforeUnload = () => {
        flushDraftSave();
    };

    // Agregar listener de teclado
    onMounted(() => {
        window.addEventListener('keydown', handleKeydown);
        window.addEventListener('beforeunload', handleBeforeUnload);
    });

    onUnmounted(() => {
        flushDraftSave();
        window.removeEventListener('keydown', handleKeydown);
        window.removeEventListener('beforeunload', handleBeforeUnload);
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
    const handleImportFromModal = (flowData: ImportedFlowData) => {
        const normalizedData = normalizeImportedFlowData(flowData);
        if (!normalizedData) {
            versaAlert({
                type: 'error',
                title: 'Importación inválida',
                message: 'El archivo no contiene una estructura válida de nodos y conexiones.',
            });
            return;
        }

        const normalizedWithStart = ensureStartNodeExists(normalizedData);

        // Limpiar flujo actual
        nodes.value = [];
        connections.value = [];

        // Importar nodos y conexiones
        description.value = flowData.name || 'Flujo sin nombre';
        nodes.value = normalizedWithStart.nodes;
        connections.value = normalizedWithStart.connections;

        recalculateCounters();

        const startNodeWasInjected = normalizedData.nodes.length !== normalizedWithStart.nodes.length;

        versaAlert({
            type: 'success',
            title: 'Importación completada',
            message: startNodeWasInjected
                ? `Se importaron ${nodes.value.length} nodos y ${connections.value.length} conexiones. Se agregó un nodo de inicio automáticamente.`
                : `Se importaron ${nodes.value.length} nodos y ${connections.value.length} conexiones.`,
        });
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
        link.download = `${description.value}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const accion = (accion: AccionData) => {
        const itemId = Number(accion.item?.id || 0);

        const handleCloneFlow = async () => {
            if (!itemId) {
                versaAlert({
                    type: 'error',
                    title: 'ID inválido',
                    message: 'No se pudo identificar el flujo a clonar.',
                });
                return;
            }

            const cloneRes = await cloneFlowFetch(itemId);
            if (cloneRes.success === 1) {
                versaAlert({
                    type: 'success',
                    title: 'Flujo clonado',
                    message: cloneRes.message || 'El flujo fue clonado correctamente.',
                });
                panelShow.value = 'table';
                refreshTable();
                return;
            }

            versaAlert({
                type: 'error',
                title: 'Error al clonar',
                message: cloneRes.message || 'No fue posible clonar el flujo.',
            });
        };

        const handleDeleteFlow = async () => {
            if (!itemId) {
                versaAlert({
                    type: 'error',
                    title: 'ID inválido',
                    message: 'No se pudo identificar el flujo a eliminar.',
                });
                return;
            }

            const result = await Swal.fire({
                title: '¿Eliminar flujo?',
                text: 'El flujo se archivará y dejará de estar disponible en la tabla principal.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#ef4444',
            });

            if (!result.isConfirmed) {
                return;
            }

            const deleteRes = await deleteFlowFetch(itemId);
            if (deleteRes.success === 1) {
                versaAlert({
                    type: 'success',
                    title: 'Flujo eliminado',
                    message: deleteRes.message || 'El flujo fue eliminado correctamente.',
                });
                panelShow.value = 'table';
                refreshTable();
                return;
            }

            versaAlert({
                type: 'error',
                title: 'Error al eliminar',
                message: deleteRes.message || 'No fue posible eliminar el flujo.',
            });
        };

        const handleActiveFlow = async () => {
            if (!itemId) {
                versaAlert({
                    type: 'error',
                    title: 'ID inválido',
                    message: 'No se pudo identificar el flujo a activar.',
                });
                return;
            }

            const result = await Swal.fire({
                title: '¿Activar flujo?',
                text: 'El flujo se activará y estará disponible en la tabla principal.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, activar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#ef4444',
            });

            if (!result.isConfirmed) {
                return;
            }

            const activeRes = await activeFlowFetch(itemId);
            if (activeRes.success === 1) {
                versaAlert({
                    type: 'success',
                    title: 'Flujo activado',
                    message: activeRes.message || 'El flujo fue activado correctamente.',
                });
                panelShow.value = 'table';
                refreshTable();
                return;
            }

            versaAlert({
                type: 'error',
                title: 'Error al activar',
                message: activeRes.message || 'No fue posible activar el flujo.',
            });
        };

        const actions: actionsType = {
            newFlow: () => {
                panelShow.value = 'flowBuilder';
                initializeFlow();
                promptRestoreLocalDraft().catch(() => null);
            },
            openTable: () => {
                if (hasUnsavedChanges.value) {
                    flushDraftSave();
                } else {
                    clearLocalDraft();
                }
                panelShow.value = 'table';
            },
            editFlow: () => {
                initializeFlow();
                description.value = accion.item.description || 'Flujo sin título';
                flowType.value = accion.item.flow_type === 'outbound' ? 'outbound' : 'inbound';
                nodes.value = parseJsonArray<FlowNode>(accion.item.nodes);
                connections.value = parseJsonArray<Connection>(accion.item.connections);
                recalculateCounters();
                id = Number(accion.item.id) || null;
                markFlowAsPersisted();
                panelShow.value = 'flowBuilder';
                promptRestoreLocalDraft().catch(() => null);
            },
            cloneFlow: () => {
                handleCloneFlow().catch(() => null);
            },
            deleteFlow: () => {
                handleDeleteFlow().catch(() => null);
            },
            activeFlow: () => {
                handleActiveFlow().catch(() => null);
            },
        };
        const fn = actions[accion.accion];
        if (typeof fn === 'function') {
            fn();
        }
    };

    // Inicializar el flujo al montar el componente
</script>

<template>
    <div class="flow-builder-container" :class="{ 'zen-mode': isZenMode }">
        <!-- Breadcrumb -->
        <Breadcrumb
            v-if="!isZenMode && panelShow === 'table'"
            title="Flow Builder"
            iconSVG="<svg class='w-[32px] h-[32px] text-gray-800 dark:text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M13 10V3L4 14h7v7l9-11h-7z'></path></svg>"
            :items="breadCrumbList" />

        <FlowBuilderTable v-if="panelShow === 'table'" :key="tableRefreshKey" @accion="accion" />
        <div v-else class="flex-1 relative overflow-y-auto" :class="{ 'zen-content': isZenMode }">
            <LineHr v-if="!isZenMode && panelShow === 'table'" />

            <!-- Toolbar -->
            <div
                class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700"
                :class="{ 'zen-toolbar': isZenMode, relative: !isZenMode }">
                <div v-if="!isZenMode" class="flex items-center gap-2">
                    <div class="flex items-center gap-2 group">
                        <div class="relative flex items-center">
                            <input
                                ref="descriptionInput"
                                v-model="description"
                                type="text"
                                :readonly="!isEditingDescription"
                                placeholder="Agrega una descripción para tu flujo..."
                                @blur="disableDescriptionEdit"
                                @keydown.enter="disableDescriptionEdit"
                                :class="[
                                    'px-2 py-1 text-sm rounded-lg transition-all duration-200 w-full max-w-xs',
                                    isEditingDescription
                                        ? 'border border-brand dark:border-brand bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent'
                                        : 'border border-transparent bg-transparent text-gray-900 dark:text-white cursor-default hover:bg-gray-50 dark:hover:bg-gray-700/50',
                                ]" />
                            <button
                                v-if="!isEditingDescription"
                                @click="enableDescriptionEdit"
                                class="ml-1 p-1.5 text-gray-400 hover:text-brand dark:hover:text-brand rounded transition-colors opacity-0 group-hover:opacity-100"
                                title="Editar descripción">
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
                                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">Tipo</span>
                        <select
                            v-model="flowType"
                            class="px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand">
                            <option value="inbound">Inbound</option>
                            <option value="outbound">Outbound</option>
                        </select>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <!-- Búsqueda de nodos -->
                    <div class="relative">
                        <input
                            v-model="searchNodeQuery"
                            type="text"
                            placeholder="Buscar nodos..."
                            class="w-40 px-3 py-2 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                            @input="handleNodeSearch" />
                        <svg
                            class="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <!-- Dropdown de resultados -->
                        <div
                            v-if="searchNodeQuery && searchResults.length > 0"
                            class="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                            <button
                                v-for="result in searchResults"
                                :key="result.id"
                                type="button"
                                class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                                @click="handleSelectSearchResult(result.id)">
                                <span
                                    class="w-2 h-2 rounded-full"
                                    :style="{ backgroundColor: getNodeColor(result.type) }"></span>
                                <span class="flex-1 truncate">{{ result.label }}</span>
                                <span class="text-xs text-gray-400">{{ result.type }}</span>
                            </button>
                        </div>
                    </div>

                    <button
                        @click="handleAutoLayout"
                        class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors flex items-center gap-2"
                        title="Organizar nodos automáticamente">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                        </svg>
                        Auto-layout
                    </button>

                    <button
                        @click="handleClearCanvas"
                        class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-corporate-orange-300 hover:bg-corporate-orange-50 dark:hover:bg-corporate-orange-600 border border-corporate-orange-300 dark:border-corporate-orange-600 rounded-lg transition-colors flex items-center gap-2"
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
                        class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors flex items-center gap-2"
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
                        class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors flex items-center gap-2"
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
                        @click="handleOpenVariablesHelp"
                        class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors flex items-center gap-2"
                        title="Ver variables de contexto disponibles">
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
                                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                        </svg>
                        Variables
                    </button>

                    <button
                        @click="handleSaveFlow"
                        class="px-4 py-2 text-sm font-medium text-white bg-brand hover:bg-brand-600 dark:bg-brand dark:hover:bg-brand rounded-lg transition-colors flex items-center gap-2"
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
                        class="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-corporate-orange-50 dark:hover:bg-corporate-orange-600 border border-corporate-orange-300 dark:border-corporate-orange-50-600 transition-colors flex items-center gap-2"
                        title="Volver a la tabla">
                        <i class="bi bi-arrow-left"></i>
                        Salir
                    </button>
                </div>
            </div>

            <!-- Flow Builder Content -->
            <div class="flow-content" :style="{ height: `calc(100vh - ${testPanelHeight}px)` }">
                <!-- Panel Izquierdo: Paleta de Nodos -->
                <NodePalette :class="{ 'zen-palette': isZenMode }" @add-node="nodeType => handleAddNode(nodeType)" />

                <!-- Canvas Central -->
                <div class="canvas-wrapper">
                    <FlowCanvas
                        ref="flowCanvasRef"
                        :nodes="nodes"
                        :connections="connections"
                        :node-validation-map="nodeValidationMap"
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
                        v-model:width="editorWidth"
                        :selected-node="selectedNode"
                        :all-nodes="nodes"
                        :is-zen-mode="isZenMode"
                        @update-node="handleUpdateNode"
                        @close="handleEditorClose" />
                </Transition>
            </div>

            <!-- Modal de Importación -->
            <FlowLoadModal :show="showImportModal" @close="handleCloseImportModal" @import="handleImportFromModal" />

            <!-- Modal de Prueba del Flujo -->
            <FlowTestModal
                :show="showTestModal"
                :nodes="nodes"
                :connections="connections"
                @close="handleCloseTestModal"
                @update-active-node="handleUpdateActiveNode"
                @update-visited-nodes="handleUpdateVisitedNodes"
                @update-panel-height="handleUpdatePanelHeight" />

            <!-- Modal de Variables de Contexto -->
            <div
                v-if="showVariablesHelp"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                @click.self="showVariablesHelp = false">
                <div
                    class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
                    <div
                        class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <svg class="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                            </svg>
                            Variables de Contexto Disponibles
                        </h3>
                        <button
                            @click="showVariablesHelp = false"
                            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="p-6 overflow-y-auto max-h-[60vh]">
                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Estas variables están disponibles automáticamente en el flujo. Úsalas con la sintaxis
                            <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-brand">
                                {"{{ nombre_variable }}"}
                            </code>
                        </p>
                        <div class="space-y-3">
                            <div
                                v-for="variable in contextVariables"
                                :key="variable.name"
                                class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div class="flex items-center gap-2 mb-1">
                                    <code class="px-2 py-0.5 bg-brand/10 text-brand rounded text-sm font-mono">
                                        {{ variable.name }}
                                    </code>
                                </div>
                                <p class="text-sm text-gray-600 dark:text-gray-400">{{ variable.description }}</p>
                                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    <span class="font-medium">Ejemplo:</span>
                                    {{ variable.example }}
                                </p>
                            </div>
                        </div>
                        <div
                            class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                            <p class="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">💡 Tip de uso:</p>
                            <p class="text-sm text-blue-600 dark:text-blue-400">
                                En un nodo
                                <strong>Variable</strong>
                                , puedes usar
                                <code class="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">
                                    {"{{ sender_id }}"}
                                </code>
                                como valor para crear una sesión única por usuario.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
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

        transition: all 0.3s ease;
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
        min-height: calc(100vh - 140px);
    }

    .flow-content-with-panel {
        height: calc(100vh - var(--test-panel-height, 0px));
    }

    /* Contenido del flow builder en modo zen */
    .zen-mode .flow-content {
        height: 100%;
        width: 100%;
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
        position: fixed;
        left: 20px;
        top: 150px;
        z-index: 100;
        max-height: calc(100vh - 180px);
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
        z-index: 100;
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

    :global(.swal2-container) {
        z-index: 12000 !important;
    }

    :global(.swal2-popup) {
        z-index: 12001 !important;
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
