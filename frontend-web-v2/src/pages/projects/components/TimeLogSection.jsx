import { useState, useEffect, useRef } from 'react';
import { timelogApi } from '@shared/api/featureApi';
import { useTimerStore, AUTO_STOP } from '@shared/stores/timerStore';
import { formatDate, formatNumber } from '@shared/utils/formatters';
import { useAccessControl } from '@shared/hooks/useAccessControl';

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
        <div className="bg-gray-50/60 rounded-2xl p-4 border border-gray-100 mb-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nhật ký 7 ngày qua</span>
                <span className="text-[10px] text-gray-400 font-semibold">Giờ làm / ngày</span>
            </div>
            <div className="grid grid-cols-7 gap-2.5 h-24 items-end">
                {last7.map((date, i) => {
                    const dayLogs = logs.filter(l => l.workDate === date);
                    const total = dayLogs.reduce((s, l) => s + (l.loggedHours || 0), 0);
                    const height = maxH > 0 ? (total / maxH) * 56 : 0; // max bar height 56px
                    const isToday = i === 6;

                    return (
                        <div key={date} className="flex flex-col items-center group h-full justify-end">
                            {/* Hour label on top */}
                            <div className="h-5 flex items-center justify-center mb-1">
                                {total > 0 && (
                                    <span className="text-[9px] font-bold text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 shadow-sm animate-in zoom-in duration-200">
                                        {total.toFixed(1)}h
                                    </span>
                                )}
                            </div>

                            {/* Bar container for proper bottom alignment */}
                            <div className="w-full flex justify-center items-end h-14">
                                <div
                                    className={`w-6 rounded-t-md transition-all duration-300 cursor-pointer ${
                                        isToday
                                            ? 'bg-gradient-to-t from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20 hover:scale-110'
                                            : total > 0
                                                ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-md hover:from-indigo-500 hover:to-indigo-300 hover:scale-110'
                                                : 'bg-gray-200 hover:bg-gray-300'
                                    }`}
                                    style={{ height: `${total > 0 ? Math.max(height, 6) : 4}px` }}
                                    title={total > 0 ? `${total.toFixed(1)} giờ làm việc` : 'Không ghi nhận'}
                                />
                            </div>

                            {/* Day label */}
                            <span className={`text-[10px] mt-2 tracking-wide uppercase transition-colors duration-200 ${
                                isToday
                                    ? 'text-emerald-500 font-extrabold'
                                    : total > 0
                                        ? 'text-indigo-600 font-bold'
                                        : 'text-gray-400 group-hover:text-gray-500'
                            }`}>
                                {new Date(date).toLocaleDateString('vi-VN', { weekday: 'short' }).replace('.', '')}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Time logging section embedded inside IssueDetailModal
 * Shows: mini timer (if this issue is active), daily chart, quick log form, and log history
 */
export default function TimeLogSection({ issueId, estimatedHours, onUpdate }) {
    const { hasPermission } = useAccessControl();
    const isManager = hasPermission('PROJECT.MANAGE_ISSUES') || hasPermission('PROJECT.MANAGE_ALL');
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
        ? Math.min((totalHours / estimatedHours) * 100, 100)
        : null;
    const remaining = (estimatedHours || 0) - totalHours;

    if (loading) {
        return (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center text-gray-400 text-sm shadow-sm">
                <i className="fa-solid fa-spinner fa-spin mr-2 text-indigo-500" />
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
        <div className="space-y-5">
            {/* Mini timer (only if this issue is active) */}
            <MiniTimer issueId={issueId} onLogComplete={loadTimelogs} />

            {/* Summary bar */}
            <div className="bg-white border border-gray-150/80 shadow-sm rounded-2xl p-5">
                {/* Time Tracking Breakdown */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <i className="fa-solid fa-clock text-indigo-500 text-sm" />
                        </div>
                        <span className="text-gray-800 font-bold text-sm">Time Tracking</span>
                    </div>
                </div>

                {/* Total Actual Hours Card */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl px-4 py-4 text-center mb-4">
                    <div className="text-[10px] text-indigo-600 uppercase tracking-wider font-bold mb-1">
                        Tổng thời gian thực tế đã ghi nhận
                    </div>
                    <div className="text-indigo-900 font-extrabold text-2xl">
                        {formatNumber(totalHours || 0, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                    </div>
                </div>

                {/* Daily chart */}
                {timelogs.length > 0 && <DailyChart logs={timelogs} />}

                {/* Log button - Manager only to prevent fraud */}
                {isManager && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <i className={`fa-solid ${showForm ? 'fa-minus' : 'fa-plus'}`} />
                        {showForm ? 'Hủy ghi nhận' : 'Ghi nhận giờ làm'}
                    </button>
                )}

                {/* Quick log form - Manager only */}
                {isManager && showForm && (
                    <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-gray-100 space-y-3.5">
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
                                className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                            <input
                                type="date"
                                value={formData.workDate}
                                onChange={(e) => setFormData({ ...formData, workDate: e.target.value })}
                                required
                                className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-850 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        <textarea
                            placeholder="Mô tả công việc (tùy chọn)..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                            rows={2}
                        />
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-2 bg-indigo-500 hover:bg-indigo-650 disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
                        >
                            {submitting ? 'Đang lưu...' : 'Lưu lại'}
                        </button>
                    </form>
                )}
            </div>

            {/* Log history grouped by date */}
            {timelogs.length > 0 ? (
                <div className="bg-white border border-gray-150/80 shadow-sm rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <i className="fa-solid fa-history text-indigo-500 text-xs" />
                        </div>
                        <h4 className="text-gray-800 text-sm font-bold uppercase tracking-wider">Lịch sử ghi nhận giờ làm</h4>
                    </div>
                    {Object.entries(grouped)
                        .sort(([a], [b]) => new Date(b) - new Date(a))
                        .map(([date, dayLogs]) => {
                            const dayTotal = dayLogs.reduce((s, l) => s + (l.loggedHours || 0), 0);
                            const isToday = date === new Date().toISOString().split('T')[0];
                            return (
                                <div key={date} className="space-y-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-xs font-bold tracking-wide ${isToday ? 'text-indigo-600' : 'text-gray-400'}`}>
                                            {isToday ? 'Hôm nay' : formatDate(date)}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200/50">{formatNumber(dayTotal, { minimumFractionDigits: 1 })}h tổng cộng</span>
                                    </div>
                                    <div className="space-y-2">
                                        {dayLogs.map(log => (
                                            <div key={log.logId} className="flex items-center gap-3 p-3 bg-gray-50/50 hover:bg-gray-50 border border-gray-100/70 hover:border-gray-200/60 rounded-xl group transition-all duration-200">
                                                <span className="text-indigo-600 font-mono text-xs font-extrabold min-w-[48px] bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100/60 text-center shadow-sm">
                                                    {formatNumber(log.loggedHours, { minimumFractionDigits: 1 })}h
                                                </span>
                                                <span className="text-gray-700 text-sm flex-1 truncate">
                                                    {log.description || <span className="text-gray-400 italic text-xs">Không có mô tả chi tiết</span>}
                                                </span>
                                                <span className="text-gray-500 text-[10px] min-w-[70px] text-right font-bold bg-white px-2.5 py-1 rounded-full border border-gray-200/80 shadow-sm">
                                                    {log.userName || 'Thành viên'}
                                                </span>
                                                {isManager && (
                                                    <button
                                                        onClick={() => handleDelete(log.logId)}
                                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1"
                                                        title="Xóa"
                                                    >
                                                        <i className="fa-solid fa-trash text-xs" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            ) : (
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3 border border-gray-100 shadow-sm">
                        <i className="fa-solid fa-clock text-xl text-gray-400" />
                    </div>
                    <p className="text-gray-600 text-sm font-semibold">Chưa có time log nào cho issue này</p>
                    <p className="text-gray-400 text-xs mt-1">Kéo issue sang "In Progress" hoặc dùng nút để ghi nhận.</p>
                </div>
            )}
        </div>
    );
}
