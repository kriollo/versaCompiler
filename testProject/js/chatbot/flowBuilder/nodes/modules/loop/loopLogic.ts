import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
import { getValueByPath } from '@/dashboard/js/chatbot/flowBuilder/utils/flowUtils';

interface LoopState {
    mode: 'foreach' | 'times' | 'while';
    currentIndex: number;
    items: any[];
    iteratorName: string;
    count: number;
    results: any[];
    accumulateResults: boolean;
    resultsVariable: string;
    maxIterations: number;
    conditionField?: string;
    conditionOperator?: string;
    conditionValue?: string;
}

const loopStates = new Map<string, LoopState>();

export const resetLoopStates = (): void => {
    loopStates.clear();
};

interface ConditionParams {
    fieldValue: any;
    operator: string;
    compareValue: string;
    variables: Record<string, any>;
}

const evaluateCondition = (params: ConditionParams): boolean => {
    const { fieldValue, operator, compareValue, variables } = params;
    const resolvedValue = (() => {
        const num = Number.parseFloat(compareValue);
        if (!Number.isNaN(num)) {
            return num;
        }
        if (compareValue === 'true') {
            return true;
        }
        if (compareValue === 'false') {
            return false;
        }
        if (variables[compareValue] !== undefined) {
            return variables[compareValue];
        }
        return compareValue;
    })();

    switch (operator) {
        case 'equals': {
            return fieldValue === resolvedValue;
        }
        case 'not_equals': {
            return fieldValue !== resolvedValue;
        }
        case 'greater': {
            return Number(fieldValue) > Number(resolvedValue);
        }
        case 'less': {
            return Number(fieldValue) < Number(resolvedValue);
        }
        case 'contains': {
            return String(fieldValue).includes(String(resolvedValue));
        }
        case 'is_empty': {
            return (
                fieldValue === null ||
                fieldValue === undefined ||
                fieldValue === '' ||
                (Array.isArray(fieldValue) && fieldValue.length === 0)
            );
        }
        case 'is_not_empty': {
            return (
                fieldValue !== null &&
                fieldValue !== undefined &&
                fieldValue !== '' &&
                !(Array.isArray(fieldValue) && fieldValue.length === 0)
            );
        }
        default: {
            return false;
        }
    }
};

const executeLoop: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, variables, inputPortIndex } = context;

    const loopMode = node.config.loopMode || 'times';
    const maxIterations = Math.min(node.config.loopMaxIterations || 100, 1000);
    const delayMs = node.config.loopDelayMs || 0;
    const accumulateResults = node.config.loopAccumulateResults || false;
    const resultsVariable = node.config.loopResultsVariable || 'loop_results';

    const loopState = loopStates.get(node.id);
    const isReturningFromBody = loopState !== undefined && inputPortIndex === 0;

    if (isReturningFromBody && loopState) {
        loopState.currentIndex++;

        if (delayMs > 0) {
            await new Promise<void>(resolve => {
                setTimeout(resolve, delayMs);
            });
        }

        if (loopState.mode === 'while' && loopState.conditionField && loopState.conditionOperator) {
            const fieldValue = getValueByPath(variables, loopState.conditionField);
            const shouldContinue = evaluateCondition({
                fieldValue,
                operator: loopState.conditionOperator,
                compareValue: loopState.conditionValue || '',
                variables,
            });

            if (!shouldContinue || loopState.currentIndex >= loopState.maxIterations) {
                if (loopState.accumulateResults) {
                    variables[loopState.resultsVariable] = loopState.results;
                }

                testMessages.push({
                    type: 'bot',
                    content: `✅ Bucle while completado: ${loopState.currentIndex} iteraciones`,
                    nodeId: node.id,
                });

                loopStates.delete(node.id);

                if (!isSubroutine) {
                    await moveToNextNode(node.id, 1);
                }
                return null;
            }
        }

        if (loopState.currentIndex >= loopState.count || loopState.currentIndex >= loopState.maxIterations) {
            if (loopState.accumulateResults) {
                variables[loopState.resultsVariable] = loopState.results;
            }

            testMessages.push({
                type: 'bot',
                content: `✅ Bucle completado: ${loopState.currentIndex} iteraciones`,
                nodeId: node.id,
            });

            loopStates.delete(node.id);

            if (!isSubroutine) {
                await moveToNextNode(node.id, 1);
            }
            return null;
        }
    }

    if (!loopState) {
        testMessages.push({
            type: 'bot',
            content: `🔄 Iniciando bucle (${loopMode})`,
            nodeId: node.id,
        });

        if (loopMode === 'foreach') {
            const arrayVariable = node.config.loopArrayVariable || '';
            const iteratorName = node.config.loopIteratorVariable || 'item';

            if (!arrayVariable) {
                testMessages.push({
                    type: 'bot',
                    content: '⚠️ Bucle foreach sin variable de array configurada',
                    nodeId: node.id,
                });
                if (!isSubroutine) {
                    await moveToNextNode(node.id, 1);
                }
                return null;
            }

            const arrayData = getValueByPath(variables, arrayVariable);
            const items = Array.isArray(arrayData) ? arrayData : [];

            if (items.length === 0) {
                testMessages.push({
                    type: 'bot',
                    content: `🔄 Array "${arrayVariable}" vacio o no encontrado`,
                    nodeId: node.id,
                });
                if (!isSubroutine) {
                    await moveToNextNode(node.id, 1);
                }
                return null;
            }

            const newLoopState: LoopState = {
                mode: 'foreach',
                currentIndex: 0,
                items,
                iteratorName,
                count: items.length,
                results: [],
                accumulateResults,
                resultsVariable,
                maxIterations,
            };
            loopStates.set(node.id, newLoopState);
        } else if (loopMode === 'times') {
            const count = Math.min(node.config.loopCount || 1, maxIterations);
            const newLoopState: LoopState = {
                mode: 'times',
                currentIndex: 0,
                items: [],
                iteratorName: 'i',
                count,
                results: [],
                accumulateResults,
                resultsVariable,
                maxIterations,
            };
            loopStates.set(node.id, newLoopState);
        } else if (loopMode === 'while') {
            const conditionField = node.config.loopConditionField || '';
            const conditionOperator = node.config.loopConditionOperator || 'equals';
            const conditionValue = node.config.loopConditionValue || '';

            if (!conditionField) {
                testMessages.push({
                    type: 'bot',
                    content: '⚠️ Bucle while sin campo de condicion configurado',
                    nodeId: node.id,
                });
                if (!isSubroutine) {
                    await moveToNextNode(node.id, 1);
                }
                return null;
            }

            const fieldValue = getValueByPath(variables, conditionField);
            const shouldStart = evaluateCondition({
                fieldValue,
                operator: conditionOperator,
                compareValue: conditionValue,
                variables,
            });

            if (!shouldStart) {
                testMessages.push({
                    type: 'bot',
                    content: `✅ Bucle while: condicion inicial no cumplida`,
                    nodeId: node.id,
                });
                if (!isSubroutine) {
                    await moveToNextNode(node.id, 1);
                }
                return null;
            }

            const newLoopState: LoopState = {
                mode: 'while',
                currentIndex: 0,
                items: [],
                iteratorName: 'i',
                count: maxIterations,
                results: [],
                accumulateResults,
                resultsVariable,
                maxIterations,
                conditionField,
                conditionOperator,
                conditionValue,
            };
            loopStates.set(node.id, newLoopState);
        }
    }

    const currentLoopState = loopStates.get(node.id);
    if (!currentLoopState) {
        testMessages.push({
            type: 'bot',
            content: '⚠️ Estado de loop no valido',
            nodeId: node.id,
        });
        return null;
    }

    if (currentLoopState.mode === 'foreach' && currentLoopState.items.length > 0) {
        const item = currentLoopState.items[currentLoopState.currentIndex];
        variables[currentLoopState.iteratorName] = item;
    }
    variables['_loop_index'] = currentLoopState.currentIndex;
    variables['_loop_count'] = currentLoopState.count;

    testMessages.push({
        type: 'bot',
        content: `🔄 Iteracion ${currentLoopState.currentIndex + 1}/${currentLoopState.count}`,
        nodeId: node.id,
    });

    if (!isSubroutine) {
        await moveToNextNode(node.id, 0);
    }

    return null;
};

export default executeLoop;
