import { type FlowNode, NodeType, type PortLabelConfig } from './flowTypes';

export type PortLabelFn = (node: FlowNode, portIndex: number) => PortLabelConfig;

const INPUT_ENTRY = { label: 'IN', title: 'Entrada del flujo' };
const OUTPUT_NEXT = { label: 'NEXT', title: 'Continuar al siguiente nodo' };

const PORT_LABELS: Record<string, { input?: PortLabelFn; output?: PortLabelFn }> = {
    [NodeType.START]: {
        output: () => ({ label: 'START', title: 'Inicio del flujo', color: 'green' }),
    },

    [NodeType.MESSAGE]: {
        input: () => INPUT_ENTRY,
        output: () => OUTPUT_NEXT,
    },

    [NodeType.QUESTION]: {
        input: () => INPUT_ENTRY,
        output: () => ({ label: 'RESP', title: 'Respuesta guardada en variable', color: 'blue' }),
    },

    [NodeType.MENU]: {
        input: () => INPUT_ENTRY,
        output: (node: FlowNode, idx: number) => {
            const options = node.config.menuOptions || [];
            const singleOutput = node.config.menuSingleOutput === true;
            const hasOptionZero = node.config.menuOptionZeroEnabled === true;

            if (singleOutput) {
                if (hasOptionZero) {
                    if (idx === 0) {
                        return { label: 'BACK', title: 'Volver al menu', color: 'purple' };
                    }
                    return { label: 'SEL', title: 'Seleccion del usuario', color: 'blue' };
                }
                return { label: 'SEL', title: 'Seleccion del usuario', color: 'blue' };
            }

            if (hasOptionZero && idx === 0) {
                return { label: 'BACK', title: 'Volver al menu', color: 'purple' };
            }

            const optIdx = hasOptionZero ? idx - 1 : idx;
            if (optIdx >= 0 && optIdx < options.length) {
                const opt = options[optIdx];
                if (opt) {
                    const shortLabel = (opt.label || `Op${optIdx + 1}`).toString().slice(0, 5);
                    return { label: shortLabel, title: `Opcion ${optIdx + 1}: ${opt.label || opt.value}` };
                }
            }
            return { label: `P${idx + 1}`, title: `Puerto ${idx + 1}` };
        },
    },

    [NodeType.JSON_MENU]: {
        input: () => INPUT_ENTRY,
        output: (node: FlowNode, idx: number) => {
            const singleOutput = node.config.jsonMenuSingleOutput === true;
            const hasOptionZero = node.config.jsonMenuOptionZeroEnabled === true;

            if (singleOutput) {
                if (hasOptionZero) {
                    if (idx === 0) {
                        return { label: 'BACK', title: 'Volver al menu', color: 'purple' };
                    }
                    return { label: 'SEL', title: 'Seleccion del usuario', color: 'blue' };
                }
                return { label: 'SEL', title: 'Seleccion del usuario', color: 'blue' };
            }

            if (hasOptionZero && idx === 0) {
                return { label: 'BACK', title: 'Volver al menu', color: 'purple' };
            }

            return { label: `#${idx + 1}`, title: `Item ${idx + 1} del JSON` };
        },
    },

    [NodeType.CONDITION]: {
        input: () => INPUT_ENTRY,
        output: (node: FlowNode, idx: number) => {
            const conditions = node.config.conditions || [];
            if (idx < conditions.length) {
                const cond = conditions[idx];
                return {
                    label: `IF${idx + 1}`,
                    title: `Si cumple: ${cond?.field || 'condicion'}`,
                    color: 'yellow',
                };
            }
            return { label: 'ELSE', title: 'Por defecto (ninguna condicion)', color: 'gray' };
        },
    },

    [NodeType.API_CALL]: {
        input: () => INPUT_ENTRY,
        output: () => ({ label: 'OK', title: 'Respuesta exitosa (2xx)', color: 'green' }),
    },

    [`${NodeType.API_CALL}_ERR`]: {
        output: () => ({ label: 'ERR', title: 'Error (4xx/5xx o red)', color: 'red' }),
    },

    [NodeType.WEBHOOK]: {
        output: () => ({ label: 'DATA', title: 'Payload recibido', color: 'pink' }),
    },

    [NodeType.DELAY]: {
        input: () => INPUT_ENTRY,
        output: () => ({ label: 'NEXT', title: 'Continuar despues de esperar', color: 'orange' }),
    },

    [NodeType.VARIABLE]: {
        input: () => INPUT_ENTRY,
        output: () => ({ label: 'SET', title: 'Variable asignada', color: 'teal' }),
    },

    [NodeType.SEND_TO]: {
        input: () => INPUT_ENTRY,
        output: () => ({ label: 'DONE', title: 'Transferencia completada', color: 'emerald' }),
    },

    [NodeType.FLOW]: {
        input: () => INPUT_ENTRY,
        output: () => ({ label: 'RET', title: 'Retorno del flujo vinculado', color: 'violet' }),
    },

    [NodeType.END]: {
        input: () => ({ label: 'END', title: 'Fin del flujo', color: 'red' }),
    },

    [NodeType.AI_AGENT]: {
        input: () => INPUT_ENTRY,
        output: (node: FlowNode, idx: number) => {
            if (idx === 0) {
                return { label: 'DONE', title: 'Agente termino', color: 'green' };
            }
            return { label: 'TOOL', title: 'Llamada a herramienta', color: 'purple' };
        },
    },

    [NodeType.LOOP]: {
        input: () => INPUT_ENTRY,
        output: (node: FlowNode, idx: number) => {
            if (idx === 0) {
                return { label: 'ITER', title: 'Ejecutar iteracion', color: 'teal' };
            }
            return { label: 'DONE', title: 'Fin del bucle', color: 'gray' };
        },
    },

    [NodeType.PARALLEL]: {
        input: () => INPUT_ENTRY,
        output: (node: FlowNode, idx: number) => ({
            label: `BR${idx + 1}`,
            title: `Rama paralela ${idx + 1}`,
            color: 'indigo',
        }),
    },

    [NodeType.MERGE]: {
        input: (node: FlowNode, idx: number) => ({
            label: `IN${idx + 1}`,
            title: `Entrada ${idx + 1}`,
            color: 'purple',
        }),
        output: () => ({ label: 'SYNC', title: 'Todas sincronizadas', color: 'green' }),
    },

    [NodeType.CACHE]: {
        input: () => INPUT_ENTRY,
        output: (node: FlowNode, idx: number) => {
            if (idx === 0) {
                return { label: 'HIT', title: 'Cache encontrado', color: 'green' };
            }
            return { label: 'MISS', title: 'No encontrado, obtener de API', color: 'orange' };
        },
    },

    [NodeType.ROUTER]: {
        input: () => INPUT_ENTRY,
        output: (node: FlowNode, idx: number) => {
            const cases = node.config.routerCases || [];
            if (idx < cases.length) {
                const c = cases[idx];
                const val = (c?.value || `C${idx + 1}`).toString().slice(0, 5);
                return { label: val, title: `Caso: ${c?.value}` };
            }
            return { label: 'ELSE', title: 'Por defecto', color: 'gray' };
        },
    },

    [NodeType.ERROR_HANDLER]: {
        input: () => INPUT_ENTRY,
        output: (node: FlowNode, idx: number) => {
            if (idx === 0) {
                return { label: 'OK', title: 'Sin errores', color: 'green' };
            }
            return { label: 'CATCH', title: 'Error capturado', color: 'red' };
        },
    },

    [NodeType.INPUT_MEDIA]: {
        input: () => INPUT_ENTRY,
        output: () => ({ label: 'FILE', title: 'Archivo recibido', color: 'pink' }),
    },

    [NodeType.CUSTOMER_REGISTER]: {
        input: () => INPUT_ENTRY,
        output: () => ({ label: 'OK', title: 'Registro completado', color: 'emerald' }),
    },

    [NodeType.LIST_RENDER]: {
        input: () => INPUT_ENTRY,
        output: () => ({ label: 'LIST', title: 'Lista generada', color: 'lime' }),
    },
};

const AI_TOOLS = [
    NodeType.AI_TOOL_VARIABLE,
    NodeType.AI_TOOL_JSON_EXTRACT,
    NodeType.AI_TOOL_TEMPLATE_RENDER,
    NodeType.AI_TOOL_CONDITION_EVAL,
    NodeType.AI_TOOL_DATETIME,
    NodeType.AI_TOOL_TEXT_UTILS,
    NodeType.AI_TOOL_HTTP,
    NodeType.AI_TOOL_MEMORY,
    NodeType.AI_TOOL_SEND_MESSAGE,
    NodeType.AI_TOOL_WAIT_INPUT,
    NodeType.AI_TOOL_KNOWLEDGE_BASE,
    NodeType.AI_TOOL_MATH,
    NodeType.AI_TOOL_STRUCTURED_OUTPUT,
];

AI_TOOLS.forEach(toolType => {
    PORT_LABELS[toolType] = {
        input: () => ({ label: 'IN', title: 'Entrada desde agente', color: 'purple' }),
        output: () => ({ label: 'OUT', title: 'Resultado para agente', color: 'purple' }),
    };
});

export function getInputPortLabel(node: FlowNode, portIndex: number): PortLabelConfig {
    const fns = PORT_LABELS[node.type];
    if (fns?.input) {
        return fns.input(node, portIndex);
    }
    return { label: `IN${portIndex + 1}`, title: `Puerto de entrada ${portIndex + 1}` };
}

export function getOutputPortLabel(node: FlowNode, portIndex: number): PortLabelConfig {
    const fns = PORT_LABELS[node.type];
    if (fns?.output) {
        return fns.output(node, portIndex);
    }
    return { label: `OUT${portIndex + 1}`, title: `Puerto de salida ${portIndex + 1}` };
}
