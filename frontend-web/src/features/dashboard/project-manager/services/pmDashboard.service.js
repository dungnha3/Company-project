import { apiService } from '@/shared/services/api.service';
import { API_ENDPOINTS } from '@/config/api.config';
import { dashboardApi } from '@/features/project/projects/api/dashboardApi';

/**
 * Service Dashboard cho Project Manager
 * Kết hợp dữ liệu dự án và nghỉ phép
 */
export const pmDashboardService = {
    /**
     * Lấy thống kê tổng quan cho PM Dashboard
     */
    getOverviewStats: async () => {
        try {
            const [projectsStats, pendingLeaves] = await Promise.allSettled([
                dashboardApi.getMyProjectsStats(),
                apiService.get(API_ENDPOINTS.HR.LEAVE_PENDING)
            ]);

            // Aggregate project stats
            let totalProjects = 0;
            let totalIssues = 0;
            let completedIssues = 0;
            let inProgressIssues = 0;
            let totalMembers = 0;
            let overdueIssues = 0;
            let projects = [];

            if (projectsStats.status === 'fulfilled' && Array.isArray(projectsStats.value)) {
                projects = projectsStats.value;
                totalProjects = projects.length;

                projects.forEach(p => {
                    totalIssues += p.totalIssues || 0;
                    completedIssues += p.completedIssues || 0;
                    inProgressIssues += p.inProgressIssues || 0;
                    overdueIssues += p.overdueIssues || 0;
                    totalMembers += p.totalMembers || 0;
                });
            }

            // Get pending leave count
            let pendingLeaveCount = 0;
            let pendingLeavesList = [];
            if (pendingLeaves.status === 'fulfilled') {
                pendingLeavesList = Array.isArray(pendingLeaves.value) ? pendingLeaves.value : [];
                pendingLeaveCount = pendingLeavesList.length;
            }

            return {
                totalProjects,
                totalIssues,
                completedIssues,
                inProgressIssues,
                overdueIssues,
                totalMembers,
                pendingLeaveCount,
                pendingLeavesList,
                projects
            };
        } catch (error) {
            console.error('Error fetching PM dashboard stats:', error);
            return {
                totalProjects: 0,
                totalIssues: 0,
                completedIssues: 0,
                inProgressIssues: 0,
                overdueIssues: 0,
                totalMembers: 0,
                pendingLeaveCount: 0,
                pendingLeavesList: [],
                projects: []
            };
        }
    },

    /**
     * Lấy danh sách dự án với stats
     */
    getProjectsStats: async () => {
        return dashboardApi.getMyProjectsStats();
    },

    /**
     * Lấy danh sách đơn nghỉ phép chờ duyệt
     */
    getPendingLeaves: async () => {
        return apiService.get(API_ENDPOINTS.HR.LEAVE_PENDING);
    },

    /**
     * Duyệt đơn nghỉ phép
     */
    approveLeave: async (leaveId) => {
        return apiService.put(API_ENDPOINTS.HR.LEAVE_APPROVE(leaveId));
    },

    /**
     * Từ chối đơn nghỉ phép
     */
    rejectLeave: async (leaveId, lyDo) => {
        return apiService.put(API_ENDPOINTS.HR.LEAVE_REJECT(leaveId), { lyDo });
    }
};
