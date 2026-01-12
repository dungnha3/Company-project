/**
 * Optimized Image Component
 * 
 * Features:
 * - Lazy loading with IntersectionObserver
 * - Skeleton placeholder while loading
 * - WebP support with fallback
 * - Error handling with fallback image
 * 
 * Location: src/shared/components/OptimizedImage.jsx
 */

import { useState, useRef, useEffect, memo } from 'react';

function OptimizedImageBase({
    src,
    alt = '',
    className = '',
    placeholder,
    fallback = '/placeholder.svg',
    width,
    height,
    lazy = true,
    ...props
}) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(!lazy);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef();

    // Intersection Observer for lazy loading
    useEffect(() => {
        if (!lazy) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            {
                rootMargin: '100px', // Start loading 100px before entering viewport
                threshold: 0.01
            }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, [lazy]);

    // Handle image load error
    const handleError = () => {
        if (!hasError) {
            setHasError(true);
        }
    };

    // Handle image load success
    const handleLoad = () => {
        setIsLoaded(true);
    };

    // Determine which source to use
    const imageSrc = hasError ? fallback : src;

    return (
        <div
            ref={imgRef}
            className={`relative overflow-hidden ${className}`}
            style={{ width, height }}
        >
            {/* Skeleton placeholder */}
            {!isLoaded && (
                <div
                    className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
                    aria-hidden="true"
                />
            )}

            {/* Custom placeholder */}
            {placeholder && !isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                    {placeholder}
                </div>
            )}

            {/* Actual image - only load when in view */}
            {isInView && (
                <img
                    src={imageSrc}
                    alt={alt}
                    onLoad={handleLoad}
                    onError={handleError}
                    loading={lazy ? 'lazy' : 'eager'}
                    decoding="async"
                    className={`
            w-full h-full object-cover
            transition-opacity duration-300
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
          `}
                    {...props}
                />
            )}
        </div>
    );
}

// Memoize to prevent unnecessary re-renders
export const OptimizedImage = memo(OptimizedImageBase);

/**
 * Avatar component with optimizations
 */
export function Avatar({
    src,
    name = '',
    size = 'md',
    className = '',
    ...props
}) {
    const sizeClasses = {
        xs: 'w-6 h-6 text-xs',
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-base',
        lg: 'w-12 h-12 text-lg',
        xl: 'w-16 h-16 text-xl',
    };

    const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    if (!src) {
        // Fallback to initials
        return (
            <div
                className={`
          ${sizeClasses[size]} 
          rounded-full bg-blue-500 text-white
          flex items-center justify-center font-medium
          ${className}
        `}
                {...props}
            >
                {initials || '?'}
            </div>
        );
    }

    return (
        <OptimizedImage
            src={src}
            alt={name}
            className={`${sizeClasses[size]} rounded-full ${className}`}
            {...props}
        />
    );
}

export default OptimizedImage;
