import { apiService } from './api.service'

export const profileService = {
  getProfile: async () => {
    return await apiService.get('/api/profile/me')
  },

  updateProfile: async (data) => {
    return await apiService.put('/api/profile/me', data)
  },

  changePassword: async (data) => {
    return await apiService.post('/api/profile/change-password', data)
  }
}
