import { apiService } from '@/shared/services/api.service'

// Message API - Quản lý tin nhắn
export const messageApi = {
  // Gửi tin nhắn text
  sendMessage: async (roomId, content) => {
    try {
      const response = await apiService.post(`/api/chat/rooms/${roomId}/messages`, {
        content: content,
        messageType: 'TEXT'
      })
      return response
    } catch (error) {
      throw error
    }
  },

  // Gửi tin nhắn có file đính kèm
  sendFileMessage: async (roomId, fileId, content = '') => {
    try {
      const response = await apiService.post(`/api/chat/rooms/${roomId}/messages`, {
        content: content,
        messageType: 'FILE',
        fileId: fileId
      })
      return response
    } catch (error) {
      throw error
    }
  },

  // Gửi tin nhắn có ảnh
  sendImageMessage: async (roomId, fileId, content = '') => {
    try {
      const response = await apiService.post(`/api/chat/rooms/${roomId}/messages`, {
        content: content,
        messageType: 'IMAGE',
        fileId: fileId
      })
      return response
    } catch (error) {
      throw error
    }
  },

  // Lấy danh sách tin nhắn trong phòng (có phân trang)
  getMessages: async (roomId, page = 0, size = 50) => {
    try {
      const response = await apiService.get(
        `/api/chat/rooms/${roomId}/messages?page=${page}&size=${size}`
      )
      // Backend returns Page<MessDTO>, extract content array
      return response.content || response
    } catch (error) {
      throw error
    }
  },

  // Đánh dấu tin nhắn đã xem
  markSeen: async (roomId, messageId, userId) => {
    try {
      const response = await apiService.put(`/api/chat/messages/${messageId}/seen`, {
        roomId: roomId,
        userId: userId
      })
      return response
    } catch (error) {
      throw error
    }
  },

  // Sửa tin nhắn
  editMessage: async (messageId, newContent) => {
    try {
      const response = await apiService.put(`/api/chat/messages/${messageId}`, {
        content: newContent
      })
      return response
    } catch (error) {
      throw error
    }
  },

  // Xóa tin nhắn (soft delete)
  deleteMessage: async (messageId) => {
    try {
      const response = await apiService.delete(`/api/chat/messages/${messageId}`)
      return response
    } catch (error) {
      throw error
    }
  },

  // Reply to message
  replyToMessage: async (roomId, content, replyToMessageId) => {
    try {
      const response = await apiService.post(`/api/chat/rooms/${roomId}/messages`, {
        content: content,
        messageType: 'TEXT',
        replyToMessageId: replyToMessageId
      })
      return response
    } catch (error) {
      throw error
    }
  }
}
