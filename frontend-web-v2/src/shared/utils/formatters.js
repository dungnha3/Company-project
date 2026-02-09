/**
 * Internationalized date/time formatting utilities
 * Uses Intl.DateTimeFormat for proper locale support
 */

const defaultLocale = 'vi-VN';

/**
 * Format a date with locale-aware formatting
 * @param {Date|string|number} date - The date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @param {string} locale - Locale to use (default: vi-VN)
 */
export function formatDate(date, options = {}, locale = defaultLocale) {
    if (!date) return '';

    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';

    const defaultOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...options,
    };

    return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
}

/**
 * Format time with locale-aware formatting
 */
export function formatTime(date, options = {}, locale = defaultLocale) {
    if (!date) return '';

    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';

    const defaultOptions = {
        hour: '2-digit',
        minute: '2-digit',
        ...options,
    };

    return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
}

/**
 * Format date and time
 */
export function formatDateTime(date, options = {}, locale = defaultLocale) {
    if (!date) return '';

    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';

    const defaultOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        ...options,
    };

    return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date, locale = defaultLocale) {
    if (!date) return '';

    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';

    const now = new Date();
    const diffMs = now - d;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (diffSecs < 60) return rtf.format(-diffSecs, 'second');
    if (diffMins < 60) return rtf.format(-diffMins, 'minute');
    if (diffHours < 24) return rtf.format(-diffHours, 'hour');
    if (diffDays < 30) return rtf.format(-diffDays, 'day');

    return formatDate(d, {}, locale);
}

/**
 * Format a number with locale-aware formatting
 */
export function formatNumber(num, options = {}, locale = defaultLocale) {
    if (num == null || isNaN(num)) return '';

    return new Intl.NumberFormat(locale, options).format(num);
}

/**
 * Format currency with locale-aware formatting
 */
export function formatCurrency(amount, currency = 'VND', locale = defaultLocale) {
    if (amount == null || isNaN(amount)) return '';

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(amount);
}

export default {
    formatDate,
    formatTime,
    formatDateTime,
    formatRelativeTime,
    formatNumber,
    formatCurrency,
    formatBytes,
};

/**
 * Format bytes to human readable string
 * @param {number} bytes - The bytes to format
 * @param {number} decimals - Number of decimal places (default 2)
 */
export function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
