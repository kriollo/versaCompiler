import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

/**
 * Lógica de ejecución para el nodo de Fin.
 * Finaliza la ejecución del flujo actual.
 * Si está en un subflujo (flujo vinculado), regresa al flujo padre.
 */
const executeEnd: ExecuteFn = (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, stopExecution, isSubroutine } = context;

    if (isSubroutine) {
        testMessages.push({
            type: 'bot',
            content: '✅ Fin del flujo vinculado',
            nodeId: node.id,
        });
        // En el simulador, el regreso se maneja por la pila de ejecución,
        // Pero aquí marcamos el fin del contexto actual.
    } else {
        testMessages.push({
            type: 'bot',
            content: '✅ Flujo finalizado',
            nodeId: node.id,
        });
        stopExecution('Flujo finalizado');
    }
    return Promise.resolve(null);
};

export default executeEnd;
