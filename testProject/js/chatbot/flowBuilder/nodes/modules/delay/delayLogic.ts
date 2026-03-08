import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

/**
 * Lógica de ejecución para el nodo de Retraso.
 * Pausa la ejecución del flujo por un tiempo determinado.
 */
const executeDelay: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, replaceVariables, moveToNextNode, currentNodeId } = context;
    const { config } = node;

    const delayTime = config.delayTime || 1;
    const delayUnit = config.delayUnit || 'seconds';
    const delayMessage = config.delayMessage ? replaceVariables(String(config.delayMessage)) : null;

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
        testMessages.push({
            type: 'bot',
            content: delayMessage,
            nodeId: node.id,
        });
    }

    testMessages.push({
        type: 'bot',
        content: `⏱️ Esperando ${delayTime} ${delayUnitLabel[delayUnit] ?? 'segundo(s)'}...`,
        nodeId: node.id,
        isDebug: true,
    });

    // Simular la espera
    await new Promise<void>(resolve => {
        setTimeout(resolve, Math.min(delayMs, 5000));
    });

    await moveToNextNode(currentNodeId, 0);
    return null;
};

export default executeDelay;
