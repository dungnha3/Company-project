import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function HRDashboardPage() {
    const navigate = useNavigate();
    const [period, setPeriod] = useState('all');

    // Fetch employees
    const { data: employeesData, isLoading: loadingEmp } = useQuery({
        queryKey: ['employees', 'page', 0, 20, 'ACTIVE'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.EMPLOYEES.PAGE, {
                params: { page: 0, size: 20, status: 'ACTIVE' }
            });
            return res.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    // Fetch leave calendar (today + upcoming)
    const { data: leavesData, isLoading: loadingLeaves } = useQuery({
        queryKey: ['leaves', 'team-calendar'],
        queryFn: async () => {
            const today = new Date();
            const start = today.toISOString().split('T')[0];
            const end = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const res = await apiClient.get(ENDPOINTS.LEAVE_REQUESTS.TEAM_CALENDAR, {
                params: { startDate: start, endDate: end }
            });
            return res.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    // Fetch attendance report
    const { data: attendanceData, isLoading: loadingAttendance } = useQuery({
        queryKey: ['attendance', 'report'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.ATTENDANCE.REPORT);
            return res.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    // Fetch pending reviews
    const { data: pendingReviews = [], isLoading: loadingReviews } = useQuery({
        queryKey: ['reviews', 'pending'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.REVIEWS.PENDING);
            return res.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    // Fetch projects
    const { data: projects = [], isLoading: loadingProjects } = useQuery({
        queryKey: ['projects', 'list'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.LIST);
            return Array.isArray(res.data) ? res.data : (res.data?.content || []);
        },
        staleTime: 2 * 60 * 1000,
    });

    // Fetch all performance comparisons across projects
    const { data: allPerfData = [], isLoading: loadingPerf } = useQuery({
        queryKey: ['performance', 'all-comparisons', period],
        queryFn: async () => {
            const activeProjects = projects.slice(0, 5);
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
        },
        enabled: projects.length > 0,
        staleTime: 5 * 60 * 1000,
    });

    // Derived data
    const employees = employeesData?.content || employeesData || [];
    const activeCount = employees.length;
    const onLeaveCount = Array.isArray(leavesData) ? leavesData.filter(l => l.status === 'APPROVED').length : 0;
    const pendingLeaveCount = Array.isArray(leavesData) ? leavesData.filter(l => l.status === 'PENDING').length : 0;
    const attendanceRate = attendanceData?.rate || attendanceData?.attendanceRate || 0;

    // Top performers from all performance data
    const { topPerformers, atRiskEmployees, companyAvgPerf } = useMemo(() => {
        const map = {};
        for (const project of allPerfData) {
            for (const perf of (project.rankings || [])) {
                const key = perf.userId || perf.employeeId;
                if (!key) continue;
                if (!map[key]) {
                    map[key] = {
                        ...perf,
                        projects: [],
                        avgPerf: 0,
                        totalPerf: 0,
                        count: 0,
                    };
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
        const avgPerf = withAvg.length > 0
            ? withAvg.reduce((s, i) => s + i.avgPerf, 0) / withAvg.length
            : 0;

        return { topPerformers: top, atRiskEmployees: atRisk, companyAvgPerf: avgPerf };
    }, [allPerfData]);

    // Performance by project chart data
    const projectPerfChart = useMemo(() => {
        return allPerfData
            .filter(p => p.rankings?.length > 0)
            .map(p => {
                const avg = p.rankings.reduce((s, r) => s + Number(r.totalPerformanceScore || 0), 0) / Math.max(p.rankings.length, 1);
                return {
                    name: p.projectName?.substring(0, 15),
                    'Hiệu suất TB': Number(avg.toFixed(1)),
                };
            });
    }, [allPerfData]);

    // Upcoming leaves
    const upcomingLeaves = useMemo(() => {
        if (!Array.isArray(leavesData)) return [];
        return leavesData
            .filter(l => l.status === 'APPROVED')
            .slice(0, 5);
    }, [leavesData]);

    const isLoading = loadingEmp || loadingLeaves || loadingAttendance || loadingReviews || loadingPerf || loadingProjects;

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <i className="fa-solid fa-spinner fa-spin text-2xl color-main" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border border-gray-200 bg-white rounded-lg shadow-sm">
                <div>
                    <h2 className="text-2xl font-black color-main tracking-tight">HR DASHBOARD</h2>
                    <p className="text-xs color-slate font-semibold mt-1">Tổng quan nhân sự và hiệu suất</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs color-slate font-bold">Chu kỳ:</span>
                    <select
                        value={period}
                        onChange={e => setPeriod(e.target.value)}
                        className="px-3 py-2 border border-gray-200 bg-white color-slate font-bold text-xs rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Toàn thời gian</option>
                        <option value="12">12 tháng gần nhất</option>
                        <option value="6">6 tháng gần nhất</option>
                        <option value="3">3 tháng gần nhất</option>
                    </select>
                </div>
            </div>

            {/* Key Metrics - 4 cards in a row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Nhân sự */}
                <div className="border border-gray-200 rounded-lg bg-white p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <i className="fa-solid fa-users text-blue-500 text-lg" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold color-slate uppercase tracking-wider">Nhân sự</p>
                            <p className="text-[10px] color-slate mt-0.5">đang hoạt động</p>
                        </div>
                    </div>
                    <p className="text-3xl font-black color-main">{activeCount}</p>
                </div>

                {/* Nghỉ phép */}
                <div className="border border-gray-200 rounded-lg bg-white p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                            <i className="fa-solid fa-umbrella-beach text-orange-500 text-lg" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold color-slate uppercase tracking-wider">Nghỉ phép</p>
                            <p className="text-[10px] color-slate mt-0.5">đang nghỉ hôm nay</p>
                        </div>
                    </div>
                    <p className="text-3xl font-black color-main">{onLeaveCount}</p>
                </div>

                {/* Tỷ lệ điểm danh */}
                <div className="border border-gray-200 rounded-lg bg-white p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                            <i className="fa-solid fa-clipboard-check text-green-500 text-lg" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold color-slate uppercase tracking-wider">Tỷ lệ điểm danh</p>
                            <p className="text-[10px] color-slate mt-0.5">hôm nay</p>
                        </div>
                    </div>
                    <p className="text-3xl font-black color-main">{attendanceRate.toFixed(0)}%</p>
                </div>

                {/* Hiệu suất TB */}
                <div className="border border-gray-200 rounded-lg bg-white p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                            <i className="fa-solid fa-chart-line text-purple-500 text-lg" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold color-slate uppercase tracking-wider">Hiệu suất TB</p>
                            <p className="text-[10px] color-slate mt-0.5">điểm trung bình</p>
                        </div>
                    </div>
                    <p className="text-3xl font-black color-main">{companyAvgPerf.toFixed(1)}</p>
                </div>
            </div>

            {/* Two columns: Top Performers + At Risk */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Performers */}
                <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: '#fffbeb' }}>
                        <h3 className="font-bold color-main flex items-center gap-2">
                            <i className="fa-solid fa-trophy text-amber-500" />
                            Top performers
                        </h3>
                        <Link to="/app/hr/performance" className="text-xs color-blue font-semibold hover:underline">
                            Xem tất cả →
                        </Link>
                    </div>
                    <div className="p-5">
                        {topPerformers.length === 0 ? (
                            <div className="text-center py-8">
                                <i className="fa-solid fa-users text-2xl color-slate mb-2" />
                                <p className="text-xs color-slate font-semibold">Chưa có dữ liệu</p>
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
                <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: '#fef2f2' }}>
                        <h3 className="font-bold color-main flex items-center gap-2">
                            <i className="fa-solid fa-triangle-exclamation text-red-500" />
                            Nhân sự cần chú ý
                        </h3>
                        <Link to="/app/hr/performance" className="text-xs color-blue font-semibold hover:underline">
                            Chi tiết →
                        </Link>
                    </div>
                    <div className="p-5">
                        {atRiskEmployees.length === 0 ? (
                            <div className="text-center py-8">
                                <i className="fa-solid fa-check-circle text-3xl text-green-400 mb-2" />
                                <p className="text-xs color-slate font-semibold">Tất cả nhân sự đều hoạt động tốt</p>
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

            {/* Performance by Project Chart */}
            {projectPerfChart.length > 0 && (
                <div className="border border-gray-200 rounded-lg bg-white p-6">
                    <h3 className="font-bold color-main mb-4 pb-3 border-b border-gray-100">Hiệu suất theo dự án</h3>
                    <div style={{ height: '250px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={projectPerfChart}>
                                <XAxis dataKey="name" fontSize={11} tick={{ fill: '#78350F', fontWeight: 600 }} />
                                <YAxis domain={[0, 10]} fontSize={11} tick={{ fill: '#78350F', fontWeight: 600 }} />
                                <Tooltip formatter={(v) => [v + ' điểm']} />
                                <Bar dataKey="Hiệu suất TB" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Two columns: Upcoming Leaves + Pending Reviews */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upcoming Leaves */}
                <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: '#fff7ed' }}>
                        <h3 className="font-bold color-main flex items-center gap-2">
                            <i className="fa-solid fa-umbrella-beach text-orange-500" />
                            Nghỉ phép sắp tới
                        </h3>
                        <Link to="/app/hr/leave-requests" className="text-xs color-blue font-semibold hover:underline">
                            Quản lý →
                        </Link>
                    </div>
                    <div className="p-5">
                        {upcomingLeaves.length === 0 ? (
                            <div className="text-center py-6">
                                <i className="fa-solid fa-calendar text-2xl color-slate mb-2" />
                                <p className="text-xs color-slate font-semibold">Không có lịch nghỉ sắp tới</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {upcomingLeaves.map((leave, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <span className="w-7 h-7 rounded bg-orange-100 text-orange-600 font-bold text-xs flex items-center justify-center">
                                                {i + 1}
                                            </span>
                                            <div>
                                                <p className="font-semibold color-main text-sm">
                                                    {leave.employeeName || leave.employee?.fullName || 'Nhân viên'}
                                                </p>
                                                <p className="text-[10px] color-slate">
                                                    {leave.startDate} → {leave.endDate}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 bg-orange-100 text-orange-600 text-[10px] font-bold rounded">
                                            {leave.leaveType || 'Nghỉ phép'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Pending Reviews */}
                <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: '#eff6ff' }}>
                        <h3 className="font-bold color-main flex items-center gap-2">
                            <i className="fa-solid fa-clipboard-list text-blue-500" />
                            Đánh giá chờ duyệt
                        </h3>
                        <Link to="/app/hr/reviews" className="text-xs color-blue font-semibold hover:underline">
                            Quản lý →
                        </Link>
                    </div>
                    <div className="p-5">
                        {pendingReviews.length === 0 ? (
                            <div className="text-center py-6">
                                <i className="fa-solid fa-check-circle text-3xl text-green-400 mb-2" />
                                <p className="text-xs color-slate font-semibold">Không có đánh giá nào chờ duyệt</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {pendingReviews.slice(0, 5).map((review, i) => (
                                    <div key={review.reviewId || i} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 font-bold text-sm flex items-center justify-center">
                                                {(review.employeeName || '?').charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold color-main text-sm">
                                                    {review.employeeName || 'Nhân viên'}
                                                </p>
                                                <p className="text-[10px] color-slate">
                                                    {review.reviewPeriod || review.period || 'Chưa xác định'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 bg-blue-100 text-blue-600 text-[10px] font-bold rounded">
                                            {review.reviewType || 'Đánh giá'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickLink icon="fa-users" label="Nhân sự" to="/app/hr/employees" color="blue" />
                <QuickLink icon="fa-umbrella-beach" label="Nghỉ phép" to="/app/hr/leave-requests" color="orange" />
                <QuickLink icon="fa-chart-line" label="Hiệu suất" to="/app/hr/performance" color="purple" />
                <QuickLink icon="fa-clipboard-list" label="Đánh giá" to="/app/hr/reviews" color="green" />
            </div>
        </div>
    );
}

function PerformerRow({ perf, rank, atRisk = false }) {
    const score = perf.avgPerf || perf.totalPerformanceScore || 0;
    const scoreColor = score >= 9 ? 'text-green-600' : score >= 8 ? 'text-indigo-600' : score >= 6.5 ? 'text-amber-600' : 'text-red-600';
    const rankColors = { 1: 'text-amber-500', 2: 'text-gray-400', 3: 'text-orange-400' };

    return (
        <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
            {rank && (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rankColors[rank] || 'text-gray-400'}`}>
                    {rank <= 3 ? (
                        <i className={`fa-solid ${rank <= 1 ? 'fa-trophy' : rank === 2 ? 'fa-medal' : 'fa-award'}`} />
                    ) : rank}
                </div>
            )}
            {!rank && atRisk && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-red-500">
                    <i className="fa-solid fa-exclamation" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold color-main truncate">{perf.employeeName || perf.userName || '?'}</p>
                <p className="text-[10px] color-slate truncate">
                    {(perf.projects || []).slice(0, 2).join(', ')}
                    {(perf.projects || []).length > 2 ? ` +${perf.projects.length - 2}` : ''}
                </p>
            </div>
            <div className="text-right">
                <p className={`text-sm font-bold ${scoreColor}`}>{score.toFixed(1)}</p>
                <p className="text-[10px] color-slate">{perf.completedTasks || 0} tasks</p>
            </div>
        </div>
    );
}

function QuickLink({ icon, label, to, color }) {
    const colorMap = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-500', border: 'border-blue-200', label: 'text-blue-600' },
        orange: { bg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-200', label: 'text-orange-600' },
        green: { bg: 'bg-green-50', text: 'text-green-500', border: 'border-green-200', label: 'text-green-600' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-500', border: 'border-purple-200', label: 'text-purple-600' },
    };
    const c = colorMap[color] || colorMap.blue;

    return (
        <Link
            to={to}
            className={`flex items-center gap-3 p-4 border ${c.border} rounded-lg hover:shadow-md transition-all ${c.bg}`}
        >
            <i className={`fa-solid ${icon} text-xl ${c.text}`} />
            <span className={`font-bold text-sm ${c.label}`}>{label}</span>
        </Link>
    );
}
