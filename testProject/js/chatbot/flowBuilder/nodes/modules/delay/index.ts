import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import DelayEditor from './DelayEditor.vue';
import executeDelay from './delayLogic';

const delayModule: NodeModule = {
    type: NodeType.DELAY,
    editor: DelayEditor,
    execute: executeDelay,
};

export default delayModule;
