import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import AiToolWaitInputEditor from './AiToolWaitInputEditor.vue';
import executeAiToolWaitInput from './aiToolWaitInputLogic';

const aiToolWaitInputModule: NodeModule = {
    type: NodeType.AI_TOOL_WAIT_INPUT,
    editor: AiToolWaitInputEditor,
    execute: executeAiToolWaitInput,
};

export default aiToolWaitInputModule;
