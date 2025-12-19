import { apiService } from './api.service'
import { API_ENDPOINTS } from '@/config/api.config'

/**
 * Payroll Service - Kết nối với BE BangLuongController
 * API Base: /api/bang-luong
 */
export const payrollService = {
  // ==================== CRUD Operations ====================

  /**
   * Lấy tất cả bảng lương
   */
  getAll: async () => {
    return await apiService.get(API_ENDPOINTS.HR.PAYROLLS)
  },

  /**
   * Lấy bảng lương có phân trang
   */
  getPage: async (page = 0, size = 10, sortBy = 'thang', sortDir = 'desc') => {
    return await apiService.get(API_ENDPOINTS.HR.PAYROLL_PAGE, {
      params: { page, size, sortBy, sortDir }
    })
  },

  /**
   * Lấy bảng lương theo ID
   */
  getById: async (id) => {
    return await apiService.get(API_ENDPOINTS.HR.PAYROLL_BY_ID(id))
  },

  /**
   * Tạo bảng lương mới
   */
  create: async (data) => {
    return await apiService.post(API_ENDPOINTS.HR.PAYROLLS, data)
  },

  /**
   * Cập nhật bảng lương
   */
  update: async (id, data) => {
    return await apiService.put(API_ENDPOINTS.HR.PAYROLL_BY_ID(id), data)
  },

  /**
   * Xóa bảng lương
   */
  delete: async (id) => {
    return await apiService.delete(API_ENDPOINTS.HR.PAYROLL_BY_ID(id))
  },

  // ==================== Query by Filters ====================

  /**
   * Lấy bảng lương theo tháng/năm
   */
  getByPeriod: async (thang, nam) => {
    return await apiService.get(API_ENDPOINTS.HR.PAYROLL_BY_PERIOD, {
      params: { thang, nam }
    })
  },

  /**
   * Lấy tất cả bảng lương của nhân viên
   */
  getByEmployee: async (employeeId) => {
    return await apiService.get(API_ENDPOINTS.HR.PAYROLL_BY_EMPLOYEE(employeeId))
  },

  /**
   * Lấy bảng lương của nhân viên theo tháng/năm
   */
  getByEmployeePeriod: async (employeeId, thang, nam) => {
    return await apiService.get(API_ENDPOINTS.HR.PAYROLL_EMPLOYEE_PERIOD(employeeId), {
      params: { thang, nam }
    })
  },

  /**
   * Lấy bảng lương theo trạng thái
   */
  getByStatus: async (status) => {
    return await apiService.get(API_ENDPOINTS.HR.PAYROLL_BY_STATUS(status))
  },

  // ==================== Actions ====================

  /**
   * Đánh dấu đã thanh toán
   */
  markAsPaid: async (id) => {
    return await apiService.patch(API_ENDPOINTS.HR.PAYROLL_MARK_PAID(id))
  },

  /**
   * Hủy bảng lương
   */
  cancel: async (id) => {
    return await apiService.patch(API_ENDPOINTS.HR.PAYROLL_CANCEL(id))
  },

  // ==================== Reports ====================

  /**
   * Tính tổng lương theo tháng/năm
   */
  getTotalByPeriod: async (thang, nam) => {
    return await apiService.get(API_ENDPOINTS.HR.PAYROLL_TOTAL_PERIOD, {
      params: { thang, nam }
    })
  },

  /**
   * Tính tổng lương của nhân viên trong năm
   */
  getTotalByEmployeeYear: async (employeeId, year) => {
    return await apiService.get(API_ENDPOINTS.HR.PAYROLL_TOTAL_EMPLOYEE_YEAR(employeeId, year))
  },

  // ==================== Auto Calculate ====================

  /**
   * Tính lương tự động cho 1 nhân viên
   */
  autoCalculate: async (employeeId, thang, nam) => {
    return await apiService.post(API_ENDPOINTS.HR.PAYROLL_AUTO_CALCULATE(employeeId), null, {
      params: { thang, nam }
    })
  },

  /**
   * Tính lương tự động cho tất cả nhân viên
   */
  autoCalculateAll: async (thang, nam) => {
    return await apiService.post(API_ENDPOINTS.HR.PAYROLL_AUTO_CALCULATE_ALL, null, {
      params: { thang, nam }
    })
  }
}
