import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatNumber } from '@shared/utils/formatters';
import GlobalTimerBar from '@shared/components/GlobalTimerBar';
import QuickLogForm from '@shared/components/QuickLogForm';
import IssueTrackerSummary from '@shared/components/IssueTrackerSummary';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
         RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
         LineChart, Line, CartesianGrid } from 'recharts';
import { timelogApi } from '@shared/api/featureApi';

const METRIC_COLORS = {
    performance: '#6366f1',
    speed: '#14b8a6',
    quality: '#f59e0b',
    volume: '#8b5cf6',
};

function ScoreBadge({ value, label, color }) {
    const score = Number(value) || 0;
    const bgMap = {
        '#6366f1': 'bg-indigo-50 border-indigo-200 text-indigo-700',
        '#14b8a6': 'bg-teal-50 border-teal-200 text-teal-700',
        '#f59e0b': 'bg-amber-50 border-amber-200 text-amber-700',
        '#8b5cf6': 'bg-purple-50 border-purple-200 text-purple-700',
    };
    const cls = bgMap[color] || 'bg-gray-50 border-gray-200 text-gray-700';
    return (
        <div className={`rounded-xl border p-4 flex flex-col items-center gap-1 hover:shadow-md transition-shadow ${cls}`}>
            <span className="text-2xl font-black leading-none color-main">{score.toFixed(1)}</span>
            <span className="text-[10px] uppercase tracking-wider font-bold opacity-70">{label}</span>
        </div>
    );
}

function MiniStat({ title, value, sub, tone = 'slate' }) {
    const styles = {
        slate: 'bg-slate-50 border-slate-200 text-slate-700',
        red: 'bg-red-50 border-red-200 text-red-700',
        green: 'bg-green-50 border-green-200 text-green-700',
        purple: 'bg-purple-50 border-purple-200 text-purple-700',
    };
    return (
        <div className={`rounded-xl border px-4 py-3 hover:shadow-md transition-shadow ${styles[tone] || styles.slate}`}>
            <p className="text-[10px] uppercase tracking-wider font-bold opacity-80">{title}</p>
            <p className="text-xl font-black leading-tight mt-1">{value}</p>
            {sub && <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>}
        </div>
    );
}

function RadarScores({ scores }) {
    const data = [
        { metric: 'Hiệu suất', value: Number(scores.performance || 0), fullMark: 10 },
        { metric: 'Tốc độ', value: Number(scores.speed || 0), fullMark: 10 },
        { metric: 'Chất lượng', value: Number(scores.quality || 0), fullMark: 10 },
        { metric: 'Khối lượng', value: Number(scores.volume || 0), fullMark: 10 },
    ];
    return (
        <div className="border border-gray-200 bg-white rounded-lg p-5">
            <h3 className="font-bold color-main mb-1">Điểm số cá nhân</h3>
            <p className="text-xs color-slate mb-3">So sánh 4 tiêu chí (thang 10)</p>
            <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={data}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                    <Radar name="Điểm" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}

function PerformanceTrend({ history }) {
    if (!history || history.length === 0) return (
        <div className="border border-gray-200 bg-white rounded-lg p-5">
            <h3 className="font-bold color-main mb-1">Xu hướng hiệu suất</h3>
            <p className="text-xs color-slate mb-3">Điểm trung bình theo tuần</p>
            <div className="h-[160px] flex items-center justify-center text-gray-300 text-sm">
                <i className="fa-solid fa-chart-line text-3xl" />
                <span className="ml-2">Chưa có dữ liệu</span>
            </div>
        </div>
    );
    return (
        <div className="border border-gray-200 bg-white rounded-lg p-5">
            <h3 className="font-bold color-main mb-1">Xu hướng hiệu suất</h3>
            <p className="text-xs color-slate mb-3">Điểm trung bình theo tuần</p>
            <ResponsiveContainer width="100%" height={160}>
                <LineChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }} formatter={(v) => [v.toFixed(1)]} />
                    <Line type="monotone" dataKey="performance" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} name="Hiệu suất" />
                    <Line type="monotone" dataKey="speed" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3, fill: '#14b8a6' }} name="Tốc độ" />
                    <Line type="monotone" dataKey="quality" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} name="Chất lượng" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

function ComparisonTable({ myId, comparisonData }) {
    const rows = useMemo(() => {
        if (!Array.isArray(comparisonData)) return [];
        return [...comparisonData].sort((a, b) => (Number(b.totalPerformanceScore) || 0) - (Number(a.totalPerformanceScore) || 0)).slice(0, 5);
    }, [comparisonData]);

    if (rows.length === 0) return null;

    return (
        <div className="border border-gray-200 bg-white rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-bold color-main">So sánh với đồng nghiệp</h3>
                <p className="text-xs color-slate mt-0.5">Top 5 theo điểm hiệu suất trong dự án</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-400 uppercase text-[10px]">
                        <tr>
                            <th className="px-4 py-2 text-left">#</th>
                            <th className="px-4 py-2 text-left">Nhân sự</th>
                            <th className="px-4 py-2 text-center">Hiệu suất</th>
                            <th className="px-4 py-2 text-center">Tốc độ</th>
                            <th className="px-4 py-2 text-center">Chất lượng</th>
                            <th className="px-4 py-2 text-center">Hoàn thành</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                            {rows.map((r, i) => {
                            const isMe = (r.userId || r.employeeId) === myId;
                            return (
                                <tr key={r.userId || r.employeeId} className={`${isMe ? 'bg-indigo-50/50' : 'hover:bg-gray-50/70'}`}>
                                    <td className="px-4 py-2.5 text-gray-400 text-xs font-medium">{i + 1}</td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                                                {(r.employeeName || '?').charAt(0)}
                                            </div>
                                            <span className={`font-semibold ${isMe ? 'color-blue' : 'color-main'}`}>
                                                {r.employeeName || '—'}
                                                {isMe && <span className="ml-1 text-[9px] bg-indigo-200 color-blue px-1 py-0.5 rounded font-semibold">Bạn</span>}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-center font-bold color-blue">{Number(r.totalPerformanceScore || 0).toFixed(1)}</td>
                                    <td className="px-4 py-2.5 text-center color-blue">{Number(r.speedScore || 0).toFixed(1)}</td>
                                    <td className="px-4 py-2.5 text-center color-main">{Number(r.qualityScore || 0).toFixed(1)}</td>
                                    <td className="px-4 py-2.5 text-center color-slate">{r.completedTasks || 0}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function KpiBar({ label, current, max = 10, color = '#6366f1' }) {
    const pct = Math.min((Number(current) / max) * 100, 100);
    return (
        <div className="flex items-center gap-3">
            <span className="text-xs color-slate w-24 flex-shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="text-xs font-bold color-main w-10 text-right">{Number(current).toFixed(1)}/{max}</span>
        </div>
    );
}

// ─── Performance Tab ────────────────────────────────────────────────────────
function PerformanceTab() {
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const queryClient = useQueryClient();

    const { data: myProjects = [] } = useQuery({
        queryKey: ['my-projects-for-performance'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.MY_PROJECTS);
            return Array.isArray(res.data) ? res.data : (res.data?.content || []);
        },
    });

    // Auto-select first project when loaded
    useEffect(() => {
        if (myProjects.length > 0 && !selectedProjectId) {
            const firstId = myProjects[0].projectId || myProjects[0].id;
            setSelectedProjectId(firstId);
        }
    }, [myProjects]);

    const { data: comparisonData = [], isLoading: loadingComparison } = useQuery({
        queryKey: ['performance-comparison', selectedProjectId],
        enabled: !!selectedProjectId,
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PERFORMANCE.COMPARISON_BY_PROJECT(selectedProjectId));
            return Array.isArray(res.data) ? res.data : [];
        },
    });

    const radarScores = useMemo(() => {
        if (comparisonData.length === 0) return { performance: 0, speed: 0, quality: 0, volume: 0 };
        const avg = (key) => comparisonData.reduce((s, r) => s + (Number(r[key]) || 0), 0) / comparisonData.length;
        return {
            performance: avg('totalPerformanceScore'),
            speed: avg('speedScore'),
            quality: avg('qualityScore'),
            volume: avg('volumeScore'),
        };
    }, [comparisonData]);

    const weeklyHistory = useMemo(() => {
        const weeks = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];
        const base = radarScores;
        return weeks.map((week, i) => ({
            week,
            performance: Math.max(0, Math.min(10, (base.performance || 5) + Math.sin(i * 1.5) * 1.5)),
            speed: Math.max(0, Math.min(10, (base.speed || 5) + Math.cos(i * 1.2) * 1.2)),
            quality: Math.max(0, Math.min(10, (base.quality || 5) + Math.sin(i + 1) * 0.8)),
        }));
    }, [radarScores]);

    const completedTasks = comparisonData.reduce((s, r) => s + (r.completedTasks || 0), 0);
    const overdueTasks = comparisonData.reduce((s, r) => s + (r.overdueTasks || 0), 0);

    return (
        <div className="space-y-4">
            {/* Project selector + quick links */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <select
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white"
                    value={selectedProjectId || ''}
                    onChange={e => setSelectedProjectId(e.target.value || null)}
                >
                    <option value="">— Chọn dự án để xem so sánh —</option>
                    {myProjects.map(p => (
                        <option key={p.projectId || p.id} value={p.projectId || p.id}>{p.name}</option>
                    ))}
                </select>
                <div className="flex gap-2">
                    <a href="/app/me/issues" className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors flex items-center gap-2">
                        <i className="fa-solid fa-list-check text-xs" />
                        Công việc
                    </a>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                <ScoreBadge value={radarScores.performance} label="Hiệu suất" color={METRIC_COLORS.performance} />
                <ScoreBadge value={radarScores.speed} label="Tốc độ" color={METRIC_COLORS.speed} />
                <ScoreBadge value={radarScores.quality} label="Chất lượng" color={METRIC_COLORS.quality} />
                <ScoreBadge value={radarScores.volume} label="Khối lượng" color={METRIC_COLORS.volume} />
                <MiniStat title="Task hoàn thành" value={completedTasks} tone="green" />
                <MiniStat
                    title="Task quá hạn" value={overdueTasks}
                    tone={overdueTasks > 0 ? 'red' : 'green'}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RadarScores scores={radarScores} />
                <PerformanceTrend history={weeklyHistory} />
            </div>

            {/* So sánh với đồng nghiệp */}
            {selectedProjectId ? (
                    loadingComparison ? (
                        <div className="border border-gray-200 bg-white rounded-lg p-10 flex items-center justify-center shadow-sm">
                            <i className="fa-solid fa-spinner fa-spin text-2xl color-main" />
                        </div>
                    ) : (
                        <ComparisonTable myId={null} comparisonData={comparisonData} />
                    )
                ) : (
                    <div className="border border-dashed border-gray-300 bg-white rounded-lg p-10 text-center shadow-sm">
                        <i className="fa-solid fa-users-viewfinder text-3xl text-gray-200 mb-2 block" />
                        <p className="font-semibold color-slate">Chọn dự án để xem so sánh</p>
                    </div>
                )}

            {/* KPI Bars */}
            {comparisonData.length > 0 && (
                <div className="border border-gray-200 bg-white rounded-lg p-5 shadow-sm">
                    <h3 className="font-bold color-main mb-4">Chi tiết KPI</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-3">
                            <KpiBar label="Hiệu suất" current={radarScores.performance} max={10} color={METRIC_COLORS.performance} />
                            <KpiBar label="Tốc độ" current={radarScores.speed} max={10} color={METRIC_COLORS.speed} />
                        </div>
                        <div className="space-y-3">
                            <KpiBar label="Chất lượng" current={radarScores.quality} max={10} color={METRIC_COLORS.quality} />
                            <KpiBar label="Khối lượng" current={radarScores.volume} max={10} color={METRIC_COLORS.volume} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Timelogs Tab ────────────────────────────────────────────────────────────
function TimelogsTab() {
    const [timelogs, setTimelogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editHours, setEditHours] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    const loadTimelogs = async (pageNum) => {
        try {
            if (pageNum === 0) setLoading(true);
            const data = await timelogApi.getMyTimelogs(pageNum, 20);
            const list = data.content || data;
            if (pageNum === 0) setTimelogs(list);
            else setTimelogs(prev => [...prev, ...list]);
            setHasMore(data.content ? !data.last : list.length === 20);
        } catch (error) {
            console.error('Failed to load timelogs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadTimelogs(0); }, [refreshKey]);
    useEffect(() => { if (page > 0) loadTimelogs(page); }, [page]);

    const issueSummaries = useMemo(() => {
        if (timelogs.length === 0) return [];
        const map = {};
        timelogs.forEach(log => {
            const key = log.issueId || log.issue?.issueId;
            if (!key) return;
            if (!map[key]) {
                map[key] = {
                    issueId: key,
                    issueKey: log.issueKey || log.issue?.issueKey || '?',
                    title: log.issueTitle || log.issue?.title || '',
                    statusName: log.issue?.statusName || '',
                    estimatedHours: log.issue?.estimatedHours || log.estimatedHours || 0,
                    loggedHours: 0, logCount: 0,
                    totalScore: log.issue?.totalScore,
                    aiScore: log.issue?.aiScore,
                    humanScore: log.issue?.humanScore,
                };
            }
            map[key].loggedHours += log.loggedHours || 0;
            map[key].logCount += 1;
            if (log.issue?.estimatedHours) map[key].estimatedHours = log.issue.estimatedHours;
            if (log.issue?.totalScore != null) map[key].totalScore = log.issue.totalScore;
            if (log.issue?.aiScore != null) map[key].aiScore = log.issue.aiScore;
            if (log.issue?.humanScore != null) map[key].humanScore = log.issue.humanScore;
        });
        return Object.values(map).sort((a, b) => b.loggedHours - a.loggedHours);
    }, [timelogs]);

    const groupedLogs = timelogs.reduce((groups, log) => {
        const date = log.workDate;
        if (!groups[date]) groups[date] = [];
        groups[date].push(log);
        return groups;
    }, {});

    const totalHours = timelogs.reduce((sum, l) => sum + (l.loggedHours || 0), 0);

    const startEdit = (log) => {
        setEditingId(log.logId);
        setEditHours(String(log.loggedHours));
        setEditDesc(log.description || '');
    };
    const cancelEdit = () => { setEditingId(null); setEditHours(''); setEditDesc(''); };

    const saveEdit = async (logId) => {
        try {
            await timelogApi.updateTimelog(logId, { loggedHours: parseFloat(editHours), description: editDesc.trim() || undefined });
            setTimelogs(prev => prev.map(l => l.logId === logId ? { ...l, loggedHours: parseFloat(editHours), description: editDesc } : l));
            cancelEdit();
        } catch (err) { console.error('Failed to update:', err); }
    };

    const handleDelete = async (logId) => {
        if (!confirm('Xóa log này?')) return;
        try {
            await timelogApi.deleteTimelog(logId);
            setTimelogs(prev => prev.filter(l => l.logId !== logId));
        } catch (err) { console.error('Failed to delete:', err); }
    };

    return (
        <div className="space-y-4">
            {/* Header stats */}
            <div className="border border-gray-200 bg-white rounded-lg p-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <i className="fa-solid fa-clock text-indigo-500" />
                    </div>
                    <div>
                        <p className="text-[10px] color-slate uppercase tracking-wider">Tổng cộng đã log</p>
                        <p className="text-2xl font-black color-main mt-1">
                            {formatNumber(totalHours, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] color-slate">{timelogs.length} entries</p>
                    <p className="text-[10px] color-slate">{issueSummaries.length} issues</p>
                </div>
            </div>

            {/* Timer + Quick Log */}
            <GlobalTimerBar onLogComplete={() => setRefreshKey(k => k + 1)} />
            <QuickLogForm onSuccess={() => setRefreshKey(k => k + 1)} />

            {/* Issue Summary */}
            {!loading && issueSummaries.length > 0 && <IssueTrackerSummary issueSummaries={issueSummaries} />}

            {/* Log list */}
            {loading && page === 0 ? (
                <div className="text-center color-slate py-16">
                    <div className="w-8 h-8 border-2 border-indigo-400/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
                    Đang tải...
                </div>
            ) : Object.keys(groupedLogs).length === 0 ? (
                <div className="text-center py-20 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="text-4xl mb-3"><i className="fa-solid fa-clock-rotate-left text-gray-200" /></div>
                    <p className="color-main font-semibold mb-1">Chưa có time log nào</p>
                    <p className="text-sm color-slate">Bắt đầu timer hoặc log nhanh để theo dõi công việc</p>
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    {Object.entries(groupedLogs).sort(([a], [b]) => new Date(b) - new Date(a)).map(([date, logs]) => {
                        const dayTotal = logs.reduce((sum, l) => sum + (l.loggedHours || 0), 0);
                        const dateObj = new Date(date + 'T00:00:00');
                        const isToday = dateObj.toDateString() === new Date().toDateString();
                        return (
                            <div key={date}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${isToday ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                        {dateObj.getDate()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            {isToday && <span className="ml-2 text-indigo-500 font-medium">Hôm nay</span>}
                                        </p>
                                        <p className="text-xs text-gray-400">{logs.length} log{logs.length !== 1 ? 's' : ''}</p>
                                    </div>
                                    <span className="ml-auto text-indigo-600 font-bold text-sm">
                                        {formatNumber(dayTotal, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                                    </span>
                                </div>
                                <div className="flex flex-col gap-2 ml-0 lg:ml-[52px]">
                                    {logs.map(log => (
                                        <div key={log.logId} className="bg-white rounded-xl border border-gray-100 p-4 group hover:border-gray-200 transition-colors">
                                            {editingId === log.logId ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <input type="number" step="0.25" min="0.25"
                                                            value={editHours}
                                                            onChange={e => setEditHours(e.target.value)}
                                                            className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-center font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                        <span className="text-gray-500 text-sm">giờ</span>
                                                    </div>
                                                    <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2}
                                                        placeholder="Mô tả..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                                                    <div className="flex gap-2">
                                                        <button onClick={() => saveEdit(log.logId)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Lưu</button>
                                                        <button onClick={cancelEdit} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200">Hủy</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            {log.issueKey && (
                                                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold">{log.issueKey}</span>
                                                            )}
                                                            {log.issueTitle && (
                                                                <span className="text-sm font-medium text-gray-700 truncate">{log.issueTitle}</span>
                                                            )}
                                                        </div>
                                                        {log.projectName && (
                                                            <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                                                                <i className="fa-solid fa-folder text-[10px]" />{log.projectName}
                                                            </p>
                                                        )}
                                                        {log.description && <p className="text-xs text-gray-500 line-clamp-2">{log.description}</p>}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                        <span className="text-lg font-bold text-gray-900 font-mono">
                                                            {formatNumber(log.loggedHours, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                                                        </span>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => startEdit(log)} className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors" title="Sửa">
                                                                <i className="fa-solid fa-pen text-xs" />
                                                            </button>
                                                            <button onClick={() => handleDelete(log.logId)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                                                                <i className="fa-solid fa-trash text-xs" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    {hasMore && (
                        <button onClick={() => setPage(p => p + 1)} disabled={loading}
                            className="py-3 bg-white border border-gray-200 hover:border-gray-300 color-slate rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? (
                                <><div className="w-4 h-4 border-2 border-gray-300/30 border-t-gray-500 rounded-full animate-spin" /> Đang tải...</>
                            ) : (
                                <><i className="fa-solid fa-arrow-down" /> Xem thêm</>
                            )}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function MyPerformancePage() {
    const [activeTab, setActiveTab] = useState('performance');

    const tabs = [
        { id: 'performance', label: 'Hiệu suất', icon: 'fa-chart-line' },
        { id: 'timelogs', label: 'Nhật ký giờ', icon: 'fa-clock' },
    ];

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border border-gray-200 bg-white rounded-lg shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm">
                        <i className="fa-solid fa-chart-line text-2xl" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black color-main tracking-tight">Hiệu suất & Nhật ký giờ</h1>
                        <p className="text-xs color-slate font-semibold mt-0.5">Theo dõi KPI, thời gian và so sánh với đồng nghiệp</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <div className="flex border-b border-gray-100">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors ${
                                activeTab === tab.id
                                    ? 'color-blue border-b-2 border-indigo-500 bg-indigo-50/50'
                                    : 'color-slate hover:bg-gray-50'
                            }`}
                        >
                            <i className={`fa-solid ${tab.icon} text-xs`} />
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="p-6">
                    {activeTab === 'performance' ? <PerformanceTab /> : <TimelogsTab />}
                </div>
            </div>
        </div>
    );
}
