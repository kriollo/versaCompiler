import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import ConditionEditor from './ConditionEditor.vue';
import conditionLogic from './conditionLogic';

const conditionModule: NodeModule = {
    type: NodeType.CONDITION,
    editor: ConditionEditor,
    execute: conditionLogic,
};

export default conditionModule;
