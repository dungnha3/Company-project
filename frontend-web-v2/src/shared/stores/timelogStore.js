import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Timelog Store
 * Manages cached timelog data across the app
 * Shared by MyTimelogsPage, MyPerformancePage, ProjectDashboard, etc.
 */
export const useTimelogStore = create(
    devtools(
        (set, get) => ({
            // Cached timelog data
            myTimelogs: null,
            issueTimelogs: {}, // keyed by issueId
            projectTimelogs: {}, // keyed by projectId
            mySummary: null,

            // Pagination state
            myTimelogsPage: 0,
            myTimelogsHasMore: true,
            myTimelogsTotalElements: 0,

            // Loading states
            isLoadingMyTimelogs: false,
            isLoadingIssueTimelogs: {},
            isLoadingProjectTimelogs: {},
            isLoadingSummary: false,

            // Last fetch timestamps
            lastFetchMyTimelogs: null,
            lastFetchIssueTimelogs: {},
            lastFetchProjectTimelogs: {},
            lastFetchSummary: null,

            // Cache TTL in ms (1 minute)
            CACHE_TTL: 1 * 60 * 1000,

            // ── Setters ──────────────────────────────────────────────────────────

            setMyTimelogs: (data, { page = 0, append = false } = {}) => set((state) => {
                const existing = append ? (state.myTimelogs || []) : [];
                const newData = Array.isArray(data) ? data : (data?.content || []);
                return {
                    myTimelogs: append ? [...existing, ...newData] : newData,
                    myTimelogsPage: page,
                    myTimelogsHasMore: data?.last === false,
                    myTimelogsTotalElements: data?.totalElements || newData.length,
                    lastFetchMyTimelogs: Date.now(),
                    isLoadingMyTimelogs: false,
                };
            }),

            appendMyTimelogs: (data) => set((state) => {
                const existing = state.myTimelogs || [];
                const newData = Array.isArray(data) ? data : (data?.content || []);
                return {
                    myTimelogs: [...existing, ...newData],
                    myTimelogsPage: data?.number || state.myTimelogsPage + 1,
                    myTimelogsHasMore: data?.last === false,
                    myTimelogsTotalElements: data?.totalElements || existing.length + newData.length,
                };
            }),

            setIssueTimelogs: (issueId, data) => set((state) => ({
                issueTimelogs: {
                    ...state.issueTimelogs,
                    [issueId]: Array.isArray(data) ? data : (data?.content || []),
                },
                lastFetchIssueTimelogs: {
                    ...state.lastFetchIssueTimelogs,
                    [issueId]: Date.now(),
                },
                isLoadingIssueTimelogs: {
                    ...state.isLoadingIssueTimelogs,
                    [issueId]: false,
                },
            })),

            setProjectTimelogs: (projectId, data) => set((state) => ({
                projectTimelogs: {
                    ...state.projectTimelogs,
                    [projectId]: Array.isArray(data) ? data : (data?.content || []),
                },
                lastFetchProjectTimelogs: {
                    ...state.lastFetchProjectTimelogs,
                    [projectId]: Date.now(),
                },
                isLoadingProjectTimelogs: {
                    ...state.isLoadingProjectTimelogs,
                    [projectId]: false,
                },
            })),

            setMySummary: (data) => set({
                mySummary: data,
                lastFetchSummary: Date.now(),
                isLoadingSummary: false,
            }),

            // ── Loading state setters ──────────────────────────────────────────

            setLoadingMyTimelogs: (loading) => set({ isLoadingMyTimelogs: loading }),

            setLoadingIssueTimelogs: (issueId, loading) => set((state) => ({
                isLoadingIssueTimelogs: {
                    ...state.isLoadingIssueTimelogs,
                    [issueId]: loading,
                },
            })),

            setLoadingProjectTimelogs: (projectId, loading) => set((state) => ({
                isLoadingProjectTimelogs: {
                    ...state.isLoadingProjectTimelogs,
                    [projectId]: loading,
                },
            })),

            setLoadingSummary: (loading) => set({ isLoadingSummary: loading }),

            // ── Loading state setters ──────────────────────────────────────────

            // ── Getters (with cache check) ──────────────────────────────────────

            isMyTimelogsStale: () => {
                const { lastFetchMyTimelogs, CACHE_TTL } = get();
                if (!lastFetchMyTimelogs) return true;
                return Date.now() - lastFetchMyTimelogs > CACHE_TTL;
            },

            isIssueTimelogsStale: (issueId) => {
                const { lastFetchIssueTimelogs, CACHE_TTL } = get();
                if (!lastFetchIssueTimelogs[issueId]) return true;
                return Date.now() - lastFetchIssueTimelogs[issueId] > CACHE_TTL;
            },

            isProjectTimelogsStale: (projectId) => {
                const { lastFetchProjectTimelogs, CACHE_TTL } = get();
                if (!lastFetchProjectTimelogs[projectId]) return true;
                return Date.now() - lastFetchProjectTimelogs[projectId] > CACHE_TTL;
            },

            isSummaryStale: () => {
                const { lastFetchSummary, CACHE_TTL } = get();
                if (!lastFetchSummary) return true;
                return Date.now() - lastFetchSummary > CACHE_TTL;
            },

            // ── Cache invalidation ───────────────────────────────────────────────

            invalidateMyTimelogs: () => set((state) => ({
                myTimelogs: null,
                myTimelogsPage: 0,
                myTimelogsHasMore: true,
                lastFetchMyTimelogs: null,
            })),

            invalidateIssueTimelogs: (issueId) => set((state) => {
                const { [issueId]: _, ...rest } = state.issueTimelogs;
                const { [issueId]: __, ...restTimestamps } = state.lastFetchIssueTimelogs;
                return {
                    issueTimelogs: rest,
                    lastFetchIssueTimelogs: restTimestamps,
                };
            }),

            invalidateProjectTimelogs: (projectId) => set((state) => {
                const { [projectId]: _, ...rest } = state.projectTimelogs;
                const { [projectId]: __, ...restTimestamps } = state.lastFetchProjectTimelogs;
                return {
                    projectTimelogs: rest,
                    lastFetchProjectTimelogs: restTimestamps,
                };
            }),

            invalidateSummary: () => set({
                mySummary: null,
                lastFetchSummary: null,
            }),

            invalidateAll: () => set({
                myTimelogs: null,
                issueTimelogs: {},
                projectTimelogs: {},
                mySummary: null,
                myTimelogsPage: 0,
                myTimelogsHasMore: true,
                myTimelogsTotalElements: 0,
                lastFetchMyTimelogs: null,
                lastFetchIssueTimelogs: {},
                lastFetchProjectTimelogs: {},
                lastFetchSummary: null,
            }),

            // ── Get cached data ─────────────────────────────────────────────────

            getMyTimelogs: () => {
                const { myTimelogs, isMyTimelogsStale } = get();
                return isMyTimelogsStale() ? null : myTimelogs;
            },

            getIssueTimelogs: (issueId) => {
                const { issueTimelogs, isIssueTimelogsStale } = get();
                return isIssueTimelogsStale(issueId) ? null : issueTimelogs[issueId];
            },

            getProjectTimelogs: (projectId) => {
                const { projectTimelogs, isProjectTimelogsStale } = get();
                return isProjectTimelogsStale(projectId) ? null : projectTimelogs[projectId];
            },

            getSummary: () => {
                const { mySummary, isSummaryStale } = get();
                return isSummaryStale() ? null : mySummary;
            },

            // ── Local timelog management (for optimistic updates) ─────────────────

            addLocalTimelog: (timelog) => set((state) => ({
                myTimelogs: [timelog, ...(state.myTimelogs || [])],
                myTimelogsTotalElements: (state.myTimelogsTotalElements || 0) + 1,
            })),

            updateLocalTimelog: (logId, updates) => set((state) => ({
                myTimelogs: (state.myTimelogs || []).map((log) =>
                    log.logId === logId ? { ...log, ...updates } : log
                ),
            })),

            removeLocalTimelog: (logId) => set((state) => ({
                myTimelogs: (state.myTimelogs || []).filter((log) => log.logId !== logId),
                myTimelogsTotalElements: Math.max(0, (state.myTimelogsTotalElements || 1) - 1),
            })),
        }),
        { name: 'timelog-store' }
    )
);
