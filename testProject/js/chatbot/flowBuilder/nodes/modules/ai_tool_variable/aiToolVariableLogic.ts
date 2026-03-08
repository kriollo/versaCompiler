import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

const executeAiToolVariable: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, variables } = context;

    const runtimeArgs = variables.__toolArgs || {};
    const op = String(runtimeArgs.operation || node.config.variableOperation || 'get');
    const varName = String(runtimeArgs.variable || node.config.variableName || 'global');
    const val = runtimeArgs.value ?? node.config.variableValue ?? '';

    testMessages.push({
        type: 'bot',
        content: `🛠️ [Herramienta] Variable: ${op} "${varName}"`,
        nodeId: node.id,
        rawResponse: {
            operation: op,
            variable: varName,
            value: val,
            result: op === 'get' ? variables[varName] : val,
        },
    });

    if (op === 'set') {
        variables[varName] = val;
        if (isSubroutine) {
            return { success: true, message: `Variable ${varName} establecida` };
        }
    } else if (op === 'increment') {
        const currentValue = Number(variables[varName] ?? 0);
        const incrementBy = Number(val || 1);
        const nextValue = currentValue + (Number.isFinite(incrementBy) ? incrementBy : 1);
        variables[varName] = nextValue;
        if (isSubroutine) {
            return { value: nextValue };
        }
    } else if (op === 'decrement') {
        const currentValue = Number(variables[varName] ?? 0);
        const decrementBy = Number(val || 1);
        const nextValue = currentValue - (Number.isFinite(decrementBy) ? decrementBy : 1);
        variables[varName] = nextValue;
        if (isSubroutine) {
            return { value: nextValue };
        }
    } else {
        const value = variables[varName];
        if (isSubroutine) {
            return { value };
        }
    }

    if (!isSubroutine) {
        await moveToNextNode(node.id, 0);
    }

    return null;
};

export default executeAiToolVariable;
