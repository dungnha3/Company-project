import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import BurndownChart from '../components/BurndownChart';
import { formatDate } from '@shared/utils/formatters';
import { smartApi } from '@shared/api/featureApi';

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

    // Fetch activities
    const { data: activities = [] } = useQuery({
        queryKey: ['project-activities', projectId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.ACTIVITIES.BY_PROJECT(projectId));
            const data = res?.data;
            const arr = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []);
            return arr.slice(0, 10);
        },
        staleTime: 30 * 1000,
    });

    // Fetch proactive AI insights
    const { data: aiInsightData } = useQuery({
        queryKey: ['project-proactive-insight', projectId],
        queryFn: () => smartApi.getInsights(projectId),
        staleTime: 5 * 60 * 1000,
        enabled: !!projectId,
    });

    // Fetch team performance
    const { data: teamPerf = [] } = useQuery({
        queryKey: ['performance', 'comparison', projectId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PERFORMANCE.COMPARISON_BY_PROJECT(projectId));
            return res.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    // Active sprint
    const activeSprint = useMemo(() => {
        return sprints.find(s => s.status === 'ACTIVE') || sprints.find(s => s.status === 'PLANNING') || null;
    }, [sprints]);

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
            {/* Header - Clean white card */}
            <div className="flex items-center justify-between px-6 py-5 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Tổng quan dự án</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {project?.name || 'Dự án'} • {project?.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngưng'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <span className="px-4 py-2 bg-gray-50 text-gray-700 text-sm font-medium rounded-lg flex items-center gap-2">
                        <i className="fa-solid fa-list-check text-blue-500 text-xs" />
                        Tổng công việc: <strong className="text-gray-900">{issueStats.total}</strong>
                    </span>
                    <span className="px-4 py-2 bg-gray-50 text-gray-700 text-sm font-medium rounded-lg flex items-center gap-2">
                        <i className="fa-solid fa-users text-orange-500 text-xs" />
                        Thành viên: <strong className="text-gray-900">{members.length}</strong>
                    </span>
                </div>
            </div>

            {/* Proactive AI Insight Banner */}
            {aiInsightData?.insight && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200/60 rounded-xl p-4 flex items-start justify-between gap-3 shadow-sm animate-fade-in">
                    <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                            <i className="fa-solid fa-sparkles text-sm animate-pulse" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Trợ lý AI Gợi ý</h4>
                            <p className="text-xs font-semibold text-amber-950 mt-1 leading-relaxed">{aiInsightData.insight}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chatbot'))}
                        className="shrink-0 self-center text-[10px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm border border-amber-300/40"
                    >
                        <i className="fa-solid fa-comments text-[9px]" /> Chat ngay
                    </button>
                </div>
            )}

            {/* Quick Stats - Clean minimal cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricBox title="Tổng công việc" value={issueStats.total} subtitle="trong dự án" color="blue" icon="fa-list-check" />
                <MetricBox title="Hoàn thành" value={issueStats.done} subtitle={`${issueStats.total > 0 ? Math.round((issueStats.done / issueStats.total) * 100) : 0}% tiến độ`} color="green" icon="fa-check-circle" />
                <MetricBox title="Đang làm" value={issueStats.inProgress} subtitle="issues" color="orange" icon="fa-spinner" />
                <MetricBox title="Thành viên" value={members.length} subtitle="trong team" color="purple" icon="fa-users" />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Sprint/Burndown & Recent Activity */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Active Sprint Card */}
                    {activeSprint ? (
                        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                        <i className="fa-solid fa-layer-group text-gray-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{activeSprint.name}</h3>
                                        <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded ${activeSprint.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {activeSprint.status === 'ACTIVE' ? 'ĐANG CHẠY' : 'PLANNING'}
                                        </span>
                                    </div>
                                </div>
                                <Link to={`/app/projects/${projectId}?tab=sprints`} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                                    Quản lý Sprint →
                                </Link>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                {activeSprint.startDate && activeSprint.endDate && (
                                    <>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="text-[10px] font-medium text-gray-500 uppercase">Bắt đầu</p>
                                            <p className="font-semibold text-gray-900 mt-1">{formatDate(activeSprint.startDate)}</p>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="text-[10px] font-medium text-gray-500 uppercase">Kết thúc</p>
                                            <p className="font-semibold text-gray-900 mt-1">{formatDate(activeSprint.endDate)}</p>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="text-[10px] font-medium text-gray-500 uppercase">Còn lại</p>
                                            <p className="font-semibold text-gray-900 mt-1">
                                                {Math.max(0, Math.ceil((new Date(activeSprint.endDate) - new Date()) / (1000 * 60 * 60 * 24)))} ngày
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                            {/* Burndown Chart */}
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-semibold text-gray-900 mb-3 text-sm">BURNDOWN CHART</h4>
                                <BurndownChart sprintId={activeSprint.sprintId || activeSprint.sprint_id} projectId={projectId} />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center shadow-sm">
                            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                                <i className="fa-solid fa-layer-group text-3xl text-gray-400" />
                            </div>
                            <p className="font-semibold text-gray-700">Chưa có sprint nào</p>
                            <Link to={`/app/projects/${projectId}?tab=sprints`} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-2 inline-block">
                                Tạo Sprint mới →
                            </Link>
                        </div>
                    )}

                    {/* Recent Activity */}
                    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                            <i className="fa-solid fa-clock-rotate-left text-gray-400 text-sm" />
                            Hoạt động gần đây
                        </h3>
                        {activities.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">Chưa có hoạt động nào</p>
                        ) : (
                            <div className="space-y-2 max-h-[220px] overflow-y-auto">
                                {activities.map(act => (
                                    <ActivityRow key={act.activityId || act.id} act={act} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Top Performers & Team Members */}
                <div className="space-y-6">
                    {/* Top Performers */}
                    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <i className="fa-solid fa-trophy text-amber-500 text-sm" />
                                Xếp hạng Nhân viên xuất sắc
                            </h3>
                            <Link to={`/app/projects/${projectId}?tab=performance`} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                                Xem tất cả →
                            </Link>
                        </div>
                        {teamPerf.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">Chưa có dữ liệu hiệu suất</p>
                        ) : (
                            <div className="space-y-2">
                                {teamPerf.slice(0, 5).map((perf, i) => (
                                    <TopPerformerRow key={perf.userId || perf.employeeId || i} perf={perf} rank={i + 1} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Team Members */}
                    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <i className="fa-solid fa-users text-gray-400 text-sm" />
                                Thành viên ({members.length})
                            </h3>
                            <Link to={`/app/projects/${projectId}?tab=team`} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                                Quản lý →
                            </Link>
                        </div>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {members.map(member => (
                                <div key={member.userId} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-semibold text-sm">
                                        {(member.fullName || member.username || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{member.fullName || member.username}</p>
                                        <p className="text-[10px] text-gray-500 truncate">{member.email || member.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sprint Goals */}
                    <SprintGoalsCard activeSprint={activeSprint} />
                </div>
            </div>
        </div>
    );
}

function SprintGoalsCard({ activeSprint }) {
    const goals = useMemo(() => {
        if (!activeSprint?.goal) return [];
        return activeSprint.goal
            .split(/\n|;/)
            .map(g => g.trim())
            .filter(g => g.length > 0)
            .map(g => g.replace(/^[-\d.*)\s]+/, '').trim())
            .filter(g => g.length > 0);
    }, [activeSprint?.goal]);

    const [checkedItems, setCheckedItems] = useState({});

    useEffect(() => {
        if (!activeSprint?.sprintId) return;
        const saved = localStorage.getItem(`sprint-goals-checked-${activeSprint.sprintId}`);
        if (saved) {
            try {
                setCheckedItems(JSON.parse(saved));
            } catch (e) {
                setCheckedItems({});
            }
        } else {
            setCheckedItems({});
        }
    }, [activeSprint?.sprintId]);

    const toggleItem = (index) => {
        const next = { ...checkedItems, [index]: !checkedItems[index] };
        setCheckedItems(next);
        if (activeSprint?.sprintId) {
            localStorage.setItem(`sprint-goals-checked-${activeSprint.sprintId}`, JSON.stringify(next));
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <i className="fa-solid fa-bullseye text-indigo-500 text-sm" />
                    Mục tiêu của Sprint
                </h3>
                {activeSprint && (
                    <span className="text-[10px] font-medium bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">
                        {activeSprint.name}
                    </span>
                )}
            </div>
            {goals.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                    <i className="fa-solid fa-circle-info text-gray-300 text-lg mb-1 block" />
                    Chưa có mục tiêu cho Sprint này
                </div>
            ) : (
                <div className="space-y-2">
                    {goals.map((goal, idx) => {
                        const isChecked = !!checkedItems[idx];
                        return (
                            <div
                                key={idx}
                                onClick={() => toggleItem(idx)}
                                className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-all border ${isChecked
                                    ? 'bg-emerald-50/40 border-emerald-100/50 text-gray-400'
                                    : 'bg-gray-50/50 border-gray-100 text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <button className="mt-0.5 focus:outline-none flex-shrink-0">
                                    {isChecked ? (
                                        <i className="fa-solid fa-circle-check text-emerald-500 text-base" />
                                    ) : (
                                        <i className="fa-regular fa-circle text-gray-400 hover:text-indigo-500 text-base" />
                                    )}
                                </button>
                                <span className={`text-sm font-medium ${isChecked ? 'line-through' : ''}`}>
                                    {goal}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function TopPerformerRow({ perf, rank }) {
    const rankColors = { 1: 'text-amber-500', 2: 'text-gray-400', 3: 'text-orange-400' };
    const rankIcons = { 1: 'fa-trophy', 2: 'fa-medal', 3: 'fa-award' };
    const score = Number(perf.totalPerformanceScore || perf.performance || 0);
    const scoreColor = score >= 9 ? 'text-green-600' : score >= 8 ? 'text-gray-700' : score >= 6.5 ? 'text-gray-600' : 'text-red-600';

    return (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${rank <= 3 ? rankColors[rank] : 'text-gray-400'}`}>
                {rank <= 3 ? (
                    <i className={`fa-solid ${rankIcons[rank]}`} />
                ) : rank}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                    {perf.employeeName || perf.userName || '?'}
                </p>
                <p className="text-[10px] text-gray-500">
                    {perf.completedTasks || 0} tasks
                </p>
            </div>
            <div className="text-right">
                <p className={`text-sm font-semibold ${scoreColor}`}>
                    {score === 0 ? '—' : score.toFixed(1)}
                </p>
            </div>
        </div>
    );
}

function ActivityRow({ act }) {
    const icons = {
        CREATED: { icon: 'fa-plus', bg: 'bg-green-50', text: 'text-green-600' },
        STATUS_CHANGED: { icon: 'fa-arrow-right-arrow-left', bg: 'bg-blue-50', text: 'text-blue-600' },
        ASSIGNEE_CHANGED: { icon: 'fa-user-pen', bg: 'bg-purple-50', text: 'text-purple-600' },
        COMMENT_ADDED: { icon: 'fa-comment', bg: 'bg-indigo-50', text: 'text-indigo-600' },
    };
    const style = icons[act.activityType] || { icon: 'fa-circle', bg: 'bg-gray-50', text: 'text-gray-500' };

    return (
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <div className={`w-7 h-7 rounded-full ${style.bg} ${style.text} flex items-center justify-center shrink-0 text-[10px]`}>
                <i className={`fa-solid ${style.icon}`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                    {act.description || 'Đã thực hiện thay đổi'}
                    {act.issueTitle && (
                        <> trong <span className="text-indigo-600">'{act.issueTitle}'</span></>
                    )}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(act.createdAt)}</p>
            </div>
        </div>
    );
}

function MetricBox({ title, value, subtitle, color, icon }) {
    const colorMap = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-500', border: 'border-blue-100' },
        green: { bg: 'bg-green-50', text: 'text-green-500', border: 'border-green-100' },
        orange: { bg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-100' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-500', border: 'border-purple-100' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-500', border: 'border-amber-100' },
    };
    const c = colorMap[color] || colorMap.blue;

    return (
        <div className={`bg-white rounded-xl p-5 border ${c.border} shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                    <i className={`fa-solid ${icon} ${c.text} text-lg`} />
                </div>
                <div>
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>
                </div>
            </div>
            <p className="text-3xl font-semibold text-gray-900">{value}</p>
        </div>
    );
}
