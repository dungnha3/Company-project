/**
 * Hooks for HR module data fetching
 * Follows features/ pattern to separate business logic from UI
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

// ===== EMPLOYEES =====

export function useEmployees(params = {}) {
    return useQuery({
        queryKey: ['employees', params],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.EMPLOYEES.LIST, { params });
            return res.data;
        },
    });
}

export function useEmployee(employeeId) {
    return useQuery({
        queryKey: ['employee', employeeId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.EMPLOYEES.BY_ID(employeeId));
            return res.data;
        },
        enabled: !!employeeId,
    });
}

export function useCreateEmployee() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: async (data) => {
            const res = await apiClient.post(ENDPOINTS.EMPLOYEES.CREATE, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['employees']);
            toast.success('Tạo nhân viên thành công');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Không thể tạo nhân viên');
        },
    });
}

export function useUpdateEmployee() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: async ({ employeeId, data }) => {
            const res = await apiClient.put(ENDPOINTS.EMPLOYEES.BY_ID(employeeId), data);
            return res.data;
        },
        onSuccess: (_, { employeeId }) => {
            queryClient.invalidateQueries(['employees']);
            queryClient.invalidateQueries(['employee', employeeId]);
            toast.success('Cập nhật nhân viên thành công');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Không thể cập nhật nhân viên');
        },
    });
}

export function useDeleteEmployee() {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: async (employeeId) => {
            await apiClient.delete(ENDPOINTS.EMPLOYEES.BY_ID(employeeId));
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['employees']);
            toast.success('Xóa nhân viên thành công');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Không thể xóa nhân viên');
        },
    });
}

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
