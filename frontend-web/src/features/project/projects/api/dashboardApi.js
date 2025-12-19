import { apiService } from '@/shared/services/api.service'

// Dashboard APIs
export const dashboardApi = {
  // Lấy thống kê của một dự án
  getProjectStats: (projectId) => {
    return apiService.get(`/api/project-dashboard/project/${projectId}/stats`)
  },

  // Lấy burndown chart của sprint
  getSprintBurndown: (sprintId) => {
    return apiService.get(`/api/project-dashboard/sprint/${sprintId}/burndown`)
  },

  // Lấy thống kê tất cả dự án của user
  getMyProjectsStats: () => {
    return apiService.get('/api/project-dashboard/my-projects')
  }
}
