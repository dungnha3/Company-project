import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from '@shared/components/LazyCharts';
import { analyticsApi } from '../../shared/api/featureApi';
import { formatDate, formatNumber } from '@shared/utils/formatters';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AnalyticsPage() {
    const { projectId } = useParams();
    const [loading, setLoading] = useState(true);
    const [burndown, setBurndown] = useState(null);
    const [velocity, setVelocity] = useState(null);
    const [statusDist, setStatusDist] = useState(null);
    const [selectedSprintId, setSelectedSprintId] = useState(null);

    useEffect(() => {
        if (projectId) {
            loadAnalytics();
        }
    }, [projectId]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            const [velocityData, statusData] = await Promise.all([
                analyticsApi.getVelocity(projectId, 6),
                analyticsApi.getStatusDistribution(projectId)
            ]);

            setVelocity(velocityData);
            setStatusDist(statusData);

            if (velocityData?.sprints?.length > 0) {
                const latestSprint = velocityData.sprints[velocityData.sprints.length - 1];
                setSelectedSprintId(latestSprint.sprintId);
                const burndownData = await analyticsApi.getBurndown(projectId, latestSprint.sprintId);
                setBurndown(burndownData);
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadBurndown = async (sprintId) => {
        try {
            setSelectedSprintId(sprintId);
            const data = await analyticsApi.getBurndown(projectId, sprintId);
            setBurndown(data);
        } catch (error) {
            console.error('Failed to load burndown:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
                <div className="w-10 h-10 border-3 border-slate-600 border-t-indigo-500 rounded-full animate-spin mb-4" />
                <p>Đang tải dữ liệu phân tích...</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-6">📊 Analytics Dashboard</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Burndown Chart */}
                <div className="lg:col-span-2 bg-slate-800 rounded-2xl p-5 border border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-white">🔥 Burndown Chart</h2>
                        {velocity?.sprints?.length > 0 && (
                            <select
                                value={selectedSprintId || ''}
                                onChange={(e) => loadBurndown(Number(e.target.value))}
                                className="px-3 py-1.5 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500"
                            >
                                {velocity.sprints.map(s => (
                                    <option key={s.sprintId} value={s.sprintId}>
                                        {s.sprintName}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    {burndown?.dataPoints?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={burndown.dataPoints}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#3d3d4d" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#888"
                                    tickFormatter={(val) => formatDate(val, { day: '2-digit', month: '2-digit' })}
                                />
                                <YAxis stroke="#888" />
                                <Tooltip
                                    contentStyle={{ background: '#1e1e2e', border: '1px solid #3d3d4d', borderRadius: '8px' }}
                                    labelFormatter={(val) => formatDate(val)}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="ideal" stroke="#6366f1" strokeDasharray="5 5" name="Ideal" />
                                <Line type="monotone" dataKey="actual" stroke="#22c55e" strokeWidth={2} name="Actual" />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-slate-400 py-16">Không có dữ liệu burndown</p>
                    )}
                </div>

                {/* Velocity Chart */}
                <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-white">🚀 Velocity</h2>
                        {velocity && (
                            <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                                Avg: {formatNumber(velocity.averageVelocity, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} issues/sprint
                            </span>
                        )}
                    </div>
                    {velocity?.sprints?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={velocity.sprints}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#3d3d4d" />
                                <XAxis dataKey="sprintName" stroke="#888" />
                                <YAxis stroke="#888" />
                                <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid #3d3d4d', borderRadius: '8px' }} />
                                <Bar dataKey="completedIssues" fill="#6366f1" name="Completed Issues" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-slate-400 py-16">Không có dữ liệu velocity</p>
                    )}
                </div>

                {/* Status Distribution Pie */}
                <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-white">📋 Status Distribution</h2>
                        {statusDist && (
                            <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                                Total: {statusDist.totalIssues} issues
                            </span>
                        )}
                    </div>
                    {statusDist?.distribution?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={statusDist.distribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ status, percent }) => `${status} ${formatNumber(percent * 100, { maximumFractionDigits: 0 })}%`}
                                    outerRadius={100}
                                    dataKey="count"
                                    nameKey="status"
                                >
                                    {statusDist.distribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid #3d3d4d', borderRadius: '8px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-slate-400 py-16">Không có dữ liệu status</p>
                    )}
                </div>
            </div>
        </div>
    );
}
