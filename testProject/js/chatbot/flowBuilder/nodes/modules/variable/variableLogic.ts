import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
import { getValueByPath } from '@/dashboard/js/chatbot/flowBuilder/utils/flowUtils';

const executeVariable: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, variables, replaceVariables } = context;

    const varName = node.config.variableName || 'variable';
    const varOperation = node.config.variableOperation || 'set';
    const varValue = node.config.variableValue || '';

    let processedValue: unknown = varValue;

    if (varValue && typeof varValue === 'string') {
        const exactPlaceholder = varValue.match(/^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/);
        if (exactPlaceholder && exactPlaceholder[1]) {
            processedValue = getValueByPath(variables, exactPlaceholder[1].trim());
        } else {
            processedValue = replaceVariables(varValue);
        }
    }

    switch (varOperation) {
        case 'set': {
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
            variables[varName] = finalValue;
            break;
        }
        case 'get': {
            processedValue = variables[varName];
            break;
        }
        case 'increment': {
            variables[varName] = (Number(variables[varName]) || 0) + (Number(processedValue) || 1);
            break;
        }
        case 'decrement': {
            variables[varName] = (Number(variables[varName]) || 0) - (Number(processedValue) || 1);
            break;
        }
        default: {
            break;
        }
    }

    testMessages.push({
        type: 'bot',
        content: `📝 Variable "${varName}" - Operación: ${varOperation}`,
        nodeId: node.id,
        isDebug: true,
    });

    if (!isSubroutine) {
        await moveToNextNode(node.id, 0);
    }

    return null;
};

export default executeVariable;
