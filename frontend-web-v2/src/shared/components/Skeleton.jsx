/**
 * Skeleton Loading Components
 * 
 * Provides placeholder UI during data loading
 * for better perceived performance.
 */

/**
 * Base skeleton with pulse animation
 */
export function Skeleton({ className = '', ...props }) {
    return (
        <div
            className={`animate-pulse bg-gray-200 rounded ${className}`}
            {...props}
        />
    );
}

/**
 * Text skeleton - simulates text lines
 */
export function SkeletonText({ lines = 1, className = '' }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className="h-4"
                    style={{ width: i === lines - 1 ? '70%' : '100%' }}
                />
            ))}
        </div>
    );
}

/**
 * Circle skeleton - for avatars
 */
export function SkeletonCircle({ size = 'md', className = '' }) {
    const sizes = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16',
    };
    return <Skeleton className={`rounded-full ${sizes[size]} ${className}`} />;
}

/**
 * Card skeleton - for list items
 */
export function SkeletonCard({ className = '' }) {
    return (
        <div className={`bg-white rounded-xl p-4 border border-gray-100 ${className}`}>
            <div className="flex items-center gap-3">
                <SkeletonCircle size="md" />
                <div className="flex-1">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
        </div>
    );
}

/**
 * Table skeleton - for data tables
 */
export function SkeletonTable({ rows = 5, cols = 4, className = '' }) {
    return (
        <div className={`space-y-3 ${className}`}>
            {/* Header */}
            <div className="flex gap-4 pb-3 border-b border-gray-200">
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} className="h-4 flex-1" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4 py-2">
                    {Array.from({ length: cols }).map((_, j) => (
                        <Skeleton key={j} className="h-4 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}

/**
 * Chart skeleton - for Recharts placeholders
 */
export function SkeletonChart({ type = 'bar', className = '' }) {
    if (type === 'pie') {
        return (
            <div className={`flex items-center justify-center h-64 ${className}`}>
                <Skeleton className="w-48 h-48 rounded-full" />
            </div>
        );
    }

    // Bar/Line chart skeleton
    return (
        <div className={`h-64 flex items-end justify-around gap-2 p-4 ${className}`}>
            {[60, 80, 45, 90, 55, 75, 65].map((h, i) => (
                <Skeleton
                    key={i}
                    className="flex-1 rounded-t"
                    style={{ height: `${h}%` }}
                />
            ))}
        </div>
    );
}

/**
 * Stat card skeleton
 */
export function SkeletonStat({ className = '' }) {
    return (
        <div className={`bg-white rounded-xl p-4 border border-gray-100 ${className}`}>
            <div className="flex items-center gap-3">
                <Skeleton className="w-11 h-11 rounded-xl" />
                <div className="flex-1">
                    <Skeleton className="h-6 w-16 mb-1" />
                    <Skeleton className="h-3 w-24" />
                </div>
            </div>
        </div>
    );
}

export default Skeleton;
