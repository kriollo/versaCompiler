/**
 * Tipos e interfaces para el Flow Builder del Chatbot
 */

// Posición de un nodo en el canvas
export interface Position {
    x: number;
    y: number;
}

export type MessageMediaType = 'text' | 'image' | 'video' | 'audio' | 'file';
export type MessageChannelType = 'standard' | 'interactive_buttons' | 'interactive_list' | 'template';
export type ChannelTarget = 'generic' | 'whatsapp';
export type FlowType = 'inbound' | 'outbound';

export interface InteractiveButtonConfig {
    id: string;
    title: string;
}

export interface InteractiveListRowConfig {
    id: string;
    title: string;
    description?: string;
}

export interface InteractiveListSectionConfig {
    title: string;
    rows: InteractiveListRowConfig[];
}

export interface WhatsAppTemplateButtonConfig {
    type: 'quick_reply' | 'url';
    text?: string;
    payload?: string;
    url?: string;
}

export interface WhatsAppTemplateParamConfig {
    key: string;
    value: string;
}

// Tipos de nodos disponibles en el flow builder
export enum NodeType {
    START = 'start',
    MESSAGE = 'message',
    QUESTION = 'question',
    MENU = 'menu',
    CONDITION = 'condition',
    API_CALL = 'api_call',
    WEBHOOK = 'webhook',
    DELAY = 'delay',
    VARIABLE = 'variable',
    SEND_TO = 'send_to',
    FLOW = 'flow',
    END = 'end',
    AI_AGENT = 'ai_agent',
    AI_TOOL_VARIABLE = 'ai_tool_variable',
    AI_TOOL_JSON_EXTRACT = 'ai_tool_json_extract',
    AI_TOOL_TEMPLATE_RENDER = 'ai_tool_template_render',
    AI_TOOL_CONDITION_EVAL = 'ai_tool_condition_eval',
    AI_TOOL_DATETIME = 'ai_tool_datetime',
    AI_TOOL_TEXT_UTILS = 'ai_tool_text_utils',
    ROUTER = 'router',
    ERROR_HANDLER = 'error_handler',
    AI_TOOL_HTTP = 'ai_tool_http',
    LOOP = 'loop',
    PARALLEL = 'parallel',
    RATING = 'rating',
    CACHE = 'cache',
    MERGE = 'merge',
    JSON_MENU = 'json_menu',
    LIST_RENDER = 'list_render',
    INPUT_MEDIA = 'input_media',
    AI_TOOL_MEMORY = 'ai_tool_memory',
    AI_TOOL_SEND_MESSAGE = 'ai_tool_send_message',
    AI_TOOL_WAIT_INPUT = 'ai_tool_wait_input',
    AI_TOOL_KNOWLEDGE_BASE = 'ai_tool_knowledge_base',
    AI_TOOL_MATH = 'ai_tool_math',
    AI_TOOL_STRUCTURED_OUTPUT = 'ai_tool_structured_output',
    AI_TOOL_INTERNAL_FUNCTION = 'ai_tool_internal_function',
    INTERNAL_FUNCTION = 'internal_function',
    CUSTOMER_REGISTER = 'customer_register',
}

// Configuración específica para cada tipo de nodo
export interface NodeConfig {
    // Para nodos de mensaje
    message?: string;
    messageType?: MessageMediaType;
    messageChannelType?: MessageChannelType;
    messageChannelTarget?: ChannelTarget;
    messageMediaUrl?: string;
    messageMediaMime?: string;
    messageFileName?: string;
    mediaAssetId?: number;
    interactiveButtons?: InteractiveButtonConfig[];
    interactiveListButtonText?: string;
    interactiveListSections?: InteractiveListSectionConfig[];
    templateName?: string;
    templateLanguage?: string;
    templateParams?: WhatsAppTemplateParamConfig[];
    templateButtons?: WhatsAppTemplateButtonConfig[];

    // Para nodos de pregunta
    question?: string;
    expectedAnswer?: 'text' | 'number' | 'email' | 'phone' | 'url' | 'date' | 'regex';
    variableName?: string;
    validationPattern?: string;
    validationErrorMessage?: string;

    // Para nodos de menú
    menuTitle?: string;
    menuRenderMode?: 'generic' | 'whatsapp_buttons' | 'whatsapp_list';
    menuSingleOutput?: boolean;
    menuOptions?: {
        id: string;
        label: string;
        description?: string;
        value: string;
        disabled?: boolean;
    }[];
    menuOptionZeroEnabled?: boolean;
    menuOptionZeroLabel?: string;
    menuOptionZeroValue?: string;

    // Para nodos de condición
    conditions?: {
        field: string;
        operator:
            | 'equals'
            | 'not_equals'
            | 'contains'
            | 'greater'
            | 'less'
            | 'is_empty'
            | 'is_not_empty'
            | 'starts_with'
            | 'ends_with'
            | 'regex'
            | 'is_true'
            | 'is_false';
        value: string;
        nextNodeId?: string;
    }[];

    // Para nodos de API
    apiUrl?: string;
    apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    apiHeaders?: Record<string, string>;
    apiBody?: string;
    apiResponseFormat?: 'json' | 'text' | 'number' | 'boolean';
    apiResponseVariable?: string;
    apiResponsePath?: string;
    apiResponseTemplate?: string;

    // Para nodos de delay
    delayTime?: number;
    delayUnit?: 'seconds' | 'minutes' | 'hours';
    delayMessage?: string;

    // Para nodos de variable
    variableOperation?: 'set' | 'get' | 'increment' | 'decrement';
    variableValue?: string;

    // Para nodos de enviar a (send_to)
    queueId?: number; // ID de la cola de destino
    sendToMessage?: string; // Mensaje opcional antes de enviar
    sendToMessageType?: 'text' | 'image' | 'video' | 'audio' | 'file';

    // Para nodos de flujo (flow)
    linkedFlowId?: number; // ID del flujo vinculado de la base de datos
    linkedFlowName?: string; // Nombre del flujo vinculado
    linkedFlowDescription?: string; // Descripción del flujo vinculado

    // Para nodos webhook
    webhookEventName?: string;
    webhookPayloadVariable?: string;

    // Para nodos de Agente de IA (AI Agent)
    aiProvider?: 'openai' | 'anthropic' | 'google' | 'groq' | 'mistral' | 'other';
    aiApiKey?: string;
    aiModel?: string;
    aiPrompt?: string;
    aiTemperature?: number;
    aiMaxTokens?: number;
    aiMemoryEnabled?: boolean;
    aiMemorySessionLimit?: number;
    aiMemorySource?: 'session' | 'database' | 'manual';
    aiToolings?: {
        name: string;
        description: string;
        parameters: string; // JSON schema format
        nodeId?: string; // ID del nodo asociado como herramienta
    }[];
    aiResponseVariable?: string;

    // Metadatos para herramientas (AI Tools)
    toolName?: string;
    toolDescription?: string;
    toolInputVariable?: string;
    toolPath?: string;
    toolDefaultValue?: string;
    toolTemplate?: string;
    toolTimezone?: string;
    toolDateFormat?: string;
    toolTextOperation?: 'trim' | 'lower' | 'upper' | 'slug';

    // Para nodo ROUTER
    routerVariable?: string;
    routerCases?: {
        id: string;
        label: string;
        value: string;
    }[];
    routerDefaultOutput?: boolean;

    // Para nodo ERROR_HANDLER
    errorHandlerEnabled?: boolean;
    errorHandlerRetryCount?: number;
    errorHandlerRetryDelay?: number;
    errorHandlerFallbackNodeId?: string;
    errorHandlerCatchAll?: boolean;

    // Para API_CALL retry
    apiRetryEnabled?: boolean;
    apiRetryCount?: number;
    apiRetryDelay?: number;
    apiRetryBackoff?: 'fixed' | 'linear' | 'exponential';

    // Para AI_TOOL_HTTP (herramienta HTTP más robusta)
    httpAuthType?: 'none' | 'basic' | 'bearer' | 'oauth2' | 'api_key';
    httpAuthHeader?: string;
    httpAuthValue?: string;
    httpTimeout?: number;

    // Para nodo LOOP
    loopMode?: 'foreach' | 'times' | 'while';
    loopArrayVariable?: string;
    loopIteratorVariable?: string;
    loopCount?: number;
    loopMaxIterations?: number;
    loopConditionField?: string;
    loopConditionOperator?: 'equals' | 'not_equals' | 'contains' | 'greater' | 'less' | 'is_empty' | 'is_not_empty';
    loopConditionValue?: string;
    loopDelayMs?: number;
    loopAccumulateResults?: boolean;
    loopResultsVariable?: string;

    // Para nodo PARALLEL
    parallelBranches?: number;
    parallelTimeout?: number;
    parallelFailFast?: boolean;
    parallelContinueOnError?: boolean;
    parallelResultsVariable?: string;

    // Para nodo CACHE
    cacheEnabled?: boolean;
    cacheScope?: 'global' | 'user';
    cacheExpiryType?: 'ttl' | 'permanent';
    cacheKey?: string;
    cacheTtlSeconds?: number;
    cacheVariable?: string;
    cacheSourceVariable?: string;
    cacheInvalidateOn?: 'never' | 'manual' | 'time';

    // Para nodo MERGE
    mergeMode?: 'wait_all' | 'wait_any' | 'append';
    mergeExpectedInputs?: number;
    mergeTimeout?: number;
    mergeResultsVariable?: string;

    // Para nodo JSON_MENU
    jsonMenuSourceVariable?: string;
    jsonMenuPath?: string;
    jsonMenuLabelField?: string;
    jsonMenuLabelTemplate?: string;
    jsonMenuValueField?: string;
    jsonMenuDescriptionField?: string;
    jsonMenuDescriptionTemplate?: string;
    jsonMenuOutputVariable?: string;
    jsonMenuTitle?: string;
    jsonMenuRenderMode?: 'generic' | 'whatsapp_buttons' | 'whatsapp_list' | 'whatsapp_template';
    jsonMenuSingleOutput?: boolean;
    jsonMenuMaxItems?: number;
    jsonMenuUseTemplate?: boolean;
    jsonMenuTemplateName?: string;
    jsonMenuTemplateLanguage?: string;
    jsonMenuTemplateParams?: WhatsAppTemplateParamConfig[];
    jsonMenuTemplateButtons?: WhatsAppTemplateButtonConfig[];
    jsonMenuTemplateButtonField?: string;
    jsonMenuOptionZeroEnabled?: boolean;
    jsonMenuOptionZeroLabel?: string;
    jsonMenuOptionZeroValue?: string;

    // Para nodo LIST_RENDER (renderizado dinámico de listas desde JSON)
    listRenderSourceVariable?: string; // Variable que contiene el array
    listRenderPath?: string; // Ruta anidada al array (ej: data.items)
    listRenderHeader?: string; // Título / encabezado del listado
    listRenderItemTemplate?: string; // Template por ítem: éj • {{date}} — {{title}}
    listRenderFooter?: string; // Pie opcional debajo de la lista
    listRenderSeparator?: string; // Separador entre ítems (default '\n')
    listRenderMaxItems?: number; // Límite de ítems a mostrar
    listRenderOutputVariable?: string; // Variable donde se guarda el texto generado
    listRenderSendMessage?: boolean; // Si true, envía el texto como mensaje automáticamente

    // Para nodo INPUT_MEDIA
    inputMediaTypes?: ('image' | 'audio' | 'video' | 'document' | 'location' | 'any')[];
    inputMediaPrompt?: string; // Mensaje al usuario antes de esperar el archivo
    inputMediaVariable?: string; // Variable donde guardar la URL del archivo recibido
    inputMediaMimeVariable?: string; // Variable donde guardar el tipo MIME
    inputMediaTypeVariable?: string; // Variable donde guardar el tipo de media

    // Para AI_TOOL_MEMORY
    memoryOperation?: 'remember' | 'recall' | 'summarize' | 'forget';
    memoryKey?: string;
    memoryValue?: string;
    memoryAgentHistoryKey?: string; // ID del nodo agente cuyo historial resumir

    // Para AI_TOOL_SEND_MESSAGE
    toolMessageContent?: string; // Contenido del mensaje por defecto
    toolMessageType?: string; // Tipo de mensaje por defecto

    // Para AI_TOOL_WAIT_INPUT
    toolWaitQuestion?: string; // Pregunta por defecto
    toolWaitVariable?: string; // Variable donde guardar la respuesta
    toolWaitValidation?: 'text' | 'number' | 'email' | 'phone' | 'date';

    // Para AI_TOOL_KNOWLEDGE_BASE
    kbId?: string; // ID de la base de conocimiento
    kbTopK?: number; // Número máximo de resultados
    kbMinScore?: number; // Similitud mínima (0-1)
    kbOutputVariable?: string; // Variable donde guardar los resultados

    // Para AI_TOOL_MATH
    mathOperation?:
        | 'add'
        | 'subtract'
        | 'multiply'
        | 'divide'
        | 'power'
        | 'sqrt'
        | 'round'
        | 'percentage'
        | 'modulo'
        | 'abs'
        | 'evaluate';
    mathValueA?: number;
    mathValueB?: number;
    mathDecimals?: number;
    mathExpression?: string;
    mathOutputVariable?: string;

    // Para AI_TOOL_STRUCTURED_OUTPUT
    structuredSchema?: {
        field: string;
        type: 'string' | 'number' | 'boolean' | 'array';
        description?: string;
        required?: boolean;
        defaultValue?: unknown;
    }[];
    structuredSourceVariable?: string;
    structuredOutputVariable?: string;
    structuredFallbackToLastMessage?: boolean;
    structuredRawText?: string;

    // Para INTERNAL_FUNCTION
    internalFunctionName?: string;
    internalFunctionParams?: Record<string, unknown>;
    internalFunctionOutputVariable?: string;
    // Para CUSTOMER_REGISTER
    customerFields?: {
        key: string;
        label?: string;
        prompt?: string;
        required?: boolean;
        validation?: 'rut' | 'email' | 'phone_cl' | 'regex' | 'none';
        pattern?: string;
        errorMessage?: string;
    }[];
    customerPrompt?: string;
    customerErrorMessage?: string;
    customerIntroMessage?: string;
    customerExistsMessage?: string;
    customerSuccessMessage?: string;
    customerValidateInput?: boolean;
    // Para RATING
    ratingMin?: number;
    ratingMax?: number;
    ratingMessage?: string;
    ratingVariable?: string;
    ratingErrorMessage?: string;
}

// Punto de conexión (puerto) de un nodo
export interface NodePort {
    id: string;
    nodeId: string;
    type: 'input' | 'output';
    label?: string;
}

// Nodo del flow
export interface FlowNode {
    id: string;
    type: NodeType;
    position: Position;
    label: string;
    config: NodeConfig;
    inputs: number; // Cantidad de puertos de entrada
    outputs: number; // Cantidad de puertos de salida
    isSelected: boolean;
}

// Conexión entre nodos
export interface Connection {
    id: string;
    sourceNodeId: string;
    sourcePortIndex: number;
    targetNodeId: string;
    targetPortIndex: number;
}

export interface PortLabelConfig {
    label: string;
    title: string;
    color?: string;
}

export type GetPortLabelsFn = (node: FlowNode) => PortLabelConfig[];

export interface PortDefinition {
    inputLabels?: GetPortLabelsFn;
    outputLabels?: GetPortLabelsFn;
}

export interface NodeDefinition {
    type: NodeType;
    label: string;
    icon: string;
    description: string;
    color: string;
    defaultInputs: number;
    defaultOutputs: number;
    category: 'flow' | 'interaction' | 'logic' | 'integration' | 'ai_tool';
    ports?: PortDefinition;
}

// Estado del editor de nodos
export interface EditorState {
    selectedNodeId: string | null;
    isPanning: boolean;
    isConnecting: boolean;
    connectionStart: {
        nodeId: string;
        portIndex: number;
    } | null;
    zoom: number;
    panOffset: Position;
}

// Estado completo del flow
export interface FlowState {
    nodes: FlowNode[];
    connections: Connection[];
    editor: EditorState;
}

// Evento de drag and drop
export interface DragData {
    nodeType: NodeType;
    nodeDefinition: NodeDefinition;
}
