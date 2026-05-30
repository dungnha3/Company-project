import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

/**
 * Hook for fetching and managing employee data
 * Centralized employee data fetching for all pages
 */
export const useEmployee = (employeeId, options = {}) => {
    const { enabled = true } = options;
    const queryClient = useQueryClient();

    // Single employee by ID
    const employeeQuery = useQuery({
        queryKey: ['employee', employeeId],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.EMPLOYEES.BY_ID(employeeId));
            return response.data;
        },
        enabled: enabled && !!employeeId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Employee by user ID
    const byUserIdQuery = useQuery({
        queryKey: ['employee', 'by-user', employeeId],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.EMPLOYEES.BY_USER(employeeId));
            return response.data;
        },
        enabled: enabled && !!employeeId,
        staleTime: 5 * 60 * 1000,
    });

    return {
        employee: employeeQuery.data,
        byUserId: byUserIdQuery.data,
        isLoading: employeeQuery.isLoading,
        isLoadingByUserId: byUserIdQuery.isLoading,
        error: employeeQuery.error,
        errorByUserId: byUserIdQuery.error,
        refetch: () => employeeQuery.refetch(),
    };
};

/**
 * Hook for employee list with filters
 */
export const useEmployees = (options = {}) => {
    const { status, search, page = 0, size = 20 } = options;
    const queryClient = useQueryClient();

    const employeesQuery = useQuery({
        queryKey: ['employees', 'list', status, search, page, size],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.EMPLOYEES.LIST, {
                params: { status, search, page, size }
            });
            return response.data;
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
    });

    return {
        employees: employeesQuery.data,
        isLoading: employeesQuery.isLoading,
        error: employeesQuery.error,
        refetch: () => employeesQuery.refetch(),
    };
};

/**
 * Hook for all active employees (for dropdowns, etc)
 */
export const useActiveEmployees = () => {
    return useQuery({
        queryKey: ['employees', 'active'],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.EMPLOYEES.BY_STATUS('ACTIVE'));
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
    });
};

/**
 * Hook for employee search
 */
export const useEmployeeSearch = (query) => {
    return useQuery({
        queryKey: ['employees', 'search', query],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.EMPLOYEES.SEARCH, {
                params: { q: query }
            });
            return response.data;
        },
        enabled: !!query && query.length >= 2,
        staleTime: 30 * 1000, // 30 seconds
    });
};

/**
 * Hook for current user's employee profile
 */
export const useMyEmployee = () => {
    return useQuery({
        queryKey: ['employee', 'me'],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.EMPLOYEES.ME);
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
    });
};
