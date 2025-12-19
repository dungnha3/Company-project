import { apiService } from '@/shared/services/api.service'

// Comment APIs
export const commentApi = {
  // Tạo comment mới
  createComment: (commentData) => {
    return apiService.post('/api/comments', commentData)
  },

  // Lấy danh sách comments của issue
  getIssueComments: (issueId) => {
    return apiService.get(`/api/comments/issue/${issueId}`)
  },

  // Lấy danh sách comments của project
  getProjectComments: (projectId) => {
    return apiService.get(`/api/comments/project/${projectId}`)
  },

  // Cập nhật comment
  updateComment: (commentId, content) => {
    return apiService.put(`/api/comments/${commentId}`, content, {
      headers: {
        'Content-Type': 'text/plain'
      }
    })
  },

  // Xóa comment
  deleteComment: (commentId) => {
    return apiService.delete(`/api/comments/${commentId}`)
  }
}
