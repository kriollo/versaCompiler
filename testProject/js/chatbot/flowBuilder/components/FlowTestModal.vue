<script setup lang="ts">
    import Swal from 'sweetalert2';
import type { VersaFetchResponse, VersaParamsFetch } from 'versaTypes';
import {
    computed,
    inject,
    nextTick,
    onMounted,
    onUnmounted,
    ref,
    type Ref,
    watch,
    type WatchStopHandle,
} from 'vue';

    import { nodeRegistry } from '@/dashboard/js/chatbot/flowBuilder/nodes/index';
import { evaluateCondition } from '@/dashboard/js/chatbot/flowBuilder/nodes/modules/condition/conditionLogic';
import { type Connection, type FlowNode, NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
import { API_RESPONSE_CODES } from '@/dashboard/js/constants';
import { fetchGetEmpresas } from '@/dashboard/js/empresa/fetchEmpresa';
import { versaFetch } from '@/dashboard/js/functions';

    interface Props {
        show: boolean;
        nodes: FlowNode[];
        connections: Connection[];
    }

    const props = defineProps<Props>();

    const emit = defineEmits<{
        close: [];
        updateActiveNode: [nodeId: string | null];
        updateVisitedNodes: [nodeIds: string[]];
        updatePanelHeight: [height: number];
    }>();

    const panelUrl = inject<string>('panelUrl', '');
    const empresaSelected = inject<string>('empresaSelected', '');
    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));

    type ApiMethod = VersaParamsFetch['method'];

    // ─── Interfaces para Trunk Mode ─────────────────────────────────────────────────

    interface Empresa {
        id: number;
        nombre: string;
        slug: string;
        token_empresa: string;
    }

    interface Channel {
        id: number;
        nombre: string;
        codigo_interno: string;
        imagen: string;
    }

    interface Trunk {
        id: number;
        nombre: string;
        descripcion: string;
        token_trunk: string;
    }

    interface PlatformConfig {
        name: string;
        icon: string;
        botBubble: string;
        userBubble: string;
        headerBg: string;
        chatBg: string;
        inputBg: string;
    }

    interface ApiProxyResponse {
        success?: number | boolean;
        message?: string;
        statusCode?: number;
        payload?: unknown;
    }

    // Estado del test
    const isTestRunning = ref(false);
    type TestMediaType = 'image' | 'video' | 'audio' | 'file';

    // Modo de simulación backend (siempre activo)
    const useBackendSimulation = true;
    const backendCurrentNodeId = ref<string | null>(null);
    const backendVariables = ref<Record<string, unknown>>({});

    // ─── Trunk Mode State ──────────────────────────────────────────────────────────
    const empresas = ref<Empresa[]>([]);
    const channels = ref<Channel[]>([]);
    const trunks = ref<Trunk[]>([]);
    const selectedEmpresaToken = ref<string>('');
    const selectedChannelCode = ref<string>('');
    const selectedTrunkToken = ref<string>('');
    const isTrunkMode = ref(true);
    const loadingTrunkData = ref(false);
    const trunkConfigCollapsed = ref(false);
    const showTrunkConfigModal = ref(false);

    // User simulation state
    const senderId = ref<string>(`test_user_${Date.now()}`);
    const senderName = ref<string>('Usuario de Prueba');
    const testTicketId = ref<string>('');
    const outboundInitialMessage = ref<string>('');

    const generateNewSenderId = () => {
        senderId.value = `test_user_${Date.now()}`;
    };

    const getFileType = (mimeType: string): string => {
        if (mimeType.startsWith('image/')) {
            return 'image';
        }
        if (mimeType.startsWith('audio/')) {
            return 'audio';
        }
        if (mimeType.startsWith('video/')) {
            return 'video';
        }
        if (mimeType.startsWith('application/') || mimeType.startsWith('text/')) {
            return 'document';
        }
        return 'any';
    };

    const getMediaType = (mimeType: string): string => {
        if (mimeType.startsWith('image/')) {
            return 'image';
        }
        if (mimeType.startsWith('audio/')) {
            return 'audio';
        }
        if (mimeType.startsWith('video/')) {
            return 'video';
        }
        if (mimeType.startsWith('application/')) {
            return 'document';
        }
        return 'file';
    };

    const selectedChannelName = computed(
        () => channels.value.find(c => c.codigo_interno === selectedChannelCode.value)?.nombre ?? null,
    );

    const platformConfig = computed((): PlatformConfig => {
        const configs: Record<string, PlatformConfig> = {
            whatsapp: {
                name: 'WhatsApp',
                icon: 'bi-whatsapp',
                botBubble: 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm rounded-tl-none',
                userBubble: 'bg-[#DCF8C6] dark:bg-[#025C4C] text-gray-900 dark:text-gray-100 shadow-sm rounded-tr-none',
                headerBg: 'bg-[#075E54]',
                chatBg: 'bg-[#ECE5DD] dark:bg-[#0B141A]',
                inputBg: 'bg-[#F0F2F5] dark:bg-[#1F2C34]',
            },
            telegram: {
                name: 'Telegram',
                icon: 'bi-telegram',
                botBubble: 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm rounded-tl-none',
                userBubble: 'bg-[#EFFDDD] dark:bg-[#2B5278] text-gray-900 dark:text-white shadow-sm rounded-tr-none',
                headerBg: 'bg-[#2AABEE]',
                chatBg: 'bg-[#17212B]',
                inputBg: 'bg-[#1C2733]',
            },
            facebook: {
                name: 'Messenger',
                icon: 'bi-messenger',
                botBubble: 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm rounded-tl-none',
                userBubble: 'bg-[#0084FF] text-white shadow-sm rounded-tr-none',
                headerBg: 'bg-[#0084FF]',
                chatBg: 'bg-white dark:bg-gray-900',
                inputBg: 'bg-gray-100 dark:bg-gray-800',
            },
            instagram: {
                name: 'Instagram',
                icon: 'bi-instagram',
                botBubble: 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm rounded-tl-none',
                userBubble: 'bg-gradient-to-br from-[#833AB4] to-[#E1306C] text-white shadow-sm rounded-tr-none',
                headerBg: 'bg-gradient-to-r from-[#833AB4] via-[#C13584] to-[#E1306C]',
                chatBg: 'bg-white dark:bg-gray-900',
                inputBg: 'bg-gray-50 dark:bg-gray-800',
            },
        };
        return (
            configs[selectedChannelCode.value] ?? {
                name: selectedChannelName.value ?? 'Canal',
                icon: 'bi-chat-dots',
                botBubble: 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm rounded-tl-none',
                userBubble: 'bg-brand text-white shadow-sm rounded-tr-none',
                headerBg: 'bg-gray-700',
                chatBg: 'bg-gray-50 dark:bg-gray-900',
                inputBg: 'bg-gray-100 dark:bg-gray-800',
            }
        );
    });

    // ─── API Loaders for Trunk Mode ────────────────────────────────────────────────
    const loadEmpresas = async () => {
        try {
            const response = await fetchGetEmpresas();
            if (response.success === API_RESPONSE_CODES.SUCCESS && response.data) {
                empresas.value = response.data;
            }
        } catch (error) {
            console.error('Error loading empresas:', error);
        }
    };

    const loadChannels = async () => {
        if (!selectedEmpresaToken.value) {
            return;
        }
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/chatbot/api/channels/${selectedEmpresaToken.value}`,
                method: 'GET',
            });
            if (response.success === API_RESPONSE_CODES.SUCCESS && response.data) {
                channels.value = response.data;
                selectedChannelCode.value = '';
                trunks.value = [];
                selectedTrunkToken.value = '';
            }
        } catch (error) {
            console.error('Error loading channels:', error);
        }
    };

    const loadTrunks = async () => {
        if (!selectedEmpresaToken.value || !selectedChannelCode.value) {
            return;
        }
        const channel = channels.value.find(c => c.codigo_interno === selectedChannelCode.value);
        if (!channel) {
            return;
        }
        try {
            const response = await versaFetch({
                url: `/${panelUrl}/chatbot/api/trunks/${selectedEmpresaToken.value}/${channel.id}`,
                method: 'GET',
            });
            if (response.success === API_RESPONSE_CODES.SUCCESS && response.data) {
                trunks.value = response.data;
                selectedTrunkToken.value = '';
            }
        } catch (error) {
            console.error('Error loading trunks:', error);
        }
    };

    // Lifecycle
    onMounted(async () => {
        await loadEmpresas();
    });

    // Estado del panel
    const MIN_PANEL_HEIGHT = 150;
    const MAX_PANEL_HEIGHT = 600;
    const DEFAULT_PANEL_HEIGHT = 350;
    const panelHeight = ref(DEFAULT_PANEL_HEIGHT);
    const isCollapsed = ref(false);
    const isResizing = ref(false);
    const resizeStartY = ref(0);
    const resizeStartHeight = ref(0);

    // Panel widths (resizable)
    const chatPanelWidth = ref(300);
    const statePanelWidth = ref(220);
    const isResizingChat = ref(false);
    const isResizingState = ref(false);
    const resizeStartX = ref(0);
    const resizeStartChatWidth = ref(0);
    const resizeStartStateWidth = ref(0);

    // Scroll refs
    const chatScrollContainer = ref<HTMLElement | null>(null);
    const debugScrollContainer = ref<HTMLElement | null>(null);

    const chatOnlyMessages = computed(() =>
        testMessages.value.filter(msg => !isDebugContent(msg.content) && msg.isDebug !== true),
    );

    const debugOnlyMessages = computed(() =>
        testMessages.value.filter(msg => isDebugContent(msg.content) || msg.isDebug === true),
    );

    const scrollToBottom = (container: HTMLElement | null) => {
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    };

    interface TestMessage {
        type: 'bot' | 'user';
        content: string;
        nodeId?: string;
        nodeType?: string;
        mediaType?: TestMediaType;
        mediaUrl?: string;
        fileName?: string;
        menuOptions?: { label: string; value: string; description?: string }[];
        acceptedTypes?: string[];
        outputVariable?: string;
        optionsDataVariable?: string;
        rawResponse?: unknown;
        isDebug?: boolean;
    }

    // Métricas de performance
    const performanceMetrics = ref({
        startTime: 0,
        endTime: 0,
        totalDuration: 0,
        nodesExecuted: 0,
        apiCallsCount: 0,
        apiCallsTotalTime: 0,
        aiCallsCount: 0,
        aiCallsTotalTime: 0,
        errorsCount: 0,
        cacheHits: 0,
        cacheMisses: 0,
    });

    const resetPerformanceMetrics = () => {
        performanceMetrics.value = {
            startTime: 0,
            endTime: 0,
            totalDuration: 0,
            nodesExecuted: 0,
            apiCallsCount: 0,
            apiCallsTotalTime: 0,
            aiCallsCount: 0,
            aiCallsTotalTime: 0,
            errorsCount: 0,
            cacheHits: 0,
            cacheMisses: 0,
        };
    };

    const formatDuration = (ms: number): string => {
        if (ms < 1000) {
            return `${ms}ms`;
        }
        return `${(ms / 1000).toFixed(2)}s`;
    };

    const testMessages = ref<TestMessage[]>([]);

    const DEBUG_PATTERNS = [
        /^⚡/,
        /^🔌/,
        /^📦/,
        /^🔀/,
        /^🛡️/,
        /^🔍/,
        /^🧠/,
        /^▶️/,
        /^⏳/,
        /^📊 Métricas/,
        /^🔄 Loop/,
        /^✅ API respondió/,
        /^✅ Merge completado/,
        /^✅ Paralelo completado/,
        /^✅ Herramienta/,
        /^✅ Respuesta guardada/,
        /^✅ Seleccionaste:/,
        /^⚠️/,
        /^❌ Error de red/,
        /^📥/,
        /^🤖 Iniciando prueba/,
        /Respuesta API guardada en variable/,
        /Reintento \d+/,
        /Cache HIT/,
        /Cache MISS/,
        /Cache almacenado/,
        /sin flujo conectado/,
        /Error Handler activo/,
        /Condición cumplida/,
        /Ninguna condición coincidió/,
        /Router:/,
        /Merge: \d+/,
        /Merge esperando/,
        /Ejecutando \d+ ramas/,
        /Flujo vinculado completado/,
    ];

    const isDebugContent = (content: string): boolean => DEBUG_PATTERNS.some(pattern => pattern.test(content));

    const filteredMessages = computed(() => {
        if (showDebugMessages.value) {
            return testMessages.value;
        }
        return testMessages.value.filter(msg => {
            if (msg.isDebug === false) {
                return true;
            }
            if (msg.isDebug === true) {
                return false;
            }
            return !isDebugContent(msg.content);
        });
    });

    const testCurrentNodeId = ref<string | null>(null);
    const testVisitedNodes = ref<string[]>([]);
    const testUserInput = ref('');
    const testUserInputElement = ref<HTMLInputElement | null>(null);
    const testMessagesContainer = ref<HTMLElement | null>(null);
    const testVariables = ref<Record<string, unknown>>({});
    const loadingLinkedFlow = ref(false);
    const waitingWebhookNodeId = ref<string | null>(null);
    const executionSteps = ref(0);
    const maxExecutionSteps = 500;
    const maxNestedFlows = 10;

    // File upload refs
    const fileInputRef = ref<HTMLInputElement | null>(null);
    const uploadedFile = ref<{ name: string; url: string; type: string } | null>(null);

    // Copy to clipboard function
    const copyToClipboard = async (text: string): Promise<boolean> => {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.append(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            textarea.remove();
            return success;
        }
    };

    // Copy debug logs
    const copyDebugLogs = async () => {
        const logs = debugOnlyMessages.value
            .map(m => {
                let text = m.content;
                if (m.rawResponse) {
                    text = `${text}\n${JSON.stringify(m.rawResponse, null, 2)}`;
                }
                return text;
            })
            .join('\n\n---\n\n');

        const success = await copyToClipboard(logs);
        if (success) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Logs copiados',
                showConfirmButton: false,
                timer: 1500,
            });
        }
    };

    // Copy selected message
    const copySelectedMessage = async () => {
        if (selectedMessageIndex.value === null || selectedMessageIndex.value < 0) {
            return;
        }
        const message = testMessages.value[selectedMessageIndex.value];
        if (!message) {
            return;
        }
        let text = message.content;
        if (message.rawResponse) {
            text = `${text}\n${JSON.stringify(message.rawResponse, null, 2)}`;
        }
        const success = await copyToClipboard(text);
        if (success) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Copiado',
                showConfirmButton: false,
                timer: 1500,
            });
        }
    };

    // Show variables in modal
    const showVariablesModal = () => {
        const varsHtml = Object.entries(testVariables.value)
            .map(([key, value]) => {
                const valueStr = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
                return `<div style="margin-bottom: 12px; text-align: left;">
                    <strong style="color: #3b82f6;">${key}</strong>
                    <pre style="background: #1f2937; color: #10b981; padding: 8px; border-radius: 4px; margin: 4px 0; font-size: 11px; overflow-x: auto; white-space: pre-wrap; word-break: break-all;">${valueStr}</pre>
                </div>`;
            })
            .join('');

        Swal.fire({
            title: '📦 Variables',
            html: `<div style="max-height: 60vh; overflow-y: auto; font-size: 12px;">${varsHtml || '<p style="color: #6b7280;">Sin variables</p>'}</div>`,
            width: '600px',
            showCloseButton: true,
            showConfirmButton: false,
        });
    };

    // File upload handlers
    const triggerFileUpload = () => {
        fileInputRef.value?.click();
    };

    const handleFileUpload = (event: Event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) {
            return;
        }

        const currentNodeId = waitingInputNodeId.value || testCurrentNodeId.value;
        const currentNode = executionContext.value.nodes.find(n => n.id === currentNodeId);

        if (currentNode?.type === NodeType.INPUT_MEDIA) {
            const acceptedTypes = (currentNode.config.inputMediaTypes as string[]) ?? ['any'];
            const fileType = getFileType(file.type);

            const isAccepted =
                acceptedTypes.includes('any') ||
                acceptedTypes.includes(fileType) ||
                (fileType === 'document' && acceptedTypes.includes('document'));

            if (!isAccepted) {
                const labelMap: Record<string, string> = {
                    image: 'imagen',
                    audio: 'audio',
                    video: 'video',
                    document: 'documento',
                    location: 'ubicacion',
                    any: 'archivo',
                };
                const acceptedLabels = acceptedTypes.map(t => labelMap[t] ?? t).join(', ');
                testMessages.value.push({
                    type: 'user',
                    content: `📎 Archivo: ${file.name}`,
                });
                testMessages.value.push({
                    type: 'bot',
                    content: `❌ Tipo de archivo no permitido. Se esperaba: ${acceptedLabels}`,
                    nodeId: currentNode.id,
                });
                target.value = '';
                return;
            }
        }

        const reader = new FileReader();
        reader.addEventListener('load', async () => {
            const fileUrl = reader.result as string;
            uploadedFile.value = {
                name: file.name,
                url: fileUrl,
                type: file.type.startsWith('image/') ? 'image' : 'file',
            };

            testMessages.value.push({
                type: 'user',
                content: `📎 Archivo: ${file.name}`,
                mediaType: uploadedFile.value.type as TestMediaType,
                mediaUrl: fileUrl,
                fileName: file.name,
            });

            if (currentNode?.type === NodeType.INPUT_MEDIA) {
                const urlVariable = (currentNode.config.inputMediaVariable || 'media_url').trim();
                const mimeVariable = (currentNode.config.inputMediaMimeVariable || '').trim();
                const typeVariable = (currentNode.config.inputMediaTypeVariable || '').trim();

                const mediaType = getMediaType(file.type);

                // Guardar en variables del backend
                backendVariables.value[urlVariable] = fileUrl;
                if (mimeVariable) {
                    backendVariables.value[mimeVariable] = file.type;
                }
                if (typeVariable) {
                    backendVariables.value[typeVariable] = mediaType;
                }

                // También actualizar variables locales para display
                testVariables.value[urlVariable] = fileUrl;
                if (mimeVariable) {
                    testVariables.value[mimeVariable] = file.type;
                }
                if (typeVariable) {
                    testVariables.value[typeVariable] = mediaType;
                }

                testMessages.value.push({
                    type: 'bot',
                    content: `✅ Archivo guardado en "${urlVariable}"`,
                });

                waitingInputNodeId.value = null;
                isTestRunning.value = true;

                // Continuar con backend simulation
                const nodeIdToContinue = backendCurrentNodeId.value || currentNode.id;
                await executeBackendSimulation(fileUrl, nodeIdToContinue);
            }

            nextTick(() => scrollToBottom(chatScrollContainer.value));
        });
        reader.readAsDataURL(file);
        target.value = '';
    };

    const clearUploadedFile = () => {
        uploadedFile.value = null;
    };

    // Configuración de timeouts y límites
    const API_TIMEOUT_MS = 30000; // 30 segundos timeout para APIs
    const AI_MAX_HISTORY_LENGTH = 50; // Máximo mensajes en historial del agente
    const AI_MAX_HISTORY_LENGTH_MIN = 10; // Mínimo para preservar contexto

    // Contexto de ejecución actual (permite ejecutar flujos vinculados)
    const executionContext = ref<{
        nodes: FlowNode[];
        connections: Connection[];
        isLinked: boolean;
        parentNodeId: string | null;
        flowId: number | null;
    }>({
        nodes: [],
        connections: [],
        isLinked: false,
        parentNodeId: null,
        flowId: null,
    });

    // Gestión de API Keys para pruebas reales
    const showAISettings = ref(false);
    const showDebugMessages = ref(true);
    const apiKeys = ref({
        openai: localStorage.getItem('versa_openai_key') || '',
        gemini: localStorage.getItem('versa_gemini_key') || '',
        anthropic: localStorage.getItem('versa_anthropic_key') || '',
        groq: localStorage.getItem('versa_groq_key') || '',
    });

    const saveKeys = () => {
        localStorage.setItem('versa_openai_key', apiKeys.value.openai);
        localStorage.setItem('versa_gemini_key', apiKeys.value.gemini);
        localStorage.setItem('versa_anthropic_key', apiKeys.value.anthropic);
        localStorage.setItem('versa_groq_key', apiKeys.value.groq);
        showAISettings.value = false;
    };

    const waitingInputNodeId = ref<string | null>(null);

    // Stack para manejar flujos anidados
    const executionStack = ref<
        {
            nodes: FlowNode[];
            connections: Connection[];
            nextNodeId: string | null;
            flowId: number | null;
        }[]
    >([]);

    const activeFlowIds = ref<Set<number>>(new Set());

    const mergeStates = ref<
        Map<string, { arrived: number[]; results: unknown[]; errors: number[]; startTime: number }>
    >(new Map());
    const activeLoops = ref<Set<string>>(new Set());

    const focusUserInput = async () => {
        await nextTick();
        if (props.show && !isTestRunning.value) {
            testUserInputElement.value?.focus();
        }
    };

    const expandedDebugMessages = ref<Set<number>>(new Set());
    const copiedDebugMessages = ref<Set<number>>(new Set());
    const selectedMessageIndex = ref<number | null>(null);

    const selectedMessage = computed(() => {
        if (selectedMessageIndex.value === null) {
            return null;
        }
        return testMessages.value[selectedMessageIndex.value] || null;
    });

    const messagesWithDebug = computed(() =>
        testMessages.value.map((msg, index) => ({
            ...msg,
            index,
            hasDebug: msg.rawResponse !== undefined,
        })),
    );

    const selectMessage = (index: number) => {
        selectedMessageIndex.value = index;
    };

    const toggleDebugMessage = (index: number) => {
        if (expandedDebugMessages.value.has(index)) {
            expandedDebugMessages.value.delete(index);
        } else {
            expandedDebugMessages.value.add(index);
        }
    };

    const copyDebugToClipboard = async (index: number, rawResponse: unknown) => {
        try {
            const jsonText = JSON.stringify(rawResponse, null, 2);
            await navigator.clipboard.writeText(jsonText);
            copiedDebugMessages.value.add(index);
            setTimeout(() => {
                copiedDebugMessages.value.delete(index);
            }, 2000);
        } catch {
            console.error('Error al copiar al portapapeles');
        }
    };

    const stopExecution = (message: string, nodeId?: string) => {
        performanceMetrics.value.endTime = Date.now();
        performanceMetrics.value.totalDuration = performanceMetrics.value.endTime - performanceMetrics.value.startTime;

        testMessages.value.push({
            type: 'bot',
            content: message,
            nodeId,
        });

        testMessages.value.push({
            type: 'bot',
            content: `📊 Métricas: ${performanceMetrics.value.nodesExecuted} nodos en ${formatDuration(performanceMetrics.value.totalDuration)} | APIs: ${performanceMetrics.value.apiCallsCount} (${formatDuration(performanceMetrics.value.apiCallsTotalTime)}) | IA: ${performanceMetrics.value.aiCallsCount} (${formatDuration(performanceMetrics.value.aiCallsTotalTime)}) | Errores: ${performanceMetrics.value.errorsCount}`,
        });

        isTestRunning.value = false;
        testCurrentNodeId.value = null;
    };

    const hasValidStartNode = (flowNodes: FlowNode[]) => flowNodes.some(node => node.type === NodeType.START);

    const isAiToolNode = (node: FlowNode | undefined): node is FlowNode => {
        if (!node) {
            return false;
        }

        return String(node.type).startsWith('ai_tool_');
    };

    const normalizeToolName = (value: string): string => value.trim().replaceAll(' ', '_').toLowerCase();

    const getToolRuntimeArgs = (): Record<string, unknown> => {
        const rawArgs = testVariables.value.__toolArgs;
        if (rawArgs && typeof rawArgs === 'object' && !Array.isArray(rawArgs)) {
            return rawArgs as Record<string, unknown>;
        }

        return {};
    };

    const isAgentRequestingUserInput = (content: string): boolean => {
        const normalized = content.trim().toLowerCase();
        if (!normalized) {
            return false;
        }

        if (normalized.includes('?') || normalized.includes('¿')) {
            return true;
        }

        return /\b(necesito|por favor|comparte|indica|proporciona|envíame|ingresa|escribe|confirmame|confírmame)\b/i.test(
            normalized,
        );
    };

    const buildToolParametersSchema = (node: FlowNode): string => {
        switch (node.type) {
            case NodeType.AI_TOOL_VARIABLE: {
                return '{"type":"object","properties":{"operation":{"type":"string","enum":["get","set","increment","decrement"]},"variable":{"type":"string"},"value":{}},"required":["operation","variable"]}';
            }
            case NodeType.AI_TOOL_JSON_EXTRACT: {
                return '{"type":"object","properties":{"sourceVariable":{"type":"string"},"jsonPath":{"type":"string"},"defaultValue":{}},"required":[]}';
            }
            case NodeType.AI_TOOL_TEMPLATE_RENDER: {
                return '{"type":"object","properties":{"template":{"type":"string"},"sourceVariable":{"type":"string"}},"required":[]}';
            }
            case NodeType.AI_TOOL_CONDITION_EVAL: {
                return '{"type":"object","properties":{"field":{"type":"string"},"operator":{"type":"string","enum":["equals","not_equals","contains","greater","less","is_empty","is_not_empty","starts_with","ends_with","regex"]},"value":{"type":"string"}},"required":["field","operator","value"]}';
            }
            case NodeType.AI_TOOL_DATETIME: {
                return '{"type":"object","properties":{"timezone":{"type":"string"},"format":{"type":"string"},"addMinutes":{"type":"number"},"addDays":{"type":"number"}},"required":[]}';
            }
            case NodeType.AI_TOOL_TEXT_UTILS: {
                return '{"type":"object","properties":{"operation":{"type":"string","enum":["trim","lower","upper","slug"]},"text":{"type":"string"}},"required":["operation","text"]}';
            }
            default: {
                return '{"type":"object","properties":{}}';
            }
        }
    };

    const executeApiViaProxy = async (params: {
        apiUrl: string;
        apiMethod: ApiMethod;
        apiHeaders?: Record<string, string>;
        apiBody?: string;
        timeout?: number;
        retryEnabled?: boolean;
        retryCount?: number;
        retryDelay?: number;
        retryBackoff?: 'fixed' | 'linear' | 'exponential';
    }): Promise<unknown> => {
        const requestHeaders: Record<string, string> = { ...params.apiHeaders };
        const timeoutMs = params.timeout || API_TIMEOUT_MS;
        const maxRetries = params.retryEnabled ? params.retryCount || 2 : 0;
        const baseDelay = params.retryDelay || 1000;
        const backoffType = params.retryBackoff || 'exponential';

        if (params.apiMethod !== 'GET' && !requestHeaders['Content-Type']) {
            requestHeaders['Content-Type'] = 'application/json';
        }

        const executeSingleRequest = (): Promise<ApiProxyResponse> => {
            const fetchPromise = versaFetch({
                url: `/${panelUrl}/chatbot/flowBuilder/api/proxyExternalApi/${empresaSelected}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    url: params.apiUrl,
                    method: params.apiMethod,
                    headers: requestHeaders,
                    body: params.apiMethod === 'GET' ? '' : params.apiBody || '',
                    csrf_token: csrf_token.value,
                }),
            });

            const timeoutPromise = new Promise<never>((_resolve, reject) => {
                setTimeout(() => reject(new Error(`Timeout: La API tardó más de ${timeoutMs / 1000}s`)), timeoutMs);
            });

            return Promise.race([fetchPromise, timeoutPromise]);
        };

        const calculateDelay = (attempt: number): number => {
            switch (backoffType) {
                case 'fixed': {
                    return baseDelay;
                }
                case 'linear': {
                    return baseDelay * attempt;
                }
                default: {
                    return baseDelay * 2 ** (attempt - 1);
                }
            }
        };

        let lastError: Error | null = null;
        let lastErrorResponse: ApiProxyResponse | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // eslint-disable-next-line no-await-in-loop
                const proxyResponse: ApiProxyResponse = await executeSingleRequest();
                const isSuccess = proxyResponse.success === 1 || proxyResponse.success === true;
                if (!isSuccess) {
                    lastErrorResponse = proxyResponse;
                    const error = new Error(proxyResponse.message || 'Error al ejecutar la API');
                    (error as any).proxyResponse = proxyResponse;
                    throw error;
                }
                return proxyResponse.payload;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (attempt < maxRetries) {
                    const delay = calculateDelay(attempt + 1);
                    testMessages.value.push({
                        type: 'bot',
                        content: `⏳ Reintento ${attempt + 1}/${maxRetries} en ${delay}ms...`,
                    });
                    // eslint-disable-next-line no-await-in-loop
                    await new Promise<void>(resolve => {
                        setTimeout(resolve, delay);
                    });
                }
            }
        }

        const finalError = lastError || new Error('Error al ejecutar la API después de reintentos');
        if (lastErrorResponse) {
            (finalError as any).proxyResponse = lastErrorResponse;
        }
        throw finalError;
    };

    // Referencias a watchers para cleanup
    const watcherHandles: WatchStopHandle[] = [
        watch(
            testMessages,
            async () => {
                await nextTick();
                scrollToBottom(chatScrollContainer.value);
                scrollToBottom(debugScrollContainer.value);
                scrollToBottom(testMessagesContainer.value);
            },
            { deep: true },
        ),
        watch(
            chatOnlyMessages,
            async () => {
                await nextTick();
                scrollToBottom(chatScrollContainer.value);
            },
            { deep: true },
        ),
        watch(
            debugOnlyMessages,
            async () => {
                await nextTick();
                scrollToBottom(debugScrollContainer.value);
            },
            { deep: true },
        ),
        watch(testCurrentNodeId, nodeId => {
            emit('updateActiveNode', nodeId);
        }),
        watch(
            testVisitedNodes,
            nodeIds => {
                emit('updateVisitedNodes', [...nodeIds]);
            },
            { deep: true },
        ),
        watch(isTestRunning, running => {
            if (!running) {
                focusUserInput().catch(() => null);
            }
        }),
        // Auto-collapse trunk config when trunk is selected
        watch(selectedTrunkToken, token => {
            if (token && isTrunkMode.value) {
                trunkConfigCollapsed.value = true;
            }
        }),
    ];

    // Cleanup de watchers al desmontar
    onUnmounted(() => {
        watcherHandles.forEach(stop => stop());
        executionStack.value = [];
        activeFlowIds.value.clear();
        waitingInputNodeId.value = null;
        waitingWebhookNodeId.value = null;
        isTestRunning.value = false;
        mergeStates.value.clear();
        activeLoops.value.clear();
    });

    // Función para reemplazar variables
    const replaceVariables = (text: string): string => {
        const singlePass = (str: string) =>
            str.replaceAll(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, rawPath: string) => {
                const path = rawPath.trim();
                const value = getValueByPath(testVariables.value, path);
                if (value === null || value === undefined) {
                    return `{{${path}}}`;
                }
                if (typeof value === 'object') {
                    return JSON.stringify(value);
                }
                return String(value);
            });
        // Dos pasadas: la primera resuelve variables internas como {{target_currency}},
        // La segunda resuelve el resultado como {{conversion_data.rates.CLP}}.
        return singlePass(singlePass(text));
    };

    const getValueByPath = (source: unknown, path: string): unknown => {
        if (!path || !path.trim()) {
            return source;
        }

        const tokens = path
            .split('.')
            .map(token => token.trim())
            .filter(Boolean);

        let current: unknown = source;
        for (const token of tokens) {
            if (current === null || current === undefined || typeof current !== 'object') {
                return undefined;
            }

            if (Array.isArray(current)) {
                const numericIndex = Number.parseInt(token, 10);
                if (Number.isFinite(numericIndex) && numericIndex >= 0 && numericIndex < current.length) {
                    current = current[numericIndex];
                } else {
                    current = (current as unknown as Record<string, unknown>)[token];
                }
            } else {
                current = (current as Record<string, unknown>)[token];
            }
        }

        return current;
    };

    const applyTemplateToPayload = (payload: unknown, templateNode: unknown): unknown => {
        if (typeof templateNode === 'string') {
            const exactPlaceholder = templateNode.match(/^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/);
            if (exactPlaceholder && exactPlaceholder[1]) {
                return getValueByPath(payload, exactPlaceholder[1]);
            }

            return templateNode.replaceAll(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, rawPath: string) => {
                const value = getValueByPath(payload, rawPath.trim());
                return value === null || value === undefined ? '' : String(value);
            });
        }

        if (Array.isArray(templateNode)) {
            return templateNode.map(item => applyTemplateToPayload(payload, item));
        }

        if (templateNode && typeof templateNode === 'object') {
            const result: Record<string, unknown> = {};
            Object.entries(templateNode as Record<string, unknown>).forEach(([key, value]) => {
                result[key] = applyTemplateToPayload(payload, value);
            });
            return result;
        }

        return templateNode;
    };

    const parseApiResponseByFormat = (params: {
        payload: unknown;
        format: 'json' | 'text' | 'number' | 'boolean';
        jsonPath?: string;
        jsonTemplate?: string;
    }): unknown => {
        const { payload, format, jsonPath, jsonTemplate } = params;
        const selectedPayload = format === 'json' && jsonPath ? getValueByPath(payload, jsonPath) : payload;

        switch (format) {
            case 'number': {
                const numeric = Number(selectedPayload);
                return Number.isFinite(numeric) ? numeric : null;
            }
            case 'boolean': {
                if (typeof selectedPayload === 'boolean') {
                    return selectedPayload;
                }

                const raw = String(selectedPayload ?? '')
                    .trim()
                    .toLowerCase();
                return raw === 'true' || raw === '1' || raw === 'yes';
            }
            case 'text': {
                return typeof selectedPayload === 'string' ? selectedPayload : JSON.stringify(selectedPayload ?? '');
            }
            default: {
                if (format === 'json' && jsonTemplate && jsonTemplate.trim() !== '') {
                    try {
                        const parsedTemplate = JSON.parse(jsonTemplate);
                        return applyTemplateToPayload(selectedPayload, parsedTemplate);
                    } catch {
                        return selectedPayload;
                    }
                }
                return selectedPayload;
            }
        }
    };

    const buildRegexFromPattern = (rawPattern: string): RegExp => {
        const trimmedPattern = rawPattern.trim();

        let source = trimmedPattern;
        let flags = '';

        if (trimmedPattern.startsWith('/') && trimmedPattern.lastIndexOf('/') > 0) {
            const lastSlashIndex = trimmedPattern.lastIndexOf('/');
            source = trimmedPattern.slice(1, lastSlashIndex);
            flags = trimmedPattern.slice(lastSlashIndex + 1);
        }

        if (source.startsWith('(?i)')) {
            source = source.slice(4);
            if (!flags.includes('i')) {
                flags += 'i';
            }
        }

        if (source.includes('(?i)')) {
            source = source.replaceAll('(?i)', '');
            if (!flags.includes('i')) {
                flags += 'i';
            }
        }

        const uniqueFlags = [...new Set(flags)].join('');
        return new RegExp(source, uniqueFlags);
    };

    const validateQuestionAnswer = (params: {
        expectedType: 'text' | 'number' | 'email' | 'phone' | 'url' | 'date' | 'regex';
        answer: string;
        pattern?: string;
    }): boolean => {
        const value = params.answer.trim();

        switch (params.expectedType) {
            case 'text': {
                return value.length > 0;
            }
            case 'number': {
                return /^-?\d+(\.\d+)?$/.test(value);
            }
            case 'email': {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            }
            case 'phone': {
                return /^\+?[0-9\s().-]{7,20}$/.test(value);
            }
            case 'url': {
                return /^(https?:\/\/)[^\s]+$/i.test(value);
            }
            case 'date': {
                return /^\d{4}-\d{2}-\d{2}$/.test(value);
            }
            case 'regex': {
                if (!params.pattern || !params.pattern.trim()) {
                    return false;
                }

                try {
                    const regex = buildRegexFromPattern(params.pattern);
                    return regex.test(value);
                } catch {
                    return false;
                }
            }
            default: {
                return true;
            }
        }
    };

    const buildTemplatePreview = (node: FlowNode): string => {
        const templateName = (node.config.templateName || '').trim();
        const templateLanguage = (node.config.templateLanguage || 'es').trim();
        const params = node.config.templateParams || [];
        const buttons = node.config.templateButtons || [];

        let preview = `📨 Plantilla WhatsApp: ${templateName || '(sin nombre)'} (${templateLanguage})`;

        if (params.length > 0) {
            preview += '\n\nParámetros:';
            params.forEach(param => {
                preview += `\n- ${param.key}: ${replaceVariables(param.value || '')}`;
            });
        }

        if (buttons.length > 0) {
            preview += '\n\nBotones:';
            buttons.forEach((button, index) => {
                const buttonLabel = button.text || button.payload || button.url || 'sin texto';
                preview += `\n${index + 1}. ${button.type} - ${buttonLabel}`;
            });
        }

        return preview;
    };

    const buildInteractiveMessagePreview = (node: FlowNode, baseContent: string): string => {
        const channelType = node.config.messageChannelType || 'standard';
        const content = baseContent || 'Selecciona una opción:';

        if (channelType === 'interactive_buttons') {
            const buttons = node.config.interactiveButtons || [];
            let preview = `${content}`;

            if (buttons.length > 0) {
                preview += '\n\nBotones:';
                buttons.forEach((button, index) => {
                    preview += `\n${index + 1}. ${button.title || button.id}`;
                });
            }

            return preview;
        }

        if (channelType === 'interactive_list') {
            const sections = node.config.interactiveListSections || [];
            let preview = `${content}`;

            if (sections.length > 0) {
                preview += `\n\nLista (${node.config.interactiveListButtonText || 'Ver opciones'}):`;
                sections.forEach(section => {
                    preview += `\n- ${section.title || 'Sección'}`;
                    section.rows.forEach((row, rowIndex) => {
                        preview += `\n  ${rowIndex + 1}. ${row.title || row.id}`;
                        if (row.description) {
                            preview += ` (${row.description})`;
                        }
                    });
                });
            }

            return preview;
        }

        return content;
    };

    // Backend Simulation Functions
    interface BackendSimulateResponse {
        success: number;
        message?: string;
        messages: {
            node_type: string;
            content: string;
            message_type?: string;
            media_url?: string;
            file_name?: string;
            menu_options?: { label: string; value: string; description?: string }[];
            isDebug?: boolean;
            accepted_types?: string[];
            output_variable?: string;
            options_data_variable?: string;
        }[];
        debug_messages?: { content: string }[];
        variables: Record<string, unknown>;
        execution_path: { step: number; node_id: string; node_type: string }[];
        steps_executed: number;
        waiting_for_user: boolean;
        end_conversation: boolean;
        current_node_id: string | null;
    }

    const executeBackendSimulation = async (incomingText = '', nodeIdOverride?: string): Promise<void> => {
        try {
            const payload: Record<string, unknown> = {
                variables: {
                    ...backendVariables.value,
                    __toolArgs: testVariables.value.__toolArgs,
                },
                incoming_text: incomingText,
                initial_node_id: nodeIdOverride || backendCurrentNodeId.value || undefined,
                max_steps: 50,
                sender_id: senderId.value,
                sender_name: senderName.value,
            };

            if (isTrunkMode.value && selectedTrunkToken.value) {
                payload.trunk_token = selectedTrunkToken.value;
                payload.channel = selectedChannelCode.value;
                payload.empresa_token = selectedEmpresaToken.value;
                // IMPORTANTE: Enviar el flujo del canvas para probar los cambios actuales
                // Esto permite ver los cambios en tiempo real antes de guardar
                payload.nodes = props.nodes;
                payload.connections = props.connections;
            } else {
                payload.nodes = props.nodes;
                payload.connections = props.connections;
            }

            // Usar la empresa del trunk mode o la empresa actual del dashboard
            const empresaToken =
                isTrunkMode.value && selectedEmpresaToken.value ? selectedEmpresaToken.value : empresaSelected;

            if (!empresaToken) {
                testMessages.value.push({
                    type: 'bot',
                    content: '❌ No hay empresa seleccionada.',
                });
                isTestRunning.value = false;
                return;
            }

            const response: VersaFetchResponse = await versaFetch({
                url: `/${panelUrl}/chatbot/flowBuilder/api/simulate/${empresaToken}`,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(payload),
            });

            if (response.success !== 1) {
                testMessages.value.push({
                    type: 'bot',
                    content: `❌ Error en simulación backend: ${response.message || 'Error desconocido'}`,
                });
                isTestRunning.value = false;
                return;
            }

            const data = response as unknown as BackendSimulateResponse;
            backendVariables.value = data.variables || {};
            backendCurrentNodeId.value = data.current_node_id;

            // Update visited nodes for highlighting
            if (data.execution_path) {
                testVisitedNodes.value = data.execution_path.map(p => p.node_id);
                if (data.execution_path.length > 0) {
                    const lastNode = data.execution_path.at(-1);
                    testCurrentNodeId.value = lastNode?.node_id ?? null;
                }
            }

            // Add messages to chat
            if (data.messages) {
                for (const msg of data.messages) {
                    testMessages.value.push({
                        type: 'bot',
                        content: msg.content,
                        nodeId: undefined,
                        nodeType: msg.node_type,
                        mediaType: msg.message_type as TestMediaType,
                        mediaUrl: msg.media_url,
                        fileName: msg.file_name,
                        menuOptions: msg.menu_options,
                        acceptedTypes: msg.accepted_types,
                        outputVariable: msg.output_variable,
                        optionsDataVariable: msg.options_data_variable,
                    });
                }
            }

            // Add debug messages if enabled
            if (data.debug_messages && showDebugMessages.value) {
                for (const msg of data.debug_messages) {
                    testMessages.value.push({
                        type: 'bot',
                        content: msg.content,
                        isDebug: true,
                    });
                }
            }

            // Update test variables for display
            testVariables.value = { ...backendVariables.value };

            // Handle end of execution
            if (data.end_conversation) {
                testMessages.value.push({
                    type: 'bot',
                    content: '✅ Flujo finalizado',
                });
                isTestRunning.value = false;
                return;
            }

            if (data.waiting_for_user) {
                waitingInputNodeId.value = data.current_node_id;
                testCurrentNodeId.value = data.current_node_id;
                isTestRunning.value = false;
                await focusUserInput();
                return;
            }

            // No more nodes to execute
            if (!data.current_node_id || data.steps_executed >= 50) {
                isTestRunning.value = false;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            testMessages.value.push({
                type: 'bot',
                content: `❌ Error de conexión: ${errorMessage}`,
            });
            isTestRunning.value = false;
        }
    };

    // Handle menu option click for backend simulation
    const handleMenuOptionClick = async (value: string, label: string) => {
        if (isTestRunning.value) {
            return;
        }

        testMessages.value.push({
            type: 'user',
            content: label,
        });

        backendVariables.value.menu_selection = value;
        backendVariables.value._last_user_input = value;
        backendVariables.value.last_user_input = value;
        const nodeIdToContinue = (waitingInputNodeId.value || backendCurrentNodeId.value) ?? undefined;
        waitingInputNodeId.value = null;
        isTestRunning.value = true;
        await executeBackendSimulation(value, nodeIdToContinue);
    };

    const resetTestState = () => {
        testMessages.value = [];
        testVariables.value = {};
        testVisitedNodes.value = [];
        testCurrentNodeId.value = null;
        waitingWebhookNodeId.value = null;
        executionStack.value = [];
        executionSteps.value = 0;
        activeFlowIds.value.clear();

        // Reset backend state
        backendCurrentNodeId.value = null;
        backendVariables.value = {};

        // Notificar al canvas para limpiar highlights
        emit('updateActiveNode', null);
        emit('updateVisitedNodes', []);

        resetPerformanceMetrics();
        performanceMetrics.value.startTime = Date.now();
    };

    const initializeTrunkContext = (): boolean => {
        if (!selectedTrunkToken.value) {
            testMessages.value.push({
                type: 'bot',
                content: '⚠️ Selecciona una troncal para probar el flujo guardado.',
            });
            showTrunkConfigModal.value = true;
            return false;
        }

        const trunk = trunks.value.find(t => t.token_trunk === selectedTrunkToken.value);
        backendVariables.value = {
            sender_id: senderId.value,
            sender_name: senderName.value,
            platform: selectedChannelCode.value,
            trunk_id: trunk?.id || null,
            trunk_token: selectedTrunkToken.value,
            channel: selectedChannelCode.value,
            empresa_id: empresas.value.find(e => e.token_empresa === selectedEmpresaToken.value)?.id ?? 0,
        };

        const parsedTicketId = Number.parseInt(testTicketId.value, 10);
        if (!Number.isNaN(parsedTicketId) && parsedTicketId > 0) {
            backendVariables.value._ticket_id = parsedTicketId;
        }
        testVariables.value = { ...backendVariables.value };

        testMessages.value.push({
            type: 'bot',
            content: `${platformConfig.value.icon} Conectado a ${platformConfig.value.name} (Trunk: ${trunk?.nombre || 'N/A'})`,
        });

        return true;
    };

    // Iniciar prueba
    const startFlowTest = async () => {
        resetTestState();

        // Trunk mode validation
        if (isTrunkMode.value) {
            if (!initializeTrunkContext()) {
                isTestRunning.value = false;
                return;
            }

            testMessages.value.push({
                type: 'bot',
                content: '💬 Esperando mensaje del usuario...',
            });

            // NO iniciar automáticamente - esperar input del usuario
            isTestRunning.value = false;
            await focusUserInput();
            return;
        }

        isTestRunning.value = false;
    };

    const startOutboundTest = async () => {
        resetTestState();

        if (isTrunkMode.value) {
            if (!initializeTrunkContext()) {
                isTestRunning.value = false;
                return;
            }
        } else {
            backendVariables.value = {
                sender_id: senderId.value,
                sender_name: senderName.value,
                platform: selectedChannelCode.value || 'simulator',
                channel: selectedChannelCode.value || 'simulator',
            };
            testVariables.value = { ...backendVariables.value };
        }

        testMessages.value.push({
            type: 'bot',
            content: '🚀 Iniciando outbound en TestFlow...',
        });

        isTestRunning.value = true;
        await executeBackendSimulation(outboundInitialMessage.value.trim());
    };

    // Cargar flujo vinculado desde la API
    const loadLinkedFlow = async (flowId: number): Promise<{ nodes: FlowNode[]; connections: Connection[] } | null> => {
        loadingLinkedFlow.value = true;
        try {
            const externalFilters = encodeURIComponent(`cf.id = ${flowId}`);
            const response: VersaFetchResponse = await versaFetch({
                url: `/${panelUrl}/chatbot/flowBuilder/api/getFlow/${empresaSelected}?per_page=1&externalFilters=${externalFilters}`,
                method: 'GET',
            });

            if (response.success === 1 && response.data && response.data.length > 0) {
                const [flowData] = response.data;

                if (Number(flowData.id) !== flowId) {
                    return null;
                }

                // Parsear nodes y connections desde JSON
                const nodes = JSON.parse(flowData.nodes || '[]') as FlowNode[];
                const connections = JSON.parse(flowData.connections || '[]') as Connection[];

                return { nodes, connections };
            }

            return null;
        } catch {
            testMessages.value.push({
                type: 'bot',
                content: '❌ Error al consultar el flujo vinculado en el servidor.',
            });
            return null;
        } finally {
            loadingLinkedFlow.value = false;
        }
    };

    // Ejecutar flujo vinculado cambiando el contexto de ejecución
    const executeLinkedFlow = async (params: {
        linkedNodes: FlowNode[];
        linkedConnections: Connection[];
        parentNodeId: string;
        flowName: string;
        flowId: number;
    }): Promise<void> => {
        const { linkedNodes, linkedConnections, parentNodeId, flowName, flowId } = params;

        if (executionStack.value.length >= maxNestedFlows) {
            stopExecution('❌ Se alcanzó la profundidad máxima de flujos vinculados.', parentNodeId);
            return;
        }

        if (activeFlowIds.value.has(flowId)) {
            stopExecution(`❌ Se detectó una referencia circular en el flujo ID ${flowId}.`, parentNodeId);
            return;
        }

        if (!hasValidStartNode(linkedNodes)) {
            stopExecution(`❌ El flujo "${flowName}" no tiene nodo de inicio válido.`, parentNodeId);
            return;
        }

        // Guardar contexto actual en el stack
        executionStack.value.push({
            nodes: executionContext.value.nodes,
            connections: executionContext.value.connections,
            nextNodeId: parentNodeId, // Este es el nodo FLOW del que volveremos
            flowId: executionContext.value.flowId,
        });

        activeFlowIds.value.add(flowId);

        // Cambiar al contexto del flujo vinculado
        executionContext.value = {
            nodes: linkedNodes,
            connections: linkedConnections,
            isLinked: true,
            parentNodeId: parentNodeId,
            flowId,
        };

        testMessages.value.push({
            type: 'bot',
            content: `▶️ Ejecutando flujo "${flowName}" (${linkedNodes.length} nodos, ${linkedConnections.length} conexiones)`,
        });

        // Buscar el nodo START del flujo vinculado
        const startNode = linkedNodes.find(n => n.type === NodeType.START);
        if (!startNode) {
            testMessages.value.push({
                type: 'bot',
                content: `❌ El flujo "${flowName}" no tiene nodo de inicio`,
            });
            // Restaurar contexto y continuar
            await returnFromLinkedFlow();
            return;
        }

        // Ejecutar el flujo vinculado desde su nodo START
        await executeNode(startNode.id);
    };

    // Retornar del flujo vinculado al flujo principal
    const returnFromLinkedFlow = async () => {
        if (executionStack.value.length === 0) {
            // No hay flujo padre, terminar ejecución
            isTestRunning.value = false;
            testCurrentNodeId.value = null;
            return;
        }

        const parentContext = executionStack.value.pop();
        if (!parentContext) {
            isTestRunning.value = false;
            testCurrentNodeId.value = null;
            return;
        }
        const parentNodeId = parentContext.nextNodeId;
        if (executionContext.value.flowId !== null) {
            activeFlowIds.value.delete(executionContext.value.flowId);
        }

        testMessages.value.push({
            type: 'bot',
            content: '✅ Flujo vinculado completado, regresando al flujo principal...',
        });

        // Restaurar contexto del flujo padre
        executionContext.value = {
            nodes: parentContext.nodes,
            connections: parentContext.connections,
            isLinked: executionStack.value.length > 0,
            parentNodeId: executionStack.value.length > 0 ? (executionStack.value.at(-1)?.nextNodeId ?? null) : null,
            flowId: parentContext.flowId,
        };

        // Continuar desde el nodo FLOW en el flujo padre
        if (parentNodeId) {
            await moveToNextNode(parentNodeId, 0);
        }
    };

    // Ejecutar lógica real del Agente (ReAct Loop)
    const normalizeToOpenAIShape = (raw: any) => {
        if (raw?.choices?.[0]?.message) {
            return raw;
        }

        return {
            choices: [
                {
                    message: {
                        content: typeof raw === 'string' ? raw : JSON.stringify(raw ?? {}),
                    },
                },
            ],
        };
    };

    // Helper para fetch con timeout usando AbortController
    const fetchWithTimeout = async (
        url: string,
        options: RequestInit,
        timeoutMs: number = API_TIMEOUT_MS,
    ): Promise<Response> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            return response;
        } finally {
            clearTimeout(timeoutId);
        }
    };

    const callAI = async (params: {
        provider: string;
        model: string;
        messages: any[];
        tools: any[];
        apiKey?: string;
        timeout?: number;
    }) => {
        const { provider, model, messages, tools, apiKey, timeout } = params;
        const timeoutMs = timeout || API_TIMEOUT_MS;
        const providerNormalized = provider.trim().toLowerCase();
        const providerKeyMap: Record<string, keyof typeof apiKeys.value> = {
            openai: 'openai',
            groq: 'groq',
            google: 'gemini',
            gemini: 'gemini',
            anthropic: 'anthropic',
            mistral: 'openai',
            other: 'openai',
        };
        const mappedKey = providerKeyMap[providerNormalized];
        const key = apiKey || (mappedKey ? apiKeys.value[mappedKey] : '');

        // NormalizeToOpenAIShape moved to module scope to avoid recreating per call

        if (!key) {
            throw new Error(
                `API Key para ${provider} no configurada. Haz clic en ⚙️ para configurarla o defínela en el nodo.`,
            );
        }

        if (providerNormalized === 'openai' || providerNormalized === 'groq' || providerNormalized === 'mistral') {
            let baseUrl = 'https://api.openai.com/v1/chat/completions';
            if (providerNormalized === 'groq') {
                baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
            } else if (providerNormalized === 'mistral') {
                baseUrl = 'https://api.mistral.ai/v1/chat/completions';
            }

            const body: any = { model, messages };
            if (tools && tools.length > 0) {
                body.tools = tools.map(t => ({
                    type: 'function',
                    function: {
                        name: (t.name || 'tool').replaceAll(' ', '_'),
                        description: t.description || 'Sin descripción',
                        parameters: JSON.parse(t.parameters || '{"type":"object","properties":{}}'),
                    },
                }));
                body.tool_choice = 'auto';
            }

            const res = await fetchWithTimeout(
                baseUrl,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${key}`,
                    },
                    body: JSON.stringify(body),
                },
                timeoutMs,
            );

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error?.message || `Error en la API de ${provider}`);
            }
            return normalizeToOpenAIShape(await res.json());
        }

        if (providerNormalized === 'google' || providerNormalized === 'gemini') {
            const modelName = model || 'gemini-1.5-flash';
            const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(key)}`;

            const systemMessage = messages.find((m: any) => m?.role === 'system')?.content || '';

            const geminiContents: any[] = [];
            for (const message of messages) {
                if (!message || !message.role || message.role === 'system') {
                    // Ignorar mensajes vacíos o de sistema
                } else if (message.role === 'tool') {
                    geminiContents.push({
                        role: 'user',
                        parts: [
                            {
                                functionResponse: {
                                    name: message.name || 'tool_result',
                                    response: {
                                        output: message.content || '',
                                    },
                                },
                            },
                        ],
                    });
                } else if (
                    message.role === 'assistant' &&
                    Array.isArray(message.tool_calls) &&
                    message.tool_calls.length > 0
                ) {
                    geminiContents.push({
                        role: 'model',
                        parts: message.tool_calls.map((tc: any) => ({
                            functionCall: {
                                name: tc?.function?.name || 'tool',
                                args: tc?.function?.arguments ? JSON.parse(tc.function.arguments) : {},
                            },
                        })),
                    });
                } else {
                    geminiContents.push({
                        role: message.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: String(message.content || '') }],
                    });
                }
            }

            const body: any = {
                contents: geminiContents,
            };

            if (!Array.isArray(body.contents) || body.contents.length === 0) {
                body.contents = [
                    {
                        role: 'user',
                        parts: [{ text: 'Inicia la conversación con un saludo y solicita los datos necesarios.' }],
                    },
                ];
            }

            if (systemMessage) {
                body.systemInstruction = {
                    parts: [{ text: String(systemMessage) }],
                };
            }

            if (tools && tools.length > 0) {
                body.tools = [
                    {
                        functionDeclarations: tools.map(t => ({
                            name: (t.name || 'tool').replaceAll(' ', '_'),
                            description: t.description || 'Sin descripción',
                            parameters: JSON.parse(t.parameters || '{"type":"object","properties":{}}'),
                        })),
                    },
                ];
            }

            const res = await fetchWithTimeout(
                baseUrl,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                },
                timeoutMs,
            );

            const raw = await res.json();
            if (!res.ok) {
                throw new Error(raw?.error?.message || `Error en la API de ${provider}`);
            }

            const candidate = raw?.candidates?.[0]?.content?.parts || [];
            const textParts = candidate.filter((p: any) => typeof p?.text === 'string').map((p: any) => p.text);
            const functionCalls = candidate.filter((p: any) => p?.functionCall);

            return {
                choices: [
                    {
                        message: {
                            content: textParts.join('\n').trim(),
                            tool_calls: functionCalls.map((p: any, idx: number) => ({
                                id: `gemini_tool_${Date.now()}_${idx}`,
                                type: 'function',
                                function: {
                                    name: p.functionCall.name,
                                    arguments: JSON.stringify(p.functionCall.args || {}),
                                },
                            })),
                        },
                    },
                ],
            };
        }

        if (providerNormalized === 'anthropic') {
            const systemMessage = messages.find((m: any) => m?.role === 'system')?.content || '';
            const anthropicMessages: any[] = [];

            for (const message of messages) {
                if (!message || !message.role || message.role === 'system') {
                    // Ignorar mensajes vacíos o de sistema
                } else if (message.role === 'tool') {
                    anthropicMessages.push({
                        role: 'user',
                        content: [
                            {
                                type: 'tool_result',
                                tool_use_id: message.tool_call_id || `tool_${Date.now()}`,
                                content: String(message.content || ''),
                            },
                        ],
                    });
                } else if (
                    message.role === 'assistant' &&
                    Array.isArray(message.tool_calls) &&
                    message.tool_calls.length > 0
                ) {
                    anthropicMessages.push({
                        role: 'assistant',
                        content: message.tool_calls.map((tc: any) => ({
                            type: 'tool_use',
                            id: tc.id || `anthropic_tool_${Date.now()}`,
                            name: tc?.function?.name || 'tool',
                            input: tc?.function?.arguments ? JSON.parse(tc.function.arguments) : {},
                        })),
                    });
                } else {
                    anthropicMessages.push({
                        role: message.role === 'assistant' ? 'assistant' : 'user',
                        content: String(message.content || ''),
                    });
                }
            }

            const body: any = {
                model: model || 'claude-3-5-sonnet-latest',
                max_tokens: 1024,
                messages: anthropicMessages,
            };

            if (systemMessage) {
                body.system = systemMessage;
            }

            if (tools && tools.length > 0) {
                body.tools = tools.map(t => ({
                    name: (t.name || 'tool').replaceAll(' ', '_'),
                    description: t.description || 'Sin descripción',
                    input_schema: JSON.parse(t.parameters || '{"type":"object","properties":{}}'),
                }));
            }

            const res = await fetchWithTimeout(
                'https://api.anthropic.com/v1/messages',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': key,
                        'anthropic-version': '2023-06-01',
                    },
                    body: JSON.stringify(body),
                },
                timeoutMs,
            );

            const raw = await res.json();
            if (!res.ok) {
                throw new Error(raw?.error?.message || `Error en la API de ${provider}`);
            }

            const contentBlocks = Array.isArray(raw?.content) ? raw.content : [];
            const textParts = contentBlocks
                .filter((block: any) => block?.type === 'text')
                .map((block: any) => String(block?.text || ''));
            const toolCalls = contentBlocks.filter((block: any) => block?.type === 'tool_use');

            return {
                choices: [
                    {
                        message: {
                            content: textParts.join('\n').trim(),
                            tool_calls: toolCalls.map((block: any) => ({
                                id: block.id,
                                type: 'function',
                                function: {
                                    name: block.name,
                                    arguments: JSON.stringify(block.input || {}),
                                },
                            })),
                        },
                    },
                ],
            };
        }

        throw new Error(`Proveedor ${provider} no soportado aún.`);
    };

    // Función para truncar historial preservando system message (in-place)
    const truncateHistoryInPlace = (history: any[], maxLength: number = AI_MAX_HISTORY_LENGTH): void => {
        if (history.length <= maxLength) {
            return;
        }

        const systemMessageIndex = history.findIndex(m => m?.role === 'system');
        const systemMessage = systemMessageIndex !== -1 ? history[systemMessageIndex] : null;

        // Remover mensajes antiguos pero preservar system message
        if (systemMessage) {
            history.splice(systemMessageIndex, 1);
            const nonSystemCount = maxLength - 1;
            const removeCount = history.length - nonSystemCount;
            if (removeCount > 0) {
                history.splice(0, removeCount);
            }
            history.unshift(systemMessage);
        } else {
            const removeCount = history.length - maxLength;
            history.splice(0, removeCount);
        }
    };

    const runAgentExecution = async (node: FlowNode, history: any[], responseVariable: string) => {
        const provider = node.config.aiProvider || 'openai';
        const model = node.config.aiModel || 'gpt-4o';
        const idleTurnsKey = `agent_idle_turns_${node.id}`;
        const previousIdleTurns = Number(testVariables.value[idleTurnsKey] || 0);
        testVariables.value[idleTurnsKey] = Number.isFinite(previousIdleTurns) ? previousIdleTurns : 0;

        const toolsToUse: { name: string; description: string; parameters: string; nodeId: string }[] = [];
        const visualConns = executionContext.value.connections.filter(
            c => c.sourceNodeId === node.id && c.sourcePortIndex === 1,
        );

        for (const conn of visualConns) {
            const tNode = executionContext.value.nodes.find(n => n.id === conn.targetNodeId);
            if (isAiToolNode(tNode) && !toolsToUse.some(t => t.nodeId === tNode.id)) {
                const toolName = tNode.config.toolName || normalizeToolName(tNode.label);
                const toolDescription = tNode.config.toolDescription || `Herramienta visual: ${tNode.type}`;

                toolsToUse.push({
                    name: toolName,
                    description: toolDescription,
                    parameters: buildToolParametersSchema(tNode),
                    nodeId: tNode.id,
                });
            }
        }

        const maxAgentLoops = 4;
        let loops = 0;
        let noProgressTurns = 0;
        let shouldContinue = false;
        while (loops < maxAgentLoops) {
            loops++;
            shouldContinue = false;
            // eslint-disable-next-line no-await-in-loop
            const response = await callAI({
                provider,
                model,
                messages: history,
                tools: toolsToUse,
                apiKey: node.config.aiApiKey, // Usar key específica del nodo si existe
            });
            const msg = response.choices?.[0]?.message;
            if (!msg) {
                break;
            }

            history.push(msg);
            truncateHistoryInPlace(history);

            if (msg.tool_calls) {
                noProgressTurns = 0;
                testVariables.value[idleTurnsKey] = 0;
                for (const tc of msg.tool_calls) {
                    const tDef = toolsToUse.find(t => normalizeToolName(t.name || 'tool') === tc.function.name);
                    const tArgs = JSON.parse(tc.function.arguments || '{}');
                    let toolResult: unknown = testVariables.value;

                    testMessages.value.push({
                        type: 'bot',
                        content: `🛠️ Ejecutando herramienta: "${tDef?.name || tc.function.name}"`,
                        nodeId: node.id,
                        rawResponse: { toolCall: tc.function, arguments: tArgs },
                    });

                    // Ejecutar el nodo de herramienta
                    const previousToolArgs = testVariables.value.__toolArgs;
                    testVariables.value.__toolArgs = tArgs;

                    if (tDef?.nodeId) {
                        const oldId = testCurrentNodeId.value;
                        testCurrentNodeId.value = tDef.nodeId;
                        // eslint-disable-next-line no-await-in-loop
                        toolResult = await executeNode(tDef.nodeId, true);
                        testCurrentNodeId.value = oldId;
                    } else {
                        toolResult = { error: `Tool no encontrada: ${tc.function.name}` };
                    }

                    testVariables.value.__toolArgs = previousToolArgs;

                    testMessages.value.push({
                        type: 'bot',
                        content: `✅ Resultado de "${tDef?.name || tc.function.name}"`,
                        nodeId: node.id,
                        rawResponse: toolResult,
                    });

                    history.push({
                        role: 'tool',
                        tool_call_id: tc.id,
                        name: tc.function.name,
                        content: typeof toolResult === 'object' ? JSON.stringify(toolResult) : String(toolResult),
                    });
                    truncateHistoryInPlace(history);
                }
                shouldContinue = true;
            } else if (msg.content) {
                noProgressTurns = 0;
                testMessages.value.push({
                    type: 'bot',
                    content: msg.content,
                    nodeId: node.id,
                    rawResponse: { role: msg.role, content: msg.content, tool_calls: msg.tool_calls },
                });
                testVariables.value[responseVariable] = msg.content;

                const hasFin = executionContext.value.connections.some(
                    c => c.sourceNodeId === node.id && c.sourcePortIndex === 0,
                );

                const explicitClose = /(\[fin\]|\[end\]|<fin>|<end>|#fin|finalizar_conversacion)/i.test(msg.content);
                const requestingUserInput = isAgentRequestingUserInput(msg.content);
                const previousTurns = Number(testVariables.value[idleTurnsKey] || 0);
                const idleTurns = explicitClose || requestingUserInput ? 0 : previousTurns + 1;
                testVariables.value[idleTurnsKey] = idleTurns;

                if (hasFin && (explicitClose || (!requestingUserInput && idleTurns >= 4))) {
                    if (!explicitClose) {
                        testMessages.value.push({
                            type: 'bot',
                            content: 'ℹ️ El agente cerró la interacción por inactividad conversacional.',
                            nodeId: node.id,
                        });
                    }
                    // eslint-disable-next-line no-await-in-loop
                    await moveToNextNode(node.id, 0);
                } else {
                    waitingInputNodeId.value = node.id;
                    testCurrentNodeId.value = node.id;
                    isTestRunning.value = false;
                    // eslint-disable-next-line no-await-in-loop
                    await focusUserInput();
                }
                break;
            }

            if (!shouldContinue) {
                noProgressTurns += 1;
                if (noProgressTurns >= 1) {
                    testMessages.value.push({
                        type: 'bot',
                        content: '⚠️ El proveedor IA no devolvió contenido útil. Haz clic en 🔍 para ver la respuesta.',
                        nodeId: node.id,
                        rawResponse: msg,
                    });
                    break;
                }
            }
        }

        const hasFin = executionContext.value.connections.some(
            c => c.sourceNodeId === node.id && c.sourcePortIndex === 0,
        );
        if (loops >= maxAgentLoops && hasFin && noProgressTurns === 0) {
            await moveToNextNode(node.id, 0);
            return;
        }

        waitingInputNodeId.value = node.id;
        testCurrentNodeId.value = node.id;
        isTestRunning.value = false;
        await focusUserInput();
    };

    // Ejecutar un nodo
    const executeNode = async (
        nodeId: string,
        isSubroutine = false,
        sourceNodeId: string | null = null,
    ): Promise<any> => {
        executionSteps.value += 1;
        performanceMetrics.value.nodesExecuted += 1;

        if (executionSteps.value > maxExecutionSteps) {
            performanceMetrics.value.errorsCount += 1;
            stopExecution('Se detuvo la ejecucion por posible ciclo infinito.', nodeId);
            return;
        }

        const node = executionContext.value.nodes.find(n => n.id === nodeId);
        if (!node) {
            return;
        }

        testCurrentNodeId.value = nodeId;
        if (!testVisitedNodes.value.includes(nodeId)) {
            testVisitedNodes.value.push(nodeId);
        }

        await new Promise<void>(resolve => {
            setTimeout(resolve, 500);
        });

        const incomingConnections = executionContext.value.connections.filter((c: any) => c.targetNodeId === nodeId);
        const incomingConnection = sourceNodeId
            ? incomingConnections.find((c: any) => c.sourceNodeId === sourceNodeId)
            : null;
        const inputPortIndex = incomingConnection?.targetPortIndex ?? 0;

        const executeFn = await nodeRegistry.getExecute(node.type);
        if (executeFn) {
            if (!testVariables.value._env) {
                testVariables.value._env = {
                    versaFetch,
                    panelUrl,
                    empresaSelected,
                    csrf_token: csrf_token.value,
                };
            }
            const context: any = {
                variables: testVariables.value,
                testMessages: testMessages.value,
                isSubroutine,
                sourceNodeId,
                currentNodeId: nodeId,
                inputPortIndex,
                flowNodes: props.nodes,
                connections: props.connections,
                senderId: senderId.value,
                trunkId: selectedTrunkToken.value || 'design_mode',
                replaceVariables: (text: string) => replaceVariables(text),
                moveToNextNode: async (id: string, index: number) => {
                    await moveToNextNode(id, index);
                },
                stopExecution: (reason: string) => stopExecution(reason, nodeId),
                waitForInput: (waitingNodeId: string) => {
                    waitingInputNodeId.value = waitingNodeId;
                    testCurrentNodeId.value = waitingNodeId;
                    isTestRunning.value = false;
                },
                setWaitingNode: (waitingNodeId: string) => {
                    waitingInputNodeId.value = waitingNodeId;
                    testCurrentNodeId.value = waitingNodeId;
                    isTestRunning.value = false;
                },
                _env: testVariables.value._env,
                apiKeys: {
                    openai: apiKeys.value.openai,
                    gemini: apiKeys.value.gemini,
                    anthropic: apiKeys.value.anthropic,
                    groq: apiKeys.value.groq,
                },
                executeToolNode: async (toolNodeId: string, args: Record<string, any>) => {
                    const previousArgs = testVariables.value.__toolArgs;
                    testVariables.value.__toolArgs = args;
                    const result = await executeNode(toolNodeId, true);
                    testVariables.value.__toolArgs = previousArgs;
                    return result;
                },
                getHistory: (key: string) => testVariables.value[key] || null,
                setHistory: (key: string, history: any[]) => {
                    testVariables.value[key] = history;
                },
                waitForUserInput: (waitingNodeId: string) => {
                    waitingInputNodeId.value = waitingNodeId;
                    testCurrentNodeId.value = waitingNodeId;
                    isTestRunning.value = false;
                },
                isWaitingForInput: (checkNodeId: string) => waitingInputNodeId.value === checkNodeId,
                getLastUserMessage: () => {
                    for (let i = testMessages.value.length - 1; i >= 0; i--) {
                        const msg = testMessages.value[i];
                        if (msg && msg.type === 'user') {
                            return msg.content;
                        }
                    }
                    return null;
                },
            };
            await executeFn(node, context);
            return;
        }

        switch (node.type) {
            case NodeType.START: {
                // START ya está modularizado, pero por retrocompatibilidad se puede dejar el switch o quitarlo
                await moveToNextNode(nodeId, 0);
                break;
            }

            case NodeType.MESSAGE: {
                const messageType = node.config.messageType || 'text';
                const content = replaceVariables(node.config.message || '');
                const channelType = node.config.messageChannelType || 'standard';

                if (channelType === 'template') {
                    testMessages.value.push({
                        type: 'bot',
                        content: buildTemplatePreview(node),
                        nodeId: nodeId,
                    });
                    if (!isSubroutine) {
                        await moveToNextNode(nodeId, 0);
                    }
                    break;
                }

                if (messageType === 'text') {
                    testMessages.value.push({
                        type: 'bot',
                        content: buildInteractiveMessagePreview(node, content),
                        nodeId: nodeId,
                    });
                } else {
                    const mediaUrl = replaceVariables(node.config.messageMediaUrl || '');
                    const fileName = node.config.messageFileName ? ` (${node.config.messageFileName})` : '';
                    let mediaLabel = `📎 Archivo${fileName}`;
                    if (messageType === 'image') {
                        mediaLabel = '🖼️ Imagen';
                    } else if (messageType === 'video') {
                        mediaLabel = '🎬 Video';
                    } else if (messageType === 'audio') {
                        mediaLabel = '🎧 Audio';
                    }

                    testMessages.value.push({
                        type: 'bot',
                        content: mediaUrl
                            ? content
                            : `${mediaLabel}\n(sin URL configurada)${content ? `\n\n${content}` : ''}`,
                        nodeId: nodeId,
                        mediaType: messageType as TestMediaType,
                        mediaUrl: mediaUrl || undefined,
                        fileName: node.config.messageFileName,
                    });
                }
                if (!isSubroutine) {
                    await moveToNextNode(nodeId, 0);
                }
                break;
            }

            case NodeType.QUESTION: {
                if (node.config.question) {
                    testMessages.value.push({
                        type: 'bot',
                        content: replaceVariables(node.config.question),
                        nodeId: nodeId,
                    });
                }
                isTestRunning.value = false;
                break;
            }

            case NodeType.MENU: {
                if (node.config.menuTitle) {
                    let menuText = `${replaceVariables(node.config.menuTitle)}\n\n`;
                    if (node.config.menuOptions) {
                        node.config.menuOptions.forEach((option, index) => {
                            menuText += `${index + 1}. ${option.label}\n`;
                            if (option.description) {
                                menuText += `   ${option.description}\n`;
                            }
                        });
                    }
                    testMessages.value.push({
                        type: 'bot',
                        content: menuText,
                        nodeId: nodeId,
                    });
                }
                isTestRunning.value = false;
                break;
            }

            case NodeType.AI_TOOL_VARIABLE: {
                const runtimeArgs = getToolRuntimeArgs();
                const op = String(runtimeArgs.operation || node.config.variableOperation || 'get');
                const varName = String(runtimeArgs.variable || node.config.variableName || 'global');
                const val = runtimeArgs.value ?? node.config.variableValue ?? '';

                testMessages.value.push({
                    type: 'bot',
                    content: `🛠️ [Herramienta] Variable: ${op} "${varName}"`,
                    nodeId: nodeId,
                    rawResponse: {
                        operation: op,
                        variable: varName,
                        value: val,
                        result: op === 'get' ? testVariables.value[varName] : val,
                    },
                });
                if (op === 'set') {
                    testVariables.value[varName] = val;
                    if (isSubroutine) {
                        return { success: true, message: `Variable ${varName} establecida` };
                    }
                } else if (op === 'increment') {
                    const currentValue = Number(testVariables.value[varName] ?? 0);
                    const incrementBy = Number(val || 1);
                    const nextValue = currentValue + (Number.isFinite(incrementBy) ? incrementBy : 1);
                    testVariables.value[varName] = nextValue;
                    if (isSubroutine) {
                        return { value: nextValue };
                    }
                } else if (op === 'decrement') {
                    const currentValue = Number(testVariables.value[varName] ?? 0);
                    const decrementBy = Number(val || 1);
                    const nextValue = currentValue - (Number.isFinite(decrementBy) ? decrementBy : 1);
                    testVariables.value[varName] = nextValue;
                    if (isSubroutine) {
                        return { value: nextValue };
                    }
                } else {
                    const value = testVariables.value[varName];
                    if (isSubroutine) {
                        return { value };
                    }
                }

                await moveToNextNode(nodeId, 0);
                break;
            }

            case NodeType.AI_TOOL_JSON_EXTRACT: {
                const runtimeArgs = getToolRuntimeArgs();
                const sourceVariable = String(runtimeArgs.sourceVariable || node.config.toolInputVariable || '').trim();
                const jsonPath = String(runtimeArgs.jsonPath || node.config.toolPath || '').trim();
                const defaultValue = runtimeArgs.defaultValue ?? node.config.toolDefaultValue ?? null;

                const sourcePayload = sourceVariable
                    ? getValueByPath(testVariables.value, sourceVariable)
                    : testVariables.value;
                const extractedValue = jsonPath ? getValueByPath(sourcePayload, jsonPath) : sourcePayload;
                const finalValue = extractedValue === undefined ? defaultValue : extractedValue;

                testMessages.value.push({
                    type: 'bot',
                    content: `🛠️ [Herramienta] JSON Extract: ${jsonPath || '(payload completo)'}`,
                    nodeId,
                    rawResponse: {
                        jsonPath,
                        sourceVariable,
                        extractedValue: finalValue,
                        found: extractedValue !== undefined,
                    },
                });

                if (isSubroutine) {
                    return {
                        value: finalValue,
                        found: extractedValue !== undefined,
                        jsonPath,
                    };
                }

                await moveToNextNode(nodeId, 0);
                break;
            }

            case NodeType.AI_TOOL_TEMPLATE_RENDER: {
                const runtimeArgs = getToolRuntimeArgs();
                const sourceVariable = String(runtimeArgs.sourceVariable || node.config.toolInputVariable || '').trim();
                const template = String(
                    runtimeArgs.template || node.config.toolTemplate || node.config.variableValue || '',
                );
                const sourcePayload = sourceVariable
                    ? getValueByPath(testVariables.value, sourceVariable)
                    : testVariables.value;

                const rendered = template.replaceAll(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, rawPath: string) => {
                    const value = getValueByPath(sourcePayload, rawPath.trim());
                    return value === undefined || value === null ? '' : String(value);
                });

                testMessages.value.push({
                    type: 'bot',
                    content: '🛠️ [Herramienta] Template Render ejecutada',
                    nodeId,
                    rawResponse: { template, sourceVariable, rendered },
                });

                if (isSubroutine) {
                    return { rendered };
                }

                await moveToNextNode(nodeId, 0);
                break;
            }

            case NodeType.AI_TOOL_CONDITION_EVAL: {
                const runtimeArgs = getToolRuntimeArgs();
                const field = String(
                    runtimeArgs.field || node.config.toolPath || node.config.variableName || '',
                ).trim();
                const operator = String(runtimeArgs.operator || 'equals') as
                    | 'equals'
                    | 'not_equals'
                    | 'contains'
                    | 'greater'
                    | 'less'
                    | 'is_empty'
                    | 'is_not_empty'
                    | 'starts_with'
                    | 'ends_with'
                    | 'regex';
                const value = String(
                    runtimeArgs.value || node.config.toolDefaultValue || node.config.variableValue || '',
                );

                const match = evaluateCondition({
                    field,
                    operator,
                    value,
                    variables: testVariables.value,
                });

                testMessages.value.push({
                    type: 'bot',
                    content: `🛠️ [Herramienta] Condition Eval: ${match ? 'true' : 'false'}`,
                    nodeId,
                    rawResponse: { match, field, operator, value },
                });

                if (isSubroutine) {
                    return {
                        match,
                        field,
                        operator,
                        value,
                    };
                }

                await moveToNextNode(nodeId, 0);
                break;
            }

            case NodeType.AI_TOOL_DATETIME: {
                const runtimeArgs = getToolRuntimeArgs();
                const timezone = String(runtimeArgs.timezone || node.config.toolTimezone || 'America/Santiago');
                const format = String(runtimeArgs.format || node.config.toolDateFormat || 'iso');
                const addMinutes = Number(runtimeArgs.addMinutes || 0);
                const addDays = Number(runtimeArgs.addDays || 0);

                const date = new Date();
                if (Number.isFinite(addDays) && addDays !== 0) {
                    date.setDate(date.getDate() + addDays);
                }
                if (Number.isFinite(addMinutes) && addMinutes !== 0) {
                    date.setMinutes(date.getMinutes() + addMinutes);
                }

                let formatted = date.toISOString();
                try {
                    formatted = new Intl.DateTimeFormat('es-CL', {
                        timeZone: timezone,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                    }).format(date);
                } catch {
                    formatted = date.toISOString();
                }

                const result = {
                    iso: date.toISOString(),
                    epoch: date.getTime(),
                    timezone,
                    formatted,
                    format,
                };

                testMessages.value.push({
                    type: 'bot',
                    content: '🛠️ [Herramienta] DateTime ejecutada',
                    nodeId,
                    rawResponse: result,
                });

                if (isSubroutine) {
                    return result;
                }

                await moveToNextNode(nodeId, 0);
                break;
            }

            case NodeType.AI_TOOL_TEXT_UTILS: {
                const runtimeArgs = getToolRuntimeArgs();
                const operation = String(
                    runtimeArgs.operation || node.config.toolTextOperation || 'trim',
                ).toLowerCase();
                const fallbackText = String(node.config.variableValue || '');
                const text = String(runtimeArgs.text ?? runtimeArgs.value ?? fallbackText);

                let resultText = text;
                if (operation === 'lower') {
                    resultText = text.toLowerCase();
                } else if (operation === 'upper') {
                    resultText = text.toUpperCase();
                } else if (operation === 'slug') {
                    resultText = text
                        .normalize('NFD')
                        .replaceAll(/[\u0300-\u036F]/g, '')
                        .toLowerCase()
                        .replaceAll(/[^a-z0-9]+/g, '-')
                        .replaceAll(/^-+|-+$/g, '');
                } else {
                    resultText = text.trim();
                }

                testMessages.value.push({
                    type: 'bot',
                    content: `🛠️ [Herramienta] Text Utils (${operation}) ejecutada`,
                    nodeId,
                    rawResponse: { operation, input: text, result: resultText },
                });

                if (isSubroutine) {
                    return {
                        operation,
                        result: resultText,
                    };
                }

                await moveToNextNode(nodeId, 0);
                break;
            }

            case NodeType.WEBHOOK: {
                waitingWebhookNodeId.value = nodeId;
                const payloadVariable = node.config.webhookPayloadVariable?.trim() || 'webhook_payload';
                const eventName = node.config.webhookEventName?.trim();
                const eventHint = eventName ? `Evento esperado: ${eventName}\n` : '';

                testMessages.value.push({
                    type: 'bot',
                    content: `📥 Esperando payload de webhook...\n${eventHint}Envía un JSON por el input para continuar.\nSe guardará en {{${payloadVariable}}}.`,
                    nodeId,
                });

                isTestRunning.value = false;
                break;
            }

            case NodeType.VARIABLE: {
                const varName = node.config.variableName || 'variable';
                const varOperation = node.config.variableOperation || 'set';
                const varValue = node.config.variableValue || '';

                let processedValue: unknown = varValue;

                if (varValue && typeof varValue === 'string') {
                    const exactPlaceholder = varValue.match(/^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/);
                    if (exactPlaceholder && exactPlaceholder[1]) {
                        processedValue = getValueByPath(testVariables.value, exactPlaceholder[1].trim());
                    } else {
                        processedValue = replaceVariables(varValue);
                    }
                }

                switch (varOperation) {
                    case 'set': {
                        // Si el valor procesado es un string con apariencia de JSON, parsearlo
                        // Para que los nodos downstream (json_menu, list_render, etc.) reciban
                        // El tipo de dato correcto (array u objeto).
                        let finalValue: unknown = processedValue;
                        if (typeof finalValue === 'string') {
                            const trimmed = finalValue.trim();
                            if (
                                (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
                                (trimmed.startsWith('{') && trimmed.endsWith('}'))
                            ) {
                                try {
                                    finalValue = JSON.parse(trimmed);
                                } catch {
                                    // No es JSON válido, dejar como string
                                }
                            }
                        }
                        testVariables.value[varName] = finalValue;
                        break;
                    }
                    case 'get': {
                        processedValue = testVariables.value[varName];
                        break;
                    }
                    case 'increment': {
                        testVariables.value[varName] =
                            (Number(testVariables.value[varName]) || 0) + (Number(processedValue) || 1);
                        break;
                    }
                    case 'decrement': {
                        testVariables.value[varName] =
                            (Number(testVariables.value[varName]) || 0) - (Number(processedValue) || 1);
                        break;
                    }
                    default: {
                        // Case 'get' or others already handle flow
                        break;
                    }
                }

                testMessages.value.push({
                    type: 'bot',
                    content: `📝 Variable "${varName}" - Operación: ${varOperation}`,
                    nodeId: nodeId,
                    isDebug: true,
                });
                if (!isSubroutine) {
                    await moveToNextNode(nodeId, 0);
                }
                break;
            }

            case NodeType.SEND_TO: {
                // Mostrar mensaje opcional si existe
                const preTransferMessage = node.config.sendToMessage || node.config.message;
                if (preTransferMessage) {
                    testMessages.value.push({
                        type: 'bot',
                        content: preTransferMessage,
                        nodeId: nodeId,
                    });
                    await new Promise<void>(resolve => {
                        setTimeout(resolve, 500);
                    });
                }

                const { queueId } = node.config;
                const messageType = node.config.messageType || 'text';

                if (!queueId) {
                    stopExecution('❌ Nodo Enviar a sin cola destino configurada.', nodeId);
                    break;
                }

                testMessages.value.push({
                    type: 'bot',
                    content: `🔄 Transferencia simulada:\n→ Destino: COLA\n→ ID Cola: ${queueId}\n→ Tipo de mensaje: ${messageType}\n\n✅ En producción, la conversación sería transferida a esta cola.`,
                    nodeId: nodeId,
                });

                // Este nodo termina el flujo ya que es una transferencia
                isTestRunning.value = false;
                testCurrentNodeId.value = null;
                break;
            }

            case NodeType.FLOW: {
                const flowId = node.config.linkedFlowId;
                const flowName = node.config.linkedFlowName || 'Sin nombre';

                if (!flowId) {
                    testMessages.value.push({
                        type: 'bot',
                        content: '⚠️ No se ha seleccionado ningún flujo para vincular',
                        nodeId: nodeId,
                    });
                    await moveToNextNode(nodeId, 0);
                    break;
                }

                testMessages.value.push({
                    type: 'bot',
                    content: `🔗 Cargando flujo vinculado: "${flowName}" (ID: ${flowId})...`,
                    nodeId: nodeId,
                });

                // Cargar el flujo vinculado desde la API
                const linkedFlowData = await loadLinkedFlow(flowId);

                if (!linkedFlowData) {
                    testMessages.value.push({
                        type: 'bot',
                        content: `❌ Error: No se pudo cargar el flujo "${flowName}"`,
                        nodeId: nodeId,
                    });
                    await moveToNextNode(nodeId, 0);
                    break;
                }

                // Ejecutar el flujo vinculado (cambia el contexto de ejecución)
                await executeLinkedFlow({
                    linkedNodes: linkedFlowData.nodes,
                    linkedConnections: linkedFlowData.connections,
                    parentNodeId: nodeId,
                    flowName: flowName,
                    flowId,
                });
                break;
            }

            case NodeType.AI_AGENT: {
                const provider = node.config.aiProvider || 'openai';
                const model = node.config.aiModel || 'gpt-4o';
                const prompt = replaceVariables(node.config.aiPrompt || '');
                const responseVariable = node.config.aiResponseVariable || 'ai_response';
                const historyKey = `history_${nodeId}`;

                // Inicializar historial si no existe
                if (!testVariables.value[historyKey]) {
                    testVariables.value[historyKey] = [{ role: 'system', content: prompt }];
                }

                const history = testVariables.value[historyKey] as any[];

                const hasUserHistory = history.some((message: any) => message?.role === 'user');
                const isInitialAgentTurn = !hasUserHistory && waitingInputNodeId.value !== nodeId;

                if (isInitialAgentTurn) {
                    testMessages.value.push({
                        type: 'bot',
                        content:
                            '👋 Hola, soy tu asistente de atención al cliente. Cuéntame tu consulta y te ayudo paso a paso.',
                        nodeId: nodeId,
                    });

                    waitingInputNodeId.value = nodeId;
                    isTestRunning.value = false;
                    testCurrentNodeId.value = nodeId;
                    await focusUserInput();
                    break;
                }

                // Si venimos de un input de usuario, agregarlo al historial
                if (waitingInputNodeId.value === nodeId) {
                    let lastUserMsg = null as null | { type: string; content: string };
                    for (let i = testMessages.value.length - 1; i >= 0; i--) {
                        const m = testMessages.value[i];
                        if (m && m.type === 'user') {
                            lastUserMsg = { type: m.type, content: m.content };
                            break;
                        }
                    }
                    if (lastUserMsg) {
                        history.push({ role: 'user', content: lastUserMsg.content });
                        truncateHistoryInPlace(history);
                    }
                    waitingInputNodeId.value = null;
                }

                testMessages.value.push({
                    type: 'bot',
                    content: `🧠 Agente consultando a ${provider} (${model})...`,
                    nodeId: nodeId,
                    rawResponse: { provider, model, prompt, responseVariable, historyLength: history.length },
                });

                try {
                    isTestRunning.value = true;
                    await runAgentExecution(node, history, responseVariable);
                } catch (error: any) {
                    testMessages.value.push({
                        type: 'bot',
                        content: `❌ Error del Agente: ${error.message}`,
                        nodeId: nodeId,
                        rawResponse: { error: error.message, stack: error.stack },
                    });
                    // Cleanup en caso de error
                    executionStack.value = [];
                    activeFlowIds.value.clear();
                    waitingInputNodeId.value = null;
                    isTestRunning.value = false;
                }
                break;
            }

            case NodeType.END: {
                if (executionContext.value.isLinked) {
                    testMessages.value.push({
                        type: 'bot',
                        content: '✅ Fin del flujo vinculado',
                        nodeId: nodeId,
                    });
                    await returnFromLinkedFlow();
                } else {
                    testMessages.value.push({
                        type: 'bot',
                        content: '✅ Flujo finalizado',
                        nodeId: nodeId,
                    });
                    isTestRunning.value = false;
                    testCurrentNodeId.value = null;
                }
                break;
            }

            case NodeType.ERROR_HANDLER: {
                const errorHandlerEnabled = node.config.errorHandlerEnabled !== false;
                const catchAll = node.config.errorHandlerCatchAll || false;

                testMessages.value.push({
                    type: 'bot',
                    content: `🛡️ Error Handler activo (${catchAll ? 'catch-all' : 'selectivo'})`,
                    nodeId,
                    rawResponse: { enabled: errorHandlerEnabled, catchAll },
                });

                if (!isSubroutine) {
                    await moveToNextNode(nodeId, 0);
                }
                break;
            }

            case NodeType.AI_TOOL_HTTP: {
                const apiMethod = (node.config.apiMethod || 'GET') as ApiMethod;
                const apiUrl = replaceVariables(node.config.apiUrl || '');
                const authType = node.config.httpAuthType || 'none';
                const authHeader = node.config.httpAuthHeader || '';
                const authValue = replaceVariables(node.config.httpAuthValue || '');
                const httpTimeout = node.config.httpTimeout || API_TIMEOUT_MS;

                testMessages.value.push({
                    type: 'bot',
                    content: `🛠️ [HTTP+] Llamando: ${apiMethod} ${apiUrl || '(sin URL)'}`,
                    nodeId,
                });

                if (!apiUrl) {
                    if (isSubroutine) {
                        return { error: 'URL no configurada' };
                    }
                    await moveToNextNode(nodeId, 0);
                    break;
                }

                try {
                    const apiHeadersRaw = node.config.apiHeaders || {};
                    const requestHeaders: Record<string, string> = {};
                    for (const [key, val] of Object.entries(apiHeadersRaw)) {
                        requestHeaders[key] = replaceVariables(val as string);
                    }

                    if (authType !== 'none' && authHeader && authValue) {
                        if (authType === 'bearer') {
                            requestHeaders[authHeader] = `Bearer ${authValue}`;
                        } else if (authType === 'basic') {
                            requestHeaders[authHeader] = `Basic ${btoa(authValue)}`;
                        } else {
                            requestHeaders[authHeader] = authValue;
                        }
                    }

                    const apiBodyRaw = node.config.apiBody || '';
                    const apiBodyProcessed = apiBodyRaw ? replaceVariables(apiBodyRaw) : undefined;
                    const apiResponse = await executeApiViaProxy({
                        apiUrl,
                        apiMethod,
                        apiHeaders: requestHeaders,
                        apiBody: apiBodyProcessed,
                        timeout: httpTimeout,
                    });

                    const parsedResponse = parseApiResponseByFormat({
                        payload: apiResponse,
                        format: node.config.apiResponseFormat || 'json',
                        jsonPath: node.config.apiResponsePath,
                    });

                    testMessages.value.push({
                        type: 'bot',
                        content: '✅ Herramienta HTTP+ respondió con éxito',
                        nodeId,
                        rawResponse: { raw: apiResponse, parsed: parsedResponse },
                    });

                    if (isSubroutine) {
                        return parsedResponse;
                    }
                    await moveToNextNode(nodeId, 0);
                } catch (httpError: any) {
                    testMessages.value.push({
                        type: 'bot',
                        content: '❌ Error en herramienta HTTP+',
                        nodeId,
                        rawResponse: { error: httpError?.message || String(httpError) },
                    });
                    if (isSubroutine) {
                        return { error: 'Error de red en la herramienta HTTP+' };
                    }
                }
                break;
            }

            case NodeType.CACHE: {
                const cacheEnabled = node.config.cacheEnabled !== false;
                const cacheKey = replaceVariables(node.config.cacheKey || 'default_cache_key');
                const ttlSeconds = node.config.cacheTtlSeconds || 3600;
                const sourceVariable = node.config.cacheSourceVariable || '';
                const cacheVariable = node.config.cacheVariable || 'cached_result';

                if (!cacheEnabled) {
                    testMessages.value.push({
                        type: 'bot',
                        content: '📦 Cache deshabilitado, ejecutando flujo normal',
                        nodeId,
                    });
                    if (!isSubroutine) {
                        await moveToNextNode(nodeId, 1);
                    }
                    break;
                }

                const cacheStore = (window as any).__flowCache || ((window as any).__flowCache = new Map());
                const cacheEntry = cacheStore.get(cacheKey);
                const now = Date.now();

                if (cacheEntry && cacheEntry.expiresAt > now) {
                    testVariables.value[cacheVariable] = cacheEntry.data;
                    testMessages.value.push({
                        type: 'bot',
                        content: `📦 Cache HIT: "${cacheKey}" (TTL restante: ${Math.round((cacheEntry.expiresAt - now) / 1000)}s)`,
                        nodeId,
                        rawResponse: { cacheKey, cached: true, data: cacheEntry.data },
                    });
                    if (!isSubroutine) {
                        await moveToNextNode(nodeId, 0);
                    }
                    break;
                }

                testMessages.value.push({
                    type: 'bot',
                    content: `📦 Cache MISS: "${cacheKey}" - Ejecutando flujo para obtener datos`,
                    nodeId,
                });

                const missConnections = executionContext.value.connections.filter(
                    c => c.sourceNodeId === nodeId && c.sourcePortIndex === 1,
                );

                if (missConnections.length > 0) {
                    const connection = missConnections.at(-1);
                    if (connection) {
                        try {
                            await executeNode(connection.targetNodeId, false);

                            const sourceData = getValueByPath(testVariables.value, sourceVariable);
                            if (sourceData !== undefined) {
                                cacheStore.set(cacheKey, {
                                    data: sourceData,
                                    expiresAt: now + ttlSeconds * 1000,
                                    createdAt: now,
                                });
                                testVariables.value[cacheVariable] = sourceData;

                                testMessages.value.push({
                                    type: 'bot',
                                    content: `📦 Cache almacenado: "${cacheKey}" (TTL: ${ttlSeconds}s)`,
                                    nodeId,
                                });
                            }
                        } catch (cacheError: any) {
                            testMessages.value.push({
                                type: 'bot',
                                content: `❌ Error en flujo de cache: ${cacheError?.message || String(cacheError)}`,
                                nodeId,
                            });
                        }
                    }
                } else {
                    testMessages.value.push({
                        type: 'bot',
                        content: '⚠️ Cache miss sin flujo conectado',
                        nodeId,
                    });
                }

                if (!isSubroutine) {
                    await moveToNextNode(nodeId, 0);
                }
                break;
            }

            case NodeType.MERGE: {
                const mergeMode = node.config.mergeMode || 'wait_all';
                const resultsVariable = node.config.mergeResultsVariable || 'merge_results';
                const mergeKey = nodeId;

                // Detectar automáticamente cuántos inputs esperar
                const incomingConnections = executionContext.value.connections.filter(c => c.targetNodeId === nodeId);
                const expectedInputs = node.inputs || (incomingConnections.length > 0 ? incomingConnections.length : 0);

                // Identificar qué rama llegó usando sourceNodeId
                const effectiveSourceNodeId = sourceNodeId ?? testCurrentNodeId.value;
                const incomingConnection = incomingConnections.find(c => c.sourceNodeId === effectiveSourceNodeId);
                const inputIndex = incomingConnection?.targetPortIndex ?? 0;

                testMessages.value.push({
                    type: 'bot',
                    content: `🔀 Merge recibió rama de "${effectiveSourceNodeId}" en puerto ${inputIndex}`,
                    nodeId,
                    isDebug: true,
                });

                // Inicializar o recuperar estado del MERGE
                let mergeState = mergeStates.value.get(mergeKey);
                if (!mergeState) {
                    mergeState = {
                        arrived: [],
                        results: Array.from({ length: expectedInputs }, () => null),
                        errors: [],
                        startTime: Date.now(),
                    };
                    mergeStates.value.set(mergeKey, mergeState);
                }

                // Si ya se completó, no hacer nada
                if (mergeState.arrived.includes(inputIndex)) {
                    testMessages.value.push({
                        type: 'bot',
                        content: `🔀 Merge: puerto ${inputIndex} ya llegó anteriormente`,
                        nodeId,
                        isDebug: true,
                    });
                    break;
                }

                // Registrar esta rama
                mergeState.arrived.push(inputIndex);
                mergeState.results[inputIndex] = { ...testVariables.value };

                const arrivedCount = mergeState.arrived.length;
                const hasErrors = mergeState.errors.length > 0;

                testMessages.value.push({
                    type: 'bot',
                    content: `🔀 Merge: ${arrivedCount}/${expectedInputs} ramas llegadas`,
                    nodeId,
                    rawResponse: { arrived: [...mergeState.arrived], inputIndex },
                });

                // Si hay errores, matar el flujo
                if (hasErrors && mergeMode === 'wait_all') {
                    testMessages.value.push({
                        type: 'bot',
                        content: `❌ Merge detectó errores en las ramas: flujo terminado`,
                        nodeId,
                    });
                    mergeStates.value.delete(mergeKey);
                    stopExecution('❌ Error en ejecución paralela', nodeId);
                    break;
                }

                // Verificar si todas las ramas llegaron
                const allArrived = arrivedCount >= expectedInputs;

                if (allArrived) {
                    // Todas las ramas llegaron, continuar el flujo UNA sola vez
                    testVariables.value[resultsVariable] = mergeState.results;
                    testMessages.value.push({
                        type: 'bot',
                        content: `✅ Merge completado: ${arrivedCount} ramas sincronizadas`,
                        nodeId,
                    });
                    mergeStates.value.delete(mergeKey);

                    // Solo continuar si NO es subrutina
                    if (!isSubroutine) {
                        await moveToNextNode(nodeId, 0);
                    }
                } else {
                    testMessages.value.push({
                        type: 'bot',
                        content: `⏳ Merge esperando ${expectedInputs - arrivedCount} ramas más...`,
                        nodeId,
                    });
                }
                break;
            }

            case NodeType.JSON_MENU: {
                const sourceVariable = node.config.jsonMenuSourceVariable || '';
                const jsonPath = node.config.jsonMenuPath || '';
                const labelField = node.config.jsonMenuLabelField || 'name';
                const labelTemplate = node.config.jsonMenuLabelTemplate || '';
                const valueField = node.config.jsonMenuValueField || 'id';
                const descField = node.config.jsonMenuDescriptionField || '';
                const descTemplate = node.config.jsonMenuDescriptionTemplate || '';
                const outputVariable = node.config.jsonMenuOutputVariable || 'selected_item';
                const menuTitle = replaceVariables(node.config.jsonMenuTitle || 'Selecciona una opción:');
                const renderMode = node.config.jsonMenuRenderMode || 'generic';
                const maxItems = node.config.jsonMenuMaxItems || 10;
                const singleOutput = node.config.jsonMenuSingleOutput !== false;
                const templateName = node.config.jsonMenuTemplateName || '';
                const templateLanguage = node.config.jsonMenuTemplateLanguage || 'es';
                const templateParams = node.config.templateParams || [];
                const templateButtonField = node.config.jsonMenuTemplateButtonField || labelField;

                testMessages.value.push({
                    type: 'bot',
                    content: `📋 Procesando menú JSON desde variable "${sourceVariable}"...`,
                    nodeId,
                    isDebug: true,
                });

                if (!sourceVariable) {
                    testMessages.value.push({
                        type: 'bot',
                        content: '❌ Menú JSON sin variable fuente configurada',
                        nodeId,
                    });
                    if (!isSubroutine) {
                        await moveToNextNode(nodeId, 0);
                    }
                    break;
                }

                let jsonData = testVariables.value[sourceVariable];
                if (jsonPath) {
                    jsonData = getValueByPath(jsonData, jsonPath);
                }

                if (!jsonData || !Array.isArray(jsonData)) {
                    testMessages.value.push({
                        type: 'bot',
                        content: `❌ La variable "${sourceVariable}" no contiene un array válido`,
                        nodeId,
                    });
                    if (!isSubroutine) {
                        await moveToNextNode(nodeId, 0);
                    }
                    break;
                }

                const items = jsonData.slice(0, maxItems);

                if (items.length === 0) {
                    testMessages.value.push({
                        type: 'bot',
                        content: '⚠️ El array JSON está vacío',
                        nodeId,
                    });
                    if (!isSubroutine) {
                        await moveToNextNode(nodeId, 0);
                    }
                    break;
                }

                const menuOptions: {
                    label: string;
                    value: string;
                    description?: string;
                    data: unknown;
                    buttonText?: string;
                }[] = items.map((item: any, index: number) => {
                    let label = '';
                    let description = '';

                    if (labelTemplate) {
                        label = labelTemplate.replaceAll(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, rawPath: string) => {
                            const templateValue = getValueByPath(item, rawPath.trim());
                            return templateValue === undefined || templateValue === null ? '' : String(templateValue);
                        });
                    } else {
                        label = String(item[labelField] || item.name || `Opción ${index + 1}`);
                    }

                    const value = String(item[valueField] || item.id || index);

                    if (descTemplate) {
                        description = descTemplate.replaceAll(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, rawPath: string) => {
                            const descValue = getValueByPath(item, rawPath.trim());
                            return descValue === undefined || descValue === null ? '' : String(descValue);
                        });
                    } else if (descField) {
                        description = String(item[descField] || '');
                    } else {
                        description = '';
                    }

                    const buttonText = String(item[templateButtonField] || label);
                    return { label, value, description, data: item, buttonText };
                });

                testVariables.value.__jsonMenuOptions = menuOptions;
                testVariables.value.__jsonMenuTitle = menuTitle;

                if (renderMode === 'whatsapp_template') {
                    let templatePreview = `📨 Plantilla WhatsApp: ${templateName || '(sin nombre)'} (${templateLanguage})`;
                    templatePreview += `\n\n📋 Título: ${replaceVariables(menuTitle)}`;

                    if (templateParams.length > 0) {
                        templatePreview += '\n\nParámetros del body:';
                        templateParams.forEach(param => {
                            templatePreview += `\n- ${param.key}: ${replaceVariables(param.value || '')}`;
                        });
                    }

                    templatePreview += '\n\nBotones dinámicos desde JSON:';
                    menuOptions.slice(0, 3).forEach((opt, idx) => {
                        templatePreview += `\n${idx + 1}. ${opt.buttonText}`;
                    });
                    if (menuOptions.length > 3) {
                        templatePreview += `\n... y ${menuOptions.length - 3} más`;
                    }

                    testMessages.value.push({
                        type: 'bot',
                        content: templatePreview,
                        nodeId,
                        rawResponse: {
                            templateName,
                            templateLanguage,
                            templateParams: templateParams.map(p => ({
                                key: p.key,
                                value: replaceVariables(p.value || ''),
                            })),
                            buttons: menuOptions.slice(0, 3).map(opt => opt.buttonText),
                            totalItems: menuOptions.length,
                        },
                    });
                } else if (renderMode === 'whatsapp_buttons' && menuOptions.length <= 3) {
                    let menuContent = `${menuTitle}\n\n`;
                    menuOptions.forEach((opt, i) => {
                        menuContent += `${i + 1}. ${opt.label}${opt.description ? `\n   ${opt.description}` : ''}\n`;
                    });
                    menuContent += '\n💡 Responde con el número de la opción.';
                    testMessages.value.push({
                        type: 'bot',
                        content: menuContent,
                        nodeId,
                    });
                } else if (renderMode === 'whatsapp_list') {
                    let menuContent = `📱 ${menuTitle}\n`;
                    menuContent += `📝 ${menuOptions.length} opciones disponibles\n\n`;
                    menuOptions.forEach((opt, i) => {
                        menuContent += `${i + 1}. ${opt.label}${opt.description ? ` - ${opt.description}` : ''}\n`;
                    });
                    menuContent += '\n💡 Responde con el número de la opción.';
                    testMessages.value.push({
                        type: 'bot',
                        content: menuContent,
                        nodeId,
                    });
                } else {
                    let menuContent = `${menuTitle}\n\n`;
                    menuOptions.forEach((opt, i) => {
                        menuContent += `${i + 1}. ${opt.label}${opt.description ? `\n   ${opt.description}` : ''}\n`;
                    });
                    menuContent += '\n💡 Responde con el número de la opción.';
                    testMessages.value.push({
                        type: 'bot',
                        content: menuContent,
                        nodeId,
                    });
                }

                waitingInputNodeId.value = nodeId;
                testCurrentNodeId.value = nodeId;
                isTestRunning.value = false;
                break;
            }

            case NodeType.DELAY: {
                const delayTime = node.config.delayTime || 1;
                const delayUnit = node.config.delayUnit || 'seconds';
                const delayMessage = node.config.delayMessage
                    ? replaceVariables(String(node.config.delayMessage))
                    : null;

                const delayUnitLabel: Record<string, string> = {
                    seconds: 'segundo(s)',
                    minutes: 'minuto(s)',
                    hours: 'hora(s)',
                };
                const delayMsMap: Record<string, number> = {
                    minutes: delayTime * 60_000,
                    hours: delayTime * 3_600_000,
                    seconds: delayTime * 1_000,
                };
                const delayMs = delayMsMap[delayUnit] ?? delayTime * 1_000;

                if (delayMessage) {
                    testMessages.value.push({ type: 'bot', content: delayMessage, nodeId });
                }

                testMessages.value.push({
                    type: 'bot',
                    content: `⏱️ Esperando ${delayTime} ${delayUnitLabel[delayUnit] ?? 'segundo(s)'}...`,
                    nodeId,
                    isDebug: true,
                });

                await new Promise<void>(resolve => {
                    setTimeout(resolve, Math.min(delayMs, 10_000));
                });

                testMessages.value.push({
                    type: 'bot',
                    content: `✅ Espera completada.`,
                    nodeId,
                    isDebug: true,
                });

                await moveToNextNode(nodeId, 0);
                break;
            }

            case NodeType.LIST_RENDER: {
                const sourceVarName = node.config.listRenderSourceVariable || '';
                const listPath = node.config.listRenderPath || '';
                const header = node.config.listRenderHeader
                    ? replaceVariables(String(node.config.listRenderHeader))
                    : '';
                const itemTemplate = node.config.listRenderItemTemplate || '';
                const footer = node.config.listRenderFooter
                    ? replaceVariables(String(node.config.listRenderFooter))
                    : '';
                const rawSeparator = node.config.listRenderSeparator;
                const separator =
                    rawSeparator !== undefined && rawSeparator !== null
                        ? String(rawSeparator).replaceAll(String.raw`\n`, '\n')
                        : '\n';
                const maxItems = node.config.listRenderMaxItems || 50;
                const outputVar = node.config.listRenderOutputVariable || '';
                const sendMessage = node.config.listRenderSendMessage !== false;

                if (!sourceVarName) {
                    testMessages.value.push({
                        type: 'bot',
                        content: '❌ List Render: sin variable fuente configurada.',
                        nodeId,
                    });
                    await moveToNextNode(nodeId, 0);
                    break;
                }

                // Obtener el array fuente
                let sourceData: unknown = testVariables.value[sourceVarName];

                if (listPath) {
                    // Resolver ruta anidada: "data.items" → obj.data.items
                    sourceData = listPath.split('.').reduce<unknown>((acc, key) => {
                        if (acc !== null && typeof acc === 'object') {
                            return (acc as Record<string, unknown>)[key];
                        }
                    }, sourceData);
                }

                if (!Array.isArray(sourceData)) {
                    testMessages.value.push({
                        type: 'bot',
                        content: `❌ List Render: la variable «${sourceVarName}${listPath ? `.${listPath}` : ''}» no es un array.`,
                        nodeId,
                    });
                    await moveToNextNode(nodeId, 0);
                    break;
                }

                const items = sourceData.slice(0, maxItems) as Record<string, unknown>[];

                // Renderizar cada ítem usando el template
                const renderedItems = items.map(item =>
                    itemTemplate.replaceAll(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, key: string) => {
                        const val = item[key.trim()];
                        return val !== undefined && val !== null ? String(val) : `{{${key.trim()}}}`;
                    }),
                );

                // Armar el texto completo
                const parts: string[] = [];
                if (header) {
                    parts.push(header);
                }
                parts.push(renderedItems.join(separator));
                if (footer) {
                    parts.push(footer);
                }
                const fullText = parts.join('\n');

                // Guardar en variable si se configuró
                if (outputVar) {
                    testVariables.value[outputVar] = fullText;
                }

                // Mostrar como mensaje
                if (sendMessage) {
                    testMessages.value.push({ type: 'bot', content: fullText, nodeId });
                } else {
                    testMessages.value.push({
                        type: 'bot',
                        content: `📋 Lista generada (${items.length} ítems) guardada en «${outputVar || 'N/A'}»`,
                        nodeId,
                        isDebug: true,
                    });
                }

                await moveToNextNode(nodeId, 0);
                break;
            }

            default: {
                await moveToNextNode(nodeId, 0);
                break;
            }
        }
    };

    // Mover al siguiente nodo
    const moveToNextNode = async (currentNodeId: string, outputIndex: number) => {
        const portConnections = executionContext.value.connections.filter(
            c => c.sourceNodeId === currentNodeId && c.sourcePortIndex === outputIndex,
        );

        const connection = portConnections.at(-1);

        if (connection) {
            await executeNode(connection.targetNodeId, false, currentNodeId);
        } else {
            testMessages.value.push({
                type: 'bot',
                content: '⚠️ No hay más nodos conectados',
            });
            isTestRunning.value = false;
            testCurrentNodeId.value = null;
        }
    };

    // Enviar mensaje del usuario
    const handleSendMessage = async () => {
        if (!testUserInput.value.trim()) {
            return;
        }

        const userMessage = testUserInput.value;
        testMessages.value.push({
            type: 'user',
            content: userMessage,
        });

        testUserInput.value = '';

        backendVariables.value._last_user_input = userMessage;
        backendVariables.value.last_user_input = userMessage;

        const nodeIdToContinue = (waitingInputNodeId.value || backendCurrentNodeId.value) ?? undefined;
        waitingInputNodeId.value = null;
        isTestRunning.value = true;
        await executeBackendSimulation(userMessage, nodeIdToContinue);
        await focusUserInput();
    };

    // Reiniciar prueba
    const handleRestartTest = async () => {
        // Guardar ID anterior para limpiar sesión
        const previousSenderId = senderId.value;

        testMessages.value = [];
        testVisitedNodes.value = [];
        testUserInput.value = '';
        testVariables.value = {};
        testCurrentNodeId.value = null;
        isTestRunning.value = false;
        executionSteps.value = 0;
        executionStack.value = [];
        activeFlowIds.value.clear();
        waitingWebhookNodeId.value = null;
        mergeStates.value.clear();
        activeLoops.value.clear();

        // Limpiar estado del frontend inmediatamente
        backendCurrentNodeId.value = null;
        backendVariables.value = {};

        // Notificar al canvas que no hay nodo activo
        emit('updateActiveNode', null);
        emit('updateVisitedNodes', []);

        // Generar nuevo ID de usuario ANTES de limpiar sesión anterior
        generateNewSenderId();

        // Limpiar sesión en Redis con el ID anterior
        if (isTrunkMode.value && selectedTrunkToken.value && previousSenderId) {
            try {
                const response = await versaFetch({
                    url: `/${panelUrl}/chatbot/flowBuilder/clear-session/${selectedTrunkToken.value}/${previousSenderId}`,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({ csrf_token: csrf_token.value }),
                });

                // Debug: mostrar si se limpió correctamente
                testMessages.value.push({
                    type: 'bot',
                    content: `🧹 Sesión limpiada para ${previousSenderId}: ${response.success === 1 ? '✅' : '❌'}`,
                    isDebug: true,
                });
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
                testMessages.value.push({
                    type: 'bot',
                    content: `⚠️ Error limpiando sesión: ${errorMsg}`,
                    isDebug: true,
                });
            }
        }

        startFlowTest();
    };

    // Resize handlers for the panel
    const startResize = (event: MouseEvent) => {
        event.preventDefault();
        isResizing.value = true;
        resizeStartY.value = event.clientY;
        resizeStartHeight.value = panelHeight.value;

        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
    };

    const handleResize = (event: MouseEvent) => {
        if (!isResizing.value) {
            return;
        }
        const deltaY = resizeStartY.value - event.clientY;
        const newHeight = Math.max(MIN_PANEL_HEIGHT, Math.min(MAX_PANEL_HEIGHT, resizeStartHeight.value + deltaY));
        panelHeight.value = newHeight;
    };

    const stopResize = () => {
        isResizing.value = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
        emit('updatePanelHeight', isCollapsed.value ? 48 : panelHeight.value);
    };

    const startResizeChat = (event: MouseEvent) => {
        event.preventDefault();
        isResizingChat.value = true;
        resizeStartX.value = event.clientX;
        resizeStartChatWidth.value = chatPanelWidth.value;
        document.addEventListener('mousemove', handleResizeChat);
        document.addEventListener('mouseup', stopResizeChat);
    };

    const handleResizeChat = (event: MouseEvent) => {
        if (!isResizingChat.value) {
            return;
        }
        const deltaX = event.clientX - resizeStartX.value;
        chatPanelWidth.value = Math.max(200, Math.min(400, resizeStartChatWidth.value + deltaX));
    };

    const stopResizeChat = () => {
        isResizingChat.value = false;
        document.removeEventListener('mousemove', handleResizeChat);
        document.removeEventListener('mouseup', stopResizeChat);
    };

    const startResizeState = (event: MouseEvent) => {
        event.preventDefault();
        isResizingState.value = true;
        resizeStartX.value = event.clientX;
        resizeStartStateWidth.value = statePanelWidth.value;
        document.addEventListener('mousemove', handleResizeState);
        document.addEventListener('mouseup', stopResizeState);
    };

    const handleResizeState = (event: MouseEvent) => {
        if (!isResizingState.value) {
            return;
        }
        const deltaX = resizeStartX.value - event.clientX;
        statePanelWidth.value = Math.max(150, Math.min(300, resizeStartStateWidth.value + deltaX));
    };

    const stopResizeState = () => {
        isResizingState.value = false;
        document.removeEventListener('mousemove', handleResizeState);
        document.removeEventListener('mouseup', stopResizeState);
    };

    const toggleCollapse = () => {
        isCollapsed.value = !isCollapsed.value;
        emit('updatePanelHeight', isCollapsed.value ? 48 : panelHeight.value);
    };

    // Cerrar modal
    const handleClose = () => {
        testCurrentNodeId.value = null;
        waitingWebhookNodeId.value = null;
        emit('close');
    };

    // Iniciar cuando se abre el modal
    watch(
        () => props.show,
        show => {
            if (show) {
                testMessages.value = [];
                testVisitedNodes.value = [];
                testUserInput.value = '';
                testVariables.value = {};
                testCurrentNodeId.value = null;
                isTestRunning.value = false;
                waitingWebhookNodeId.value = null;
                mergeStates.value.clear();
                activeLoops.value.clear();
                if (!selectedTrunkToken.value) {
                    showTrunkConfigModal.value = true;
                } else {
                    startFlowTest();
                }
                focusUserInput().catch(() => null);
                emit('updatePanelHeight', isCollapsed.value ? 48 : panelHeight.value);
            } else {
                testCurrentNodeId.value = null;
                waitingWebhookNodeId.value = null;
                emit('updatePanelHeight', 0);
            }
        },
    );
</script>

<template>
    <Transition name="slide-up">
        <div
            v-if="show"
            class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t-2 border-gray-200 dark:border-gray-700 shadow-2xl z-[9998] flex flex-col"
            :style="{ height: isCollapsed ? '48px' : `${panelHeight}px` }">
            <div
                class="h-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-brand cursor-row-resize transition-colors flex-shrink-0"
                @mousedown="startResize"
                v-if="!isCollapsed" />
            <div
                class="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div class="flex items-center gap-3">
                    <button
                        @click="toggleCollapse"
                        class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        :title="isCollapsed ? 'Expandir panel' : 'Colapsar panel'">
                        <svg
                            class="w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform"
                            :class="{ 'rotate-180': isCollapsed }"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                        <span class="text-lg">🧪</span>
                        <span v-if="!isCollapsed">Prueba del Flujo</span>
                        <span
                            v-if="!isCollapsed"
                            class="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 font-normal">
                            <span class="flex items-center gap-1">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                                {{ testVisitedNodes.length }} nodos
                            </span>
                            <span class="flex items-center gap-1">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                {{ testMessages.length }} msgs
                            </span>
                        </span>
                    </h3>
                </div>
                <div class="flex items-center gap-1">
                    <div v-if="isTestRunning" class="flex items-center gap-2 mr-2">
                        <div class="animate-spin rounded-full h-3 w-3 border-2 border-brand border-t-transparent"></div>
                        <span class="text-xs text-gray-500 dark:text-gray-400">Ejecutando...</span>
                    </div>
                    <button
                        @click="showAISettings = !showAISettings"
                        class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-400"
                        title="API Keys">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                    <button
                        @click="showTrunkConfigModal = true"
                        class="px-2 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:hover:bg-purple-900">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Config
                    </button>
                    <span class="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                        </svg>
                        Backend
                    </span>
                    <button
                        @click="handleRestartTest"
                        class="px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reiniciar
                    </button>
                    <button
                        @click="startOutboundTest"
                        :disabled="isTestRunning"
                        class="px-2 py-1 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                        title="Iniciar outbound sin mensaje entrante">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M13 7h6m0 0v6m0-6L10 14m-3 7a6 6 0 110-12 6 6 0 010 12z" />
                        </svg>
                        Outbound
                    </button>
                    <button
                        @click="handleClose"
                        class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-400"
                        title="Cerrar">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Trunk Mode Status Bar (simplified) -->
            <div
                v-if="!isCollapsed && isTrunkMode && selectedTrunkToken"
                class="border-b border-gray-200 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/20 px-3 py-1">
                <div class="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300">
                    <span class="font-medium">
                        {{ trunks.find(t => t.token_trunk === selectedTrunkToken)?.nombre || 'Troncal' }}
                    </span>
                    <span v-if="selectedChannelCode" class="text-purple-500 dark:text-purple-400">
                        · {{ platformConfig.name }}
                    </span>
                    <span class="text-purple-400 dark:text-purple-500">· {{ senderId }}</span>
                </div>
            </div>

            <div v-if="!isCollapsed" class="flex-1 flex overflow-hidden">
                <div
                    class="flex flex-col border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 relative"
                    :style="{ width: `${chatPanelWidth}px` }">
                    <div
                        class="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand dark:hover:bg-brand z-10 transition-colors"
                        @mousedown="startResizeChat"></div>
                    <div class="px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                        <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">💬 Chat</span>
                    </div>
                    <div
                        v-if="showAISettings"
                        class="p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div class="grid grid-cols-3 gap-1">
                            <input
                                v-model="apiKeys.openai"
                                type="password"
                                placeholder="OpenAI"
                                class="text-[10px] px-1 py-0.5 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            <input
                                v-model="apiKeys.gemini"
                                type="password"
                                placeholder="Gemini"
                                class="text-[10px] px-1 py-0.5 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            <input
                                v-model="apiKeys.groq"
                                type="password"
                                placeholder="Groq"
                                class="text-[10px] px-1 py-0.5 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                        <div class="mt-1 flex justify-end gap-1">
                            <button
                                @click="showAISettings = false"
                                class="px-1.5 py-0.5 text-[10px] text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                                X
                            </button>
                            <button @click="saveKeys" class="px-1.5 py-0.5 text-[10px] bg-brand text-white rounded">
                                OK
                            </button>
                        </div>
                    </div>
                    <div ref="chatScrollContainer" class="flex-1 overflow-y-auto p-2 space-y-1.5">
                        <div
                            v-for="(message, index) in chatOnlyMessages"
                            :key="index"
                            class="rounded px-2 py-1.5 text-xs"
                            :class="
                                message.type === 'user'
                                    ? 'bg-brand text-white ml-4'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                            ">
                            <template v-if="message.mediaUrl">
                                <img
                                    v-if="message.mediaType === 'image'"
                                    :src="message.mediaUrl"
                                    :alt="message.content || 'imagen'"
                                    class="max-w-full rounded mb-1 block"
                                    style="max-height: 200px; object-fit: contain" />
                                <video
                                    v-else-if="message.mediaType === 'video'"
                                    :src="message.mediaUrl"
                                    controls
                                    class="max-w-full rounded mb-1 block"
                                    style="max-height: 200px" />
                                <audio
                                    v-else-if="message.mediaType === 'audio'"
                                    :src="message.mediaUrl"
                                    controls
                                    class="w-full mb-1 block" />
                                <a
                                    v-else
                                    :href="message.mediaUrl"
                                    target="_blank"
                                    class="block mb-1 text-blue-500 underline truncate">
                                    📎 {{ message.fileName || message.mediaUrl }}
                                </a>
                            </template>
                            <p v-if="message.content" class="whitespace-pre-wrap">{{ message.content }}</p>
                            <!-- Menu options -->
                            <div v-if="message.menuOptions && message.menuOptions.length > 0" class="mt-2 space-y-1">
                                <button
                                    v-for="(option, optIndex) in message.menuOptions"
                                    :key="optIndex"
                                    @click="handleMenuOptionClick(option.value, option.label)"
                                    :disabled="isTestRunning"
                                    class="w-full text-left px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-brand hover:text-white dark:hover:bg-brand transition-colors disabled:opacity-50">
                                    {{ optIndex + 1 }}. {{ option.label }}
                                </button>
                            </div>
                        </div>
                        <div
                            v-if="chatOnlyMessages.length === 0"
                            class="text-center text-gray-400 dark:text-gray-500 text-xs py-4">
                            Sin mensajes
                        </div>
                    </div>
                    <div class="border-t border-gray-200 dark:border-gray-700 p-2 flex gap-1.5">
                        <!-- Hidden file input -->
                        <input
                            ref="fileInputRef"
                            type="file"
                            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                            class="hidden"
                            @change="handleFileUpload" />
                        <!-- File upload button -->
                        <button
                            @click="triggerFileUpload"
                            :disabled="isTestRunning"
                            class="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                            title="Adjuntar archivo">
                            📎
                        </button>
                        <input
                            ref="testUserInputElement"
                            v-model="testUserInput"
                            type="text"
                            placeholder="Responder..."
                            class="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            :disabled="isTestRunning"
                            @keyup.enter="handleSendMessage" />
                        <button
                            @click="handleSendMessage"
                            :disabled="isTestRunning || !testUserInput.trim()"
                            class="px-2 py-1 text-xs bg-brand text-white rounded disabled:opacity-50">
                            →
                        </button>
                    </div>
                </div>

                <div class="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
                    <div
                        class="px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-between">
                        <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">📊 Debug / Logs</span>
                        <div class="flex items-center gap-1">
                            <button
                                v-if="selectedMessageIndex >= 0"
                                @click="copySelectedMessage"
                                class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                title="Copiar mensaje seleccionado">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                            <button
                                @click="copyDebugLogs"
                                :disabled="debugOnlyMessages.length === 0"
                                class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-30"
                                title="Copiar todos los logs">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div ref="debugScrollContainer" class="flex-1 overflow-y-auto p-2 space-y-1">
                        <div
                            v-for="(message, index) in debugOnlyMessages"
                            :key="index"
                            @click="selectMessage(testMessages.indexOf(message))"
                            class="rounded px-2 py-1 text-xs cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
                            :class="{
                                'bg-brand-50 dark:bg-brand-900/20':
                                    selectedMessageIndex === testMessages.indexOf(message),
                            }">
                            <p class="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{{ message.content }}</p>
                            <div v-if="message.rawResponse !== undefined" class="mt-1">
                                <pre
                                    class="p-1 bg-gray-900 dark:bg-gray-950 rounded text-[9px] text-green-400 overflow-auto max-h-20"
                                    >{{ JSON.stringify(message.rawResponse, null, 2) }}</pre
                                >
                            </div>
                        </div>
                        <div
                            v-if="debugOnlyMessages.length === 0"
                            class="text-center text-gray-400 dark:text-gray-500 text-xs py-8">
                            <svg
                                class="w-8 h-8 mx-auto mb-2 opacity-50"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="1.5"
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Sin mensajes de debug
                        </div>
                    </div>
                </div>

                <div
                    class="border-l border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-900 relative"
                    :style="{ width: `${statePanelWidth}px` }">
                    <div
                        class="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand dark:hover:bg-brand z-10 transition-colors"
                        @mousedown="startResizeState"></div>
                    <div
                        class="px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-between">
                        <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">📦 Variables</span>
                        <button
                            @click="showVariablesModal"
                            :disabled="Object.keys(testVariables).length === 0"
                            class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-30"
                            title="Ver todas las variables">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                        </button>
                    </div>
                    <div class="flex-1 p-2 overflow-y-auto">
                        <div
                            v-for="(value, key) in testVariables"
                            :key="key"
                            class="text-[10px] py-0.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                            <span class="font-medium text-gray-700 dark:text-gray-300">{{ key }}</span>
                            <span class="text-gray-400 dark:text-gray-500 block truncate">
                                {{
                                    typeof value === 'object'
                                        ? JSON.stringify(value).slice(0, 30) + '...'
                                        : String(value).slice(0, 30)
                                }}
                            </span>
                        </div>
                        <div
                            v-if="Object.keys(testVariables).length === 0"
                            class="text-[10px] text-gray-400 text-center py-2">
                            Sin variables
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Transition>

    <!-- Modal de Configuración Trunk -->
    <Teleport to="body">
        <div
            v-if="showTrunkConfigModal"
            class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
            @click.self="showTrunkConfigModal = false">
            <div class="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md m-4">
                <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            Configuración Trunk
                        </h3>
                        <button
                            @click="showTrunkConfigModal = false"
                            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Selecciona la troncal y usuario para probar el flujo guardado.
                    </p>
                </div>

                <div class="p-4 space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Empresa</label>
                        <select
                            v-model="selectedEmpresaToken"
                            @change="loadChannels"
                            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                            <option value="">Seleccionar empresa...</option>
                            <option v-for="empresa in empresas" :key="empresa.id" :value="empresa.token_empresa">
                                {{ empresa.nombre }}
                            </option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Canal</label>
                        <select
                            v-model="selectedChannelCode"
                            @change="loadTrunks"
                            :disabled="!selectedEmpresaToken"
                            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50">
                            <option value="">Seleccionar canal...</option>
                            <option v-for="channel in channels" :key="channel.id" :value="channel.codigo_interno">
                                {{ channel.nombre }}
                            </option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Troncal</label>
                        <select
                            v-model="selectedTrunkToken"
                            :disabled="!selectedChannelCode"
                            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50">
                            <option value="">Seleccionar troncal...</option>
                            <option v-for="trunk in trunks" :key="trunk.id" :value="trunk.token_trunk">
                                {{ trunk.nombre }}
                            </option>
                        </select>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                ID Usuario
                            </label>
                            <input
                                v-model="senderId"
                                type="text"
                                placeholder="test_user_123"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nombre
                            </label>
                            <input
                                v-model="senderName"
                                type="text"
                                placeholder="Usuario de Prueba"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                    </div>

                    <!-- Ticket de prueba para rating -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            ID Ticket de prueba
                            <span class="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1">
                                (opcional — para probar persistencia de rating)
                            </span>
                        </label>
                        <input
                            v-model="testTicketId"
                            type="number"
                            min="1"
                            placeholder="Ej: 42"
                            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Si se ingresa, el nodo de rating guardará la calificación en ese ticket de la BD.
                        </p>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Mensaje inicial outbound
                            <span class="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1">(opcional)</span>
                        </label>
                        <input
                            v-model="outboundInitialMessage"
                            type="text"
                            placeholder="Ej: Hola, quiero más info"
                            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Se usa al presionar el botón
                            <strong>Outbound</strong>
                            en el TestFlow.
                        </p>
                    </div>

                    <div
                        class="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                        <p class="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">
                            📋 Variables de contexto:
                        </p>
                        <div class="grid grid-cols-2 gap-1 text-[11px] font-mono text-blue-600 dark:text-blue-400">
                            <span>sender_id: {{ senderId }}</span>
                            <span>sender_name: {{ senderName }}</span>
                            <span>platform: {{ selectedChannelCode || '-' }}</span>
                            <span>channel: {{ selectedChannelCode || '-' }}</span>
                            <span>trunk_token: {{ selectedTrunkToken || '-' }}</span>
                            <span v-if="testTicketId">_ticket_id: {{ testTicketId }}</span>
                        </div>
                    </div>
                </div>

                <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                    <button
                        @click="showTrunkConfigModal = false"
                        class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        Cerrar
                    </button>
                    <button
                        @click="
                            showTrunkConfigModal = false;
                            handleRestartTest();
                        "
                        :disabled="!selectedTrunkToken"
                        class="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        Aplicar y Reiniciar
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
    .slide-up-enter-active,
    .slide-up-leave-active {
        transition: all 0.3s ease;
    }
    .slide-up-enter-from,
    .slide-up-leave-to {
        transform: translateY(100%);
        opacity: 0;
    }
</style>
