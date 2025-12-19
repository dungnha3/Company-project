import { apiService } from './api.service'

export const notificationService = {
  // Get all notifications for current user
  getMyNotifications: async (page = 0, size = 20) => {
    try {
      // Use ThongBaoController endpoint
      // CRITICAL FIX: Use sortBy=thongbaoId to avoid duplicate column error in SQL Server
      // The repository already hardcodes 'ORDER BY ngayTao', so we must NOT sort by ngayTao in Pageable
      const response = await apiService.get(`/api/thong-bao/page?page=${page}&size=${size}&sortBy=thongbaoId&sortDir=desc`)

      // Check if response is a Page object (has content field) or a List
      const items = response.content || response || []

      // Map Vietnamese DTO fields to English fields expected by UI
      return items.map(item => ({
        notificationId: item.thongbaoId,
        title: item.tieuDe,
        content: item.noiDung,
        type: item.loai,
        isRead: item.trangThai === 'DA_DOC' || !!item.ngayDoc,
        createdAt: item.ngayTao,
        link: item.urlLienKet,
        uuTien: item.uuTien,           // Priority field
        trangThai: item.trangThai       // Status field
      }))
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return []
    }
  },

  // Get unread count
  getUnreadCount: async () => {
    try {
      // Use ThongBaoController endpoint
      const response = await apiService.get('/api/thong-bao/unread-count')
      return response ? response.unreadCount : 0
    } catch (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }
  },

  // Create notification (Admin/HR only)
  createNotification: async (data) => {
    try {
      console.log('Creating notification with data:', JSON.stringify(data, null, 2))
      const response = await apiService.post('/api/thong-bao', data)
      console.log('Notification created successfully:', response)
      return response
    } catch (error) {
      console.error('Error creating notification:', error)
      console.error('Error response:', error.response?.data)
      throw error
    }
  },

  // Get all notifications (Admin only - for management page)
  getAllNotifications: async (page = 0, size = 10) => {
    try {
      // Use Admin-only endpoint to get ALL notifications in system
      const response = await apiService.get(`/api/thong-bao/admin/all?page=${page}&size=${size}&sortBy=thongbaoId&sortDir=desc`)
      return response // Return full page object with content, totalPages, totalElements
    } catch (error) {
      console.error('Error fetching all notifications:', error)
      return { content: [], totalPages: 0, totalElements: 0 }
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    try {
      const response = await apiService.put(`/api/thong-bao/${notificationId}/read`)
      return response
    } catch (error) {
      throw error
    }
  },

  // Mark all as read
  markAllAsRead: async () => {
    try {
      const response = await apiService.put('/api/thong-bao/mark-all-read')
      return response
    } catch (error) {
      throw error
    }
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    try {
      const response = await apiService.delete(`/api/thong-bao/${notificationId}`)
      return response
    } catch (error) {
      throw error
    }
  }
}

