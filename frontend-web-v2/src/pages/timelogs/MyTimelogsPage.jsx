import { useState, useEffect, useRef, useCallback } from 'react';
import { timelogApi, issueApi } from '../../shared/api/featureApi';
import { formatDate, formatNumber } from '@shared/utils/formatters';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { useTimerStore } from '@shared/stores/timerStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const PRIORITY_COLORS = {
    LOW: 'bg-slate-500',
    MEDIUM: 'bg-blue-500',
    HIGH: 'bg-orange-500',
    CRITICAL: 'bg-red-500',
};

const STATUS_COLORS = {
    'To Do': 'bg-slate-500',
    'In Progress': 'bg-blue-500',
    'Review': 'bg-purple-500',
    'Done': 'bg-green-500',
};

function WeeklySummary({ timelogs }) {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const lastMonday = new Date(monday);
    lastMonday.setDate(monday.getDate() - 7);

    const thisWeekHours = timelogs
        .filter(l => {
            const d = new Date(l.workDate);
            return d >= monday && d <= today;
        })
        .reduce((s, l) => s + (l.loggedHours || 0), 0);

    const lastWeekHours = timelogs
        .filter(l => {
            const d = new Date(l.workDate);
            const lastSunday = new Date(monday);
            lastSunday.setDate(monday.getDate() - 1);
            return d >= lastMonday && d < monday;
        })
        .reduce((s, l) => s + (l.loggedHours || 0), 0);

    const diff = thisWeekHours - lastWeekHours;
    const diffPercent = lastWeekHours > 0 ? Math.round((diff / lastWeekHours) * 100) : thisWeekHours > 0 ? 100 : 0;

    // Bar chart data per day this week
    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const chartData = days.map((day, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const hours = timelogs
            .filter(l => l.workDate === dateStr)
            .reduce((s, l) => s + (l.loggedHours || 0), 0);
        const isToday = i === dayOfWeek - 1 || (dayOfWeek === 0 && i === 6);
        return { day, hours: Math.round(hours * 10) / 10, isToday };
    });

    const todayHours = chartData[dayOfWeek === 0 ? 6 : dayOfWeek - 1]?.hours || 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Stats row */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl">
                    <i className="fa-solid fa-clock" />
                </div>
                <div>
                    <p className="text-slate-500 text-sm">Tuần này</p>
                    <p className="text-2xl font-bold text-slate-900">{formatNumber(thisWeekHours, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h</p>
                </div>
                {diff !== 0 && (
                    <div className={`ml-auto text-sm font-medium ${diff > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        <i className={`fa-solid fa-arrow-${diff > 0 ? 'up' : 'down'} mr-1`} />
                        {Math.abs(diffPercent)}%
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">
                    <i className="fa-solid fa-calendar-day" />
                </div>
                <div>
                    <p className="text-slate-500 text-sm">Hôm nay</p>
                    <p className="text-2xl font-bold text-slate-900">{formatNumber(todayHours, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-slate-500 text-sm mb-3">Biểu đồ tuần này</p>
                <ResponsiveContainer width="100%" height={60}>
                    <BarChart data={chartData} barSize={20} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis hide domain={[0, 'dataMax + 1']} />
                        <Tooltip
                            contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                            formatter={(v) => [`${v}h`]}
                            cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                        />
                        <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, i) => (
                                <Cell key={i} fill={entry.isToday ? '#6366f1' : '#c7d2fe'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function GlobalTimerBar({ onLogComplete }) {
    // Reads from global store — shared across all pages
    const { isRunning, issueId: storeIssueId, issueKey, issueTitle, elapsedSeconds, tick, startTimer, stopTimer, startTime } = useTimerStore();
    const [saving, setSaving] = useState(false);
    const [showIssues, setShowIssues] = useState(false);
    const [issues, setIssues] = useState([]);
    const [issuesLoading, setIssuesLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [showPanel, setShowPanel] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmData, setConfirmData] = useState(null);
    const [overrideHours, setOverrideHours] = useState('');
    const [showOverride, setShowOverride] = useState(false);
    const tickerRef = useRef(null);

    // Ticker: update elapsedSeconds every second when running
    useEffect(() => {
        if (isRunning) {
            tickerRef.current = setInterval(() => tick(), 1000);
        } else {
            if (tickerRef.current) clearInterval(tickerRef.current);
        }
        return () => { if (tickerRef.current) clearInterval(tickerRef.current); };
    }, [isRunning, tick]);

    // Listen for auto-start from ProjectBoard (drag to In Progress)
    useEffect(() => {
        const handler = (e) => {
            const { issueId, issueKey, issueTitle } = e.detail;
            startTimer({ issueId, issueKey, issueTitle });
            setShowPanel(true);
        };
        window.addEventListener('auto-start-timer', handler);
        return () => window.removeEventListener('auto-start-timer', handler);
    }, [startTimer]);

    const loadMyIssues = async () => {
        setIssuesLoading(true);
        try {
            const data = await issueApi.getMyIssues();
            setIssues(Array.isArray(data) ? data : (data.content || []));
        } finally {
            setIssuesLoading(false);
        }
    };

    const handleStop = () => {
        const { stopTimer: storeStop } = useTimerStore.getState();
        const result = storeStop();
        if (!result || result.rawSeconds < 60) return;

        const { computeDeduction } = useTimerStore.getState();
        const now = Date.now();
        const deduction = computeDeduction(result.startTime || (now - result.rawSeconds * 1000), now);
        const netSeconds = Math.max(0, result.rawSeconds - deduction);
        const netHours = netSeconds / 3600;

        setConfirmData({
            issueId: result.issueId,
            issueKey: result.issueKey,
            rawSeconds: result.rawSeconds,
            deduction,
            netSeconds,
            netHours,
        });
        setOverrideHours('');
        setShowOverride(false);
        setShowConfirm(true);
    };

    const handleConfirmLog = async () => {
        if (!confirmData) return;
        const hours = showOverride && overrideHours
            ? parseFloat(overrideHours)
            : confirmData.netHours;

        if (!hours || hours <= 0) return;

        setSaving(true);
        setShowConfirm(false);
        try {
            const breakNote = confirmData.deduction > 0
                ? ` (đã trừ ${Math.round(confirmData.deduction / 60)}m nghỉ)`
                : '';
            await timelogApi.logTime({
                issueId: confirmData.issueId,
                loggedHours: Math.max(0.25, Math.round(hours * 100) / 100),
                workDate: new Date().toISOString().split('T')[0],
                description: `Timer${breakNote}`,
            });
            setConfirmData(null);
            onLogComplete?.();
        } catch (err) {
            console.error('Failed to save timer log:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleSelectIssue = (issue) => {
        startTimer({ issueId: issue.issueId || issue.id, issueKey: issue.issueKey, issueTitle: issue.title });
        setShowIssues(false);
        setShowPanel(true);
    };

    const formatTime = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const hours = elapsedSeconds / 3600;
    const filteredIssues = issues.filter(i =>
        !search ||
        (i.issueKey || '').toLowerCase().includes(search.toLowerCase()) ||
        (i.title || '').toLowerCase().includes(search.toLowerCase())
    );

    // ── Collapsed bar (when panel is hidden) ───────────────────────────
    if (!showPanel && !isRunning) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <i className="fa-solid fa-stopwatch text-indigo-500" />
                    Timer
                </h2>
                <button
                    onClick={() => { setShowPanel(true); loadMyIssues(); }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
                >
                    <i className="fa-solid fa-play" />
                    Bắt đầu timer
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <i className="fa-solid fa-stopwatch text-indigo-500" />
                    Timer
                </h2>
                <div className="flex items-center gap-2">
                    {isRunning && (
                        <span className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                            {issueKey}
                            {issueTitle && <span className="text-slate-400 font-normal truncate max-w-[200px]">{issueTitle}</span>}
                        </span>
                    )}
                    <button
                        onClick={() => setShowPanel(p => !p)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                        title={showPanel ? 'Thu nhỏ' : 'Mở rộng'}
                    >
                        <i className={`fa-solid fa-chevron-${showPanel ? 'up' : 'down'} text-sm`} />
                    </button>
                </div>
            </div>

            {showPanel && (
                <>
                    {/* Issue selector */}
                    <div className="relative mb-5">
                        {isRunning ? null : (
                            <button
                                onClick={() => { setShowIssues(true); loadMyIssues(); }}
                                className="w-full flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors text-left"
                            >
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold shrink-0">
                                    {issueKey || '?'}
                                </span>
                                <span className="text-slate-700 truncate">{issueTitle || 'Chọn issue để log giờ...'}</span>
                                <i className="fa-solid fa-chevron-down text-slate-400 ml-auto shrink-0" />
                            </button>
                        )}

                        {showIssues && !isRunning && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl z-50 max-h-64 overflow-y-auto">
                                <div className="sticky top-0 bg-white p-2 border-b border-slate-100">
                                    <input
                                        autoFocus
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Tìm issue..."
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                {issuesLoading ? (
                                    <div className="p-4 text-center text-slate-400 text-sm">Đang tải...</div>
                                ) : filteredIssues.length === 0 ? (
                                    <div className="p-4 text-center text-slate-400 text-sm">Không tìm thấy</div>
                                ) : (
                                    filteredIssues.map(issue => (
                                        <button
                                            key={issue.id || issue.issueId}
                                            onClick={() => handleSelectIssue(issue)}
                                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                                        >
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-bold shrink-0">
                                                {issue.issueKey}
                                            </span>
                                            <span className="text-sm text-slate-700 truncate">{issue.title}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Timer display */}
                    <div className="text-center mb-5">
                        <div className={`text-6xl font-mono font-bold tracking-tight ${isRunning ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {formatTime(elapsedSeconds)}
                        </div>
                        <p className="text-slate-400 text-sm mt-1">
                            {isRunning
                                ? `${formatNumber(hours, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}h`
                                : elapsedSeconds > 0
                                    ? `${formatNumber(hours, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}h`
                                    : '00:00:00 = 0.00h'}
                        </p>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-3">
                        {!isRunning ? (
                            <>
                                <button
                                    onClick={() => {
                                        if (!issueKey) { setShowIssues(true); loadMyIssues(); return; }
                                        startTimer({ issueId: null, issueKey: issueKey, issueTitle });
                                    }}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
                                >
                                    <i className="fa-solid fa-play" />
                                    Bắt đầu
                                </button>
                                {elapsedSeconds > 0 && (
                                    <button
                                        onClick={() => { stopTimer(); }}
                                        className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold flex items-center gap-2 transition-colors"
                                    >
                                        <i className="fa-solid fa-rotate-left" />
                                        Reset
                                    </button>
                                )}
                            </>
                        ) : (
                            <button
                                onClick={handleStop}
                                disabled={saving}
                                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-60"
                            >
                                {saving ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang lưu...</>
                                ) : (
                                    <><i className="fa-solid fa-stop" /> Dừng & Log</>
                                )}
                            </button>
                        )}
                    </div>
                </>
            )}

            {/* ── Break deduction confirm modal ── */}
            {showConfirm && confirmData && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <i className="fa-solid fa-clock" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Xác nhận Log Time</h3>
                                <p className="text-sm text-slate-500">{confirmData.issueKey}</p>
                            </div>
                        </div>

                        {/* Time breakdown */}
                        <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Tổng thời gian</span>
                                <span className="font-semibold text-slate-700">
                                    {formatTime(confirmData.rawSeconds)} ({formatNumber(confirmData.rawSeconds / 3600, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}h)
                                </span>
                            </div>
                            {confirmData.deduction > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-amber-600 flex items-center gap-1">
                                        <i className="fa-solid fa-mug-hot text-xs" />
                                        Trừ nghỉ trưa
                                    </span>
                                    <span className="font-semibold text-amber-600">
                                        -{Math.round(confirmData.deduction / 60)} phút
                                    </span>
                                </div>
                            )}
                            <div className="border-t border-slate-200 pt-2 flex justify-between">
                                <span className="font-semibold text-slate-700">Sẽ log</span>
                                <span className="font-bold text-indigo-600 text-lg">
                                    {formatNumber(confirmData.netHours, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}h
                                </span>
                            </div>
                        </div>

                        {/* Override toggle */}
                        <button
                            onClick={() => setShowOverride(v => !v)}
                            className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-3 transition-colors"
                        >
                            <i className={`fa-solid fa-${showOverride ? 'check-square' : 'square'} text-xs`} />
                            Nhập số giờ khác (override)
                        </button>

                        {showOverride && (
                            <div className="mb-4">
                                <input
                                    type="number"
                                    step="0.25"
                                    min="0.25"
                                    max="24"
                                    placeholder="VD: 7.5"
                                    value={overrideHours}
                                    onChange={e => setOverrideHours(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowConfirm(false); setConfirmData(null); }}
                                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold text-sm transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleConfirmLog}
                                disabled={saving}
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang lưu...</>
                                ) : (
                                    <><i className="fa-solid fa-check" /> Xác nhận</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function QuickLogForm({ onSuccess }) {
    const [issueId, setIssueId] = useState('');
    const [hours, setHours] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [issues, setIssues] = useState([]);
    const [issuesLoading, setIssuesLoading] = useState(false);
    const [showIssueSearch, setShowIssueSearch] = useState(false);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const loadMyIssues = async () => {
        setIssuesLoading(true);
        try {
            const data = await issueApi.getMyIssues();
            setIssues(Array.isArray(data) ? data : (data.content || []));
        } finally {
            setIssuesLoading(false);
        }
    };

    const handleOpen = () => {
        setShowIssueSearch(true);
        loadMyIssues();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!issueId) { setError('Chọn issue'); return; }
        if (!hours || parseFloat(hours) <= 0) { setError('Nhập số giờ'); return; }

        setSaving(true);
        try {
            await timelogApi.logTime({
                issueId: parseInt(issueId),
                loggedHours: parseFloat(hours),
                workDate: date,
                description: description.trim() || undefined,
            });
            setIssueId('');
            setHours('');
            setDescription('');
            setShowIssueSearch(false);
            onSuccess();
        } catch (err) {
            setError('Lỗi khi lưu: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const selectedIssue = issues.find(i => String(i.id || i.issueId) === String(issueId));
    const filteredIssues = issues.filter(i =>
        !search || (i.issueKey || '').toLowerCase().includes(search.toLowerCase()) ||
        (i.title || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <i className="fa-solid fa-bolt text-amber-500" />
                    Log nhanh
                </h2>
                <button
                    onClick={handleOpen}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                    <i className="fa-solid fa-plus" />
                    Chọn issue
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Issue selector */}
                <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Issue</label>
                    <button
                        type="button"
                        onClick={handleOpen}
                        className="w-full flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors text-left bg-white"
                    >
                        {selectedIssue ? (
                            <>
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold shrink-0">
                                    {selectedIssue.issueKey}
                                </span>
                                <span className="text-slate-700 truncate">{selectedIssue.title}</span>
                            </>
                        ) : (
                            <span className="text-slate-400">Chọn issue...</span>
                        )}
                        <i className="fa-solid fa-chevron-down text-slate-400 ml-auto" />
                    </button>
                    {showIssueSearch && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl z-50 max-h-64 overflow-y-auto">
                            <div className="sticky top-0 bg-white p-2 border-b border-slate-100">
                                <input
                                    autoFocus
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Tìm issue..."
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            {issuesLoading ? (
                                <div className="p-4 text-center text-slate-400 text-sm">Đang tải...</div>
                            ) : filteredIssues.length === 0 ? (
                                <div className="p-4 text-center text-slate-400 text-sm">Không tìm thấy issue</div>
                            ) : (
                                filteredIssues.map(issue => (
                                    <button
                                        key={issue.id || issue.issueId}
                                        type="button"
                                        onClick={() => {
                                            setIssueId(issue.id || issue.issueId);
                                            setShowIssueSearch(false);
                                            setSearch('');
                                        }}
                                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                                    >
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-bold shrink-0">
                                            {issue.issueKey}
                                        </span>
                                        <span className="text-sm text-slate-700 truncate">{issue.title}</span>
                                        {issue.projectName && (
                                            <span className="text-xs text-slate-400 ml-auto truncate hidden sm:block">{issue.projectName}</span>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Số giờ</label>
                        <input
                            type="number"
                            step="0.25"
                            min="0.25"
                            max="24"
                            value={hours}
                            onChange={e => setHours(e.target.value)}
                            placeholder="0.5"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-mono text-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ngày</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú (tùy chọn)</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Mô tả công việc đã làm..."
                        rows={2}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
                    />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={saving || !issueId || !hours}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang lưu...</>
                    ) : (
                        <><i className="fa-solid fa-check" /> Lưu log</>
                    )}
                </button>
            </form>
        </div>
    );
}

export default function MyTimelogsPage() {
    const [timelogs, setTimelogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editHours, setEditHours] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    const { hasPermission } = useWorkspaceStore();
    const canLog = hasPermission('timetrackingLog');

    useEffect(() => {
        loadTimelogs(0);
    }, [refreshKey]);

    useEffect(() => {
        if (page > 0) loadTimelogs(page);
    }, [page]);

    const loadTimelogs = async (pageNum) => {
        try {
            if (pageNum === 0) setLoading(true);
            const data = await timelogApi.getMyTimelogs(pageNum, 20);
            const list = data.content || data;
            if (pageNum === 0) {
                setTimelogs(list);
            } else {
                setTimelogs(prev => [...prev, ...list]);
            }
            setHasMore(data.content ? !data.last : list.length === 20);
        } catch (error) {
            console.error('Failed to load timelogs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogComplete = () => {
        setRefreshKey(k => k + 1);
    };

    const startEdit = (log) => {
        setEditingId(log.logId);
        setEditHours(String(log.loggedHours));
        setEditDesc(log.description || '');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditHours('');
        setEditDesc('');
    };

    const saveEdit = async (logId) => {
        try {
            await timelogApi.updateTimelog(logId, {
                loggedHours: parseFloat(editHours),
                description: editDesc.trim() || undefined,
            });
            setTimelogs(prev => prev.map(l =>
                l.logId === logId ? { ...l, loggedHours: parseFloat(editHours), description: editDesc } : l
            ));
            cancelEdit();
        } catch (err) {
            console.error('Failed to update:', err);
        }
    };

    const handleDelete = async (logId) => {
        if (!confirm('Xóa log này?')) return;
        try {
            await timelogApi.deleteTimelog(logId);
            setTimelogs(prev => prev.filter(l => l.logId !== logId));
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    };

    const groupedLogs = timelogs.reduce((groups, log) => {
        const date = log.workDate;
        if (!groups[date]) groups[date] = [];
        groups[date].push(log);
        return groups;
    }, {});

    const totalHours = timelogs.reduce((sum, log) => sum + (log.loggedHours || 0), 0);

    return (
        <div className="p-4 lg:p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Nhật ký thời gian</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Theo dõi giờ làm việc của bạn</p>
                </div>
                <div className="bg-indigo-600 px-4 py-2 rounded-xl text-center">
                    <p className="text-white font-bold text-xl">{formatNumber(totalHours, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h</p>
                    <p className="text-indigo-200 text-xs">tổng cộng</p>
                </div>
            </div>

            {/* Timer (global, shared across all pages) */}
            {canLog && <GlobalTimerBar onLogComplete={handleLogComplete} />}

            {/* Quick Log */}
            {canLog && <QuickLogForm onSuccess={handleLogComplete} />}

            {/* Weekly Summary */}
            {!loading && timelogs.length > 0 && <WeeklySummary timelogs={timelogs} />}

            {/* Log list */}
            {loading && page === 0 ? (
                <div className="text-center text-slate-400 py-16">
                    <div className="w-8 h-8 border-2 border-indigo-400/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
                    Đang tải...
                </div>
            ) : Object.keys(groupedLogs).length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                    <div className="text-4xl mb-3">⏱️</div>
                    <p className="text-slate-600 font-medium mb-1">Chưa có time log nào</p>
                    <p className="text-slate-400 text-sm">Bắt đầu timer hoặc log nhanh để theo dõi công việc</p>
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    {Object.entries(groupedLogs)
                        .sort(([a], [b]) => new Date(b) - new Date(a))
                        .map(([date, logs]) => {
                            const dayTotal = logs.reduce((sum, l) => sum + (l.loggedHours || 0), 0);
                            const dateObj = new Date(date + 'T00:00:00');
                            const isToday = dateObj.toDateString() === new Date().toDateString();
                            return (
                                <div key={date}>
                                    {/* Date header */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                                            isToday ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {dateObj.getDate()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">
                                                {dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                {isToday && <span className="ml-2 text-indigo-500 font-medium">Hôm nay</span>}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {logs.length} log{logs.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <span className="ml-auto text-indigo-600 font-bold text-sm">
                                            {formatNumber(dayTotal, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                                        </span>
                                    </div>

                                    {/* Log items */}
                                    <div className="flex flex-col gap-2 ml-0 lg:ml-[52px]">
                                        {logs.map(log => (
                                            <div key={log.logId} className="bg-white rounded-xl border border-slate-200 p-4 group hover:border-slate-300 transition-colors">
                                                {editingId === log.logId ? (
                                                    // Edit mode
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                step="0.25"
                                                                min="0.25"
                                                                value={editHours}
                                                                onChange={e => setEditHours(e.target.value)}
                                                                className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-center font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                            />
                                                            <span className="text-slate-500 text-sm">giờ</span>
                                                        </div>
                                                        <textarea
                                                            value={editDesc}
                                                            onChange={e => setEditDesc(e.target.value)}
                                                            rows={2}
                                                            placeholder="Mô tả..."
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => saveEdit(log.logId)}
                                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                                                            >
                                                                Lưu
                                                            </button>
                                                            <button
                                                                onClick={cancelEdit}
                                                                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
                                                            >
                                                                Hủy
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // View mode
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                {log.issueKey && (
                                                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold">
                                                                        {log.issueKey}
                                                                    </span>
                                                                )}
                                                                {log.issueTitle && (
                                                                    <span className="text-sm font-medium text-slate-700 truncate">{log.issueTitle}</span>
                                                                )}
                                                            </div>
                                                            {log.projectName && (
                                                                <p className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                                                                    <i className="fa-solid fa-folder text-[10px]" />
                                                                    {log.projectName}
                                                                </p>
                                                            )}
                                                            {log.description && (
                                                                <p className="text-xs text-slate-500 line-clamp-2">{log.description}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                                            <span className="text-lg font-bold text-slate-900 font-mono">
                                                                {formatNumber(log.loggedHours, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                                                            </span>
                                                            {canLog && (
                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => startEdit(log)}
                                                                        className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                        title="Sửa"
                                                                    >
                                                                        <i className="fa-solid fa-pen text-xs" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(log.logId)}
                                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                        title="Xóa"
                                                                    >
                                                                        <i className="fa-solid fa-trash text-xs" />
                                                                    </button>
                                                                </div>
                                                            )}
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
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={loading}
                            className="py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <><div className="w-4 h-4 border-2 border-slate-300/30 border-t-slate-500 rounded-full animate-spin" /> Đang tải...</>
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
