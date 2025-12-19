import { apiService } from '@/shared/services/api.service';
import { API_ENDPOINTS } from '@/config/api.config';

/**
 * Service quản lý Chấm công - kết nối với ChamCongController
 */
export const attendanceService = {
  /**
   * Lấy danh sách tất cả chấm công
   */
  getAll: async () => {
    return await apiService.get(API_ENDPOINTS.HR.ATTENDANCES);
  },

  /**
   * Lấy thông tin chấm công theo ID
   */
  getById: async (id) => {
    return await apiService.get(API_ENDPOINTS.HR.ATTENDANCE_BY_ID(id));
  },

  /**
   * Lấy chấm công theo nhân viên
   */
  getByEmployee: async (empId) => {
    return await apiService.get(API_ENDPOINTS.HR.ATTENDANCE_BY_EMPLOYEE(empId));
  },

  /**
   * Lấy chấm công theo khoảng thời gian
   * @param {string} startDate - Ngày bắt đầu (YYYY-MM-DD)
   * @param {string} endDate - Ngày kết thúc (YYYY-MM-DD)
   */
  getByDateRange: async (startDate, endDate) => {
    return await apiService.get(API_ENDPOINTS.HR.ATTENDANCE_DATE_RANGE, {
      params: { startDate, endDate }
    });
  },

  /**
   * Lấy chấm công của nhân viên trong tháng
   * @param {number} empId - ID nhân viên
   * @param {number} year - Năm
   * @param {number} month - Tháng (1-12)
   */
  getByMonth: async (empId, year, month) => {
    return await apiService.get(API_ENDPOINTS.HR.ATTENDANCE_BY_MONTH(empId), {
      params: { year, month }
    });
  },

  /**
   * Tính số ngày công của nhân viên trong tháng
   */
  getWorkingDays: async (empId, year, month) => {
    return await apiService.get(API_ENDPOINTS.HR.ATTENDANCE_WORKING_DAYS(empId), {
      params: { year, month }
    });
  },

  /**
   * Tính tổng số giờ làm việc của nhân viên trong tháng
   */
  getTotalHours: async (empId, year, month) => {
    return await apiService.get(API_ENDPOINTS.HR.ATTENDANCE_TOTAL_HOURS(empId), {
      params: { year, month }
    });
  },

  /**
   * Thống kê đi trễ/về sớm của nhân viên trong tháng
   */
  getStatistics: async (empId, year, month) => {
    return await apiService.get(API_ENDPOINTS.HR.ATTENDANCE_STATISTICS(empId), {
      params: { year, month }
    });
  },

  /**
   * Check-in (chấm công vào)
   * @param {number} nhanvienId - ID nhân viên
   * @param {string} ngayCham - Ngày chấm (YYYY-MM-DD)
   */
  checkIn: async (nhanvienId, ngayCham) => {
    return await apiService.post(API_ENDPOINTS.HR.ATTENDANCE_CHECKIN, null, {
      params: { nhanvienId, ngayCham }
    });
  },

  /**
   * Check-out (chấm công ra)
   * @param {number} id - ID bản ghi chấm công
   */
  checkOut: async (id) => {
    return await apiService.patch(API_ENDPOINTS.HR.ATTENDANCE_CHECKOUT(id));
  },

  /**
   * Chấm công GPS
   * @param {object} data - { nhanvienId, latitude, longitude, diaChiCheckin }
   */
  gpsCheckIn: async (data) => {
    return await apiService.post(API_ENDPOINTS.HR.ATTENDANCE_GPS, data);
  },

  /**
   * Lấy trạng thái chấm công hôm nay
   */
  getStatus: async (empId) => {
    return await apiService.get(API_ENDPOINTS.HR.ATTENDANCE_STATUS(empId));
  },

  /**
   * Tạo chấm công mới
   */
  create: async (data) => {
    return await apiService.post(API_ENDPOINTS.HR.ATTENDANCES, data);
  },

  /**
   * Cập nhật chấm công
   */
  update: async (id, data) => {
    return await apiService.put(API_ENDPOINTS.HR.ATTENDANCE_BY_ID(id), data);
  },

  /**
   * Xóa chấm công
   */
  delete: async (id) => {
    return await apiService.delete(API_ENDPOINTS.HR.ATTENDANCE_BY_ID(id));
  },
};
