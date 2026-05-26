/**
 * Shared hooks for feature flags and permissions
 */

import { useWorkspaceStore } from '@shared/stores/workspaceStore';

/**
 * Hook to check if a feature is enabled for the current workspace
 */
export function useFeatureEnabled(featureKey) {
    const { currentWorkspace, workspaceType } = useWorkspaceStore();
    const settings = currentWorkspace?.settings;

    // Guard clause for missing settings
    if (!settings) {
        return { isEnabled: false, isLoading: false };
    }

    const featureMap = {
        hr: settings.hrModuleEnabled,
        project: settings.projectModuleEnabled,
        attendance: settings.hrModuleEnabled && settings.attendanceEnabled,
        leave: settings.hrModuleEnabled && settings.leaveEnabled,
        salary: settings.hrModuleEnabled && settings.salaryEnabled,
        contract: settings.hrModuleEnabled && settings.contractEnabled,
        review: settings.hrModuleEnabled && settings.reviewEnabled,
        okr: settings.hrModuleEnabled && settings.okrEnabled,
        onboarding: settings.hrModuleEnabled && settings.onboardingEnabled,
        resourcePlanning: settings.hrModuleEnabled && settings.resourcePlanningEnabled,
        orgChart: settings.hrModuleEnabled && settings.orgChartEnabled,
        timeTracking: settings.projectModuleEnabled && settings.timeTrackingEnabled,
        analytics: settings.projectModuleEnabled && settings.analyticsEnabled,
        calendar: settings.calendarEnabled,
        automation: settings.projectModuleEnabled && settings.automationEnabled,
    };

    return {
        isEnabled: featureMap[featureKey] ?? false,
        isLoading: false,
    };
}

/**
 * Hook to get user permissions in current workspace
 */
export function usePermissions() {
    const { currentWorkspace, hasPermission } = useWorkspaceStore();

    // Get roles array (with fallback for backward compatibility)
    const roles = currentWorkspace?.roles || (currentWorkspace?.role ? [currentWorkspace.role] : ['MEMBER']);

    const primaryRole = roles[0] || 'MEMBER';
    const hasRole = (...checkRoles) => checkRoles.some(r => roles.includes(r));

    return {
        roles,
        primaryRole,
        hasRole,
        hasPermission,
        // Role-based (correct for admin-level checks)
        isOwner: hasRole('OWNER'),
        isAdmin: hasRole('COMPANY_ADMIN', 'OWNER'),
        // Permission-based (granular, admin can toggle per member)
        isManager: hasPermission('hrViewList') || hasPermission('projectManageAll') || hasPermission('salaryView'),
        canManageHR: hasPermission('hrViewList'),
        canManageProjects: hasPermission('projectManageAll'),
        canManageFinance: hasPermission('salaryView'),
    };
}
