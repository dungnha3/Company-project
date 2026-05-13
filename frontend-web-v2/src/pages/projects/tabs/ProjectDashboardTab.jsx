import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import MetricCard from '@shared/components/MetricCard';
import PerformanceWidget from '@shared/components/PerformanceWidget';
import BurndownChart from '../components/BurndownChart';
import { formatDate, formatNumber } from '@shared/utils/formatters';

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
        <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                    title="Tổng Issues"
                    value={issueStats.total}
                    subtitle="trong dự án"
                    icon="fa-list-check"
                    color="indigo"
                    onClick={() => {}}
                />
                <MetricCard
                    title="Hoàn thành"
                    value={issueStats.done}
                    subtitle={`${issueStats.total > 0 ? Math.round((issueStats.done / issueStats.total) * 100) : 0}% tiến độ`}
                    icon="fa-check-circle"
                    color="green"
                />
                <MetricCard
                    title="Đang làm"
                    value={issueStats.inProgress}
                    subtitle="issues"
                    icon="fa-spinner"
                    color="amber"
                />
                <MetricCard
                    title="Thành viên"
                    value={members.length}
                    subtitle="trong team"
                    icon="fa-users"
                    color="purple"
                />
            </div>

            {/* Sprint + Team Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Sprint + Burndown */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Active Sprint Card */}
                    {activeSprint ? (
                        <div className="bg-white rounded-2xl border border-gray-100 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                        <i className="fa-solid fa-layer-group text-indigo-600 text-sm" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{activeSprint.name}</h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${activeSprint.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {activeSprint.status === 'ACTIVE' ? 'Đang chạy' : 'Planning'}
                                        </span>
                                    </div>
                                </div>
                                <Link
                                    to={`/app/projects/${projectId}?tab=sprints`}
                                    className="text-xs text-indigo-500 hover:text-indigo-700"
                                >
                                    Quản lý Sprint
                                </Link>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                {activeSprint.startDate && activeSprint.endDate && (
                                    <>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase">Bắt đầu</p>
                                            <p className="text-sm font-semibold">{formatDate(activeSprint.startDate)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase">Kết thúc</p>
                                            <p className="text-sm font-semibold">{formatDate(activeSprint.endDate)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase">Còn lại</p>
                                            <p className="text-sm font-semibold text-indigo-600">
                                                {Math.max(0, Math.ceil((new Date(activeSprint.endDate) - new Date()) / (1000 * 60 * 60 * 24)))} ngày
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                            {/* Burndown Chart */}
                            <div className="mt-4">
                                <BurndownChart sprintId={activeSprint.sprintId || activeSprint.sprint_id} projectId={projectId} />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                            <i className="fa-solid fa-layer-group text-3xl text-gray-300 mb-2" />
                            <p className="text-gray-500 font-medium">Chưa có sprint nào</p>
                            <Link
                                to={`/app/projects/${projectId}?tab=sprints`}
                                className="text-indigo-500 text-sm hover:underline mt-1 inline-block"
                            >
                                Tạo Sprint mới
                            </Link>
                        </div>
                    )}
                </div>

                {/* Right: Top Performers + Goals */}
                <div className="space-y-6">
                    {/* Top Performers */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <i className="fa-solid fa-trophy text-amber-500 text-sm" />
                                Top performers
                            </h3>
                            <Link
                                to={`/app/projects/${projectId}?tab=performance`}
                                className="text-xs text-indigo-500 hover:text-indigo-700"
                            >
                                Xem tất cả
                            </Link>
                        </div>
                        {teamPerf.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">Chưa có dữ liệu hiệu suất</p>
                        ) : (
                            <div className="space-y-2">
                                {teamPerf.slice(0, 5).map((perf, i) => (
                                    <TopPerformerRow key={perf.userId || perf.employeeId || i} perf={perf} rank={i + 1} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Project Goals */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <i className="fa-solid fa-bullseye text-emerald-500 text-sm" />
                                Mục tiêu dự án
                            </h3>
                            <Link
                                to={`/app/projects/${projectId}?tab=goals`}
                                className="text-xs text-indigo-500 hover:text-indigo-700"
                            >
                                {goals.length > 0 ? 'Chi tiết' : 'Thêm'}
                            </Link>
                        </div>
                        {goalProgress.total > 0 && (
                            <div className="mb-3">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>{goalProgress.completed}/{goalProgress.total} hoàn thành</span>
                                    <span>{goalProgress.pct}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div
                                        className="bg-emerald-500 h-2 rounded-full transition-all"
                                        style={{ width: `${goalProgress.pct}%` }}
                                    />
                                </div>
                            </div>
                        )}
                        <div className="space-y-1 max-h-[160px] overflow-y-auto">
                            {goals.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-2">Chưa có mục tiêu</p>
                            ) : (
                                goals.slice(0, 5).map(goal => (
                                    <div key={goal.goalId} className="flex items-center gap-2 text-sm">
                                        <i className={`fa-solid ${goal.isCompleted ? 'fa-check-circle text-emerald-500' : 'fa-circle text-gray-300'} text-xs`} />
                                        <span className={goal.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}>
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
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <i className="fa-solid fa-users text-purple-500 text-sm" />
                            Thành viên ({members.length})
                        </h3>
                        <Link
                            to={`/app/projects/${projectId}?tab=team`}
                            className="text-xs text-indigo-500 hover:text-indigo-700"
                        >
                            Quản lý
                        </Link>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {members.map(member => (
                            <div key={member.userId} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                                    {(member.fullName || member.username || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{member.fullName || member.username}</p>
                                    <p className="text-[10px] text-gray-400 truncate">{member.email || member.role}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                        <i className="fa-solid fa-clock-rotate-left text-indigo-500 text-sm" />
                        Hoạt động gần đây
                    </h3>
                    {activities.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">Chưa có hoạt động nào</p>
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
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rank <= 3 ? rankColors[rank] : 'text-gray-400'}`}>
                {rank <= 3 ? (
                    <i className={`fa-solid ${rankIcons[rank]}`} />
                ) : (
                    rank
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                    {perf.employeeName || perf.userName || '?'}
                </p>
                <p className="text-[10px] text-gray-400">
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
        CREATED: { icon: 'fa-plus', bg: 'bg-green-100', text: 'text-green-600' },
        STATUS_CHANGED: { icon: 'fa-arrow-right-arrow-left', bg: 'bg-blue-100', text: 'text-blue-600' },
        ASSIGNEE_CHANGED: { icon: 'fa-user-pen', bg: 'bg-purple-100', text: 'text-purple-600' },
        COMMENT_ADDED: { icon: 'fa-comment', bg: 'bg-indigo-100', text: 'text-indigo-600' },
    };
    const style = icons[act.activityType] || { icon: 'fa-circle', bg: 'bg-gray-100', text: 'text-gray-500' };

    return (
        <div className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
            <div className={`w-7 h-7 rounded-full ${style.bg} ${style.text} flex items-center justify-center shrink-0 mt-0.5`}>
                <i className={`fa-solid ${style.icon} text-[10px]`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">
                    <span className="font-semibold">{act.userName || 'Người dùng'}</span>
                    {act.description || ' đã thực hiện thay đổi'}
                    {act.issueTitle && (
                        <> trong <span className="text-indigo-600">'{act.issueTitle}'</span></>
                    )}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(act.createdAt)}</p>
            </div>
        </div>
    );
}
