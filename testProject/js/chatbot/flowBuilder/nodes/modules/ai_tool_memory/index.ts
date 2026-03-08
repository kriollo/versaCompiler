import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import AiToolMemoryEditor from './AiToolMemoryEditor.vue';
import executeAiToolMemory from './aiToolMemoryLogic';

const aiToolMemoryModule: NodeModule = {
    type: NodeType.AI_TOOL_MEMORY,
    editor: AiToolMemoryEditor,
    execute: executeAiToolMemory,
};

export default aiToolMemoryModule;
