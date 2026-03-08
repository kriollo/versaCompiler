import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import AiToolDatetimeEditor from './AiToolDatetimeEditor.vue';
import executeAiToolDatetime from './aiToolDatetimeLogic';

const aiToolDatetimeModule: NodeModule = {
    type: NodeType.AI_TOOL_DATETIME,
    editor: AiToolDatetimeEditor,
    execute: executeAiToolDatetime,
};

export default aiToolDatetimeModule;
