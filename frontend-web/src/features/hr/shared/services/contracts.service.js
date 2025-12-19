import { apiService } from '@/shared/services/api.service';
import { API_ENDPOINTS } from '@/config/api.config';

/**
 * Service quản lý Hợp đồng - kết nối với HopDongController
 */
export const contractsService = {
  /**
   * Lấy danh sách tất cả hợp đồng
   */
  getAll: async () => {
    return await apiService.get(API_ENDPOINTS.HR.CONTRACTS);
  },

  /**
   * Lấy thông tin hợp đồng theo ID
   */
  getById: async (id) => {
    return await apiService.get(API_ENDPOINTS.HR.CONTRACT_BY_ID(id));
  },

  /**
   * Lấy hợp đồng theo nhân viên
   */
  getByEmployee: async (empId) => {
    return await apiService.get(API_ENDPOINTS.HR.CONTRACT_BY_EMPLOYEE(empId));
  },

  /**
   * Lấy hợp đồng đang hiệu lực của nhân viên
   */
  getActiveContract: async (empId) => {
    return await apiService.get(API_ENDPOINTS.HR.CONTRACT_ACTIVE(empId));
  },

  /**
   * Lấy hợp đồng theo trạng thái
   * @param {string} status - HIEU_LUC, HET_HAN, BI_HUY
   */
  getByStatus: async (status) => {
    return await apiService.get(API_ENDPOINTS.HR.CONTRACT_BY_STATUS(status));
  },

  /**
   * Lấy danh sách hợp đồng sắp hết hạn
   * @param {number} daysAhead - Số ngày trước khi hết hạn (default: 30)
   */
  getExpiring: async (daysAhead = 30) => {
    return await apiService.get(API_ENDPOINTS.HR.CONTRACT_EXPIRING, {
      params: { daysAhead }
    });
  },

  /**
   * Tạo hợp đồng mới
   * @param {Object} data - Dữ liệu hợp đồng
   */
  create: async (data) => {
    return await apiService.post(API_ENDPOINTS.HR.CONTRACTS, data);
  },

  /**
   * Cập nhật thông tin hợp đồng
   */
  update: async (id, data) => {
    return await apiService.put(API_ENDPOINTS.HR.CONTRACT_BY_ID(id), data);
  },

  /**
   * Hủy hợp đồng
   */
  cancel: async (id) => {
    return await apiService.patch(API_ENDPOINTS.HR.CONTRACT_CANCEL(id));
  },

  /**
   * Gia hạn hợp đồng
   * @param {number} id - ID hợp đồng
   * @param {string} newEndDate - Ngày kết thúc mới (format: YYYY-MM-DD)
   */
  renew: async (id, newEndDate) => {
    return await apiService.patch(API_ENDPOINTS.HR.CONTRACT_RENEW(id), null, {
      params: { newEndDate }
    });
  },

  /**
   * Xóa hợp đồng
   */
  delete: async (id) => {
    return await apiService.delete(API_ENDPOINTS.HR.CONTRACT_BY_ID(id));
  },
};
