import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

const executeAiToolDatetime: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, variables } = context;

    const runtimeArgs = variables.__toolArgs || {};
    const timezone = String(runtimeArgs.timezone || node.config.toolTimezone || 'America/Santiago');
    const format = String(runtimeArgs.format || node.config.toolDateFormat || 'iso');
    const addMinutes = Number(runtimeArgs.addMinutes || 0);
    const addDays = Number(runtimeArgs.addDays || 0);

    const date = new Date();
    if (Number.isFinite(addDays) && addDays !== 0) {
        date.setDate(date.getDate() + addDays);
    }
    if (Number.isFinite(addMinutes) && addMinutes !== 0) {
        date.setMinutes(date.getMinutes() + addMinutes);
    }

    let formatted = date.toISOString();
    try {
        formatted = new Intl.DateTimeFormat('es-CL', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }).format(date);
    } catch {
        formatted = date.toISOString();
    }

    const result = {
        iso: date.toISOString(),
        epoch: date.getTime(),
        timezone,
        formatted,
        format,
    };

    testMessages.push({
        type: 'bot',
        content: '🛠️ [Herramienta] DateTime ejecutada',
        nodeId: node.id,
        rawResponse: result,
    });

    if (isSubroutine) {
        return result;
    }

    await moveToNextNode(node.id, 0);
    return null;
};

export default executeAiToolDatetime;
