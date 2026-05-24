import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * PerformanceTrend - Reusable component for displaying performance trend chart
 * Used in: MyPerformancePage, ProjectPerformanceTab, EmployeeCard
 */
export default function PerformanceTrend({
    data = [], // Array of { week: string, performance: number, speed?: number, quality?: number }
    height = 160,
    showSpeed = false,
    showQuality = false,
    className = '',
}) {
    if (!data || data.length === 0) {
        return (
            <div className={`flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100 ${className}`} style={{ height }}>
                <div className="text-center text-gray-400">
                    <i className="fa-solid fa-chart-line text-3xl mb-2" />
                    <p className="text-sm">Chưa có dữ liệu xu hướng</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-xl border border-gray-100 p-4 ${className}`}>
            <h3 className="font-bold text-gray-800 mb-1">Xu hướng hiệu suất</h3>
            <p className="text-xs text-gray-400 mb-3">Theo tuần</p>
            <ResponsiveContainer width="100%" height={height}>
                <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis
                        dataKey="week"
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        domain={[0, 10]}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            background: '#1e293b',
                            border: 'none',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: 12,
                        }}
                        formatter={(value) => [value.toFixed(1)]}
                    />
                    <Line
                        type="monotone"
                        dataKey="performance"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#6366f1' }}
                        name="Hiệu suất"
                    />
                    {showSpeed && (
                        <Line
                            type="monotone"
                            dataKey="speed"
                            stroke="#14b8a6"
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#14b8a6' }}
                            name="Tốc độ"
                        />
                    )}
                    {showQuality && (
                        <Line
                            type="monotone"
                            dataKey="quality"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#f59e0b' }}
                            name="Chất lượng"
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
