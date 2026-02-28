import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    sanitizeInput,
    isValidRedirectUrl,
    safeRedirect,
    escapeHtml,
    isValidEmail,
    validatePasswordStrength,
    generateRandomId,
    maskSensitiveData,
} from '@shared/utils/security';

let consoleErrorSpy;

describe('security', () => {
    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    // =================================================================
    // sanitizeInput — XSS Prevention
    // =================================================================
    describe('sanitizeInput', () => {
        it('1. Script tag → escaped', () => {
            const result = sanitizeInput('<script>alert("xss")</script>');
            expect(result).not.toContain('<script>');
            expect(result).toContain('&lt;script&gt;');
        });

        it('2. HTML injection → escaped', () => {
            const result = sanitizeInput('<img src=x onerror=alert(1)>');
            expect(result).not.toContain('<img');
            expect(result).toContain('&lt;img');
        });

        it('3. Ampersand → &amp;', () => {
            expect(sanitizeInput('A & B')).toBe('A &amp; B');
        });

        it('4. Quotes → escaped', () => {
            const result = sanitizeInput('"hello" \'world\'');
            expect(result).toContain('&quot;');
            expect(result).toContain('&#x27;');
        });

        it('5. Forward slash → escaped', () => {
            expect(sanitizeInput('path/to')).toContain('&#x2F;');
        });

        it('6. Non-string input → returned as-is', () => {
            expect(sanitizeInput(123)).toBe(123);
            expect(sanitizeInput(null)).toBe(null);
            expect(sanitizeInput(undefined)).toBe(undefined);
        });

        it('7. Normal text → unchanged (no special chars)', () => {
            expect(sanitizeInput('Hello World 123')).toBe('Hello World 123');
        });
    });

    // =================================================================
    // isValidRedirectUrl — Open Redirect Prevention
    // =================================================================
    describe('isValidRedirectUrl', () => {
        it('8. Relative URL /app/dashboard → true', () => {
            expect(isValidRedirectUrl('/app/dashboard')).toBe(true);
        });

        it('9. javascript: URL → false', () => {
            expect(isValidRedirectUrl('javascript:alert(1)')).toBe(false);
        });

        it('10. JAVASCRIPT: (uppercase) → false', () => {
            expect(isValidRedirectUrl('JAVASCRIPT:alert(1)')).toBe(false);
        });

        it('11. data: URL → false', () => {
            expect(isValidRedirectUrl('data:text/html,<h1>xss</h1>')).toBe(false);
        });

        it('12. Protocol-relative //evil.com → false', () => {
            expect(isValidRedirectUrl('//evil.com/steal')).toBe(false);
        });

        it('13. External URL → false', () => {
            expect(isValidRedirectUrl('https://evil.com/phish')).toBe(false);
        });

        it('14. null/empty → false', () => {
            expect(isValidRedirectUrl(null)).toBe(false);
            expect(isValidRedirectUrl('')).toBe(false);
            expect(isValidRedirectUrl(undefined)).toBe(false);
        });

        it('15. Same-origin URL → true', () => {
            const result = isValidRedirectUrl(window.location.origin + '/app');
            expect(result).toBe(true);
        });

        it('16. javascript: with whitespace → false', () => {
            expect(isValidRedirectUrl('  javascript:alert(1)')).toBe(false);
        });
    });

    // =================================================================
    // safeRedirect
    // =================================================================
    describe('safeRedirect', () => {
        it('17. Valid URL → sets window.location.href', () => {
            const original = window.location.href;
            // Mock
            delete window.location;
            window.location = { href: '' };

            safeRedirect('/app/dashboard');
            expect(window.location.href).toBe('/app/dashboard');

            // Restore
            window.location = { href: original };
        });

        it('18. Invalid URL → falls back to /', () => {
            delete window.location;
            window.location = { href: '' };

            safeRedirect('javascript:alert(1)');
            expect(window.location.href).toBe('/');

            window.location = { href: '' };
        });

        it('19. Invalid URL + custom fallback → uses fallback', () => {
            delete window.location;
            window.location = { href: '' };

            safeRedirect('https://evil.com', '/login');
            expect(window.location.href).toBe('/login');

            window.location = { href: '' };
        });
    });

    // =================================================================
    // escapeHtml
    // =================================================================
    describe('escapeHtml', () => {
        it('20. HTML tags → escaped', () => {
            const result = escapeHtml('<b>bold</b>');
            expect(result).not.toContain('<b>');
            expect(result).toContain('&lt;b&gt;');
        });

        it('21. Non-string → returned as-is', () => {
            expect(escapeHtml(42)).toBe(42);
            expect(escapeHtml(null)).toBe(null);
        });
    });

    // =================================================================
    // isValidEmail
    // =================================================================
    describe('isValidEmail', () => {
        it('22. Valid email → true', () => {
            expect(isValidEmail('user@example.com')).toBe(true);
            expect(isValidEmail('test.user@domain.co')).toBe(true);
        });

        it('23. Invalid email → false', () => {
            expect(isValidEmail('not-an-email')).toBe(false);
            expect(isValidEmail('@no-user.com')).toBe(false);
            expect(isValidEmail('no-domain@')).toBe(false);
            expect(isValidEmail('spaces in@email.com')).toBe(false);
        });

        it('24. null/empty → false', () => {
            expect(isValidEmail(null)).toBe(false);
            expect(isValidEmail('')).toBe(false);
            expect(isValidEmail(undefined)).toBe(false);
        });

        it('25. Email with leading/trailing spaces → trimmed and validated', () => {
            expect(isValidEmail('  user@example.com  ')).toBe(true);
        });
    });

    // =================================================================
    // validatePasswordStrength
    // =================================================================
    describe('validatePasswordStrength', () => {
        it('26. Strong password → { valid: true, errors: [] }', () => {
            const result = validatePasswordStrength('MyP@ssw0rd!');
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('27. Too short → error about length', () => {
            const result = validatePasswordStrength('Ab1!');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Mật khẩu phải có ít nhất 8 ký tự');
        });

        it('28. No uppercase → error', () => {
            const result = validatePasswordStrength('myp@ssw0rd!');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Mật khẩu phải có ít nhất 1 chữ hoa');
        });

        it('29. No lowercase → error', () => {
            const result = validatePasswordStrength('MYP@SSW0RD!');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Mật khẩu phải có ít nhất 1 chữ thường');
        });

        it('30. No number → error', () => {
            const result = validatePasswordStrength('MyP@ssword!');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Mật khẩu phải có ít nhất 1 số');
        });

        it('31. No special char → error', () => {
            const result = validatePasswordStrength('MyPassw0rd');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Mật khẩu phải có ít nhất 1 ký tự đặc biệt');
        });

        it('32. null/empty → multiple errors', () => {
            const result = validatePasswordStrength(null);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('33. All requirements missing → 5 errors', () => {
            const result = validatePasswordStrength('');
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(5);
        });
    });

    // =================================================================
    // generateRandomId
    // =================================================================
    describe('generateRandomId', () => {
        it('34. Default length → 64 hex chars (32 bytes × 2)', () => {
            const id = generateRandomId();
            expect(id).toHaveLength(64);
            expect(id).toMatch(/^[0-9a-f]+$/);
        });

        it('35. Custom length=16 → 32 hex chars', () => {
            const id = generateRandomId(16);
            expect(id).toHaveLength(32);
        });

        it('36. Two calls → different values (randomness)', () => {
            const id1 = generateRandomId();
            const id2 = generateRandomId();
            expect(id1).not.toBe(id2);
        });
    });

    // =================================================================
    // maskSensitiveData
    // =================================================================
    describe('maskSensitiveData', () => {
        it('37. Long string → shows last 4 chars', () => {
            expect(maskSensitiveData('1234567890')).toBe('******7890');
        });

        it('38. Custom visibleChars=2', () => {
            expect(maskSensitiveData('abcdef', 2)).toBe('****ef');
        });

        it('39. Short string (≤ visibleChars) → all masked', () => {
            expect(maskSensitiveData('abc', 4)).toBe('***');
        });

        it('40. null/empty → empty string', () => {
            expect(maskSensitiveData(null)).toBe('');
            expect(maskSensitiveData('')).toBe('');
            expect(maskSensitiveData(undefined)).toBe('');
        });

        it('41. Non-string → empty string', () => {
            expect(maskSensitiveData(12345)).toBe('');
        });

        it('42. Exact length = visibleChars → all masked', () => {
            expect(maskSensitiveData('abcd', 4)).toBe('****');
        });
    });

    // ZERO unexpected errors
    it('43. ZERO unexpected console.error', () => {
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
});
