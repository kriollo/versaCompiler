import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

type MathOperation =
    | 'add'
    | 'subtract'
    | 'multiply'
    | 'divide'
    | 'power'
    | 'sqrt'
    | 'round'
    | 'percentage'
    | 'modulo'
    | 'abs';

/**
 * Evalúa una expresión matemática simple de forma segura.
 * Solo permite números, operadores básicos y paréntesis.
 */
const safeEvaluate = (expression: string): number => {
    const sanitized = expression.replaceAll(/[^0-9+\-*/().%\s]/g, '');
    if (!sanitized) {
        throw new Error('Expresión vacía o inválida');
    }
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${sanitized})`)();
    if (typeof result !== 'number' || !Number.isFinite(result)) {
        throw new TypeError('El resultado no es un número finito');
    }
    return result;
};

const executeAiToolMath: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, variables } = context;

    const runtimeArgs = variables.__toolArgs || {};

    const operation: MathOperation = (runtimeArgs.operation || node.config.mathOperation || 'add') as MathOperation;
    const a = Number(runtimeArgs.a ?? runtimeArgs.value ?? node.config.mathValueA ?? 0);
    const b = Number(runtimeArgs.b ?? runtimeArgs.operand ?? node.config.mathValueB ?? 0);
    const decimals = Number(runtimeArgs.decimals ?? node.config.mathDecimals ?? 2);
    const expression = String(runtimeArgs.expression || node.config.mathExpression || '');
    const outputVariable = String(node.config.mathOutputVariable || '__math_result');

    let result = 0;
    let errorMessage = '';

    try {
        switch (operation) {
            case 'add': {
                result = a + b;
                break;
            }
            case 'subtract': {
                result = a - b;
                break;
            }
            case 'multiply': {
                result = a * b;
                break;
            }
            case 'divide': {
                if (b === 0) {
                    throw new Error('Division por cero');
                }
                result = a / b;
                break;
            }
            case 'power': {
                result = a ** b;
                break;
            }
            case 'sqrt': {
                if (a < 0) {
                    throw new Error('No se puede calcular raiz cuadrada de numero negativo');
                }
                result = Math.sqrt(a);
                break;
            }
            case 'round': {
                result = Number(a.toFixed(decimals));
                break;
            }
            case 'percentage': {
                result = (a / 100) * b;
                break;
            }
            case 'modulo': {
                if (b === 0) {
                    throw new Error('Modulo por cero');
                }
                result = a % b;
                break;
            }
            case 'abs': {
                result = Math.abs(a);
                break;
            }
            default: {
                if (expression) {
                    result = safeEvaluate(expression);
                } else {
                    throw new Error(`Operacion desconocida: ${operation}`);
                }
            }
        }
    } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Error en calculo matematico';
        result = Number.NaN;
    }

    if (!errorMessage && Number.isFinite(result)) {
        variables[outputVariable] = result;
    }

    const resultData: Record<string, unknown> = errorMessage
        ? { success: false, error: errorMessage, operation, a, b }
        : { success: true, result, operation, a, b };

    testMessages.push({
        type: 'bot',
        content: errorMessage
            ? `🧮 [Matematica] Error: ${errorMessage}`
            : `🧮 [Matematica] ${operation}(${expression || `${a}, ${b}`}) = ${result}`,
        nodeId: node.id,
        rawResponse: resultData,
    });

    if (isSubroutine) {
        return resultData;
    }

    await moveToNextNode(node.id, 0);
    return null;
};

export default executeAiToolMath;
