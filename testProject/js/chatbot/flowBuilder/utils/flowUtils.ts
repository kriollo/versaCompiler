import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

/**
 * Obtiene un valor de un objeto anidado usando una ruta de puntos (dot notation)
 */
export const getValueByPath = (source: unknown, path: string): unknown => {
    if (!path || !path.trim()) {
        return source;
    }

    const tokens = path
        .split('.')
        .map(token => token.trim())
        .filter(Boolean);

    let current: any = source;
    for (const token of tokens) {
        if (current === null || current === undefined) {
            return undefined;
        }

        if (Array.isArray(current)) {
            const index = Number.parseInt(token, 10);
            current = Number.isNaN(index) ? undefined : current[index];
        } else if (typeof current === 'object') {
            current = current[token];
        } else {
            return undefined;
        }
    }

    return current;
};

/**
 * Reemplaza variables en formato {{variable}} con sus valores actuales
 */
export const replaceVariables = (text: string, variables: Record<string, any>): string => {
    const singlePass = (str: string) =>
        str.replaceAll(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, rawPath: string) => {
            const path = rawPath.trim();
            const value = getValueByPath(variables, path);
            if (value === null || value === undefined) {
                return `{{${path}}}`;
            }
            if (typeof value === 'object') {
                return JSON.stringify(value);
            }
            return String(value);
        });

    // Dos pasadas para resolver variables anidadas
    return singlePass(singlePass(text));
};

/**
 * Genera una vista previa del contenido de una plantilla de WhatsApp
 */
export const buildTemplatePreview = (node: FlowNode, variables: Record<string, any>): string => {
    const templateName = (node.config.templateName || '').trim();
    const templateLanguage = (node.config.templateLanguage || 'es').trim();
    const params = node.config.templateParams || [];
    const buttons = node.config.templateButtons || [];

    let preview = `📨 Plantilla WhatsApp: ${templateName || '(sin nombre)'} (${templateLanguage})`;

    if (params.length > 0) {
        preview += '\n\nParámetros:';
        params.forEach(param => {
            preview += `\n- ${param.key}: ${replaceVariables(param.value || '', variables)}`;
        });
    }

    if (buttons.length > 0) {
        preview += '\n\nBotones:';
        buttons.forEach((button, index) => {
            const buttonLabel = button.text || button.payload || button.url || 'sin texto';
            preview += `\n${index + 1}. ${button.type} - ${buttonLabel}`;
        });
    }

    return preview;
};

/**
 * Genera una vista previa de mensajes interactivos (botones/listas)
 */
export const buildInteractiveMessagePreview = (node: FlowNode, baseContent: string): string => {
    const channelType = node.config.messageChannelType || 'standard';
    const content = baseContent || 'Selecciona una opción:';

    if (channelType === 'interactive_buttons') {
        const buttons = node.config.interactiveButtons || [];
        let preview = `${content}`;

        if (buttons.length > 0) {
            preview += '\n\nBotones:';
            buttons.forEach((button, index) => {
                preview += `\n${index + 1}. ${button.title || button.id}`;
            });
        }

        return preview;
    }

    if (channelType === 'interactive_list') {
        const sections = node.config.interactiveListSections || [];
        let preview = `${content}`;

        if (sections.length > 0) {
            preview += `\n\nLista (${node.config.interactiveListButtonText || 'Ver opciones'}):`;
            sections.forEach(section => {
                preview += `\n- ${section.title || 'Sección'}`;
                section.rows.forEach((row, rowIndex) => {
                    preview += `\n  ${rowIndex + 1}. ${row.title || row.id}`;
                    if (row.description) {
                        preview += ` (${row.description})`;
                    }
                });
            });
        }

        return preview;
    }

    return content;
};

/**
 * Convierte un string de patrón regex a un objeto RegExp seguro.
 */
export const buildRegexFromPattern = (pattern: string): RegExp => {
    if (!pattern) {
        return new RegExp('');
    }

    // Check if pattern is wrapped in slashes like /pattern/gi
    const match = pattern.match(/^\/(.*)\/([gimsuy]*)$/);
    if (match && match[1] !== undefined) {
        return new RegExp(match[1], match[2] || '');
    }

    // Otherwise return a standard regex object
    return new RegExp(pattern);
};

export const applyTemplateToPayload = (payload: unknown, templateNode: unknown): unknown => {
    if (typeof templateNode === 'string') {
        const exactPlaceholder = templateNode.match(/^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/);
        if (exactPlaceholder && exactPlaceholder[1]) {
            return getValueByPath(payload, exactPlaceholder[1]);
        }

        return templateNode.replaceAll(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, rawPath: string) => {
            const value = getValueByPath(payload, rawPath.trim());
            return value === null || value === undefined ? '' : String(value);
        });
    }

    if (Array.isArray(templateNode)) {
        return templateNode.map(item => applyTemplateToPayload(payload, item));
    }

    if (templateNode && typeof templateNode === 'object') {
        const result: Record<string, unknown> = {};
        Object.entries(templateNode as Record<string, unknown>).forEach(([key, value]) => {
            result[key] = applyTemplateToPayload(payload, value);
        });
        return result;
    }

    return templateNode;
};

export const parseApiResponseByFormat = (params: {
    payload: unknown;
    format: 'json' | 'text' | 'number' | 'boolean';
    jsonPath?: string;
    jsonTemplate?: string;
}): unknown => {
    const { payload, format, jsonPath, jsonTemplate } = params;
    const selectedPayload = format === 'json' && jsonPath ? getValueByPath(payload, jsonPath) : payload;

    switch (format) {
        case 'number': {
            const numeric = Number(selectedPayload);
            return Number.isFinite(numeric) ? numeric : null;
        }
        case 'boolean': {
            if (typeof selectedPayload === 'boolean') {
                return selectedPayload;
            }

            const raw = String(selectedPayload ?? '')
                .trim()
                .toLowerCase();
            return raw === 'true' || raw === '1' || raw === 'yes';
        }
        case 'text': {
            return typeof selectedPayload === 'string' ? selectedPayload : JSON.stringify(selectedPayload ?? '');
        }
        default: {
            if (format === 'json' && jsonTemplate && jsonTemplate.trim() !== '') {
                try {
                    const parsedTemplate = JSON.parse(jsonTemplate);
                    return applyTemplateToPayload(selectedPayload, parsedTemplate);
                } catch {
                    return selectedPayload;
                }
            }
            return selectedPayload;
        }
    }
};
