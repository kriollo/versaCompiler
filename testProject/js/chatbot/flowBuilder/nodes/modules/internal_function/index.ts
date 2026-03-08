import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import InternalFunctionEditor from './InternalFunctionEditor.vue';
import executeInternalFunction from './internalFunctionLogic';

const internalFunctionModule: NodeModule = {
    type: NodeType.INTERNAL_FUNCTION,
    editor: InternalFunctionEditor,
    execute: executeInternalFunction,
};

export default internalFunctionModule;
