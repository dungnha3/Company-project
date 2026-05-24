import { create } from 'zustand';
import apiClient from '@shared/api/client';

// ── Break deduction logic ─────────────────────────────────────────────────────
// Default: 12:00–13:00 lunch break (1 hour)
// Returns how many seconds should be deducted for breaks within the work period
function calculateBreakDeduction(startTime, endTime) {
    const BREAKS = [
        { startHour: 12, startMin: 0, endHour: 13, endMin: 0, label: 'Nghỉ trưa' },
    ];

    let totalDeducted = 0;

    for (const brk of BREAKS) {
        // Build break window for the given day
        const dayStart = new Date(startTime);
        dayStart.setHours(brk.startHour, brk.startMin, 0, 0);
        const breakStart = dayStart.getTime();

        const dayEnd = new Date(startTime);
        dayEnd.setHours(brk.endHour, brk.endMin, 0, 0);
        const breakEnd = dayEnd.getTime();

        // If work period spans across this break window, deduct break time
        if (startTime < breakEnd && endTime > breakStart) {
            const overlapStart = Math.max(startTime, breakStart);
            const overlapEnd = Math.min(endTime, breakEnd);
            if (overlapEnd > overlapStart) {
                totalDeducted += Math.floor((overlapEnd - overlapStart) / 1000);
            }
        }
    }

    return totalDeducted;
}

// ── Check if user has approved leave today ───────────────────────────────────
async function checkApprovedLeaveToday() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const res = await apiClient.get('/api/leave-requests/my', {
            params: { status: 'APPROVED' }
        });
        const requests = Array.isArray(res.data) ? res.data : (res.data?.content || []);
        return requests.some(req => {
            const start = req.startDate?.split('T')[0];
            const end = req.endDate?.split('T')[0];
            return start && end && today >= start && today <= end;
        });
    } catch {
        return false; // treat error as "no leave" (don't auto-stop on network error)
    }
}

// ── Auto-stop reason constants ───────────────────────────────────────────────
export const AUTO_STOP = {
    NONE: 'none',
    WORK_HOURS_END: 'work_hours_end',
    ON_LEAVE: 'on_leave',
};

export const useTimerStore = create((set, get) => ({
    // Active timer state
    isRunning: false,
    issueId: null,
    issueKey: null,
    issueTitle: null,
    startTime: null,      // timestamp ms
    elapsedSeconds: 0,

    // ── Start timer for a specific issue ─────────────────────────────────────
    startTimer: ({ issueId, issueKey, issueTitle }) => {
        set({
            isRunning: true,
            issueId,
            issueKey,
            issueTitle,
            startTime: Date.now(),
            elapsedSeconds: 0,
        });
        try {
            sessionStorage.setItem('timer-state', JSON.stringify({
                issueId, issueKey, issueTitle, startTime: Date.now(),
            }));
        } catch {}
    },

    // ── Update elapsed seconds (called by ticker) ──────────────────────────────
    tick: () => {
        const { startTime } = get();
        if (!startTime) return;
        set({ elapsedSeconds: Math.floor((Date.now() - startTime) / 1000) });
    },

    // ── Auto-stop tick: returns AUTO_STOP reason or AUTO_STOP.NONE ─────────────
    // Call this every second from the UI ticker.
    // If it returns a reason, the UI should call stopTimerWithReason() to stop & log.
    autoStopTick: async () => {
        const { isRunning, startTime } = get();
        if (!isRunning || !startTime) return AUTO_STOP.NONE;

        const now = new Date();
        const dayOfWeek = now.getDay();

        // Weekend → auto-stop (no work on Sat/Sun)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return AUTO_STOP.ON_LEAVE; // reuse ON_LEAVE label for "day off"
        }

        // Past work hours end (default 18:00)
        if (now.getHours() >= 18 && now.getMinutes() >= 0) {
            return AUTO_STOP.WORK_HOURS_END;
        }

        // Check approved leave for today (throttle: only once per minute)
        const lastLeaveCheck = get()._lastLeaveCheckAt || 0;
        if (Date.now() - lastLeaveCheck > 60_000) {
            set({ _lastLeaveCheckAt: Date.now() });
            const isOnLeave = await checkApprovedLeaveToday();
            if (isOnLeave) return AUTO_STOP.ON_LEAVE;
        }

        return AUTO_STOP.NONE;
    },

    // ── Stop timer and return raw elapsed seconds ────────────────────────────
    stopTimer: () => {
        const { startTime, issueId, issueKey, issueTitle } = get();
        const rawSeconds = startTime
            ? Math.floor((Date.now() - startTime) / 1000)
            : get().elapsedSeconds;

        try {
            sessionStorage.removeItem('timer-state');
        } catch {}

        set({
            isRunning: false,
            startTime: null,
            elapsedSeconds: 0,
        });

        return { issueId, issueKey, issueTitle, rawSeconds };
    },

    // ── Stop timer with reason (for auto-stop) ────────────────────────────────
    stopTimerWithReason: async (reason) => {
        const { stopTimer, computeDeduction } = get();
        const result = stopTimer();
        if (!result || result.rawSeconds < 60) return;

        const now = Date.now();
        const deduction = computeDeduction(
            result.startTime || (now - result.rawSeconds * 1000),
            now
        );
        const netSeconds = Math.max(0, result.rawSeconds - deduction);
        const hours = netSeconds / 3600;

        let description = 'Timer';
        if (reason === AUTO_STOP.WORK_HOURS_END) {
            description = 'Timer (auto-stop: hết giờ làm việc)';
        } else if (reason === AUTO_STOP.ON_LEAVE) {
            description = 'Timer (auto-stop: nghỉ phép)';
        }

        try {
            const { timelogApi } = await import('@shared/api/featureApi');
            const breakNote = deduction > 0 ? ` (đã trừ ${Math.round(deduction / 60)}m nghỉ)` : '';
            await timelogApi.logTime({
                issueId: result.issueId,
                loggedHours: Math.max(0.25, Math.round(hours * 100) / 100),
                workDate: new Date().toISOString().split('T')[0],
                description: description + breakNote,
            });
        } catch (err) {
            console.error('[timerStore] Failed to auto-log time:', err);
        }
    },

    // ── Utility: compute break deduction for a given time window ─────────────
    computeDeduction: (startTimeMs, endTimeMs = Date.now()) => {
        return calculateBreakDeduction(startTimeMs, endTimeMs);
    },

    // ── Restore timer from sessionStorage ─────────────────────────────────────
    restoreTimer: () => {
        try {
            const saved = sessionStorage.getItem('timer-state');
            if (!saved) return null;
            const { issueId, issueKey, issueTitle, startTime } = JSON.parse(saved);
            if (!startTime) return null;
            const rawSeconds = Math.floor((Date.now() - startTime) / 1000);
            if (rawSeconds > 8 * 3600) {
                sessionStorage.removeItem('timer-state');
                return null;
            }
            set({ isRunning: true, issueId, issueKey, issueTitle, startTime, elapsedSeconds: rawSeconds });
            return { issueId, issueKey, issueTitle, rawSeconds };
        } catch {
            return null;
        }
    },

    // ── Track recent issues ───────────────────────────────────────────────────
    addRecentIssue: (issue) => {
        set(state => {
            const filtered = state.recentIssues.filter(i => i.issueId !== issue.issueId);
            return { recentIssues: [issue, ...filtered].slice(0, 5) };
        });
    },
}));

// ── Auto-start event (fired by ProjectBoard when dragging to In Progress) ─────
export function fireAutoStartTimer(issue) {
    window.dispatchEvent(new CustomEvent('auto-start-timer', {
        detail: { issueId: issue.issueId, issueKey: issue.issueKey, issueTitle: issue.title }
    }));
}

// ── Shared helpers ────────────────────────────────────────────────────────────
export function formatElapsed(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function formatHours(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return '0m';
}
