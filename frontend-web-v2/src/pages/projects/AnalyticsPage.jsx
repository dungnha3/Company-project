import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from '@shared/components/LazyCharts';
import { analyticsApi } from '../../shared/api/featureApi';
import { formatDate, formatNumber } from '@shared/utils/formatters';
import { useToast } from '@app/providers/ToastProvider';
import { CHART_TOOLTIP_STYLE } from '@shared/components/chart/ChartUtils';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#06B6D4'];

// ─── Performance tab (merged from PerformanceOverviewPage) ─────
function PerformanceTab({ projects }) {
    const [period, setPeriod] = useState('all');

    const filteredProjects = useMemo(() => {
        if (period === 'all') return projects;
        const monthsBack = Number(period);
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - monthsBack);
        return projects.filter((p) => {
            const dateRaw = p.updatedAt || p.createdAt || p.startDate || p.endDate;
            if (!dateRaw) return true;
            const d = new Date(dateRaw);
            return !Number.isNaN(d.getTime()) && d >= cutoff;
        });
    }, [projects, period]);

    const { data: rankingsByProject = [], isLoading: loadingRankings } = useQuery({
        queryKey: ['analytics-performance-rankings', filteredProjects.map(p => p.projectId || p.id).join(','), period],
        enabled: filteredProjects.length > 0,
        queryFn: async () => {
            const calls = filteredProjects.map(async (p) => {
                const projectId = p.projectId || p.id;
                try {
                    const res = await apiClient.get(ENDPOINTS.PERFORMANCE.COMPARISON_BY_PROJECT(projectId));
                    return { projectId, projectName: p.name || `Project ${projectId}`, rankings: res.data || [] };
                } catch {
                    return { projectId, projectName: p.name || `Project ${projectId}`, rankings: [] };
                }
            });
            return Promise.all(calls);
        }
    });

    const { leaderboard, chartData, summary } = useMemo(() => {
        const map = new Map();
        let projectCount = 0;
        for (const project of rankingsByProject) {
            if ((project.rankings || []).length > 0) projectCount += 1;
            for (const r of (project.rankings || [])) {
                const key = r.userId || r.employeeId;
                if (!key) continue;
                if (!map.has(key)) {
                    map.set(key, { userId: r.userId, employeeId: r.employeeId, employeeName: r.employeeName, employeeAvatar: r.employeeAvatar,
                        projects: 0, totalPerformanceScore: 0, speedScore: 0, volumeScore: 0, qualityScore: 0,
                        completedTasks: 0, overdueTasks: 0, lateTasks: 0, reworks: 0, points: 0 });
                }
                const current = map.get(key);
                current.projects += 1;
                current.totalPerformanceScore += Number(r.totalPerformanceScore || 0);
                current.speedScore += Number(r.speedScore || 0);
                current.volumeScore += Number(r.volumeScore || 0);
                current.qualityScore += Number(r.qualityScore || 0);
                current.completedTasks += Number(r.completedTasks || 0);
                current.overdueTasks += Number(r.overdueTasks || 0);
                current.lateTasks += Number(r.lateTasks || 0);
                current.reworks += Number(r.reworks || 0);
                current.points += Number(r.totalStoryPoints || 0);
            }
        }
        const leaderboard = Array.from(map.values()).map((item) => {
            const divider = Math.max(item.projects, 1);
            return {
                ...item,
                avgPerformance: Number((item.totalPerformanceScore / divider).toFixed(1)),
                avgSpeed: Number((item.speedScore / divider).toFixed(1)),
                avgVolume: Number((item.volumeScore / divider).toFixed(1)),
                avgQuality: Number((item.qualityScore / divider).toFixed(1)),
            };
        }).sort((a, b) => b.avgPerformance - a.avgPerformance);

        const chartData = leaderboard.slice(0, 8).map(u => ({
            name: u.employeeName, 'Hiệu suất TB': u.avgPerformance, 'Tốc độ TB': u.avgSpeed, 'Chất lượng TB': u.avgQuality,
        }));

        const summary = {
            employees: leaderboard.length, projects: projectCount,
            completedTasks: leaderboard.reduce((s, i) => s + i.completedTasks, 0),
            overdueTasks: leaderboard.reduce((s, i) => s + i.overdueTasks, 0),
            reworks: leaderboard.reduce((s, i) => s + i.reworks, 0),
            avgPerformance: leaderboard.length > 0 ? (leaderboard.reduce((s, i) => s + i.avgPerformance, 0) / leaderboard.length).toFixed(1) : '0.0',
        };
        return { leaderboard, chartData, summary };
    }, [rankingsByProject]);

    if (loadingRankings) {
        return <div className="flex items-center justify-center min-h-[400px]"><i className="fa-solid fa-spinner fa-spin text-3xl text-gray-400" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                <MiniStat title="Nhân sự" value={summary.employees} />
                <MiniStat title="Dự án" value={summary.projects} />
                <MiniStat title="Hoàn thành" value={summary.completedTasks} success />
                <MiniStat title="Quá hạn" value={summary.overdueTasks} danger />
                <MiniStat title="Rework" value={summary.reworks} warning />
                <MiniStat title="Điểm TB" value={summary.avgPerformance} />
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900 mb-1">So sánh hiệu suất nhân sự</h3>
                <p className="text-xs text-gray-500 mb-4">Hiệu suất, tốc độ và chất lượng trung bình</p>
                <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="name" fontSize={11} tick={{ fill: '#6b7280', fontWeight: 500 }} />
                            <YAxis domain={[0, 10]} fontSize={11} tick={{ fill: '#6b7280', fontWeight: 500 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Hiệu suất TB" fill="#2563EB" radius={0} />
                            <Bar dataKey="Tốc độ TB" fill="#059669" radius={0} />
                            <Bar dataKey="Chất lượng TB" fill="#D97706" radius={0} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-base font-semibold text-gray-900">Bảng so sánh nhân sự</h3>
                    <p className="text-xs text-gray-500">Thống kê toàn thời gian theo dữ liệu hiệu suất dự án</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 text-left">Nhân sự</th>
                                <th className="px-4 py-3 text-center">Dự án</th>
                                <th className="px-4 py-3 text-center">Hiệu suất TB</th>
                                <th className="px-4 py-3 text-center">Tốc độ TB</th>
                                <th className="px-4 py-3 text-center">Chất lượng TB</th>
                                <th className="px-4 py-3 text-center">Hoàn thành</th>
                                <th className="px-4 py-3 text-center">Quá hạn</th>
                                <th className="px-4 py-3 text-center">Rework</th>
                                <th className="px-4 py-3 text-center">SLA</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {leaderboard.map(u => (
                                <tr key={u.userId || u.employeeId} className="hover:bg-gray-50/70">
                                    <td className="px-4 py-3 font-medium text-gray-900">{u.employeeName}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">{u.projects}</td>
                                    <td className="px-4 py-3 text-center font-semibold text-gray-900">{u.avgPerformance}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">{u.avgSpeed}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">{u.avgQuality}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">{u.completedTasks}</td>
                                    <td className="px-4 py-3 text-center text-red-600">{u.overdueTasks}</td>
                                    <td className="px-4 py-3 text-center text-amber-600">{u.reworks}</td>
                                    <td className="px-4 py-3 text-center">
                                        <SlaBadge overdue={u.overdueTasks} late={u.lateTasks} reworks={u.reworks} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function SlaBadge({ overdue = 0, late = 0, reworks = 0 }) {
    if (overdue >= 3 || late >= 3 || reworks >= 5) return <span className="px-2 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700">Cao</span>;
    if (overdue > 0 || late > 0 || reworks >= 2) return <span className="px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700">Trung bình</span>;
    return <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700">Ổn định</span>;
}

function MiniStat({ title, value, danger, success, warning }) {
    return (
        <div className={`rounded-xl border border-gray-100 px-4 py-3 shadow-sm hover:shadow-md transition-shadow ${danger ? 'bg-red-50' : success ? 'bg-green-50' : warning ? 'bg-amber-50' : 'bg-white'}`}>
            <p className="text-[10px] uppercase tracking-wider font-medium text-gray-500">{title}</p>
            <p className={`text-xl font-semibold leading-tight mt-1 ${danger ? 'text-red-600' : success ? 'text-green-600' : warning ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
        </div>
    );
}

// ─── Main Analytics Page ──────────────────────────────────────
export default function AnalyticsPage() {
    const toast = useToast();
    const { id, projectId: routeProjectId } = useParams();
    const paramProjectId = routeProjectId || id;
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [activeTab, setActiveTab] = useState('charts'); // 'charts' | 'performance'

    const [loading, setLoading] = useState(false);
    const [burndown, setBurndown] = useState(null);
    const [velocity, setVelocity] = useState(null);
    const [statusDist, setStatusDist] = useState(null);
    const [selectedSprintId, setSelectedSprintId] = useState(null);
    const [statusActiveIndex, setStatusActiveIndex] = useState(null);

    const { data: myProjects = [], isLoading: projectsLoading } = useQuery({
        queryKey: ['my-projects-for-analytics'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.MY_PROJECTS);
            return Array.isArray(res.data) ? res.data : (res.data?.content || []);
        },
        enabled: !paramProjectId,
    });

    const isMounted = useRef(true);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        if (paramProjectId) setSelectedProjectId(Number(paramProjectId));
    }, [paramProjectId]);

    useEffect(() => {
        if (!paramProjectId && myProjects.length > 0 && !selectedProjectId) {
            const firstId = myProjects[0].projectId || myProjects[0].id;
            setSelectedProjectId(firstId);
        }
    }, [myProjects, paramProjectId]);

    const loadAnalytics = useCallback(async (projId) => {
        try {
            setLoading(true);
            setBurndown(null);
            setSelectedSprintId(null);
            const [velocityData, statusData] = await Promise.all([
                analyticsApi.getVelocity(projId, 6),
                analyticsApi.getStatusDistribution(projId)
            ]);
            if (!isMounted.current) return;
            setVelocity(velocityData);
            setStatusDist(statusData);
            if (velocityData?.sprints?.length > 0) {
                const latestSprint = velocityData.sprints[velocityData.sprints.length - 1];
                const burndownData = await analyticsApi.getBurndown(projId, latestSprint.sprintId);
                if (!isMounted.current) return;
                setSelectedSprintId(latestSprint.sprintId);
                setBurndown(burndownData);
            }
        } catch (error) {
            if (!isMounted.current) return;
            console.error('Failed to load analytics:', error);
            toast.error('Không thể tải dữ liệu phân tích dự án');
        } finally {
            if (isMounted.current) setLoading(false);
        }
    }, [toast]);

    const loadBurndown = useCallback(async (projectId, sprintId) => {
        try {
            if (!projectId) return;
            setSelectedSprintId(sprintId);
            const data = await analyticsApi.getBurndown(projectId, sprintId);
            if (isMounted.current) setBurndown(data);
        } catch (error) {
            if (!isMounted.current) return;
            console.error('Failed to load burndown:', error);
            toast.error('Không thể tải dữ liệu biểu đồ Burndown');
        }
    }, [toast]);

    useEffect(() => {
        if (selectedProjectId) {
            loadAnalytics(selectedProjectId);
        }
    }, [selectedProjectId, loadAnalytics]);

    const isStandalone = !paramProjectId;

    return (
        <div className="space-y-6 max-w-full mx-auto p-6 bg-gray-50/30 rounded-2xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-5 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shadow-indigo-100 shrink-0">
                        <i className="fa-solid fa-chart-pie text-xl" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Thống kê & Phân tích</h1>
                        <p className="text-sm text-gray-500 mt-0.5 font-medium">Biểu đồ Burndown, Velocity, Hiệu suất nhân sự</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
                    {isStandalone && (
                        <select
                            value={selectedProjectId || ''}
                            onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full sm:w-64 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-750 bg-white shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                        >
                            <option value="">— Chọn dự án để phân tích —</option>
                            {myProjects.map(p => (
                                <option key={p.projectId || p.id} value={p.projectId || p.id}>{p.name}</option>
                            ))}
                        </select>
                    )}
                    <div className="inline-flex rounded-xl bg-gray-100 p-1 shrink-0">
                        <button onClick={() => setActiveTab('charts')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'charts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            <i className="fa-solid fa-chart-line text-xs" />Biểu đồ
                        </button>
                        <button onClick={() => setActiveTab('performance')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'performance' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            <i className="fa-solid fa-chart-simple text-xs" />Hiệu suất
                        </button>
                    </div>
                </div>
            </div>

            {/* Loading / Empty states */}
            {!paramProjectId && projectsLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm py-20">
                    <div className="loading-spinner mb-4" />
                    <p className="text-sm font-semibold text-gray-600">Đang tải danh sách dự án...</p>
                </div>
            ) : !selectedProjectId ? (
                <div className="card p-12 text-center bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner border border-gray-100">
                        <i className="fa-solid fa-chart-line" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Chưa có dự án</h3>
                    <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
                        {myProjects.length === 0 ? 'Bạn chưa tham gia dự án nào. Hãy tạo hoặc tham gia một dự án để xem thống kê.' : 'Vui lòng chọn một dự án từ danh sách thả xuống ở góc phải để xem báo cáo thống kê chi tiết.'}
                    </p>
                </div>
            ) : loading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm py-20">
                    <div className="loading-spinner mb-4" />
                    <p className="text-sm font-semibold text-gray-600">Đang phân tích dữ liệu dự án...</p>
                </div>
            ) : activeTab === 'performance' ? (
                <PerformanceTab projects={myProjects} />
            ) : (
                /* ─── CHARTS TAB ─── */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Burndown */}
                    <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <i className="fa-solid fa-fire text-amber-500 text-sm" />Biểu đồ Burndown
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">Tiến độ hoàn thành thực tế vs. đường lý tưởng của Sprint</p>
                            </div>
                            {velocity?.sprints?.length > 0 && (
                                <select value={selectedSprintId || ''} onChange={(e) => loadBurndown(selectedProjectId, Number(e.target.value))}
                                    className="px-3.5 py-2 border border-gray-200 bg-white text-gray-700 rounded-xl text-xs font-semibold hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer shadow-sm">
                                    {velocity.sprints.map(s => (
                                        <option key={s.sprintId} value={s.sprintId}>{s.sprintName}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        {burndown?.dataPoints?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={320}>
                                <LineChart data={burndown.dataPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 10 }} tickFormatter={(val) => formatDate(val, { day: '2-digit', month: '2-digit' })} />
                                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelFormatter={(val) => formatDate(val)}
                                        formatter={(value, name) => {
                                            if (name === 'Lý tưởng') return [`${value} tasks`, 'Đường lý tưởng'];
                                            if (name === 'Thực tế') return [`${value} tasks`, 'Thực tế'];
                                            return [value, name];
                                        }} />
                                    <Legend
                                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                                        formatter={(value) => (
                                            <span className="text-gray-600 text-xs">{value}</span>
                                        )}
                                    />
                                    <Line type="monotone" dataKey="ideal" stroke="#9CA3AF" strokeDasharray="5 5" name="Lý tưởng" strokeWidth={2} />
                                    <Line type="monotone" dataKey="actual" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4, fill: '#4F46E5' }} name="Thực tế" activeDot={{ r: 6 }} />
                                    {(() => {
                                        const today = new Date().toISOString().split('T')[0];
                                        return burndown?.dataPoints?.some(p => p.date === today)
                                            ? <ReferenceLine x={today} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Hôm nay', position: 'top', fill: '#EF4444', fontSize: 10 }} />
                                            : null;
                                    })()}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                <i className="fa-solid fa-folder-open text-gray-300 text-3xl mb-2" />
                                <p className="text-sm text-gray-500 font-medium">Không có dữ liệu burndown cho Sprint này</p>
                            </div>
                        )}
                    </div>

                    {/* Velocity */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <i className="fa-solid fa-bolt text-indigo-500 text-sm" />Tốc độ hoàn thành Sprint
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">Số lượng issues hoàn thành trung bình qua các Sprint</p>
                            </div>
                            {velocity && (
                                <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-100">
                                    Avg: {formatNumber(velocity.averageVelocity, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} tasks
                                </span>
                            )}
                        </div>
                        {velocity?.sprints?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={velocity.sprints} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="sprintName" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={CHART_TOOLTIP_STYLE}
                                        formatter={(value) => [`${value} issues`, 'Hoàn thành']}
                                        labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
                                        cursor={{ fill: '#f1f5f9' }}
                                    />
                                    <Bar dataKey="completedIssues" fill="#4F46E5" name="Issues hoàn thành" radius={[6, 6, 0, 0]} cursor="pointer" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 flex-1 min-h-[280px]">
                                <i className="fa-solid fa-folder-open text-gray-300 text-3xl mb-2" />
                                <p className="text-sm text-gray-500 font-medium">Không có dữ liệu tốc độ Sprint</p>
                            </div>
                        )}
                    </div>

                    {/* Status Distribution */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <i className="fa-solid fa-chart-pie text-emerald-500 text-sm" />Phân bổ trạng thái công việc
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">Phần trăm phân chia trạng thái các issues trong dự án</p>
                            </div>
                            {statusDist && (
                                <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-100">
                                    Tổng: {statusDist.totalIssues} tasks
                                </span>
                            )}
                        </div>
                        {statusDist?.distribution?.length > 0 ? (
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-1">
                                <div className="w-full sm:w-1/2">
                                    <ResponsiveContainer width="100%" height={260}>
                                        <PieChart>
                                            <Pie
                                                data={statusDist.distribution}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                outerRadius={95}
                                                dataKey="count"
                                                nameKey="status"
                                                activeIndex={statusActiveIndex}
                                                activeShape={{ outerRadius: 108, strokeWidth: 2, stroke: '#4F46E5' }}
                                                onMouseEnter={(_, index) => setStatusActiveIndex(index)}
                                                onMouseLeave={() => setStatusActiveIndex(null)}
                                            >
                                                {statusDist.distribution.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={COLORS[index % COLORS.length]}
                                                        opacity={statusActiveIndex !== null && statusActiveIndex !== index ? 0.5 : 1}
                                                        style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={CHART_TOOLTIP_STYLE}
                                                formatter={(value, name) => [`${value} issues (${formatNumber(statusDist.totalIssues > 0 ? (value / statusDist.totalIssues * 100) : 0, { maximumFractionDigits: 0 })}%)`, name]}
                                                labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-full sm:w-1/2 flex flex-col gap-2 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                    {statusDist.distribution.map((d, index) => (
                                        <div key={d.status} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2 font-semibold text-gray-700">
                                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                <span>{d.status}</span>
                                            </div>
                                            <span className="font-bold text-gray-900">{d.count} tasks ({formatNumber(d.percent * 100, { maximumFractionDigits: 0 })}%)</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 flex-1 min-h-[280px]">
                                <i className="fa-solid fa-folder-open text-gray-300 text-3xl mb-2" />
                                <p className="text-sm text-gray-500 font-medium">Không có dữ liệu phân bổ trạng thái</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
