import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

const executeSendTo: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, replaceVariables, stopExecution } = context;

    const preTransferMessage = node.config.message;
    if (preTransferMessage) {
        testMessages.push({
            type: 'bot',
            content: replaceVariables(preTransferMessage),
            nodeId: node.id,
        });
        await new Promise<void>(resolve => {
            setTimeout(resolve, 500);
        });
    }

    if (!node.config.queueId) {
        stopExecution('Nodo Enviar a sin Cola de destino configurada.');
        return null;
    }

    testMessages.push({
        type: 'bot',
        content: `🔄 Transferencia:\n→ Destino: COLA\n→ ID: ${node.config.queueId}`,
        nodeId: node.id,
    });

    return null;
};

export default executeSendTo;
