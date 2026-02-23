import { useEffect, useState } from 'react';

/**
 * Hook to detect user's reduced motion preference
 * @returns {boolean} true if user prefers reduced motion
 */
export function useReducedMotion() {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
        // Check if window is defined (SSR safety)
        if (typeof window === 'undefined') return false;

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        return mediaQuery.matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

        const handleChange = (event) => {
            setPrefersReducedMotion(event.matches);
        };

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
        // Older browsers
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
    }, []);

    return prefersReducedMotion;
}

/**
 * Utility to get animation props based on reduced motion preference
 * @param {boolean} prefersReducedMotion - from useReducedMotion hook
 * @returns {object} Animation configuration object
 */
export function getAnimationProps(prefersReducedMotion) {
    return {
        // For framer-motion or similar
        transition: prefersReducedMotion
            ? { duration: 0 }
            : { duration: 0.3 },

        // For scroll behavior
        scrollBehavior: prefersReducedMotion ? 'auto' : 'smooth',

        // CSS class for animations
        animationClass: prefersReducedMotion ? 'motion-reduce' : 'motion-normal',
    };
}
