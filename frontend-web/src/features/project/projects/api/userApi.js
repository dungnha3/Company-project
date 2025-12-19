import { apiService } from '@/shared/services/api.service'

// User API for project module
export const userApi = {
  // Search users by email or username
  searchUsers: async (query) => {
    try {
      // Call /api/users/search with 'keyword' param (matching backend)
      const response = await apiService.get(`/api/users/search?keyword=${encodeURIComponent(query)}`)
      return response
    } catch (error) {
      throw error
    }
  },

  // Get user by ID
  getUserById: async (userId) => {
    try {
      const response = await apiService.get(`/api/users/${userId}`)
      return response
    } catch (error) {
      throw error;
    }
  },

  // Get all users (for dropdown, etc.)
  getAllUsers: async () => {
    try {
      const response = await apiService.get('/api/users')
      return response
    } catch (error) {
      throw error;
    }
  }
}
