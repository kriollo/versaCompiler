import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import AiToolVariableEditor from './AiToolVariableEditor.vue';
import executeAiToolVariable from './aiToolVariableLogic';

const aiToolVariableModule: NodeModule = {
    type: NodeType.AI_TOOL_VARIABLE,
    editor: AiToolVariableEditor,
    execute: executeAiToolVariable,
};

export default aiToolVariableModule;
