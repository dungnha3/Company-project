import { create } from 'zustand';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

// ── Calculate working seconds between two timestamps (8:00 - 18:00, excluding weekends and lunch 12:00-13:00) ──
export function calculateWorkingSeconds(startTimeMs, endTimeMs) {
    if (endTimeMs <= startTimeMs) return 0;

    let totalSeconds = 0;
    const start = new Date(startTimeMs);
    const end = new Date(endTimeMs);

    // Temp variables for day looping
    let current = new Date(start);
    current.setHours(0, 0, 0, 0);

    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    while (current.getTime() <= endDay.getTime()) {
        const dayOfWeek = current.getDay();
        // Skip Saturday (6) and Sunday (0)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const dayStart = new Date(current);
            dayStart.setHours(8, 0, 0, 0); // Workday start: 8:00

            const dayEnd = new Date(current);
            dayEnd.setHours(18, 0, 0, 0); // Workday end: 18:00

            // Overlap of workday with actual start/end
            const actualStart = Math.max(dayStart.getTime(), startTimeMs);
            const actualEnd = Math.min(dayEnd.getTime(), endTimeMs);

            if (actualEnd > actualStart) {
                let seconds = Math.floor((actualEnd - actualStart) / 1000);

                // Deduct lunch break: 12:00 - 13:00
                const lunchStart = new Date(current);
                lunchStart.setHours(12, 0, 0, 0);
                const lunchEnd = new Date(current);
                lunchEnd.setHours(13, 0, 0, 0);

                const overlapStart = Math.max(actualStart, lunchStart.getTime());
                const overlapEnd = Math.min(actualEnd, lunchEnd.getTime());

                if (overlapEnd > overlapStart) {
                    seconds -= Math.floor((overlapEnd - overlapStart) / 1000);
                }

                totalSeconds += Math.max(0, seconds);
            }
        }
        // Move to next day safely
        current.setDate(current.getDate() + 1);
    }

    return totalSeconds;
}

// ── Check if user has approved leave today ───────────────────────────────────
async function checkApprovedLeaveToday() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const res = await apiClient.get(ENDPOINTS.LEAVE_REQUESTS.ME, {
            params: { status: 'APPROVED' }
        });
        const requests = Array.isArray(res.data) ? res.data : (res.data?.content || []);
        return requests.some(req => {
            const start = req.startDate?.split('T')[0];
            const end = req.endDate?.split('T')[0];
            return start && end && today >= start && today <= end;
        });
    } catch {
        return false;
    }
}

// ── Auto-stop reason constants ───────────────────────────────────────────────
export const AUTO_STOP = {
    NONE: 'none',
    WORK_HOURS_END: 'work_hours_end',
    ON_LEAVE: 'on_leave',
};

let timerInterval = null;

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
        if (timerInterval) clearInterval(timerInterval);
        const startTime = Date.now();
        set({
            isRunning: true,
            issueId,
            issueKey,
            issueTitle,
            startTime,
            elapsedSeconds: 0,
        });
        try {
            localStorage.setItem('timer-state', JSON.stringify({
                issueId,
                issueKey,
                issueTitle,
                startTime,
                lastTickTime: startTime,
                lastElapsedSeconds: 0,
            }));
        } catch {}

        timerInterval = setInterval(async () => {
            const currentStartTime = get().startTime;
            if (!currentStartTime) {
                clearInterval(timerInterval);
                timerInterval = null;
                return;
            }

            const nextElapsed = get().elapsedSeconds + 1;
            set({ elapsedSeconds: nextElapsed });

            try {
                localStorage.setItem('timer-state', JSON.stringify({
                    issueId,
                    issueKey,
                    issueTitle,
                    startTime: currentStartTime,
                    lastTickTime: Date.now(),
                    lastElapsedSeconds: nextElapsed,
                }));
            } catch {}

            // Check auto stop
            const reason = await get().autoStopTick();
            if (reason !== AUTO_STOP.NONE) {
                clearInterval(timerInterval);
                timerInterval = null;
                await get().stopTimerWithReason(reason);
                window.dispatchEvent(new CustomEvent('timelog-updated', { detail: { issueId } }));
            }
        }, 1000);
    },

    // ── Update elapsed seconds (called by ticker) ──────────────────────────────
    tick: () => {
        const { startTime } = get();
        if (!startTime) return;
        set({ elapsedSeconds: get().elapsedSeconds + 1 });
    },

    // ── Auto-stop tick: returns AUTO_STOP reason or AUTO_STOP.NONE ─────────────
    autoStopTick: async () => {
        const { isRunning, startTime } = get();
        if (!isRunning || !startTime) return AUTO_STOP.NONE;

        const now = new Date();
        const dayOfWeek = now.getDay();

        // Weekend → auto-stop (no work on Sat/Sun)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return AUTO_STOP.ON_LEAVE;
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
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        const { startTime, issueId, issueKey, issueTitle, elapsedSeconds } = get();
        const rawSeconds = elapsedSeconds;

        try {
            localStorage.removeItem('timer-state');
        } catch {}

        set({
            isRunning: false,
            startTime: null,
            elapsedSeconds: 0,
            issueId: null,
            issueKey: null,
            issueTitle: null,
        });

        return { issueId, issueKey, issueTitle, rawSeconds, startTime };
    },

    // ── Stop timer with reason (for auto-stop) ────────────────────────────────
    stopTimerWithReason: async (reason) => {
        const { stopTimer } = get();
        const result = stopTimer();
        if (!result || result.rawSeconds < 60) return;

        const hours = result.rawSeconds / 3600;

        let description = 'Timer';
        if (reason === AUTO_STOP.WORK_HOURS_END) {
            description = 'Timer (auto-stop: hết giờ làm việc)';
        } else if (reason === AUTO_STOP.ON_LEAVE) {
            description = 'Timer (auto-stop: nghỉ phép)';
        }

        try {
            const { timelogApi } = await import('@shared/api/featureApi');
            await timelogApi.logTime({
                issueId: result.issueId,
                loggedHours: Math.max(0.25, Math.round(hours * 100) / 100),
                workDate: new Date().toISOString().split('T')[0],
                description: description,
            });
        } catch (err) {
            console.error('[timerStore] Failed to auto-log time:', err);
        }
    },

    // ── Utility: compute break deduction for a given time window ─────────────
    computeDeduction: (startTimeMs, endTimeMs = Date.now()) => {
        // Keeps signature compatible but return 0 as calculation is already handled net in calculateWorkingSeconds gap
        return 0;
    },

    // ── Restore timer from localStorage ─────────────────────────────────────
    restoreTimer: () => {
        try {
            const saved = localStorage.getItem('timer-state');
            if (!saved) return null;
            const { issueId, issueKey, issueTitle, startTime, lastTickTime, lastElapsedSeconds } = JSON.parse(saved);
            if (!startTime) return null;

            // Calculate working seconds elapsed while the browser was closed/inactive
            const workingSecondsGap = calculateWorkingSeconds(lastTickTime || startTime, Date.now());
            const restoredElapsed = (lastElapsedSeconds || 0) + workingSecondsGap;

            if (timerInterval) clearInterval(timerInterval);
            set({
                isRunning: true,
                issueId,
                issueKey,
                issueTitle,
                startTime,
                elapsedSeconds: restoredElapsed
            });

            // Update localStorage immediately with restored progress
            try {
                localStorage.setItem('timer-state', JSON.stringify({
                    issueId,
                    issueKey,
                    issueTitle,
                    startTime,
                    lastTickTime: Date.now(),
                    lastElapsedSeconds: restoredElapsed,
                }));
            } catch {}

            timerInterval = setInterval(async () => {
                const currentStartTime = get().startTime;
                if (!currentStartTime) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                    return;
                }

                const nextElapsed = get().elapsedSeconds + 1;
                set({ elapsedSeconds: nextElapsed });

                try {
                    localStorage.setItem('timer-state', JSON.stringify({
                        issueId,
                        issueKey,
                        issueTitle,
                        startTime: currentStartTime,
                        lastTickTime: Date.now(),
                        lastElapsedSeconds: nextElapsed,
                    }));
                } catch {}

                // Check auto stop
                const reason = await get().autoStopTick();
                if (reason !== AUTO_STOP.NONE) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                    await get().stopTimerWithReason(reason);
                    window.dispatchEvent(new CustomEvent('timelog-updated', { detail: { issueId } }));
                }
            }, 1000);

            return { issueId, issueKey, issueTitle, rawSeconds: restoredElapsed };
        } catch {
            return null;
        }
    },
}));

// ── Auto-start event (fired by ProjectBoard when dragging to In Progress) ─────
export function fireAutoStartTimer(issue) {
    window.dispatchEvent(new CustomEvent('auto-start-timer', {
        detail: { issueId: issue.issueId, issueKey: issue.issueKey, issueTitle: issue.title }
    }));
}

// ── Auto-complete event (fired when task is dragged/updated to Done status) ────
export async function fireTaskCompleted(issueId) {
    const { isRunning, issueId: timerIssueId, stopTimer } = useTimerStore.getState();

    // Only auto-log if the timer is running for THIS issue
    if (!isRunning || timerIssueId !== issueId) return;

    const result = stopTimer();
    if (!result || result.rawSeconds < 60) return;

    const hours = result.rawSeconds / 3600;

    try {
        const { timelogApi } = await import('@shared/api/featureApi');
        await timelogApi.logTime({
            issueId: result.issueId,
            loggedHours: Math.max(0.25, Math.round(hours * 100) / 100),
            workDate: new Date().toISOString().split('T')[0],
            description: `Timer (auto-stop: task hoàn thành)`,
        });
        window.dispatchEvent(new CustomEvent('timelog-updated', { detail: { issueId } }));
    } catch (err) {
        console.error('[timerStore] Failed to auto-log on task complete:', err);
    }
}

// Automatically stops the running timer for this issue and saves the time log as "Review" submission
export async function fireTaskToReview(issueId) {
    const { isRunning, issueId: timerIssueId, stopTimer } = useTimerStore.getState();

    // Only auto-log if the timer is running for THIS issue
    if (!isRunning || timerIssueId !== issueId) return;

    const result = stopTimer();
    if (!result || result.rawSeconds < 60) return;

    const hours = result.rawSeconds / 3600;

    try {
        const { timelogApi } = await import('@shared/api/featureApi');
        await timelogApi.logTime({
            issueId: result.issueId,
            loggedHours: Math.max(0.25, Math.round(hours * 100) / 100),
            workDate: new Date().toISOString().split('T')[0],
            description: `Timer (auto-stop: nộp task Review)`,
        });
        window.dispatchEvent(new CustomEvent('timelog-updated', { detail: { issueId } }));
    } catch (err) {
        console.error('[timerStore] Failed to auto-log on task Review:', err);
    }
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

// Automatically stops the running timer for this issue and saves the time log as a regular stop
export async function fireTaskStopped(issueId) {
    const { isRunning, issueId: timerIssueId, stopTimer } = useTimerStore.getState();

    // Only auto-log if the timer is running for THIS issue
    if (!isRunning || timerIssueId !== issueId) return;

    const result = stopTimer();
    if (!result || result.rawSeconds < 60) return;

    const hours = result.rawSeconds / 3600;

    try {
        const { timelogApi } = await import('@shared/api/featureApi');
        await timelogApi.logTime({
            issueId: result.issueId,
            loggedHours: Math.max(0.25, Math.round(hours * 100) / 100),
            workDate: new Date().toISOString().split('T')[0],
            description: `Timer (auto-stop: chuyển trạng thái)`,
        });
        window.dispatchEvent(new CustomEvent('timelog-updated', { detail: { issueId } }));
    } catch (err) {
        console.error('[timerStore] Failed to auto-log on task stop:', err);
    }
}
