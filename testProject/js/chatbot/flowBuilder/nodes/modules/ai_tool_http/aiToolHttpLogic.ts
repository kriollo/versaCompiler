import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
import { parseApiResponseByFormat } from '@/dashboard/js/chatbot/flowBuilder/utils/flowUtils';

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface ApiProxyResponse {
    success: boolean | number;
    message?: string;
    payload?: any;
    statusCode?: number;
    debug_url?: string;
    debug_response?: any;
}

const executeApiViaProxy = async (params: {
    apiUrl: string;
    apiMethod: ApiMethod;
    apiHeaders?: Record<string, string>;
    apiBody?: string;
    timeout?: number;
    retryEnabled?: boolean;
    retryCount?: number;
    retryDelay?: number;
    retryBackoff?: 'fixed' | 'linear' | 'exponential';
    versaFetch: any;
    panelUrl: string;
    empresaSelected: string;
    csrf_token: string;
}): Promise<{ payload: any; success: boolean; message: string; statusCode?: number }> => {
    const requestHeaders: Record<string, string> = { ...params.apiHeaders };
    const timeoutMs = params.timeout || 30000;
    const maxRetries = params.retryEnabled ? params.retryCount || 2 : 0;
    const baseDelay = params.retryDelay || 1000;
    const backoffType = params.retryBackoff || 'exponential';

    if (params.apiMethod !== 'GET' && !requestHeaders['Content-Type']) {
        requestHeaders['Content-Type'] = 'application/json';
    }

    const { versaFetch, panelUrl, empresaSelected, csrf_token } = params;

    const executeSingleRequest = (): Promise<ApiProxyResponse> => {
        const fetchPromise = versaFetch({
            url: `/${panelUrl}/chatbot/flowBuilder/api/proxyExternalApi/${empresaSelected}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            data: JSON.stringify({
                url: params.apiUrl,
                method: params.apiMethod,
                headers: requestHeaders,
                body: params.apiMethod === 'GET' ? '' : params.apiBody || '',
                csrf_token,
            }),
        });

        const timeoutPromise = new Promise<never>((_resolve, reject) => {
            setTimeout(() => reject(new Error(`Timeout: La API tardó más de ${timeoutMs / 1000}s`)), timeoutMs);
        });

        return Promise.race([fetchPromise as Promise<ApiProxyResponse>, timeoutPromise]);
    };

    const calculateDelay = (attempt: number): number => {
        switch (backoffType) {
            case 'fixed': {
                return baseDelay;
            }
            case 'linear': {
                return baseDelay * attempt;
            }
            default: {
                return baseDelay * 2 ** (attempt - 1);
            }
        }
    };

    let lastError: Error | null = null;
    let lastErrorResponse: ApiProxyResponse | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // eslint-disable-next-line no-await-in-loop
            const proxyResponse = await executeSingleRequest();
            const isSuccess = proxyResponse.success === 1 || proxyResponse.success === true;

            if (!isSuccess) {
                lastErrorResponse = proxyResponse;
                const error = new Error(proxyResponse.message || 'Error al ejecutar la API');
                (error as any).proxyResponse = proxyResponse;
                throw error;
            }

            return {
                payload: proxyResponse.payload,
                success: true,
                message: 'OK',
                statusCode: proxyResponse.statusCode,
            };
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < maxRetries) {
                const delay = calculateDelay(attempt + 1);
                // eslint-disable-next-line no-await-in-loop
                await new Promise<void>(resolve => {
                    setTimeout(resolve, delay);
                });
            }
        }
    }

    return {
        payload: null,
        success: false,
        message: lastError?.message || 'Error al ejecutar la API después de reintentos',
        statusCode: lastErrorResponse?.statusCode,
    };
};

const executeAiToolHttp: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, replaceVariables, variables, _env } = context;

    const config = node.config as any;
    const apiMethod = (config.apiMethod || 'GET').toUpperCase() as ApiMethod;
    const apiUrl = replaceVariables(config.apiUrl || '');
    const apiBodyRaw = config.apiBody || '';
    const apiBody = apiBodyRaw ? replaceVariables(apiBodyRaw) : '';
    const timeout = Number(config.httpTimeout) || 30000;

    const apiResponseFormat = config.apiResponseFormat || 'json';
    const responseVariableName = String(config.apiResponseVariable || '').trim();
    const apiResponsePath = config.apiResponsePath || '';

    const retryEnabled = config.apiRetryEnabled || false;
    const retryCount = Number(config.apiRetryCount) || 2;
    const retryDelay = Number(config.apiRetryDelay) || 1000;
    const retryBackoff = (config.apiRetryBackoff || 'exponential') as 'fixed' | 'linear' | 'exponential';

    testMessages.push({
        type: 'bot',
        content: `🔌 [HTTP] Llamando: ${apiMethod} ${apiUrl || '(sin URL)'}`,
        nodeId: node.id,
    });

    if (!apiUrl) {
        const errorResult = { error: 'URL no configurada', success: false };
        testMessages.push({
            type: 'bot',
            content: '❌ Error: URL no configurada',
            nodeId: node.id,
            rawResponse: errorResult,
        });

        if (isSubroutine) {
            return errorResult;
        }
        await moveToNextNode(node.id, 0);
        return null;
    }

    if (!_env?.versaFetch) {
        const errorResult = { error: 'versaFetch no disponible', success: false };
        testMessages.push({
            type: 'bot',
            content: '❌ Error: versaFetch no disponible. Ejecuta desde el servidor.',
            nodeId: node.id,
            rawResponse: errorResult,
        });

        if (isSubroutine) {
            return errorResult;
        }
        await moveToNextNode(node.id, 0);
        return null;
    }

    try {
        const apiHeadersRaw = config.apiHeaders || [];
        const requestHeaders: Record<string, string> = {};

        if (Array.isArray(apiHeadersRaw)) {
            for (const header of apiHeadersRaw) {
                if (header?.key && header?.value) {
                    requestHeaders[header.key] = replaceVariables(String(header.value));
                }
            }
        } else if (typeof apiHeadersRaw === 'object') {
            for (const [key, val] of Object.entries(apiHeadersRaw)) {
                requestHeaders[key] = replaceVariables(String(val));
            }
        }

        const authType = config.httpAuthType || 'none';
        const authHeader = config.httpAuthHeader || '';
        const authValue = replaceVariables(config.httpAuthValue || '');

        if (authType !== 'none' && authHeader && authValue) {
            if (authType === 'bearer') {
                requestHeaders[authHeader] = `Bearer ${authValue}`;
            } else if (authType === 'basic') {
                requestHeaders[authHeader] = `Basic ${btoa(authValue)}`;
            } else {
                requestHeaders[authHeader] = authValue;
            }
        }

        const startTime = Date.now();
        const result = await executeApiViaProxy({
            apiUrl,
            apiMethod,
            apiHeaders: requestHeaders,
            apiBody,
            timeout,
            retryEnabled,
            retryCount,
            retryDelay,
            retryBackoff,
            versaFetch: _env.versaFetch,
            panelUrl: _env.panelUrl,
            empresaSelected: _env.empresaSelected,
            csrf_token: _env.csrf_token,
        });
        const duration = Date.now() - startTime;

        let parsedResponse: any = result.payload;

        if (result.success && responseVariableName) {
            parsedResponse = parseApiResponseByFormat({
                payload: result.payload,
                format: apiResponseFormat as any,
                jsonPath: apiResponsePath,
            });
            variables[responseVariableName] = parsedResponse;
        }

        testMessages.push({
            type: 'bot',
            content: result.success
                ? `✅ HTTP Response: ${result.statusCode || 200} (${duration}ms)`
                : `❌ HTTP Error: ${result.message}`,
            nodeId: node.id,
            rawResponse: {
                success: result.success,
                statusCode: result.statusCode,
                payload: result.payload,
                parsed: parsedResponse,
                duration,
            },
        });

        if (responseVariableName && result.success) {
            testMessages.push({
                type: 'bot',
                content: `🧠 Respuesta guardada en variable "${responseVariableName}"`,
                nodeId: node.id,
                isDebug: true,
            });
        }

        if (isSubroutine) {
            return {
                success: result.success,
                statusCode: result.statusCode,
                data: parsedResponse,
                error: result.success ? undefined : result.message,
            };
        }

        await moveToNextNode(node.id, 0);
    } catch (httpError: any) {
        const proxyDebug = httpError?.proxyResponse;
        const errorResult = {
            error: httpError?.message || String(httpError),
            success: false,
        };

        testMessages.push({
            type: 'bot',
            content: `❌ Error HTTP: ${httpError?.message || 'Error desconocido'}`,
            nodeId: node.id,
            rawResponse: {
                ...errorResult,
                debug_url: proxyDebug?.debug_url,
                debug_response: proxyDebug?.debug_response,
            },
        });

        if (isSubroutine) {
            return errorResult;
        }
        await moveToNextNode(node.id, 0);
    }

    return null;
};

export default executeAiToolHttp;
