import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
import { getValueByPath } from '@/dashboard/js/chatbot/flowBuilder/utils/flowUtils';

const executeAiToolJsonExtract: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, variables } = context;

    const runtimeArgs = variables.__toolArgs || {};
    const sourceVariable = String(runtimeArgs.sourceVariable || node.config.toolInputVariable || '').trim();
    const jsonPath = String(runtimeArgs.jsonPath || node.config.toolPath || '').trim();
    const defaultValue = runtimeArgs.defaultValue ?? node.config.toolDefaultValue ?? null;

    const sourcePayload = sourceVariable ? getValueByPath(variables, sourceVariable) : variables;
    const extractedValue = jsonPath ? getValueByPath(sourcePayload, jsonPath) : sourcePayload;
    const finalValue = extractedValue === undefined ? defaultValue : extractedValue;

    testMessages.push({
        type: 'bot',
        content: `🛠️ [Herramienta] JSON Extract: ${jsonPath || '(payload completo)'}`,
        nodeId: node.id,
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

    await moveToNextNode(node.id, 0);
    return null;
};

export default executeAiToolJsonExtract;
