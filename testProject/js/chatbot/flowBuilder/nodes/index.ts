import { nodeRegistry } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/nodeRegistry.js';
import { NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes.js';

/**
 * Registra todos los módulos de nodos disponibles en el sistema.
 * Utilizamos registerLoader para carga diferida (lazy loading) en el navegador.
 */
export const initNodeRegistry = (): void => {
    nodeRegistry.registerLoader(
        NodeType.START,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/start/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.MESSAGE,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/message/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.QUESTION,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/question/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.MENU,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/menu/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.JSON_MENU,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/json_menu/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.END,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/end/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.DELAY,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/delay/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.WEBHOOK,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/webhook/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.FLOW,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/flow/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.ERROR_HANDLER,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/error_handler/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.CONDITION,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/condition/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.ROUTER,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/router/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.API_CALL,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/api_call/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.VARIABLE,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/variable/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.SEND_TO,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/send_to/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.LIST_RENDER,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/list_render/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.LOOP,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/loop/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.PARALLEL,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/parallel/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.RATING,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/rating/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.CACHE,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/cache/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.MERGE,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/merge/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.AI_AGENT,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/ai_agent/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.AI_TOOL_VARIABLE,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/ai_tool_variable/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.AI_TOOL_JSON_EXTRACT,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/ai_tool_json_extract/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.AI_TOOL_TEMPLATE_RENDER,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/ai_tool_template_render/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.AI_TOOL_CONDITION_EVAL,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/ai_tool_condition_eval/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.AI_TOOL_DATETIME,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/ai_tool_datetime/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.AI_TOOL_TEXT_UTILS,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/ai_tool_text_utils/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.AI_TOOL_HTTP,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/ai_tool_http/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.INPUT_MEDIA,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/input_media/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.AI_TOOL_MEMORY,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/ai_tool_memory/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.AI_TOOL_SEND_MESSAGE,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/ai_tool_send_message/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.AI_TOOL_WAIT_INPUT,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/ai_tool_wait_input/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.AI_TOOL_KNOWLEDGE_BASE,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/ai_tool_knowledge_base/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.AI_TOOL_MATH,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/ai_tool_math/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.AI_TOOL_STRUCTURED_OUTPUT,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/ai_tool_structured_output/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.INTERNAL_FUNCTION,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/internal_function/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.AI_TOOL_INTERNAL_FUNCTION,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/ai_tool_internal_function/index.js'),
    );
    nodeRegistry.registerLoader(
        NodeType.CUSTOMER_REGISTER,
        () => import('@/dashboard/js/chatbot/flowBuilder/nodes/modules/customer_register/index.js'),
    );

    // Todos los módulos han sido migrados.
};

export { nodeRegistry } from './core/nodeRegistry.js';
export * from './core/baseNode.js';
