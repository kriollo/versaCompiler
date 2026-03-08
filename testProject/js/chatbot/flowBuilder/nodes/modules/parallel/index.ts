import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import ParallelEditor from './ParallelEditor.vue';
import executeParallel from './parallelLogic';

const parallelModule: NodeModule = {
    type: NodeType.PARALLEL,
    editor: ParallelEditor,
    execute: executeParallel,
};

export default parallelModule;
