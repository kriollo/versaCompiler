/**
 * Utilidades compartidas para la integración con proveedores de IA
 * Usadas por el módulo AI Agent y otros nodos relacionados
 */

export const AI_MAX_HISTORY_LENGTH = 50;
export const AI_MAX_HISTORY_LENGTH_MIN = 10;
export const API_TIMEOUT_MS = 30000;

export interface AIToolDefinition {
    name: string;
    description: string;
    parameters: string;
    nodeId: string;
}

export interface AICallParams {
    provider: string;
    model: string;
    messages: any[];
    tools?: AIToolDefinition[];
    apiKey?: string;
    timeout?: number;
    maxTokens?: number;
    temperature?: number;
}

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface AIResponse {
    choices: {
        message: {
            content?: string;
            tool_calls?: {
                id: string;
                type: string;
                function: {
                    name: string;
                    arguments: string;
                };
            }[];
        };
    }[];
    error?: string;
    usage?: TokenUsage;
}

const normalizeToOpenAIShape = (raw: any): AIResponse => {
    if (raw?.choices?.[0]?.message) {
        return raw;
    }

    return {
        choices: [
            {
                message: {
                    content: typeof raw === 'string' ? raw : JSON.stringify(raw ?? {}),
                },
            },
        ],
    };
};

export const fetchWithTimeout = async (
    url: string,
    options: RequestInit,
    timeoutMs: number = API_TIMEOUT_MS,
): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const truncateHistoryInPlace = (history: any[], maxLength: number = AI_MAX_HISTORY_LENGTH): void => {
    if (history.length <= maxLength) {
        return;
    }

    const systemMessageIndex = history.findIndex(m => m?.role === 'system');
    const systemMessage = systemMessageIndex !== -1 ? history[systemMessageIndex] : null;

    if (systemMessage) {
        history.splice(systemMessageIndex, 1);
        const nonSystemCount = maxLength - 1;
        const removeCount = history.length - nonSystemCount;
        if (removeCount > 0) {
            history.splice(0, removeCount);
        }
        history.unshift(systemMessage);
    } else {
        const removeCount = history.length - maxLength;
        history.splice(0, removeCount);
    }
};

export const callAI = async (
    params: AICallParams,
    apiKeys: { openai: string; gemini: string; anthropic: string; groq: string; mistral: string },
): Promise<AIResponse> => {
    const { provider, model, messages, tools, apiKey, timeout, maxTokens, temperature } = params;
    const timeoutMs = timeout || API_TIMEOUT_MS;
    const providerNormalized = provider.trim().toLowerCase();

    const providerKeyMap: Record<string, keyof typeof apiKeys> = {
        openai: 'openai',
        groq: 'groq',
        google: 'gemini',
        gemini: 'gemini',
        anthropic: 'anthropic',
        mistral: 'mistral',
        other: 'openai',
    };

    const mappedKey = providerKeyMap[providerNormalized];
    const key = apiKey || (mappedKey ? apiKeys[mappedKey] : '');

    if (!key) {
        return {
            error: `API Key para ${provider} no configurada. Haz clic en ⚙️ para configurarla o defínela en el nodo.`,
            choices: [],
        };
    }

    try {
        if (providerNormalized === 'openai' || providerNormalized === 'groq' || providerNormalized === 'mistral') {
            return await callOpenAICompatible({
                provider: providerNormalized,
                model,
                messages,
                tools,
                apiKey: key,
                timeoutMs,
                maxTokens,
                temperature,
            });
        }

        if (providerNormalized === 'google' || providerNormalized === 'gemini') {
            return await callGemini({ model, messages, tools, apiKey: key, timeoutMs, maxTokens, temperature });
        }

        if (providerNormalized === 'anthropic') {
            return await callAnthropic({ model, messages, tools, apiKey: key, timeoutMs, maxTokens, temperature });
        }

        return {
            error: `Proveedor ${provider} no soportado aún.`,
            choices: [],
        };
    } catch (error: any) {
        return {
            error: error?.message || `Error al comunicarse con ${provider}`,
            choices: [],
        };
    }
};

const callOpenAICompatible = async ({
    provider,
    model,
    messages,
    tools,
    apiKey,
    timeoutMs,
    maxTokens,
    temperature,
}: {
    provider: string;
    model: string;
    messages: any[];
    tools: AIToolDefinition[] | undefined;
    apiKey: string;
    timeoutMs: number;
    maxTokens?: number;
    temperature?: number;
}): Promise<AIResponse> => {
    let baseUrl = 'https://api.openai.com/v1/chat/completions';
    if (provider === 'groq') {
        baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
    } else if (provider === 'mistral') {
        baseUrl = 'https://api.mistral.ai/v1/chat/completions';
    }

    const body: any = { model, messages };
    if (maxTokens && maxTokens > 0) {
        body.max_tokens = maxTokens;
    }
    if (temperature !== undefined && temperature >= 0) {
        body.temperature = temperature;
    }
    if (tools && tools.length > 0) {
        body.tools = tools.map(t => ({
            type: 'function',
            function: {
                name: (t.name || 'tool').replaceAll(' ', '_'),
                description: t.description || 'Sin descripción',
                parameters: JSON.parse(t.parameters || '{"type":"object","properties":{}}'),
            },
        }));
        body.tool_choice = 'auto';
    }

    const res = await fetchWithTimeout(
        baseUrl,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
        },
        timeoutMs,
    );

    if (!res.ok) {
        const err = await res.json();
        const errorMessage = err.error?.message || `Error en la API de ${provider}`;

        if (errorMessage.includes('Failed to call a function') || errorMessage.includes('failed_generation')) {
            return {
                error: `El modelo ${model} no pudo ejecutar la herramienta correctamente. Intenta con un modelo diferente como 'llama-3.3-70b-versatile' o 'gemma2-9b-it'.`,
                choices: [],
            };
        }

        return {
            error: errorMessage,
            choices: [],
        };
    }

    const raw = await res.json();

    if (raw?.error) {
        const errorMessage = raw.error?.message || 'Error desconocido';
        if (errorMessage.includes('Failed to call a function') || errorMessage.includes('failed_generation')) {
            return {
                error: `El modelo ${model} generó una llamada a función inválida. Intenta reformular tu pregunta o usa un modelo diferente.`,
                choices: [],
            };
        }
        return {
            error: errorMessage,
            choices: [],
        };
    }

    const normalized = normalizeToOpenAIShape(raw);

    const usage: TokenUsage = {
        promptTokens: raw?.usage?.prompt_tokens || 0,
        completionTokens: raw?.usage?.completion_tokens || 0,
        totalTokens: raw?.usage?.total_tokens || 0,
    };

    return { ...normalized, usage };
};

const callGemini = async ({
    model,
    messages,
    tools,
    apiKey,
    timeoutMs,
    maxTokens,
    temperature,
}: {
    model: string;
    messages: any[];
    tools: AIToolDefinition[] | undefined;
    apiKey: string;
    timeoutMs: number;
    maxTokens?: number;
    temperature?: number;
}): Promise<AIResponse> => {
    const modelName = model || 'gemini-1.5-flash';
    const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const systemMessage = messages.find((m: any) => m?.role === 'system')?.content || '';

    const geminiContents: any[] = [];
    for (const message of messages) {
        if (!message || !message.role || message.role === 'system') {
            // Ignorar mensajes vacíos o de sistema
        } else if (message.role === 'tool') {
            geminiContents.push({
                role: 'user',
                parts: [
                    {
                        functionResponse: {
                            name: message.name || 'tool_result',
                            response: {
                                output: message.content || '',
                            },
                        },
                    },
                ],
            });
        } else if (message.role === 'assistant' && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
            geminiContents.push({
                role: 'model',
                parts: message.tool_calls.map((tc: any) => ({
                    functionCall: {
                        name: tc?.function?.name || 'tool',
                        args: tc?.function?.arguments ? JSON.parse(tc.function.arguments) : {},
                    },
                })),
            });
        } else {
            geminiContents.push({
                role: message.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: String(message.content || '') }],
            });
        }
    }

    const body: any = {
        contents: geminiContents,
    };

    if (maxTokens && maxTokens > 0) {
        body.generationConfig = body.generationConfig || {};
        body.generationConfig.maxOutputTokens = maxTokens;
    }
    if (temperature !== undefined && temperature >= 0) {
        body.generationConfig = body.generationConfig || {};
        body.generationConfig.temperature = temperature;
    }

    if (!Array.isArray(body.contents) || body.contents.length === 0) {
        body.contents = [
            {
                role: 'user',
                parts: [{ text: 'Inicia la conversación con un saludo y solicita los datos necesarios.' }],
            },
        ];
    }

    if (systemMessage) {
        body.systemInstruction = {
            parts: [{ text: String(systemMessage) }],
        };
    }

    if (tools && tools.length > 0) {
        body.tools = [
            {
                functionDeclarations: tools.map(t => ({
                    name: (t.name || 'tool').replaceAll(' ', '_'),
                    description: t.description || 'Sin descripción',
                    parameters: JSON.parse(t.parameters || '{"type":"object","properties":{}}'),
                })),
            },
        ];
    }

    const res = await fetchWithTimeout(
        baseUrl,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        },
        timeoutMs,
    );

    const raw = await res.json();
    if (!res.ok) {
        return {
            error: raw?.error?.message || `Error en la API de Gemini`,
            choices: [],
        };
    }

    const candidate = raw?.candidates?.[0]?.content?.parts || [];
    const textParts = candidate.filter((p: any) => typeof p?.text === 'string').map((p: any) => p.text);
    const functionCalls = candidate.filter((p: any) => p?.functionCall);

    const usage: TokenUsage = {
        promptTokens: raw?.usageMetadata?.promptTokenCount || 0,
        completionTokens: raw?.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: raw?.usageMetadata?.totalTokenCount || 0,
    };

    return {
        choices: [
            {
                message: {
                    content: textParts.join('\n').trim(),
                    tool_calls: functionCalls.map((p: any, idx: number) => ({
                        id: `gemini_tool_${Date.now()}_${idx}`,
                        type: 'function',
                        function: {
                            name: p.functionCall.name,
                            arguments: JSON.stringify(p.functionCall.args || {}),
                        },
                    })),
                },
            },
        ],
        usage,
    };
};

const callAnthropic = async ({
    model,
    messages,
    tools,
    apiKey,
    timeoutMs,
    maxTokens,
    temperature,
}: {
    model: string;
    messages: any[];
    tools: AIToolDefinition[] | undefined;
    apiKey: string;
    timeoutMs: number;
    maxTokens?: number;
    temperature?: number;
}): Promise<AIResponse> => {
    const systemMessage = messages.find((m: any) => m?.role === 'system')?.content || '';
    const anthropicMessages: any[] = [];

    for (const message of messages) {
        if (!message || !message.role || message.role === 'system') {
            // Ignorar mensajes vacíos o de sistema
        } else if (message.role === 'tool') {
            anthropicMessages.push({
                role: 'user',
                content: [
                    {
                        type: 'tool_result',
                        tool_use_id: message.tool_call_id || `tool_${Date.now()}`,
                        content: String(message.content || ''),
                    },
                ],
            });
        } else if (message.role === 'assistant' && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
            anthropicMessages.push({
                role: 'assistant',
                content: message.tool_calls.map((tc: any) => ({
                    type: 'tool_use',
                    id: tc.id || `anthropic_tool_${Date.now()}`,
                    name: tc?.function?.name || 'tool',
                    input: tc?.function?.arguments ? JSON.parse(tc.function.arguments) : {},
                })),
            });
        } else {
            anthropicMessages.push({
                role: message.role === 'assistant' ? 'assistant' : 'user',
                content: String(message.content || ''),
            });
        }
    }

    const body: any = {
        model: model || 'claude-3-5-sonnet-latest',
        max_tokens: maxTokens && maxTokens > 0 ? maxTokens : 1024,
        messages: anthropicMessages,
    };

    if (temperature !== undefined && temperature >= 0) {
        body.temperature = temperature;
    }

    if (systemMessage) {
        body.system = systemMessage;
    }

    if (tools && tools.length > 0) {
        body.tools = tools.map(t => ({
            name: (t.name || 'tool').replaceAll(' ', '_'),
            description: t.description || 'Sin descripción',
            input_schema: JSON.parse(t.parameters || '{"type":"object","properties":{}}'),
        }));
    }

    const res = await fetchWithTimeout(
        'https://api.anthropic.com/v1/messages',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(body),
        },
        timeoutMs,
    );

    const raw = await res.json();
    if (!res.ok) {
        return {
            error: raw?.error?.message || `Error en la API de Anthropic`,
            choices: [],
        };
    }

    const contentBlocks = Array.isArray(raw?.content) ? raw.content : [];
    const textParts = contentBlocks
        .filter((block: any) => block?.type === 'text')
        .map((block: any) => String(block?.text || ''));
    const toolCalls = contentBlocks.filter((block: any) => block?.type === 'tool_use');

    const usage: TokenUsage = {
        promptTokens: raw?.usage?.input_tokens || 0,
        completionTokens: raw?.usage?.output_tokens || 0,
        totalTokens: (raw?.usage?.input_tokens || 0) + (raw?.usage?.output_tokens || 0),
    };

    return {
        choices: [
            {
                message: {
                    content: textParts.join('\n').trim(),
                    tool_calls: toolCalls.map((block: any) => ({
                        id: block.id,
                        type: 'function',
                        function: {
                            name: block.name,
                            arguments: JSON.stringify(block.input || {}),
                        },
                    })),
                },
            },
        ],
        usage,
    };
};

export const isAgentRequestingUserInput = (content: string): boolean => {
    const normalized = content.trim().toLowerCase();
    if (!normalized) {
        return false;
    }

    if (normalized.includes('?') || normalized.includes('¿')) {
        return true;
    }

    return /\b(necesito|por favor|comparte|indica|proporciona|envíame|ingresa|escribe|confirmame|confírmame)\b/i.test(
        normalized,
    );
};
