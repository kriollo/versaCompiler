import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import MessageEditor from './MessageEditor.vue';
import executeMessage from './messageLogic';

const messageModule: NodeModule = {
    type: NodeType.MESSAGE,
    editor: MessageEditor,
    execute: executeMessage,
};

export default messageModule;
