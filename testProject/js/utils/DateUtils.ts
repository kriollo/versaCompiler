/**
 * Utility for handling dates with consistent timezone application across the application.
 * Relies on window.AppConfig.timezone injected from layout.twig
 */

declare global {
    interface Window {
        AppConfig?: {
            timezone?: string;
            [key: string]: any;
        };
    }
}

// Default to server config or fallback to Santiago if missing
const TARGET_TIMEZONE = window.AppConfig?.timezone || 'America/Santiago';

/**
 * Returns a new Date object representing the current time.
 * Note: JavaScript Date objects are always internally UTC.
 * This helper is mainly for clarity of intent.
 */
export const getCurrentTime = (): Date => new Date();

/**
 * Returns the timezone string used by the application
 */
export const getAppTimezone = (): string => TARGET_TIMEZONE;

/**
 * Formats a date using Intl.DateTimeFormat with the application's target timezone.
 *
 * @param date - Date object, or string compatible with Date constructor
 * @param options - Intl.DateTimeFormatOptions
 * @param locale - Locale string (default 'es-CL')
 * @returns Formatted date string
 */
export const formatDate = (
    date: Date | string,
    options: Intl.DateTimeFormatOptions = {},
    locale: string = 'es-CL',
): string => {
    const d = typeof date === 'string' ? new Date(date) : date;

    // Default options if none provided
    const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        ...options,
        timeZone: TARGET_TIMEZONE, // Force the target timezone
    };

    return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
};

/**
 * Formats a date specifically for "Date only" display (DD-MM-YYYY)
 */
export const formatDateOnly = (date: Date | string): string =>
    formatDate(date, {
        hour: undefined,
        minute: undefined,
        second: undefined,
    });

/**
 * Formats a date for "Time only" display (HH:MM:SS)
 */
export const formatTimeOnly = (date: Date | string): string =>
    formatDate(date, {
        year: undefined,
        month: undefined,
        day: undefined,
    });

/**
 * Helper to check if a date has passed relative to the current time
 */
export const isExpired = (expirationDate: Date | string): boolean => {
    const exp = typeof expirationDate === 'string' ? new Date(expirationDate) : expirationDate;
    const now = getCurrentTime();
    return now.getTime() > exp.getTime();
};
