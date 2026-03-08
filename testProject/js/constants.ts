/* eslint-disable no-magic-numbers */
/**
 * @preserve
 * Constantes globales para el proyecto
 * Evita el uso de números mágicos y centraliza valores importantes
 */

// === CONSTANTES GLOBALES ===
interface GlobalConstants {
    ZERO: number;
    ONE: number;
    TEN: number;
    HUNDRED: number;
    THOUSAND: number;
    MILLION: number;
}
export const GLOBAL_CONSTANTS: GlobalConstants = {
    ZERO: 0,
    ONE: 1,
    TEN: 10,
    HUNDRED: 100,
    THOUSAND: 1000,
    MILLION: 1_000_000,
} as const;

// === CÓDIGOS DE RESPUESTA API ===
interface ApiResponseCodes {
    SUCCESS: number;
    ERROR: number;
}
export const API_RESPONSE_CODES: ApiResponseCodes = {
    SUCCESS: 1,
    ERROR: 0,
} as const;

// === CÓDIGOS DE ESTADO HTTP ===
export const HTTP_STATUS = {
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
} as const;

// === TIMEOUTS Y DELAYS ===
export const TIMEOUTS = {
    TOAST_AUTO_CLOSE: 3000, // 3 segundos para toasts
    PROGRESS_UPDATE: 10, // 10ms para animaciones de progreso
    REDIRECT_DELAY: 1000, // 1 segundo antes de redireccionar
    DROPDOWN_TRANSITION: 300, // 300ms para transiciones de dropdown
    DROPDOWN_OFFSET: 10, // 10px de offset para dropdowns
} as const;

// === PAGINACIÓN ===
export const PAGINATION = {
    DEFAULT_PAGE: 1,
    PER_PAGE_OPTIONS: [1, 5, 10, 25, 50, 100],
    PAGES_LIMIT_MULTIPLIER: 2,
    FIRST_PAGE: 1,
    ARRAY_FIRST_INDEX: 0,
} as const;

// === CONVERSIONES DE TIEMPO ===
export const TIME_CONVERSIONS = {
    MS_TO_SECONDS: 1000,
    SECONDS_TO_MINUTES: 60,
    MINUTES_TO_HOURS: 60,
    HOURS_TO_DAY: 24,
    // Combinadas para facilitar uso
    MS_TO_MINUTES: 60000, // 1000 * 60
    MS_TO_HOURS: 3600000, // 1000 * 60 * 60
} as const;

// === VALIDACIÓN DE ARCHIVOS ===
export const FILE_VALIDATION = {
    BYTES_TO_MB: 1_000_000,
    NOT_FOUND_INDEX: -1,
} as const;

// === FORMATO DE FECHAS ===
export const DATE_FORMAT = {
    PAD_LENGTH: 2,
    PAD_CHAR: '0',
    MONTH_OFFSET: 1, // Los meses en JS empiezan en 0
} as const;

// === RUT CHILENO ===
export const RUT_VALIDATION = {
    MULTIPLIER_START: 2,
    MULTIPLIER_MAX: 7,
    MODULO_BASE: 11,
    DV_K_VALUE: 10,
    DV_ZERO_VALUE: 11,
} as const;

// === PANTALLA/UI ===
export const UI_BREAKPOINTS = {
    MOBILE_MAX_WIDTH: 1024, // Px
    DESKTOP_MIN_WIDTH: 1024, // Px
} as const;

// === VALORES BOOLEANOS MYSQL ===
export const MYSQL_BOOLEAN = {
    TRUE_STRING: '1',
    FALSE_STRING: '0',
    TRUE_NUMBER: 1,
    FALSE_NUMBER: 0,
} as const;
