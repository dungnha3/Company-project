/**
 * Shared hooks for feature flags and quota management
 * These hooks are used across multiple features
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';

/**
 * Hook to check if a feature is enabled for the current workspace
 */
export function useFeatureEnabled(featureKey) {
    const { currentWorkspace } = useWorkspaceStore();
    const settings = currentWorkspace?.settings;

    if (!settings) return { isEnabled: true, isLoading: false };

    const featureMap = {
        hr: settings.hrModuleEnabled,
        project: settings.projectModuleEnabled,
        chat: settings.chatModuleEnabled,
        storage: settings.storageModuleEnabled,
        ai: settings.aiModuleEnabled,
        attendance: settings.hrModuleEnabled && settings.attendanceEnabled,
        leave: settings.hrModuleEnabled && settings.leaveEnabled,
        salary: settings.hrModuleEnabled && settings.salaryEnabled,
        contract: settings.hrModuleEnabled && settings.contractEnabled,
        review: settings.hrModuleEnabled && settings.reviewEnabled,
        okr: settings.hrModuleEnabled && settings.okrEnabled,
        skillsMatrix: settings.hrModuleEnabled && settings.skillsMatrixEnabled,
        onboarding: settings.hrModuleEnabled && settings.onboardingEnabled,
        resourcePlanning: settings.hrModuleEnabled && settings.resourcePlanningEnabled,
        orgChart: settings.hrModuleEnabled && settings.orgChartEnabled,
        timeTracking: settings.projectModuleEnabled && settings.timeTrackingEnabled,
        analytics: settings.projectModuleEnabled && settings.analyticsEnabled,
        calendar: settings.calendarEnabled,
        automation: settings.projectModuleEnabled && settings.automationEnabled,
    };

    return {
        isEnabled: featureMap[featureKey] ?? true,
        isLoading: false,
    };
}

/**
 * Hook to get current quota usage for the workspace
 */
export function useQuotaUsage() {
    return useQuery({
        queryKey: ['quota-usage'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.COMPANIES.QUOTA);
            return res.data;
        },
        staleTime: 60000, // 1 minute
    });
}

/**
 * Hook to check if a specific quota limit is reached
 */
export function useQuotaCheck(quotaType) {
    const { data: quota, isLoading } = useQuotaUsage();

    if (isLoading || !quota) {
        return { isAtLimit: false, isLoading, current: 0, max: 0 };
    }

    switch (quotaType) {
        case 'employees':
            return {
                isAtLimit: quota.employeesUsed >= quota.employeesMax,
                isLoading: false,
                current: quota.employeesUsed,
                max: quota.employeesMax,
            };
        case 'projects':
            return {
                isAtLimit: quota.projectsUsed >= quota.projectsMax,
                isLoading: false,
                current: quota.projectsUsed,
                max: quota.projectsMax,
            };
        case 'storage':
            return {
                isAtLimit: quota.storageUsed >= quota.storageMax,
                isLoading: false,
                current: quota.storageUsed,
                max: quota.storageMax,
            };
        default:
            return { isAtLimit: false, isLoading: false, current: 0, max: 0 };
    }
}

/**
 * Hook to get user permissions in current workspace
 */
export function usePermissions() {
    const { currentWorkspace, workspaceType } = useWorkspaceStore();

    const role = workspaceType === 'PERSONAL' ? 'OWNER' : (currentWorkspace?.role || 'MEMBER');

    return {
        role,
        isOwner: role === 'OWNER',
        isAdmin: role === 'ADMIN' || role === 'OWNER',
        isManager: ['OWNER', 'ADMIN', 'MANAGER_HR', 'MANAGER_PROJECT', 'MANAGER_ACCOUNTING'].includes(role),
        canManageHR: ['OWNER', 'ADMIN', 'MANAGER_HR'].includes(role),
        canManageProjects: ['OWNER', 'ADMIN', 'MANAGER_PROJECT'].includes(role),
        canManageFinance: ['OWNER', 'ADMIN', 'MANAGER_ACCOUNTING'].includes(role),
    };
}
