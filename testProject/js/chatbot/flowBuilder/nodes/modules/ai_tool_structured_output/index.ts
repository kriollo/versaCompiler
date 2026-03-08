import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import AiToolStructuredOutputEditor from './AiToolStructuredOutputEditor.vue';
import executeAiToolStructuredOutput from './aiToolStructuredOutputLogic';

const aiToolStructuredOutputModule: NodeModule = {
    type: NodeType.AI_TOOL_STRUCTURED_OUTPUT,
    editor: AiToolStructuredOutputEditor,
    execute: executeAiToolStructuredOutput,
};

export default aiToolStructuredOutputModule;
