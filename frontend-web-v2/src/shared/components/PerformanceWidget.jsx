import { useMemo } from 'react';
import { useEmployeePerformance } from '@shared/hooks/usePerformance';
import Skeleton from './Skeleton';

/**
 * Performance Widget - Reusable component for displaying performance scores
 * Used in: MyWorkPage, ProjectDashboard, HRDashboard, EmployeeCard, IssueCards
 */
export default function PerformanceWidget({
    employeeId,
    employeeName,
    employeeAvatar,
    data, // if pre-fetched
    compact = false,
    showTrend = false,
    size = 'md', // 'sm' | 'md' | 'lg'
    className = '',
    onClick,
}) {
    // Fetch if not provided
    const { data: fetchedData, isLoading } = useEmployeePerformance(employeeId);

    const perfData = data || fetchedData;

    const scores = useMemo(() => {
        if (!perfData) return null;
        if (perfData.scores) return perfData.scores;
        return {
            performance: perfData.totalPerformanceScore || perfData.overallScore || perfData.performance || 0,
            speed: perfData.speedScore || 0,
            quality: perfData.qualityScore || perfData.quality || 0,
            volume: perfData.volumeScore || perfData.volume || 0,
        };
    }, [perfData]);

    const overallScore = scores?.performance || scores?.overallScore || 0;
    const trend = perfData?.trend;
    const trendValue = trend ? trend[trend.length - 1]?.value - trend[0]?.value : 0;

    const scoreColor = getScoreColor(overallScore);
    const scoreLabel = getScoreLabel(overallScore);

    if (isLoading) return <PerformanceWidgetSkeleton compact={compact} size={size} />;
    if (!perfData && !data) return null;

    const sizeClasses = {
        sm: 'gap-1',
        md: 'gap-2',
        lg: 'gap-3',
    };

    const valueClasses = {
        sm: 'text-base font-bold',
        md: 'text-xl font-black',
        lg: 'text-2xl font-black',
    };

    const labelClasses = {
        sm: 'text-[9px]',
        md: 'text-[10px]',
        lg: 'text-xs',
    };

    const colorClasses = {
        green: { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
        indigo: { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-700' },
        amber: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
        orange: { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
        red: { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
    };

    const cls = colorClasses[scoreColor] || colorClasses.indigo;

    if (compact) {
        return (
            <div
                className={`flex items-center gap-2 ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
                onClick={onClick}
                title={`${scoreLabel}: ${overallScore.toFixed(1)}/10`}
            >
                {employeeAvatar && (
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                        {typeof employeeAvatar === 'string' && employeeAvatar.startsWith('http')
                            ? <img src={employeeAvatar} alt={employeeName} className="w-full h-full rounded-full object-cover" />
                            : (employeeName || '?').charAt(0).toUpperCase()
                        }
                    </div>
                )}
                <span className={`font-bold ${cls.text}`}>
                    {Number(overallScore).toFixed(1)}
                </span>
                {showTrend && trendValue !== 0 && (
                    <span className={`text-xs ${trendValue > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trendValue > 0 ? '↑' : '↓'} {Math.abs(trendValue).toFixed(1)}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div
            className={`rounded-xl border p-3 ${cls.bg} ${cls.border} ${onClick ? 'cursor-pointer hover:shadow-sm' : ''} ${className}`}
            onClick={onClick}
        >
            {/* Header */}
            {(employeeName || employeeAvatar) && (
                <div className="flex items-center gap-2 mb-2">
                    {employeeAvatar ? (
                        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 overflow-hidden flex items-center justify-center text-xs font-bold">
                            {employeeAvatar.startsWith('http') ? (
                                <img src={employeeAvatar} alt={employeeName} className="w-full h-full object-cover" />
                            ) : (
                                (employeeName || '?').charAt(0).toUpperCase()
                            )}
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-bold">
                            {(employeeName || '?').charAt(0).toUpperCase()}
                        </div>
                    )}
                    {employeeName && (
                        <span className="text-sm font-semibold text-gray-800 truncate">{employeeName}</span>
                    )}
                </div>
            )}

            {/* Main Score */}
            <div className="text-center mb-2">
                <div className={`${valueClasses[size]} ${cls.text}`}>
                    {Number(overallScore).toFixed(1)}
                    <span className="text-sm font-normal opacity-60">/10</span>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls.badge}`}>
                    {scoreLabel}
                </span>
            </div>

            {/* Sub Scores */}
            {!compact && scores && size !== 'sm' && (
                <div className={`space-y-1.5 ${sizeClasses[size]}`}>
                    <SubScoreBar label="Tốc độ" value={scores.speed || 0} color="#14b8a6" />
                    <SubScoreBar label="Chất lượng" value={scores.quality || 0} color="#f59e0b" />
                    <SubScoreBar label="Khối lượng" value={scores.volume || 0} color="#8b5cf6" />
                </div>
            )}

            {/* Trend */}
            {showTrend && trendValue !== 0 && (
                <div className="mt-2 text-center">
                    <span className={`text-xs font-semibold ${trendValue > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trendValue > 0 ? '↑' : '↓'} {Math.abs(trendValue).toFixed(1)} so với kỳ trước
                    </span>
                </div>
            )}
        </div>
    );
}

function SubScoreBar({ label, value, color }) {
    const pct = Math.min((Number(value) / 10) * 100, 100);
    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 w-16 truncate">{label}</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="text-[10px] font-bold text-gray-600 w-8 text-right">{Number(value).toFixed(1)}</span>
        </div>
    );
}

function PerformanceWidgetSkeleton({ compact, size }) {
    return (
        <div className={`rounded-xl border bg-gray-50 border-gray-100 p-3 ${compact ? 'w-20' : 'w-full'}`}>
            <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
                <div className="h-8 bg-gray-200 rounded" />
                <div className="h-2 bg-gray-200 rounded w-full" />
            </div>
        </div>
    );
}

// ── Helper functions (exported for use elsewhere) ──────────────────────────

export function getScoreColor(score) {
    const s = Number(score) || 0;
    if (s >= 9.0) return 'green';
    if (s >= 8.0) return 'indigo';
    if (s >= 6.5) return 'amber';
    if (s >= 5.0) return 'orange';
    return 'red';
}

export function getScoreLabel(score) {
    const s = Number(score) || 0;
    if (s >= 9.0) return 'Excellent';
    if (s >= 8.0) return 'Good';
    if (s >= 6.5) return 'Satisfactory';
    if (s >= 5.0) return 'Average';
    return 'Poor';
}

export function getScoreColorHex(score) {
    const s = Number(score) || 0;
    if (s >= 9.0) return '#22c55e';
    if (s >= 8.0) return '#6366f1';
    if (s >= 6.5) return '#f59e0b';
    if (s >= 5.0) return '#f97316';
    return '#ef4444';
}
