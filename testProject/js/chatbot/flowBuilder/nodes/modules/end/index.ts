import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import EndEditor from './EndEditor.vue';
import executeEnd from './endLogic';

const endModule: NodeModule = {
    type: NodeType.END,
    editor: EndEditor,
    execute: executeEnd,
};

export default endModule;
