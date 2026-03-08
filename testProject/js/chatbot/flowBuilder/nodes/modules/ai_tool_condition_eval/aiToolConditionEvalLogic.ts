import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

type ConditionOperator =
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'greater'
    | 'less'
    | 'is_empty'
    | 'is_not_empty'
    | 'starts_with'
    | 'ends_with'
    | 'regex';

interface ConditionParams {
    field: string;
    operator: ConditionOperator;
    value: string;
    variables: Record<string, any>;
}

const evaluateCondition = (params: ConditionParams): boolean => {
    const { field, operator, value, variables } = params;
    const sourceValue = String(variables[field] ?? '').trim();
    const compareValue = String(value ?? '').trim();

    switch (operator) {
        case 'equals': {
            return sourceValue.toLowerCase() === compareValue.toLowerCase();
        }
        case 'not_equals': {
            return sourceValue.toLowerCase() !== compareValue.toLowerCase();
        }
        case 'contains': {
            return sourceValue.toLowerCase().includes(compareValue.toLowerCase());
        }
        case 'greater': {
            return Number(sourceValue) > Number(compareValue);
        }
        case 'less': {
            return Number(sourceValue) < Number(compareValue);
        }
        case 'is_empty': {
            return sourceValue === '' || variables[field] === null || variables[field] === undefined;
        }
        case 'is_not_empty': {
            return sourceValue !== '' && variables[field] !== null && variables[field] !== undefined;
        }
        case 'starts_with': {
            return sourceValue.toLowerCase().startsWith(compareValue.toLowerCase());
        }
        case 'ends_with': {
            return sourceValue.toLowerCase().endsWith(compareValue.toLowerCase());
        }
        case 'regex': {
            if (!compareValue) {
                return false;
            }
            try {
                const regex = new RegExp(compareValue, 'i');
                return regex.test(sourceValue);
            } catch {
                return false;
            }
        }
        default: {
            return false;
        }
    }
};

const executeAiToolConditionEval: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, variables } = context;

    const runtimeArgs = variables.__toolArgs || {};
    const field = String(runtimeArgs.field || node.config.toolPath || node.config.variableName || '').trim();
    const operator = String(runtimeArgs.operator || 'equals') as ConditionOperator;
    const value = String(runtimeArgs.value || node.config.toolDefaultValue || node.config.variableValue || '');

    const match = evaluateCondition({ field, operator, value, variables });

    testMessages.push({
        type: 'bot',
        content: `🛠️ [Herramienta] Condition Eval: ${match ? 'true' : 'false'}`,
        nodeId: node.id,
        rawResponse: { match, field, operator, value },
    });

    if (isSubroutine) {
        return {
            match,
            field,
            operator,
            value,
        };
    }

    await moveToNextNode(node.id, 0);
    return null;
};

export default executeAiToolConditionEval;
