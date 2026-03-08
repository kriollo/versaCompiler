import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
import { getValueByPath } from '@/dashboard/js/chatbot/flowBuilder/utils/flowUtils';

const executeAiToolTemplateRender: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, variables } = context;

    const runtimeArgs = variables.__toolArgs || {};
    const sourceVariable = String(runtimeArgs.sourceVariable || node.config.toolInputVariable || '').trim();
    const template = String(runtimeArgs.template || node.config.toolTemplate || node.config.variableValue || '');
    const sourcePayload = sourceVariable ? getValueByPath(variables, sourceVariable) : variables;

    const rendered = template.replaceAll(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, rawPath: string) => {
        const value = getValueByPath(sourcePayload, rawPath.trim());
        return value === undefined || value === null ? '' : String(value);
    });

    const renderedStr = String(rendered || '');
    const preview = renderedStr.length > 100 ? `${renderedStr.slice(0, 100)}...` : renderedStr;

    testMessages.push({
        type: 'bot',
        content: `🔧 Template: "${preview}"`,
        nodeId: node.id,
        isDebug: true,
        rawResponse: { template, sourceVariable, rendered: renderedStr },
    });

    if (isSubroutine) {
        return { rendered };
    }

    await moveToNextNode(node.id, 0);
    return null;
};

export default executeAiToolTemplateRender;
