import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

interface MergeState {
    arrived: number[];
    results: unknown[];
    errors: unknown[];
    startTime: number;
}

const mergeStates = new Map<string, MergeState>();

const executeMerge: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, variables, connections, stopExecution, sourceNodeId } = context;

    const mergeMode = node.config.mergeMode || 'wait_all';
    const resultsVariable = node.config.mergeResultsVariable || 'merge_results';
    const mergeKey = node.id;

    const incomingConnections = connections.filter(c => c.targetNodeId === node.id);
    const expectedInputs =
        node.config.mergeExpectedInputs ||
        node.inputs ||
        (incomingConnections.length > 0 ? incomingConnections.length : 0);

    // Detectar qué puerto de entrada está recibiendo la conexión
    // SourceNodeId es el nodo que nos llamó (el nodo anterior en el flujo)
    const incomingConnection = sourceNodeId ? incomingConnections.find(c => c.sourceNodeId === sourceNodeId) : null;
    const inputIndex = incomingConnection?.targetPortIndex ?? 0;

    testMessages.push({
        type: 'bot',
        content: `🔀 Merge recibió rama de "${sourceNodeId || 'unknown'}" en puerto ${inputIndex}`,
        nodeId: node.id,
        isDebug: true,
    });

    let mergeState = mergeStates.get(mergeKey);
    if (!mergeState) {
        mergeState = {
            arrived: [],
            results: Array.from({ length: expectedInputs }, () => null),
            errors: [],
            startTime: Date.now(),
        };
        mergeStates.set(mergeKey, mergeState);
    }

    if (mergeState.arrived.includes(inputIndex)) {
        testMessages.push({
            type: 'bot',
            content: `🔀 Merge: puerto ${inputIndex} ya llegó anteriormente`,
            nodeId: node.id,
            isDebug: true,
        });
        return null;
    }

    mergeState.arrived.push(inputIndex);
    mergeState.results[inputIndex] = { ...variables };

    const arrivedCount = mergeState.arrived.length;
    const hasErrors = mergeState.errors.length > 0;

    testMessages.push({
        type: 'bot',
        content: `🔀 Merge: ${arrivedCount}/${expectedInputs} ramas llegadas`,
        nodeId: node.id,
        rawResponse: { arrived: [...mergeState.arrived], inputIndex, expectedInputs },
    });

    if (hasErrors && mergeMode === 'wait_all') {
        testMessages.push({
            type: 'bot',
            content: `❌ Merge detectó errores en las ramas: flujo terminado`,
            nodeId: node.id,
        });
        mergeStates.delete(mergeKey);
        stopExecution('❌ Error en ejecución paralela');
        return null;
    }

    const allArrived = arrivedCount >= expectedInputs;

    if (allArrived) {
        variables[resultsVariable] = mergeState.results;
        testMessages.push({
            type: 'bot',
            content: `✅ Merge completado: ${arrivedCount} ramas sincronizadas`,
            nodeId: node.id,
        });
        mergeStates.delete(mergeKey);

        if (!isSubroutine) {
            await moveToNextNode(node.id, 0);
        }
    } else {
        testMessages.push({
            type: 'bot',
            content: `⏳ Merge esperando ${expectedInputs - arrivedCount} ramas más...`,
            nodeId: node.id,
        });
    }

    return null;
};

export default executeMerge;
