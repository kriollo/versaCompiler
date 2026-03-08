import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';
import { getValueByPath } from '@/dashboard/js/chatbot/flowBuilder/utils/flowUtils';

const executeJsonMenu: ExecuteFn = (node: FlowNode, context: ExecutionContext) => {
    const { replaceVariables, testMessages, setWaitingNode, variables } = context;
    const { config } = node;

    const sourceVariable = config.jsonMenuSourceVariable || '';
    const jsonPath = config.jsonMenuPath || '';
    const labelField = config.jsonMenuLabelField || 'name';
    const labelTemplate = config.jsonMenuLabelTemplate || '';
    const valueField = config.jsonMenuValueField || 'id';
    const descField = config.jsonMenuDescriptionField || '';
    const descTemplate = config.jsonMenuDescriptionTemplate || '';
    const menuTitle = replaceVariables(config.jsonMenuTitle || 'Selecciona una opción:');
    const renderMode = config.jsonMenuRenderMode || 'generic';
    const maxItems = config.jsonMenuMaxItems || 10;
    const templateName = config.jsonMenuTemplateName || '';
    const templateLanguage = config.jsonMenuTemplateLanguage || 'es';
    const templateParams = config.templateParams || [];
    const templateButtonField = config.jsonMenuTemplateButtonField || labelField;

    testMessages.push({
        type: 'bot',
        content: `📋 Procesando menú JSON desde variable "${sourceVariable}"...`,
        nodeId: node.id,
        isDebug: true,
    });

    if (!sourceVariable) {
        testMessages.push({
            type: 'bot',
            content: '❌ Menú JSON sin variable fuente configurada',
            nodeId: node.id,
        });
        return Promise.resolve(null);
    }

    let jsonData = variables[sourceVariable];
    if (jsonPath && jsonData) {
        jsonData = getValueByPath(jsonData, jsonPath);
    }

    if (!jsonData || !Array.isArray(jsonData)) {
        testMessages.push({
            type: 'bot',
            content: `❌ La variable "${sourceVariable}" no contiene un array válido`,
            nodeId: node.id,
        });
        return Promise.resolve(null);
    }

    const items = jsonData.slice(0, maxItems);

    if (items.length === 0) {
        testMessages.push({
            type: 'bot',
            content: '⚠️ El array JSON está vacío',
            nodeId: node.id,
        });
        return Promise.resolve(null);
    }

    const optionZeroEnabled = config.jsonMenuOptionZeroEnabled === true;
    const optionZeroLabel = config.jsonMenuOptionZeroLabel || '← Volver al menu';
    const optionZeroValue = config.jsonMenuOptionZeroValue || 'option_zero';

    const menuOptions: {
        label: string;
        value: string;
        description?: string;
        data: unknown;
        buttonText?: string;
        isOptionZero?: boolean;
    }[] = [];

    if (optionZeroEnabled) {
        menuOptions.push({
            label: optionZeroLabel,
            value: optionZeroValue,
            description: undefined,
            data: null,
            isOptionZero: true,
        });
    }

    items.forEach((item: any, index: number) => {
        let label = '';
        let description = '';

        if (labelTemplate) {
            label = labelTemplate.replaceAll(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, rawPath: string) => {
                const templateValue = getValueByPath(item, rawPath.trim());
                return templateValue === undefined || templateValue === null ? '' : String(templateValue);
            });
        } else {
            label = String(item[labelField] || item.name || `Opción ${index + 1}`);
        }

        const value = String(item[valueField] || item.id || index);

        if (descTemplate) {
            description = descTemplate.replaceAll(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, rawPath: string) => {
                const descValue = getValueByPath(item, rawPath.trim());
                return descValue === undefined || descValue === null ? '' : String(descValue);
            });
        } else if (descField) {
            description = String(item[descField] || '');
        }

        const buttonText = String(item[templateButtonField] || label);
        menuOptions.push({ label, value, description, data: item, buttonText });
    });

    variables.__jsonMenuOptions = menuOptions;
    variables.__jsonMenuTitle = menuTitle;

    if (renderMode === 'whatsapp_template') {
        let templatePreview = `📨 Plantilla WhatsApp: ${templateName || '(sin nombre)'} (${templateLanguage})`;
        templatePreview += `\n\n📋 Título: ${menuTitle}`;

        if (templateParams.length > 0) {
            templatePreview += '\n\nParámetros del body:';
            templateParams.forEach(param => {
                templatePreview += `\n- ${param.key}: ${replaceVariables(param.value || '')}`;
            });
        }

        templatePreview += '\n\nBotones dinámicos desde JSON:';
        menuOptions.slice(0, 3).forEach((opt, idx) => {
            templatePreview += `\n${idx + 1}. ${opt.buttonText}`;
        });
        if (menuOptions.length > 3) {
            templatePreview += `\n... y ${menuOptions.length - 3} más`;
        }

        testMessages.push({
            type: 'bot',
            content: templatePreview,
            nodeId: node.id,
            rawResponse: {
                templateName,
                templateLanguage,
                templateParams: templateParams.map(p => ({
                    key: p.key,
                    value: replaceVariables(p.value || ''),
                })),
                buttons: menuOptions.slice(0, 3).map(opt => opt.buttonText),
                totalItems: menuOptions.length,
            },
        });
    } else if (renderMode === 'whatsapp_buttons' && menuOptions.length <= 3) {
        let menuContent = `${menuTitle}\n\n`;
        menuOptions.forEach((opt, i) => {
            menuContent += `${i + 1}. ${opt.label}${opt.description ? `\n   ${opt.description}` : ''}\n`;
        });
        menuContent += '\n💡 Responde con el número de la opción.';
        testMessages.push({
            type: 'bot',
            content: menuContent,
            nodeId: node.id,
        });
    } else if (renderMode === 'whatsapp_list') {
        let menuContent = `📱 ${menuTitle}\n`;
        menuContent += `📝 ${menuOptions.length} opciones disponibles\n\n`;
        menuOptions.forEach((opt, i) => {
            menuContent += `${i + 1}. ${opt.label}${opt.description ? ` - ${opt.description}` : ''}\n`;
        });
        menuContent += '\n💡 Responde con el número de la opción.';
        testMessages.push({
            type: 'bot',
            content: menuContent,
            nodeId: node.id,
        });
    } else {
        let menuContent = `${menuTitle}\n\n`;
        menuOptions.forEach((opt, i) => {
            menuContent += `${i + 1}. ${opt.label}${opt.description ? `\n   ${opt.description}` : ''}\n`;
        });
        menuContent += '\n💡 Responde con el número de la opción.';
        testMessages.push({
            type: 'bot',
            content: menuContent,
            nodeId: node.id,
        });
    }

    setWaitingNode(node.id);
    return Promise.resolve(null);
};

export default executeJsonMenu;
