import { apiService } from '@/shared/services/api.service';
import { API_ENDPOINTS } from '@/config/api.config';

/**
 * Service quản lý Bảng lương - kết nối với BangLuongController
 */
export const payrollService = {
  /**
   * Lấy danh sách tất cả bảng lương
   */
  getAll: async () => {
    return await apiService.get(API_ENDPOINTS.HR.PAYROLLS);
  },

  /**
   * Lấy thông tin bảng lương theo ID
   */
  getById: async (id) => {
    return await apiService.get(API_ENDPOINTS.HR.PAYROLL_BY_ID(id));
  },

  /**
   * Lấy bảng lương theo nhân viên
   */
  getByEmployee: async (empId) => {
    return await apiService.get(API_ENDPOINTS.HR.PAYROLL_BY_EMPLOYEE(empId));
  },

  /**
   * Lấy bảng lương theo tháng
   * @param {number} thang - Tháng (1-12)
   * @param {number} nam - Năm
   */
  getByMonth: async (thang, nam) => {
    return await apiService.get(API_ENDPOINTS.HR.PAYROLL_BY_MONTH, {
      params: { thang, nam }
    });
  },

  /**
   * Tính lương
   */
  calculate: async (data) => {
    return await apiService.post(API_ENDPOINTS.HR.PAYROLL_CALCULATE, data);
  },

  /**
   * Tạo bảng lương mới
   */
  create: async (data) => {
    return await apiService.post(API_ENDPOINTS.HR.PAYROLLS, data);
  },

  /**
   * Cập nhật bảng lương
   */
  update: async (id, data) => {
    return await apiService.put(API_ENDPOINTS.HR.PAYROLL_BY_ID(id), data);
  },

  /**
   * Xóa bảng lương
   */
  delete: async (id) => {
    return await apiService.delete(API_ENDPOINTS.HR.PAYROLL_BY_ID(id));
  },
};
