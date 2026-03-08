import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

const MEMORY_STORE_KEY = '__memory_store';

interface MemoryEntry {
    key: string;
    value: string;
    timestamp: number;
}

const getMemoryStore = (variables: Record<string, any>): MemoryEntry[] => {
    const raw = variables[MEMORY_STORE_KEY];
    if (Array.isArray(raw)) {
        return raw;
    }
    return [];
};

const setMemoryStore = (variables: Record<string, any>, store: MemoryEntry[]): void => {
    variables[MEMORY_STORE_KEY] = store;
};

const executeAiToolMemory: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, variables } = context;

    const runtimeArgs = variables.__toolArgs || {};
    const operation = String(runtimeArgs.operation || node.config.memoryOperation || 'recall');
    const key = String(runtimeArgs.key || node.config.memoryKey || '');
    const value = String(runtimeArgs.value || node.config.memoryValue || '');
    const query = String(runtimeArgs.query || runtimeArgs.key || '');
    const agentHistoryKey = String(runtimeArgs.agentHistoryKey || node.config.memoryAgentHistoryKey || '');

    const store = getMemoryStore(variables);
    let result: Record<string, unknown> = {};

    if (operation === 'remember') {
        // Guarda o actualiza una entrada en la memoria
        const existing = store.findIndex(e => e.key === key);
        const entry: MemoryEntry = { key, value, timestamp: Date.now() };
        if (existing !== -1) {
            store[existing] = entry;
        } else {
            store.push(entry);
        }
        setMemoryStore(variables, store);
        result = { success: true, key, value, action: 'stored' };

        testMessages.push({
            type: 'bot',
            content: `🧠 [Memoria] Guardado: "${key}" = "${value}"`,
            nodeId: node.id,
            rawResponse: result,
        });
    } else if (operation === 'recall') {
        // Busca entradas por coincidencia parcial en la clave o valor
        const matches = store.filter(
            e =>
                e.key.toLowerCase().includes(query.toLowerCase()) ||
                e.value.toLowerCase().includes(query.toLowerCase()),
        );
        result = {
            found: matches.length > 0,
            total: matches.length,
            memories: matches.map(e => ({ key: e.key, value: e.value })),
        };

        testMessages.push({
            type: 'bot',
            content: `🧠 [Memoria] Recuperadas ${matches.length} entradas para: "${query}"`,
            nodeId: node.id,
            rawResponse: result,
        });
    } else if (operation === 'summarize') {
        // Resume el historial de conversación del agente para reducir tokens
        const historyKey = agentHistoryKey ? `history_${agentHistoryKey}` : null;
        const history: any[] = historyKey ? (variables[historyKey] ?? []) : [];

        if (history.length === 0) {
            result = { summary: 'Sin historial de conversación disponible.', messageCount: 0 };
        } else {
            const userMessages = history.filter((m: any) => m.role === 'user').map((m: any) => m.content);
            const assistantMessages = history.filter((m: any) => m.role === 'assistant').map((m: any) => m.content);
            const summary = `Conversación con ${userMessages.length} mensajes del usuario y ${assistantMessages.length} respuestas del asistente. Últimos temas: ${userMessages.slice(-3).join(' | ')}`;
            result = { summary, messageCount: history.length };

            // Guarda el resumen en la memoria persistente
            const summaryEntry: MemoryEntry = {
                key: `resumen_${historyKey ?? 'historial'}`,
                value: summary,
                timestamp: Date.now(),
            };
            store.push(summaryEntry);
            setMemoryStore(variables, store);
        }

        testMessages.push({
            type: 'bot',
            content: `🧠 [Memoria] Resumen generado: ${(result.summary as string).slice(0, 80)}...`,
            nodeId: node.id,
            rawResponse: result,
        });
    } else if (operation === 'forget') {
        // Elimina una entrada específica o vacía toda la memoria
        const before = store.length;
        const updated = key ? store.filter(e => e.key !== key) : [];
        setMemoryStore(variables, updated);
        result = { success: true, removed: before - updated.length, key: key || 'all' };

        testMessages.push({
            type: 'bot',
            content: `🧠 [Memoria] Eliminadas ${result.removed} entradas`,
            nodeId: node.id,
            rawResponse: result,
        });
    }

    if (isSubroutine) {
        return result;
    }

    await moveToNextNode(node.id, 0);
    return null;
};

export default executeAiToolMemory;
