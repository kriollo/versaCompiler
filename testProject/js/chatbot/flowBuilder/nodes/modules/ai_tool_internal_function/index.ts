import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import AiToolInternalFunctionEditor from './AiToolInternalFunctionEditor.vue';
import executeAiToolInternalFunction from './aiToolInternalFunctionLogic';

const aiToolInternalFunctionModule: NodeModule = {
    type: NodeType.AI_TOOL_INTERNAL_FUNCTION,
    editor: AiToolInternalFunctionEditor,
    execute: executeAiToolInternalFunction,
};

export default aiToolInternalFunctionModule;
