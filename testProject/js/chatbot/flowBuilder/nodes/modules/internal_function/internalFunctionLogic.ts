import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

const executeInternalFunction: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, variables } = context;

    const functionName = node.config.internalFunctionName || '';
    const params = node.config.internalFunctionParams || {};
    const outputVariable = node.config.internalFunctionOutputVariable || '';

    if (!functionName) {
        testMessages.push({
            type: 'bot',
            content: 'No se especificó una función interna',
            nodeId: node.id,
            isDebug: true,
        });

        if (!isSubroutine) {
            await moveToNextNode(node.id, 0);
        }
        return null;
    }

    testMessages.push({
        type: 'bot',
        content: `Ejecutando función interna: ${functionName}`,
        nodeId: node.id,
        isDebug: true,
    });

    const resolvedParams = Object.fromEntries(
        Object.entries(params).map(([key, value]) => {
            if (typeof value === 'string') {
                return [key, context.replaceVariables(value)];
            }
            if (Array.isArray(value)) {
                return [key, value];
            }
            if (value && typeof value === 'object') {
                const nested = Object.fromEntries(
                    Object.entries(value).map(([nestedKey, nestedValue]) => {
                        if (typeof nestedValue === 'string') {
                            return [nestedKey, context.replaceVariables(nestedValue)];
                        }
                        return [nestedKey, nestedValue];
                    }),
                );
                return [key, nested];
            }
            return [key, value];
        }),
    );

    testMessages.push({
        type: 'bot',
        content: `Parámetros: ${JSON.stringify(resolvedParams)}`,
        nodeId: node.id,
        isDebug: true,
    });

    if (outputVariable) {
        testMessages.push({
            type: 'bot',
            content: `El resultado se guardará en: ${outputVariable}`,
            nodeId: node.id,
            isDebug: true,
        });

        variables[outputVariable] = `[Resultado simulado de ${functionName}]`;
    }

    if (!isSubroutine) {
        await moveToNextNode(node.id, 0);
    }

    return null;
};

export default executeInternalFunction;
