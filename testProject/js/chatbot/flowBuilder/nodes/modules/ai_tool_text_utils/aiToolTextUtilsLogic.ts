import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

const executeAiToolTextUtils: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, variables } = context;

    const runtimeArgs = variables.__toolArgs || {};
    const operation = String(runtimeArgs.operation || node.config.toolTextOperation || 'trim').toLowerCase();
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

    testMessages.push({
        type: 'bot',
        content: `🛠️ [Herramienta] Text Utils (${operation}) ejecutada`,
        nodeId: node.id,
        rawResponse: { operation, input: text, result: resultText },
    });

    if (isSubroutine) {
        return {
            operation,
            result: resultText,
        };
    }

    await moveToNextNode(node.id, 0);
    return null;
};

export default executeAiToolTextUtils;
