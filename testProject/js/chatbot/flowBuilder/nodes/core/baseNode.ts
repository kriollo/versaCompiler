import type { Component } from 'vue';

import type { FlowNode, NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

/**
 * Contexto de ejecución pasado a la función execute de cada nodo
 */
export interface ExecutionContext {
    variables: Record<string, any>;
    testMessages: any[];
    isSubroutine: boolean;
    sourceNodeId: string | null;
    currentNodeId: string;
    inputPortIndex: number;
    flowNodes: FlowNode[];
    connections: any[];
    senderId?: string;
    trunkId?: string;
    replaceVariables: (text: string) => string;
    moveToNextNode: (currentNodeId: string, portIndex: number) => Promise<void>;
    stopExecution: (reason: string) => void;
    waitForInput: () => void;
    setWaitingNode: (nodeId: string) => void;

    _env?: {
        versaFetch: (...args: unknown[]) => Promise<unknown>;
        panelUrl: string;
        empresaSelected: string;
        csrf_token: string;
    };

    apiKeys?: {
        openai: string;
        gemini: string;
        anthropic: string;
        groq: string;
        mistral: string;
    };

    executeToolNode?: (nodeId: string, args: Record<string, any>) => Promise<any>;
    getHistory?: (key: string) => any[];
    setHistory?: (key: string, history: any[]) => void;
    waitForUserInput?: (nodeId: string) => void;
    isWaitingForInput?: (nodeId: string) => boolean;
    getLastUserMessage?: () => string | null;
}

/**
 * Entorno del editor pasado a los componentes modulares.
 * Contiene datos y métodos compartidos entre el NodeEditor principal y los editores individuales.
 */
export interface NodeEnvironment {
    panelUrl: string;
    empresaSelected: string;
    csrf_token: string;
    availableFlows: any[];
    loadingFlows: boolean;
    loadAvailableFlows: () => Promise<void>;
    aiProviders?: any[];
    availableAgents?: any[];
}

/**
 * Resultado opcional de la ejecución de un nodo
 * Las AI Tools pueden devolver propiedades adicionales
 */
export interface ExecutionResult {
    error?: string;
    stop?: boolean;
    [key: string]: unknown;
}

/**
 * Tipo para la función de ejecución de un nodo
 */
export type ExecuteFn = (node: FlowNode, context: ExecutionContext) => Promise<ExecutionResult | null>;

/**
 * Definición completa de un módulo de nodo
 */
export interface NodeModule {
    type: NodeType;
    editor: Component; // Componente de configuración (Editor)
    execute: ExecuteFn; // Lógica de ejecución (Simulador)
    visual?: Component; // Representation visual personalizada (opcional)
}
