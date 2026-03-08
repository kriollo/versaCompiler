import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
import {
    buildInteractiveMessagePreview,
    buildTemplatePreview,
    replaceVariables,
} from '@/dashboard/js/chatbot/flowBuilder/utils/flowUtils';

const executeMessage: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { variables, testMessages, isSubroutine, moveToNextNode } = context;
    const messageType = node.config.messageType || 'text';
    const content = replaceVariables(node.config.message || '', variables);
    const channelType = node.config.messageChannelType || 'standard';

    if (channelType === 'template') {
        testMessages.push({
            type: 'bot',
            content: buildTemplatePreview(node, variables),
            nodeId: node.id,
        });
        if (!isSubroutine) {
            await moveToNextNode(node.id, 0);
        }
        return null;
    }

    if (messageType === 'text') {
        testMessages.push({
            type: 'bot',
            content: buildInteractiveMessagePreview(node, content),
            nodeId: node.id,
        });
    } else {
        const mediaUrl = replaceVariables(node.config.messageMediaUrl || '', variables);
        const fileName = node.config.messageFileName ? ` (${node.config.messageFileName})` : '';
        let mediaLabel = `📎 Archivo${fileName}`;

        if (messageType === 'image') {
            mediaLabel = '🖼️ Imagen';
        } else if (messageType === 'video') {
            mediaLabel = '🎬 Video';
        } else if (messageType === 'audio') {
            mediaLabel = '🎧 Audio';
        }

        testMessages.push({
            type: 'bot',
            content: mediaUrl ? content : `${mediaLabel}\n(sin URL configurada)${content ? `\n\n${content}` : ''}`,
            nodeId: node.id,
            mediaType: messageType,
            mediaUrl: mediaUrl || undefined,
            fileName: node.config.messageFileName,
        });
    }

    if (!isSubroutine) {
        await moveToNextNode(node.id, 0);
    }
    return null;
};

export default executeMessage;
