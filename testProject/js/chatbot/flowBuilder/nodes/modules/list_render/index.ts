import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import ListRenderEditor from './ListRenderEditor.vue';
import executeListRender from './listRenderLogic';

const listRenderModule: NodeModule = {
    type: NodeType.LIST_RENDER,
    editor: ListRenderEditor,
    execute: executeListRender,
};

export default listRenderModule;
