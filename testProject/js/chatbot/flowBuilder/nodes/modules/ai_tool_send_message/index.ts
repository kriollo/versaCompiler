import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import AiToolSendMessageEditor from './AiToolSendMessageEditor.vue';
import executeAiToolSendMessage from './aiToolSendMessageLogic';

const aiToolSendMessageModule: NodeModule = {
    type: NodeType.AI_TOOL_SEND_MESSAGE,
    editor: AiToolSendMessageEditor,
    execute: executeAiToolSendMessage,
};

export default aiToolSendMessageModule;
