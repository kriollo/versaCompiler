import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import RouterEditor from './RouterEditor.vue';
import executeRouter from './routerLogic';

const routerModule: NodeModule = {
    type: NodeType.ROUTER,
    editor: RouterEditor,
    execute: executeRouter,
};

export default routerModule;
