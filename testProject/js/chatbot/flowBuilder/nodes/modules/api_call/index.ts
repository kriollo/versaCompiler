import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import ApiCallEditor from './ApiCallEditor.vue';
import executeApiCall from './apiCallLogic';

const apiCallModule: NodeModule = {
    type: NodeType.API_CALL,
    editor: ApiCallEditor,
    execute: executeApiCall,
};

export default apiCallModule;
