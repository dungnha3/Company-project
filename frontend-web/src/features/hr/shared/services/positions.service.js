import { apiService } from '@/shared/services/api.service';
import { API_ENDPOINTS } from '@/config/api.config';

/**
 * Service quản lý Chức vụ - kết nối với ChucVuController
 */
export const positionsService = {
  /**
   * Lấy danh sách tất cả chức vụ
   */
  getAll: async () => {
    return await apiService.get(API_ENDPOINTS.HR.POSITIONS);
  },

  /**
   * Lấy thông tin chức vụ theo ID
   */
  getById: async (id) => {
    return await apiService.get(API_ENDPOINTS.HR.POSITION_BY_ID(id));
  },

  /**
   * Tạo chức vụ mới
   * @param {Object} data - { tenChucVu, moTa, heSoLuong }
   */
  create: async (data) => {
    return await apiService.post(API_ENDPOINTS.HR.POSITIONS, data);
  },

  /**
   * Cập nhật thông tin chức vụ
   */
  update: async (id, data) => {
    return await apiService.put(API_ENDPOINTS.HR.POSITION_BY_ID(id), data);
  },

  /**
   * Xóa chức vụ
   */
  delete: async (id) => {
    return await apiService.delete(API_ENDPOINTS.HR.POSITION_BY_ID(id));
  },
};
