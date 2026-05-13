import { useState, useEffect, useRef } from 'react';
import { timelogApi } from '@shared/api/featureApi';
import { useTimerStore } from '@shared/stores/timerStore';
import { formatNumber } from '@shared/utils/formatters';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Full-featured timer bar with issue picker, elapsed display, break deduction confirm.
 * Can be collapsed when not in use.
 * Auto-refreshes performance and timelog caches after successful log.
 */
export default function GlobalTimerBar({ onLogComplete }) {
    const queryClient = useQueryClient();
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

    useEffect(() => {
        if (isRunning) {
            tickerRef.current = setInterval(() => tick(), 1000);
        } else {
            if (tickerRef.current) clearInterval(tickerRef.current);
        }
        return () => { if (tickerRef.current) clearInterval(tickerRef.current); };
    }, [isRunning, tick]);

    useEffect(() => {
        const handler = (e) => {
            startTimer({ issueId: e.detail.issueId, issueKey: e.detail.issueKey, issueTitle: e.detail.issueTitle });
            setShowPanel(true);
        };
        window.addEventListener('auto-start-timer', handler);
        return () => window.removeEventListener('auto-start-timer', handler);
    }, [startTimer]);

    const loadMyIssues = async () => {
        setIssuesLoading(true);
        try {
            const data = await timelogApi.getMyIssues();
            setIssues(Array.isArray(data) ? data : (data.content || []));
        } finally {
            setIssuesLoading(false);
        }
    };

    const handleStop = () => {
        const result = stopTimer();
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
        const hours = showOverride && overrideHours ? parseFloat(overrideHours) : confirmData.netHours;
        if (!hours || hours <= 0) return;

        setSaving(true);
        setShowConfirm(false);
        try {
            const breakNote = confirmData.deduction > 0
                ? ` (đã trừ ${Math.round(confirmData.deduction / 60)}m nghỉ)` : '';
            await timelogApi.logTime({
                issueId: confirmData.issueId,
                loggedHours: Math.max(0.25, Math.round(hours * 100) / 100),
                workDate: new Date().toISOString().split('T')[0],
                description: `Timer${breakNote}`,
            });
            setConfirmData(null);

            // Auto-invalidate performance and timelog caches
            queryClient.invalidateQueries({ queryKey: ['performance'] });
            queryClient.invalidateQueries({ queryKey: ['timelogs'] });
            queryClient.invalidateQueries({ queryKey: ['project-dashboard'] });

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

    if (!showPanel && !isRunning) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
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
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <i className="fa-solid fa-stopwatch text-indigo-500" />
                    Timer
                </h2>
                <div className="flex items-center gap-2">
                    {isRunning && (
                        <span className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                            {issueKey}
                            {issueTitle && <span className="text-gray-400 font-normal truncate max-w-[200px]">{issueTitle}</span>}
                        </span>
                    )}
                    <button
                        onClick={() => setShowPanel(p => !p)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <i className={`fa-solid fa-chevron-${showPanel ? 'up' : 'down'} text-sm`} />
                    </button>
                </div>
            </div>

            {showPanel && (
                <>
                    <div className="relative mb-5">
                        {isRunning ? null : (
                            <button
                                onClick={() => { setShowIssues(true); loadMyIssues(); }}
                                className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:border-indigo-300 transition-colors text-left"
                            >
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold shrink-0">
                                    {issueKey || '?'}
                                </span>
                                <span className="text-gray-700 truncate">{issueTitle || 'Chọn issue để log giờ...'}</span>
                                <i className="fa-solid fa-chevron-down text-gray-400 ml-auto shrink-0" />
                            </button>
                        )}

                        {showIssues && !isRunning && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-50 max-h-64 overflow-y-auto">
                                <div className="sticky top-0 bg-white p-2 border-b border-gray-100">
                                    <input
                                        autoFocus
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Tìm issue..."
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                {issuesLoading ? (
                                    <div className="p-4 text-center text-gray-400 text-sm">Đang tải...</div>
                                ) : filteredIssues.length === 0 ? (
                                    <div className="p-4 text-center text-gray-400 text-sm">Không tìm thấy</div>
                                ) : (
                                    filteredIssues.map(issue => (
                                        <button
                                            key={issue.id || issue.issueId}
                                            onClick={() => handleSelectIssue(issue)}
                                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                                        >
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-bold shrink-0">
                                                {issue.issueKey}
                                            </span>
                                            <span className="text-sm text-gray-700 truncate">{issue.title}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <div className="text-center mb-5">
                        <div className={`text-6xl font-mono font-bold tracking-tight ${isRunning ? 'text-indigo-600' : 'text-gray-400'}`}>
                            {formatTime(elapsedSeconds)}
                        </div>
                        <p className="text-gray-400 text-sm mt-1">
                            {isRunning
                                ? `${formatNumber(hours, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}h`
                                : elapsedSeconds > 0
                                    ? `${formatNumber(hours, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}h`
                                    : '00:00:00 = 0.00h'}
                        </p>
                    </div>

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
                                        onClick={() => stopTimer()}
                                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold flex items-center gap-2 transition-colors"
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

            {showConfirm && confirmData && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <i className="fa-solid fa-clock" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Xác nhận Log Time</h3>
                                <p className="text-sm text-gray-500">{confirmData.issueKey}</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Tổng thời gian</span>
                                <span className="font-semibold text-gray-700">
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
                            <div className="border-t border-gray-200 pt-2 flex justify-between">
                                <span className="font-semibold text-gray-700">Sẽ log</span>
                                <span className="font-bold text-indigo-600 text-lg">
                                    {formatNumber(confirmData.netHours, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}h
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowOverride(v => !v)}
                            className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1 mb-3 transition-colors"
                        >
                            <i className={`fa-solid fa-${showOverride ? 'check-square' : 'square'} text-xs`} />
                            Nhập số giờ khác (override)
                        </button>

                        {showOverride && (
                            <div className="mb-4">
                                <input
                                    type="number" step="0.25" min="0.25" max="24"
                                    placeholder="VD: 7.5"
                                    value={overrideHours}
                                    onChange={e => setOverrideHours(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowConfirm(false); setConfirmData(null); }}
                                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-semibold text-sm transition-colors"
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
