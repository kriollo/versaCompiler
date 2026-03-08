import type { NodeModule } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

import WebhookEditor from './WebhookEditor.vue';
import executeWebhook from './webhookLogic';

const webhookModule: NodeModule = {
    type: NodeType.WEBHOOK,
    editor: WebhookEditor,
    execute: executeWebhook,
};

export default webhookModule;
