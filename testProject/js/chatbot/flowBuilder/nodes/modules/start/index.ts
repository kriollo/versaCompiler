import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import StartEditor from './StartEditor.vue';
import executeStart from './startLogic';

const startModule: NodeModule = {
    type: NodeType.START,
    editor: StartEditor,
    execute: executeStart,
};

export default startModule;
