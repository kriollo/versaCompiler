import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import AiToolHttpEditor from './AiToolHttpEditor.vue';
import executeAiToolHttp from './aiToolHttpLogic';

const aiToolHttpModule: NodeModule = {
    type: NodeType.AI_TOOL_HTTP,
    editor: AiToolHttpEditor,
    execute: executeAiToolHttp,
};

export default aiToolHttpModule;
