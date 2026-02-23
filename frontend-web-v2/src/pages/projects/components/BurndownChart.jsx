import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatDate } from '@shared/utils/formatters';

/**
 * Sprint Burndown Chart Component
 * Shows ideal vs actual progress over sprint duration
 */
export default function BurndownChart({ sprintId, sprintName }) {
    const { data: burndown, isLoading, error } = useQuery({
        queryKey: ['burndown', sprintId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PROJECT_DASHBOARD.BURNDOWN(sprintId))).data,
        enabled: !!sprintId,
    });

    // Calculate chart dimensions and scales
    const chartData = useMemo(() => {
        if (!burndown?.burndownData?.length) return null;

        const data = burndown.burndownData;
        const maxIssues = burndown.totalIssues || Math.max(...data.map(d => d.remainingIssues));
        const width = 100; // percentage-based
        const height = 200;
        const padding = { top: 20, right: 20, bottom: 40, left: 40 };
        const chartWidth = width;
        const chartHeight = height - padding.top - padding.bottom;

        // Generate path for ideal line
        const idealPath = data.map((point, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = ((maxIssues - point.idealRemaining) / maxIssues) * chartHeight;
            return `${i === 0 ? 'M' : 'L'} ${x}% ${y + padding.top}`;
        }).join(' ');

        // Generate path for actual line
        const actualPath = data.map((point, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = ((maxIssues - point.remainingIssues) / maxIssues) * chartHeight;
            return `${i === 0 ? 'M' : 'L'} ${x}% ${y + padding.top}`;
        }).join(' ');

        return {
            data,
            maxIssues,
            idealPath,
            actualPath,
            chartHeight,
            padding,
        };
    }, [burndown]);

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-center h-48">
                    <i className="fa-solid fa-spinner fa-spin text-2xl text-indigo-500" />
                </div>
            </div>
        );
    }

    if (error || !chartData) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 p-6">
                <div className="text-center py-8 text-gray-400">
                    <i className="fa-solid fa-chart-line text-3xl mb-2" />
                    <p>Chưa có dữ liệu burndown</p>
                </div>
            </div>
        );
    }

    const { data, maxIssues, idealPath, actualPath, chartHeight, padding } = chartData;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-bold text-gray-900">Burndown Chart</h3>
                    <p className="text-sm text-gray-500">{sprintName || 'Sprint'}</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-gray-400" />
                        <span className="text-gray-500">Ideal</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-indigo-500" />
                        <span className="text-gray-500">Actual</span>
                    </div>
                </div>
            </div>

            {/* SVG Chart */}
            <div className="relative" style={{ height: '220px' }}>
                <svg width="100%" height="100%" viewBox="0 0 100 220" preserveAspectRatio="none" className="overflow-visible">
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map((percent) => (
                        <line
                            key={percent}
                            x1="0%"
                            y1={padding.top + (percent / 100) * chartHeight}
                            x2="100%"
                            y2={padding.top + (percent / 100) * chartHeight}
                            stroke="var(--color-border)"
                            strokeWidth="0.5"
                        />
                    ))}

                    {/* Ideal line (dashed) */}
                    <path
                        d={idealPath}
                        fill="none"
                        stroke="var(--color-text-muted)"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        vectorEffect="non-scaling-stroke"
                    />

                    {/* Actual line */}
                    <path
                        d={actualPath}
                        fill="none"
                        stroke="var(--color-accent)"
                        strokeWidth="2.5"
                        vectorEffect="non-scaling-stroke"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Data points */}
                    {data.map((point, i) => {
                        const x = (i / (data.length - 1)) * 100;
                        const y = ((maxIssues - point.remainingIssues) / maxIssues) * chartHeight + padding.top;
                        return (
                            <circle
                                key={i}
                                cx={`${x}%`}
                                cy={y}
                                r="4"
                                fill="var(--color-accent)"
                                stroke="white"
                                strokeWidth="2"
                            />
                        );
                    })}
                </svg>

                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-gray-400 py-5">
                    <span>{maxIssues}</span>
                    <span>{Math.round(maxIssues / 2)}</span>
                    <span>0</span>
                </div>

                {/* X-axis labels */}
                <div className="absolute bottom-0 left-8 right-0 flex justify-between text-xs text-gray-400">
                    {data.filter((_, i) => i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)).map((point, i) => (
                        <span key={i}>
                            {formatDate(point.date, { day: 'numeric', month: 'short' })}
                        </span>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{burndown.totalIssues}</div>
                    <div className="text-xs text-gray-500">Tổng issues</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                        {data.length > 0 ? data[data.length - 1].completedIssues : 0}
                    </div>
                    <div className="text-xs text-gray-500">Đã hoàn thành</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-orange-500">
                        {data.length > 0 ? data[data.length - 1].remainingIssues : 0}
                    </div>
                    <div className="text-xs text-gray-500">Còn lại</div>
                </div>
            </div>
        </div>
    );
}
