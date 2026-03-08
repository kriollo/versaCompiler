import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

interface KnowledgeResult {
    id: string;
    content: string;
    score: number;
    source?: string;
    metadata?: Record<string, unknown>;
}

interface KnowledgeBaseSearchResponse {
    success?: number | boolean;
    data?: KnowledgeResult[];
    payload?: KnowledgeResult[];
}

const executeAiToolKnowledgeBase: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, variables, replaceVariables, _env } = context;

    const runtimeArgs = variables.__toolArgs || {};

    const query = String(runtimeArgs.query || runtimeArgs.question || '');
    const knowledgeBaseId = String(runtimeArgs.knowledgeBaseId || node.config.kbId || '');
    const topK = Number(runtimeArgs.topK || node.config.kbTopK || 3);
    const minScore = Number(node.config.kbMinScore ?? 0.5);
    const outputVariable = String(node.config.kbOutputVariable || '__kb_results');

    if (!query) {
        const error = 'La consulta (query) es obligatoria';
        testMessages.push({ type: 'bot', content: `❌ ${error}`, nodeId: node.id });
        if (isSubroutine) {
            return { success: false, error, results: [] };
        }
        await moveToNextNode(node.id, 0);
        return null;
    }

    if (!knowledgeBaseId) {
        const error = 'ID de base de conocimiento no configurado';
        testMessages.push({ type: 'bot', content: `❌ ${error}`, nodeId: node.id });
        if (isSubroutine) {
            return { success: false, error, results: [] };
        }
        await moveToNextNode(node.id, 0);
        return null;
    }

    if (!_env?.versaFetch) {
        const error = 'versaFetch no disponible. Ejecuta desde el servidor.';
        testMessages.push({ type: 'bot', content: `❌ ${error}`, nodeId: node.id });
        if (isSubroutine) {
            return { success: false, error, results: [] };
        }
        await moveToNextNode(node.id, 0);
        return null;
    }

    let results: KnowledgeResult[] = [];

    try {
        const response = (await _env.versaFetch({
            url: `/${_env.panelUrl}/api/knowledge-base/${knowledgeBaseId}/search`,
            method: 'POST',
            data: JSON.stringify({
                query: replaceVariables(query),
                top_k: topK,
                min_score: minScore,
            }),
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': _env.csrf_token,
            },
        })) as KnowledgeBaseSearchResponse;

        if (response?.success && Array.isArray(response.data)) {
            results = response.data;
        } else if (response?.payload && Array.isArray(response.payload)) {
            results = response.payload;
        }
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Error al buscar en base de conocimiento';
        testMessages.push({
            type: 'bot',
            content: `❌ Error: ${errorMsg}`,
            nodeId: node.id,
        });
        if (isSubroutine) {
            return { success: false, error: errorMsg, results: [] };
        }
        await moveToNextNode(node.id, 0);
        return null;
    }

    variables[outputVariable] = results;

    const resultData = {
        success: true,
        total: results.length,
        query,
        results: results.map(r => ({ content: r.content, score: r.score, source: r.source })),
    };

    testMessages.push({
        type: 'bot',
        content: `📚 [KB] ${results.length} resultado(s) para: "${query.slice(0, 50)}..."`,
        nodeId: node.id,
        rawResponse: resultData,
    });

    if (isSubroutine) {
        return resultData;
    }

    await moveToNextNode(node.id, 0);
    return null;
};

export default executeAiToolKnowledgeBase;
