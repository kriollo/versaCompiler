import type { ExecuteFn, ExecutionContext } from '@/dashboard/js/chatbot/flowBuilder/nodes/core/baseNode';
import type { FlowNode } from '@/dashboard/js/chatbot/flowBuilder/types/flowTypes';

const executeCustomerRegister: ExecuteFn = async (node: FlowNode, context: ExecutionContext) => {
    const { testMessages, moveToNextNode, isSubroutine, variables } = context;

    const fields = node.config.customerFields || [];
    if (fields.length === 0) {
        testMessages.push({
            type: 'bot',
            content: 'No hay campos configurados para registrar clientes.',
            nodeId: node.id,
            isDebug: true,
        });

        if (!isSubroutine) {
            await moveToNextNode(node.id, 0);
        }
        return null;
    }

    if (!variables._customerRegisterState) {
        variables._customerRegisterState = { step: 0, data: {}, confirming: false, confirmed: false };
    }

    const state = variables._customerRegisterState as {
        step: number;
        data: Record<string, string>;
        confirming?: boolean;
        confirmed?: boolean;
    };

    const incoming = String(variables._last_user_input || variables.last_user_input || '').trim();

    if (node.config.customerValidateInput && state.confirming) {
        const normalized = incoming.toLowerCase();
        const isYes = ['si', 'sí', 's', 'ok', 'correcto', 'correctos'].includes(normalized);
        const isNo = ['no', 'n', 'incorrecto', 'incorrectos'].includes(normalized);
        if (!isYes && !isNo) {
            testMessages.push({
                type: 'bot',
                content: 'Por favor responde con "si" o "no".',
                nodeId: node.id,
            });
            return null;
        }
        if (isNo) {
            variables._customerRegisterState = { step: 0, data: {}, confirming: false, confirmed: false };
            const [nextField] = fields;
            if (!nextField) {
                return null;
            }
            if (node.config.customerIntroMessage) {
                testMessages.push({
                    type: 'bot',
                    content: node.config.customerIntroMessage,
                    nodeId: node.id,
                });
            }
            testMessages.push({
                type: 'bot',
                content: buildPrompt(node, nextField),
                nodeId: node.id,
            });
            return null;
        }
        state.confirming = false;
        state.confirmed = true;
    }

    if (incoming && fields[state.step]) {
        const { key, label, required, validation, pattern, errorMessage } = fields[state.step];
        const normalized = normalizeValue(key, incoming);
        const validationError = validateField({ key, label, required, validation, pattern, errorMessage }, normalized);
        if (validationError) {
            testMessages.push({
                type: 'bot',
                content: validationError,
                nodeId: node.id,
            });
            return null;
        }
        state.data[key] = normalized;
        state.step += 1;
    }

    if (state.step < fields.length) {
        if (state.step === 0 && node.config.customerIntroMessage) {
            testMessages.push({
                type: 'bot',
                content: node.config.customerIntroMessage,
                nodeId: node.id,
            });
        }
        const [nextField] = fields.slice(state.step, state.step + 1);
        if (!nextField) {
            return null;
        }
        const prompt = buildPrompt(node, nextField);
        testMessages.push({
            type: 'bot',
            content: prompt,
            nodeId: node.id,
        });
        return null;
    }

    if (node.config.customerValidateInput && !state.confirming && !state.confirmed) {
        const summary = fields
            .map(field => {
                const label = field.label || field.key;
                const value = state.data[field.key] || '-';
                return `${label}: ${value}`;
            })
            .join('\n');
        testMessages.push({
            type: 'bot',
            content: `¿Están correctos los datos ingresados?\n${summary}`,
            nodeId: node.id,
        });
        testMessages.push({
            type: 'bot',
            content: 'Responde si o no.',
            nodeId: node.id,
        });
        state.confirming = true;
        return null;
    }

    variables.customer_register = state.data;
    testMessages.push({
        type: 'bot',
        content: node.config.customerSuccessMessage || 'Registro completado (simulación).',
        nodeId: node.id,
        isDebug: true,
    });

    if (!isSubroutine) {
        await moveToNextNode(node.id, 0);
    }

    return null;
};

const buildPrompt = (node: FlowNode, field: { key: string; label?: string; prompt?: string }) => {
    if (field.prompt) {
        return field.prompt;
    }
    if (node.config.customerPrompt) {
        return node.config.customerPrompt.replace('{{field}}', field.label || field.key);
    }
    return `Por favor ingresa ${field.label || field.key}.`;
};

const normalizeValue = (key: string, value: string) => {
    if (key === 'rut') {
        const clean = value.replaceAll(/[^0-9kK]/g, '').toUpperCase();
        if (clean.length < 2) {
            return clean;
        }
        const body = clean.slice(0, -1);
        const dv = clean.slice(-1);
        return `${body}-${dv}`;
    }
    if (key === 'telefono') {
        const digits = value.replaceAll(/[^0-9]/g, '');
        if (digits.startsWith('56')) {
            return digits;
        }
        if (digits.startsWith('9') && digits.length === 9) {
            return `56${digits}`;
        }
        return digits;
    }
    return value.trim();
};

const validateField = (
    field: {
        key: string;
        label?: string;
        required?: boolean;
        validation?: 'rut' | 'email' | 'phone_cl' | 'regex' | 'none';
        pattern?: string;
        errorMessage?: string;
    },
    value: string,
): string | null => {
    const label = field.label || field.key;
    if (field.required && !value) {
        return field.errorMessage || `El campo ${label} es requerido.`;
    }
    if (!value) {
        return null;
    }
    switch (field.validation) {
        case 'rut': {
            if (!value.includes('-')) {
                return field.errorMessage || `El ${label} debe incluir guion (ej: 12345678-9).`;
            }
            return isValidRut(value) ? null : field.errorMessage || 'RUT inválido.';
        }
        case 'email': {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : field.errorMessage || 'Correo inválido.';
        }
        case 'phone_cl': {
            return /^569\d{8}$/.test(value) ? null : field.errorMessage || 'Teléfono inválido.';
        }
        case 'regex': {
            if (!field.pattern) {
                return field.errorMessage || 'Regex inválido.';
            }
            try {
                const regex = new RegExp(field.pattern);
                return regex.test(value) ? null : field.errorMessage || 'Formato inválido.';
            } catch {
                return field.errorMessage || 'Regex inválido.';
            }
        }
        default: {
            return null;
        }
    }
};

const isValidRut = (rut: string) => {
    const clean = rut.replaceAll(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length < 2) {
        return false;
    }
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    let sum = 0;
    let multiplier = 2;
    for (let i = body.length - 1; i >= 0; i -= 1) {
        sum += Number(body[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const mod = 11 - (sum % 11);
    let expected = String(mod);
    if (mod === 11) {
        expected = '0';
    } else if (mod === 10) {
        expected = 'K';
    }
    return dv === expected;
};

export default executeCustomerRegister;
