import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import InputMediaEditor from './InputMediaEditor.vue';
import executeInputMedia from './inputMediaLogic';

const inputMediaModule: NodeModule = {
    type: NodeType.INPUT_MEDIA,
    editor: InputMediaEditor,
    execute: executeInputMedia,
};

export default inputMediaModule;
