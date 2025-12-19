import { apiService } from '@/shared/services/api.service'

// Issue APIs
export const issueApi = {
  // Tạo issue/task mới
  createIssue: (issueData) => {
    return apiService.post('/api/issues', issueData)
  },

  // Lấy danh sách issues của tôi (được giao)
  getMyIssues: () => {
    return apiService.get('/api/issues/my-issues')
  },

  // Lấy danh sách issues do tôi tạo
  getMyReportedIssues: () => {
    return apiService.get('/api/issues/my-reported')
  },

  // Lấy chi tiết issue
  getIssueById: (issueId) => {
    return apiService.get(`/api/issues/${issueId}`)
  },

  // Lấy danh sách issues của dự án
  getProjectIssues: (projectId) => {
    return apiService.get(`/api/issues/project/${projectId}`)
  },

  // Lấy backlog của dự án
  getProjectBacklog: (projectId) => {
    return apiService.get(`/api/issues/project/${projectId}/backlog`)
  },

  // Lấy issues của sprint
  getSprintIssues: (sprintId) => {
    return apiService.get(`/api/issues/sprint/${sprintId}`)
  },

  // Cập nhật issue
  updateIssue: (issueId, issueData) => {
    return apiService.put(`/api/issues/${issueId}`, issueData)
  },

  // Xóa issue
  deleteIssue: (issueId) => {
    return apiService.delete(`/api/issues/${issueId}`)
  },

  // Giao việc cho người khác
  assignIssue: (issueId, assigneeId) => {
    return apiService.patch(`/api/issues/${issueId}/assign/${assigneeId}`)
  },

  // Thay đổi trạng thái issue
  changeIssueStatus: (issueId, statusId) => {
    return apiService.patch(`/api/issues/${issueId}/status/${statusId}`)
  }
}
