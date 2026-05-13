import { useMemo } from 'react';
import { useTimelogSummary } from '@shared/hooks/useTimelogs';

/**
 * Timelog Widget - Reusable component for displaying timelog summary
 * Used in: MyWorkPage, ProjectDashboard, HRDashboard, EmployeeCard
 */
export default function TimelogWidget({
    userId,
    period = 'week', // 'day' | 'week' | 'month'
    showChart = false,
    compact = false,
    className = '',
    onClick,
}) {
    const { data, isLoading } = useTimelogSummary(period);

    const summary = useMemo(() => {
        if (!data) return null;
        const hours = data.totalHoursThisWeek || data.totalHoursThisMonth || data.totalHoursThisDay || 0;
        return {
            totalHours: hours,
            byProject: data.hoursByProject || [],
            byDay: data.hoursByDay || [],
        };
    }, [data]);

    if (isLoading) return <TimelogWidgetSkeleton compact={compact} />;
    if (!summary) return null;

    if (compact) {
        return (
            <div
                className={`flex items-center gap-2 ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
                onClick={onClick}
                title={`${summary.totalHours.toFixed(1)}h logged this ${period}`}
            >
                <i className="fa-solid fa-clock text-indigo-500 text-sm" />
                <span className="text-sm font-bold text-gray-700">
                    {summary.totalHours.toFixed(1)}h
                </span>
            </div>
        );
    }

    const periodLabel = {
        day: 'Hôm nay',
        week: 'Tuần này',
        month: 'Tháng này',
    };

    return (
        <div
            className={`rounded-xl border bg-indigo-50 border-indigo-100 p-3 ${onClick ? 'cursor-pointer hover:shadow-sm' : ''} ${className}`}
            onClick={onClick}
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <i className="fa-solid fa-clock text-indigo-600 text-sm" />
                </div>
                <span className="text-sm font-semibold text-gray-800">{periodLabel[period]}</span>
            </div>

            {/* Main Value */}
            <div className="text-center mb-3">
                <div className="text-2xl font-black text-indigo-700">
                    {summary.totalHours.toFixed(1)}
                    <span className="text-sm font-normal opacity-60">h</span>
                </div>
                <span className="text-xs text-gray-500">
                    {summary.byProject?.length || 0} dự án
                </span>
            </div>

            {/* Mini chart by day */}
            {showChart && summary.byDay?.length > 0 && (
                <MiniDayChart data={summary.byDay} />
            )}

            {/* Top projects */}
            {summary.byProject?.length > 0 && (
                <div className="space-y-1 mt-2">
                    {summary.byProject.slice(0, 3).map((proj) => (
                        <div key={proj.projectId} className="flex items-center gap-2 text-xs">
                            <span className="truncate flex-1 text-gray-600">{proj.projectName}</span>
                            <span className="font-bold text-indigo-600">{proj.totalHours.toFixed(1)}h</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function MiniDayChart({ data }) {
    if (!data || data.length === 0) return null;

    const maxHours = Math.max(...data.map((d) => d.hours || 0), 1);

    return (
        <div className="flex items-end gap-0.5 h-8 mb-2">
            {data.slice(-7).map((day, i) => {
                const hours = day.hours || 0;
                const pct = (hours / maxHours) * 100;
                const isToday = i === data.length - 1;
                return (
                    <div
                        key={i}
                        className={`flex-1 rounded-sm transition-all ${isToday ? 'bg-indigo-400' : 'bg-indigo-200'}`}
                        style={{ height: `${Math.max(pct, 5)}%` }}
                        title={`${day.date}: ${hours.toFixed(1)}h`}
                    />
                );
            })}
        </div>
    );
}

function TimelogWidgetSkeleton({ compact }) {
    return (
        <div className={`rounded-xl border bg-gray-50 border-gray-100 p-3 ${compact ? 'w-20' : 'w-full'}`}>
            <div className="animate-pulse space-y-2">
                <div className="h-8 bg-gray-200 rounded w-8" />
                <div className="h-8 bg-gray-200 rounded" />
                <div className="h-2 bg-gray-200 rounded w-full" />
            </div>
        </div>
    );
}
