import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import AiAgentEditor from './AiAgentEditor.vue';
import executeAiAgent from './aiAgentLogic';

const aiAgentModule: NodeModule = {
    type: NodeType.AI_AGENT,
    editor: AiAgentEditor,
    execute: executeAiAgent,
};

export default aiAgentModule;
