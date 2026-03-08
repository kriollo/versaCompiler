import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import { type Connection, type FlowNode, NodeType } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
import {
    type AIToolDefinition,
    callAI,
    isAgentRequestingUserInput,
    type TokenUsage,
    truncateHistoryInPlace,
} from '@/dashboard/js/chatbot/flowBuilder/utils/aiUtils';

const normalizeToolName = (value: string): string => value.trim().replaceAll(' ', '_').toLowerCase();

const buildToolParametersSchema = (node: FlowNode): string => {
    switch (node.type) {
        case NodeType.AI_TOOL_VARIABLE: {
            return '{"type":"object","properties":{"operation":{"type":"string","enum":["get","set","increment","decrement"]},"variable":{"type":"string"},"value":{}},"required":["operation","variable"]}';
        }
        case NodeType.AI_TOOL_JSON_EXTRACT: {
            return '{"type":"object","properties":{"sourceVariable":{"type":"string"},"jsonPath":{"type":"string"},"defaultValue":{}},"required":[]}';
        }
        case NodeType.AI_TOOL_TEMPLATE_RENDER: {
            return '{"type":"object","properties":{"template":{"type":"string"},"sourceVariable":{"type":"string"}},"required":[]}';
        }
        case NodeType.AI_TOOL_CONDITION_EVAL: {
            return '{"type":"object","properties":{"field":{"type":"string"},"operator":{"type":"string","enum":["equals","not_equals","contains","greater","less","is_empty","is_not_empty","starts_with","ends_with","regex"]},"value":{"type":"string"}},"required":["field","operator","value"]}';
        }
        case NodeType.AI_TOOL_DATETIME: {
            return '{"type":"object","properties":{"timezone":{"type":"string"},"format":{"type":"string","enum":["iso","date","time","datetime","timestamp"]},"addMinutes":{"type":"number"},"addDays":{"type":"number"}},"required":[]}';
        }
        case NodeType.AI_TOOL_TEXT_UTILS: {
            return '{"type":"object","properties":{"operation":{"type":"string","enum":["trim","lower","upper","slug"]},"text":{"type":"string"}},"required":["operation","text"]}';
        }
        case NodeType.AI_TOOL_HTTP: {
            return '{"type":"object","properties":{"url":{"type":"string","description":"URL de la API"},"method":{"type":"string","enum":["GET","POST","PUT","DELETE","PATCH"]},"headers":{"type":"object"},"body":{"type":"string"}},"required":["url"]}';
        }
        case NodeType.AI_TOOL_MEMORY: {
            return '{"type":"object","properties":{"operation":{"type":"string","enum":["remember","recall","summarize","forget"]},"key":{"type":"string"},"value":{"type":"string"},"query":{"type":"string"},"agentId":{"type":"string"}},"required":["operation"]}';
        }
        case NodeType.AI_TOOL_SEND_MESSAGE: {
            return '{"type":"object","properties":{"message":{"type":"string","description":"Mensaje a enviar al usuario"},"type":{"type":"string","enum":["text","image","audio"],"default":"text"}},"required":["message"]}';
        }
        case NodeType.AI_TOOL_WAIT_INPUT: {
            return '{"type":"object","properties":{"question":{"type":"string","description":"Pregunta a realizar al usuario"},"variable":{"type":"string","description":"Variable donde guardar la respuesta"},"validation":{"type":"string","enum":["text","number","email","phone","date"],"default":"text"}},"required":["question"]}';
        }
        case NodeType.AI_TOOL_KNOWLEDGE_BASE: {
            return '{"type":"object","properties":{"query":{"type":"string","description":"Consulta de busqueda"},"topK":{"type":"number","description":"Numero maximo de resultados","default":3}},"required":["query"]}';
        }
        case NodeType.AI_TOOL_MATH: {
            return '{"type":"object","properties":{"operation":{"type":"string","enum":["add","subtract","multiply","divide","power","sqrt","round","percentage","modulo","abs","evaluate"]},"a":{"type":"number"},"b":{"type":"number"},"expression":{"type":"string","description":"Expresion matematica para evaluate"},"decimals":{"type":"number","default":2}},"required":["operation"]}';
        }
        case NodeType.AI_TOOL_STRUCTURED_OUTPUT: {
            return '{"type":"object","properties":{"source":{"type":"string","description":"Variable fuente o last_message","default":"last_message"}},"required":[]}';
        }
        default: {
            return '{"type":"object","properties":{}}';
        }
    }
};

const isAiToolNode = (node: FlowNode | undefined): node is FlowNode => {
    if (!node) {
        return false;
    }
    return String(node.type).startsWith('ai_tool_');
};

interface ToolChainLog {
    timestamp: string;
    iteration: number;
    depth: number;
    action: 'thinking' | 'tool_call' | 'tool_result' | 'response' | 'error' | 'retry';
    toolName?: string;
    toolArgs?: Record<string, any>;
    result?: any;
    error?: string;
    duration?: number;
    thinking?: string;
    tokens?: TokenUsage;
}

interface RetryPolicy {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
}

const DEFAULT_RETRY_POLICY: RetryPolicy = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
};

const calculateBackoffDelay = (attempt: number, policy: RetryPolicy): number => {
    const delay = policy.baseDelayMs * policy.backoffMultiplier ** attempt;
    return Math.min(delay, policy.maxDelayMs);
};

const sleep = (ms: number): Promise<void> =>
    new Promise<void>(resolve => {
        setTimeout(resolve, ms);
    });

const formatLogEntry = (entry: ToolChainLog): string => {
    const prefix = `🔄 [Iter ${entry.iteration}]`.padEnd(12);
    const depthIndicator = '│ '.repeat(entry.depth);

    switch (entry.action) {
        case 'thinking': {
            return `${prefix}${depthIndicator}💭 Pensando...`;
        }
        case 'tool_call': {
            return `${prefix}${depthIndicator}🔧 Tool: ${entry.toolName}`;
        }
        case 'tool_result': {
            let resultPreview = '';
            if (entry.error) {
                resultPreview = `❌ ${entry.error}`;
            } else if (entry.result !== undefined && entry.result !== null) {
                const resultStr =
                    typeof entry.result === 'object' ? JSON.stringify(entry.result) : String(entry.result);
                resultPreview = `✅ ${resultStr.length > 50 ? `${resultStr.slice(0, 50)}...` : resultStr}`;
            } else {
                resultPreview = '✅ (sin resultado)';
            }
            return `${prefix}${depthIndicator}📋 Result: ${resultPreview}`;
        }
        case 'response': {
            const preview = entry.thinking?.slice(0, 100) || '(sin contenido)';
            return `${prefix}${depthIndicator}💬 Response: ${preview}...`;
        }
        case 'error': {
            return `${prefix}${depthIndicator}🚨 Error: ${entry.error}`;
        }
        case 'retry': {
            return `${prefix}${depthIndicator}🔁 Retry ${entry.toolName} (attempt ${entry.result})`;
        }
        default: {
            return `${prefix}${depthIndicator}${entry.action}`;
        }
    }
};

const isRetryableError = (error: any): boolean => {
    const errorMessage = error?.message?.toLowerCase() || '';
    const retryablePatterns = [
        'timeout',
        'rate limit',
        '429',
        '503',
        '502',
        '504',
        'network',
        'econnrefused',
        'econnreset',
        'etimedout',
    ];
    return retryablePatterns.some(pattern => errorMessage.includes(pattern));
};

const executeAiAgent: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const {
        testMessages,
        variables,
        replaceVariables,
        setWaitingNode,
        moveToNextNode,
        flowNodes,
        connections,
        apiKeys,
        executeToolNode,
        getHistory,
        setHistory,
        waitForUserInput,
        isWaitingForInput,
        getLastUserMessage,
    } = context;

    const provider = node.config.aiProvider || 'openai';
    const model = node.config.aiModel || 'gpt-4o';

    const groqCompatibleModels = [
        'llama-3.3-70b-versatile',
        'llama-3.3-70b-specdec',
        'llama-3.1-70b-versatile',
        'llama-3.1-8b-instant',
        'llama3-70b-8192',
        'llama3-8b-8192',
        'mixtral-8x7b-32768',
        'gemma2-9b-it',
    ];

    if (provider === 'groq' && !groqCompatibleModels.some(m => model.includes(m.split('-')[0] ?? ''))) {
        testMessages.push({
            type: 'bot',
            content: `⚠️ El modelo '${model}' puede no ser compatible con Groq. Modelos recomendados: llama-3.3-70b-versatile, gemma2-9b-it`,
            nodeId: node.id,
            isDebug: true,
        });
    }

    const prompt = replaceVariables(node.config.aiPrompt || '');
    const responseVariable = node.config.aiResponseVariable || 'ai_response';
    const historyKey = `history_${node.id}`;
    const idleTurnsKey = `agent_idle_turns_${node.id}`;
    const toolChainLogKey = `tool_chain_${node.id}`;

    const maxAgentLoops = Number((node.config as any).maxIterations) || 8;
    const maxToolDepth = Number((node.config as any).maxToolDepth) || 3;
    const maxTokens = Number((node.config as any).aiMaxTokens) || undefined;
    const temperature =
        (node.config as any).aiTemperature !== undefined ? Number((node.config as any).aiTemperature) : undefined;
    const retryPolicy: RetryPolicy = {
        maxRetries: Number((node.config as any).maxRetries) || DEFAULT_RETRY_POLICY.maxRetries,
        baseDelayMs: Number((node.config as any).retryBaseDelay) || DEFAULT_RETRY_POLICY.baseDelayMs,
        maxDelayMs: Number((node.config as any).retryMaxDelay) || DEFAULT_RETRY_POLICY.maxDelayMs,
        backoffMultiplier: DEFAULT_RETRY_POLICY.backoffMultiplier,
    };

    const toolChainLog: ToolChainLog[] = [];
    const totalTokens: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    const logChain = (log: Omit<ToolChainLog, 'timestamp'>) => {
        const entry: ToolChainLog = {
            ...log,
            timestamp: new Date().toISOString(),
        };
        toolChainLog.push(entry);

        const debugContent = formatLogEntry(entry);
        testMessages.push({
            type: 'bot',
            content: debugContent,
            nodeId: node.id,
            isDebug: true,
            rawResponse: entry,
        });
    };

    if (!apiKeys) {
        testMessages.push({
            type: 'bot',
            content: `❌ Error: API Keys no configuradas. Haz clic en ⚙️ para configurarlas.`,
            nodeId: node.id,
        });
        return null;
    }

    let history = getHistory ? getHistory(historyKey) : null;
    if (!history) {
        history = [{ role: 'system', content: prompt }];
        if (setHistory) {
            setHistory(historyKey, history);
        }
    }

    const hasUserHistory = history.some((message: any) => message?.role === 'user');
    const isInitialTurn = !hasUserHistory && !isWaitingForInput?.(node.id);

    if (isInitialTurn) {
        testMessages.push({
            type: 'bot',
            content: '👋 Hola, soy tu asistente de atención al cliente. Cuéntame tu consulta y te ayudo paso a paso.',
            nodeId: node.id,
        });

        logChain({
            iteration: 0,
            depth: 0,
            action: 'thinking',
            thinking: 'Inicializando agente, esperando input del usuario',
        });

        testMessages.push({
            type: 'bot',
            content: `🧠 Agente: ${provider}/${model} | Max loops: ${maxAgentLoops} | Max depth: ${maxToolDepth} | Retries: ${retryPolicy.maxRetries}`,
            nodeId: node.id,
            isDebug: true,
            rawResponse: {
                provider,
                model,
                prompt,
                responseVariable,
                config: { maxAgentLoops, maxToolDepth, retryPolicy },
            },
        });

        setWaitingNode?.(node.id);
        return null;
    }

    if (isWaitingForInput?.(node.id)) {
        const lastUserMsg = getLastUserMessage?.();
        if (lastUserMsg) {
            history.push({ role: 'user', content: lastUserMsg });
            truncateHistoryInPlace(history);

            const msgPreview = lastUserMsg.length > 100 ? `${lastUserMsg.slice(0, 100)}...` : lastUserMsg;

            logChain({
                iteration: 0,
                depth: 0,
                action: 'thinking',
                thinking: `Usuario dijo: "${msgPreview}"`,
            });
        }
    }

    const toolsToUse: AIToolDefinition[] = [];
    const toolConns = connections.filter((c: Connection) => c.sourceNodeId === node.id && c.sourcePortIndex === 1);

    for (const conn of toolConns) {
        const tNode = flowNodes.find(n => n.id === conn.targetNodeId);
        if (isAiToolNode(tNode) && !toolsToUse.some(t => t.nodeId === tNode.id)) {
            const toolName = tNode.config.toolName || normalizeToolName(tNode.label);
            const toolDescription = tNode.config.toolDescription || `Herramienta: ${tNode.type}`;

            toolsToUse.push({
                name: toolName,
                description: toolDescription,
                parameters: buildToolParametersSchema(tNode),
                nodeId: tNode.id,
            });
        }
    }

    if (toolsToUse.length > 0) {
        logChain({
            iteration: 0,
            depth: 0,
            action: 'thinking',
            thinking: `Herramientas disponibles: ${toolsToUse.map(t => t.name).join(', ')}`,
        });
    }

    interface ToolRetryParams {
        tDef: AIToolDefinition | undefined;
        tArgs: Record<string, any>;
        iteration: number;
        depth: number;
    }

    const executeToolWithRetry = async (params: ToolRetryParams): Promise<{ result: any; error?: string }> => {
        const { tDef, tArgs, iteration, depth } = params;
        let lastError: string | undefined = undefined;
        let attemptResult: { result: any; error?: string } | null = null;

        const tryExecute = async (attemptNum: number): Promise<{ result: any; error?: string } | null> => {
            const startTime = Date.now();

            if (attemptNum > 0) {
                const delay = calculateBackoffDelay(attemptNum - 1, retryPolicy);
                logChain({
                    iteration,
                    depth,
                    action: 'retry',
                    toolName: tDef?.name,
                    result: attemptNum,
                });
                await sleep(delay);
            }

            logChain({
                iteration,
                depth,
                action: 'tool_call',
                toolName: tDef?.name,
                toolArgs: tArgs,
            });

            try {
                if (tDef?.nodeId && executeToolNode) {
                    const result = await executeToolNode(tDef.nodeId, tArgs);
                    const duration = Date.now() - startTime;

                    logChain({
                        iteration,
                        depth,
                        action: 'tool_result',
                        toolName: tDef?.name,
                        result: result ?? { success: true, data: null },
                        duration,
                    });

                    return { result: result ?? null };
                }
                return { result: null, error: `Tool no encontrada: ${tDef?.name}` };
            } catch (toolError: any) {
                lastError = toolError?.message || 'Error desconocido';
                const duration = Date.now() - startTime;

                logChain({
                    iteration,
                    depth,
                    action: 'error',
                    toolName: tDef?.name,
                    error: lastError,
                    duration,
                });

                const isRetryable = isRetryableError(toolError);
                if (!isRetryable || attemptNum === retryPolicy.maxRetries) {
                    return { result: null, error: lastError };
                }
                return null;
            }
        };

        attemptResult = await tryExecute(0);
        if (attemptResult) {
            return attemptResult;
        }

        for (let attempt = 1; attempt <= retryPolicy.maxRetries; attempt++) {
            // eslint-disable-next-line no-await-in-loop
            attemptResult = await tryExecute(attempt);
            if (attemptResult) {
                return attemptResult;
            }
        }

        return { result: null, error: lastError };
    };

    const executeToolChain = async (
        toolCalls: { id: string; function: { name: string; arguments: string } }[],
        iteration: number,
        currentDepth: number,
    ): Promise<{ tool_call_id: string; name: string; content: string }[]> => {
        const results: { tool_call_id: string; name: string; content: string }[] = [];

        if (currentDepth >= maxToolDepth) {
            logChain({
                iteration,
                depth: currentDepth,
                action: 'error',
                error: `Profundidad máxima alcanzada (${maxToolDepth})`,
            });
            return toolCalls.map(tc => ({
                tool_call_id: tc.id,
                name: tc.function.name,
                content: JSON.stringify({ error: 'Max depth reached' }),
            }));
        }

        for (const tc of toolCalls) {
            let tArgs: Record<string, any> = {};
            let parseFailed = false;

            try {
                tArgs = JSON.parse(tc.function.arguments || '{}');
            } catch {
                logChain({
                    iteration,
                    depth: currentDepth,
                    action: 'error',
                    toolName: tc.function.name,
                    error: `Error parseando argumentos: ${tc.function.arguments}`,
                });
                results.push({
                    tool_call_id: tc.id,
                    name: tc.function.name,
                    content: JSON.stringify({ error: 'Invalid arguments format' }),
                });
                parseFailed = true;
            }

            if (parseFailed) {
                continue; // eslint-disable-line no-continue
            }

            const tDef = toolsToUse.find(t => {
                const normalizedToolName = normalizeToolName(t.name || 'tool');
                const normalizedCallName = normalizeToolName(tc.function.name);
                return normalizedToolName === normalizedCallName || t.name === tc.function.name;
            });

            if (!tDef) {
                logChain({
                    iteration,
                    depth: currentDepth,
                    action: 'error',
                    toolName: tc.function.name,
                    error: `Tool no encontrada. Disponibles: ${toolsToUse.map(t => t.name).join(', ')}`,
                });
                results.push({
                    tool_call_id: tc.id,
                    name: tc.function.name,
                    content: JSON.stringify({ error: `Tool '${tc.function.name}' no encontrada` }),
                });
            } else {
                // eslint-disable-next-line no-await-in-loop
                const { result, error } = await executeToolWithRetry({ tDef, tArgs, iteration, depth: currentDepth });

                const toolResult = error ? { error } : result;
                const resultContent = typeof toolResult === 'object' ? JSON.stringify(toolResult) : String(toolResult);

                history.push({
                    role: 'tool',
                    tool_call_id: tc.id,
                    content: resultContent,
                });

                results.push({
                    tool_call_id: tc.id,
                    name: tc.function.name,
                    content: resultContent,
                });
            }
        }

        return results;
    };

    let loops = 0;

    while (loops < maxAgentLoops) {
        loops++;

        logChain({
            iteration: loops,
            depth: 0,
            action: 'thinking',
            thinking: `Consultando ${provider}/${model}...`,
        });

        const startTime = Date.now();

        // eslint-disable-next-line no-await-in-loop
        const response = await callAI(
            {
                provider,
                model,
                messages: history,
                tools: toolsToUse.length > 0 ? toolsToUse : undefined,
                apiKey: node.config.aiApiKey,
                maxTokens,
                temperature,
            },
            apiKeys,
        );

        const duration = Date.now() - startTime;

        if (response.usage) {
            totalTokens.promptTokens += response.usage.promptTokens;
            totalTokens.completionTokens += response.usage.completionTokens;
            totalTokens.totalTokens += response.usage.totalTokens;
        }

        if (response.error) {
            logChain({
                iteration: loops,
                depth: 0,
                action: 'error',
                error: response.error,
                duration,
            });

            testMessages.push({
                type: 'bot',
                content: `❌ Error del Agente: ${response.error}`,
                nodeId: node.id,
                rawResponse: { error: response.error, iteration: loops },
            });
            break;
        }

        const msg = response.choices?.[0]?.message;
        if (!msg) {
            logChain({
                iteration: loops,
                depth: 0,
                action: 'error',
                error: 'Respuesta vacía del modelo',
            });
            break;
        }

        history.push(msg);
        truncateHistoryInPlace(history);

        if (msg.tool_calls && msg.tool_calls.length > 0) {
            variables[idleTurnsKey] = 0;

            logChain({
                iteration: loops,
                depth: 0,
                action: 'thinking',
                thinking: `El agente quiere usar ${msg.tool_calls.length} herramienta(s): ${msg.tool_calls.map(tc => tc.function.name).join(', ')}`,
            });

            // eslint-disable-next-line no-await-in-loop
            await executeToolChain(msg.tool_calls, loops, 0);

            truncateHistoryInPlace(history);

            if (setHistory) {
                setHistory(historyKey, history);
            }
        } else if (msg.content) {
            variables[idleTurnsKey] = 0;

            logChain({
                iteration: loops,
                depth: 0,
                action: 'response',
                thinking: msg.content,
                duration,
                tokens: response.usage,
            });

            testMessages.push({
                type: 'bot',
                content: msg.content,
                nodeId: node.id,
                rawResponse: { content: msg.content, tool_calls: msg.tool_calls, iteration: loops, duration },
            });

            variables[responseVariable] = msg.content;
            variables[`tokens_${node.id}`] = totalTokens;

            const hasFin = connections.some((c: Connection) => c.sourceNodeId === node.id && c.sourcePortIndex === 0);

            const explicitClose = /(\[fin\]|\[end\]|<fin>|<end>|#fin|finalizar_conversacion)/i.test(msg.content);
            const requestingUserInput = isAgentRequestingUserInput(msg.content);
            const previousTurns = Number(variables[idleTurnsKey] || 0);
            const idleTurns = explicitClose || requestingUserInput ? 0 : previousTurns + 1;
            variables[idleTurnsKey] = idleTurns;

            variables[toolChainLogKey] = toolChainLog;

            if (setHistory) {
                setHistory(historyKey, history);
            }

            testMessages.push({
                type: 'bot',
                content: `📊 Métricas: ${loops} iteraciones | ${toolChainLog.length} logs | ${duration}ms | Tokens: ${totalTokens.totalTokens} (in: ${totalTokens.promptTokens}, out: ${totalTokens.completionTokens})`,
                nodeId: node.id,
                isDebug: true,
                rawResponse: {
                    iterations: loops,
                    logsCount: toolChainLog.length,
                    duration,
                    tokens: totalTokens,
                    toolChainLog,
                },
            });

            if (hasFin && (explicitClose || (!requestingUserInput && idleTurns >= 4))) {
                if (!explicitClose) {
                    testMessages.push({
                        type: 'bot',
                        content: 'ℹ️ El agente cerró la interacción por inactividad conversacional.',
                        nodeId: node.id,
                    });
                }
                // eslint-disable-next-line no-await-in-loop
                await moveToNextNode(node.id, 0);
            } else {
                waitForUserInput?.(node.id);
            }

            break;
        }

        if (setHistory) {
            setHistory(historyKey, history);
        }
    }

    if (loops >= maxAgentLoops) {
        logChain({
            iteration: loops,
            depth: 0,
            action: 'error',
            error: `Máximo de iteraciones alcanzado (${maxAgentLoops})`,
        });

        testMessages.push({
            type: 'bot',
            content: `⚠️ El agente alcanzó el máximo de iteraciones (${maxAgentLoops})`,
            nodeId: node.id,
            isDebug: true,
        });
    }

    return null;
};

export default executeAiAgent;
