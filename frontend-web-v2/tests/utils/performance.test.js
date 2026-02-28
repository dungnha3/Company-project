import { describe, it, expect, vi } from 'vitest';
import { shallowEqual } from '@shared/utils/performance';

// NOTE: We only test non-hook exports here (shallowEqual, withMemo).
// Hook-based functions (useStableCallback, useComputed, useDebouncedValue, useThrottledCallback)
// require React component rendering context and will be tested in integration/component tests.

describe('performance', () => {
    // =================================================================
    // shallowEqual
    // =================================================================
    describe('shallowEqual', () => {
        it('1. Same reference → true', () => {
            const obj = { a: 1, b: 2 };
            expect(shallowEqual(obj, obj)).toBe(true);
        });

        it('2. Same values, different reference → true', () => {
            expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
        });

        it('3. Different values → false', () => {
            expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
        });

        it('4. Different keys → false', () => {
            expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false);
        });

        it('5. Different number of keys → false', () => {
            expect(shallowEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
        });

        it('6. null vs null → true (first check: objA === objB)', () => {
            // objA === objB → true since null === null
            expect(shallowEqual(null, null)).toBe(true);
        });

        it('7. null vs object → false', () => {
            expect(shallowEqual(null, { a: 1 })).toBe(false);
        });

        it('8. object vs null → false', () => {
            expect(shallowEqual({ a: 1 }, null)).toBe(false);
        });

        it('9. Empty objects → true', () => {
            expect(shallowEqual({}, {})).toBe(true);
        });

        it('10. Nested objects → false (shallow comparison, different references)', () => {
            const nested1 = { data: { x: 1 } };
            const nested2 = { data: { x: 1 } };
            expect(shallowEqual(nested1, nested2)).toBe(false);
        });

        it('11. Nested objects same reference → true', () => {
            const inner = { x: 1 };
            expect(shallowEqual({ data: inner }, { data: inner })).toBe(true);
        });

        it('12. Arrays same content → false (not strict equal)', () => {
            expect(shallowEqual({ arr: [1, 2] }, { arr: [1, 2] })).toBe(false);
        });

        it('13. Primitives: string === string → true', () => {
            expect(shallowEqual('hello', 'hello')).toBe(true);
        });

        it('14. Primitives: string !== number → false', () => {
            expect(shallowEqual('1', 1)).toBe(false);
        });

        // Non-object types
        it('15. number vs number → same value true', () => {
            expect(shallowEqual(42, 42)).toBe(true);
        });

        it('16. undefined vs undefined → true', () => {
            expect(shallowEqual(undefined, undefined)).toBe(true);
        });
    });
});
