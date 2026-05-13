import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import MetricCard from '@shared/components/MetricCard';
import PerformanceWidget from '@shared/components/PerformanceWidget';
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
                <i className="fa-solid fa-spinner fa-spin text-2xl text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">HR Dashboard</h1>
                        <p className="text-purple-100 text-sm mt-0.5">Tổng quan nhân sự và hiệu suất</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-purple-200">Chu kỳ:</span>
                        <select
                            value={period}
                            onChange={e => setPeriod(e.target.value)}
                            className="px-3 py-2 bg-white/20 text-white border border-white/30 rounded-lg text-sm"
                        >
                            <option value="all">Toàn thời gian</option>
                            <option value="12">12 tháng gần nhất</option>
                            <option value="6">6 tháng gần nhất</option>
                            <option value="3">3 tháng gần nhất</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                    title="Nhân sự"
                    value={activeCount}
                    subtitle="đang hoạt động"
                    icon="fa-users"
                    color="indigo"
                    onClick={() => {}}
                />
                <MetricCard
                    title="Nghỉ phép"
                    value={onLeaveCount}
                    subtitle="đang nghỉ hôm nay"
                    icon="fa-umbrella-beach"
                    color="amber"
                    onClick={() => navigate('/app/hr/leave-requests')}
                />
                <MetricCard
                    title="Tỷ lệ điểm danh"
                    value={`${(attendanceRate).toFixed(0)}%`}
                    subtitle="hôm nay"
                    icon="fa-clipboard-check"
                    color={attendanceRate >= 90 ? 'green' : attendanceRate >= 70 ? 'amber' : 'red'}
                />
                <MetricCard
                    title="Hiệu suất TB"
                    value={companyAvgPerf.toFixed(1)}
                    subtitle="điểm trung bình"
                    icon="fa-chart-line"
                    color={companyAvgPerf >= 8 ? 'green' : companyAvgPerf >= 6.5 ? 'amber' : 'red'}
                />
            </div>

            {/* Top Performers + At Risk */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <i className="fa-solid fa-trophy text-amber-500" />
                            Top performers
                        </h3>
                        <Link to="/app/hr/performance" className="text-xs text-indigo-500 hover:text-indigo-700">
                            Xem tất cả
                        </Link>
                    </div>
                    <div className="p-5">
                        {topPerformers.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">Chưa có dữ liệu</p>
                        ) : (
                            <div className="space-y-2">
                                {topPerformers.map((perf, i) => (
                                    <PerformerRow key={perf.userId || perf.employeeId || i} perf={perf} rank={i + 1} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <i className="fa-solid fa-triangle-exclamation text-red-500" />
                            Nhân sự cần chú ý
                        </h3>
                        <Link to="/app/hr/performance" className="text-xs text-indigo-500 hover:text-indigo-700">
                            Chi tiết
                        </Link>
                    </div>
                    <div className="p-5">
                        {atRiskEmployees.length === 0 ? (
                            <div className="text-center py-4">
                                <i className="fa-solid fa-check-circle text-3xl text-green-300 mb-2" />
                                <p className="text-sm text-gray-400">Tất cả nhân sự đều hoạt động tốt</p>
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

            {/* Performance by Project */}
            {projectPerfChart.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <h3 className="font-bold text-gray-800 mb-4">Hiệu suất theo dự án</h3>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={projectPerfChart}>
                                <XAxis dataKey="name" fontSize={11} />
                                <YAxis domain={[0, 10]} fontSize={11} />
                                <Tooltip formatter={(v) => [v + ' điểm']} />
                                <Bar dataKey="Hiệu suất TB" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Upcoming Leaves + Pending Reviews */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <i className="fa-solid fa-umbrella-beach text-amber-500" />
                            Nghỉ phép sắp tới
                        </h3>
                        <Link to="/app/hr/leave-requests" className="text-xs text-indigo-500 hover:text-indigo-700">
                            Quản lý
                        </Link>
                    </div>
                    <div className="p-5">
                        {upcomingLeaves.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">Không có lịch nghỉ sắp tới</p>
                        ) : (
                            <div className="space-y-2">
                                {upcomingLeaves.map((leave, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-800">
                                                {leave.employeeName || leave.employee?.fullName || 'Nhân viên'}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {leave.startDate} → {leave.endDate}
                                            </p>
                                        </div>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                                            {leave.leaveType || 'Nghỉ phép'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <i className="fa-solid fa-clipboard-list text-indigo-500" />
                            Đánh giá chờ duyệt
                        </h3>
                        <Link to="/app/hr/reviews" className="text-xs text-indigo-500 hover:text-indigo-700">
                            Quản lý
                        </Link>
                    </div>
                    <div className="p-5">
                        {pendingReviews.length === 0 ? (
                            <div className="text-center py-4">
                                <i className="fa-solid fa-check-circle text-3xl text-green-300 mb-2" />
                                <p className="text-sm text-gray-400">Không có đánh giá nào chờ duyệt</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {pendingReviews.slice(0, 5).map((review, i) => (
                                    <div key={review.reviewId || i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                            {(review.employeeName || '?').charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-800">
                                                {review.employeeName || 'Nhân viên'}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {review.reviewPeriod || review.period || 'Chưa xác định'}
                                            </p>
                                        </div>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <QuickLink icon="fa-users" label="Nhân sự" to="/app/hr/employees" color="indigo" />
                <QuickLink icon="fa-umbrella-beach" label="Nghỉ phép" to="/app/hr/leave-requests" color="amber" />
                <QuickLink icon="fa-chart-line" label="Hiệu suất" to="/app/hr/performance" color="green" />
                <QuickLink icon="fa-clipboard-list" label="Đánh giá" to="/app/hr/reviews" color="purple" />
            </div>
        </div>
    );
}

function PerformerRow({ perf, rank, atRisk = false }) {
    const score = perf.avgPerf || perf.totalPerformanceScore || 0;
    const scoreColor = score >= 9 ? 'text-green-600' : score >= 8 ? 'text-indigo-600' : score >= 6.5 ? 'text-amber-600' : 'text-red-600';
    const rankColors = { 1: 'text-amber-500', 2: 'text-gray-400', 3: 'text-orange-400' };

    return (
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
            {rank && (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rankColors[rank] || 'text-gray-400'}`}>
                    {rank <= 3 ? <i className={`fa-solid ${rank <= 1 ? 'fa-trophy' : rank === 2 ? 'fa-medal' : 'fa-award'}`} /> : rank}
                </div>
            )}
            {!rank && atRisk && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-red-500">
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
                <p className={`text-sm font-bold ${scoreColor}`}>{score.toFixed(1)}</p>
                <p className="text-[10px] text-gray-400">{perf.completedTasks || 0} tasks</p>
            </div>
        </div>
    );
}

function QuickLink({ icon, label, to, color }) {
    const colorMap = {
        indigo: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-100',
        amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-100',
        green: 'bg-green-50 text-green-600 hover:bg-green-100 border-green-100',
        purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-100',
    };
    return (
        <Link
            to={to}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${colorMap[color]}`}
        >
            <i className={`fa-solid ${icon} text-xl`} />
            <span className="font-semibold text-sm">{label}</span>
        </Link>
    );
}
