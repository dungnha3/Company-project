import { apiService } from '@/shared/services/api.service';
import { API_ENDPOINTS } from '@/config/api.config';

/**
 * Service Dashboard HR - kết nối với DashboardController
 */
export const dashboardService = {
  /**
   * Lấy thống kê tổng quan
   */
  getOverview: async () => {
    return await apiService.get(API_ENDPOINTS.HR.DASHBOARD);
  },

  /**
   * Lấy thống kê theo tháng
   * @param {number} thang - Tháng (1-12)
   * @param {number} nam - Năm
   */
  getByMonth: async (thang, nam) => {
    return await apiService.get(API_ENDPOINTS.HR.DASHBOARD_BY_MONTH, {
      params: { thang, nam }
    });
  },

  /**
   * Lấy thống kê chi tiết (Dashboard nâng cao)
   */
  getStats: async () => {
    return await apiService.get(API_ENDPOINTS.HR.DASHBOARD_STATS);
  },

  /**
   * Lấy biểu đồ chấm công theo phòng ban
   */
  getAttendanceByDepartment: async () => {
    return await apiService.get(API_ENDPOINTS.HR.DASHBOARD_ATTENDANCE);
  },

  /**
   * Lấy biểu đồ lương theo tháng
   */
  getSalaryTrend: async () => {
    return await apiService.get(API_ENDPOINTS.HR.DASHBOARD_SALARY);
  },

  /**
   * Lấy thống kê nhân viên theo độ tuổi
   */
  getEmployeesByAge: async () => {
    return await apiService.get(API_ENDPOINTS.HR.DASHBOARD_AGE);
  },

  /**
   * Lấy thống kê nhân viên theo giới tính
   */
  getEmployeesByGender: async () => {
    return await apiService.get(API_ENDPOINTS.HR.DASHBOARD_GENDER);
  },
};
