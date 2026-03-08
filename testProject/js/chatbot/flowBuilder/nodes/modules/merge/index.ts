import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import MergeEditor from './MergeEditor.vue';
import executeMerge from './mergeLogic';

const mergeModule: NodeModule = {
    type: NodeType.MERGE,
    editor: MergeEditor,
    execute: executeMerge,
};

export default mergeModule;
