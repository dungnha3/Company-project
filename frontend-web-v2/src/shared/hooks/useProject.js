import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

/**
 * Hook for fetching and managing project data
 * Centralized project data fetching for all pages
 */
export const useProject = (projectId, options = {}) => {
    const { enabled = true } = options;
    const queryClient = useQueryClient();

    // Single project
    const projectQuery = useQuery({
        queryKey: ['project', projectId],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.PROJECTS.BY_ID(projectId));
            return response.data;
        },
        enabled: enabled && !!projectId,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });

    // Project members
    const membersQuery = useQuery({
        queryKey: ['project', projectId, 'members'],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.PROJECTS.MEMBERS(projectId));
            return response.data;
        },
        enabled: enabled && !!projectId,
        staleTime: 2 * 60 * 1000,
    });

    // Project goals
    const goalsQuery = useQuery({
        queryKey: ['project', projectId, 'goals'],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.PROJECTS.GOALS(projectId));
            return response.data;
        },
        enabled: enabled && !!projectId,
        staleTime: 1 * 60 * 1000,
    });

    // Project stats (dashboard)
    const statsQuery = useQuery({
        queryKey: ['project-dashboard', projectId, 'stats'],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.PROJECT_DASHBOARD.STATS(projectId));
            return response.data;
        },
        enabled: enabled && !!projectId,
        staleTime: 1 * 60 * 1000,
    });

    return {
        project: projectQuery.data,
        members: membersQuery.data,
        goals: goalsQuery.data,
        stats: statsQuery.data,

        isLoadingProject: projectQuery.isLoading,
        isLoadingMembers: membersQuery.isLoading,
        isLoadingGoals: goalsQuery.isLoading,
        isLoadingStats: statsQuery.isLoading,

        errorProject: projectQuery.error,
        errorMembers: membersQuery.error,

        refetchProject: () => projectQuery.refetch(),
        refetchMembers: () => membersQuery.refetch(),
        refetchGoals: () => goalsQuery.refetch(),
        refetchStats: () => statsQuery.refetch(),
    };
};

/**
 * Hook for project list
 */
export const useProjects = (options = {}) => {
    const query = useQuery({
        queryKey: ['projects', 'list'],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.PROJECTS.LIST);
            if (Array.isArray(response.data)) return response.data;
            if (Array.isArray(response.data?.content)) return response.data.content;
            return [];
        },
        staleTime: 2 * 60 * 1000,
    });

    return {
        projects: query.data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: () => query.refetch(),
    };
};

/**
 * Hook for my projects (projects user is a member of)
 */
export const useMyProjects = () => {
    return useQuery({
        queryKey: ['projects', 'my'],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.PROJECTS.MY_PROJECTS);
            if (Array.isArray(response.data)) return response.data;
            if (Array.isArray(response.data?.content)) return response.data.content;
            return [];
        },
        staleTime: 2 * 60 * 1000,
    });
};

/**
 * Hook for sprint list by project
 */
export const useProjectSprints = (projectId) => {
    return useQuery({
        queryKey: ['sprints', 'project', projectId],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.SPRINTS.BY_PROJECT(projectId));
            return response.data;
        },
        enabled: !!projectId,
        staleTime: 1 * 60 * 1000,
    });
};

/**
 * Hook for sprint burndown data
 */
export const useSprintBurndown = (sprintId, projectId) => {
    return useQuery({
        queryKey: ['sprint', sprintId, 'burndown'],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.PROJECT_DASHBOARD.BURNDOWN(sprintId), {
                params: { projectId }
            });
            return response.data;
        },
        enabled: !!sprintId,
        staleTime: 30 * 1000, // 30 seconds
    });
};

/**
 * Hook for project issues
 */
export const useProjectIssues = (projectId) => {
    return useQuery({
        queryKey: ['issues', 'project', projectId],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.ISSUES.BY_PROJECT(projectId));
            return response.data;
        },
        enabled: !!projectId,
        staleTime: 30 * 1000,
    });
};
