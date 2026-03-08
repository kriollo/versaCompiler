import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import VariableEditor from './VariableEditor.vue';
import executeVariable from './variableLogic';

const variableModule: NodeModule = {
    type: NodeType.VARIABLE,
    editor: VariableEditor,
    execute: executeVariable,
};

export default variableModule;
