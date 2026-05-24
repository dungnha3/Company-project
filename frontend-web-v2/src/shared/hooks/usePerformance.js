import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

/**
 * Hook for fetching and managing performance data
 * Centralized performance data fetching for all pages
 */
export const usePerformance = (options = {}) => {
    const { employeeId, projectId, period = 'all', enabled = true } = options;
    const queryClient = useQueryClient();

    // My performance stats
    const myStatsQuery = useQuery({
        queryKey: ['performance', 'my-stats'],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.PERFORMANCE.MY_STATS);
            return response.data;
        },
        enabled: enabled && !employeeId && !projectId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Employee performance summary (for HR)
    const employeeSummaryQuery = useQuery({
        queryKey: ['performance', 'employee', employeeId],
        queryFn: async () => {
            const response = await apiClient.get(`/api/hr/performance/employees/${employeeId}/summary`);
            return response.data;
        },
        enabled: enabled && !!employeeId,
        staleTime: 5 * 60 * 1000,
    });

    // Performance comparison by project
    const projectComparisonQuery = useQuery({
        queryKey: ['performance', 'comparison', projectId],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.PERFORMANCE.COMPARISON_BY_PROJECT(projectId));
            return response.data;
        },
        enabled: enabled && !!projectId,
        staleTime: 5 * 60 * 1000,
    });

    // HR Dashboard data (aggregated)
    const dashboardQuery = useQuery({
        queryKey: ['performance', 'dashboard', period],
        queryFn: async () => {
            const response = await apiClient.get('/api/hr/performance/dashboard', {
                params: { period }
            });
            return response.data;
        },
        enabled: enabled,
        staleTime: 5 * 60 * 1000,
    });

    return {
        // Data
        myStats: myStatsQuery.data,
        employeeSummary: employeeSummaryQuery.data,
        projectComparison: projectComparisonQuery.data,
        dashboard: dashboardQuery.data,

        // Loading states
        isLoadingMyStats: myStatsQuery.isLoading,
        isLoadingEmployee: employeeSummaryQuery.isLoading,
        isLoadingProject: projectComparisonQuery.isLoading,
        isLoadingDashboard: dashboardQuery.isLoading,

        // Error states
        errorMyStats: myStatsQuery.error,
        errorEmployee: employeeSummaryQuery.error,
        errorProject: projectComparisonQuery.error,
        errorDashboard: dashboardQuery.error,

        // Utilities
        refetch: () => {
            queryClient.invalidateQueries({ queryKey: ['performance'] });
        },
        refetchMyStats: () => myStatsQuery.refetch(),
        refetchEmployee: () => employeeSummaryQuery.refetch(),
        refetchProject: () => projectComparisonQuery.refetch(),
    };
};

/**
 * Hook for performance by employee (for lists)
 */
export const useEmployeePerformance = (employeeId) => {
    return useQuery({
        queryKey: ['performance', 'employee', employeeId],
        queryFn: async () => {
            const response = await apiClient.get(`/api/hr/performance/employees/${employeeId}/summary`);
            return response.data;
        },
        enabled: !!employeeId,
        staleTime: 5 * 60 * 1000,
    });
};

/**
 * Hook for company-wide performance overview
 */
export const useCompanyPerformance = (period = 'all') => {
    return useQuery({
        queryKey: ['performance', 'company', period],
        queryFn: async () => {
            // Use the existing endpoint or create new aggregation endpoint
            const response = await apiClient.get('/api/hr/performance/dashboard', {
                params: { period }
            });
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
    });
};

/**
 * Score color helper
 */
export const getScoreColor = (score) => {
    if (score >= 9.0) return 'green';
    if (score >= 8.0) return 'indigo';
    if (score >= 6.5) return 'amber';
    if (score >= 5.0) return 'orange';
    return 'red';
};

/**
 * Score label helper
 */
export const getScoreLabel = (score) => {
    if (score >= 9.0) return 'Excellent';
    if (score >= 8.0) return 'Good';
    if (score >= 6.5) return 'Satisfactory';
    if (score >= 5.0) return 'Average';
    return 'Poor';
};
