import { apiService } from './api.service'

export const attendanceService = {
  getAll: async () => {
    return await apiService.get('/api/cham-cong')
  },

  getByEmployee: async (employeeId) => {
    return await apiService.get(`/api/cham-cong/nhan-vien/${employeeId}`)
  },

  // Fixed: Backend uses query params, not path params
  getByMonth: async (employeeId, year, month) => {
    return await apiService.get(`/api/cham-cong/nhan-vien/${employeeId}/month`, {
      params: { year, month }
    })
  },

  getByDateRange: async (startDate, endDate) => {
    return await apiService.get('/api/cham-cong/date-range', {
      params: { startDate, endDate }
    })
  },

  checkIn: async (employeeId, date) => {
    return await apiService.post('/api/cham-cong/check-in', null, {
      params: { nhanvienId: employeeId, ngayCham: date }
    })
  },

  checkOut: async (attendanceId) => {
    return await apiService.patch(`/api/cham-cong/${attendanceId}/check-out`)
  },

  getStatus: async (employeeId) => {
    return await apiService.get(`/api/cham-cong/status/${employeeId}`)
  },

  // Get statistics (lateDays, earlyLeaveDays, workingDays)
  getStatistics: async (employeeId, year, month) => {
    return await apiService.get(`/api/cham-cong/nhan-vien/${employeeId}/statistics`, {
      params: { year, month }
    })
  },

  // Get total hours
  getTotalHours: async (employeeId, year, month) => {
    return await apiService.get(`/api/cham-cong/nhan-vien/${employeeId}/total-hours`, {
      params: { year, month }
    })
  },

  create: async (data) => {
    return await apiService.post('/api/cham-cong', data)
  },

  delete: async (id) => {
    return await apiService.delete(`/api/cham-cong/${id}`)
  }
}

