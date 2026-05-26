/**
 * Hooks for HR module data fetching
 * Follows features/ pattern to separate business logic from UI
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

// ===== DEPARTMENTS =====

export function useDepartments() {
    return useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.DEPARTMENTS.LIST);
            return res.data;
        },
    });
}

export function useCreateDepartment() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: async (data) => {
            const res = await apiClient.post(ENDPOINTS.DEPARTMENTS.CREATE, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['departments']);
            toast.success('Tạo phòng ban thành công');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Không thể tạo phòng ban');
        },
    });
}

// ===== POSITIONS =====

export function usePositions() {
    return useQuery({
        queryKey: ['positions'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.POSITIONS.LIST);
            return res.data;
        },
    });
}

export function useCreatePosition() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: async (data) => {
            const res = await apiClient.post(ENDPOINTS.POSITIONS.CREATE, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['positions']);
            toast.success('Tạo chức vụ thành công');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Không thể tạo chức vụ');
        },
    });
}
