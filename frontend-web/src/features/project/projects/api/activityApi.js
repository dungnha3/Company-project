import { apiService } from '@/shared/services/api.service'

// Activity APIs
export const activityApi = {
  // Lấy danh sách activities của issue
  getIssueActivities: (issueId) => {
    return apiService.get(`/api/activities/issue/${issueId}`)
  },

  // Lấy danh sách activities của project
  getProjectActivities: (projectId) => {
    return apiService.get(`/api/activities/project/${projectId}`)
  },

  // Lấy danh sách activities của user trong project
  getUserActivities: (projectId) => {
    return apiService.get(`/api/activities/project/${projectId}/my`)
  },

  // Xóa activity
  deleteActivity: (activityId) => {
    return apiService.delete(`/api/activities/${activityId}`)
  }
}
