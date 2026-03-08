import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

const executeStart: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { moveToNextNode } = context;
    // El nodo de inicio siempre tiene una sola salida principal.
    await moveToNextNode(node.id, 0);
    return null;
};

export default executeStart;
