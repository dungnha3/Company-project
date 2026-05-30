/**
 * Lazy-loaded Recharts Components
 * 
 * Uses React.lazy and Suspense for code splitting.
 * Reduces initial bundle size by loading charts on-demand.
 */
import { lazy, Suspense } from 'react';
import { SkeletonChart } from './Skeleton';
import ChartErrorBoundary from './ChartErrorBoundary';

// Lazy load Recharts components
const LazyBarChart = lazy(() =>
    import('recharts').then(module => ({ default: module.BarChart }))
);

const LazyLineChart = lazy(() =>
    import('recharts').then(module => ({ default: module.LineChart }))
);

const LazyPieChart = lazy(() =>
    import('recharts').then(module => ({ default: module.PieChart }))
);

const LazyAreaChart = lazy(() =>
    import('recharts').then(module => ({ default: module.AreaChart }))
);

const LazyTreemap = lazy(() =>
    import('recharts').then(module => ({ default: module.Treemap }))
);

// Re-export other Recharts components (small, don't need lazy loading)
export {
    Bar, Line, Pie, Area, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, Rectangle,
    ReferenceLine, ReferenceArea,
} from 'recharts';

/**
 * Wrapped BarChart with lazy loading, error boundary, and loading skeleton
 */
export function BarChart({ children, fallbackHeight = 256, width, height, ...props }) {
    if (!width || !height) {
        return <SkeletonChart type="bar" className={`h-[${fallbackHeight}px]`} />;
    }
    return (
        <ChartErrorBoundary>
            <Suspense fallback={<SkeletonChart type="bar" className={`h-[${fallbackHeight}px]`} />}>
                <LazyBarChart {...props}>
                    {children}
                </LazyBarChart>
            </Suspense>
        </ChartErrorBoundary>
    );
}

/**
 * Wrapped LineChart with lazy loading, error boundary, and loading skeleton
 */
export function LineChart({ children, fallbackHeight = 256, width, height, ...props }) {
    if (!width || !height) {
        return <SkeletonChart type="line" className={`h-[${fallbackHeight}px]`} />;
    }
    return (
        <ChartErrorBoundary>
            <Suspense fallback={<SkeletonChart type="line" className={`h-[${fallbackHeight}px]`} />}>
                <LazyLineChart {...props}>
                    {children}
                </LazyLineChart>
            </Suspense>
        </ChartErrorBoundary>
    );
}

/**
 * Wrapped PieChart with lazy loading, error boundary, and loading skeleton
 */
export function PieChart({ children, fallbackHeight = 256, width, height, ...props }) {
    if (!width || !height) {
        return <SkeletonChart type="pie" className={`h-[${fallbackHeight}px]`} />;
    }
    return (
        <ChartErrorBoundary>
            <Suspense fallback={<SkeletonChart type="pie" className={`h-[${fallbackHeight}px]`} />}>
                <LazyPieChart {...props}>
                    {children}
                </LazyPieChart>
            </Suspense>
        </ChartErrorBoundary>
    );
}

/**
 * Wrapped AreaChart with lazy loading, error boundary, and loading skeleton
 */
export function AreaChart({ children, fallbackHeight = 256, width, height, ...props }) {
    if (!width || !height) {
        return <SkeletonChart type="bar" className={`h-[${fallbackHeight}px]`} />;
    }
    return (
        <ChartErrorBoundary>
            <Suspense fallback={<SkeletonChart type="bar" className={`h-[${fallbackHeight}px]`} />}>
                <LazyAreaChart {...props}>
                    {children}
                </LazyAreaChart>
            </Suspense>
        </ChartErrorBoundary>
    );
}

/**
 * Wrapped Treemap with lazy loading, error boundary, and loading skeleton
 */
export function Treemap({ children, fallbackHeight = 300, width, height, ...props }) {
    if (!width || !height) {
        return <SkeletonChart type="bar" className={`h-[${fallbackHeight}px]`} />;
    }
    return (
        <ChartErrorBoundary>
            <Suspense fallback={<SkeletonChart type="bar" className={`h-[${fallbackHeight}px]`} />}>
                <LazyTreemap {...props}>
                    {children}
                </LazyTreemap>
            </Suspense>
        </ChartErrorBoundary>
    );
}
