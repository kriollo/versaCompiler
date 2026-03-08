import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import JsonMenuEditor from './JsonMenuEditor.vue';
import executeJsonMenu from './jsonMenuLogic';

const jsonMenuModule: NodeModule = {
    type: NodeType.JSON_MENU,
    editor: JsonMenuEditor,
    execute: executeJsonMenu,
};

export default jsonMenuModule;
