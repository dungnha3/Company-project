import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';

export default function HRDashboardPage() {
    const navigate = useNavigate();
    const [period, setPeriod] = useState('all');
    const { hasPermission } = useWorkspaceStore();

    // Fetch employees
    const { data: employeesData = {}, isLoading: loadingEmp } = useQuery({
        queryKey: ['employees', 'page', 0, 20, 'ACTIVE'],
        queryFn: async () => {
            try {
                const res = await apiClient.get(ENDPOINTS.EMPLOYEES.PAGE, {
                    params: { page: 0, size: 20, status: 'ACTIVE' }
                });
                return res.data || {};
            } catch (e) {
                console.warn('[HRDashboard] Failed to fetch employees:', e.message);
                return {};
            }
        },
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    // Fetch leave calendar
    const { data: leavesData = [], isLoading: loadingLeaves } = useQuery({
        queryKey: ['leaves', 'team-calendar'],
        queryFn: async () => {
            try {
                const today = new Date();
                const start = today.toISOString().split('T')[0];
                const end = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                const res = await apiClient.get(ENDPOINTS.LEAVE_REQUESTS.TEAM_CALENDAR, {
                    params: { startDate: start, endDate: end }
                });
                return Array.isArray(res.data) ? res.data : [];
            } catch (e) {
                console.warn('[HRDashboard] Failed to fetch leaves:', e.message);
                return [];
            }
        },
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    // Fetch pending reviews
    const { data: pendingReviews = [], isLoading: loadingReviews } = useQuery({
        queryKey: ['reviews', 'pending'],
        queryFn: async () => {
            try {
                const res = await apiClient.get(ENDPOINTS.REVIEWS.PENDING);
                return Array.isArray(res.data) ? res.data : [];
            } catch (e) {
                console.warn('[HRDashboard] Failed to fetch pending reviews:', e.message);
                return [];
            }
        },
        enabled: hasPermission('reviewApprove'),
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    // Fetch projects
    const { data: projects = [], isLoading: loadingProjects } = useQuery({
        queryKey: ['projects', 'list'],
        queryFn: async () => {
            try {
                const res = await apiClient.get(ENDPOINTS.PROJECTS.LIST);
                return Array.isArray(res.data) ? res.data : (res.data?.content || []);
            } catch (e) {
                console.warn('[HRDashboard] Failed to fetch projects:', e.message);
                return [];
            }
        },
        retry: false,
        staleTime: 2 * 60 * 1000,
    });

    // Fetch performance data
    const { data: allPerfData = [], isLoading: loadingPerf } = useQuery({
        queryKey: ['performance', 'all-comparisons', period],
        queryFn: async () => {
            try {
                const activeProjects = (projects || []).slice(0, 5);
                const calls = activeProjects.map(async (p) => {
                    const pid = p.projectId || p.id;
                    try {
                        const res = await apiClient.get(`/api/hr/performance-comparison/projects/${pid}`);
                        return { projectId: pid, projectName: p.name, rankings: res.data || [] };
                    } catch {
                        return { projectId: pid, projectName: p.name, rankings: [] };
                    }
                });
                return Promise.all(calls);
            } catch (e) {
                console.warn('[HRDashboard] Failed to fetch performance data:', e.message);
                return [];
            }
        },
        enabled: (projects || []).length > 0,
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    // Derived data
    const employees = (() => {
        if (Array.isArray(employeesData)) return employeesData;
        if (employeesData && employeesData.content && Array.isArray(employeesData.content)) return employeesData.content;
        return [];
    })();
    const activeCount = employees.length;
    const onLeaveCount = Array.isArray(leavesData) ? leavesData.filter(l => l.status === 'APPROVED').length : 0;
    const pendingLeaveCount = Array.isArray(leavesData) ? leavesData.filter(l => l.status === 'PENDING').length : 0;

    // Top performers
    const { topPerformers, atRiskEmployees, companyAvgPerf } = useMemo(() => {
        const perfData = allPerfData || [];
        const map = {};
        for (const project of perfData) {
            for (const perf of (project.rankings || [])) {
                const key = perf.userId || perf.employeeId;
                if (!key) continue;
                if (!map[key]) {
                    map[key] = { ...perf, projects: [], avgPerf: 0, totalPerf: 0, count: 0 };
                }
                map[key].projects.push(project.projectName);
                map[key].totalPerf += Number(perf.totalPerformanceScore || 0);
                map[key].count += 1;
            }
        }

        const withAvg = Object.values(map).map(item => ({
            ...item,
            avgPerf: item.totalPerf / Math.max(item.count, 1),
        })).sort((a, b) => b.avgPerf - a.avgPerf);

        const top = withAvg.slice(0, 5);
        const atRisk = withAvg.filter(item => item.avgPerf < 6.5).slice(0, 5);
        const avgPerf = withAvg.length > 0 ? withAvg.reduce((s, i) => s + i.avgPerf, 0) / withAvg.length : 0;

        return { topPerformers: top, atRiskEmployees: atRisk, companyAvgPerf: avgPerf };
    }, [allPerfData]);

    // Chart data
    const projectPerfChart = useMemo(() => {
        const perfData = allPerfData || [];
        return perfData
            .filter(p => p.rankings?.length > 0)
            .map(p => {
                const avg = p.rankings.reduce((s, r) => s + Number(r.totalPerformanceScore || 0), 0) / Math.max(p.rankings.length, 1);
                return { name: p.projectName?.substring(0, 15), 'Hiệu suất TB': Number(avg.toFixed(1)) };
            });
    }, [allPerfData]);

    // Upcoming leaves
    const upcomingLeaves = useMemo(() => {
        if (!Array.isArray(leavesData)) return [];
        return leavesData.filter(l => l.status === 'APPROVED').slice(0, 5);
    }, [leavesData]);

    const isLoading = loadingEmp || loadingLeaves || loadingReviews || loadingPerf || loadingProjects;

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div className="max-w-full mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">HR Dashboard</h2>
                    <p className="text-sm text-gray-500 mt-1">Tổng quan nhân sự và hiệu suất</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-medium">Chu kỳ:</span>
                    <select
                        value={period}
                        onChange={e => setPeriod(e.target.value)}
                        className="px-3 py-2 border border-gray-200 bg-white text-gray-700 text-sm rounded-lg focus:outline-none focus:border-gray-300"
                    >
                        <option value="all">Toàn thời gian</option>
                        <option value="12">12 tháng gần nhất</option>
                        <option value="6">6 tháng gần nhất</option>
                        <option value="3">3 tháng gần nhất</option>
                    </select>
                </div>
            </div>

            {/* Key Metrics - Clean minimal cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                            <i className="fa-solid fa-users text-gray-400 text-sm" />
                        </div>
                        <div>
                            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Nhân sự</p>
                            <p className="text-[10px] text-gray-400">đang hoạt động</p>
                        </div>
                    </div>
                    <p className="text-2xl font-semibold text-gray-900">{activeCount}</p>
                </div>

                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                            <i className="fa-solid fa-umbrella-beach text-gray-400 text-sm" />
                        </div>
                        <div>
                            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Nghỉ phép</p>
                            <p className="text-[10px] text-gray-400">đang nghỉ hôm nay</p>
                        </div>
                    </div>
                    <p className="text-2xl font-semibold text-gray-900">{onLeaveCount}</p>
                </div>

                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                            <i className="fa-solid fa-clipboard-check text-gray-400 text-sm" />
                        </div>
                        <div>
                            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Chờ duyệt</p>
                            <p className="text-[10px] text-gray-400">đơn nghỉ phép</p>
                        </div>
                    </div>
                    <p className="text-2xl font-semibold text-gray-900">{pendingLeaveCount}</p>
                </div>

                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                            <i className="fa-solid fa-chart-line text-gray-400 text-sm" />
                        </div>
                        <div>
                            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Hiệu suất TB</p>
                            <p className="text-[10px] text-gray-400">điểm trung bình</p>
                        </div>
                    </div>
                    <p className="text-2xl font-semibold text-gray-900">{companyAvgPerf.toFixed(1)}</p>
                </div>
            </div>

            {/* Two columns: Top Performers + At Risk */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Performers */}
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">Top performers</h3>
                        <Link to="/app/hr/performance" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">Xem tất cả →</Link>
                    </div>
                    <div className="p-5">
                        {topPerformers.length === 0 ? (
                            <div className="text-center py-8">
                                <i className="fa-solid fa-users text-2xl text-gray-300 mb-2" />
                                <p className="text-xs text-gray-500">Chưa có dữ liệu</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {topPerformers.map((perf, i) => (
                                    <PerformerRow key={perf.userId || perf.employeeId || i} perf={perf} rank={i + 1} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* At Risk */}
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">Nhân sự cần chú ý</h3>
                        <Link to="/app/hr/performance" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">Chi tiết →</Link>
                    </div>
                    <div className="p-5">
                        {atRiskEmployees.length === 0 ? (
                            <div className="text-center py-8">
                                <i className="fa-solid fa-check-circle text-3xl text-green-300 mb-2" />
                                <p className="text-xs text-gray-500">Tất cả nhân sự đều hoạt động tốt</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {atRiskEmployees.map((perf, i) => (
                                    <PerformerRow key={perf.userId || perf.employeeId || i} perf={perf} rank={null} atRisk />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Performance Chart */}
            {projectPerfChart.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                    <h3 className="font-medium text-gray-900 mb-4 pb-3 border-b border-gray-100">Hiệu suất theo dự án</h3>
                    <div style={{ height: '250px' }} className="min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={projectPerfChart}>
                                <XAxis dataKey="name" fontSize={11} tick={{ fill: '#374151', fontWeight: 500 }} />
                                <YAxis domain={[0, 10]} fontSize={11} tick={{ fill: '#374151', fontWeight: 500 }} />
                                <Tooltip formatter={(v) => [v + ' điểm']} />
                                <Bar dataKey="Hiệu suất TB" fill="#374151" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Two columns: Upcoming Leaves + Pending Reviews */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upcoming Leaves */}
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">Nghỉ phép sắp tới</h3>
                        <Link to="/app/hr/leave-requests" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">Quản lý →</Link>
                    </div>
                    <div className="p-5">
                        {upcomingLeaves.length === 0 ? (
                            <div className="text-center py-6">
                                <i className="fa-solid fa-calendar text-2xl text-gray-300 mb-2" />
                                <p className="text-xs text-gray-500">Không có lịch nghỉ sắp tới</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {upcomingLeaves.map((leave, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="w-7 h-7 rounded bg-gray-100 text-gray-600 font-medium text-xs flex items-center justify-center">{i + 1}</span>
                                            <div>
                                                <p className="font-medium text-gray-800 text-sm">{leave.employeeName || leave.employee?.fullName || 'Nhân viên'}</p>
                                                <p className="text-[10px] text-gray-400">{leave.startDate} → {leave.endDate}</p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-medium rounded">{leave.leaveType || 'Nghỉ phép'}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Pending Reviews */}
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">Đánh giá chờ duyệt</h3>
                        <Link to="/app/hr/reviews" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">Quản lý →</Link>
                    </div>
                    <div className="p-5">
                        {pendingReviews.length === 0 ? (
                            <div className="text-center py-6">
                                <i className="fa-solid fa-check-circle text-3xl text-green-300 mb-2" />
                                <p className="text-xs text-gray-500">Không có đánh giá nào chờ duyệt</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {pendingReviews.slice(0, 5).map((review, i) => (
                                    <div key={review.reviewId || i} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-medium text-sm flex items-center justify-center">
                                                {(review.employeeName || '?').charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800 text-sm">{review.employeeName || 'Nhân viên'}</p>
                                                <p className="text-[10px] text-gray-400">{review.reviewPeriod || review.period || 'Chưa xác định'}</p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-medium rounded">{review.reviewType || 'Đánh giá'}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickLink icon="fa-users" label="Nhân sự" to="/app/hr/employees" />
                <QuickLink icon="fa-umbrella-beach" label="Nghỉ phép" to="/app/hr/leave-requests" />
                <QuickLink icon="fa-chart-line" label="Hiệu suất" to="/app/hr/performance" />
                <QuickLink icon="fa-clipboard-list" label="Đánh giá" to="/app/hr/reviews" />
            </div>
        </div>
    );
}

function PerformerRow({ perf, rank, atRisk = false }) {
    const score = perf.avgPerf || perf.totalPerformanceScore || 0;
    const scoreColor = score >= 9 ? 'text-green-600' : score >= 8 ? 'text-gray-700' : score >= 6.5 ? 'text-gray-600' : 'text-red-600';
    const rankColors = { 1: 'text-amber-500', 2: 'text-gray-400', 3: 'text-orange-400' };

    return (
        <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
            {rank && (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${rankColors[rank] || 'text-gray-400'}`}>
                    {rank <= 3 ? (
                        <i className={`fa-solid ${rank === 1 ? 'fa-trophy' : rank === 2 ? 'fa-medal' : 'fa-award'}`} />
                    ) : rank}
                </div>
            )}
            {!rank && atRisk && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-red-500">
                    <i className="fa-solid fa-exclamation" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{perf.employeeName || perf.userName || '?'}</p>
                <p className="text-[10px] text-gray-400 truncate">
                    {(perf.projects || []).slice(0, 2).join(', ')}
                    {(perf.projects || []).length > 2 ? ` +${perf.projects.length - 2}` : ''}
                </p>
            </div>
            <div className="text-right">
                <p className={`text-sm font-medium ${scoreColor}`}>{score.toFixed(1)}</p>
                <p className="text-[10px] text-gray-400">{perf.completedTasks || 0} tasks</p>
            </div>
        </div>
    );
}

function QuickLink({ icon, label, to }) {
    return (
        <Link
            to={to}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
        >
            <i className={`fa-solid ${icon} text-lg text-gray-400`} />
            <span className="font-medium text-sm text-gray-700">{label}</span>
        </Link>
    );
}
