import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import AiToolJsonExtractEditor from './AiToolJsonExtractEditor.vue';
import executeAiToolJsonExtract from './aiToolJsonExtractLogic';

const aiToolJsonExtractModule: NodeModule = {
    type: NodeType.AI_TOOL_JSON_EXTRACT,
    editor: AiToolJsonExtractEditor,
    execute: executeAiToolJsonExtract,
};

export default aiToolJsonExtractModule;
