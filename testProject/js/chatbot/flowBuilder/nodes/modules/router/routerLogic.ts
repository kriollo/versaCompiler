import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
import { getValueByPath } from '@/dashboard/js/chatbot/flowBuilder/utils/flowUtils';

const executeRouter: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, variables } = context;

    const routerVariable = (node.config.routerVariable || '').trim();
    const routerCases = node.config.routerCases || [];
    const useDefaultOutput = node.config.routerDefaultOutput !== false;
    let selectedOutputIndex = useDefaultOutput ? routerCases.length : 0;

    if (routerVariable && routerCases.length > 0) {
        const rawValue = getValueByPath(variables, routerVariable);
        const actualValue = String(rawValue ?? '')
            .trim()
            .toLowerCase();

        const matchedIndex = routerCases.findIndex(caseItem => {
            const caseValue = String(caseItem.value || '')
                .trim()
                .toLowerCase();
            return caseValue !== '' && actualValue === caseValue;
        });

        if (matchedIndex !== -1) {
            selectedOutputIndex = matchedIndex;
            testMessages.push({
                type: 'bot',
                content: `🔀 Router: "${routerVariable}" = "${rawValue}" → Puerto ${matchedIndex + 1}`,
                nodeId: node.id,
                rawResponse: {
                    variable: routerVariable,
                    value: rawValue,
                    matchedCase: routerCases[matchedIndex],
                },
            });
        } else {
            testMessages.push({
                type: 'bot',
                content: `🔀 Router: "${routerVariable}" = "${rawValue}" → Por defecto`,
                nodeId: node.id,
                rawResponse: { variable: routerVariable, value: rawValue, matchedCase: null },
            });
        }
    } else {
        testMessages.push({
            type: 'bot',
            content: '⚠️ Router sin configurar. Se usa salida por defecto.',
            nodeId: node.id,
        });
    }

    if (!isSubroutine) {
        await moveToNextNode(node.id, selectedOutputIndex);
    }

    return null;
};

export default executeRouter;
