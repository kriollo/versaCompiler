import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

/**
 * Lógica de ejecución para el nodo de Manejador de Errores.
 * En el simulador no hay errores reales, por lo que siempre avanza por el puerto 0 (éxito).
 * Puerto 0 = sin error (flujo normal). Puerto 1 = error capturado.
 */
const executeErrorHandler: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode } = context;
    const { config } = node;

    const errorHandlerEnabled = config.errorHandlerEnabled !== false;
    const catchAll = config.errorHandlerCatchAll || false;

    testMessages.push({
        type: 'bot',
        content: `🛡️ Error Handler activo (${catchAll ? 'catch-all' : 'selectivo'})`,
        nodeId: node.id,
        rawResponse: { enabled: errorHandlerEnabled, catchAll },
    });

    // En el simulador siempre tomamos el puerto 0 (ruta de éxito, sin errores reales)
    await moveToNextNode(node.id, 0);
    return null;
};

export default executeErrorHandler;
