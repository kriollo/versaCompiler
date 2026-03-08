import type { ExecutionContext, ExecutionResult } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
import { parseApiResponseByFormat } from '@/dashboard/js/chatbot/flowBuilder/utils/flowUtils';

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface ApiProxyResponse {
    success: boolean | number;
    message?: string;
    payload?: any;
    debug_url?: string;
    debug_response?: any;
    statusCode?: number;
}

export const executeApiViaProxy = async (params: {
    apiUrl: string;
    apiMethod: ApiMethod;
    apiHeaders?: Record<string, string>;
    apiBody?: string;
    timeout?: number;
    retryEnabled?: boolean;
    retryCount?: number;
    retryDelay?: number;
    retryBackoff?: 'fixed' | 'linear' | 'exponential';
    versaFetch?: any;
    panelUrl?: string;
    empresaSelected?: string;
    csrf_token?: string;
}): Promise<unknown> => {
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
        if (!versaFetch) {
            throw new Error('versaFetch is not provided to proxy execution');
        }

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
    let proxyResponse: ApiProxyResponse | null = null;

    try {
        proxyResponse = await executeSingleRequest();
        const isSuccess = proxyResponse.success === 1 || proxyResponse.success === true;
        if (!isSuccess) {
            lastErrorResponse = proxyResponse;
            const error = new Error(proxyResponse.message || 'Error al ejecutar la API');
            (error as any).proxyResponse = proxyResponse;
            throw error;
        }
        return proxyResponse.payload;
    } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            // eslint-disable-next-line no-await-in-loop
            const delay = calculateDelay(attempt);
            // eslint-disable-next-line no-await-in-loop
            await new Promise<void>(resolve => {
                setTimeout(resolve, delay);
            });

            try {
                // eslint-disable-next-line no-await-in-loop
                proxyResponse = await executeSingleRequest();
                const isSuccess = proxyResponse.success === 1 || proxyResponse.success === true;
                if (!isSuccess) {
                    lastErrorResponse = proxyResponse;
                    const error = new Error(proxyResponse.message || 'Error al ejecutar la API');
                    (error as any).proxyResponse = proxyResponse;
                    throw error;
                }
                return proxyResponse.payload;
            } catch (retryError) {
                lastError = retryError instanceof Error ? retryError : new Error(String(retryError));
                if (attempt < maxRetries) {
                    continue; // eslint-disable-line no-continue
                }
            }
        }
    }

    const finalError = lastError || new Error('Error al ejecutar la API después de reintentos');
    if (lastErrorResponse) {
        (finalError as any).proxyResponse = lastErrorResponse;
    }
    throw finalError;
};

export default async function executeApiCall(
    node: FlowNode,
    context: ExecutionContext,
): Promise<ExecutionResult | null> {
    const config = node.config as any;
    const apiMethod = (config.apiMethod || 'GET') as ApiMethod;
    const apiUrl = context.replaceVariables(config.apiUrl || '');
    const apiResponseFormat = config.apiResponseFormat || 'json';
    const responseVariableName = config.apiResponseVariable?.trim();
    const timeout = Number(config.httpTimeout) || 30000;

    const retryEnabled = config.apiRetryEnabled || false;
    const retryCount = config.apiRetryCount || 2;
    const retryDelay = config.apiRetryDelay || 1000;
    const retryBackoff = config.apiRetryBackoff || 'exponential';

    let outputIndex = 1;
    let isApiSuccess = false;
    let parsedResponse: any = null;
    let apiMessageText = 'sin detalle';

    context.testMessages.push({
        type: 'bot',
        content: `🔌 Llamando API: ${apiMethod} ${apiUrl || '(sin URL configurada)'}`,
        nodeId: node.id,
    });

    if (!apiUrl) {
        context.testMessages.push({
            type: 'bot',
            content: '⚠️ API no ejecutada: el nodo no tiene URL configurada.',
            nodeId: node.id,
        });
        if (!context.isSubroutine) {
            await context.moveToNextNode(node.id, outputIndex);
        }
        return { error: 'URL no configurada' };
    }

    try {
        const apiBodyRaw = config.apiBody || '';
        const apiBodyProcessed = apiBodyRaw ? context.replaceVariables(apiBodyRaw) : undefined;

        const apiHeadersRaw = config.apiHeaders || [];
        const apiHeadersProcessed: Record<string, string> = {};

        if (Array.isArray(apiHeadersRaw)) {
            for (const header of apiHeadersRaw) {
                if (header?.key && header?.value) {
                    apiHeadersProcessed[header.key] = context.replaceVariables(String(header.value));
                }
            }
        } else if (typeof apiHeadersRaw === 'object') {
            for (const [key, val] of Object.entries(apiHeadersRaw)) {
                apiHeadersProcessed[key] = context.replaceVariables(String(val));
            }
        }

        const authType = config.httpAuthType || 'none';
        const authHeader = config.httpAuthHeader || '';
        const authValue = context.replaceVariables(config.httpAuthValue || '');

        if (authType !== 'none' && authHeader && authValue) {
            if (authType === 'bearer') {
                apiHeadersProcessed[authHeader] = `Bearer ${authValue}`;
            } else if (authType === 'basic') {
                apiHeadersProcessed[authHeader] = `Basic ${btoa(authValue)}`;
            } else {
                apiHeadersProcessed[authHeader] = authValue;
            }
        }

        const proxyEnv = (context.variables['_env'] as any) || {};

        const startTime = Date.now();
        const apiResponse = await executeApiViaProxy({
            apiUrl,
            apiMethod,
            apiHeaders: apiHeadersProcessed,
            apiBody: apiBodyProcessed,
            timeout,
            retryEnabled,
            retryCount,
            retryDelay,
            retryBackoff,
            versaFetch: proxyEnv.versaFetch,
            panelUrl: proxyEnv.panelUrl,
            empresaSelected: proxyEnv.empresaSelected,
            csrf_token: proxyEnv.csrf_token,
        });
        const duration = Date.now() - startTime;

        const apiResponseObject =
            apiResponse && typeof apiResponse === 'object'
                ? (apiResponse as { success?: unknown; message?: unknown })
                : null;

        const hasExplicitSuccess = apiResponseObject !== null && 'success' in apiResponseObject;
        const rawSuccess = hasExplicitSuccess ? apiResponseObject.success : undefined;
        isApiSuccess = hasExplicitSuccess ? rawSuccess === 1 || rawSuccess === '1' || rawSuccess === true : true;

        if (responseVariableName) {
            parsedResponse = parseApiResponseByFormat({
                payload: apiResponse,
                format: apiResponseFormat as any,
                jsonPath: config.apiResponsePath,
                jsonTemplate: config.apiResponseTemplate,
            });
            context.variables[responseVariableName] = parsedResponse;
        }

        outputIndex = isApiSuccess ? 0 : 1;

        apiMessageText =
            apiResponseObject && 'message' in apiResponseObject
                ? String(apiResponseObject.message || 'sin detalle')
                : 'sin detalle';

        context.testMessages.push({
            type: 'bot',
            content: isApiSuccess
                ? `✅ API respondió exitosamente (${duration}ms)`
                : `⚠️ API respondió con error: ${apiMessageText}`,
            nodeId: node.id,
            rawResponse: { raw: apiResponse, parsed: parsedResponse, duration },
        });

        if (responseVariableName) {
            context.testMessages.push({
                type: 'bot',
                content: `🧠 Respuesta API guardada en variable "${responseVariableName}"`,
                nodeId: node.id,
            });
        }
    } catch (apiError: any) {
        const proxyDebug = apiError?.proxyResponse;
        context.testMessages.push({
            type: 'bot',
            content: '❌ Error de red al ejecutar el nodo API.',
            nodeId: node.id,
            rawResponse: {
                error: apiError?.message || String(apiError),
                debug_url: proxyDebug?.debug_url,
                debug_response: proxyDebug?.debug_response,
                payload: proxyDebug?.payload,
            },
        });
    }

    if (context.isSubroutine) {
        return isApiSuccess ? { result: parsedResponse } : { error: apiMessageText };
    }
    await context.moveToNextNode(node.id, outputIndex);
    return null;
}
