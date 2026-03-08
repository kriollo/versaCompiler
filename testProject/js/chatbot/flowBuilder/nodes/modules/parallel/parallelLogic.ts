import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

const executeParallel: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, connections, moveToNextNode } = context;

    const parallelConnections = connections.filter(
        c => c.sourceNodeId === node.id && c.sourcePortIndex >= 0 && c.sourcePortIndex < node.outputs,
    );

    if (parallelConnections.length === 0) {
        testMessages.push({
            type: 'bot',
            content: '⚠️ Paralelo sin ramas conectadas',
            nodeId: node.id,
        });
        return null;
    }

    testMessages.push({
        type: 'bot',
        content: `⚡ Ejecutando ${parallelConnections.length} ramas en paralelo`,
        nodeId: node.id,
    });

    // Ejecutar todas las ramas en paralelo y esperar a que terminen
    const branchPromises = parallelConnections.map(async connection => {
        try {
            await moveToNextNode(node.id, connection.sourcePortIndex);
        } catch (error) {
            console.error(`Error en rama paralela:`, error);
        }
    });

    // Esperar a que todas las ramas terminen
    await Promise.all(branchPromises);

    // NO llamar moveToNextNode genéricamente aquí - el MERGE u otro nodo receptor continuará el flujo
    return null;
};

export default executeParallel;
