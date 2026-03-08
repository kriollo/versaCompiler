import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import AiToolTextUtilsEditor from './AiToolTextUtilsEditor.vue';
import executeAiToolTextUtils from './aiToolTextUtilsLogic';

const aiToolTextUtilsModule: NodeModule = {
    type: NodeType.AI_TOOL_TEXT_UTILS,
    editor: AiToolTextUtilsEditor,
    execute: executeAiToolTextUtils,
};

export default aiToolTextUtilsModule;
