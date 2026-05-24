import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Performance Store
 * Manages cached performance data across the app
 * Shared by MyPerformancePage, PerformanceOverviewPage, ProjectPerformanceTab, etc.
 */
export const usePerformanceStore = create(
    devtools(
        (set, get) => ({
            // Cached performance data
            myStats: null,
            employeeSummaries: {}, // keyed by employeeId
            projectComparisons: {}, // keyed by projectId
            dashboard: null,

            // Loading states
            isLoadingMyStats: false,
            isLoadingEmployee: {},
            isLoadingProject: {},
            isLoadingDashboard: false,

            // Last fetch timestamps for cache invalidation
            lastFetchMyStats: null,
            lastFetchDashboard: null,
            lastFetchEmployee: {},
            lastFetchProject: {},

            // Cache TTL in ms (5 minutes)
            CACHE_TTL: 5 * 60 * 1000,

            // ── Setters ──────────────────────────────────────────────────────────

            setMyStats: (data) => set({
                myStats: data,
                lastFetchMyStats: Date.now(),
                isLoadingMyStats: false,
            }),

            setEmployeeSummary: (employeeId, data) => set((state) => ({
                employeeSummaries: {
                    ...state.employeeSummaries,
                    [employeeId]: data,
                },
                lastFetchEmployee: {
                    ...state.lastFetchEmployee,
                    [employeeId]: Date.now(),
                },
                isLoadingEmployee: {
                    ...state.isLoadingEmployee,
                    [employeeId]: false,
                },
            })),

            setProjectComparison: (projectId, data) => set((state) => ({
                projectComparisons: {
                    ...state.projectComparisons,
                    [projectId]: data,
                },
                lastFetchProject: {
                    ...state.lastFetchProject,
                    [projectId]: Date.now(),
                },
                isLoadingProject: {
                    ...state.isLoadingProject,
                    [projectId]: false,
                },
            })),

            setDashboard: (data) => set({
                dashboard: data,
                lastFetchDashboard: Date.now(),
                isLoadingDashboard: false,
            }),

            // ── Loading state setters ────────────────────────────────────────────

            setLoadingMyStats: (loading) => set({ isLoadingMyStats: loading }),

            setLoadingEmployee: (employeeId, loading) => set((state) => ({
                isLoadingEmployee: {
                    ...state.isLoadingEmployee,
                    [employeeId]: loading,
                },
            })),

            setLoadingProject: (projectId, loading) => set((state) => ({
                isLoadingProject: {
                    ...state.isLoadingProject,
                    [projectId]: loading,
                },
            })),

            setLoadingDashboard: (loading) => set({ isLoadingDashboard: loading }),

            // ── Getters (with cache check) ──────────────────────────────────────

            isMyStatsStale: () => {
                const { lastFetchMyStats, CACHE_TTL } = get();
                if (!lastFetchMyStats) return true;
                return Date.now() - lastFetchMyStats > CACHE_TTL;
            },

            isEmployeeStale: (employeeId) => {
                const { lastFetchEmployee, CACHE_TTL } = get();
                if (!lastFetchEmployee[employeeId]) return true;
                return Date.now() - lastFetchEmployee[employeeId] > CACHE_TTL;
            },

            isProjectStale: (projectId) => {
                const { lastFetchProject, CACHE_TTL } = get();
                if (!lastFetchProject[projectId]) return true;
                return Date.now() - lastFetchProject[projectId] > CACHE_TTL;
            },

            isDashboardStale: () => {
                const { lastFetchDashboard, CACHE_TTL } = get();
                if (!lastFetchDashboard) return true;
                return Date.now() - lastFetchDashboard > CACHE_TTL;
            },

            // ── Cache invalidation ───────────────────────────────────────────────

            invalidateMyStats: () => set({
                myStats: null,
                lastFetchMyStats: null,
            }),

            invalidateEmployee: (employeeId) => set((state) => {
                const { [employeeId]: _, ...rest } = state.employeeSummaries;
                const { [employeeId]: __, ...restTimestamps } = state.lastFetchEmployee;
                return {
                    employeeSummaries: rest,
                    lastFetchEmployee: restTimestamps,
                };
            }),

            invalidateProject: (projectId) => set((state) => {
                const { [projectId]: _, ...rest } = state.projectComparisons;
                const { [projectId]: __, ...restTimestamps } = state.lastFetchProject;
                return {
                    projectComparisons: rest,
                    lastFetchProject: restTimestamps,
                };
            }),

            invalidateDashboard: () => set({
                dashboard: null,
                lastFetchDashboard: null,
            }),

            invalidateAll: () => set({
                myStats: null,
                employeeSummaries: {},
                projectComparisons: {},
                dashboard: null,
                lastFetchMyStats: null,
                lastFetchEmployee: {},
                lastFetchProject: {},
                lastFetchDashboard: null,
            }),

            // ── Get cached data (returns null if stale/missing) ─────────────────

            getMyStats: () => {
                const { myStats, isMyStatsStale } = get();
                return isMyStatsStale() ? null : myStats;
            },

            getEmployeeSummary: (employeeId) => {
                const { employeeSummaries, isEmployeeStale } = get();
                return isEmployeeStale(employeeId) ? null : employeeSummaries[employeeId];
            },

            getProjectComparison: (projectId) => {
                const { projectComparisons, isProjectStale } = get();
                return isProjectStale(projectId) ? null : projectComparisons[projectId];
            },

            getDashboard: () => {
                const { dashboard, isDashboardStale } = get();
                return isDashboardStale() ? null : dashboard;
            },
        }),
        { name: 'performance-store' }
    )
);
