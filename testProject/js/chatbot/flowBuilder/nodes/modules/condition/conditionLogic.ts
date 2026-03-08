import type { ExecutionContext, ExecutionResult } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
import { buildRegexFromPattern, getValueByPath } from '@/dashboard/js/chatbot/flowBuilder/utils/flowUtils';

// Make sure this exists, or copy it.

const isTruthy = (value: unknown): boolean => {
    if (value === null || value === undefined) {
        return false;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    if (typeof value === 'string') {
        const lower = value.toLowerCase().trim();
        return lower !== '' && lower !== 'false' && lower !== '0' && lower !== 'null' && lower !== 'undefined';
    }
    if (Array.isArray(value)) {
        return value.length > 0;
    }
    return Boolean(value);
};

export const evaluateCondition = (params: {
    field: string;
    operator:
        | 'equals'
        | 'not_equals'
        | 'contains'
        | 'greater'
        | 'less'
        | 'is_empty'
        | 'is_not_empty'
        | 'starts_with'
        | 'ends_with'
        | 'regex'
        | 'is_true'
        | 'is_false';
    value: string;
    variables: Record<string, unknown>;
}): boolean => {
    const normalizedField = String(params.field || '').trim();
    if (!normalizedField) {
        return false;
    }

    const resolveVariableValue = (fieldPath: string): unknown => {
        const directValue = getValueByPath(params.variables, fieldPath);
        if (directValue !== undefined) {
            return directValue;
        }

        const fallbackEntry = Object.entries(params.variables).find(([key]) => key.trim() === fieldPath);
        return fallbackEntry ? fallbackEntry[1] : undefined;
    };

    const rawSourceValue = resolveVariableValue(normalizedField);
    const sourceValue = String(rawSourceValue ?? '').trim();
    const compareValue = String(params.value ?? '').trim();

    switch (params.operator) {
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
            return sourceValue === '' || rawSourceValue === null || rawSourceValue === undefined;
        }
        case 'is_not_empty': {
            return sourceValue !== '' && rawSourceValue !== null && rawSourceValue !== undefined;
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
                const regex = buildRegexFromPattern(compareValue);
                return regex.test(sourceValue);
            } catch {
                return false;
            }
        }
        case 'is_true': {
            return isTruthy(rawSourceValue);
        }
        case 'is_false': {
            return !isTruthy(rawSourceValue);
        }
        default: {
            return false;
        }
    }
};

export default async function executeCondition(
    node: FlowNode,
    context: ExecutionContext,
): Promise<ExecutionResult | null> {
    const conditions = node.config.conditions || [];
    let selectedOutputIndex = 0;

    if (conditions.length > 0) {
        const conditionResults = conditions.map(condition => ({
            field: condition.field,
            operator: condition.operator,
            value: condition.value,
            result: evaluateCondition({
                field: condition.field,
                operator: condition.operator,
                value: condition.value,
                variables: context.variables,
            }),
        }));
        const matchedIndex = conditionResults.findIndex(c => c.result);

        if (matchedIndex !== -1) {
            selectedOutputIndex = matchedIndex;
            context.testMessages.push({
                type: 'bot',
                content: `🔍 Condición cumplida en regla ${matchedIndex + 1}`,
                nodeId: node.id,
                rawResponse: { conditions: conditionResults, matchedIndex },
            });
        } else {
            selectedOutputIndex = Math.max(conditions.length, 0);
            context.testMessages.push({
                type: 'bot',
                content: '🔍 Ninguna condición coincidió, se usa la salida por defecto',
                nodeId: node.id,
                rawResponse: { conditions: conditionResults, matchedIndex: -1 },
            });
        }
    } else {
        context.testMessages.push({
            type: 'bot',
            content: '🔍 Nodo condición sin reglas. Se usa salida por defecto.',
            nodeId: node.id,
        });
    }

    if (!context.isSubroutine) {
        await context.moveToNextNode(node.id, selectedOutputIndex);
    }
    return null;
}
