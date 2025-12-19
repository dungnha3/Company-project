import { apiService } from '@/shared/services/api.service';
import { API_ENDPOINTS } from '@/config/api.config';

/**
 * Service quản lý Nhân viên - kết nối với NhanVienController
 */
export const employeesService = {
  /**
   * Lấy danh sách tất cả nhân viên
   */
  getAll: async () => {
    return await apiService.get(API_ENDPOINTS.HR.EMPLOYEES);
  },

  /**
   * Lấy danh sách nhân viên có phân trang
   * @param {number} page - Trang hiện tại (0-indexed)
   * @param {number} size - Số lượng item mỗi trang
   * @param {string} sortBy - Trường để sắp xếp
   * @param {string} sortDir - Hướng sắp xếp (asc/desc)
   */
  getPage: async (page = 0, size = 10, sortBy = 'hoTen', sortDir = 'asc') => {
    return await apiService.get(API_ENDPOINTS.HR.EMPLOYEES_PAGE, {
      params: { page, size, sortBy, sortDir }
    });
  },

  /**
   * Lấy thông tin nhân viên theo ID
   */
  getById: async (id) => {
    return await apiService.get(API_ENDPOINTS.HR.EMPLOYEE_BY_ID(id));
  },

  /**
   * Lấy nhân viên theo User ID
   */
  getByUserId: async (userId) => {
    return await apiService.get(API_ENDPOINTS.HR.EMPLOYEE_BY_USER(userId));
  },

  /**
   * Lấy nhân viên theo trạng thái
   * @param {string} status - DANG_LAM_VIEC, NGHI_VIEC, NGHI_THAI_SAN
   */
  getByStatus: async (status) => {
    return await apiService.get(API_ENDPOINTS.HR.EMPLOYEE_BY_STATUS(status));
  },

  /**
   * Lấy nhân viên theo phòng ban
   */
  getByDepartment: async (deptId) => {
    return await apiService.get(API_ENDPOINTS.HR.EMPLOYEE_BY_DEPT(deptId));
  },

  /**
   * Lấy nhân viên theo chức vụ
   */
  getByPosition: async (posId) => {
    return await apiService.get(API_ENDPOINTS.HR.EMPLOYEE_BY_POSITION(posId));
  },

  /**
   * Tìm kiếm nhân viên theo keyword
   */
  search: async (keyword) => {
    return await apiService.get(API_ENDPOINTS.HR.EMPLOYEE_SEARCH, {
      params: { keyword }
    });
  },

  /**
   * Tạo nhân viên mới
   * @param {Object} data - Dữ liệu nhân viên
   */
  create: async (data) => {
    return await apiService.post(API_ENDPOINTS.HR.EMPLOYEES, data);
  },

  /**
   * Cập nhật thông tin nhân viên
   */
  update: async (id, data) => {
    return await apiService.put(API_ENDPOINTS.HR.EMPLOYEE_BY_ID(id), data);
  },

  /**
   * Cập nhật trạng thái nhân viên
   */
  updateStatus: async (id, status) => {
    return await apiService.patch(`${API_ENDPOINTS.HR.EMPLOYEE_BY_ID(id)}/trang-thai`, null, {
      params: { trangThai: status }
    });
  },

  /**
   * Xóa nhân viên
   */
  delete: async (id) => {
    return await apiService.delete(API_ENDPOINTS.HR.EMPLOYEE_BY_ID(id));
  },

  /**
   * Kiểm tra User đã có nhân viên chưa
   * @param {number} userId - User ID
   * @returns {Promise<{ hasNhanVien: boolean }>}
   */
  hasNhanVien: async (userId) => {
    return await apiService.get(`${API_ENDPOINTS.HR.EMPLOYEE_BY_USER(userId)}/exists`);
  },
};
