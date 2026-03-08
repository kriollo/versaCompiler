import type {
    ExecuteFn,
    ExecutionContext,
    ExecutionResult,
} from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

const executeAiToolWaitInput: ExecuteFn = (
    node: FlowNode,
    context: ExecutionContext,
): Promise<ExecutionResult | null> => {
    const {
        testMessages,
        isSubroutine,
        variables,
        replaceVariables,
        setWaitingNode,
        waitForInput,
        isWaitingForInput,
        getLastUserMessage,
    } = context;

    const runtimeArgs = variables.__toolArgs || {};

    const rawQuestion = String(runtimeArgs.question || node.config.toolWaitQuestion || '');
    const question = replaceVariables(rawQuestion);
    const variableName = String(runtimeArgs.variableName || node.config.toolWaitVariable || '__agent_user_input');
    const validationType = String(runtimeArgs.validation || node.config.toolWaitValidation || 'text');

    const isWaiting = isWaitingForInput?.(node.id);

    if (isWaiting) {
        const lastUserMessage = getLastUserMessage?.();

        if (lastUserMessage) {
            variables[variableName] = lastUserMessage;
            variables.__agent_waiting_input = false;

            const preview = lastUserMessage.length > 50 ? `${lastUserMessage.slice(0, 50)}...` : lastUserMessage;

            testMessages.push({
                type: 'bot',
                content: `✅ Respuesta recibida: "${preview}"`,
                nodeId: node.id,
                isDebug: true,
            });

            if (isSubroutine) {
                return Promise.resolve({
                    received: true,
                    input: lastUserMessage,
                    variable: variableName,
                });
            }

            return Promise.resolve(null);
        }
    }

    if (question) {
        testMessages.push({
            type: 'bot',
            content: question,
            nodeId: node.id,
        });
    }

    variables.__agent_waiting_input = true;
    variables.__agent_waiting_variable = variableName;
    variables.__agent_waiting_nodeId = node.id;
    variables.__agent_waiting_validation = validationType;

    testMessages.push({
        type: 'bot',
        content: `⏳ Esperando respuesta del usuario...`,
        nodeId: node.id,
        isDebug: true,
    });

    if (isSubroutine) {
        return Promise.resolve({
            waiting: true,
            question,
            variable: variableName,
            message: 'Tool registrada. El agente debe esperar input del usuario.',
        });
    }

    setWaitingNode?.(node.id);
    waitForInput?.();

    return Promise.resolve(null);
};

export default executeAiToolWaitInput;
