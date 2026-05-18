import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import BurndownChart from '../components/BurndownChart';
import { formatDate } from '@shared/utils/formatters';

export default function ProjectDashboardTab({ projectId, project }) {
    // Fetch project stats
    const { data: stats } = useQuery({
        queryKey: ['project-dashboard', projectId, 'stats'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECT_DASHBOARD.STATS(projectId));
            return res.data;
        },
        staleTime: 60 * 1000,
    });

    // Fetch team members
    const { data: members = [] } = useQuery({
        queryKey: ['projectMembers', projectId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.MEMBERS(projectId));
            return res.data || [];
        },
        staleTime: 2 * 60 * 1000,
    });

    // Fetch sprints
    const { data: sprints = [] } = useQuery({
        queryKey: ['sprints', projectId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.SPRINTS.BY_PROJECT(projectId));
            return res.data || [];
        },
        staleTime: 60 * 1000,
    });

    // Fetch project goals
    const { data: goals = [] } = useQuery({
        queryKey: ['project-goals', projectId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.GOALS(projectId));
            return res.data || [];
        },
        staleTime: 60 * 1000,
    });

    // Fetch activities
    const { data: activities = [] } = useQuery({
        queryKey: ['project-activities', projectId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.ACTIVITIES.BY_PROJECT(projectId));
            return (res.data?.content || res.data || []).slice(0, 10);
        },
        staleTime: 30 * 1000,
    });

    // Fetch team performance
    const { data: teamPerf = [] } = useQuery({
        queryKey: ['performance', 'comparison', projectId],
        queryFn: async () => {
            const res = await apiClient.get(`/api/hr/performance-comparison/projects/${projectId}`);
            return res.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    // Active sprint
    const activeSprint = useMemo(() => {
        return sprints.find(s => s.status === 'ACTIVE') || sprints.find(s => s.status === 'PLANNING') || null;
    }, [sprints]);

    // Goal progress
    const goalProgress = useMemo(() => {
        if (goals.length === 0) return { completed: 0, total: 0, pct: 0 };
        const completed = goals.filter(g => g.isCompleted).length;
        return { completed, total: goals.length, pct: Math.round((completed / goals.length) * 100) };
    }, [goals]);

    // Issue stats from project data
    const issueStats = useMemo(() => {
        if (!stats) return { total: 0, done: 0, inProgress: 0 };
        return {
            total: stats.totalIssues || stats.issueCount || 0,
            done: stats.doneIssues || stats.completedIssues || 0,
            inProgress: stats.inProgressIssues || 0,
        };
    }, [stats]);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border border-gray-200 bg-white rounded-lg shadow-sm">
                <div>
                    <h2 className="text-2xl font-black color-main tracking-tight">PROJECT DASHBOARD</h2>
                    <p className="text-xs color-slate font-semibold mt-1">
                        {project?.projectName || 'Dự án'} • Trạng thái: {project?.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngưng'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <span className="px-4 py-2 border border-gray-200 bg-gray-50 font-bold color-slate text-xs rounded-lg">
                        <i className="fa-solid fa-list-check text-blue-500 mr-2"></i>
                        Tổng Issues: {issueStats.total}
                    </span>
                    <span className="px-4 py-2 border border-gray-200 bg-gray-50 font-bold color-slate text-xs rounded-lg">
                        <i className="fa-solid fa-users text-orange-500 mr-2"></i>
                        Thành viên: {members.length}
                    </span>
                </div>
            </div>

            {/* Quick Stats - 4 cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricBox title="Tổng Issues" value={issueStats.total} subtitle="trong dự án" color="blue" icon="fa-list-check" />
                <MetricBox title="Hoàn thành" value={issueStats.done} subtitle={`${issueStats.total > 0 ? Math.round((issueStats.done / issueStats.total) * 100) : 0}% tiến độ`} color="green" icon="fa-check-circle" />
                <MetricBox title="Đang làm" value={issueStats.inProgress} subtitle="issues" color="orange" icon="fa-spinner" />
                <MetricBox title="Thành viên" value={members.length} subtitle="trong team" color="purple" icon="fa-users" />
            </div>

            {/* Sprint + Team Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Sprint + Burndown */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Active Sprint Card */}
                    {activeSprint ? (
                        <div className="border border-gray-200 rounded-lg bg-white p-6">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <i className="fa-solid fa-layer-group text-blue-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold color-main">{activeSprint.name}</h3>
                                        <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded ${activeSprint.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {activeSprint.status === 'ACTIVE' ? 'ĐANG CHẠY' : 'PLANNING'}
                                        </span>
                                    </div>
                                </div>
                                <Link to={`/app/projects/${projectId}?tab=sprints`} className="text-xs color-blue font-semibold hover:underline">
                                    Quản lý Sprint →
                                </Link>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                {activeSprint.startDate && activeSprint.endDate && (
                                    <>
                                        <div className="p-3 border border-gray-100 rounded-lg bg-gray-50">
                                            <p className="text-[10px] font-bold color-slate uppercase">Bắt đầu</p>
                                            <p className="font-bold color-main mt-1">{formatDate(activeSprint.startDate)}</p>
                                        </div>
                                        <div className="p-3 border border-gray-100 rounded-lg bg-gray-50">
                                            <p className="text-[10px] font-bold color-slate uppercase">Kết thúc</p>
                                            <p className="font-bold color-main mt-1">{formatDate(activeSprint.endDate)}</p>
                                        </div>
                                        <div className="p-3 border border-gray-100 rounded-lg bg-gray-50">
                                            <p className="text-[10px] font-bold color-slate uppercase">Còn lại</p>
                                            <p className="font-bold color-orange mt-1">
                                                {Math.max(0, Math.ceil((new Date(activeSprint.endDate) - new Date()) / (1000 * 60 * 60 * 24)))} ngày
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                            {/* Burndown Chart */}
                            <div className="p-4 border border-gray-100 rounded-lg bg-gray-50">
                                <h4 className="font-bold color-main mb-3 text-sm">BURNDOWN CHART</h4>
                                <BurndownChart sprintId={activeSprint.sprintId || activeSprint.sprint_id} projectId={projectId} />
                            </div>
                        </div>
                    ) : (
                        <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center bg-white">
                            <i className="fa-solid fa-layer-group text-3xl color-slate mb-3" />
                            <p className="font-bold color-main">Chưa có sprint nào</p>
                            <Link to={`/app/projects/${projectId}?tab=sprints`} className="color-blue font-semibold text-xs hover:underline mt-2 inline-block">
                                Tạo Sprint mới →
                            </Link>
                        </div>
                    )}
                </div>

                {/* Right: Top Performers + Goals */}
                <div className="space-y-6">
                    {/* Top Performers */}
                    <div className="border border-gray-200 rounded-lg bg-white p-5">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                            <h3 className="font-bold color-main flex items-center gap-2">
                                <i className="fa-solid fa-trophy text-amber-500" />
                                Top performers
                            </h3>
                            <Link to={`/app/projects/${projectId}?tab=performance`} className="text-xs color-blue font-semibold">
                                Xem tất cả →
                            </Link>
                        </div>
                        {teamPerf.length === 0 ? (
                            <p className="text-xs color-slate font-semibold text-center py-4">Chưa có dữ liệu hiệu suất</p>
                        ) : (
                            <div className="space-y-2">
                                {teamPerf.slice(0, 5).map((perf, i) => (
                                    <TopPerformerRow key={perf.userId || perf.employeeId || i} perf={perf} rank={i + 1} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Project Goals */}
                    <div className="border border-gray-200 rounded-lg bg-white p-5">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                            <h3 className="font-bold color-main flex items-center gap-2">
                                <i className="fa-solid fa-bullseye text-green-500" />
                                Mục tiêu dự án
                            </h3>
                            <Link to={`/app/projects/${projectId}?tab=goals`} className="text-xs color-blue font-semibold">
                                {goals.length > 0 ? 'Chi tiết →' : 'Thêm →'}
                            </Link>
                        </div>
                        {goalProgress.total > 0 && (
                            <div className="mb-3">
                                <div className="flex justify-between mb-1">
                                    <span className="text-[10px] font-bold color-slate">{goalProgress.completed}/{goalProgress.total} hoàn thành</span>
                                    <span className="text-[10px] font-black color-main">{goalProgress.pct}%</span>
                                </div>
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${goalProgress.pct}%` }} />
                                </div>
                            </div>
                        )}
                        <div className="space-y-1 max-h-[160px] overflow-y-auto">
                            {goals.length === 0 ? (
                                <p className="text-xs color-slate font-semibold text-center py-2">Chưa có mục tiêu</p>
                            ) : (
                                goals.slice(0, 5).map(goal => (
                                    <div key={goal.goalId} className="flex items-center gap-2 text-sm p-2 border border-gray-100 rounded bg-gray-50">
                                        <i className={`fa-solid ${goal.isCompleted ? 'fa-check-circle text-green-500' : 'fa-circle text-gray-300'} text-xs`} />
                                        <span className={`font-medium ${goal.isCompleted ? 'line-through text-gray-400' : 'color-main'}`}>
                                            {goal.title}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Team Members + Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Team */}
                <div className="border border-gray-200 rounded-lg bg-white p-5">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                        <h3 className="font-bold color-main flex items-center gap-2">
                            <i className="fa-solid fa-users text-purple-500" />
                            Thành viên ({members.length})
                        </h3>
                        <Link to={`/app/projects/${projectId}?tab=team`} className="text-xs color-blue font-semibold">
                            Quản lý →
                        </Link>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {members.map(member => (
                            <div key={member.userId} className="flex items-center gap-3 p-2 border border-gray-100 rounded-lg bg-gray-50">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                    {(member.fullName || member.username || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold color-main truncate">{member.fullName || member.username}</p>
                                    <p className="text-[10px] color-slate truncate">{member.email || member.role}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2 border border-gray-200 rounded-lg bg-white p-5">
                    <h3 className="font-bold color-main flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                        <i className="fa-solid fa-clock-rotate-left text-blue-500" />
                        Hoạt động gần đây
                    </h3>
                    {activities.length === 0 ? (
                        <p className="text-xs color-slate font-semibold text-center py-4">Chưa có hoạt động nào</p>
                    ) : (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto">
                            {activities.map(act => (
                                <ActivityRow key={act.activityId || act.id} act={act} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function TopPerformerRow({ perf, rank }) {
    const rankColors = { 1: 'text-amber-500', 2: 'text-gray-400', 3: 'text-orange-400' };
    const rankIcons = { 1: 'fa-trophy', 2: 'fa-medal', 3: 'fa-award' };
    const score = Number(perf.totalPerformanceScore || perf.performance || 0);

    return (
        <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rank <= 3 ? rankColors[rank] : 'text-gray-400'}`}>
                {rank <= 3 ? (
                    <i className={`fa-solid ${rankIcons[rank]}`} />
                ) : rank}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold color-main truncate">
                    {perf.employeeName || perf.userName || '?'}
                </p>
                <p className="text-[10px] color-slate">
                    {perf.completedTasks || 0} tasks
                </p>
            </div>
            <div className="text-right">
                <p className={`text-sm font-bold ${score >= 9 ? 'text-green-600' : score >= 8 ? 'text-indigo-600' : 'text-gray-600'}`}>
                    {score.toFixed(1)}
                </p>
            </div>
        </div>
    );
}

function ActivityRow({ act }) {
    const icons = {
        CREATED: { icon: 'fa-plus', bg: 'bg-green-50', text: 'text-green-500' },
        STATUS_CHANGED: { icon: 'fa-arrow-right-arrow-left', bg: 'bg-blue-50', text: 'text-blue-500' },
        ASSIGNEE_CHANGED: { icon: 'fa-user-pen', bg: 'bg-purple-50', text: 'text-purple-500' },
        COMMENT_ADDED: { icon: 'fa-comment', bg: 'bg-indigo-50', text: 'text-indigo-500' },
    };
    const style = icons[act.activityType] || { icon: 'fa-circle', bg: 'bg-gray-50', text: 'text-gray-500' };

    return (
        <div className="flex items-start gap-3 p-3 border-b border-gray-50 last:border-0">
            <div className={`w-7 h-7 rounded-full ${style.bg} ${style.text} flex items-center justify-center shrink-0 text-[10px]`}>
                <i className={`fa-solid ${style.icon}`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm color-main">
                    <span className="font-semibold">{act.userName || 'Người dùng'}</span>
                    {act.description || ' đã thực hiện thay đổi'}
                    {act.issueTitle && (
                        <> trong <span className="color-blue">'{act.issueTitle}'</span></>
                    )}
                </p>
                <p className="text-[10px] color-slate mt-0.5">{formatDate(act.createdAt)}</p>
            </div>
        </div>
    );
}

function MetricBox({ title, value, subtitle, color, icon }) {
    const colorMap = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-500', border: 'border-blue-200' },
        orange: { bg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-200' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-500', border: 'border-amber-200' },
        green: { bg: 'bg-green-50', text: 'text-green-500', border: 'border-green-200' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-500', border: 'border-purple-200' },
    };
    const c = colorMap[color] || colorMap.blue;

    return (
        <div className={`border ${c.border} rounded-lg bg-white p-5 hover:shadow-md transition-shadow`}>
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                    <i className={`fa-solid ${icon} ${c.text} text-lg`} />
                </div>
                <div>
                    <p className="text-[10px] font-bold color-slate uppercase tracking-wider">{title}</p>
                    <p className="text-[10px] color-slate mt-0.5">{subtitle}</p>
                </div>
            </div>
            <p className="text-3xl font-black color-main">{value}</p>
        </div>
    );
}
