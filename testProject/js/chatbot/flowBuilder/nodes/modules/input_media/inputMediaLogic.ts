import type {
    ExecuteFn,
    ExecutionContext,
    ExecutionResult,
} from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

const executeInputMedia: ExecuteFn = (node: FlowNode, context: ExecutionContext): Promise<ExecutionResult | null> => {
    const { testMessages, setWaitingNode, replaceVariables } = context;

    const types = (node.config.inputMediaTypes as string[]) ?? ['any'];
    const labelMap: Record<string, string> = {
        image: '🖼️ imagen',
        audio: '🎧 audio',
        video: '🎬 video',
        document: '📄 documento',
        location: '📍 ubicación',
        any: 'archivo',
    };

    const acceptedLabels = types.map(t => labelMap[t] ?? t).join(', ');
    const prompt = node.config.inputMediaPrompt
        ? replaceVariables(node.config.inputMediaPrompt as string)
        : `Por favor envía un(a) ${acceptedLabels}.`;

    testMessages.push({
        type: 'bot',
        content: prompt,
        nodeId: node.id,
    });

    // Pausar el flujo y esperar que el usuario suba un archivo o escriba una URL
    setWaitingNode(node.id);

    return Promise.resolve(null);
};

export default executeInputMedia;
