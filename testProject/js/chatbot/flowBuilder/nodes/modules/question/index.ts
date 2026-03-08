import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import QuestionEditor from './QuestionEditor.vue';
import executeQuestion from './questionLogic';

const questionModule: NodeModule = {
    type: NodeType.QUESTION,
    editor: QuestionEditor,
    execute: executeQuestion,
};

export default questionModule;
