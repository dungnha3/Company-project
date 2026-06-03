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

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

// ─── Project KPIs Section ──────────────────────────────────────
function ProjectKpisSection({ statusDist, velocity, workload }) {
    const totalIssues = statusDist?.totalIssues || 0;
    const doneCount = statusDist?.distribution?.find(d => d.status === 'Done')?.count || 0;
    const completionRate = totalIssues > 0 ? Math.round((doneCount / totalIssues) * 100) : 0;
    const avgVelocity = velocity?.averageVelocity ? Number(velocity.averageVelocity).toFixed(1) : '0.0';
    const totalLogged = workload?.totalLoggedHours ? Number(workload.totalLoggedHours).toFixed(1) : '0.0';

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5">
                <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-100">Tổng công việc</span>
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <i className="fa-solid fa-list-check text-sm text-indigo-100" />
                    </div>
                </div>
                <h3 className="text-3xl font-black mt-3 leading-tight">{totalIssues}</h3>
                <p className="text-[10px] text-indigo-100/80 mt-1 font-medium">Tổng số issues trong dự án</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-650 rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5">
                <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Tỷ lệ hoàn thành</span>
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <i className="fa-solid fa-circle-check text-sm text-emerald-100" />
                    </div>
                </div>
                <h3 className="text-3xl font-black mt-3 leading-tight">{completionRate}%</h3>
                <p className="text-[10px] text-emerald-100/80 mt-1 font-medium">{doneCount} trên tổng số {totalIssues} Done</p>
            </div>

            <div className="bg-gradient-to-br from-amber-550 to-amber-600 rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5">
                <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100">Tốc độ Sprint</span>
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <i className="fa-solid fa-bolt text-sm text-amber-100" />
                    </div>
                </div>
                <h3 className="text-3xl font-black mt-3 leading-tight">{avgVelocity}</h3>
                <p className="text-[10px] text-amber-100/80 mt-1 font-medium">Issues hoàn thành trung bình mỗi Sprint</p>
            </div>

            <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5">
                <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-100">Tổng giờ làm thực</span>
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <i className="fa-solid fa-clock text-sm text-violet-100" />
                    </div>
                </div>
                <h3 className="text-3xl font-black mt-3 leading-tight">{totalLogged}h</h3>
                <p className="text-[10px] text-violet-100/80 mt-1 font-medium">Tổng số giờ làm việc thực tế đã ghi nhận</p>
            </div>
        </div>
    );
}

// ─── Team Workload Section ──────────────────────────────────────
function TeamWorkloadSection({ workload }) {
    const chartData = useMemo(() => {
        if (!workload?.members) return [];
        return workload.members.map(m => ({
            name: m.userName,
            'Đã xong': m.completedIssues,
            'Đang thực hiện': m.inProgressIssues,
            'Giờ làm': m.loggedHours
        }));
    }, [workload]);

    if (!workload?.members || workload.members.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-users-gear text-indigo-500 text-sm" /> Phân bổ khối lượng công việc thành viên
                </h2>
                <div className="flex flex-col items-center justify-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    <i className="fa-solid fa-users text-gray-300 text-3xl mb-2" />
                    <p className="text-sm text-gray-500 font-medium">Không có dữ liệu thành viên dự án</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-50">
                <div>
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <i className="fa-solid fa-users-gear text-indigo-500 text-sm" /> Phân bổ khối lượng công việc thành viên
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium">Theo dõi số lượng task của từng thành viên và tổng giờ làm thực tế</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                {/* Chart (2/3 width) */}
                <div className="lg:col-span-2 h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 10, fontWeight: 550 }} />
                            <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                            <Bar dataKey="Đã xong" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="Đang thực hiện" stackId="a" fill="#6366F1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Overload Alert / Stats (1/3 width) */}
                <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 space-y-4 max-h-[280px] overflow-y-auto custom-scrollbar">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Tình trạng quá tải</h4>
                    <div className="divide-y divide-gray-100">
                        {workload.members.map(m => {
                            const isOverloaded = m.inProgressIssues >= 5;
                            const isCritical = m.inProgressIssues >= 8;
                            return (
                                <div key={m.userId} className="flex justify-between items-center py-2.5 text-xs">
                                    <div className="flex items-center gap-2 font-semibold text-gray-700 min-w-0">
                                        <img
                                            src={m.avatarUrl || `https://ui-avatars.com/api/?name=${m.userName}&background=6366f1&color=fff`}
                                            alt={m.userName}
                                            className="w-6 h-6 rounded-full object-cover shrink-0 border border-white shadow-sm"
                                        />
                                        <span className="truncate">{m.userName}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-bold text-gray-800">{m.inProgressIssues} đang làm</span>
                                        {isCritical ? (
                                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-black rounded-md animate-pulse">🔥 Nguy kịch</span>
                                        ) : isOverloaded ? (
                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-md">⚠️ Quá tải</span>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-green-150 text-green-700 text-[9px] font-semibold rounded-md">Ổn định</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Detailed Workload Table */}
            <div className="overflow-x-auto border border-gray-50 rounded-xl">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50/50 text-gray-550 uppercase text-[9px] font-bold tracking-wider border-b border-gray-100">
                        <tr>
                            <th className="px-4 py-3">Thành viên</th>
                            <th className="px-4 py-3 text-center">Đang thực hiện</th>
                            <th className="px-4 py-3 text-center">Đã hoàn thành</th>
                            <th className="px-4 py-3 text-center">Tổng số việc</th>
                            <th className="px-4 py-3 text-center">Giờ làm thực tế</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {workload.members.map(m => (
                            <tr key={m.userId} className="hover:bg-gray-50/30 transition-colors">
                                <td className="px-4 py-3 font-semibold text-gray-700 flex items-center gap-2.5">
                                    <img
                                        src={m.avatarUrl || `https://ui-avatars.com/api/?name=${m.userName}&background=6366f1&color=fff`}
                                        alt={m.userName}
                                        className="w-6.5 h-6.5 rounded-full object-cover shadow-sm border border-gray-100"
                                    />
                                    <span>{m.userName}</span>
                                </td>
                                <td className="px-4 py-3 text-center font-bold text-indigo-650">{m.inProgressIssues}</td>
                                <td className="px-4 py-3 text-center font-bold text-emerald-650">{m.completedIssues}</td>
                                <td className="px-4 py-3 text-center font-semibold text-gray-600">{m.totalIssues}</td>
                                <td className="px-4 py-3 text-center font-bold text-violet-650">{m.loggedHours.toFixed(1)}h</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Main Analytics Page ──────────────────────────────────────
export default function AnalyticsPage() {
    const toast = useToast();
    const { id, projectId: routeProjectId } = useParams();
    const paramProjectId = routeProjectId || id;
    const [selectedProjectId, setSelectedProjectId] = useState(null);

    const [loading, setLoading] = useState(false);
    const [burndown, setBurndown] = useState(null);
    const [velocity, setVelocity] = useState(null);
    const [statusDist, setStatusDist] = useState(null);
    const [workload, setWorkload] = useState(null);
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
            const [velocityData, statusData, workloadData] = await Promise.all([
                analyticsApi.getVelocity(projId, 6),
                analyticsApi.getStatusDistribution(projId),
                analyticsApi.getTeamWorkload(projId)
            ]);
            if (!isMounted.current) return;
            setVelocity(velocityData);
            setStatusDist(statusData);
            setWorkload(workloadData);
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
        <div className="space-y-6 max-w-full mx-auto p-6 bg-gray-50/20 rounded-2xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-650 shadow-sm shrink-0">
                        <i className="fa-solid fa-chart-pie text-xl" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Thống kê & Phân tích</h1>
                        <p className="text-sm text-gray-450 mt-0.5 font-medium">Biểu đồ tiến độ, trạng thái công việc và phân bổ khối lượng dự án</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
                    {isStandalone && (
                        <select
                            value={selectedProjectId || ''}
                            onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full sm:w-64 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-755 bg-white shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                        >
                            <option value="">— Chọn dự án để phân tích —</option>
                            {myProjects.map(p => (
                                <option key={p.projectId || p.id} value={p.projectId || p.id}>{p.name}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Loading / Empty states */}
            {!paramProjectId && projectsLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-450 bg-white rounded-2xl border border-gray-100 shadow-sm py-20">
                    <div className="loading-spinner mb-4 animate-spin" />
                    <p className="text-sm font-bold text-gray-500">Đang tải danh sách dự án...</p>
                </div>
            ) : !selectedProjectId ? (
                <div className="p-12 text-center bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner border border-gray-100">
                        <i className="fa-solid fa-chart-line" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Chưa có dự án</h3>
                    <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed font-medium">
                        {myProjects.length === 0 ? 'Bạn chưa tham gia dự án nào. Hãy tạo hoặc tham gia một dự án để xem thống kê.' : 'Vui lòng chọn một dự án từ danh sách thả xuống ở góc phải để xem báo cáo thống kê chi tiết.'}
                    </p>
                </div>
            ) : loading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-455 bg-white rounded-2xl border border-gray-100 shadow-sm py-20">
                    <div className="loading-spinner mb-4 animate-spin" />
                    <p className="text-sm font-bold text-gray-550">Đang phân tích dữ liệu dự án...</p>
                </div>
            ) : (
                /* ─── CHARTS TAB ─── */
                <div className="space-y-6 animate-fade-in">
                    {/* Project KPI Cards */}
                    <ProjectKpisSection statusDist={statusDist} velocity={velocity} workload={workload} />

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
                                                <span className="text-gray-650 text-xs font-medium">{value}</span>
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
                                    <i className="fa-solid fa-folder-open text-gray-350 text-3xl mb-2" />
                                    <p className="text-sm text-gray-500 font-bold">Không có dữ liệu burndown cho Sprint này</p>
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
                                    <p className="text-xs text-gray-400 mt-0.5 font-medium">Số lượng issues hoàn thành trung bình qua các Sprint</p>
                                </div>
                                {velocity && (
                                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100">
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
                                        <Bar dataKey="completedIssues" fill="#6366F1" name="Issues hoàn thành" radius={[6, 6, 0, 0]} cursor="pointer" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 flex-1 min-h-[280px]">
                                    <i className="fa-solid fa-folder-open text-gray-300 text-3xl mb-2" />
                                    <p className="text-sm text-gray-500 font-bold">Không có dữ liệu tốc độ Sprint</p>
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
                                    <p className="text-xs text-gray-400 mt-0.5 font-medium">Phần trăm phân chia trạng thái các issues trong dự án</p>
                                </div>
                                {statusDist && (
                                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">
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
                                                    activeShape={{ outerRadius: 108, strokeWidth: 2, stroke: '#6366F1' }}
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
                                    <div className="w-full sm:w-1/2 flex flex-col gap-2 bg-gray-50/50 p-4 rounded-xl border border-gray-100/55">
                                        {statusDist.distribution.map((d, index) => (
                                            <div key={d.status} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2 font-bold text-gray-700">
                                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                    <span>{d.status}</span>
                                                </div>
                                                <span className="font-extrabold text-gray-900">{d.count} tasks ({formatNumber(d.percent * 100, { maximumFractionDigits: 0 })}%)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 flex-1 min-h-[280px]">
                                    <i className="fa-solid fa-folder-open text-gray-300 text-3xl mb-2" />
                                    <p className="text-sm text-gray-500 font-bold">Không có dữ liệu phân bổ trạng thái</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Team Workload Section */}
                    <TeamWorkloadSection workload={workload} />
                </div>
            )}
        </div>
    );
}
