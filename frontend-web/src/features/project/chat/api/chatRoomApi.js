import { apiService } from '@/shared/services/api.service'

// Chat Room API - Quản lý phòng chat
export const chatRoomApi = {
  // Lấy danh sách phòng chat của user hiện tại
  getMyChatRooms: async () => {
    try {
      const response = await apiService.get('/api/chat/rooms')
      return response
    } catch (error) {
      throw error
    }
  },

  // Lấy thông tin phòng chat theo ID
  getById: async (roomId) => {
    try {
      const response = await apiService.get(`/api/chat/rooms/${roomId}`)
      return response
    } catch (error) {
      throw error
    }
  },

  // Tạo phòng chat nhóm
  createGroupChat: async (data) => {
    try {
      // data: { name, memberIds: [userId1, userId2, ...] }
      const requestBody = {
        name: data.name,
        roomType: 'GROUP',
        memberIds: data.memberIds
      }
      console.log('=== CREATE GROUP CHAT REQUEST ===', requestBody)
      const response = await apiService.post('/api/chat/rooms', requestBody)
      console.log('=== CREATE GROUP CHAT RESPONSE ===', response)
      return response
    } catch (error) {
      console.error('=== CREATE GROUP CHAT ERROR ===', error.response?.data || error.message)
      throw error
    }
  },

  // Tìm hoặc tạo chat 1-1 với user khác
  createDirectChat: async (userId) => {
    try {
      const response = await apiService.post(`/api/chat/rooms/direct/${userId}`)
      return response
    } catch (error) {
      throw error
    }
  },

  // Lấy phòng chat của project
  getProjectChatRoom: async (projectId) => {
    try {
      const response = await apiService.get(`/api/chat/rooms/project/${projectId}`)
      return response
    } catch (error) {
      throw error
    }
  },

  // Thêm thành viên vào phòng chat
  addMember: async (roomId, userId) => {
    try {
      const response = await apiService.post(`/api/chat/rooms/${roomId}/members/${userId}`)
      return response
    } catch (error) {
      throw error
    }
  },

  // Xóa thành viên khỏi phòng chat
  removeMember: async (roomId, userId) => {
    try {
      const response = await apiService.delete(`/api/chat/rooms/${roomId}/members/${userId}`)
      return response
    } catch (error) {
      throw error
    }
  },

  // Rời khỏi phòng chat
  leaveRoom: async (roomId) => {
    try {
      const response = await apiService.delete(`/api/chat/rooms/${roomId}/leave`)
      return response
    } catch (error) {
      throw error
    }
  },

  // Cập nhật thông tin phòng (tên, avatar)
  updateRoomSettings: async (roomId, settings) => {
    try {
      // settings: { name, avatarUrl }
      const response = await apiService.put(`/api/chat/rooms/${roomId}/settings`, settings)
      return response
    } catch (error) {
      throw error
    }
  },

  // Lấy danh sách thành viên trong phòng
  getRoomMembers: async (roomId) => {
    try {
      const response = await apiService.get(`/api/chat/rooms/${roomId}/members`)
      return response
    } catch (error) {
      throw error
    }
  }
}
