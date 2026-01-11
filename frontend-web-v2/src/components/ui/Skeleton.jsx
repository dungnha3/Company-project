/**
 * Skeleton Loading Components
 * Pure Tailwind - uses animate-pulse and shimmer effects
 */

// Basic skeleton line
export function SkeletonLine({ className = '' }) {
    return (
        <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 ${className}`} />
    );
}

// Skeleton for text content
export function SkeletonText({ lines = 3, className = '' }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <SkeletonLine
                    key={i}
                    className={i === lines - 1 ? 'w-2/3' : 'w-full'}
                />
            ))}
        </div>
    );
}

// Skeleton for avatar/circle
export function SkeletonCircle({ size = 'md', className = '' }) {
    const sizes = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-14 h-14',
        xl: 'w-20 h-20',
    };
    return (
        <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full ${sizes[size]} ${className}`} />
    );
}

// Skeleton for cards
export function SkeletonCard({ className = '' }) {
    return (
        <div className={`animate-pulse bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 ${className}`}>
            <div className="flex items-center gap-3 mb-4">
                <SkeletonCircle size="md" />
                <div className="flex-1 space-y-2">
                    <SkeletonLine className="w-1/2" />
                    <SkeletonLine className="w-1/3 h-3" />
                </div>
            </div>
            <SkeletonText lines={2} />
        </div>
    );
}

// Skeleton for stat cards
export function SkeletonStatCard({ className = '' }) {
    return (
        <div className={`animate-pulse bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 ${className}`}>
            <div className="flex items-center gap-3">
                <SkeletonCircle size="md" className="rounded-lg" />
                <div className="flex-1">
                    <SkeletonLine className="w-12 h-6 mb-1" />
                    <SkeletonLine className="w-16 h-3" />
                </div>
            </div>
        </div>
    );
}

// Skeleton for table rows
export function SkeletonTableRow({ cols = 5, className = '' }) {
    return (
        <tr className={`animate-pulse ${className}`}>
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="px-6 py-4">
                    <SkeletonLine className={i === 0 ? 'w-3/4' : 'w-1/2'} />
                </td>
            ))}
        </tr>
    );
}

// Skeleton for full table
export function SkeletonTable({ rows = 5, cols = 5, className = '' }) {
    return (
        <div className={`overflow-hidden ${className}`}>
            <table className="w-full">
                <thead>
                    <tr className="animate-pulse bg-gray-50 dark:bg-gray-800">
                        {Array.from({ length: cols }).map((_, i) => (
                            <th key={i} className="px-6 py-4 text-left">
                                <SkeletonLine className="w-20 h-3" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {Array.from({ length: rows }).map((_, i) => (
                        <SkeletonTableRow key={i} cols={cols} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Skeleton for list items
export function SkeletonList({ items = 5, className = '' }) {
    return (
        <div className={`space-y-3 ${className}`}>
            {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <SkeletonCircle size="sm" />
                    <div className="flex-1">
                        <SkeletonLine className="w-3/4 mb-1" />
                        <SkeletonLine className="w-1/2 h-3" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default {
    Line: SkeletonLine,
    Text: SkeletonText,
    Circle: SkeletonCircle,
    Card: SkeletonCard,
    StatCard: SkeletonStatCard,
    TableRow: SkeletonTableRow,
    Table: SkeletonTable,
    List: SkeletonList,
};
