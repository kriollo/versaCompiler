import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import AiToolTemplateRenderEditor from './AiToolTemplateRenderEditor.vue';
import executeAiToolTemplateRender from './aiToolTemplateRenderLogic';

const aiToolTemplateRenderModule: NodeModule = {
    type: NodeType.AI_TOOL_TEMPLATE_RENDER,
    editor: AiToolTemplateRenderEditor,
    execute: executeAiToolTemplateRender,
};

export default aiToolTemplateRenderModule;
