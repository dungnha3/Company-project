import { useState, useEffect, useRef } from 'react';
import { timelogApi } from '@shared/api/featureApi';
import { useTimerStore, AUTO_STOP } from '@shared/stores/timerStore';
import { formatDate, formatNumber } from '@shared/utils/formatters';

function MiniTimer({ issueId, onLogComplete }) {
    const { isRunning, issueId: timerIssueId, elapsedSeconds, autoStopTick, startTimer } = useTimerStore();
    const [saving, setSaving] = useState(false);
    const tickerRef = useRef(null);

    const isThisIssue = isRunning && timerIssueId === issueId;

    // Auto-start timer when event fires (e.g. from Kanban drag to In Progress)
    useEffect(() => {
        const handler = (e) => {
            if (e.detail.issueId === issueId) {
                startTimer({
                    issueId: e.detail.issueId,
                    issueKey: e.detail.issueKey,
                    issueTitle: e.detail.issueTitle,
                });
            }
        };
        window.addEventListener('auto-start-timer', handler);
        return () => window.removeEventListener('auto-start-timer', handler);
    }, [issueId, startTimer]);

    // Ticker: start/stop based on isThisIssue
    useEffect(() => {
        if (!isThisIssue) {
            if (tickerRef.current) {
                clearInterval(tickerRef.current);
                tickerRef.current = null;
            }
            return;
        }

        tickerRef.current = setInterval(async () => {
            const reason = await autoStopTick();
            if (reason && reason !== 'none') {
                const { stopTimerWithReason } = useTimerStore.getState();
                await stopTimerWithReason(reason);
                onLogComplete?.();
                return;
            }
            const { tick } = useTimerStore.getState();
            tick();
        }, 1000);

        return () => {
            if (tickerRef.current) {
                clearInterval(tickerRef.current);
                tickerRef.current = null;
            }
        };
    }, [isThisIssue, autoStopTick, onLogComplete]);

    const handleStop = async () => {
        const { stopTimer, computeDeduction } = useTimerStore.getState();
        const result = stopTimer();
        if (!result || result.rawSeconds < 60) return;

        const now = Date.now();
        const deduction = computeDeduction(
            result.startTime || (now - result.rawSeconds * 1000),
            now
        );
        const netSeconds = Math.max(0, result.rawSeconds - deduction);
        const hours = netSeconds / 3600;

        setSaving(true);
        try {
            const breakNote = deduction > 0 ? ` (đã trừ ${Math.round(deduction / 60)}m nghỉ)` : '';
            await timelogApi.logTime({
                issueId: result.issueId,
                loggedHours: Math.max(0.25, Math.round(hours * 100) / 100),
                workDate: new Date().toISOString().split('T')[0],
                description: `Timer${breakNote}`,
            });
            onLogComplete?.();
        } catch (err) {
            console.error('Failed to save timer log:', err);
        } finally {
            setSaving(false);
        }
    };

    const formatElapsed = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    if (!isThisIssue) return null;

    return (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />
                    <span className="text-sm font-semibold text-indigo-700">Timer đang chạy</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-2xl font-mono font-bold text-indigo-600">
                        {formatElapsed(elapsedSeconds)}
                    </span>
                    <button
                        onClick={handleStop}
                        disabled={saving}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold disabled:opacity-60 flex items-center gap-1.5"
                    >
                        {saving ? (
                            <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Lưu...</>
                        ) : (
                            <><i className="fa-solid fa-stop" /> Log</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function DailyChart({ logs }) {
    const today = new Date();
    const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
    });

    const maxH = Math.max(...last7.map(date =>
        logs.filter(l => l.workDate === date).reduce((s, l) => s + (l.loggedHours || 0), 0)
    ), 1);

    return (
        <div className="grid grid-cols-7 gap-1 mb-4">
            {last7.map((date, i) => {
                const dayLogs = logs.filter(l => l.workDate === date);
                const total = dayLogs.reduce((s, l) => s + (l.loggedHours || 0), 0);
                const height = maxH > 0 ? Math.max((total / maxH) * 48, total > 0 ? 4 : 0) : 0;
                const isToday = i === 6;
                return (
                    <div key={date} className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-slate-400">{total > 0 ? `${total.toFixed(1)}h` : ''}</span>
                        <div
                            className={`w-full rounded-sm transition-all ${isToday ? 'bg-indigo-400' : total > 0 ? 'bg-indigo-200' : 'bg-slate-200'}`}
                            style={{ height: `${Math.max(height, 2)}px` }}
                        />
                        <span className={`text-[10px] ${isToday ? 'text-indigo-600 font-semibold' : 'text-slate-400'}`}>
                            {new Date(date).toLocaleDateString('vi-VN', { weekday: 'short' }).replace('.', '')}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Time logging section embedded inside IssueDetailModal
 * Shows: mini timer (if this issue is active), daily chart, quick log form, and log history
 */
export default function TimeLogSection({ issueId, estimatedHours, onUpdate }) {
    const [timelogs, setTimelogs] = useState([]);
    const [totalHours, setTotalHours] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        loggedHours: '',
        workDate: new Date().toISOString().split('T')[0],
        description: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadTimelogs();
    }, [issueId]);

    const loadTimelogs = async () => {
        try {
            setLoading(true);
            const [logs, total] = await Promise.all([
                timelogApi.getIssueTimelogs(issueId),
                timelogApi.getIssueTotalHours(issueId)
            ]);
            setTimelogs(Array.isArray(logs) ? logs : []);
            setTotalHours(total || 0);
        } catch (error) {
            console.error('Failed to load timelogs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.loggedHours || !formData.workDate) return;

        try {
            setSubmitting(true);
            await timelogApi.logTime({
                issueId,
                loggedHours: parseFloat(formData.loggedHours),
                workDate: formData.workDate,
                description: formData.description
            });

            setFormData({
                loggedHours: '',
                workDate: new Date().toISOString().split('T')[0],
                description: ''
            });
            setShowForm(false);
            loadTimelogs();
            onUpdate?.();
        } catch (error) {
            console.error('Failed to log time:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (logId) => {
        if (!confirm('Bạn có chắc muốn xóa time log này?')) return;
        try {
            await timelogApi.deleteTimelog(logId);
            loadTimelogs();
            onUpdate?.();
        } catch (error) {
            console.error('Failed to delete timelog:', error);
        }
    };

    const progress = estimatedHours > 0
        ? Math.min((totalHours / estimatedHours)  * 100, 100)
        : null;

    if (loading) {
        return (
            <div className="bg-slate-800 rounded-xl p-4 text-center text-slate-400 text-sm">
                Đang tải time logs...
            </div>
        );
    }

    // Group logs by date
    const grouped = timelogs.reduce((acc, log) => {
        const key = log.workDate;
        if (!acc[key]) acc[key] = [];
        acc[key].push(log);
        return acc;
    }, {});

    return (
        <div className="space-y-4">
            {/* Mini timer (only if this issue is active) */}
            <MiniTimer issueId={issueId} onLogComplete={loadTimelogs} />

            {/* Summary bar */}
            <div className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-clock text-indigo-400" />
                        <span className="text-white font-semibold text-sm">Time Tracking</span>
                    </div>
                    <div className="text-right">
                        <span className="text-indigo-400 font-bold text-lg">
                            {formatNumber(totalHours, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                        </span>
                        {estimatedHours > 0 && (
                            <span className="text-slate-400 text-sm ml-1">
                                / {estimatedHours}h estimated
                            </span>
                        )}
                    </div>
                </div>

                {/* Progress bar */}
                {estimatedHours > 0 && (
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${
                                progress > 100 ? 'bg-gradient-to-r from-amber-500 to-red-500'
                                : progress > 80 ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                                : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                )}

                {/* Daily chart */}
                {timelogs.length > 0 && <DailyChart logs={timelogs} />}

                {/* Log button */}
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                    <i className={`fa-solid ${showForm ? 'fa-minus' : 'fa-plus'}`} />
                    {showForm ? 'Hủy' : '+ Log Time nhanh'}
                </button>

                {/* Quick log form */}
                {showForm && (
                    <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-slate-700 space-y-3">
                        <div className="flex gap-2">
                            <input
                                type="number"
                                step="0.25"
                                min="0.25"
                                max="24"
                                placeholder="Số giờ"
                                value={formData.loggedHours}
                                onChange={(e) => setFormData({ ...formData, loggedHours: e.target.value })}
                                required
                                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                            />
                            <input
                                type="date"
                                value={formData.workDate}
                                onChange={(e) => setFormData({ ...formData, workDate: e.target.value })}
                                required
                                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <textarea
                            placeholder="Mô tả (tùy chọn)"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
                            rows={2}
                        />
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white rounded-lg font-semibold text-sm transition-colors"
                        >
                            {submitting ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    </form>
                )}
            </div>

            {/* Log history grouped by date */}
            {timelogs.length > 0 ? (
                <div className="bg-slate-800 rounded-xl p-4 space-y-4">
                    <h4 className="text-slate-300 text-sm font-semibold uppercase tracking-wide">Lịch sử log</h4>
                    {Object.entries(grouped)
                        .sort(([a], [b]) => new Date(b) - new Date(a))
                        .map(([date, dayLogs]) => {
                            const dayTotal = dayLogs.reduce((s, l) => s + (l.loggedHours || 0), 0);
                            const isToday = date === new Date().toISOString().split('T')[0];
                            return (
                                <div key={date}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-xs font-semibold ${isToday ? 'text-indigo-400' : 'text-slate-400'}`}>
                                            {isToday ? 'Hôm nay' : formatDate(date)}
                                        </span>
                                        <span className="text-xs text-slate-500">{formatNumber(dayTotal, { minimumFractionDigits: 1 })}h</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {dayLogs.map(log => (
                                            <div key={log.logId} className="flex items-center gap-3 p-2.5 bg-slate-700/60 rounded-lg group">
                                                <span className="text-indigo-400 font-mono text-sm font-semibold min-w-[40px]">
                                                    {formatNumber(log.loggedHours, { minimumFractionDigits: 1 })}h
                                                </span>
                                                <span className="text-slate-300 text-sm flex-1 truncate">
                                                    {log.description || <span className="text-slate-500 italic">Không có mô tả</span>}
                                                </span>
                                                <span className="text-slate-500 text-xs min-w-[60px] text-right">
                                                    {log.userName}
                                                </span>
                                                <button
                                                    onClick={() => handleDelete(log.logId)}
                                                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1"
                                                    title="Xóa"
                                                >
                                                    <i className="fa-solid fa-trash text-xs" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            ) : (
                <div className="bg-slate-800 rounded-xl p-8 text-center">
                    <i className="fa-solid fa-clock text-3xl text-slate-600 mb-2" />
                    <p className="text-slate-400 text-sm">Chưa có time log nào cho issue này</p>
                    <p className="text-slate-500 text-xs mt-1">Kéo issue sang "In Progress" hoặc dùng nút Log Time</p>
                </div>
            )}
        </div>
    );
}
