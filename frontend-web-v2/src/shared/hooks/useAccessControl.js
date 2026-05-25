import { useAuthStore } from '@shared/stores/authStore';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';

export const useAccessControl = () => {
    const { user } = useAuthStore();
    const { currentWorkspace } = useWorkspaceStore();

    /**
     * Kiểm tra xem user có quyền thực hiện một hành động cụ thể không.
     * @param {string} permissionKey - Mã quyền (VD: 'PROJECT.CREATE', 'HR.VIEW_LIST', 'reviewCreate')
     * @returns {boolean}
     */
    const hasPermission = (permissionKey) => {
        if (!user || !currentWorkspace) return false;

        // System Admin luôn có quyền tối cao
        if (user.roles?.includes('SYSTEM_ADMIN')) return true;

        // OWNER và COMPANY_ADMIN nghiễm nhiên có tất cả quyền trong phạm vi Workspace
        const userRoles = currentWorkspace.roles || (currentWorkspace.role ? [currentWorkspace.role] : []);
        if (userRoles.includes('OWNER') || userRoles.includes('COMPANY_ADMIN')) return true;

        const perms = currentWorkspace.permissions;
        if (!perms) return false;

        // Dot-notation keys (e.g. 'PROJECT.CREATE', 'REVIEW.CREATE')
        if (permissionKey.includes('.')) {
            switch (permissionKey) {
                case 'HR.VIEW_LIST': return !!perms.hrViewList;
                case 'HR.EDIT_PROFILE': return !!perms.hrEditProfile;
                case 'HR.CREATE_EMPLOYEE': return !!perms.hrCreateEmployee;
                case 'HR.DELETE_EMPLOYEE': return !!perms.hrDeleteEmployee;
                case 'HR.MANAGE_REVIEWS': return !!perms.hrManageReviews;
                case 'HR.VIEW_DASHBOARD': return !!perms.hrViewDashboard;
                case 'HR.EXPORT': return !!perms.hrExport;
                case 'LEAVE.APPROVE': return !!perms.leaveApprove;
                case 'LEAVE.VIEW_ALL': return !!perms.leaveViewAll;
                case 'REVIEW.VIEW_ALL': return !!perms.reviewViewAll;
                case 'REVIEW.CREATE': return !!perms.reviewCreate;
                case 'REVIEW.APPROVE': return !!perms.reviewApprove;
                case 'PROJECT.CREATE': return !!perms.projectCreate;
                case 'PROJECT.MANAGE_ALL': return !!perms.projectManageAll;
                case 'PROJECT.DELETE': return !!perms.projectDelete;
                case 'PROJECT.MANAGE_ISSUES': return !!perms.projectManageIssues;
                case 'PROJECT.MANAGE_SPRINTS': return !!perms.projectManageSprints;
                case 'PROJECT.VIEW_DASHBOARD': return !!perms.projectViewDashboard;
                case 'PROJECT.EXPORT': return !!perms.projectExport;
                case 'PROJECT.MANAGE_PHASES': return !!perms.projectManagePhases;
                case 'PROJECT.RESOURCE_PLANNING': return !!perms.projectResourcePlanning;
                case 'TIMETRACKING.LOG': return !!perms.timetrackingLog;
                case 'TIMETRACKING.VIEW_ALL': return !!perms.timetrackingViewAll;
                case 'ANALYTICS.VIEW': return !!perms.analyticsView;
                case 'CALENDAR.VIEW': return !!perms.calendarView;
                case 'CALENDAR.MANAGE': return !!perms.calendarManage;
                case 'WORKSPACE.MANAGE_MEMBERS': return !!perms.workspaceManageMembers;
                case 'WORKSPACE.MANAGE_REQUESTS': return !!perms.workspaceManageRequests;
                default: return false;
            }
        }

        // Direct camelCase key access (e.g. 'reviewCreate', 'projectManageIssues')
        return !!perms[permissionKey];
    };

    /**
     * Hook duy nhất được gọi để quyết định UI có hiển thị hay không
     * @param {Object} params
     * @param {string} [params.permission] - Có yêu cầu quyền gì không?
     * @returns {boolean}
     */
    const canAccess = ({ permission }) => {
        if (permission && !hasPermission(permission)) return false;
        return true;
    };

    return { hasPermission, canAccess };
};
