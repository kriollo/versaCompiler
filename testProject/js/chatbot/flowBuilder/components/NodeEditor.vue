<script setup lang="ts">
    import type { VersaFetchResponse, VersaParamsFetch } from 'versaTypes';
    import { computed, inject, onBeforeUnmount, ref, type Ref, shallowRef, watch } from 'vue';

    import { nodeRegistry } from '@/dashboard/js/chatbot/flowBuilder/nodes/index';
    import type {
        FlowNode,
        InteractiveListRowConfig,
        NodeConfig,
        WhatsAppTemplateButtonConfig,
    } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
    import { getNodeDefinition } from '@/dashboard/js/chatbot/flowBuilder/types/nodeDefinitions';
    import MediaStorePickerModal from '@/dashboard/js/chatbot/mediaStore/components/MediaStorePickerModal.vue';
    import type { ChatbotMediaAsset, MediaType } from '@/dashboard/js/chatbot/mediaStore/types';
    import { versaAlert, versaFetch } from '@/dashboard/js/functions';

    type ApiMethod = VersaParamsFetch['method'];

    interface ApiProxyResponse {
        success?: number | boolean;
        message?: string;
        statusCode?: number;
        payload?: unknown;
    }

    interface Props {
        selectedNode: FlowNode | null;
        allNodes?: FlowNode[];
        isZenMode?: boolean;
        width?: string;
    }

    const props = withDefaults(defineProps<Props>(), {
        allNodes: [] as FlowNode[],
        isZenMode: false,
        width: '20rem',
    });

    const emit = defineEmits<{
        updateNode: [nodeId: string, config: Partial<FlowNode>];
        close: [];
        'update:width': [val: string];
    }>();

    const isResizing = ref(false);
    let startX = 0;
    let startWidthPx = 0;

    const MIN_WIDTH_PX = 240;

    const parsePx = (val: string | undefined): number | null => {
        if (!val) {
            return null;
        }
        const s = val.trim();
        if (s.endsWith('px')) {
            return Number.parseFloat(s.replace('px', '')) || 0;
        }
        if (s.endsWith('rem')) {
            const num = Number.parseFloat(s.replace('rem', '')) || 0;
            const root =
                typeof window !== 'undefined'
                    ? Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
                    : 16;
            return Math.round(num * root);
        }
        const n = Number.parseFloat(s);
        return Number.isFinite(n) ? n : null;
    };

    const onMouseMove = (ev: MouseEvent) => {
        if (!isResizing.value) {
            return;
        }
        const currentX = ev.clientX;
        const delta = startX - currentX; // Dragging left -> positive
        const newW = Math.max(MIN_WIDTH_PX, Math.round(startWidthPx + delta));
        emit('update:width', `${newW}px`);
    };

    const stopResize = () => {
        if (!isResizing.value) {
            return;
        }
        isResizing.value = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', stopResize);
        window.removeEventListener('touchmove', onTouchMove as any);
        window.removeEventListener('touchend', stopResize);
    };

    const onTouchMove = (ev: TouchEvent) => {
        if (!isResizing.value) {
            return;
        }
        const [touch] = ev.touches as any;
        if (!touch) {
            return;
        }
        const currentX = touch.clientX;
        const delta = startX - currentX;
        const newW = Math.max(MIN_WIDTH_PX, Math.round(startWidthPx + delta));
        emit('update:width', `${newW}px`);
    };

    const startResize = (ev: MouseEvent | TouchEvent) => {
        isResizing.value = true;
        if ('touches' in ev && ev.touches && ev.touches.length > 0) {
            const [t] = ev.touches as any;
            startX = t?.clientX ?? 0;
        } else if ((ev as MouseEvent).clientX !== undefined) {
            startX = (ev as MouseEvent).clientX;
        } else {
            startX = 0;
        }

        // Get current element width
        const target = (ev.target as HTMLElement)?.closest('.node-editor') as HTMLElement | null;
        const rect = target ? target.getBoundingClientRect() : null;
        const parsed = parsePx(props.width);
        startWidthPx = rect ? Math.round(rect.width) : (parsed ?? 400);

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', stopResize);
        window.addEventListener('touchmove', onTouchMove as any, { passive: true });
        window.addEventListener('touchend', stopResize);
    };

    onBeforeUnmount(() => {
        stopResize();
    });

    const panelUrl = inject<string>('panelUrl', '');
    const empresaSelected = inject<string>('empresaSelected', '');
    const csrf_token = inject<Ref<string>>('csrf_token', ref(''));

    // Estado local del formulario
    const localConfig = ref<NodeConfig>({});
    const localLabel = ref('');

    const modularEditor = shallowRef<any>(null);

    watch(
        () => props.selectedNode?.type,
        async newType => {
            if (!newType) {
                modularEditor.value = null;
                return;
            }
            const editor = await nodeRegistry.getEditor(newType);
            modularEditor.value = editor || null;
        },
        { immediate: true },
    );
    const isApiProbeLoading = ref(false);
    const apiProbeError = ref('');
    const apiProbePreview = ref('');
    const apiProbePaths = ref<string[]>([]);
    const apiProbePathNotFound = ref(false);

    // Estado para flujos disponibles
    const availableFlows = ref<{ id: number; description: string; created_at: string }[]>([]);
    const loadingFlows = ref(false);
    const flowsLoaded = ref(false);
    const showMediaStoreModal = ref(false);

    const nodeDefinition = computed(() => (props.selectedNode ? getNodeDefinition(props.selectedNode.type) : null));

    const maxProbePathDepth = 4;
    const maxProbePathSuggestions = 120;

    const apiVariableBase = computed(() => {
        const variableName = (localConfig.value.apiResponseVariable || '').trim();
        return variableName || 'api_result';
    });

    const apiResponsePathValue = computed(() => {
        const responsePath = (localConfig.value.apiResponsePath || '').trim();
        return responsePath;
    });

    const apiSuggestedVariablePaths = computed(() => {
        if (apiProbePaths.value.length > 0) {
            return [...new Set(apiProbePaths.value)];
        }

        return [apiVariableBase.value];
    });

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

    const regexValidationState = computed(() => {
        if (localConfig.value.expectedAnswer !== 'regex') {
            return null;
        }

        const pattern = (localConfig.value.validationPattern || '').trim();
        if (!pattern) {
            return {
                valid: false,
                message: 'Regex requerido: ingresa un patrón para validar respuestas.',
            };
        }

        try {
            buildRegexFromPattern(pattern);
            return {
                valid: true,
                message: 'Regex válido.',
            };
        } catch {
            return {
                valid: false,
                message: 'Regex inválido: revisa la sintaxis del patrón.',
            };
        }
    });

    const conditionOutputMap = computed(() => {
        const conditions = localConfig.value.conditions || [];
        const conditionPorts = conditions.map((_, index) => ({
            port: index + 1,
            label: `Condición ${index + 1}`,
        }));

        return [
            ...conditionPorts,
            {
                port: conditions.length + 1,
                label: 'Por defecto (ninguna condición coincide)',
            },
        ];
    });

    const formatApiPlaceholder = (path: string): string => `{{ ${path} }}`;

    const getValueByPath = (source: unknown, path: string): unknown => {
        if (!path) {
            return source;
        }

        return path.split('.').reduce<unknown>((acc, segment) => {
            if (acc === null || acc === undefined) {
                return;
            }

            const normalizedSegment = segment.trim();

            if (Array.isArray(acc) && /^\d+$/.test(normalizedSegment)) {
                const index = Number(normalizedSegment);
                return acc[index];
            }

            if (typeof acc === 'object') {
                return (acc as Record<string, unknown>)[normalizedSegment];
            }
        }, source);
    };

    const collectProbePaths = (params: {
        source: unknown;
        basePath: string;
        depth: number;
        collector: Set<string>;
    }): void => {
        const { source, basePath, depth, collector } = params;

        if (collector.size >= maxProbePathSuggestions || depth > maxProbePathDepth) {
            return;
        }

        if (basePath) {
            collector.add(basePath);
        }

        if (!source || typeof source !== 'object') {
            return;
        }

        if (Array.isArray(source)) {
            source.slice(0, 5).forEach((item, index) => {
                const nextPath = basePath ? `${basePath}.${index}` : String(index);
                collectProbePaths({
                    source: item,
                    basePath: nextPath,
                    depth: depth + 1,
                    collector,
                });
            });
            return;
        }

        Object.entries(source as Record<string, unknown>)
            .slice(0, 30)
            .forEach(([key, value]) => {
                const nextPath = basePath ? `${basePath}.${key}` : key;
                collectProbePaths({
                    source: value,
                    basePath: nextPath,
                    depth: depth + 1,
                    collector,
                });
            });
    };

    const handleProbeApi = async () => {
        const apiUrl = (localConfig.value.apiUrl || '').trim();
        const apiMethod = (localConfig.value.apiMethod || 'GET').toUpperCase() as ApiMethod;
        const apiPath = (localConfig.value.apiResponsePath || '').trim();

        if (!apiUrl) {
            versaAlert({
                type: 'warning',
                title: 'URL requerida',
                message: 'Debes ingresar una URL para probar la API.',
            });
            return;
        }

        isApiProbeLoading.value = true;
        apiProbeError.value = '';
        apiProbePreview.value = '';
        apiProbePaths.value = [];
        apiProbePathNotFound.value = false;

        try {
            const requestHeaders: Record<string, string> = {
                ...localConfig.value.apiHeaders,
            };

            const requestConfig: VersaParamsFetch = {
                url: `/${panelUrl}/chatbot/flowBuilder/api/proxyExternalApi/${empresaSelected}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            let rawBody = '';

            if (apiMethod !== 'GET') {
                if (!requestHeaders['Content-Type']) {
                    requestHeaders['Content-Type'] = 'application/json';
                }

                rawBody = (localConfig.value.apiBody || '').trim();
                if (rawBody) {
                    JSON.parse(rawBody);
                }
            }

            requestConfig.data = JSON.stringify({
                url: apiUrl,
                method: apiMethod,
                headers: requestHeaders,
                body: rawBody,
                csrf_token: csrf_token.value,
            });

            const response: ApiProxyResponse = await versaFetch(requestConfig);
            const isProxySuccess = response.success === 1 || response.success === true;
            if (!isProxySuccess) {
                throw new Error(response.message || 'No fue posible probar la API.');
            }

            const rawPayload = response.payload;
            const selectedPayload = apiPath ? getValueByPath(rawPayload, apiPath) : rawPayload;

            if (apiPath && selectedPayload === undefined) {
                apiProbePathNotFound.value = true;
                apiProbeError.value = `La ruta JSON "${apiPath}" no existe en la respuesta.`;
                apiProbePreview.value = JSON.stringify(rawPayload ?? null, null, 2);
                const fallbackCollector = new Set<string>();
                collectProbePaths({
                    source: rawPayload,
                    basePath: apiVariableBase.value,
                    depth: 0,
                    collector: fallbackCollector,
                });
                apiProbePaths.value = [...fallbackCollector];
                return;
            }

            apiProbePreview.value = JSON.stringify(selectedPayload ?? null, null, 2);

            const collector = new Set<string>();
            collectProbePaths({
                source: selectedPayload,
                basePath: apiVariableBase.value,
                depth: 0,
                collector,
            });
            apiProbePaths.value = [...collector];

            if (apiProbePaths.value.length === 0) {
                apiProbePaths.value = [apiVariableBase.value];
            }
        } catch (error) {
            apiProbeError.value = error instanceof Error ? error.message : 'No fue posible probar la API.';
        } finally {
            isApiProbeLoading.value = false;
        }
    };

    // Guardar cambios
    const handleSave = () => {
        if (!props.selectedNode) {
            return;
        }

        if (props.selectedNode.type === 'question' && localConfig.value.expectedAnswer === 'regex') {
            if (!regexValidationState.value || !regexValidationState.value.valid) {
                versaAlert({
                    type: 'warning',
                    title: 'Regex inválido',
                    message: 'Corrige el patrón regex antes de guardar el nodo pregunta.',
                });
                return;
            }
        }

        let nextOutputs = props.selectedNode.outputs;
        let nextInputs = props.selectedNode.inputs;

        if (props.selectedNode.type === 'api_call') {
            nextOutputs = 2;
        }

        if (props.selectedNode.type.startsWith('ai_tool_')) {
            nextOutputs = 1;
        }

        if (props.selectedNode.type === 'condition') {
            const conditionCount = localConfig.value.conditions?.length || 0;
            nextOutputs = Math.max(conditionCount + 1, 1);
        }

        if (props.selectedNode.type === 'router') {
            const caseCount = localConfig.value.routerCases?.length || 0;
            nextOutputs = Math.max(caseCount + 1, 2);
        }

        if (props.selectedNode.type === 'menu') {
            const optionCount = localConfig.value.menuOptions?.length || 0;
            const singleOutput = localConfig.value.menuSingleOutput === true;
            nextOutputs = singleOutput ? 1 : Math.max(optionCount, 1);
            localConfig.value.menuSingleOutput = singleOutput;
        }

        if (props.selectedNode.type === 'parallel') {
            const branches = localConfig.value.parallelBranches || 3;
            nextOutputs = Math.max(2, Math.min(10, branches));
        }

        if (props.selectedNode.type === 'merge') {
            nextOutputs = 1;
            const expectedInputs = localConfig.value.mergeExpectedInputs || 2;
            nextInputs = Math.max(2, Math.min(10, expectedInputs));
        }

        if (props.selectedNode.type === 'loop') {
            nextOutputs = 2;
        }

        if (props.selectedNode.type === 'cache') {
            nextOutputs = 2;
        }

        if (props.selectedNode.type === 'error_handler') {
            nextOutputs = 2;
        }

        if (props.selectedNode.type === 'ai_agent') {
            nextOutputs = 2;
        }

        if (props.selectedNode.type === 'json_menu') {
            const singleOutput = localConfig.value.jsonMenuSingleOutput === true;
            const maxItems = localConfig.value.jsonMenuMaxItems || 10;
            nextOutputs = singleOutput ? 1 : Math.min(maxItems, 10);
            localConfig.value.jsonMenuSingleOutput = singleOutput;
        }

        emit('updateNode', props.selectedNode.id, {
            type: props.selectedNode.type,
            label: localLabel.value,
            config: localConfig.value,
            inputs: nextInputs,
            outputs: nextOutputs,
        });
        emit('close');
    };

    // Cerrar panel
    const handleClose = () => {
        emit('close');
    };

    const currentMessageType = computed<MediaType>(() => {
        const type = localConfig.value.messageType;
        if (type === 'image' || type === 'video' || type === 'audio' || type === 'file') {
            return type;
        }

        return 'file';
    });

    const openMediaStoreModal = () => {
        if (!localConfig.value.messageType || localConfig.value.messageType === 'text') {
            versaAlert({
                type: 'warning',
                title: 'Selecciona un tipo multimedia',
                message: 'Para usar la biblioteca, primero selecciona imagen, video, audio o archivo.',
            });
            return;
        }

        showMediaStoreModal.value = true;
    };

    const handleMediaSelected = (asset: ChatbotMediaAsset) => {
        localConfig.value.messageType = asset.media_type;
        localConfig.value.messageMediaUrl = asset.public_url;
        localConfig.value.messageFileName = asset.original_name;
        localConfig.value.mediaAssetId = asset.id;
    };

    // Opciones para selectores
    const messageTypes = [
        { value: 'text', label: 'Texto' },
        { value: 'image', label: 'Imagen' },
        { value: 'video', label: 'Video' },
        { value: 'audio', label: 'Audio' },
        { value: 'file', label: 'Archivo' },
    ];

    const messageChannelTargets = [
        { value: 'generic', label: 'Genérico (multicanal)' },
        { value: 'whatsapp', label: 'WhatsApp' },
    ];

    const messageChannelTypes = [
        { value: 'standard', label: 'Estándar' },
        { value: 'interactive_buttons', label: 'Interactivo: botones' },
        { value: 'interactive_list', label: 'Interactivo: lista' },
        { value: 'template', label: 'Plantilla WhatsApp' },
    ];

    const menuRenderModes = [
        { value: 'generic', label: 'Menú genérico (texto)' },
        { value: 'whatsapp_buttons', label: 'WhatsApp: botones' },
        { value: 'whatsapp_list', label: 'WhatsApp: lista' },
    ];

    const templateButtonTypes: { value: WhatsAppTemplateButtonConfig['type']; label: string }[] = [
        { value: 'quick_reply', label: 'Respuesta rápida' },
        { value: 'url', label: 'URL' },
    ];

    const answerTypes = [
        { value: 'text', label: 'Texto' },
        { value: 'number', label: 'Número' },
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Teléfono' },
        { value: 'url', label: 'URL' },
        { value: 'date', label: 'Fecha (YYYY-MM-DD)' },
        { value: 'regex', label: 'Regex personalizada' },
    ];

    const apiMethods = [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'DELETE', label: 'DELETE' },
    ];

    const apiResponseFormats = [
        { value: 'json', label: 'JSON' },
        { value: 'text', label: 'Texto' },
        { value: 'number', label: 'Número' },
        { value: 'boolean', label: 'Booleano' },
    ];

    const toolTextOperations = [
        { value: 'trim', label: 'Trim' },
        { value: 'lower', label: 'Minúsculas' },
        { value: 'upper', label: 'Mayúsculas' },
        { value: 'slug', label: 'Slug' },
    ];

    const delayUnits = [
        { value: 'seconds', label: 'Segundos' },
        { value: 'minutes', label: 'Minutos' },
        { value: 'hours', label: 'Horas' },
    ];

    const aiProviders = [
        { value: 'openai', label: 'OpenAI' },
        { value: 'anthropic', label: 'Anthropic' },
        { value: 'google', label: 'Google (Gemini)' },
        { value: 'groq', label: 'Groq' },
        { value: 'mistral', label: 'Mistral' },
        { value: 'other', label: 'Otro (Custom)' },
    ];

    const aiMemorySources = [
        { value: 'session', label: 'Sesión Actual (Chat)' },
        { value: 'database', label: 'Base de Datos (Historial Largo)' },
        { value: 'manual', label: 'Solo Prompt (Manual/Sin memoria)' },
    ];

    const variableOperations = [
        { value: 'set', label: 'Establecer' },
        { value: 'get', label: 'Obtener' },
        { value: 'increment', label: 'Incrementar' },
        { value: 'decrement', label: 'Decrementar' },
    ];

    const updateParallelOutputs = () => {
        if (!props.selectedNode) {
            return;
        }
        const branches = localConfig.value.parallelBranches || 3;
        const nextOutputs = Math.max(2, Math.min(10, branches));
        emit('updateNode', props.selectedNode.id, {
            config: localConfig.value,
            outputs: nextOutputs,
        });
    };

    // Agregar opción de menú
    const addMenuOption = () => {
        if (!localConfig.value.menuOptions) {
            localConfig.value.menuOptions = [];
        }
        localConfig.value.menuOptions.push({
            id: `option_${Date.now()}`,
            label: '',
            value: '',
            description: '',
        });
    };

    // Eliminar opción de menú
    const removeMenuOption = (index: number) => {
        if (localConfig.value.menuOptions) {
            localConfig.value.menuOptions.splice(index, 1);
        }
    };

    const makeUniqueId = (prefix: string): string =>
        `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const addInteractiveButton = () => {
        if (!localConfig.value.interactiveButtons) {
            localConfig.value.interactiveButtons = [];
        }

        localConfig.value.interactiveButtons.push({
            id: makeUniqueId('btn'),
            title: '',
        });
    };

    const removeInteractiveButton = (index: number) => {
        if (!localConfig.value.interactiveButtons) {
            return;
        }

        localConfig.value.interactiveButtons.splice(index, 1);
    };

    const addInteractiveListSection = () => {
        if (!localConfig.value.interactiveListSections) {
            localConfig.value.interactiveListSections = [];
        }

        localConfig.value.interactiveListSections.push({
            title: '',
            rows: [],
        });
    };

    const removeInteractiveListSection = (index: number) => {
        if (!localConfig.value.interactiveListSections) {
            return;
        }

        localConfig.value.interactiveListSections.splice(index, 1);
    };

    const addInteractiveListRow = (sectionIndex: number) => {
        if (!localConfig.value.interactiveListSections?.[sectionIndex]) {
            return;
        }

        const row: InteractiveListRowConfig = {
            id: makeUniqueId('row'),
            title: '',
            description: '',
        };

        localConfig.value.interactiveListSections[sectionIndex].rows.push(row);
    };

    const removeInteractiveListRow = (sectionIndex: number, rowIndex: number) => {
        if (!localConfig.value.interactiveListSections?.[sectionIndex]) {
            return;
        }

        localConfig.value.interactiveListSections[sectionIndex].rows.splice(rowIndex, 1);
    };

    const addTemplateParam = () => {
        if (!localConfig.value.templateParams) {
            localConfig.value.templateParams = [];
        }

        localConfig.value.templateParams.push({
            key: '',
            value: '',
        });
    };

    const removeTemplateParam = (index: number) => {
        if (!localConfig.value.templateParams) {
            return;
        }

        localConfig.value.templateParams.splice(index, 1);
    };

    const addTemplateButton = () => {
        if (!localConfig.value.templateButtons) {
            localConfig.value.templateButtons = [];
        }

        localConfig.value.templateButtons.push({
            type: 'quick_reply',
            text: '',
            payload: '',
            url: '',
        });
    };

    const removeTemplateButton = (index: number) => {
        if (!localConfig.value.templateButtons) {
            return;
        }

        localConfig.value.templateButtons.splice(index, 1);
    };

    const addAIActionTooling = () => {
        if (!localConfig.value.aiToolings) {
            localConfig.value.aiToolings = [];
        }
        localConfig.value.aiToolings.push({
            name: '',
            description: '',
            parameters: '{}',
        });
    };

    const removeAIActionTooling = (index: number) => {
        if (localConfig.value.aiToolings) {
            localConfig.value.aiToolings.splice(index, 1);
        }
    };

    // Cargar flujos disponibles desde la API
    const loadAvailableFlows = async () => {
        if (flowsLoaded.value) {
            return; // Ya se cargaron
        }

        loadingFlows.value = true;
        try {
            const externalFilters = encodeURIComponent("cf.status != 'archived'");
            const response: VersaFetchResponse = await versaFetch({
                url: `/${panelUrl}/chatbot/flowBuilder/api/getFlow/${empresaSelected}?per_page=100000&externalFilters=${externalFilters}`,
                method: 'GET',
            });

            if (response.success === 1 && response.data) {
                availableFlows.value = response.data;
                flowsLoaded.value = true;
            }
        } catch {
            versaAlert({
                type: 'error',
                title: 'Error al cargar flujos',
                message: 'No fue posible obtener los flujos disponibles. Intenta nuevamente.',
            });
        } finally {
            loadingFlows.value = false;
        }
    };

    // Manejar selección de flujo
    const handleFlowSelection = (flowId: number) => {
        const selectedFlow = availableFlows.value.find(f => f.id === flowId);
        if (selectedFlow) {
            localConfig.value.linkedFlowId = flowId;
            localConfig.value.linkedFlowName = selectedFlow.description;
            localConfig.value.linkedFlowDescription = selectedFlow.description;

            // Guardar automáticamente al seleccionar un flujo
            handleSave();
        }
    };

    // Sincronizar con el nodo seleccionado
    watch(
        () => props.selectedNode,
        newNode => {
            if (newNode) {
                localConfig.value = { ...newNode.config };
                localLabel.value = newNode.label;

                if (newNode.type === 'message' && !localConfig.value.messageType) {
                    localConfig.value.messageType = 'text';
                }

                if (newNode.type === 'message' && !localConfig.value.messageChannelTarget) {
                    localConfig.value.messageChannelTarget = 'generic';
                }

                if (newNode.type === 'message' && !localConfig.value.messageChannelType) {
                    localConfig.value.messageChannelType = 'standard';
                }

                if (newNode.type === 'question' && !localConfig.value.expectedAnswer) {
                    localConfig.value.expectedAnswer = 'text';
                }

                if (newNode.type === 'api_call') {
                    if (!localConfig.value.apiMethod) {
                        localConfig.value.apiMethod = 'GET';
                    }

                    if (!localConfig.value.apiResponseFormat) {
                        localConfig.value.apiResponseFormat = 'json';
                    }

                    apiProbeError.value = '';
                    apiProbePreview.value = '';
                    apiProbePaths.value = [];
                    apiProbePathNotFound.value = false;
                }

                if ((newNode.type === 'send_to' || newNode.label === 'Enviar a') && !localConfig.value.messageType) {
                    localConfig.value.messageType = 'text';
                }

                if (newNode.type === 'webhook' && !localConfig.value.webhookPayloadVariable) {
                    localConfig.value.webhookPayloadVariable = 'webhook_payload';
                }

                if (newNode.type === 'menu') {
                    if (!localConfig.value.menuRenderMode) {
                        localConfig.value.menuRenderMode = 'generic';
                    }
                    if (localConfig.value.menuSingleOutput === undefined) {
                        localConfig.value.menuSingleOutput = false;
                    }
                }

                // Resetear y cargar flujos si es un nodo de tipo flow
                if (newNode.type === 'flow') {
                    flowsLoaded.value = false; // Resetear para recargar
                    loadAvailableFlows();
                }

                if (newNode.type === 'ai_agent') {
                    if (!localConfig.value.aiProvider) {
                        localConfig.value.aiProvider = 'openai';
                    }
                    if (localConfig.value.aiTemperature === undefined) {
                        localConfig.value.aiTemperature = 0.7;
                    }
                    if (localConfig.value.aiMaxTokens === undefined) {
                        localConfig.value.aiMaxTokens = 1000;
                    }
                    if (localConfig.value.aiMemoryEnabled === undefined) {
                        localConfig.value.aiMemoryEnabled = true;
                    }
                    if (!localConfig.value.aiMemorySource) {
                        localConfig.value.aiMemorySource = 'session';
                    }
                    if (localConfig.value.aiMemorySessionLimit === undefined) {
                        localConfig.value.aiMemorySessionLimit = 10;
                    }
                    if (!localConfig.value.aiResponseVariable) {
                        localConfig.value.aiResponseVariable = 'ai_response';
                    }
                }

                if (newNode.type === 'router') {
                    if (!localConfig.value.routerVariable) {
                        localConfig.value.routerVariable = '';
                    }
                    if (!localConfig.value.routerCases) {
                        localConfig.value.routerCases = [];
                    }
                }

                if (newNode.type === 'error_handler') {
                    if (localConfig.value.errorHandlerEnabled === undefined) {
                        localConfig.value.errorHandlerEnabled = true;
                    }
                    if (localConfig.value.errorHandlerCatchAll === undefined) {
                        localConfig.value.errorHandlerCatchAll = false;
                    }
                    if (localConfig.value.errorHandlerRetryCount === undefined) {
                        localConfig.value.errorHandlerRetryCount = 0;
                    }
                    if (localConfig.value.errorHandlerRetryDelay === undefined) {
                        localConfig.value.errorHandlerRetryDelay = 1000;
                    }
                }

                if (newNode.type === 'loop') {
                    if (!localConfig.value.loopMode) {
                        localConfig.value.loopMode = 'foreach';
                    }
                    if (localConfig.value.loopMaxIterations === undefined) {
                        localConfig.value.loopMaxIterations = 100;
                    }
                    if (localConfig.value.loopDelayMs === undefined) {
                        localConfig.value.loopDelayMs = 0;
                    }
                    if (localConfig.value.loopAccumulateResults === undefined) {
                        localConfig.value.loopAccumulateResults = false;
                    }
                }

                if (newNode.type === 'parallel') {
                    if (localConfig.value.parallelBranches === undefined) {
                        localConfig.value.parallelBranches = 3;
                    }
                    if (localConfig.value.parallelTimeout === undefined) {
                        localConfig.value.parallelTimeout = 30000;
                    }
                    if (localConfig.value.parallelFailFast === undefined) {
                        localConfig.value.parallelFailFast = false;
                    }
                    if (localConfig.value.parallelContinueOnError === undefined) {
                        localConfig.value.parallelContinueOnError = false;
                    }
                }

                if (newNode.type === 'cache') {
                    if (localConfig.value.cacheEnabled === undefined) {
                        localConfig.value.cacheEnabled = true;
                    }
                    if (!localConfig.value.cacheKey) {
                        localConfig.value.cacheKey = '';
                    }
                    if (localConfig.value.cacheTtlSeconds === undefined) {
                        localConfig.value.cacheTtlSeconds = 3600;
                    }
                    if (!localConfig.value.cacheInvalidateOn) {
                        localConfig.value.cacheInvalidateOn = 'time';
                    }
                }

                if (newNode.type === 'merge') {
                    if (!localConfig.value.mergeMode) {
                        localConfig.value.mergeMode = 'wait_all';
                    }
                    if (localConfig.value.mergeExpectedInputs === undefined) {
                        localConfig.value.mergeExpectedInputs = 2;
                    }
                    if (localConfig.value.mergeTimeout === undefined) {
                        localConfig.value.mergeTimeout = 30000;
                    }
                }

                if (newNode.type === 'json_menu') {
                    if (!localConfig.value.jsonMenuSourceVariable) {
                        localConfig.value.jsonMenuSourceVariable = '';
                    }
                    if (!localConfig.value.jsonMenuPath) {
                        localConfig.value.jsonMenuPath = '';
                    }
                    if (!localConfig.value.jsonMenuLabelField) {
                        localConfig.value.jsonMenuLabelField = 'name';
                    }
                    if (!localConfig.value.jsonMenuLabelTemplate) {
                        localConfig.value.jsonMenuLabelTemplate = '';
                    }
                    if (!localConfig.value.jsonMenuValueField) {
                        localConfig.value.jsonMenuValueField = 'id';
                    }
                    if (!localConfig.value.jsonMenuDescriptionField) {
                        localConfig.value.jsonMenuDescriptionField = '';
                    }
                    if (!localConfig.value.jsonMenuDescriptionTemplate) {
                        localConfig.value.jsonMenuDescriptionTemplate = '';
                    }
                    if (!localConfig.value.jsonMenuOutputVariable) {
                        localConfig.value.jsonMenuOutputVariable = 'selected_item';
                    }
                    if (!localConfig.value.jsonMenuTitle) {
                        localConfig.value.jsonMenuTitle = 'Selecciona una opción:';
                    }
                    if (!localConfig.value.jsonMenuRenderMode) {
                        localConfig.value.jsonMenuRenderMode = 'generic';
                    }
                    if (localConfig.value.jsonMenuSingleOutput === undefined) {
                        localConfig.value.jsonMenuSingleOutput = true;
                    }
                    if (localConfig.value.jsonMenuMaxItems === undefined) {
                        localConfig.value.jsonMenuMaxItems = 10;
                    }
                    if (localConfig.value.jsonMenuUseTemplate === undefined) {
                        localConfig.value.jsonMenuUseTemplate = false;
                    }
                    if (!localConfig.value.jsonMenuTemplateLanguage) {
                        localConfig.value.jsonMenuTemplateLanguage = 'es';
                    }
                    if (!localConfig.value.templateParams) {
                        localConfig.value.templateParams = [];
                    }
                }

                if (newNode.type === 'ai_tool_http') {
                    if (!localConfig.value.httpAuthType) {
                        localConfig.value.httpAuthType = 'none';
                    }
                    if (localConfig.value.httpTimeout === undefined) {
                        localConfig.value.httpTimeout = 30000;
                    }
                    if (!localConfig.value.apiMethod) {
                        localConfig.value.apiMethod = 'GET';
                    }
                }

                if (newNode.type.startsWith('ai_tool_')) {
                    if (!localConfig.value.toolName) {
                        localConfig.value.toolName = newNode.label.replaceAll(' ', '_').toLowerCase();
                    }
                    if (!localConfig.value.toolDescription) {
                        const def = getNodeDefinition(newNode.type);
                        localConfig.value.toolDescription = def?.description || '';
                    }

                    if (newNode.type === 'ai_tool_variable') {
                        if (!localConfig.value.variableOperation) {
                            localConfig.value.variableOperation = 'get';
                        }
                    }

                    if (newNode.type === 'ai_tool_json_extract') {
                        if (!localConfig.value.toolInputVariable) {
                            localConfig.value.toolInputVariable = '';
                        }
                        if (!localConfig.value.toolPath) {
                            localConfig.value.toolPath = '';
                        }
                    }

                    if (newNode.type === 'ai_tool_template_render') {
                        if (!localConfig.value.toolTemplate) {
                            localConfig.value.toolTemplate = 'Hola {{ user.name }}';
                        }
                    }

                    if (newNode.type === 'ai_tool_condition_eval') {
                        if (!localConfig.value.toolPath) {
                            localConfig.value.toolPath = '';
                        }
                        if (!localConfig.value.variableValue) {
                            localConfig.value.variableValue = '';
                        }
                    }

                    if (newNode.type === 'ai_tool_datetime') {
                        if (!localConfig.value.toolTimezone) {
                            localConfig.value.toolTimezone = 'America/Santiago';
                        }
                        if (!localConfig.value.toolDateFormat) {
                            localConfig.value.toolDateFormat = 'iso';
                        }
                    }

                    if (newNode.type === 'ai_tool_text_utils') {
                        if (!localConfig.value.toolTextOperation) {
                            localConfig.value.toolTextOperation = 'trim';
                        }
                    }
                }
            }
        },
        { immediate: true },
    );

    watch(
        () => localConfig.value.messageType,
        newType => {
            if (newType === 'text') {
                localConfig.value.messageMediaUrl = '';
                localConfig.value.messageFileName = '';
                localConfig.value.mediaAssetId = undefined;
            }
        },
    );

    watch(
        () => localConfig.value.messageChannelType,
        channelType => {
            if (!channelType || channelType === 'standard') {
                return;
            }

            localConfig.value.messageType = 'text';
            localConfig.value.messageMediaUrl = '';
            localConfig.value.messageFileName = '';
            localConfig.value.mediaAssetId = undefined;

            if (channelType === 'interactive_buttons' && !localConfig.value.interactiveButtons) {
                localConfig.value.interactiveButtons = [];
            }

            if (channelType === 'interactive_list') {
                if (!localConfig.value.interactiveListSections) {
                    localConfig.value.interactiveListSections = [];
                }
                if (!localConfig.value.interactiveListButtonText) {
                    localConfig.value.interactiveListButtonText = 'Ver opciones';
                }
            }

            if (channelType === 'template') {
                if (!localConfig.value.templateLanguage) {
                    localConfig.value.templateLanguage = 'es';
                }
                if (!localConfig.value.templateParams) {
                    localConfig.value.templateParams = [];
                }
                if (!localConfig.value.templateButtons) {
                    localConfig.value.templateButtons = [];
                }
            }
        },
    );

    watch(
        () => [localConfig.value.menuSingleOutput, localConfig.value.menuOptions?.length],
        () => {
            if (props.selectedNode?.type === 'menu') {
                const singleOutput = localConfig.value.menuSingleOutput === true;
                const optionCount = localConfig.value.menuOptions?.length || 0;
                const nextOutputs = singleOutput ? 1 : Math.max(optionCount, 1);

                if (props.selectedNode.outputs !== nextOutputs) {
                    emit('updateNode', props.selectedNode.id, {
                        config: { ...localConfig.value, menuSingleOutput: singleOutput },
                        outputs: nextOutputs,
                    });
                }
            }
        },
    );

    watch(
        () => [localConfig.value.jsonMenuSingleOutput, localConfig.value.jsonMenuMaxItems],
        () => {
            if (props.selectedNode?.type === 'json_menu') {
                const singleOutput = localConfig.value.jsonMenuSingleOutput === true;
                const maxItems = localConfig.value.jsonMenuMaxItems || 10;
                const nextOutputs = singleOutput ? 1 : Math.min(maxItems, 10);

                if (props.selectedNode.outputs !== nextOutputs) {
                    emit('updateNode', props.selectedNode.id, {
                        config: { ...localConfig.value, jsonMenuSingleOutput: singleOutput },
                        outputs: nextOutputs,
                    });
                }
            }
        },
    );
    const nodeEnvironment = computed(() => ({
        panelUrl,
        empresaSelected,
        csrf_token: csrf_token.value,
        availableFlows: availableFlows.value,
        loadingFlows: loadingFlows.value,
        loadAvailableFlows,
        aiProviders: [
            { value: 'openai', label: 'OpenAI' },
            { value: 'anthropic', label: 'Anthropic' },
            { value: 'google', label: 'Google (Gemini)' },
            { value: 'groq', label: 'Groq' },
            { value: 'mistral', label: 'Mistral' },
            { value: 'other', label: 'Otro (Custom)' },
        ],
    }));

    const handleEditorUpdateNode = (id: string, data: Partial<FlowNode>) => {
        emit('updateNode', id, data);
    };
</script>

<template>
    <div>
        <!-- Backdrop en modo zen -->
        <Transition name="fade">
            <div v-if="isZenMode" class="fixed inset-0 z-[10000]" @click="handleClose"></div>
        </Transition>

        <Transition :name="isZenMode ? 'slide-right' : ''">
            <div
                class="node-editor relative flex flex-col bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                :class="
                    isZenMode
                        ? 'fixed top-0 right-0 z-[10001] h-full shadow-2xl border-l-2'
                        : 'h-full border-l flex-shrink-0 ml-auto'
                "
                :style="{ width: props.width }">
                <!-- Resizer handle (arrastrar hacia la izquierda) - disponible también en Zen -->
                <div
                    @mousedown.prevent="startResize"
                    @touchstart.prevent="startResize"
                    class="absolute left-0 top-0 h-full w-3 -ml-3 cursor-col-resize z-50"
                    title="Redimensionar panel"></div>
                <!-- Header -->
                <div
                    class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <div class="flex items-center gap-2">
                        <div
                            v-if="nodeDefinition"
                            v-html="nodeDefinition.icon"
                            class="text-gray-600 dark:text-gray-400"></div>
                        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
                            {{ selectedNode ? 'Editar Nodo' : 'Sin Selección' }}
                        </h2>
                    </div>
                    <button
                        @click="handleClose"
                        class="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                        title="Cerrar panel">
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
                                d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Repite el Footer con botones -->
                <div
                    v-if="selectedNode && !isZenMode"
                    class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex gap-2">
                    <button
                        @click="handleSave"
                        class="flex-1 px-4 py-2 text-sm font-medium bg-brand hover:bg-brand dark:bg-brand dark:hover:bg-brand-600 text-white rounded-lg transition-colors">
                        Guardar Cambios
                    </button>
                    <button
                        @click="handleClose"
                        class="px-4 py-2 text-sm font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors">
                        Cerrar
                    </button>
                </div>

                <!-- Contenido -->
                <div v-if="selectedNode" class="flex-1 overflow-y-auto p-4 space-y-4">
                    <!-- Información del Nodo -->
                    <div
                        v-if="nodeDefinition"
                        :class="nodeDefinition.color"
                        class="p-3 rounded-lg text-white flex items-start gap-3">
                        <div v-html="nodeDefinition.icon"></div>
                        <div>
                            <h3 class="font-semibold text-sm mb-1">{{ nodeDefinition.label }}</h3>
                            <p class="text-xs opacity-90">{{ nodeDefinition.description }}</p>
                        </div>
                    </div>

                    <!-- Campo: Etiqueta del Nodo -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Etiqueta del Nodo
                        </label>
                        <input
                            v-model="localLabel"
                            type="text"
                            placeholder="Nombre del nodo"
                            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
                    </div>

                    <!-- Configuración según tipo de nodo -->

                    <!-- Configuración dinámica desde el registro de nodos -->
                    <component
                        v-if="modularEditor"
                        :is="modularEditor"
                        v-model="localConfig"
                        :node="selectedNode"
                        :env="nodeEnvironment"
                        @openMediaStore="openMediaStoreModal"
                        @updateNode="handleEditorUpdateNode" />

                    <!-- Nodos restantes (se migrarán gradualmente) -->

                    <!-- NODO: Pregunta (Migrado a Módulo) -->

                    <!-- NODO: Menú -->
                    <!-- NODO: Menú (MIGRADO) -->
                    <template v-if="false && selectedNode.type === 'menu'">
                        <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                Configuración del Menú
                            </h4>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Modo de render
                            </label>
                            <select
                                v-model="localConfig.menuRenderMode"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent">
                                <option v-for="mode in menuRenderModes" :key="mode.value" :value="mode.value">
                                    {{ mode.label }}
                                </option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Título del Menú
                            </label>
                            <input
                                v-model="localConfig.menuTitle"
                                type="text"
                                placeholder="Selecciona una opción:"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
                        </div>
                        <div class="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="menuSingleOutput"
                                v-model="localConfig.menuSingleOutput"
                                class="w-4 h-4 text-brand bg-gray-100 border-gray-300 rounded focus:ring-brand dark:focus:ring-brand dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                            <label for="menuSingleOutput" class="text-sm text-gray-700 dark:text-gray-300">
                                Salida única (usar Router para derivar)
                            </label>
                        </div>
                        <div
                            v-if="localConfig.menuSingleOutput"
                            class="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                            El valor seleccionado se guardará en la variable y saldrá por un único puerto. Usa un nodo
                            Router después para derivar el flujo.
                        </div>
                        <div
                            v-else
                            class="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                            Cada opción tendrá su propio puerto de salida. Conecta cada puerto al flujo correspondiente.
                        </div>
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Opciones
                                </label>
                                <button
                                    @click="addMenuOption"
                                    class="px-2 py-1 text-xs font-medium text-brand dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded transition-colors flex items-center gap-1">
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
                                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                    </svg>
                                    Agregar Opción
                                </button>
                            </div>
                            <div class="space-y-2">
                                <div
                                    v-for="(option, index) in localConfig.menuOptions"
                                    :key="option.id || index"
                                    class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div class="space-y-2">
                                        <div class="flex items-center justify-between mb-1">
                                            <span class="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                Opción {{ Number(index) + 1 }}
                                            </span>
                                            <button
                                                @click="removeMenuOption(index)"
                                                class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
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
                                            </button>
                                        </div>
                                        <input
                                            v-model="option.label"
                                            type="text"
                                            placeholder="Etiqueta (ej: Opción 1)"
                                            class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
                                        <input
                                            v-model="option.value"
                                            type="text"
                                            placeholder="Valor (ej: option1)"
                                            class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
                                        <textarea
                                            v-model="option.description"
                                            rows="2"
                                            placeholder="Descripción (opcional)"
                                            class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"></textarea>
                                    </div>
                                </div>
                                <div
                                    v-if="!localConfig.menuOptions || localConfig.menuOptions.length === 0"
                                    class="p-4 text-center text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                    No hay opciones. Haz clic en "Agregar Opción" para comenzar.
                                </div>
                            </div>
                        </div>
                    </template>

                    <!-- CONFIGURACIÓN COMÚN PARA TODAS LAS AI TOOLS -->
                    <template v-if="false && selectedNode.type.startsWith('ai_tool_')">
                        <div class="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
                            <h4
                                class="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                </svg>
                                Definición de Herramienta para IA
                            </h4>
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Nombre de la herramienta (para la IA)
                                    </label>
                                    <input
                                        v-model="localConfig.toolName"
                                        type="text"
                                        placeholder="ej: obtener_precio_cripto"
                                        class="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                                </div>
                                <div>
                                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Descripción (instrucción para la IA)
                                    </label>
                                    <textarea
                                        v-model="localConfig.toolDescription"
                                        rows="2"
                                        placeholder="Describe para qué sirve esta herramienta..."
                                        class="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"></textarea>
                                </div>
                            </div>
                        </div>
                    </template>

                    <!-- NODO: AI_TOOL_VARIABLE -->
                    <template v-if="false && selectedNode.type === 'ai_tool_variable'">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Operación por defecto
                            </label>
                            <select
                                v-model="localConfig.variableOperation"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand">
                                <option value="get">Obtener Variable</option>
                                <option value="set">Establecer Variable</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nombre de Variable (estático o sugerencia)
                            </label>
                            <input
                                v-model="localConfig.variableName"
                                type="text"
                                placeholder="nombre_variable"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div
                            class="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg text-xs text-purple-700 dark:text-purple-300">
                            Esta herramienta permite que la IA consulte o modifique variables del flujo dinámicamente.
                        </div>
                    </template>

                    <!-- NODO: AI_TOOL_JSON_EXTRACT -->
                    <template v-if="false && selectedNode.type === 'ai_tool_json_extract'">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Variable origen (opcional)
                            </label>
                            <input
                                v-model="localConfig.toolInputVariable"
                                type="text"
                                placeholder="api_result"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Ruta JSON por defecto
                            </label>
                            <input
                                v-model="localConfig.toolPath"
                                type="text"
                                placeholder="data.user.name"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Valor por defecto
                            </label>
                            <input
                                v-model="localConfig.toolDefaultValue"
                                type="text"
                                placeholder="N/A"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                    </template>

                    <!-- NODO: AI_TOOL_TEMPLATE_RENDER -->
                    <template v-if="false && selectedNode.type === 'ai_tool_template_render'">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Plantilla
                            </label>
                            <textarea
                                v-model="localConfig.toolTemplate"
                                rows="4"
                                placeholder="Hola {{ user.name }}"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Variable origen (opcional)
                            </label>
                            <input
                                v-model="localConfig.toolInputVariable"
                                type="text"
                                placeholder="api_result"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                    </template>

                    <!-- NODO: AI_TOOL_CONDITION_EVAL -->
                    <template v-if="false && selectedNode.type === 'ai_tool_condition_eval'">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Campo / path a evaluar
                            </label>
                            <input
                                v-model="localConfig.toolPath"
                                type="text"
                                placeholder="user.age"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Valor por defecto a comparar
                            </label>
                            <input
                                v-model="localConfig.variableValue"
                                type="text"
                                placeholder="18"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                    </template>

                    <!-- NODO: AI_TOOL_DATETIME -->
                    <template v-if="false && selectedNode.type === 'ai_tool_datetime'">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Timezone por defecto
                            </label>
                            <input
                                v-model="localConfig.toolTimezone"
                                type="text"
                                placeholder="America/Santiago"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Formato por defecto
                            </label>
                            <input
                                v-model="localConfig.toolDateFormat"
                                type="text"
                                placeholder="iso"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                    </template>

                    <!-- NODO: AI_TOOL_TEXT_UTILS -->
                    <template v-if="false && selectedNode.type === 'ai_tool_text_utils'">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Operación por defecto
                            </label>
                            <select
                                v-model="localConfig.toolTextOperation"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand">
                                <option v-for="op in toolTextOperations" :key="op.value" :value="op.value">
                                    {{ op.label }}
                                </option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Texto base (fallback)
                            </label>
                            <textarea
                                v-model="localConfig.variableValue"
                                rows="3"
                                placeholder="Texto de entrada"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"></textarea>
                        </div>
                    </template>

                    <!-- NODO: Webhook -->
                    <!-- NODO: Webhook (MIGRADO) -->
                    <template v-if="false && selectedNode.type === 'webhook'">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nombre del evento (opcional)
                            </label>
                            <input
                                v-model="localConfig.webhookEventName"
                                type="text"
                                placeholder="nuevo_pago"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Variable para payload
                            </label>
                            <input
                                v-model="localConfig.webhookPayloadVariable"
                                type="text"
                                placeholder="webhook_payload"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
                        </div>

                        <div
                            class="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 rounded-lg text-sm text-rose-700 dark:text-rose-300">
                            Este nodo espera un payload JSON de webhook, lo guarda en la variable indicada y luego
                            continúa por su salida principal.
                        </div>
                    </template>

                    <!-- NODO: Agente de IA -->
                    <template v-if="false && selectedNode.type === 'ai_agent'">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Proveedor de IA
                            </label>
                            <select
                                v-model="localConfig.aiProvider"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent">
                                <option v-for="provider in aiProviders" :key="provider.value" :value="provider.value">
                                    {{ provider.label }}
                                </option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                API Key personalizada
                            </label>
                            <input
                                v-model="localConfig.aiApiKey"
                                type="password"
                                placeholder="sk-..."
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Modelo
                            </label>
                            <input
                                v-model="localConfig.aiModel"
                                type="text"
                                placeholder="gpt-4o, claude-3-sonnet, gemini-1.5-pro..."
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Prompt / Instrucciones del Sistema
                            </label>
                            <textarea
                                v-model="localConfig.aiPrompt"
                                rows="6"
                                placeholder="Eres un asistente útil que..."
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent resize-none font-sans"></textarea>
                        </div>

                        <div
                            class="p-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg">
                            <div class="flex items-start gap-2">
                                <i class="bi bi-info-circle text-brand mt-0.5"></i>
                                <div class="text-xs text-brand-800 dark:text-brand-300">
                                    <span class="font-bold">Conexión de Herramientas:</span>
                                    Puedes conectar otros nodos (como API, Mensaje, etc) al puerto
                                    <span class="font-bold text-indigo-600 dark:text-indigo-400">TOOL</span>
                                    de este agente en el canvas para usarlos como herramientas automáticas.
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Temperatura
                                </label>
                                <input
                                    v-model.number="localConfig.aiTemperature"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="2"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Max Tokens
                                </label>
                                <input
                                    v-model.number="localConfig.aiMaxTokens"
                                    type="number"
                                    step="100"
                                    min="1"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
                            </div>
                        </div>

                        <div
                            class="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div class="flex items-center justify-between">
                                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Habilitar Memoria
                                </label>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" v-model="localConfig.aiMemoryEnabled" class="sr-only peer" />
                                    <div
                                        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/20 dark:peer-focus:ring-brand/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand"></div>
                                </label>
                            </div>
                            <div v-if="localConfig.aiMemoryEnabled" class="space-y-3 mt-2">
                                <div>
                                    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                        Fuente de Memoria
                                    </label>
                                    <select
                                        v-model="localConfig.aiMemorySource"
                                        class="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand">
                                        <option
                                            v-for="source in aiMemorySources"
                                            :key="source.value"
                                            :value="source.value">
                                            {{ source.label }}
                                        </option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                        Límite de mensajes previos
                                    </label>
                                    <input
                                        v-model.number="localConfig.aiMemorySessionLimit"
                                        type="number"
                                        min="1"
                                        max="50"
                                        class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
                                </div>
                            </div>
                        </div>

                        <div class="space-y-2">
                            <div class="flex items-center justify-between">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Toolings / Funciones (JSON)
                                </label>
                                <button
                                    type="button"
                                    @click="addAIActionTooling"
                                    class="px-2 py-1 text-xs font-medium text-brand dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded transition-colors">
                                    + Agregar herramienta
                                </button>
                            </div>
                            <p class="text-xs text-amber-600 dark:text-amber-400">
                                Modo recomendado: usa tools conectadas al puerto TOOL. Este bloque JSON es heredado y no
                                se considera en la ejecución actual del agente.
                            </p>

                            <div
                                v-for="(tool, index) in localConfig.aiToolings"
                                :key="index"
                                class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                                <input
                                    v-model="tool.name"
                                    type="text"
                                    placeholder="nombre_tool"
                                    class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono" />
                                <input
                                    v-model="tool.description"
                                    type="text"
                                    placeholder="Descripción de la herramienta..."
                                    class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />

                                <div class="space-y-1">
                                    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400">
                                        Nodo asociado (Opcional)
                                    </label>
                                    <select
                                        v-model="tool.nodeId"
                                        class="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand">
                                        <option :value="undefined">Ninguno (Solo JSON)</option>
                                        <option
                                            v-for="node in (props.allNodes || []).filter(
                                                n => n.id !== props.selectedNode?.id,
                                            )"
                                            :key="node.id"
                                            :value="node.id">
                                            {{ node.label || node.type }} ({{ node.id }})
                                        </option>
                                    </select>
                                </div>

                                <textarea
                                    v-model="tool.parameters"
                                    rows="3"
                                    placeholder='{"type": "object", "properties": {...}}'
                                    class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono resize-none"></textarea>
                                <button
                                    type="button"
                                    @click="removeAIActionTooling(index)"
                                    class="w-full px-2 py-1.5 text-xs bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded transition-colors">
                                    Eliminar herramienta
                                </button>
                            </div>
                            <div
                                v-if="!localConfig.aiToolings || localConfig.aiToolings.length === 0"
                                class="text-xs text-gray-500 dark:text-gray-400 text-center py-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                                No hay herramientas configuradas.
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Guardar respuesta en variable
                            </label>
                            <input
                                v-model="localConfig.aiResponseVariable"
                                type="text"
                                placeholder="ai_response"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
                        </div>
                    </template>

                    <!-- NODO: Delay -->
                    <!-- NODO: Retraso (MIGRADO) -->
                    <template v-if="false && selectedNode.type === 'delay'">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tiempo de Espera
                            </label>
                            <input
                                v-model.number="localConfig.delayTime"
                                type="number"
                                min="1"
                                placeholder="5"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Unidad
                            </label>
                            <select
                                v-model="localConfig.delayUnit"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent">
                                <option v-for="unit in delayUnits" :key="unit.value" :value="unit.value">
                                    {{ unit.label }}
                                </option>
                            </select>
                        </div>
                    </template>

                    <!-- NODO: Variable -->
                    <template v-if="false && selectedNode.type === 'variable'">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nombre de Variable
                            </label>
                            <input
                                v-model="localConfig.variableName"
                                type="text"
                                placeholder="nombre_variable"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Operación
                            </label>
                            <select
                                v-model="localConfig.variableOperation"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent">
                                <option v-for="op in variableOperations" :key="op.value" :value="op.value">
                                    {{ op.label }}
                                </option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor</label>
                            <input
                                v-model="localConfig.variableValue"
                                type="text"
                                placeholder="Valor de la variable"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
                        </div>
                    </template>

                    <!-- NODO: Error Handler -->
                    <!-- NODO: Error Handler (MIGRADO) -->
                    <template v-if="false && selectedNode.type === 'error_handler'">
                        <div
                            class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-xs text-red-700 dark:text-red-300 space-y-1">
                            <p class="font-semibold">Puertos de salida</p>
                            <p>
                                <span class="font-semibold">Puerto 1:</span>
                                Flujo normal (sin error)
                            </p>
                            <p>
                                <span class="font-semibold">Puerto 2:</span>
                                Manejo de error
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <input
                                type="checkbox"
                                v-model="localConfig.errorHandlerEnabled"
                                class="w-4 h-4 text-brand bg-gray-100 border-gray-300 rounded focus:ring-brand dark:focus:ring-brand dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                            <label class="text-sm text-gray-700 dark:text-gray-300">Habilitar manejo de errores</label>
                        </div>
                        <div class="flex items-center gap-2">
                            <input
                                type="checkbox"
                                v-model="localConfig.errorHandlerCatchAll"
                                class="w-4 h-4 text-brand bg-gray-100 border-gray-300 rounded focus:ring-brand dark:focus:ring-brand dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                            <label class="text-sm text-gray-700 dark:text-gray-300">
                                Capturar todos los errores (catch-all)
                            </label>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Reintentos antes de error
                            </label>
                            <input
                                v-model.number="localConfig.errorHandlerRetryCount"
                                type="number"
                                min="0"
                                max="5"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Delay entre reintentos (ms)
                            </label>
                            <input
                                v-model.number="localConfig.errorHandlerRetryDelay"
                                type="number"
                                min="100"
                                step="100"
                                placeholder="1000"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                    </template>

                    <!-- NODO: AI_TOOL_HTTP -->
                    <template v-if="false && selectedNode.type === 'ai_tool_http'">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Método HTTP
                            </label>
                            <select
                                v-model="localConfig.apiMethod"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                                <option v-for="method in apiMethods" :key="method.value" :value="method.value">
                                    {{ method.label }}
                                </option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
                            <input
                                v-model="localConfig.apiUrl"
                                type="text"
                                placeholder="https://api.ejemplo.com/endpoint"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tipo de Autenticación
                            </label>
                            <select
                                v-model="localConfig.httpAuthType"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                                <option value="none">Sin autenticación</option>
                                <option value="basic">Basic Auth</option>
                                <option value="bearer">Bearer Token</option>
                                <option value="api_key">API Key (Header)</option>
                            </select>
                        </div>
                        <template v-if="localConfig.httpAuthType && localConfig.httpAuthType !== 'none'">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {{ localConfig.httpAuthType === 'api_key' ? 'Nombre del Header' : 'Header' }}
                                </label>
                                <input
                                    v-model="localConfig.httpAuthHeader"
                                    type="text"
                                    :placeholder="
                                        localConfig.httpAuthType === 'api_key' ? 'X-API-Key' : 'Authorization'
                                    "
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Valor / Token
                                </label>
                                <input
                                    v-model="localConfig.httpAuthValue"
                                    type="password"
                                    placeholder="••••••••"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            </div>
                        </template>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Body (JSON)
                            </label>
                            <textarea
                                v-model="localConfig.apiBody"
                                rows="3"
                                placeholder='{"key": "value"}'
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono resize-none"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Timeout (ms)
                            </label>
                            <input
                                v-model.number="localConfig.httpTimeout"
                                type="number"
                                min="1000"
                                step="1000"
                                placeholder="30000"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div
                            class="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 rounded-lg text-xs text-rose-700 dark:text-rose-300">
                            Esta herramienta permite que la IA realice peticiones HTTP con autenticación avanzada.
                        </div>
                    </template>

                    <!-- NODO: LOOP -->
                    <template v-if="false && selectedNode.type === 'loop'">
                        <div
                            class="p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-lg text-xs text-teal-700 dark:text-teal-300 space-y-1">
                            <p class="font-semibold">Puertos de salida</p>
                            <p>
                                <span class="font-semibold">Puerto 1:</span>
                                Ejecutar iteración
                            </p>
                            <p>
                                <span class="font-semibold">Puerto 2:</span>
                                Fin del bucle
                            </p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Modo de bucle
                            </label>
                            <select
                                v-model="localConfig.loopMode"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                                <option value="foreach">ForEach - Iterar sobre array</option>
                                <option value="times">Times - Repetir N veces</option>
                                <option value="while">While - Mientras condición</option>
                            </select>
                        </div>
                        <template v-if="localConfig.loopMode === 'foreach'">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Variable con array
                                </label>
                                <input
                                    v-model="localConfig.loopArrayVariable"
                                    type="text"
                                    placeholder="lista_productos"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nombre del iterador
                                </label>
                                <input
                                    v-model="localConfig.loopIteratorVariable"
                                    type="text"
                                    placeholder="item"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            </div>
                        </template>
                        <template v-if="localConfig.loopMode === 'times'">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Cantidad de repeticiones
                                </label>
                                <input
                                    v-model.number="localConfig.loopCount"
                                    type="number"
                                    min="1"
                                    max="100"
                                    placeholder="5"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            </div>
                        </template>
                        <template v-if="localConfig.loopMode === 'while'">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Campo a evaluar
                                </label>
                                <input
                                    v-model="localConfig.loopConditionField"
                                    type="text"
                                    placeholder="contador"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Operador
                                </label>
                                <select
                                    v-model="localConfig.loopConditionOperator"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                                    <option value="equals">Igual a</option>
                                    <option value="not_equals">No igual a</option>
                                    <option value="greater">Mayor que</option>
                                    <option value="less">Menor que</option>
                                    <option value="contains">Contiene</option>
                                    <option value="is_empty">Está vacío</option>
                                    <option value="is_not_empty">No está vacío</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Valor de comparación
                                </label>
                                <input
                                    v-model="localConfig.loopConditionValue"
                                    type="text"
                                    placeholder="10"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            </div>
                        </template>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Máximo de iteraciones (seguridad)
                            </label>
                            <input
                                v-model.number="localConfig.loopMaxIterations"
                                type="number"
                                min="1"
                                max="1000"
                                placeholder="100"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Delay entre iteraciones (ms)
                            </label>
                            <input
                                v-model.number="localConfig.loopDelayMs"
                                type="number"
                                min="0"
                                step="100"
                                placeholder="0"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div class="flex items-center gap-2">
                            <input
                                type="checkbox"
                                v-model="localConfig.loopAccumulateResults"
                                class="w-4 h-4 text-brand bg-gray-100 border-gray-300 rounded focus:ring-brand dark:focus:ring-brand dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                            <label class="text-sm text-gray-700 dark:text-gray-300">
                                Acumular resultados en variable
                            </label>
                        </div>
                        <div v-if="localConfig.loopAccumulateResults">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Variable para resultados
                            </label>
                            <input
                                v-model="localConfig.loopResultsVariable"
                                type="text"
                                placeholder="loop_results"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                    </template>

                    <!-- NODO: CACHE -->
                    <template v-if="false && selectedNode.type === 'cache'">
                        <div
                            class="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
                            <p class="font-semibold">Puertos de salida</p>
                            <p>
                                <span class="font-semibold">Puerto 1:</span>
                                Cache hit (usar datos cacheados)
                            </p>
                            <p>
                                <span class="font-semibold">Puerto 2:</span>
                                Cache miss (ejecutar y cachear)
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <input
                                type="checkbox"
                                v-model="localConfig.cacheEnabled"
                                class="w-4 h-4 text-brand bg-gray-100 border-gray-300 rounded focus:ring-brand dark:focus:ring-brand dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                            <label class="text-sm text-gray-700 dark:text-gray-300">Habilitar cache</label>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Clave de cache
                            </label>
                            <input
                                v-model="localConfig.cacheKey"
                                type="text"
                                placeholder="api_productos_{{ categoria }}"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                TTL (segundos)
                            </label>
                            <input
                                v-model.number="localConfig.cacheTtlSeconds"
                                type="number"
                                min="1"
                                placeholder="3600"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Variable origen (a cachear)
                            </label>
                            <input
                                v-model="localConfig.cacheSourceVariable"
                                type="text"
                                placeholder="api_result"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Variable destino (cacheada)
                            </label>
                            <input
                                v-model="localConfig.cacheVariable"
                                type="text"
                                placeholder="cached_api_result"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Invalidación
                            </label>
                            <select
                                v-model="localConfig.cacheInvalidateOn"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                                <option value="time">Por tiempo (TTL)</option>
                                <option value="manual">Manual</option>
                                <option value="never">Nunca</option>
                            </select>
                        </div>
                    </template>

                    <!-- NODO: MERGE -->
                    <template v-if="false && selectedNode.type === 'merge'">
                        <div
                            class="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg text-xs text-purple-700 dark:text-purple-300 space-y-1">
                            <p class="font-semibold">Convergencia de ramas paralelas</p>
                            <p>Recibe múltiples entradas y las combina en una sola salida.</p>
                            <p>Úsalo junto con el nodo Paralelo para sincronizar resultados.</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Modo de fusión
                            </label>
                            <select
                                v-model="localConfig.mergeMode"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                                <option value="wait_all">Esperar todas las entradas</option>
                                <option value="wait_any">Esperar cualquier entrada</option>
                                <option value="append">Agregar resultados en array</option>
                            </select>
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                <span class="font-medium">wait_all:</span>
                                Espera a que todas las ramas terminen.
                            </p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                <span class="font-medium">wait_any:</span>
                                Continúa cuando la primera rama termine.
                            </p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                <span class="font-medium">append:</span>
                                Acumula resultados de cada rama en un array.
                            </p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Entradas esperadas
                            </label>
                            <input
                                v-model.number="localConfig.mergeExpectedInputs"
                                type="number"
                                min="2"
                                max="10"
                                placeholder="2"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Número de ramas que deben converger antes de continuar.
                            </p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Timeout (ms)
                            </label>
                            <input
                                v-model.number="localConfig.mergeTimeout"
                                type="number"
                                min="1000"
                                step="1000"
                                placeholder="30000"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Tiempo máximo de espera antes de continuar (0 = sin límite).
                            </p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Variable para resultados
                            </label>
                            <input
                                v-model="localConfig.mergeResultsVariable"
                                type="text"
                                placeholder="merge_results"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Nombre de la variable donde se guardarán los resultados fusionados.
                            </p>
                        </div>
                    </template>

                    <!-- NODO: JSON_MENU -->
                    <!-- NODO: Menú JSON (MIGRADO) -->
                    <template v-if="false && selectedNode.type === 'json_menu'">
                        <div
                            class="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg text-xs text-orange-700 dark:text-orange-300 space-y-1">
                            <p class="font-semibold">Menú dinámico desde JSON</p>
                            <p>Genera opciones de menú automáticamente desde un array JSON.</p>
                            <p>Ideal para catálogos de productos, listas de servicios, etc.</p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Título del Menú
                            </label>
                            <input
                                v-model="localConfig.jsonMenuTitle"
                                type="text"
                                placeholder="Selecciona un producto:"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Variable con JSON
                            </label>
                            <input
                                v-model="localConfig.jsonMenuSourceVariable"
                                type="text"
                                placeholder="productos_api"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Variable que contiene el JSON/array de datos.
                            </p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Ruta al array (opcional)
                            </label>
                            <input
                                v-model="localConfig.jsonMenuPath"
                                type="text"
                                placeholder="data.products"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Si el array está anidado, indica la ruta. Ej: "data.items"
                            </p>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Campo Label
                                </label>
                                <input
                                    v-model="localConfig.jsonMenuLabelField"
                                    type="text"
                                    placeholder="name"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Campo para el texto visible.
                                </p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Campo Valor
                                </label>
                                <input
                                    v-model="localConfig.jsonMenuValueField"
                                    type="text"
                                    placeholder="id"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Campo para el valor interno.
                                </p>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Template de Label (opcional)
                            </label>
                            <input
                                v-model="localConfig.jsonMenuLabelTemplate"
                                type="text"
                                placeholder="{{ name }} - ${{ price }}"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Si especificas un template, se usará en lugar del campo. Usa &#123;&#123; campo
                                &#125;&#125; para interpolación.
                            </p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Campo Descripción (opcional)
                            </label>
                            <input
                                v-model="localConfig.jsonMenuDescriptionField"
                                type="text"
                                placeholder="description"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Template de Descripción (opcional)
                            </label>
                            <input
                                v-model="localConfig.jsonMenuDescriptionTemplate"
                                type="text"
                                placeholder="{{ category }} | Stock: {{ stock }}"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Template para la descripción. Usa &#123;&#123; campo &#125;&#125; para interpolación.
                            </p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Modo de render
                            </label>
                            <select
                                v-model="localConfig.jsonMenuRenderMode"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                                <option value="generic">Menú genérico (texto)</option>
                                <option value="whatsapp_buttons">WhatsApp: botones (máx 3)</option>
                                <option value="whatsapp_list">WhatsApp: lista</option>
                                <option value="whatsapp_template">WhatsApp: plantilla</option>
                            </select>
                        </div>

                        <!-- Configuración de Template WhatsApp -->
                        <template v-if="localConfig.jsonMenuRenderMode === 'whatsapp_template'">
                            <div
                                class="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                                <p class="font-semibold mb-1">Plantilla de WhatsApp</p>
                                <p>
                                    Los items del menú se enviarán como botones de la plantilla. Define qué campo del
                                    JSON usar como texto del botón.
                                </p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nombre de plantilla
                                </label>
                                <input
                                    v-model="localConfig.jsonMenuTemplateName"
                                    type="text"
                                    placeholder="catalogo_productos"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Idioma
                                </label>
                                <input
                                    v-model="localConfig.jsonMenuTemplateLanguage"
                                    type="text"
                                    placeholder="es"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Campo para botones (opcional)
                                </label>
                                <input
                                    v-model="localConfig.jsonMenuTemplateButtonField"
                                    type="text"
                                    placeholder="button_text"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Campo del JSON con el texto de los botones. Si no se especifica, usa el Campo Label.
                                </p>
                            </div>

                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Parámetros del body
                                    </label>
                                    <button
                                        type="button"
                                        @click="addTemplateParam"
                                        class="px-2 py-1 text-xs font-medium text-brand dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded transition-colors">
                                        Agregar parámetro
                                    </button>
                                </div>

                                <div
                                    v-for="(param, index) in localConfig.templateParams"
                                    :key="index"
                                    class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                                    <input
                                        v-model="param.key"
                                        type="text"
                                        placeholder="nombre_param"
                                        class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
                                    <input
                                        v-model="param.value"
                                        type="text"
                                        placeholder="valor o {{ variable }}"
                                        class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono" />
                                    <button
                                        type="button"
                                        @click="removeTemplateParam(index)"
                                        class="w-full px-2 py-1.5 text-xs bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded transition-colors">
                                        Eliminar parámetro
                                    </button>
                                </div>
                            </div>
                        </template>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Máximo de items
                            </label>
                            <input
                                v-model.number="localConfig.jsonMenuMaxItems"
                                type="number"
                                min="1"
                                max="20"
                                placeholder="10"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Límite de opciones a mostrar del JSON.
                            </p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Variable para selección
                            </label>
                            <input
                                v-model="localConfig.jsonMenuOutputVariable"
                                type="text"
                                placeholder="producto_seleccionado"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono" />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Variable donde se guardará el item completo seleccionado.
                            </p>
                        </div>

                        <div class="flex items-center gap-2">
                            <input
                                type="checkbox"
                                v-model="localConfig.jsonMenuSingleOutput"
                                class="w-4 h-4 text-brand bg-gray-100 border-gray-300 rounded focus:ring-brand dark:focus:ring-brand dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                            <label class="text-sm text-gray-700 dark:text-gray-300">
                                Usar salida única (derivar con Router)
                            </label>
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                            Si activas esta opción, el nodo tendrá una sola salida y podrás usar un nodo Router para
                            derivar según el valor seleccionado.
                        </p>
                    </template>

                    <!-- NODO: Enviar a -->
                    <template v-if="false && (selectedNode.type === 'send_to' || selectedNode.label === 'Enviar a')">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Enviar a
                            </label>
                            <select
                                v-model="localConfig.sendToType"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent">
                                <option value="">Seleccionar destino...</option>
                                <option value="agent">Agente</option>
                                <option value="flow">Flujo</option>
                            </select>
                        </div>

                        <!-- Selección de Agente -->
                        <div v-if="localConfig.sendToType === 'agent'">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Agente de Destino
                            </label>
                            <input
                                v-model="localConfig.agentId"
                                type="text"
                                placeholder="ID del agente o email"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
                        </div>

                        <!-- Selección de Flujo -->
                        <div v-if="localConfig.sendToType === 'flow'">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Flujo de Destino
                            </label>
                            <input
                                v-model="localConfig.flowId"
                                type="text"
                                placeholder="ID del flujo"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent" />
                        </div>

                        <!-- Tipo de Mensaje -->
                        <div v-if="localConfig.sendToType">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tipo de Mensaje
                            </label>
                            <select
                                v-model="localConfig.messageType"
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent">
                                <option v-for="type in messageTypes" :key="type.value" :value="type.value">
                                    {{ type.label }}
                                </option>
                            </select>
                        </div>

                        <!-- Mensaje a enviar -->
                        <div v-if="localConfig.sendToType">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Mensaje (opcional)
                            </label>
                            <textarea
                                v-model="localConfig.message"
                                rows="3"
                                placeholder="Mensaje que se enviará antes de la transferencia..."
                                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent resize-none"></textarea>
                        </div>
                    </template>

                    <!-- NODO: Flujo -->
                    <!-- NODO: Flujo (MIGRADO) -->
                    <template
                        v-if="false && ((false && selectedNode.type === 'flow') || selectedNode.label === 'Flujo')">
                        <div class="space-y-4">
                            <!-- Selector de Flujo -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Seleccionar Flujo
                                </label>
                                <div class="relative">
                                    <select
                                        v-model="localConfig.linkedFlowId"
                                        @change="handleFlowSelection(Number(localConfig.linkedFlowId))"
                                        :disabled="loadingFlows"
                                        class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand dark:focus:ring-brand/40 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed">
                                        <option value="">
                                            {{ loadingFlows ? 'Cargando flujos...' : 'Seleccionar flujo...' }}
                                        </option>
                                        <option v-for="flow in availableFlows" :key="flow.id" :value="flow.id">
                                            {{ flow.description }} (ID: {{ flow.id }})
                                        </option>
                                    </select>
                                    <div
                                        v-if="loadingFlows"
                                        class="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <svg
                                            class="animate-spin h-4 w-4 text-brand"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24">
                                            <circle
                                                class="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                stroke-width="4"></circle>
                                            <path
                                                class="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <!-- Información del Flujo Seleccionado -->
                            <div
                                v-if="localConfig.linkedFlowId"
                                class="p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-lg">
                                <div class="flex items-start gap-2">
                                    <svg
                                        class="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5"
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
                                    <div class="flex-1 text-sm">
                                        <p class="font-medium text-violet-900 dark:text-violet-200">Flujo Vinculado</p>
                                        <p class="text-violet-700 dark:text-violet-300 mt-1">
                                            {{ localConfig.linkedFlowName }}
                                        </p>
                                        <p class="text-violet-600 dark:text-violet-400 text-xs mt-1">
                                            ID: {{ localConfig.linkedFlowId }}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Mensaje Informativo -->
                            <div
                                class="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                                <div class="flex items-start gap-2">
                                    <svg
                                        class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
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
                                    <p class="text-sm text-blue-700 dark:text-blue-300">
                                        Cuando el flujo llegue a este nodo, ejecutará el flujo seleccionado y continuará
                                        con la siguiente acción una vez finalizado.
                                    </p>
                                </div>
                            </div>

                            <!-- Botón para recargar flujos -->
                            <button
                                @click="loadAvailableFlows"
                                :disabled="loadingFlows"
                                class="w-full px-3 py-2 text-sm font-medium text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/30 hover:bg-violet-200 dark:hover:bg-violet-900/50 border border-violet-300 dark:border-violet-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                <svg
                                    class="w-4 h-4"
                                    :class="{ 'animate-spin': loadingFlows }"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                </svg>
                                {{ loadingFlows ? 'Recargando...' : 'Recargar flujos' }}
                            </button>
                        </div>
                    </template>

                    <!-- ═══════════════════════════════════════════════════════ -->
                    <!-- DELAY (Espera / Wait)                                    -->
                    <!-- ═══════════════════════════════════════════════════════ -->
                    <template v-if="false && selectedNode.type === 'delay'">
                        <div class="space-y-4">
                            <!-- Duración -->
                            <div class="space-y-1">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    ⏱️ Duración de espera
                                </label>
                                <div class="flex gap-2">
                                    <input
                                        v-model.number="localConfig.delayTime"
                                        type="number"
                                        min="1"
                                        placeholder="5"
                                        class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                                    <select
                                        v-model="localConfig.delayUnit"
                                        class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                                        <option value="seconds">segundos</option>
                                        <option value="minutes">minutos</option>
                                        <option value="hours">horas</option>
                                    </select>
                                </div>
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    El flujo se pausará este tiempo antes de continuar al siguiente nodo.
                                </p>
                            </div>

                            <!-- Mensaje opcional durante espera -->
                            <div class="space-y-1">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    💬 Mensaje durante la espera
                                    <span class="text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <input
                                    v-model="localConfig.delayMessage"
                                    type="text"
                                    placeholder="⏳ Procesando, por favor espera..."
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    Si se define, se envía este mensaje al usuario mientras espera.
                                </p>
                            </div>

                            <!-- Resumen visual -->
                            <div
                                class="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                                <p class="text-sm text-orange-800 dark:text-orange-200 font-medium">
                                    ⏱️ Este nodo pausará el flujo
                                    {{ localConfig.delayTime || '?' }}
                                    {{
                                        localConfig.delayUnit === 'seconds'
                                            ? 'segundo(s)'
                                            : localConfig.delayUnit === 'minutes'
                                              ? 'minuto(s)'
                                              : 'hora(s)'
                                    }}
                                    antes de continuar.
                                </p>
                            </div>
                        </div>
                    </template>

                    <!-- ═══════════════════════════════════════════════════════ -->
                    <!-- LIST_RENDER (Lista Dinámica)                             -->
                    <!-- ═══════════════════════════════════════════════════════ -->
                    <template v-if="false && selectedNode.type === 'list_render'">
                        <div class="space-y-4">
                            <!-- Variable fuente -->
                            <div class="space-y-1">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    📦 Variable fuente (array)
                                    <span class="text-red-500">*</span>
                                </label>
                                <input
                                    v-model="localConfig.listRenderSourceVariable"
                                    type="text"
                                    placeholder="feriados_list"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-lime-500 focus:border-transparent" />
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    Nombre de la variable que contiene el array de datos.
                                </p>
                            </div>

                            <!-- Ruta al array (opcional) -->
                            <div class="space-y-1">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    🔍 Ruta al array
                                    <span class="text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <input
                                    v-model="localConfig.listRenderPath"
                                    type="text"
                                    placeholder="data.items"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-lime-500 focus:border-transparent" />
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    Si el array está anidado, indica la ruta (ej:
                                    <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">data.items</code>
                                    ). Dejar vacío si la variable ya es el array.
                                </p>
                            </div>

                            <!-- Encabezado -->
                            <div class="space-y-1">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    📋 Encabezado / Título
                                    <span class="text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <input
                                    v-model="localConfig.listRenderHeader"
                                    type="text"
                                    placeholder="📅 Lista de feriados {{year}}"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-lime-500 focus:border-transparent" />
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    Texto que aparece antes de la lista. Admite variables &#123;&#123; variable
                                    &#125;&#125;.
                                </p>
                            </div>

                            <!-- Template por ítem -->
                            <div class="space-y-1">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    🔧 Template por ítem
                                    <span class="text-red-500">*</span>
                                </label>
                                <textarea
                                    v-model="localConfig.listRenderItemTemplate"
                                    rows="3"
                                    placeholder="🟢 {{date}} — {{title}} ({{type}})"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-lime-500 focus:border-transparent font-mono"></textarea>
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    Template renderizado por cada elemento del array. Usa &#123;&#123; campo
                                    &#125;&#125; para interpolar campos del objeto.
                                    <br />
                                    Ejemplo:
                                    <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                                        🟢 &#123;&#123;date&#125;&#125; — &#123;&#123;title&#125;&#125;
                                        (&#123;&#123;type&#125;&#125;)
                                    </code>
                                </p>
                            </div>

                            <!-- Pie / Footer -->
                            <div class="space-y-1">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    📄 Pie / Footer
                                    <span class="text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <input
                                    v-model="localConfig.listRenderFooter"
                                    type="text"
                                    placeholder="📡 Fuente: api.boostr.cl"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-lime-500 focus:border-transparent" />
                            </div>

                            <!-- Separador entre ítems -->
                            <div class="space-y-1">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    ↩️ Separador entre ítems
                                </label>
                                <input
                                    v-model="localConfig.listRenderSeparator"
                                    type="text"
                                    placeholder="\n"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-lime-500 focus:border-transparent font-mono" />
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    Por defecto: salto de línea. Escribe
                                    <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">\n</code>
                                    para nueva línea o cualquier otro caracter.
                                </p>
                            </div>

                            <!-- Fila: Máx ítems + Enviar como mensaje -->
                            <div class="grid grid-cols-2 gap-3">
                                <div class="space-y-1">
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        🔢 Máx. ítems
                                    </label>
                                    <input
                                        v-model.number="localConfig.listRenderMaxItems"
                                        type="number"
                                        min="1"
                                        max="200"
                                        placeholder="50"
                                        class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-lime-500 focus:border-transparent" />
                                </div>
                                <div class="space-y-1">
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Env. como mensaje
                                    </label>
                                    <div class="flex items-center h-10">
                                        <label class="flex items-center gap-2 cursor-pointer">
                                            <input
                                                v-model="localConfig.listRenderSendMessage"
                                                type="checkbox"
                                                class="w-4 h-4 rounded border-gray-300 text-lime-500 focus:ring-lime-500" />
                                            <span class="text-sm text-gray-700 dark:text-gray-300">Activado</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <!-- Variable de salida -->
                            <div class="space-y-1">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    💾 Variable de salida
                                    <span class="text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <input
                                    v-model="localConfig.listRenderOutputVariable"
                                    type="text"
                                    placeholder="rendered_list"
                                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-lime-500 focus:border-transparent" />
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    Si se define, el texto renderizado se guarda en esta variable además de mostrarse.
                                </p>
                            </div>

                            <!-- Info -->
                            <div
                                class="p-3 bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-700 rounded-lg">
                                <p class="text-sm text-lime-800 dark:text-lime-200 font-medium">💡 Cómo funciona</p>
                                <p class="text-xs text-lime-700 dark:text-lime-300 mt-1">
                                    Lee el array de la variable, aplica el template a cada elemento y concatena el
                                    resultado. Útil para mostrar listas de feriados, productos, resultados de API, etc.
                                </p>
                            </div>
                        </div>
                    </template>

                    <!-- Información de ID del Nodo -->

                    <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                            <p>
                                <span class="font-medium">ID:</span>
                                {{ selectedNode.id }}
                            </p>
                            <p>
                                <span class="font-medium">Tipo:</span>
                                {{ selectedNode.type }}
                            </p>
                            <p>
                                <span class="font-medium">Entradas:</span>
                                {{ selectedNode.inputs }}
                            </p>
                            <p>
                                <span class="font-medium">Salidas:</span>
                                {{ selectedNode.outputs }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Mensaje cuando no hay nodo seleccionado -->
                <div v-else class="flex-1 flex items-center justify-center p-4">
                    <div class="text-center">
                        <svg
                            class="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path>
                        </svg>
                        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Sin Nodo Seleccionado</h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                            Haz clic en un nodo del canvas para editarlo
                        </p>
                    </div>
                </div>

                <!-- Footer con botones -->
                <div
                    v-if="selectedNode"
                    class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex gap-2">
                    <button
                        @click="handleSave"
                        class="flex-1 px-4 py-2 text-sm font-medium bg-brand hover:bg-brand dark:bg-brand dark:hover:bg-brand-600 text-white rounded-lg transition-colors">
                        Guardar Cambios
                    </button>
                    <button
                        @click="handleClose"
                        class="px-4 py-2 text-sm font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        </Transition>

        <MediaStorePickerModal
            :show="showMediaStoreModal"
            :panel-url="panelUrl"
            :empresa-token="empresaSelected"
            :csrf-token="csrf_token?.value ?? ''"
            :media-type="currentMessageType"
            @close="showMediaStoreModal = false"
            @select="handleMediaSelected" />
    </div>
</template>

<style scoped>
    /* Transiciones para backdrop */
    .fade-enter-active,
    .fade-leave-active {
        transition: opacity 0.3s ease;
    }

    .fade-enter-from,
    .fade-leave-to {
        opacity: 0;
    }

    /* Transiciones para panel desde la derecha */
    .slide-right-enter-active {
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .slide-right-leave-active {
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .slide-right-enter-from {
        transform: translateX(100%);
    }

    .slide-right-leave-to {
        transform: translateX(100%);
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
</style>
