import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import ErrorHandlerEditor from './ErrorHandlerEditor.vue';
import executeErrorHandler from './errorHandlerLogic';

const errorHandlerModule: NodeModule = {
    type: NodeType.ERROR_HANDLER,
    editor: ErrorHandlerEditor,
    execute: executeErrorHandler,
};

export default errorHandlerModule;
