import { apiService } from '@/shared/services/api.service';
import { API_ENDPOINTS } from '@/config/api.config';

/**
 * Service quản lý Nghỉ phép - kết nối với NghiPhepController
 */
export const leavesService = {
  /**
   * Lấy danh sách tất cả đơn nghỉ phép
   */
  getAll: async () => {
    return await apiService.get(API_ENDPOINTS.HR.LEAVES);
  },

  /**
   * Lấy thông tin đơn nghỉ phép theo ID
   */
  getById: async (id) => {
    return await apiService.get(API_ENDPOINTS.HR.LEAVE_BY_ID(id));
  },

  /**
   * Lấy đơn nghỉ phép theo nhân viên
   */
  getByEmployee: async (empId) => {
    return await apiService.get(API_ENDPOINTS.HR.LEAVE_BY_EMPLOYEE(empId));
  },

  /**
   * Lấy đơn nghỉ phép theo trạng thái
   * @param {string} status - CHO_DUYET, DA_DUYET, BI_TU_CHOI
   */
  getByStatus: async (status) => {
    return await apiService.get(API_ENDPOINTS.HR.LEAVE_BY_STATUS(status));
  },

  /**
   * Lấy danh sách đơn chờ duyệt
   */
  getPending: async () => {
    return await apiService.get(API_ENDPOINTS.HR.LEAVE_PENDING);
  },

  /**
   * Tạo đơn nghỉ phép mới
   */
  create: async (data) => {
    return await apiService.post(API_ENDPOINTS.HR.LEAVES, data);
  },

  /**
   * Cập nhật đơn nghỉ phép
   */
  update: async (id, data) => {
    return await apiService.put(API_ENDPOINTS.HR.LEAVE_BY_ID(id), data);
  },

  /**
   * Lấy danh sách đơn nghỉ phép đã duyệt
   */
  getApproved: async () => {
    return await apiService.get(API_ENDPOINTS.HR.LEAVE_APPROVED);
  },

  /**
   * Lấy danh sách đơn nghỉ phép bị từ chối
   */
  getRejected: async () => {
    return await apiService.get(API_ENDPOINTS.HR.LEAVE_REJECTED);
  },

  /**
   * Lấy nghỉ phép trong khoảng thời gian
   * @param {string} startDate - Ngày bắt đầu (YYYY-MM-DD)
   * @param {string} endDate - Ngày kết thúc (YYYY-MM-DD)
   */
  getByDateRange: async (startDate, endDate) => {
    return await apiService.get(API_ENDPOINTS.HR.LEAVE_DATE_RANGE, {
      params: { startDate, endDate }
    });
  },

  /**
   * Phê duyệt đơn nghỉ phép
   * @param {number} id - ID đơn nghỉ phép
   * @param {string} ghiChu - Ghi chú (optional)
   */
  approve: async (id, ghiChu = '') => {
    return await apiService.patch(API_ENDPOINTS.HR.LEAVE_APPROVE(id), { ghiChu });
  },

  /**
   * Từ chối đơn nghỉ phép
   * @param {number} id - ID đơn nghỉ phép
   * @param {string} ghiChu - Lý do từ chối
   */
  reject: async (id, ghiChu) => {
    return await apiService.patch(API_ENDPOINTS.HR.LEAVE_REJECT(id), { ghiChu });
  },

  /**
   * Tính tổng số ngày nghỉ của nhân viên trong năm
   */
  getTotalLeaveDays: async (empId, year) => {
    return await apiService.get(API_ENDPOINTS.HR.LEAVE_TOTAL_DAYS(empId), {
      params: { year }
    });
  },

  /**
   * Kiểm tra nhân viên có đang nghỉ phép không
   * @param {number} empId - ID nhân viên
   * @param {string} date - Ngày kiểm tra (YYYY-MM-DD)
   */
  isOnLeave: async (empId, date) => {
    return await apiService.get(API_ENDPOINTS.HR.LEAVE_IS_ON_LEAVE(empId), {
      params: { date }
    });
  },

  /**
   * Xóa đơn nghỉ phép
   */
  delete: async (id) => {
    return await apiService.delete(API_ENDPOINTS.HR.LEAVE_BY_ID(id));
  },
};
