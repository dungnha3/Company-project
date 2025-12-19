import { apiService } from './api.service'

export const projectService = {
  // Get all projects
  getAll: async () => {
    return await apiService.get('/api/projects')
  },

  // Get my projects
  getMyProjects: async () => {
    return await apiService.get('/api/projects/my-projects')
  },

  // Get project by ID
  getById: async (projectId) => {
    return await apiService.get(`/api/projects/${projectId}`)
  },

  // Create project
  create: async (data) => {
    return await apiService.post('/api/projects', data)
  },

  // Update project
  update: async (projectId, data) => {
    return await apiService.put(`/api/projects/${projectId}`, data)
  },

  // Delete project
  delete: async (projectId) => {
    return await apiService.delete(`/api/projects/${projectId}`)
  },

  // Get members
  getMembers: async (projectId) => {
    return await apiService.get(`/api/projects/${projectId}/members`)
  },

  // Add member
  addMember: async (projectId, data) => {
    return await apiService.post(`/api/projects/${projectId}/members`, data)
  },

  // Remove member
  removeMember: async (projectId, memberId) => {
    return await apiService.delete(`/api/projects/${projectId}/members/${memberId}`)
  }
}
