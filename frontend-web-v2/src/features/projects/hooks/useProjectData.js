/**
 * Hooks for Project module data fetching
 * Follows features/ pattern to separate business logic from UI
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

// ===== PROJECTS =====

export function useProjects(params = {}) {
    return useQuery({
        queryKey: ['projects', params],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.LIST, { params });
            return res.data;
        },
    });
}

export function useProject(projectId) {
    return useQuery({
        queryKey: ['project', projectId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.BY_ID(projectId));
            return res.data;
        },
        enabled: !!projectId,
    });
}

export function useCreateProject() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: async (data) => {
            const res = await apiClient.post(ENDPOINTS.PROJECTS.LIST, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['projects']);
            toast.success('Tạo dự án thành công');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Không thể tạo dự án');
        },
    });
}

// ===== PROJECT MEMBERS =====

export function useProjectMembers(projectId) {
    return useQuery({
        queryKey: ['project-members', projectId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.MEMBERS(projectId));
            return res.data;
        },
        enabled: !!projectId,
    });
}

export function useAddProjectMember(projectId) {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: async (data) => {
            const res = await apiClient.post(ENDPOINTS.PROJECTS.ADD_MEMBER(projectId), data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['project-members', projectId]);
            toast.success('Thêm thành viên thành công');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Không thể thêm thành viên');
        },
    });
}

// ===== ISSUES =====

export function useIssues(projectId, params = {}) {
    return useQuery({
        queryKey: ['issues', projectId, params],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.ISSUES.BY_PROJECT(projectId), { params });
            return res.data;
        },
        enabled: !!projectId,
    });
}

export function useIssue(issueId) {
    return useQuery({
        queryKey: ['issue', issueId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.ISSUES.BY_ID(issueId));
            return res.data;
        },
        enabled: !!issueId,
    });
}

export function useCreateIssue() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: async (data) => {
            const res = await apiClient.post(ENDPOINTS.ISSUES.CREATE, data);
            return res.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries(['issues']);
            toast.success('Tạo issue thành công');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Không thể tạo issue');
        },
    });
}

export function useUpdateIssue() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: async ({ issueId, data }) => {
            const res = await apiClient.put(ENDPOINTS.ISSUES.BY_ID(issueId), data);
            return res.data;
        },
        onSuccess: (_, { issueId }) => {
            queryClient.invalidateQueries(['issues']);
            queryClient.invalidateQueries(['issue', issueId]);
            toast.success('Cập nhật issue thành công');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Không thể cập nhật issue');
        },
    });
}
