import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

/**
 * Lógica de ejecución para el nodo de Webhook.
 * Pausa la ejecución del flujo y espera un payload JSON externo.
 */
const executeWebhook: ExecuteFn = (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, waitForInput } = context;
    const { config } = node;

    const payloadVariable = config.webhookPayloadVariable?.trim() || 'webhook_payload';
    const eventName = config.webhookEventName?.trim();
    const eventHint = eventName ? `Evento esperado: ${eventName}\n` : '';

    testMessages.push({
        type: 'bot',
        content: `📥 Esperando payload de webhook...\n${eventHint}Envía un JSON por el input para continuar.\nSe guardará en {{${payloadVariable}}}.`,
        nodeId: node.id,
    });

    waitForInput();
    return Promise.resolve(null);
};

export default executeWebhook;
