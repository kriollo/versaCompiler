import type { ExecutionContext, ExecutionResult } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

/**
 * Ejecuta la lógica del nodo Rating en el simulador
 */
export function executeRating(node: FlowNode, context: ExecutionContext): Promise<ExecutionResult | null> {
    const { ratingMessage, ratingMin, ratingMax } = node.config;

    const message = context.replaceVariables(ratingMessage || 'Por favor, ingresa una nota:');
    const min = ratingMin ?? 1;
    const max = ratingMax ?? 5;

    // Mostrar el mensaje al usuario
    context.testMessages.push({
        type: 'bot',
        content: `${message} (Mínimo: ${min}, Máximo: ${max})`,
        nodeId: node.id,
    });

    // Ysperar entrada del usuario
    if (context.waitForUserInput) {
        context.waitForUserInput(node.id);
    }

    // Guardar estado interno para saber que estamos esperando un rating
    context.variables._waitingForRating = true;

    return Promise.resolve(null);
}

/**
 * Procesa la respuesta del usuario para el nodo Rating
 */
export function handleRatingResponse(node: FlowNode, input: string, context: ExecutionContext): boolean {
    const { ratingMin, ratingMax, ratingVariable, ratingErrorMessage } = node.config;
    const min = ratingMin ?? 1;
    const max = ratingMax ?? 5;
    const val = Number(input.trim());

    if (Number.isNaN(val) || val < min || val > max) {
        const errorMsg = context.replaceVariables(ratingErrorMessage || 'Por favor, ingresa una nota válida.');
        context.testMessages.push({
            type: 'bot',
            content: errorMsg,
            nodeId: node.id,
        });
        return false;
    }

    if (ratingVariable) {
        context.variables[ratingVariable] = val;
    }

    delete context.variables._waitingForRating;
    return true;
}
