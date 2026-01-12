/**
 * Security Utilities
 * 
 * Provides input sanitization, URL validation, and security helpers.
 * Location: src/shared/utils/security.js
 */

/**
 * Sanitize string input to prevent XSS attacks
 * @param {string} input - Raw user input
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Validate URL to prevent open redirect attacks
 * Only allows relative URLs or same-origin URLs
 * @param {string} url - URL to validate
 * @returns {boolean} Whether URL is safe for redirect
 */
export function isValidRedirectUrl(url) {
    if (!url || typeof url !== 'string') return false;

    // Block javascript: and data: URLs
    const lowerUrl = url.toLowerCase().trim();
    if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('data:')) {
        return false;
    }

    // Block protocol-relative URLs (//example.com)
    if (url.startsWith('//')) {
        return false;
    }

    // Allow relative URLs starting with /
    if (url.startsWith('/') && !url.startsWith('//')) {
        return true;
    }

    // Check if same origin
    try {
        const parsed = new URL(url, window.location.origin);
        return parsed.origin === window.location.origin;
    } catch {
        return false;
    }
}

/**
 * Safe redirect - only redirects to validated URLs
 * @param {string} url - URL to redirect to
 * @param {string} fallback - Fallback URL if validation fails
 */
export function safeRedirect(url, fallback = '/') {
    const target = isValidRedirectUrl(url) ? url : fallback;
    window.location.href = target;
}

/**
 * Escape HTML entities in a string
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
    if (typeof str !== 'string') return str;

    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
export function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
export function validatePasswordStrength(password) {
    const errors = [];

    if (!password || password.length < 8) {
        errors.push('Mật khẩu phải có ít nhất 8 ký tự');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Mật khẩu phải có ít nhất 1 chữ hoa');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Mật khẩu phải có ít nhất 1 chữ thường');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Mật khẩu phải có ít nhất 1 số');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Mật khẩu phải có ít nhất 1 ký tự đặc biệt');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Generate random ID for CSRF-like tokens
 * @param {number} length - Length of token
 * @returns {string} Random token
 */
export function generateRandomId(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Mask sensitive data for display
 * @param {string} value - Value to mask
 * @param {number} visibleChars - Number of chars to show at end
 * @returns {string} Masked string
 */
export function maskSensitiveData(value, visibleChars = 4) {
    if (!value || typeof value !== 'string') return '';
    if (value.length <= visibleChars) return '*'.repeat(value.length);

    const masked = '*'.repeat(value.length - visibleChars);
    const visible = value.slice(-visibleChars);
    return masked + visible;
}
