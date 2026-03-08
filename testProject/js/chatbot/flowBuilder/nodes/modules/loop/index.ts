import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import LoopEditor from './LoopEditor.vue';
import executeLoop from './loopLogic';

const loopModule: NodeModule = {
    type: NodeType.LOOP,
    editor: LoopEditor,
    execute: executeLoop,
};

export default loopModule;
