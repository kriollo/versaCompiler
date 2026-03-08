import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

/**
 * Lógica de ejecución para el nodo de Flujo Vinculado.
 * En el simulador, delega la carga y ejecución al sistema de gestión de flujos.
 */
const executeFlow: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, currentNodeId } = context;
    const { config } = node;

    const flowId = config.linkedFlowId;
    const flowName = config.linkedFlowName || 'Sin nombre';

    if (!flowId) {
        testMessages.push({
            type: 'bot',
            content: '⚠️ No se ha seleccionado ningún flujo para vincular',
            nodeId: node.id,
        });
        await moveToNextNode(currentNodeId, 0);
        return null;
    }

    testMessages.push({
        type: 'bot',
        content: `🔗 Ejecutando flujo vinculado: "${flowName}" (ID: ${flowId})...`,
        nodeId: node.id,
    });

    // En el simulador actual (FlowTestModal), la ejecución de flujos vinculados
    // Requiere que el simulador maneje la carga.
    // Por ahora, el simulador interceptará este nodo si no se llama a moveToNextNode
    // O si implementamos un mecanismo de "subrutina" en el contexto.

    // Si el simulador soporta subrutinas, podríamos hacer algo como:
    // Await context.executeLinkedFlow(flowId);

    // Por simplicidad en esta fase, dejamos que el simulador siga manejando
    // La lógica pesada de reemplazo de nodos si no llamamos a moveToNextNode aquí,
    // Pero idealmente el simulador debería ser el que use este módulo.

    // NOTA: Para que FlowTestModal use este módulo correctamente,
    // FlowTestModal.vue ha sido adaptado para pasar lo necesario.

    // Si NO llamamos a moveToNextNode, el simulador puede detectar que es un
    // Nodo de tipo FLOW y hacer su magia de carga de subflujo.
    return null;
};

export default executeFlow;
