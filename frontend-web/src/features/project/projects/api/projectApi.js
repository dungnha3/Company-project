import { apiService } from '@/shared/services/api.service'

// Project APIs
export const projectApi = {
  // Tạo dự án mới
  createProject: (projectData) => {
    return apiService.post('/api/projects', projectData)
  },

  // Lấy danh sách dự án của tôi
  getMyProjects: () => {
    return apiService.get('/api/projects/my-projects')
  },

  // Lấy tất cả dự án
  getAllProjects: () => {
    return apiService.get('/api/projects')
  },

  // Lấy chi tiết dự án
  getProjectById: (projectId) => {
    return apiService.get(`/api/projects/${projectId}`)
  },

  // Cập nhật dự án
  updateProject: (projectId, projectData) => {
    return apiService.put(`/api/projects/${projectId}`, projectData)
  },

  // Xóa dự án
  deleteProject: (projectId) => {
    return apiService.delete(`/api/projects/${projectId}`)
  },

  // Thêm thành viên vào dự án
  addMember: (projectId, memberData) => {
    return apiService.post(`/api/projects/${projectId}/members`, memberData)
  },

  // Lấy danh sách thành viên dự án
  getProjectMembers: (projectId) => {
    return apiService.get(`/api/projects/${projectId}/members`)
  },

  // Xóa thành viên khỏi dự án
  removeMember: (projectId, memberId) => {
    return apiService.delete(`/api/projects/${projectId}/members/${memberId}`)
  },

  // Cập nhật role của thành viên
  updateMemberRole: (projectId, memberId, role) => {
    return apiService.patch(`/api/projects/${projectId}/members/${memberId}/role?role=${role}`)
  },

  // Lấy danh sách trạng thái issue của dự án
  getIssueStatuses: (projectId) => {
    return apiService.get(`/api/projects/${projectId}/statuses`)
  }
}

// User APIs (để tìm kiếm user theo email)
export const userApi = {
  // Tìm kiếm users
  searchUsers: (keyword) => {
    return apiService.get(`/api/users/search?keyword=${keyword}`)
  },

  // Lấy tất cả users
  getAllUsers: () => {
    return apiService.get('/api/users')
  },

  // Lấy users đang active
  getActiveUsers: () => {
    return apiService.get('/api/users/active')
  }
}
