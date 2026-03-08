import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import SendToEditor from './SendToEditor.vue';
import executeSendTo from './sendToLogic';

const sendToModule: NodeModule = {
    type: NodeType.SEND_TO,
    editor: SendToEditor,
    execute: executeSendTo,
};

export default sendToModule;
