import { useState, useEffect } from 'react';
import { timelogApi } from '@shared/api/featureApi';
import { useTimerStore } from '@shared/stores/timerStore';
import { formatDate, formatNumber } from '@shared/utils/formatters';
import { formatElapsed } from '@shared/stores/timerStore';

/**
 * Time log panel shown directly on the Kanban board toolbar.
 * Shows: live timer + today's logs + quick log form + recent history
 */
export default function BoardTimeLogPanel({ issueId, onUpdate }) {
    const { isRunning, issueId: timerIssueId, elapsedSeconds } = useTimerStore();
    const [timelogs, setTimelogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        loggedHours: '',
        workDate: new Date().toISOString().split('T')[0],
        description: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [timerIssueTitle, setTimerIssueTitle] = useState('');

    // Track the active timer issue title from store
    const activeTimerIssueTitle = useTimerStore(s => s.issueTitle);

    useEffect(() => {
        loadTimelogs();
    }, []);

    const loadTimelogs = async () => {
        try {
            setLoading(true);
            const data = await timelogApi.getMyTimelogs(0, 50);
            const logs = Array.isArray(data) ? data : (data?.content || []);
            setTimelogs(logs);
        } catch (error) {
            console.error('Failed to load timelogs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.loggedHours || !formData.workDate) return;
        if (!issueId) {
            alert('Vui lòng chọn một task để log thời gian.');
            return;
        }

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

    const handleStopTimer = async () => {
        if (!isRunning) return;
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
        const breakNote = deduction > 0 ? ` (đã trừ ${Math.round(deduction / 60)}m nghỉ)` : '';

        try {
            await timelogApi.logTime({
                issueId: result.issueId,
                loggedHours: Math.max(0.25, Math.round(hours * 100) / 100),
                workDate: new Date().toISOString().split('T')[0],
                description: `Timer${breakNote}`,
            });
            loadTimelogs();
            onUpdate?.();
        } catch (err) {
            console.error('Failed to save timer log:', err);
        }
    };

    const isTimerActive = isRunning && timerIssueId;

    return (
        <div className="space-y-3">
            {/* Timer status bar */}
            {isTimerActive ? (
                <div className="flex items-center justify-between bg-indigo-900/50 border border-indigo-700 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-pulse shrink-0" />
                        <span className="text-indigo-300 text-sm font-medium truncate">
                            {activeTimerIssueTitle || 'Timer đang chạy'}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <span className="text-indigo-200 font-mono font-bold text-base">
                            {formatElapsed(elapsedSeconds)}
                        </span>
                        <button
                            onClick={handleStopTimer}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                            <i className="fa-solid fa-stop" /> Log
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2 text-slate-400 text-xs px-1">
                    <i className="fa-solid fa-info-circle" />
                    <span>Kéo task sang <b>"In Progress"</b> để bắt đầu đếm giờ</span>
                </div>
            )}

            {/* Quick log form */}
            <div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                    <i className={`fa-solid ${showForm ? 'fa-minus' : 'fa-plus'}`} />
                    {showForm ? 'Hủy' : '+ Log nhanh'}
                </button>

                {showForm && (
                    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
                        <div className="flex gap-2">
                            <input
                                type="number"
                                step="0.25"
                                min="0.25"
                                max="24"
                                placeholder="Giờ"
                                value={formData.loggedHours}
                                onChange={(e) => setFormData({ ...formData, loggedHours: e.target.value })}
                                required
                                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                            />
                            <input
                                type="date"
                                value={formData.workDate}
                                onChange={(e) => setFormData({ ...formData, workDate: e.target.value })}
                                required
                                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <textarea
                            placeholder="Mô tả (tùy chọn)"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                            rows={2}
                        />
                        <button
                            type="submit"
                            disabled={submitting || !issueId}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors"
                        >
                            {submitting ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    </form>
                )}
            </div>

            {/* Recent log history */}
            {loading ? (
                <div className="text-center text-slate-500 text-xs py-4">Đang tải...</div>
            ) : timelogs.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    <h4 className="text-slate-400 text-xs font-semibold uppercase">Gần đây</h4>
                    {timelogs.slice(0, 15).map(log => {
                        const isToday = log.workDate === new Date().toISOString().split('T')[0];
                        return (
                            <div key={log.logId} className="flex items-center gap-2 p-2 bg-slate-700/60 rounded text-xs">
                                <span className="text-emerald-400 font-mono font-bold min-w-[36px]">
                                    {formatNumber(log.loggedHours, { minimumFractionDigits: 1 })}h
                                </span>
                                <span className="text-slate-300 flex-1 truncate">
                                    {log.description || <span className="text-slate-500 italic">—</span>}
                                </span>
                                <span className="text-slate-500 shrink-0">
                                    {isToday ? 'Hôm nay' : formatDate(log.workDate)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center text-slate-500 text-xs py-4">
                    Chưa có log nào hôm nay
                </div>
            )}
        </div>
    );
}
