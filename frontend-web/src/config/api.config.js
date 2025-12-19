export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8080';

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    LOGOUT_ALL: '/api/auth/logout-all',
    REFRESH: '/api/auth/refresh',
    VALIDATE: '/api/auth/validate',
    PROFILE: '/api/profile/me',
  },

  // Users
  USERS: {
    BASE: '/api/users',
    BY_ID: (id) => `/api/users/${id}`,
    SEARCH: '/api/users/search',
    ONLINE: '/api/users/online',
  },

  // HR - Đã cập nhật theo BE API
  HR: {
    // Nhân viên
    EMPLOYEES: '/api/nhan-vien',
    EMPLOYEE_BY_ID: (id) => `/api/nhan-vien/${id}`,
    EMPLOYEES_PAGE: '/api/nhan-vien/page',
    EMPLOYEE_BY_USER: (userId) => `/api/nhan-vien/user/${userId}`,
    EMPLOYEE_BY_STATUS: (status) => `/api/nhan-vien/trang-thai/${status}`,
    EMPLOYEE_BY_DEPT: (deptId) => `/api/nhan-vien/phong-ban/${deptId}`,
    EMPLOYEE_BY_POSITION: (posId) => `/api/nhan-vien/chuc-vu/${posId}`,
    EMPLOYEE_SEARCH: '/api/nhan-vien/search',

    // Phòng ban
    DEPARTMENTS: '/api/phong-ban',
    DEPARTMENT_BY_ID: (id) => `/api/phong-ban/${id}`,

    // Chức vụ
    POSITIONS: '/api/chuc-vu',
    POSITION_BY_ID: (id) => `/api/chuc-vu/${id}`,

    // Hợp đồng
    CONTRACTS: '/api/hop-dong',
    CONTRACT_BY_ID: (id) => `/api/hop-dong/${id}`,
    CONTRACT_BY_EMPLOYEE: (empId) => `/api/hop-dong/nhan-vien/${empId}`,
    CONTRACT_ACTIVE: (empId) => `/api/hop-dong/nhan-vien/${empId}/active`,
    CONTRACT_BY_STATUS: (status) => `/api/hop-dong/trang-thai/${status}`,
    CONTRACT_EXPIRING: '/api/hop-dong/expiring',
    CONTRACT_CANCEL: (id) => `/api/hop-dong/${id}/cancel`,
    CONTRACT_RENEW: (id) => `/api/hop-dong/${id}/renew`,

    // Dashboard
    DASHBOARD: '/api/dashboard/tong-quan',
    DASHBOARD_STATS: '/api/dashboard/stats',
    DASHBOARD_BY_MONTH: '/api/dashboard/thang',
    DASHBOARD_ATTENDANCE: '/api/dashboard/cham-cong-phong-ban',
    DASHBOARD_SALARY: '/api/dashboard/luong-theo-thang',
    DASHBOARD_AGE: '/api/dashboard/nhan-vien-theo-tuoi',
    DASHBOARD_GENDER: '/api/dashboard/nhan-vien-theo-gioi-tinh',

    // Chấm công
    ATTENDANCES: '/api/cham-cong',
    ATTENDANCE_BY_ID: (id) => `/api/cham-cong/${id}`,
    ATTENDANCE_BY_EMPLOYEE: (empId) => `/api/cham-cong/nhan-vien/${empId}`,
    ATTENDANCE_DATE_RANGE: '/api/cham-cong/date-range',
    ATTENDANCE_BY_MONTH: (empId) => `/api/cham-cong/nhan-vien/${empId}/month`,
    ATTENDANCE_WORKING_DAYS: (empId) => `/api/cham-cong/nhan-vien/${empId}/working-days`,
    ATTENDANCE_TOTAL_HOURS: (empId) => `/api/cham-cong/nhan-vien/${empId}/total-hours`,
    ATTENDANCE_STATISTICS: (empId) => `/api/cham-cong/nhan-vien/${empId}/statistics`,
    ATTENDANCE_CHECKIN: '/api/cham-cong/check-in',
    ATTENDANCE_CHECKOUT: (id) => `/api/cham-cong/${id}/check-out`,
    ATTENDANCE_GPS: '/api/cham-cong/gps',
    ATTENDANCE_STATUS: (empId) => `/api/cham-cong/status/${empId}`,

    // Nghỉ phép
    LEAVES: '/api/nghi-phep',
    LEAVE_BY_ID: (id) => `/api/nghi-phep/${id}`,
    LEAVE_BY_EMPLOYEE: (empId) => `/api/nghi-phep/nhan-vien/${empId}`,
    LEAVE_DATE_RANGE: '/api/nghi-phep/date-range',
    LEAVE_PENDING: '/api/nghi-phep/pending',
    LEAVE_APPROVED: '/api/nghi-phep/approved',
    LEAVE_REJECTED: '/api/nghi-phep/rejected',
    LEAVE_APPROVE: (id) => `/api/nghi-phep/${id}/approve`,
    LEAVE_REJECT: (id) => `/api/nghi-phep/${id}/reject`,
    LEAVE_TOTAL_DAYS: (empId) => `/api/nghi-phep/nhan-vien/${empId}/total-days`,
    LEAVE_IS_ON_LEAVE: (empId) => `/api/nghi-phep/nhan-vien/${empId}/is-on-leave`,

    // Đánh giá
    EVALUATIONS: '/api/danh-gia',
    EVALUATION_BY_ID: (id) => `/api/danh-gia/${id}`,
    EVALUATION_PAGE: '/api/danh-gia/page',
    EVALUATION_BY_EMPLOYEE: (empId) => `/api/danh-gia/nhan-vien/${empId}`,
    EVALUATION_PENDING: '/api/danh-gia/pending',
    EVALUATION_SUBMIT: (id) => `/api/danh-gia/${id}/submit`,
    EVALUATION_APPROVE: (id) => `/api/danh-gia/${id}/approve`,
    EVALUATION_REJECT: (id) => `/api/danh-gia/${id}/reject`,

    // Bảng lương - Full API matching BangLuongController
    PAYROLLS: '/api/bang-luong',
    PAYROLL_PAGE: '/api/bang-luong/page',
    PAYROLL_BY_ID: (id) => `/api/bang-luong/${id}`,
    PAYROLL_BY_EMPLOYEE: (empId) => `/api/bang-luong/nhan-vien/${empId}`,
    PAYROLL_BY_PERIOD: '/api/bang-luong/period',
    PAYROLL_EMPLOYEE_PERIOD: (empId) => `/api/bang-luong/nhan-vien/${empId}/period`,
    PAYROLL_BY_STATUS: (status) => `/api/bang-luong/trang-thai/${status}`,
    PAYROLL_MARK_PAID: (id) => `/api/bang-luong/${id}/mark-paid`,
    PAYROLL_CANCEL: (id) => `/api/bang-luong/${id}/cancel`,
    PAYROLL_TOTAL_PERIOD: '/api/bang-luong/total/period',
    PAYROLL_TOTAL_EMPLOYEE_YEAR: (empId, year) => `/api/bang-luong/total/nhan-vien/${empId}/year/${year}`,
    PAYROLL_AUTO_CALCULATE: (empId) => `/api/bang-luong/tinh-tu-dong/${empId}`,
    PAYROLL_AUTO_CALCULATE_ALL: '/api/bang-luong/tinh-tu-dong-tat-ca',
  },

  // Projects
  PROJECTS: {
    LIST: '/api/projects',
    BY_ID: (id) => `/api/projects/${id}`,
    PAGE: '/api/projects/page',
    BY_USER: (userId) => `/api/projects/user/${userId}`,
    BY_STATUS: (status) => `/api/projects/status/${status}`,
    BY_DEPARTMENT: (deptId) => `/api/projects/department/${deptId}`,
    SEARCH: '/api/projects/search',
  },

  // Issues
  ISSUES: {
    LIST: '/api/issues',
    BY_ID: (id) => `/api/issues/${id}`,
    BY_PROJECT: (projectId) => `/api/issues/project/${projectId}`,
    BY_SPRINT: (sprintId) => `/api/issues/sprint/${sprintId}`,
    BY_ASSIGNEE: (userId) => `/api/issues/assignee/${userId}`,
    BY_STATUS: (statusId) => `/api/issues/status/${statusId}`,
    BY_PRIORITY: (priority) => `/api/issues/priority/${priority}`,
    SEARCH: '/api/issues/search',
  },

  // Sprints
  SPRINTS: {
    LIST: '/api/sprints',
    BY_ID: (id) => `/api/sprints/${id}`,
    BY_PROJECT: (projectId) => `/api/sprints/project/${projectId}`,
    BY_STATUS: (status) => `/api/sprints/status/${status}`,
  },

  // Notifications
  NOTIFICATIONS: {
    BASE: '/api/notifications',
    UNREAD: '/api/notifications/unread',
    MARK_READ: (id) => `/api/notifications/${id}/read`,
  },

  // Chat
  CHAT: {
    ROOMS: '/api/chat/rooms',
    MESSAGES: '/api/chat/messages',
  },
};
