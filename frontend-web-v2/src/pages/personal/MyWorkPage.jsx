import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useAuthStore } from '@shared/stores/authStore';
import { formatDate, formatNumber } from '@shared/utils/formatters';
import { useTimerStore, calculateWorkingSeconds } from '@shared/stores/timerStore';

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
            const res = await apiClient.get(ENDPOINTS.TIMELOGS.MY_SUMMARY);
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

    // Issues to show: in progress + upcoming due (not just today)
    const todaysIssues = useMemo(() => {
        return myIssues
            .filter(issue => {
                const status = (issue.status || '').toLowerCase();
                const isActive = status.includes('progress') || status.includes('review');
                const isUpcoming = issue.dueDate && issue.dueDate.split('T')[0] >= TODAY_STR;
                return isActive || isUpcoming;
            })
            .sort((a, b) => {
                // In Progress first, then by dueDate
                const aStatus = (a.status || '').toLowerCase();
                const bStatus = (b.status || '').toLowerCase();
                const aActive = aStatus.includes('progress') ? 0 : 1;
                const bActive = bStatus.includes('progress') ? 0 : 1;
                if (aActive !== bActive) return aActive - bActive;
                return (a.dueDate || '').localeCompare(b.dueDate || '');
            })
            .slice(0, 8);
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
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header Banner - Clean white card */}
            <div className="flex items-center justify-between px-6 py-5 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-lg font-semibold text-gray-600">
                        {(user?.username || user?.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">
                            {greeting()}, {user?.username || 'there'}!
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {TODAY.toLocaleDateString('vi-VN', {
                                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                            })}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link
                        to="/app/me/calendar"
                        className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-600 transition-colors flex items-center gap-2"
                    >
                        <i className="fa-solid fa-calendar text-gray-400" />
                        Lịch
                    </Link>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricBox title="Đến hạn hôm nay" value={todayMetrics.dueToday} subtitle="tasks" icon="fa-clock" iconColor="text-gray-500" />
                <MetricBox title="Đã hoàn thành" value={todayMetrics.doneToday} subtitle="hôm nay" icon="fa-check-circle" iconColor="text-gray-500" />
                <MetricBox title="Tasks đang làm" value={myIssues.filter(i => (i.status || '').toLowerCase().includes('progress')).length} subtitle="tasks" icon="fa-spinner" iconColor="text-gray-500" />
                <MetricBox title="Giờ làm hôm nay" value={todayMetrics.hoursToday.toFixed(1)} subtitle="giờ" icon="fa-hourglass-half" iconColor="text-gray-500" />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-5">
                    {/* My Issues Today - Clean white card */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                <i className="fa-solid fa-list-check text-gray-400" />
                                Công việc đang thực hiện
                            </h3>
                            <Link to="/app/me/issues" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                                Xem tất cả →
                            </Link>
                        </div>
                        <div className="p-5">
                            {todaysIssues.length === 0 ? (
                                <div className="text-center py-8">
                                    <i className="fa-solid fa-check-circle text-3xl text-gray-300 mb-2" />
                                    <p className="font-medium text-gray-600">Không có công việc nào đến hạn hôm nay</p>
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

                    {/* Timelogs Today - Clean white card */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                <i className="fa-solid fa-clock text-gray-400" />
                                Nhật ký làm việc hôm nay
                            </h3>
                            <span className="text-xs text-gray-400">Tự động</span>
                        </div>
                        <div className="p-5">
                            {todayTimelogs.length === 0 ? (
                                <div className="text-center py-8">
                                    <i className="fa-solid fa-clock-rotate-left text-2xl text-gray-300 mb-2" />
                                    <p className="font-medium text-gray-500 text-sm">Chưa có nhật ký nào hôm nay</p>
                                    <p className="text-xs text-gray-400 mt-1">Nhật ký được tự động ghi khi hoàn thành task</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {todayTimelogs.slice(0, 5).map(log => (
                                        <TimeLogRow key={log.logId} log={log} />
                                    ))}
                                    {todayTimelogs.length > 5 && (
                                        <p className="text-center text-sm text-gray-400 py-2">+{todayTimelogs.length - 5} entries khác</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-5">
                    {/* My Performance - Clean white card */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                <i className="fa-solid fa-chart-line text-gray-400" />
                                Hiệu suất của tôi
                            </h3>
                            <Link to="/app/me/performance" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                                Chi tiết →
                            </Link>
                        </div>
                        <div className="p-5">
                            {perfScores ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <ScoreBox label="Hiệu suất" value={perfScores.performance} />
                                        <ScoreBox label="Tốc độ" value={perfScores.speed} />
                                        <ScoreBox label="Chất lượng" value={perfScores.quality} />
                                        <ScoreBox label="Khối lượng" value={perfScores.volume} />
                                    </div>
                                    {perfStats?.completedTasks !== undefined && (
                                        <div className="pt-3 border-t border-gray-100 flex justify-between text-sm text-gray-500">
                                            <span>Tasks hoàn thành: <strong className="text-gray-900">{perfStats.completedTasks || 0}</strong></span>
                                            <span>Quá hạn: <strong className={perfStats.overdueTasks > 0 ? 'text-red-600' : 'text-gray-900'}>{perfStats.overdueTasks || 0}</strong></span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="fa-solid fa-chart-simple text-2xl text-gray-300 mb-2" />
                                    <p className="text-sm text-gray-500 font-medium">Chưa có dữ liệu hiệu suất</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* My Projects - Clean white card */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                <i className="fa-solid fa-folder text-gray-400" />
                                Dự án của tôi
                            </h3>
                            <Link to="/app/projects" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
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

function MetricBox({ title, value, subtitle, icon, iconColor = 'text-gray-500' }) {
    return (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                    <i className={`fa-solid ${icon} ${iconColor}`} />
                </div>
                <div>
                    <p className="text-[10px] font-medium text-black uppercase tracking-wider">{title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>
                </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
    );
}

function IssueRow({ issue }) {
    const priorityColors = {
        CRITICAL: 'bg-red-50 text-red-700',
        HIGH: 'bg-amber-50 text-amber-700',
        MEDIUM: 'bg-gray-100 text-gray-600',
        LOW: 'bg-gray-100 text-gray-500',
    };

    const { isRunning, issueId: runningIssueId, elapsedSeconds } = useTimerStore();
    const isRunningThis = isRunning && String(runningIssueId) === String(issue.issueId);
    
    let actual = Number(issue.loggedHours ?? issue.actualHours ?? 0);
    if (isRunningThis) {
        actual += elapsedSeconds / 3600;
    } else if (issue.statusName === 'In Progress' && issue.inProgressAt) {
        const inProgressMs = new Date(issue.inProgressAt).getTime();
        actual += calculateWorkingSeconds(inProgressMs, Date.now()) / 3600;
    }

    return (
        <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-500">{issue.issueKey}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${priorityColors[issue.priority] || priorityColors.LOW}`}>
                        {issue.priority}
                    </span>
                    {issue.isOverdue && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-medium">Quá hạn</span>
                    )}
                </div>
                <p className="text-sm font-medium text-gray-800 truncate">{issue.title}</p>
                {issue.projectName && (
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                        <i className="fa-solid fa-folder text-[8px] mr-1" />
                        {issue.projectName}
                    </p>
                )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                    <i className="fa-solid fa-clock text-[10px] mr-1 text-teal-500" />
                    {actual.toFixed(1)}h
                </span>
            </div>
        </div>
    );
}

function TimeLogRow({ log }) {
    return (
        <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 shrink-0">
                {log.issueKey?.split('-')[1] || '?'}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                    {log.issueTitle || log.issue?.title || 'No title'}
                </p>
                {log.projectName && (
                    <p className="text-[10px] text-gray-400 truncate">{log.projectName}</p>
                )}
            </div>
            <div className="text-right shrink-0">
                <span className="text-base font-medium text-gray-900">
                    {formatNumber(log.loggedHours, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                </span>
            </div>
        </div>
    );
}

function ScoreBox({ label, value }) {
    const score = Number(value) || 0;
    return (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1">{label}</p>
            <p className="text-xl font-semibold text-gray-900">{score.toFixed(1)}</p>
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
                <i className="fa-solid fa-folder-open text-2xl text-gray-300 mb-2" />
                <p className="text-sm text-gray-500 font-medium">Chưa có dự án nào</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {projects.slice(0, 5).map(project => (
                <Link
                    key={project.projectId || project.id}
                    to={`/app/projects/${project.projectId || project.id}`}
                    className="flex items-center gap-3 p-2 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 shrink-0">
                        {(project.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate group-hover:text-indigo-600">
                            {project.name}
                        </p>
                        <p className="text-[10px] text-gray-400">{project.keyProject || project.status}</p>
                    </div>
                    <i className="fa-solid fa-chevron-right text-[10px] text-gray-400" />
                </Link>
            ))}
            {projects.length > 5 && (
                <Link to="/app/projects" className="block text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium py-2">
                    +{projects.length - 5} dự án khác
                </Link>
            )}
        </div>
    );
}
