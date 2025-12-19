import { apiService } from './api.service'

export const issueService = {
  // Get issue by ID
  getById: async (issueId) => {
    return await apiService.get(`/api/issues/${issueId}`)
  },

  // Get my issues
  getMyIssues: async () => {
    return await apiService.get('/api/issues/my-issues')
  },

  // Get issues by project
  getByProject: async (projectId) => {
    return await apiService.get(`/api/issues/project/${projectId}`)
  },

  // Get backlog
  getBacklog: async (projectId) => {
    return await apiService.get(`/api/issues/project/${projectId}/backlog`)
  },

  // Get issues by sprint
  getBySprint: async (sprintId) => {
    return await apiService.get(`/api/issues/sprint/${sprintId}`)
  },

  // Create issue
  create: async (data) => {
    return await apiService.post('/api/issues', data)
  },

  // Update issue
  update: async (issueId, data) => {
    return await apiService.put(`/api/issues/${issueId}`, data)
  },

  // Delete issue
  delete: async (issueId) => {
    return await apiService.delete(`/api/issues/${issueId}`)
  },

  // Update status
  updateStatus: async (issueId, status) => {
    return await apiService.patch(`/api/issues/${issueId}/status`, { status })
  },

  // Assign issue
  assign: async (issueId, userId) => {
    return await apiService.patch(`/api/issues/${issueId}/assign`, { assigneeId: userId })
  }
}
