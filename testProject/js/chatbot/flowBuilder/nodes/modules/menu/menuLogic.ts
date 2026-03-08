import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

const executeMenu: ExecuteFn = (node: FlowNode, context: ExecutionContext) => {
    const { replaceVariables, testMessages, setWaitingNode, variables } = context;

    if (node.config.menuTitle) {
        let menuText = `${replaceVariables(node.config.menuTitle)}\n\n`;

        if (node.config.menuOptions) {
            const activeOptions = node.config.menuOptions.filter((option: any) => !option.disabled);
            activeOptions.forEach((option: any, index: number) => {
                menuText += `${index + 1}. ${option.label}\n`;
                if (option.description) {
                    menuText += `   ${option.description}\n`;
                }
            });
            variables.__menuOptions = activeOptions;
        }

        menuText += '\n💡 Responde con el número de la opción.';

        testMessages.push({
            type: 'bot',
            content: menuText,
            nodeId: node.id,
        });

        variables.__menuTitle = replaceVariables(node.config.menuTitle);
    } else if (node.config.menuOptions) {
        const activeOptions = node.config.menuOptions.filter((option: any) => !option.disabled);
        variables.__menuOptions = activeOptions;
    }

    setWaitingNode(node.id);
    return Promise.resolve(null);
};

export default executeMenu;
