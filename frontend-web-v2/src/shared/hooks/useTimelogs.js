import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { timelogApi } from '@shared/api/featureApi';

/**
 * Hook for fetching and managing timelog data
 * Centralized timelog data fetching for all pages
 */
export const useTimelogs = (options = {}) => {
    const { userId, projectId, issueId, page = 0, size = 20, enabled = true } = options;
    const queryClient = useQueryClient();

    // My timelogs (paginated)
    const myTimelogsQuery = useQuery({
        queryKey: ['timelogs', 'my', page, size],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.TIMELOGS.MY_LOGS, {
                params: { page, size }
            });
            return response.data;
        },
        enabled: enabled && !projectId && !issueId,
        staleTime: 1 * 60 * 1000, // 1 minute
    });

    // Timelogs by project
    const projectTimelogsQuery = useQuery({
        queryKey: ['timelogs', 'project', projectId],
        queryFn: async () => {
            const response = await apiClient.get(`/api/timelogs/project/${projectId}`);
            return response.data;
        },
        enabled: enabled && !!projectId,
        staleTime: 1 * 60 * 1000,
    });

    // Timelogs by issue
    const issueTimelogsQuery = useQuery({
        queryKey: ['timelogs', 'issue', issueId],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.TIMELOGS.BY_ISSUE(issueId));
            return response.data;
        },
        enabled: enabled && !!issueId,
        staleTime: 1 * 60 * 1000,
    });

    // Timelog summary for current user
    const mySummaryQuery = useQuery({
        queryKey: ['timelogs', 'summary', 'my'],
        queryFn: async () => {
            const response = await apiClient.get('/api/timelogs/summary/my');
            return response.data;
        },
        enabled: enabled,
        staleTime: 1 * 60 * 1000,
    });

    // Project timelog summary
    const projectSummaryQuery = useQuery({
        queryKey: ['timelogs', 'summary', 'project', projectId],
        queryFn: async () => {
            const response = await apiClient.get(`/api/timelogs/project/${projectId}/summary`);
            return response.data;
        },
        enabled: enabled && !!projectId,
        staleTime: 1 * 60 * 1000,
    });

    // Create timelog mutation
    const createMutation = useMutation({
        mutationFn: async (data) => {
            return await timelogApi.logTime(data);
        },
        onSuccess: () => {
            // Invalidate all timelog queries and performance queries
            queryClient.invalidateQueries({ queryKey: ['timelogs'] });
            queryClient.invalidateQueries({ queryKey: ['performance'] });
            queryClient.invalidateQueries({ queryKey: ['project-dashboard'] });
        },
    });

    // Update timelog mutation
    const updateMutation = useMutation({
        mutationFn: async ({ logId, data }) => {
            return await timelogApi.updateTimelog(logId, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timelogs'] });
        },
    });

    // Delete timelog mutation
    const deleteMutation = useMutation({
        mutationFn: async (logId) => {
            return await timelogApi.deleteTimelog(logId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timelogs'] });
            queryClient.invalidateQueries({ queryKey: ['performance'] });
        },
    });

    return {
        // Data
        myTimelogs: myTimelogsQuery.data,
        projectTimelogs: projectTimelogsQuery.data,
        issueTimelogs: issueTimelogsQuery.data,
        mySummary: mySummaryQuery.data,
        projectSummary: projectSummaryQuery.data,

        // Loading states
        isLoadingMyTimelogs: myTimelogsQuery.isLoading,
        isLoadingProjectTimelogs: projectTimelogsQuery.isLoading,
        isLoadingIssueTimelogs: issueTimelogsQuery.isLoading,
        isLoadingSummary: mySummaryQuery.isLoading,

        // Error states
        errorMyTimelogs: myTimelogsQuery.error,
        errorProjectTimelogs: projectTimelogsQuery.error,
        errorIssueTimelogs: issueTimelogsQuery.error,

        // Mutations
        logTime: createMutation.mutate,
        updateTimeLog: updateMutation.mutate,
        deleteTimeLog: deleteMutation.mutate,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,

        // Utilities
        refetch: () => {
            queryClient.invalidateQueries({ queryKey: ['timelogs'] });
        },
        refetchMyTimelogs: () => myTimelogsQuery.refetch(),
        refetchSummary: () => mySummaryQuery.refetch(),
    };
};

/**
 * Hook for timelog summary only
 */
export const useTimelogSummary = (period = 'week') => {
    return useQuery({
        queryKey: ['timelogs', 'summary', 'my', period],
        queryFn: async () => {
            const response = await apiClient.get('/api/timelogs/summary/my', {
                params: { period }
            });
            return response.data;
        },
        staleTime: 1 * 60 * 1000,
    });
};

/**
 * Hook for timelog by date range
 */
export const useTimelogsByDateRange = (startDate, endDate) => {
    return useQuery({
        queryKey: ['timelogs', 'date-range', startDate, endDate],
        queryFn: async () => {
            const response = await apiClient.get('/api/timelogs/date-range', {
                params: { startDate, endDate }
            });
            return response.data;
        },
        enabled: !!startDate && !!endDate,
        staleTime: 1 * 60 * 1000,
    });
};
