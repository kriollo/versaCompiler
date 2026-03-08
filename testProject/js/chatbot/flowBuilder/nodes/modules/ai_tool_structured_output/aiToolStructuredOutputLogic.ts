import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

interface SchemaField {
    field: string;
    type: 'string' | 'number' | 'boolean' | 'array';
    description?: string;
    required?: boolean;
    defaultValue?: unknown;
}

/**
 * Intenta extraer un valor tipado desde un objeto JSON o texto plano.
 */
const extractValue = ({
    source,
    field,
    type,
    defaultValue,
}: {
    source: Record<string, unknown>;
    field: string;
    type: string;
    defaultValue: unknown;
}): unknown => {
    // Soporta rutas anidadas: "data.user.name"
    const parts = field.split('.');
    let current: unknown = source;
    for (const part of parts) {
        if (current !== null && typeof current === 'object' && part in (current as object)) {
            current = (current as Record<string, unknown>)[part];
        } else {
            return defaultValue;
        }
    }

    switch (type) {
        case 'number': {
            return current !== undefined ? Number(current) : defaultValue;
        }
        case 'boolean': {
            return current !== undefined ? Boolean(current) : defaultValue;
        }
        case 'array': {
            return Array.isArray(current) ? current : defaultValue;
        }
        default: {
            return current !== undefined ? String(current) : defaultValue;
        }
    }
};

const executeAiToolStructuredOutput: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, variables, replaceVariables } = context;

    const runtimeArgs = variables.__toolArgs || {};

    const schema: SchemaField[] = node.config.structuredSchema ?? [];
    const sourceVariable = String(runtimeArgs.sourceVariable || node.config.structuredSourceVariable || '');
    const outputVariable = String(node.config.structuredOutputVariable || '__structured_data');
    const fallbackToLastMessage = node.config.structuredFallbackToLastMessage !== false;

    // Obtiene la fuente de datos: variable configurada, argumento en runtime o último mensaje del usuario
    let rawSource: unknown = sourceVariable ? variables[sourceVariable] : undefined;
    if (rawSource === undefined && fallbackToLastMessage && typeof context.getLastUserMessage === 'function') {
        rawSource = context.getLastUserMessage();
    }
    if (rawSource === undefined && runtimeArgs.data !== undefined) {
        rawSource = runtimeArgs.data;
    }
    if (rawSource === undefined) {
        rawSource = replaceVariables(node.config.structuredRawText || '');
    }

    // Intenta parsear como JSON si es string
    let sourceObject: Record<string, unknown> = {};
    if (typeof rawSource === 'string') {
        const trimmed = rawSource.trim();
        const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                sourceObject = JSON.parse(jsonMatch[0]);
            } catch {
                sourceObject = {};
            }
        }
    } else if (rawSource !== null && typeof rawSource === 'object') {
        sourceObject = rawSource as Record<string, unknown>;
    }

    // Extrae cada campo según el schema
    const extracted: Record<string, unknown> = {};
    const missing: string[] = [];

    for (const fieldDef of schema) {
        const value = extractValue({
            source: sourceObject,
            field: fieldDef.field,
            type: fieldDef.type ?? 'string',
            defaultValue: fieldDef.defaultValue,
        });
        if (value !== undefined && value !== fieldDef.defaultValue) {
            extracted[fieldDef.field] = value;
        } else if (fieldDef.required) {
            missing.push(fieldDef.field);
            extracted[fieldDef.field] = fieldDef.defaultValue;
        } else {
            extracted[fieldDef.field] = fieldDef.defaultValue;
        }
    }

    variables[outputVariable] = extracted;

    const resultData = {
        success: missing.length === 0,
        extracted,
        missingRequired: missing,
        fieldsExtracted: Object.keys(extracted).length,
    };

    testMessages.push({
        type: 'bot',
        content: `🔧 [Extracción estructurada] ${Object.keys(extracted).length} campo(s) extraídos${missing.length > 0 ? ` | Faltantes: ${missing.join(', ')}` : ''}`,
        nodeId: node.id,
        rawResponse: resultData,
    });

    if (isSubroutine) {
        return resultData;
    }

    await moveToNextNode(node.id, 0);
    return null;
};

export default executeAiToolStructuredOutput;
