import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

const executeQuestion: ExecuteFn = (node: FlowNode, context: ExecutionContext) => {
    const { replaceVariables, testMessages, setWaitingNode } = context;

    if (node.config.question) {
        testMessages.push({
            type: 'bot',
            content: replaceVariables(node.config.question),
            nodeId: node.id,
        });
    }

    setWaitingNode(node.id);

    return Promise.resolve(null);
};

export default executeQuestion;
