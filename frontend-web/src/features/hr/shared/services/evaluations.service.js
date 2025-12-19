import { apiService } from '@/shared/services/api.service';
import { API_ENDPOINTS } from '@/config/api.config';

/**
 * Service quản lý Đánh giá - kết nối với DanhGiaController
 */
export const evaluationsService = {
  /**
   * Lấy danh sách tất cả đánh giá
   */
  getAll: async () => {
    return await apiService.get(API_ENDPOINTS.HR.EVALUATIONS);
  },

  /**
   * Lấy danh sách đánh giá có phân trang
   * @param {number} page - Số trang (0-indexed)
   * @param {number} size - Số lượng item mỗi trang
   * @param {string} sortBy - Field để sắp xếp
   * @param {string} sortDir - Hướng sắp xếp (asc/desc)
   */
  getPage: async (page = 0, size = 10, sortBy = 'createdAt', sortDir = 'desc') => {
    return await apiService.get(API_ENDPOINTS.HR.EVALUATION_PAGE, {
      params: { page, size, sortBy, sortDir }
    });
  },

  /**
   * Lấy thông tin đánh giá theo ID
   */
  getById: async (id) => {
    return await apiService.get(API_ENDPOINTS.HR.EVALUATION_BY_ID(id));
  },

  /**
   * Lấy đánh giá theo nhân viên
   */
  getByEmployee: async (empId) => {
    return await apiService.get(API_ENDPOINTS.HR.EVALUATION_BY_EMPLOYEE(empId));
  },

  /**
   * Lấy danh sách đánh giá chờ duyệt
   */
  getPending: async () => {
    return await apiService.get(API_ENDPOINTS.HR.EVALUATION_PENDING);
  },

  /**
   * Tạo đánh giá mới
   */
  create: async (data) => {
    return await apiService.post(API_ENDPOINTS.HR.EVALUATIONS, data);
  },

  /**
   * Cập nhật đánh giá
   */
  update: async (id, data) => {
    return await apiService.put(API_ENDPOINTS.HR.EVALUATION_BY_ID(id), data);
  },

  /**
   * Gửi đánh giá để duyệt
   */
  submit: async (id) => {
    return await apiService.patch(API_ENDPOINTS.HR.EVALUATION_SUBMIT(id));
  },

  /**
   * Phê duyệt đánh giá
   * @param {number} id - ID đánh giá
   * @param {string} ghiChu - Ghi chú (optional)
   */
  approve: async (id, ghiChu = '') => {
    return await apiService.patch(API_ENDPOINTS.HR.EVALUATION_APPROVE(id), { ghiChu });
  },

  /**
   * Từ chối đánh giá
   * @param {number} id - ID đánh giá
   * @param {string} lyDo - Lý do từ chối
   */
  reject: async (id, lyDo) => {
    return await apiService.patch(API_ENDPOINTS.HR.EVALUATION_REJECT(id), { lyDo });
  },

  /**
   * Xóa đánh giá
   */
  delete: async (id) => {
    return await apiService.delete(API_ENDPOINTS.HR.EVALUATION_BY_ID(id));
  },
};
