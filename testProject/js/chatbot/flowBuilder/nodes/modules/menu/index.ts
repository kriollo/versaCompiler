import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import MenuEditor from './MenuEditor.vue';
import executeMenu from './menuLogic';

const menuModule: NodeModule = {
    type: NodeType.MENU,
    editor: MenuEditor,
    execute: executeMenu,
};

export default menuModule;
