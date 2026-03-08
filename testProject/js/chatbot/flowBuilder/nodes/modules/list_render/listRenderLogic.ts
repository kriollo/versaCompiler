import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

const executeListRender: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, variables, replaceVariables } = context;

    const sourceVarName = node.config.listRenderSourceVariable || '';
    const listPath = node.config.listRenderPath || '';
    const header = node.config.listRenderHeader ? replaceVariables(String(node.config.listRenderHeader)) : '';
    const itemTemplate = node.config.listRenderItemTemplate || '';
    const footer = node.config.listRenderFooter ? replaceVariables(String(node.config.listRenderFooter)) : '';
    const rawSeparator = node.config.listRenderSeparator;
    const separator =
        rawSeparator !== undefined && rawSeparator !== null
            ? String(rawSeparator).replaceAll(String.raw`\n`, '\n')
            : '\n';
    const maxItems = node.config.listRenderMaxItems || 50;
    const outputVar = node.config.listRenderOutputVariable || '';
    const sendMessage = node.config.listRenderSendMessage !== false;

    if (!sourceVarName) {
        testMessages.push({
            type: 'bot',
            content: '❌ List Render: sin variable fuente configurada.',
            nodeId: node.id,
        });
        await moveToNextNode(node.id, 0);
        return null;
    }

    let sourceData: unknown = variables[sourceVarName];

    if (listPath) {
        sourceData = listPath.split('.').reduce<unknown>((acc, key) => {
            if (acc !== null && typeof acc === 'object') {
                return (acc as Record<string, unknown>)[key];
            }
            return acc;
        }, sourceData);
    }

    if (!Array.isArray(sourceData)) {
        testMessages.push({
            type: 'bot',
            content: `❌ List Render: la variable «${sourceVarName}${listPath ? `.${listPath}` : ''}» no es un array.`,
            nodeId: node.id,
        });
        await moveToNextNode(node.id, 0);
        return null;
    }

    const items = sourceData.slice(0, maxItems) as Record<string, unknown>[];

    const renderedItems = items.map(item =>
        itemTemplate.replaceAll(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, key: string) => {
            const val = item[key.trim()];
            return val !== undefined && val !== null ? String(val) : `{{${key.trim()}}}`;
        }),
    );

    const parts: string[] = [];
    if (header) {
        parts.push(header);
    }
    parts.push(renderedItems.join(separator));
    if (footer) {
        parts.push(footer);
    }
    const fullText = parts.join('\n');

    if (outputVar) {
        variables[outputVar] = fullText;
    }

    if (sendMessage) {
        testMessages.push({ type: 'bot', content: fullText, nodeId: node.id });
    } else {
        testMessages.push({
            type: 'bot',
            content: `📋 Lista generada (${items.length} ítems) guardada en «${outputVar || 'N/A'}»`,
            nodeId: node.id,
            isDebug: true,
        });
    }

    if (!isSubroutine) {
        await moveToNextNode(node.id, 0);
    }

    return null;
};

export default executeListRender;
