import { apiService } from '@/shared/services/api.service';
import { API_ENDPOINTS } from '@/config/api.config';

/**
 * Service quản lý Phòng ban - kết nối với PhongBanController
 */
export const departmentsService = {
  /**
   * Lấy danh sách tất cả phòng ban
   */
  getAll: async () => {
    return await apiService.get(API_ENDPOINTS.HR.DEPARTMENTS);
  },

  /**
   * Lấy thông tin phòng ban theo ID
   */
  getById: async (id) => {
    return await apiService.get(API_ENDPOINTS.HR.DEPARTMENT_BY_ID(id));
  },

  /**
   * Tạo phòng ban mới
   * @param {Object} data - { tenPhongBan, moTa, truongPhongId }
   */
  create: async (data) => {
    return await apiService.post(API_ENDPOINTS.HR.DEPARTMENTS, data);
  },

  /**
   * Cập nhật thông tin phòng ban
   */
  update: async (id, data) => {
    return await apiService.put(API_ENDPOINTS.HR.DEPARTMENT_BY_ID(id), data);
  },

  /**
   * Xóa phòng ban
   */
  delete: async (id) => {
    return await apiService.delete(API_ENDPOINTS.HR.DEPARTMENT_BY_ID(id));
  },
};
