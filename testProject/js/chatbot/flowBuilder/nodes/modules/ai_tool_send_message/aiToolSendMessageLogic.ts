import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

const executeAiToolSendMessage: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, variables, replaceVariables } = context;

    const runtimeArgs = variables.__toolArgs || {};

    // El contenido puede venir del agente en runtime o de la configuración estática
    const rawContent = String(runtimeArgs.message || runtimeArgs.content || node.config.toolMessageContent || '');
    const messageType = String(runtimeArgs.type || node.config.toolMessageType || 'text');
    const content = replaceVariables(rawContent);

    if (!content) {
        const error = 'ai_tool_send_message: contenido del mensaje vacío';
        testMessages.push({ type: 'bot', content: `⚠️ ${error}`, nodeId: node.id });
        if (isSubroutine) {
            return { success: false, error };
        }
        await moveToNextNode(node.id, 0);
        return null;
    }

    // Enviar el mensaje al usuario durante el loop agentic
    testMessages.push({
        type: 'bot',
        content,
        nodeId: node.id,
        mediaType: messageType !== 'text' ? messageType : undefined,
    });

    const result = { success: true, sent: content, type: messageType };

    if (isSubroutine) {
        return result;
    }

    await moveToNextNode(node.id, 0);
    return null;
};

export default executeAiToolSendMessage;
