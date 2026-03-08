import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import AiToolConditionEvalEditor from './AiToolConditionEvalEditor.vue';
import executeAiToolConditionEval from './aiToolConditionEvalLogic';

const aiToolConditionEvalModule: NodeModule = {
    type: NodeType.AI_TOOL_CONDITION_EVAL,
    editor: AiToolConditionEvalEditor,
    execute: executeAiToolConditionEval,
};

export default aiToolConditionEvalModule;
