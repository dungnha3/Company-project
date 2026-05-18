import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useAuthStore } from '@shared/stores/authStore';
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
        const doneToday = todayTimelogs.length;
        const hoursToday = todayTimelogs.reduce((sum, log) => sum + (log.loggedHours || 0), 0);
        return {
            dueToday: todayIssues.length,
            doneToday,
            hoursToday,
        };
    }, [myIssues, todayTimelogs]);

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
                <i className="fa-solid fa-spinner fa-spin text-2xl color-main" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header Banner */}
            <div className="flex items-center justify-between px-6 py-5 border border-gray-200 bg-white rounded-lg shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-lg bg-blue-50 flex items-center justify-center text-2xl font-black color-main">
                        {(user?.username || user?.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-2xl font-black color-main tracking-tight">
                            {greeting()}, {user?.username || 'there'}!
                        </h1>
                        <p className="text-xs color-slate font-semibold mt-1">
                            {TODAY.toLocaleDateString('vi-VN', {
                                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                            })}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link
                        to="/app/me/calendar"
                        className="px-4 py-2 border border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                    >
                        <i className="fa-solid fa-calendar color-main" />
                        Lịch
                    </Link>
                </div>
            </div>

            {/* Quick Stats - 4 cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricBox title="Đến hạn hôm nay" value={todayMetrics.dueToday} subtitle="tasks" color="blue" icon="fa-clock" />
                <MetricBox title="Đã hoàn thành" value={todayMetrics.doneToday} subtitle="tasks" color="green" icon="fa-check-circle" />
                <MetricBox title="Giờ làm hôm nay" value={todayMetrics.hoursToday.toFixed(1)} subtitle="giờ" color="orange" icon="fa-hourglass-half" />
                <MetricBox title="Tasks đang làm" value={myIssues.filter(i => i.status === 'IN_PROGRESS').length} subtitle="tasks" color="purple" icon="fa-spinner" />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* My Issues Today */}
                    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ backgroundColor: '#fff7ed' }}>
                            <h3 className="font-bold color-main flex items-center gap-2">
                                <i className="fa-solid fa-list-check text-orange-500" />
                                Công việc đến hạn hôm nay
                            </h3>
                            <Link to="/app/me/issues" className="text-xs color-blue font-semibold hover:underline">
                                Xem tất cả →
                            </Link>
                        </div>
                        <div className="p-5">
                            {todaysIssues.length === 0 ? (
                                <div className="text-center py-8">
                                    <i className="fa-solid fa-check-circle text-3xl text-green-300 mb-2" />
                                    <p className="font-semibold color-main">Không có công việc nào đến hạn hôm nay</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {todaysIssues.map(issue => (
                                        <IssueRow key={issue.issueId} issue={issue} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Timelogs Today */}
                    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ backgroundColor: '#eff6ff' }}>
                            <h3 className="font-bold color-main flex items-center gap-2">
                                <i className="fa-solid fa-clock text-blue-500" />
                                Nhật ký làm việc hôm nay
                            </h3>
                            <Link to="/app/me/timelogs" className="text-xs color-blue font-semibold hover:underline">
                                Xem tất cả →
                            </Link>
                        </div>
                        <div className="p-5">
                            {todayTimelogs.length === 0 ? (
                                <div className="text-center py-8">
                                    <i className="fa-solid fa-clock-rotate-left text-2xl color-slate mb-2" />
                                    <p className="font-semibold color-slate text-sm">Chưa có nhật ký nào hôm nay</p>
                                    <Link to="/app/me/timelogs" className="color-blue text-xs font-semibold hover:underline mt-1 inline-block">
                                        Bắt đầu log thời gian
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {todayTimelogs.slice(0, 5).map(log => (
                                        <TimeLogRow key={log.logId} log={log} />
                                    ))}
                                    {todayTimelogs.length > 5 && (
                                        <Link to="/app/me/timelogs" className="block text-center text-xs color-blue font-semibold hover:underline py-2">
                                            +{todayTimelogs.length - 5} entries khác
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* My Performance */}
                    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ backgroundColor: '#f5f3ff' }}>
                            <h3 className="font-bold color-main flex items-center gap-2">
                                <i className="fa-solid fa-chart-line text-purple-500" />
                                Hiệu suất của tôi
                            </h3>
                            <Link to="/app/me/performance" className="text-xs color-blue font-semibold hover:underline">
                                Chi tiết →
                            </Link>
                        </div>
                        <div className="p-5">
                            {perfScores ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <ScoreBox label="Hiệu suất" value={perfScores.performance} color="#3b82f6" />
                                        <ScoreBox label="Tốc độ" value={perfScores.speed} color="#10b981" />
                                        <ScoreBox label="Chất lượng" value={perfScores.quality} color="#f59e0b" />
                                        <ScoreBox label="Khối lượng" value={perfScores.volume} color="#8b5cf6" />
                                    </div>
                                    {perfStats?.completedTasks !== undefined && (
                                        <div className="pt-2 border-t border-gray-100 flex justify-between text-xs color-slate">
                                            <span>Tasks hoàn thành: <strong className="color-main">{perfStats.completedTasks || 0}</strong></span>
                                            <span>Quá hạn: <strong className={perfStats.overdueTasks > 0 ? 'color-red' : 'color-main'}>{perfStats.overdueTasks || 0}</strong></span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="fa-solid fa-chart-simple text-2xl color-slate mb-2" />
                                    <p className="text-sm color-slate font-semibold">Chưa có dữ liệu hiệu suất</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* My Projects */}
                    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ backgroundColor: '#fff7ed' }}>
                            <h3 className="font-bold color-main flex items-center gap-2">
                                <i className="fa-solid fa-folder text-orange-500" />
                                Dự án của tôi
                            </h3>
                            <Link to="/app/projects" className="text-xs color-blue font-semibold hover:underline">
                                Tất cả →
                            </Link>
                        </div>
                        <div className="p-5">
                            <MyProjectsList />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Sub-components ───────────────────────────────────────────────────────────

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

function IssueRow({ issue }) {
    const priorityColors = {
        CRITICAL: 'bg-red-100 text-red-600',
        HIGH: 'bg-orange-100 text-orange-600',
        MEDIUM: 'bg-yellow-100 text-yellow-700',
        LOW: 'bg-gray-100 text-gray-600',
    };

    return (
        <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all cursor-pointer">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold color-blue">{issue.issueKey}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${priorityColors[issue.priority] || priorityColors.LOW}`}>
                        {issue.priority}
                    </span>
                    {issue.isOverdue && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-bold">Quá hạn</span>
                    )}
                </div>
                <p className="text-sm font-medium color-main truncate">{issue.title}</p>
                {issue.projectName && (
                    <p className="text-[10px] color-slate mt-0.5 truncate">
                        <i className="fa-solid fa-folder text-[8px] mr-1" />
                        {issue.projectName}
                    </p>
                )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
                {issue.estimatedHours && (
                    <span className="text-xs color-slate">
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
        <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center color-blue text-xs font-bold shrink-0">
                {log.issueKey?.split('-')[1] || '?'}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium color-main truncate">
                    {log.issueTitle || log.issue?.title || 'No title'}
                </p>
                {log.projectName && (
                    <p className="text-[10px] color-slate truncate">{log.projectName}</p>
                )}
            </div>
            <div className="text-right shrink-0">
                <span className="text-base font-black color-blue">
                    {formatNumber(log.loggedHours, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                </span>
            </div>
        </div>
    );
}

function ScoreBox({ label, value, color }) {
    const score = Number(value) || 0;
    return (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider color-slate font-bold mb-1">{label}</p>
            <p className="text-xl font-black" style={{ color }}>{score.toFixed(1)}</p>
        </div>
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
                    <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="text-center py-4">
                <i className="fa-solid fa-folder-open text-2xl color-slate mb-2" />
                <p className="text-sm color-slate font-semibold">Chưa có dự án nào</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {projects.slice(0, 5).map(project => (
                <Link
                    key={project.projectId || project.id}
                    to={`/app/projects/${project.projectId || project.id}`}
                    className="flex items-center gap-3 p-2 border border-gray-100 rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all group"
                >
                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center color-orange text-xs font-bold shrink-0">
                        {(project.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold color-main truncate group-hover:color-blue">
                            {project.name}
                        </p>
                        <p className="text-[10px] color-slate">{project.keyProject || project.status}</p>
                    </div>
                    <i className="fa-solid fa-chevron-right text-[10px] color-slate group-hover:color-blue" />
                </Link>
            ))}
            {projects.length > 5 && (
                <Link to="/app/projects" className="block text-center text-xs color-blue font-semibold hover:underline py-2">
                    +{projects.length - 5} dự án khác
                </Link>
            )}
        </div>
    );
}
