/**
 * Performance Utilities
 * 
 * Provides memoization helpers and performance optimization patterns.
 * Location: src/shared/utils/performance.js
 */

import { memo, useCallback, useMemo, useRef, useState, useEffect } from 'react';

/**
 * Higher-order component for memoization with proper display name
 * @param {React.ComponentType} Component - Component to memoize
 * @param {Function} propsAreEqual - Optional custom comparison function
 */
export function withMemo(Component, propsAreEqual) {
    const MemoizedComponent = memo(Component, propsAreEqual);
    MemoizedComponent.displayName = `Memo(${Component.displayName || Component.name || 'Component'})`;
    return MemoizedComponent;
}

/**
 * Shallow comparison for objects
 * Useful as propsAreEqual function for memo
 */
export function shallowEqual(objA, objB) {
    if (objA === objB) return true;
    if (!objA || !objB) return false;
    if (typeof objA !== 'object' || typeof objB !== 'object') return false;

    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) return false;

    return keysA.every(key => objA[key] === objB[key]);
}

/**
 * Hook for stable callback reference
 * Similar to useCallback but with stable reference
 */
export function useStableCallback(callback) {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    return useCallback((...args) => callbackRef.current(...args), []);
}

/**
 * Hook for expensive computations with memoization
 * @param {Function} computeFn - Function to compute value
 * @param {Array} deps - Dependencies array
 */
export function useComputed(computeFn, deps) {
    return useMemo(computeFn, deps);
}

/**
 * Hook for debounced value
 * @param {any} value - Value to debounce
 * @param {number} delay - Delay in ms
 */
export function useDebouncedValue(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Hook for throttled callback
 * @param {Function} callback - Function to throttle
 * @param {number} limit - Throttle limit in ms
 */
export function useThrottledCallback(callback, limit = 300) {
    const lastRun = useRef(Date.now());

    return useCallback((...args) => {
        if (Date.now() - lastRun.current >= limit) {
            callback(...args);
            lastRun.current = Date.now();
        }
    }, [callback, limit]);
}
