import Swal from 'sweetalert2';

import { $dom } from '@/dashboard/js/composables/dom';
import {
    DATE_FORMAT,
    HTTP_STATUS,
    MYSQL_BOOLEAN,
    PAGINATION,
    TIME_CONVERSIONS,
    TIMEOUTS,
} from '@/dashboard/js/constants';
import { formatDate, formatDateOnly, formatTimeOnly, getCurrentTime } from '@/dashboard/js/utils/DateUtils';
import type { VersaFetchResponse, VersaParamsFetch } from '@/dashboard/types/versaTypes.d';

// Tipos para la conversión de datos
type ConversionType = 'boolean' | 'number' | 'date' | 'string';

interface FieldConversion {
    key: string;
    type: ConversionType;
}

/**
 * Convierte los tipos de datos de un objeto según la configuración especificada
 * @param data - El objeto con los datos crudos (ej. de MySQL)
 * @param conversions - Array con las conversiones a aplicar [{ key: 'campo', type: 'boolean' }]
 * @returns El objeto con los tipos convertidos
 */
export const convertDataTypes = <T = unknown>(data: unknown, conversions: FieldConversion[]): T => {
    if (!data || typeof data !== 'object') {
        return data as T;
    }

    // Si es un array, aplicar conversión a cada elemento
    if (Array.isArray(data)) {
        return data.map(item => convertDataTypes(item, conversions)) as T;
    }

    // Clonar el objeto para no mutar el original
    const result = { ...data }; // Aplicar cada conversión
    conversions.forEach(({ key, type }) => {
        if (key in result) {
            const value = result[key];
            switch (type) {
                case 'boolean': {
                    if (value === MYSQL_BOOLEAN.TRUE_STRING || value === MYSQL_BOOLEAN.TRUE_NUMBER) {
                        result[key] = true;
                    } else if (value === MYSQL_BOOLEAN.FALSE_STRING || value === MYSQL_BOOLEAN.FALSE_NUMBER) {
                        result[key] = false;
                    } else if (typeof value === 'string') {
                        result[key] = value.toLowerCase() === 'true';
                    }
                    break;
                }

                case 'number': {
                    const numValue = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
                    result[key] = Number.isNaN(numValue) ? value : numValue;
                    break;
                }

                case 'date': {
                    if (value && typeof value === 'string') {
                        // Use standard Date constructor but validation remains same
                        const dateValue = new Date(value);
                        result[key] = Number.isNaN(dateValue.getTime()) ? value : dateValue;
                    }
                    break;
                }

                case 'string': {
                    result[key] = String(value);
                    break;
                }

                default: {
                    // No hacer nada si el tipo no es reconocido
                    break;
                }
            }
        }
    });

    return result as T;
};

const loadSwallCss = () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'P@/vendor/sweetalert2/sweetalert2.dark.min.css';
    document.head.append(link);
};
loadSwallCss();

const errorMap = new Map<number, string>([
    // [400, 'El Servidor no pudo procesar la solicitud'],
    // [401, 'No está autorizado para acceder a este recurso'],
    // [403, 'No tiene permisos para realizar esta acción'],
    [HTTP_STATUS.NOT_FOUND, 'Recurso no encontrado'],
    [HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Error interno del servidor'],
    // [503, 'Servicio no disponible'],
    // [422, 'No se pudo procesar la solicitud'],
    // [429, 'Demasiadas solicitudes, intente de nuevo más tarde'],
    // [504, 'El tiempo de espera para el servicio ha sido excedido'],
    // [302, 'La solicitud fue redirigida'],
]);

const _validateResponeStatus = (/** @type {number} */ status) => {
    if (errorMap.has(status)) {
        Swal.fire({
            title: 'Error!',
            text: errorMap.get(status),
            icon: 'error',
            confirmButtonText: 'Aceptar',
        });
        return false;
    }

    return true;
};

/**
 * @preserve
 * Performs a fetch request with the provided parameters.
 * Enhanced with session management and 401 interceptor.
 * @param {VersaParamsFetch} params - The parameters for the fetch request.
 * @property {string} url - The URL to which the request will be made.
 * @property {'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'} method - The HTTP method to use for the request.
 * @property {Record<string, string> | HeadersInit} [headers] - The headers to include in the request.
 * @property {FormData | Record<string, any> | string} [data] - The data to include in the request.
 * @property {'omit' | 'same-origin' | 'include'} [credentials='same-origin'] - The credentials policy to use for the request.
 * @property {boolean} [skipSessionValidation=false] - Skip session validation for this request.
 * @returns {Promise<VersaFetchResponse>} The response from the fetch request.
 */
export const versaFetch = async (params: VersaParamsFetch): Promise<VersaFetchResponse> => {
    const { url, method, headers, data, credentials = 'same-origin', skipSessionValidation = false } = params;
    let defaultHeaders: Record<string, string> = {};
    if (method === 'GET') {
        defaultHeaders = {
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/json, text/plain, */*',
        };
    }

    // If (data && !(data instanceof FormData) && typeof data === 'object') {
    //     DefaultHeaders['Content-Type'] = 'application/json';
    // }

    const init: RequestInit = {
        method: method,
        headers: { ...defaultHeaders, ...headers },
        credentials: credentials,
        body: null,
    };

    if (typeof data === 'object' && !(data instanceof FormData)) {
        if (headers && (headers as any)['Content-Type'] === 'application/json') {
            init.body = typeof data === 'string' ? data : JSON.stringify(data);
        } else if (!headers) {
            // Traspasar data a formdata si no se especifica headers y no es JSON
            const formData = new FormData();
            for (const key in data) {
                if (Object.hasOwn(data, key)) {
                    formData.append(key, data[key]);
                }
            }
            init.body = formData;
        } else {
            init.body = data as any;
        }
    } else if (data) {
        init.body = data as BodyInit;
    }

    try {
        const response = await fetch(url, init);
        const contentType = response.headers.get('Content-Type');
        const isJson = contentType?.includes('application/json');
        const body = isJson ? await response.json() : await response.text();

        // === INTERCEPTOR 401 MEJORADO ===
        if (response.status === 401 && !skipSessionValidation) {
            // Verificar si es el endpoint de heartbeat (para evitar loops)
            const isHeartbeatRequest = url.includes('/api/session/heartbeat');

            // Endpoints de procesos de autenticación donde un 401 NO debe interpretarse como expiración de sesión
            const isAuthProcess = /\/login\/(autentication|apply-reset-password)|\/lost-password\/send/i.test(url);

            // Endpoints de logout donde un 401 es esperado
            const isLogoutProcess = url.includes('/logout');

            if (!isHeartbeatRequest && !isAuthProcess && !isLogoutProcess) {
                // Obtener información detallada del error
                const sessionInfo = isJson && body ? body : { message: 'Sesión expirada' };

                // Determinar el tipo de error 401
                let errorType = 'session_expired';
                if (sessionInfo.reason) {
                    switch (sessionInfo.reason) {
                        case 'Sesión PHP no encontrada':
                        case 'Token de autenticación no encontrado':
                        case 'Token de sesión inválido':
                        case 'Inconsistencia en datos de sesión': {
                            errorType = 'session_invalid';
                            break;
                        }
                        case 'Sesión expirada': {
                            errorType = 'session_expired';
                            break;
                        }
                        default: {
                            errorType = 'auth_error';
                        }
                    }
                }

                // Manejar según el tipo de error
                if (errorType === 'session_expired' || errorType === 'session_invalid') {
                    _handleSessionExpired(sessionInfo.message || 'Su sesión ha expirado');
                } else {
                    // Para otros errores 401, mostrar error genérico sin redirigir
                    VersaToast.fire({
                        icon: 'error',
                        title: 'Error de autenticación',
                        timer: 3000,
                    });
                }

                // Retornar error estructurado con información adicional
                return {
                    success: 0,
                    message: sessionInfo.message || 'Error de autenticación',
                    errors: {
                        expired: errorType === 'session_expired',
                        invalid: errorType === 'session_invalid',
                        type: errorType,
                        reason: sessionInfo.reason,
                    },
                };
            }

            // Si es un proceso de autenticación, devolver la respuesta original del backend
            if (isAuthProcess || isLogoutProcess) {
                return body;
            }
        }

        if (errorMap.has(response.status)) {
            if (isJson) {
                throw new Error(JSON.stringify(body));
            } else if (contentType?.includes('text/html') || contentType === null) {
                const message = errorMap.get(response.status);
                throw new Error(JSON.stringify({ success: 0, message: message }));
            }
        }

        return body;
    } catch (error: Error | any) {
        // Verificar si es un error de red y la página está autenticada
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            _handleNetworkError();
        }

        //Devolver json para que se pueda utilizar con wait res.json()
        try {
            return JSON.parse(error.message);
        } catch {
            // Si no se puede parsear, devolver estructura de error estándar
            return {
                success: 0,
                message: error.message || 'Error desconocido',
                errors: { error: true }, // Cambiado para cumplir con VersaFetchResponse
            };
        }
    }
};

/**
 * @preserve
 * Returns the current date in the format "YYYY-MM-DD".
 * @returns {string} The current date in the format "YYYY-MM-DD".
 */
export const getDateToday = (): string => formatDateOnly(getCurrentTime());

/**
 * @preserve
 * Gets the current year and month in the format 'YYYY-MM'.
 *
 * @returns {string} The formatted date string representing the current year and month.
 */
export const getAnnoMes = (): string => formatDate(getCurrentTime(), { day: undefined }, 'es-CL').slice(0, 7);

/**
 * @preserve
 * Gets the current year.
 *
 * @returns {number} The current year.
 */
export const getAnno = (): number =>
    Number.parseInt(formatDate(getCurrentTime(), { year: 'numeric', month: undefined, day: undefined }), 10);

/**
 * @preserve
 * Returns the current date and time in the format "YYYY-MM-DD HH:MM:SS".
 * @returns {string} The current date and time.
 */
export const getDateTimeToday = (): string => {
    // Format YYYY-MM-DD HH:mm:ss manually or via Intl to match exact format if strict
    // Assuming YYYY-MM-DD HH:mm:ss format is needed
    // Using fr-CA for YYYY-MM-DD part is a trick, but let's be robuster with DateUtils if we can,
    // Or just rely on the server timezone via DateUtils

    // Simplest: use DateUtils to correct the time instance, then format strictly
    // But DateUtils.formatDate returns locale string.

    // Let's adhere to previous output format using standard Date but shifted to target timezone?
    // Actually, let's use the new formatDate with a custom hook if needed, or just standard Intl.
    // The previous code returned "YYYY-MM-DD HH:MM:SS"

    const parts = new Intl.DateTimeFormat('es-CL', {
        // En-CA gives YYYY-MM-DD
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: window.AppConfig?.timezone || 'America/Santiago',
    }).formatToParts(new Date());

    const map = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`;
};

/**
 * @preserve
 * Returns the current time in the format "HH:MM:SS".
 * @returns {string} The current time.
 */
export const getTime = (): string => formatTimeOnly(getCurrentTime());

/**
 * @preserve
 * Añade un número específico de días a una fecha dada y devuelve la nueva fecha en formato YYYY-MM-DD.
 *
 * @param {string|Date} fecha - La fecha inicial a la que se le añadirán los días. Puede ser una cadena de texto en formato reconocible por Date o un objeto Date.
 * @param {number} dias - El número de días a añadir a la fecha.
 * @returns {string} La nueva fecha en formato YYYY-MM-DD.
 * @throws {Error} Si los parámetros de fecha y días no son válidos.
 */
export const addDias = (fecha: string | Date, dias: number): string => {
    // Verificar que los parámetros sean válidos
    if (!fecha || !dias || Number.isNaN(dias)) {
        throw new Error('Los parámetros de fecha y días son obligatorios y deben ser válidos.');
    }

    const fechaActual = new Date(fecha);
    fechaActual.setDate(fechaActual.getDate() + dias);

    // Obtener los valores de año, mes y día
    const { year, month, day } = {
        year: fechaActual.getFullYear(),
        month: String(fechaActual.getMonth() + DATE_FORMAT.MONTH_OFFSET).padStart(
            DATE_FORMAT.PAD_LENGTH,
            DATE_FORMAT.PAD_CHAR,
        ),
        day: String(fechaActual.getDate()).padStart(DATE_FORMAT.PAD_LENGTH, DATE_FORMAT.PAD_CHAR),
    };

    // Formatear la fecha en formato YYYY-MM-DD
    const fechaFormateada = `${year}-${month}-${day}`;
    return fechaFormateada;
};

export const diffDias = (fecha1: string, fecha2: string): number => {
    const fecha1Date = new Date(fecha1);
    const fecha2Date = new Date(fecha2);
    const diffTime = Math.abs(fecha2Date.getTime() - fecha1Date.getTime()) + PAGINATION.DEFAULT_PAGE;
    return Math.ceil(
        diffTime /
            (TIME_CONVERSIONS.MS_TO_SECONDS *
                TIME_CONVERSIONS.SECONDS_TO_MINUTES *
                TIME_CONVERSIONS.MINUTES_TO_HOURS *
                TIME_CONVERSIONS.HOURS_TO_DAY),
    );
};

/**
 * @preserve
 * Displays a custom alert using the Swal library.
 *
 * @param {Object} Params - The parameters for the alert.
 * @param {string} [Params.title='¡Éxito!'] - The title of the alert.
 * @param {string} [Params.message=''] - The message of the alert.
 * @param {string} [Params.html=''] - The HTML content of the alert.
 * @param {string} [Params.type='success'] - The type of the alert icon.
 * @param {boolean} [Params.AutoClose=true] - Determines if the alert should automatically close after a certain time.
 * @param {function} [Params.callback] - The callback function to be executed when the alert is closed.
 * @param {Object} [Params.customClass={}] - The custom classes to apply to the alert.
 */
interface VersaAlertParams {
    title?: string;
    message?: string;
    html?: string;
    type?: 'success' | 'error' | 'warning' | 'info' | 'question';
    AutoClose?: boolean;
    callback?: () => void;
    customClass?: Record<string, string>;
}

export const versaAlert = async (Params: VersaAlertParams): Promise<void> => {
    const {
        title = '¡Éxito!',
        message = '',
        html = '',
        type = 'success',
        AutoClose = true,
        callback,
        customClass = {},
    } = Params;

    const result = await Swal.fire({
        title: title,
        text: message,
        html: html,
        icon: type,
        confirmButtonText: 'Aceptar',
        allowOutsideClick: true,
        allowEscapeKey: true,
        allowEnterKey: true,
        timer: AutoClose ? TIMEOUTS.TOAST_AUTO_CLOSE : PAGINATION.ARRAY_FIRST_INDEX,
        customClass: customClass,
    });
    if (result) {
        if (callback) {
            callback();
        }
    }
};

export const log = console.log.bind(console);

/**
 * @preserve
 * Removes escape characters from a string and decodes HTML entities.
 * Handles multiple levels of encoding (double/triple escaped content).
 *
 * @param {string} str - The string from which to remove escape characters and decode HTML entities.
 * @returns {string} The resulting string with escape characters removed and HTML entities decoded.
 */
export const removeScape = (str: string): string => {
    if (!str || typeof str !== 'string') {
        return str;
    }

    // Eliminar barras invertidas
    let decoded = str.replaceAll(String.raw`/\/`, '');

    // Decodificar entidades HTML múltiples veces hasta que no haya más cambios
    let previousDecoded = '';
    const maxIterations = 5; // Evitar bucle infinito
    let iteration = 0;

    while (decoded !== previousDecoded && iteration < maxIterations) {
        previousDecoded = decoded;

        // Crear un elemento temporal para decodificar entidades HTML
        const textarea = document.createElement('textarea');
        textarea.innerHTML = decoded;
        decoded = textarea.value;

        iteration++;
    }

    return decoded;
};

/**
 * @preserve
 * Sanitiza contenido SVG permitiendo solo elementos seguros.
 * Decodifica entidades HTML y filtra elementos peligrosos.
 *
 * @param {string} svgContent - El contenido SVG a sanitizar.
 * @returns {string} El contenido SVG sanitizado y seguro.
 */
export const sanitizeSvgContent = (svgContent: string): string => {
    if (!svgContent || typeof svgContent !== 'string') {
        return '';
    }

    // Primero decodificar entidades HTML
    let decoded = removeScape(svgContent);

    // Eliminar elementos peligrosos
    const dangerousElements = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button'];
    dangerousElements.forEach(tag => {
        const regex1 = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gis');
        const regex2 = new RegExp(`<${tag}[^>]*/?>`, 'gi');
        decoded = decoded.replaceAll(regex1, '').replaceAll(regex2, '');
    });

    // Eliminar eventos JavaScript (onclick, onload, etc.)
    decoded = decoded.replaceAll(/\s*on\w+\s*=\s*["'][^"']*["']/g, '');
    decoded = decoded.replaceAll(/\s*on\w+\s*=\s*[^>\s]+/g, '');

    // Eliminar javascript: en atributos
    decoded = decoded.replaceAll(/javascript\s*:/gi, '');

    // Eliminar data: URLs que podrían contener JavaScript
    decoded = decoded.replaceAll(/data\s*:\s*[^,]*,/gi, '');

    return decoded;
};
/**
 * @preserve
 * Displays a custom alert using the Swal library.
 * @param {Object} Params - The parameters for the alert.
 * @param {string} [Params.title='¡Éxito!'] - The title of the alert.
 * @param {string} [Params.message=''] - The message of the alert.
 */
export const VersaToast = Swal.mixin({
    toast: true,
    position: 'top-right',
    iconColor: 'white',
    customClass: {
        popup: 'colored-toast',
    },
    showConfirmButton: false,
    timer: 1500,
    timerProgressBar: true,
});

/**
 * @preserve
 * Gets the current date and time in Unix timestamp format.
 *
 * @returns {number} The current Unix timestamp in seconds.
 */
export const getFechaUnix = (): number => {
    const fecha = new Date();
    return Math.floor(fecha.getTime() / TIME_CONVERSIONS.MS_TO_SECONDS);
};

/**
 * @preserve
 * Displays an error response using versaAlert.
 *
 * @param {object} response - The response object containing error information.
 * @param {object} [response.errors] - An optional object containing specific error messages.
 * @param {string} response.message - A general error message.
 * @param {string} [type='alert'] - The type of notification to display ('alert' or 'toast').
 */
export const showErrorResponse = (
    response: { errors?: Record<string, string>; message: string },
    type: string = 'alert',
): void => {
    if (response?.errors === undefined) {
        if (type === 'toast') {
            VersaToast.fire({
                icon: 'error',
                title: response.message,
            });
        } else {
            versaAlert({
                title: 'Error',
                message: response.message,
                type: 'error',
            });
        }
        return;
    }
    const errores = `
        <ul class="max-w-md space-y-1 text-gray-500 list-disc list-inside dark:text-gray-400">
            ${Object.keys(response.errors || {})
                .map(key => `<li>${(response.errors || {})[key]}</li>`)
                .join('')}
        </ul>
    `;
    if (type === 'toast') {
        VersaToast.fire({
            icon: 'error',
            title: errores,
        });
    } else {
        versaAlert({
            title: 'Error',
            html: errores,
            type: 'error',
        });
    }
};

/**
 * Converts a 24-hour time string to a 12-hour time string with AM/PM.
 *
 * @param {number} timing - The value of the timing en miliseconds.
 * @returns {string} the timing in ms, seconds, minutes or hours.
 */
export const showTimingForHumans = (timing: number): string => {
    if (timing < TIME_CONVERSIONS.MS_TO_SECONDS) {
        return `${timing} ms`;
    }
    if (timing < TIME_CONVERSIONS.MS_TO_MINUTES) {
        return `${timing / TIME_CONVERSIONS.MS_TO_SECONDS} s`;
    }
    if (timing < TIME_CONVERSIONS.MS_TO_HOURS) {
        return `${timing / TIME_CONVERSIONS.MS_TO_MINUTES} min`;
    }
    return `${timing / TIME_CONVERSIONS.MS_TO_HOURS} h`;
};

/**
 * Sanitize the module path to prevent directory traversal attacks.
 * @param {string} module - The module path to sanitize.
 * @returns {string} - The sanitized module path.
 */
export const sanitizeModulePath = (module: string): string =>
    module
        .replaceAll(String.raw`\.\.\/`, '') // Eliminar ".."
        .replaceAll(/\/+/g, '/') // Normalizar barras
        .replaceAll(/[^a-zA-Z0-9/_-]/g, ''); // Eliminar caracteres no permitidos

type ModuleName = string & { __brand: 'ModuleName' };
export function isValidModuleName(module: string): module is ModuleName {
    const MODULE_NAME_REGEX = /^(?:@\/)?[a-zA-Z0-9][a-zA-Z0-9/_-]*[a-zA-Z0-9]$/;
    return MODULE_NAME_REGEX.test(module);
}

export function getPanelUrl(): string {
    const urlActual = $dom('#urlActual') as HTMLInputElement | null;
    if (!urlActual) {
        console.warn('No se encontró el elemento #urlActual en el DOM');
        return 'admin';
    }
    const urls = urlActual.value.split('/');
    const panelUrl = urls[1] || 'admin'; // Asume 'admin'
    return panelUrl;
}

/**
 * Maneja la expiración de sesión con interfaz mejorada
 * @internal
 */
const _handleSessionExpired = (message: string): void => {
    // Pausar SessionManager si existe globalmente
    try {
        // @ts-expect-error - Acceso global para evitar dependencia circular
        if (window.sessionManager && typeof window.sessionManager.pauseHeartbeat === 'function') {
            // @ts-expect-error - Acceso global para evitar dependencia circular
            window.sessionManager.pauseHeartbeat();
        }
    } catch {
        // SessionManager no disponible, continuar
    }

    // Mostrar notificación inmediata pero no intrusiva
    VersaToast.fire({
        icon: 'warning',
        title: 'Sesión expirada',
        timer: 3000,
    });

    // Después de un breve delay, mostrar diálogo de confirmación
    setTimeout(() => {
        versaAlert({
            title: 'Sesión Expirada',
            message: message || 'Su sesión ha expirado. Será redirigido al inicio de sesión.',
            type: 'warning',
            AutoClose: false,
            callback: () => {
                _redirectToLogin();
            },
        });

        // Auto-redirect después de 10 segundos
        setTimeout(() => {
            // _redirectToLogin();
        }, 10000);
    }, 1000);
};

/**
 * Maneja errores de conectividad de red
 * @internal
 */
const _handleNetworkError = (): void => {
    // Solo mostrar si estamos en una página autenticada
    const csrfToken = $dom('#csrf_token');
    if (!csrfToken) {
        return; // No mostrar en páginas no autenticadas
    }

    VersaToast.fire({
        icon: 'error',
        title: 'Error de conectividad',
        timer: 3000,
    });
};

/**
 * Redirige al login limpiando el estado
 * @internal
 */
const _redirectToLogin = (): void => {
    try {
        // Limpiar storage
        localStorage.removeItem('spa_cache');
        sessionStorage.clear();
    } catch {
        // Ignorar errores de storage
    }

    // Obtener URL de admin y redirigir
    const adminUrl = `/${getPanelUrl()}`;
    window.location.href = `${adminUrl}/login`;
};

export const randomNumberToken = (len: number): string => {
    const chars = '0123456789';
    let out = '';
    for (let i = 0; i < len; i++) {
        out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
};

export const formatCurrency = (value: number | string, currency: string = 'CLP'): string => {
    const num = typeof value === 'string' ? Number.parseFloat(value) : value;
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0,
    }).format(num || 0);
};
