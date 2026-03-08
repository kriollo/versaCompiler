import { defineAsyncComponent } from 'vue';

import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import { executeRating } from './ratingLogic';

const ratingModule: NodeModule = {
    type: NodeType.RATING,
    editor: defineAsyncComponent(() => import('./RatingEditor.vue')),
    execute: executeRating,
};

export default ratingModule;
