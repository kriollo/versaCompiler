import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import AiToolMathEditor from './AiToolMathEditor.vue';
import executeAiToolMath from './aiToolMathLogic';

const aiToolMathModule: NodeModule = {
    type: NodeType.AI_TOOL_MATH,
    editor: AiToolMathEditor,
    execute: executeAiToolMath,
};

export default aiToolMathModule;
