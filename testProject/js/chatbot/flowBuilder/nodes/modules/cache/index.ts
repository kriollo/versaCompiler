import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import CacheEditor from './CacheEditor.vue';
import executeCache from './cacheLogic';

const cacheModule: NodeModule = {
    type: NodeType.CACHE,
    editor: CacheEditor,
    execute: executeCache,
};

export default cacheModule;
