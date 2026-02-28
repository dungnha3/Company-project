import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    formatDate,
    formatTime,
    formatDateTime,
    formatRelativeTime,
    formatNumber,
    formatCurrency,
    formatBytes,
} from '@shared/utils/formatters';

// --- Console spies ---
let consoleErrorSpy;

describe('formatters', () => {
    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    // =================================================================
    // formatDate
    // =================================================================
    describe('formatDate', () => {
        it('1. Date object → formatted string (vi-VN)', () => {
            const result = formatDate(new Date('2025-03-15'));
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
            // vi-VN format: DD/MM/YYYY
            expect(result).toContain('2025');
            expect(result).toContain('03');
            expect(result).toContain('15');
        });

        it('2. ISO string → formatted string', () => {
            const result = formatDate('2025-01-01T10:00:00Z');
            expect(result).toBeTruthy();
            expect(result).toContain('2025');
        });

        it('3. Timestamp number → formatted string', () => {
            const ts = new Date('2025-06-20').getTime();
            const result = formatDate(ts);
            expect(result).toContain('2025');
        });

        it('4. null/undefined → empty string', () => {
            expect(formatDate(null)).toBe('');
            expect(formatDate(undefined)).toBe('');
            expect(formatDate('')).toBe('');
        });

        it('5. Invalid date string → empty string (BUG CHECK: "abc" should NOT crash)', () => {
            expect(formatDate('abc')).toBe('');
            expect(formatDate('not-a-date')).toBe('');
            expect(formatDate('9999-99-99')).toBe('');
        });

        it('6. Custom locale en-US', () => {
            const result = formatDate('2025-12-25', {}, 'en-US');
            expect(result).toBeTruthy();
            expect(result).toContain('2025');
            expect(result).toContain('12');
            expect(result).toContain('25');
        });

        it('7. Custom options override defaults', () => {
            const result = formatDate('2025-01-15', { month: 'long' }, 'en-US');
            expect(result).toContain('January');
        });
    });

    // =================================================================
    // formatTime
    // =================================================================
    describe('formatTime', () => {
        it('8. Valid date → formatted time string', () => {
            const result = formatTime(new Date('2025-01-15T14:30:00'));
            expect(result).toBeTruthy();
            // Should contain hour and minute
            expect(result).toMatch(/\d{2}:\d{2}/);
        });

        it('9. null → empty string', () => {
            expect(formatTime(null)).toBe('');
        });

        it('10. Invalid date → empty string', () => {
            expect(formatTime('invalid')).toBe('');
        });
    });

    // =================================================================
    // formatDateTime
    // =================================================================
    describe('formatDateTime', () => {
        it('11. Valid date → contains both date and time parts', () => {
            const result = formatDateTime(new Date('2025-06-15T09:30:00'));
            expect(result).toBeTruthy();
            expect(result).toContain('2025');
            // Should include time
            expect(result).toMatch(/\d{2}:\d{2}/);
        });

        it('12. null → empty string', () => {
            expect(formatDateTime(null)).toBe('');
        });
    });

    // =================================================================
    // formatRelativeTime
    // =================================================================
    describe('formatRelativeTime', () => {
        it('13. Date 5 seconds ago → relative time string', () => {
            const fiveSecsAgo = new Date(Date.now() - 5000);
            const result = formatRelativeTime(fiveSecsAgo);
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });

        it('14. Date 30 minutes ago → relative time string', () => {
            const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
            const result = formatRelativeTime(thirtyMinsAgo);
            expect(result).toBeTruthy();
        });

        it('15. Date 5 hours ago → relative time string', () => {
            const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
            const result = formatRelativeTime(fiveHoursAgo);
            expect(result).toBeTruthy();
        });

        it('16. Date 10 days ago → relative time string', () => {
            const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
            const result = formatRelativeTime(tenDaysAgo);
            expect(result).toBeTruthy();
        });

        it('17. Date 60 days ago → fallback to formatDate', () => {
            const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
            const result = formatRelativeTime(sixtyDaysAgo);
            expect(result).toBeTruthy();
            // Should fallback to regular date format (contains year)
            expect(result).toMatch(/\d{4}/);
        });

        it('18. null → empty string', () => {
            expect(formatRelativeTime(null)).toBe('');
        });

        it('19. Invalid date → empty string', () => {
            expect(formatRelativeTime('invalid')).toBe('');
        });
    });

    // =================================================================
    // formatNumber
    // =================================================================
    describe('formatNumber', () => {
        it('20. Normal number → locale-formatted', () => {
            const result = formatNumber(1234567);
            expect(result).toBeTruthy();
            // vi-VN uses . as thousands separator
            expect(result).toContain('.');
        });

        it('21. Decimal number → formatted', () => {
            const result = formatNumber(1234.56);
            expect(result).toBeTruthy();
        });

        it('22. Zero → "0"', () => {
            const result = formatNumber(0);
            expect(result).toBe('0');
        });

        it('23. null/undefined → empty string', () => {
            expect(formatNumber(null)).toBe('');
            expect(formatNumber(undefined)).toBe('');
        });

        it('24. NaN → empty string', () => {
            expect(formatNumber(NaN)).toBe('');
        });

        it('25. Negative number → formatted with minus', () => {
            const result = formatNumber(-5000);
            expect(result).toBeTruthy();
            expect(result).toContain('-');
        });
    });

    // =================================================================
    // formatCurrency
    // =================================================================
    describe('formatCurrency', () => {
        it('26. VND → formatted with currency symbol, no decimals', () => {
            const result = formatCurrency(5000000);
            expect(result).toBeTruthy();
            // Vietnamese Dong formatting
            expect(result).toMatch(/5.*000.*000/); // 5.000.000
        });

        it('27. USD → formatted with $ symbol', () => {
            const result = formatCurrency(100, 'USD', 'en-US');
            expect(result).toBeTruthy();
            expect(result).toContain('$');
            expect(result).toContain('100');
        });

        it('28. null → empty string', () => {
            expect(formatCurrency(null)).toBe('');
        });

        it('29. NaN → empty string', () => {
            expect(formatCurrency(NaN)).toBe('');
        });

        it('30. Zero → formatted zero', () => {
            const result = formatCurrency(0);
            expect(result).toBeTruthy();
            expect(result).toContain('0');
        });
    });

    // =================================================================
    // formatBytes
    // =================================================================
    describe('formatBytes', () => {
        it('31. 0 bytes → "0 Bytes"', () => {
            expect(formatBytes(0)).toBe('0 Bytes');
        });

        it('32. 1024 → "1 KB"', () => {
            expect(formatBytes(1024)).toBe('1 KB');
        });

        it('33. 1536 → "1.5 KB" (2 decimals)', () => {
            expect(formatBytes(1536)).toBe('1.5 KB');
        });

        it('34. 1048576 → "1 MB"', () => {
            expect(formatBytes(1048576)).toBe('1 MB');
        });

        it('35. 1073741824 → "1 GB"', () => {
            expect(formatBytes(1073741824)).toBe('1 GB');
        });

        it('36. Custom decimals=0', () => {
            expect(formatBytes(1536, 0)).toBe('2 KB');
        });

        it('37. Negative decimals treated as 0', () => {
            expect(formatBytes(1536, -1)).toBe('2 KB');
        });

        it('38. NaN/falsy → "0 Bytes"', () => {
            expect(formatBytes(NaN)).toBe('0 Bytes');
            expect(formatBytes(null)).toBe('0 Bytes');
            expect(formatBytes(undefined)).toBe('0 Bytes');
        });

        // 🐛 BUG FIXED: negative bytes → now returns '0 Bytes' (was "NaN undefined")
        it('39. Negative bytes → "0 Bytes" (fixed)', () => {
            expect(formatBytes(-1024)).toBe('0 Bytes');
            expect(formatBytes(-1)).toBe('0 Bytes');
        });
    });

    // =================================================================
    // ZERO unexpected console.error
    // =================================================================
    it('40. ZERO unexpected console errors', () => {
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
});
