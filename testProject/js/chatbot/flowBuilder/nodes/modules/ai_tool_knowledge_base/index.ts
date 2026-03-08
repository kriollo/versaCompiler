import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import AiToolKnowledgeBaseEditor from './AiToolKnowledgeBaseEditor.vue';
import executeAiToolKnowledgeBase from './aiToolKnowledgeBaseLogic';

const aiToolKnowledgeBaseModule: NodeModule = {
    type: NodeType.AI_TOOL_KNOWLEDGE_BASE,
    editor: AiToolKnowledgeBaseEditor,
    execute: executeAiToolKnowledgeBase,
};

export default aiToolKnowledgeBaseModule;
