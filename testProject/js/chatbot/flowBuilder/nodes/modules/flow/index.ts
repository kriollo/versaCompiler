import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import FlowEditor from './FlowEditor.vue';
import executeFlow from './flowLogic';

const flowModule: NodeModule = {
    type: NodeType.FLOW,
    editor: FlowEditor,
    execute: executeFlow,
};

export default flowModule;
