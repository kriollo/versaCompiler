import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

const executeAiToolInternalFunction: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, variables } = context;

    const runtimeArgs = (variables.__toolArgs as Record<string, unknown>) || {};
    const functionName = String(
        runtimeArgs.function || runtimeArgs.functionName || node.config.internalFunctionName || '',
    );
    const params = (runtimeArgs.params || runtimeArgs.parameters || node.config.internalFunctionParams || {}) as Record<
        string,
        unknown
    >;
    const outputVariable = String(runtimeArgs.outputVariable || node.config.internalFunctionOutputVariable || '');

    if (!functionName) {
        testMessages.push({
            type: 'bot',
            content: 'No se especificó una función interna',
            nodeId: node.id,
            isDebug: true,
        });

        if (isSubroutine) {
            return { success: false, error: 'No se especificó una función interna' };
        }

        if (!isSubroutine) {
            await moveToNextNode(node.id, 0);
        }
        return null;
    }

    testMessages.push({
        type: 'bot',
        content: `🛠️ [Herramienta] Función Interna: ${functionName}`,
        nodeId: node.id,
        rawResponse: {
            function: functionName,
            params,
            outputVariable,
        },
    });

    const simulatedResult = `[Resultado simulado de ${functionName}]`;

    if (outputVariable) {
        variables[outputVariable] = simulatedResult;
    }

    if (isSubroutine) {
        return {
            success: true,
            function: functionName,
            output: simulatedResult,
        };
    }

    if (!isSubroutine) {
        await moveToNextNode(node.id, 0);
    }

    return null;
};

export default executeAiToolInternalFunction;
