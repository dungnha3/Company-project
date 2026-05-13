import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useAuthStore } from '@shared/stores/authStore';
import MetricCard from '@shared/components/MetricCard';
import PerformanceWidget from '@shared/components/PerformanceWidget';
import TimelogWidget from '@shared/components/TimelogWidget';
import { formatDate, formatNumber } from '@shared/utils/formatters';

const TODAY = new Date();
const TODAY_STR = TODAY.toISOString().split('T')[0];

export default function MyWorkPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // Fetch my issues
    const { data: myIssues = [], isLoading: loadingIssues } = useQuery({
        queryKey: ['issues', 'my'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.ISSUES.MY_ISSUES);
            return Array.isArray(res.data) ? res.data : (res.data?.content || []);
        },
        staleTime: 30 * 1000,
    });

    // Fetch timelog summary
    const { data: timelogSummary, isLoading: loadingTimelogs } = useQuery({
        queryKey: ['timelogs', 'summary', 'my'],
        queryFn: async () => {
            const res = await apiClient.get('/api/timelogs/summary/my');
            return res.data;
        },
        staleTime: 60 * 1000,
    });

    // Fetch my performance stats
    const { data: perfStats, isLoading: loadingPerf } = useQuery({
        queryKey: ['performance', 'my-stats'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PERFORMANCE.MY_STATS);
            return res.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    // Fetch today's timelogs
    const { data: todayTimelogs = [], isLoading: loadingTodayLogs } = useQuery({
        queryKey: ['timelogs', 'my', 'today'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.TIMELOGS.MY_LOGS, {
                params: { page: 0, size: 50 }
            });
            const data = res.data?.content || res.data || [];
            return data.filter(log => log.workDate === TODAY_STR);
        },
        staleTime: 30 * 1000,
    });

    // Today's metrics
    const todayMetrics = useMemo(() => {
        const todayIssues = myIssues.filter(issue => {
            if (!issue.dueDate) return false;
            const due = issue.dueDate.split('T')[0];
            return due === TODAY_STR;
        });
        const doneToday = todayTimelogs.length; // Proxy: issues with timelogs today
        const hoursToday = todayTimelogs.reduce((sum, log) => sum + (log.loggedHours || 0), 0);
        return {
            dueToday: todayIssues.length,
            doneToday,
            hoursToday,
        };
    }, [myIssues, todayTimelogs]);

    // Weekly hours
    const weeklyHours = timelogSummary?.totalHoursThisWeek || 0;
    const weeklyTarget = 40; // 8h/day * 5 days

    // Issues for today section
    const todaysIssues = useMemo(() => {
        return myIssues
            .filter(issue => {
                if (!issue.dueDate) return false;
                const due = issue.dueDate.split('T')[0];
                return due === TODAY_STR;
            })
            .slice(0, 5);
    }, [myIssues]);

    // Performance scores
    const perfScores = useMemo(() => {
        if (!perfStats) return null;
        return {
            performance: perfStats.totalPerformanceScore || perfStats.performance || 0,
            speed: perfStats.speedScore || perfStats.speed || 0,
            quality: perfStats.qualityScore || perfStats.quality || 0,
            volume: perfStats.volumeScore || perfStats.volume || 0,
        };
    }, [perfStats]);

    const greeting = () => {
        const hour = TODAY.getHours();
        if (hour < 12) return 'Chào buổi sáng';
        if (hour < 18) return 'Chào buổi chiều';
        return 'Chào buổi tối';
    };

    const isLoading = loadingIssues || loadingTimelogs || loadingPerf;

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
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                        {(user?.username || user?.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">
                            {greeting()}, {user?.username || 'there'}!
                        </h1>
                        <p className="text-indigo-100 text-sm mt-0.5">
                            {TODAY.toLocaleDateString('vi-VN', {
                                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                            })}
                        </p>
                    </div>
                    <div className="ml-auto flex gap-2">
                        <Link
                            to="/app/me/calendar"
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <i className="fa-solid fa-calendar" />
                            Lịch
                        </Link>
                    </div>
                </div>
            </div>



            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* My Issues Today */}
                    <SectionCard
                        title="Công việc đến hạn hôm nay"
                        icon="fa-list-check"
                        actionLabel="Xem tất cả"
                        actionTo="/app/me/issues"
                    >
                        {todaysIssues.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <i className="fa-solid fa-check-circle text-3xl mb-2" />
                                <p>Không có công việc nào đến hạn hôm nay</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {todaysIssues.map(issue => (
                                    <IssueRow key={issue.issueId} issue={issue} />
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    {/* Recent Activity / Timelogs */}
                    <SectionCard
                        title="Nhật ký làm việc hôm nay"
                        icon="fa-clock"
                        actionLabel="Xem tất cả"
                        actionTo="/app/me/timelogs"
                    >
                        {todayTimelogs.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <i className="fa-solid fa-clock-rotate-left text-3xl mb-2" />
                                <p>Chưa có nhật ký nào hôm nay</p>
                                <Link
                                    to="/app/me/timelogs"
                                    className="text-indigo-500 text-sm hover:underline mt-1 inline-block"
                                >
                                    Bắt đầu log thời gian
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {todayTimelogs.slice(0, 5).map(log => (
                                    <TimeLogRow key={log.logId} log={log} />
                                ))}
                                {todayTimelogs.length > 5 && (
                                    <Link
                                        to="/app/me/timelogs"
                                        className="block text-center text-sm text-indigo-500 hover:underline py-2"
                                    >
                                        +{todayTimelogs.length - 5} entries khác
                                    </Link>
                                )}
                            </div>
                        )}
                    </SectionCard>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* My Performance */}
                    <SectionCard
                        title="Hiệu suất của tôi"
                        icon="fa-chart-line"
                        actionLabel="Chi tiết"
                        actionTo="/app/me/performance"
                    >
                        {perfScores ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <ScoreBox label="Hiệu suất" value={perfScores.performance} color="#6366f1" />
                                    <ScoreBox label="Tốc độ" value={perfScores.speed} color="#14b8a6" />
                                    <ScoreBox label="Chất lượng" value={perfScores.quality} color="#f59e0b" />
                                    <ScoreBox label="Khối lượng" value={perfScores.volume} color="#8b5cf6" />
                                </div>
                                {perfStats?.completedTasks !== undefined && (
                                    <div className="pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                                        <span>Tasks hoàn thành: <strong className="text-gray-700">{perfStats.completedTasks || 0}</strong></span>
                                        <span>Quá hạn: <strong className={perfStats.overdueTasks > 0 ? 'text-red-600' : 'text-gray-700'}>{perfStats.overdueTasks || 0}</strong></span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-400 text-sm">
                                Chưa có dữ liệu hiệu suất
                            </div>
                        )}
                    </SectionCard>



                    {/* My Projects */}
                    <SectionCard
                        title="Dự án của tôi"
                        icon="fa-folder"
                        actionLabel="Tất cả"
                        actionTo="/app/projects"
                    >
                        <MyProjectsList />
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, icon, actionLabel, actionTo, children }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <i className={`fa-solid ${icon} text-indigo-500 text-sm`} />
                    <h3 className="font-bold text-gray-800">{title}</h3>
                </div>
                {actionLabel && actionTo && (
                    <Link
                        to={actionTo}
                        className="text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                        {actionLabel}
                        <i className="fa-solid fa-arrow-right text-[10px]" />
                    </Link>
                )}
            </div>
            <div className="p-5">
                {children}
            </div>
        </div>
    );
}

function IssueRow({ issue }) {
    const priorityColors = {
        CRITICAL: 'bg-red-100 text-red-700',
        HIGH: 'bg-orange-100 text-orange-700',
        MEDIUM: 'bg-yellow-100 text-yellow-700',
        LOW: 'bg-gray-100 text-gray-600',
    };

    return (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer group">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-indigo-600">{issue.issueKey}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${priorityColors[issue.priority] || priorityColors.LOW}`}>
                        {issue.priority}
                    </span>
                    {issue.isOverdue && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Quá hạn</span>
                    )}
                </div>
                <p className="text-sm font-medium text-gray-800 truncate">{issue.title}</p>
                {issue.projectName && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                        <i className="fa-solid fa-folder text-[10px] mr-1" />
                        {issue.projectName}
                    </p>
                )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
                {issue.estimatedHours && (
                    <span className="text-xs text-gray-500">
                        <i className="fa-solid fa-clock text-[10px] mr-1" />
                        {issue.estimatedHours}h
                    </span>
                )}
            </div>
        </div>
    );
}

function TimeLogRow({ log }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
                {log.issueKey?.split('-')[1] || '?'}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                    {log.issueTitle || log.issue?.title || 'No title'}
                </p>
                {log.projectName && (
                    <p className="text-xs text-gray-400 truncate">{log.projectName}</p>
                )}
            </div>
            <div className="text-right shrink-0">
                <span className="text-base font-bold text-indigo-600">
                    {formatNumber(log.loggedHours, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                </span>
            </div>
        </div>
    );
}

function ScoreBox({ label, value, color }) {
    const score = Number(value) || 0;
    return (
        <div className="rounded-xl border bg-gray-50 border-gray-100 p-2 text-center">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{label}</p>
            <p className="text-lg font-black" style={{ color }}>{score.toFixed(1)}</p>
        </div>
    );
}

function QuickAction({ icon, label, to, color }) {
    const colorMap = {
        indigo: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
        teal: 'bg-teal-50 text-teal-600 hover:bg-teal-100',
        amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
        purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
    };
    return (
        <Link
            to={to}
            className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl transition-colors ${colorMap[color] || colorMap.indigo}`}
        >
            <i className={`fa-solid ${icon} text-lg`} />
            <span className="text-xs font-medium">{label}</span>
        </Link>
    );
}

function MyProjectsList() {
    const { data: projects = [], isLoading } = useQuery({
        queryKey: ['projects', 'my'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.MY_PROJECTS);
            return Array.isArray(res.data) ? res.data : (res.data?.content || []);
        },
        staleTime: 2 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="space-y-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    if (projects.length === 0) {
        return <p className="text-sm text-gray-400 text-center py-4">Chưa có dự án nào</p>;
    }

    return (
        <div className="space-y-2">
            {projects.slice(0, 5).map(project => (
                <Link
                    key={project.projectId || project.id}
                    to={`/app/projects/${project.projectId || project.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
                        {(project.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate group-hover:text-indigo-600">
                            {project.name}
                        </p>
                        <p className="text-[10px] text-gray-400">{project.keyProject || project.status}</p>
                    </div>
                    <i className="fa-solid fa-chevron-right text-xs text-gray-300 group-hover:text-indigo-400" />
                </Link>
            ))}
            {projects.length > 5 && (
                <Link
                    to="/app/projects"
                    className="block text-center text-xs text-indigo-500 hover:underline py-2"
                >
                    +{projects.length - 5} dự án khác
                </Link>
            )}
        </div>
    );
}
