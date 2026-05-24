import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from '@shared/components/LazyCharts';
import { analyticsApi } from '../../shared/api/featureApi';
import { formatDate, formatNumber } from '@shared/utils/formatters';
import { useToast } from '@app/providers/ToastProvider';

// Clean harmonized light theme colors
const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#06B6D4'];

export default function AnalyticsPage() {
    const toast = useToast();
    const { id, projectId: routeProjectId } = useParams();
    
    // Resolve project ID from URL parameters if available
    const paramProjectId = routeProjectId || id;
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    
    const [loading, setLoading] = useState(false);
    const [burndown, setBurndown] = useState(null);
    const [velocity, setVelocity] = useState(null);
    const [statusDist, setStatusDist] = useState(null);
    const [selectedSprintId, setSelectedSprintId] = useState(null);

    // Fetch projects only if there is no projectId in URL (accessed via general sidebar)
    const { data: myProjects = [] } = useQuery({
        queryKey: ['my-projects-for-analytics'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.MY_PROJECTS);
            return Array.isArray(res.data) ? res.data : (res.data?.content || []);
        },
        enabled: !paramProjectId,
    });

    // Update selected project when route param changes
    useEffect(() => {
        if (paramProjectId) {
            setSelectedProjectId(Number(paramProjectId));
        }
    }, [paramProjectId]);

    // Default to first project in lists if in general view and no project is selected yet
    useEffect(() => {
        if (!paramProjectId && myProjects.length > 0 && !selectedProjectId) {
            const firstId = myProjects[0].projectId || myProjects[0].id;
            setSelectedProjectId(firstId);
        }
    }, [myProjects, paramProjectId, selectedProjectId]);

    // Load analytics whenever the selected project changes
    useEffect(() => {
        if (selectedProjectId) {
            loadAnalytics(selectedProjectId);
        }
    }, [selectedProjectId]);

    const loadAnalytics = async (projId) => {
        try {
            setLoading(true);
            setBurndown(null);
            const [velocityData, statusData] = await Promise.all([
                analyticsApi.getVelocity(projId, 6),
                analyticsApi.getStatusDistribution(projId)
            ]);

            setVelocity(velocityData);
            setStatusDist(statusData);

            if (velocityData?.sprints?.length > 0) {
                const latestSprint = velocityData.sprints[velocityData.sprints.length - 1];
                setSelectedSprintId(latestSprint.sprintId);
                const burndownData = await analyticsApi.getBurndown(projId, latestSprint.sprintId);
                setBurndown(burndownData);
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
            toast.error('Không thể tải dữ liệu phân tích dự án');
        } finally {
            setLoading(false);
        }
    };

    const loadBurndown = async (sprintId) => {
        try {
            if (!selectedProjectId) return;
            setSelectedSprintId(sprintId);
            const data = await analyticsApi.getBurndown(selectedProjectId, sprintId);
            setBurndown(data);
        } catch (error) {
            console.error('Failed to load burndown:', error);
            toast.error('Không thể tải dữ liệu biểu đồ Burndown');
        }
    };

    return (
        <div className="space-y-6 max-w-full mx-auto p-6 bg-gray-50/30 rounded-2xl">
            {/* Header / Dropdown Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-5 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shadow-indigo-100 shrink-0">
                        <i className="fa-solid fa-chart-pie text-xl" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Thống kê & Phân tích dự án</h1>
                        <p className="text-sm text-gray-500 mt-0.5 font-medium">Theo dõi biểu đồ Burndown, tốc độ hoàn thành Sprint và phân bổ trạng thái công việc</p>
                    </div>
                </div>
                
                {/* Select dropdown shown only if viewed generally from sidebar */}
                {!paramProjectId && (
                    <div className="shrink-0 w-full sm:w-auto">
                        <select
                            value={selectedProjectId || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSelectedProjectId(val ? Number(val) : null);
                            }}
                            className="w-full sm:w-64 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-750 bg-white shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                        >
                            <option value="">— Chọn dự án để phân tích —</option>
                            {myProjects.map(p => (
                                <option key={p.projectId || p.id} value={p.projectId || p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {!selectedProjectId ? (
                <div className="card p-12 text-center bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner border border-gray-100">
                        <i className="fa-solid fa-chart-line" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Chưa chọn dự án</h3>
                    <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">Vui lòng chọn một dự án từ danh sách thả xuống ở góc phải để xem báo cáo thống kê chi tiết.</p>
                </div>
            ) : loading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm py-20">
                    <div className="loading-spinner mb-4" />
                    <p className="text-sm font-semibold text-gray-600">Đang phân tích dữ liệu dự án...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Burndown Chart */}
                    <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <i className="fa-solid fa-fire text-amber-500 text-sm" />
                                    Biểu đồ Burndown
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">Tiến độ hoàn thành công việc thực tế so với đường lý tưởng của Sprint</p>
                            </div>
                            {velocity?.sprints?.length > 0 && (
                                <select
                                    value={selectedSprintId || ''}
                                    onChange={(e) => loadBurndown(Number(e.target.value))}
                                    className="px-3.5 py-2 border border-gray-200 bg-white text-gray-700 rounded-xl text-xs font-semibold hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer shadow-sm"
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
                            <ResponsiveContainer width="100%" height={320}>
                                <LineChart data={burndown.dataPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#9CA3AF"
                                        tick={{ fontSize: 10 }}
                                        tickFormatter={(val) => formatDate(val, { day: '2-digit', month: '2-digit' })}
                                    />
                                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={{ background: '#1e2937', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                        labelFormatter={(val) => formatDate(val)}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                    <Line type="monotone" dataKey="ideal" stroke="#9CA3AF" strokeDasharray="5 5" name="Lý tưởng" />
                                    <Line type="monotone" dataKey="actual" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4, fill: '#4F46E5' }} name="Thực tế" />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                <i className="fa-solid fa-folder-open text-gray-300 text-3xl mb-2" />
                                <p className="text-sm text-gray-500 font-medium">Không có dữ liệu burndown cho Sprint này</p>
                            </div>
                        )}
                    </div>

                    {/* Velocity Chart */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <i className="fa-solid fa-bolt text-indigo-500 text-sm" />
                                    Tốc độ hoàn thành Sprint
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
                                    <Tooltip contentStyle={{ background: '#1e2937', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                                    <Bar dataKey="completedIssues" fill="#4F46E5" name="Issues hoàn thành" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 flex-1 min-h-[280px]">
                                <i className="fa-solid fa-folder-open text-gray-300 text-3xl mb-2" />
                                <p className="text-sm text-gray-500 font-medium">Không có dữ liệu tốc độ Sprint</p>
                            </div>
                        )}
                    </div>

                    {/* Status Distribution Pie */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <i className="fa-solid fa-chart-pie text-emerald-500 text-sm" />
                                    Phân bổ trạng thái công việc
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
                                            >
                                                {statusDist.distribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ background: '#1e2937', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
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
                                            <span className="font-bold text-gray-900">
                                                {d.count} tasks ({formatNumber(d.percent * 100, { maximumFractionDigits: 0 })}%)
                                            </span>
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
