// Mock data for Admin Dashboard

// Admin KPI Data
export const adminKpiData = {
  totalEmployees: 156,
  activeEmployees: 142,
  pendingRequests: 8,
  totalDepartments: 12
}

// Employee Management Data
export const employeeData = [
  { id: 1, name: 'Nguyễn Văn A', department: 'IT', position: 'Developer', status: 'active', joinDate: '2023-01-15' },
  { id: 2, name: 'Trần Thị B', department: 'HR', position: 'HR Manager', status: 'active', joinDate: '2022-03-20' },
  { id: 3, name: 'Lê Văn C', department: 'Marketing', position: 'Marketing Specialist', status: 'leave', joinDate: '2023-05-10' },
  { id: 4, name: 'Phạm Thị D', department: 'Finance', position: 'Accountant', status: 'active', joinDate: '2022-11-08' },
  { id: 5, name: 'Hoàng Văn E', department: 'IT', position: 'Senior Developer', status: 'inactive', joinDate: '2021-07-12' },
]

// Department Data
export const departmentData = [
  { id: 1, name: 'Phòng IT', employeeCount: 25, icon: '💻', status: 'active' },
  { id: 2, name: 'Phòng HR', employeeCount: 8, icon: '👥', status: 'active' },
  { id: 3, name: 'Phòng Marketing', employeeCount: 15, icon: '📢', status: 'active' },
  { id: 4, name: 'Phòng Tài chính', employeeCount: 12, icon: '💰', status: 'active' },
  { id: 5, name: 'Phòng Kinh doanh', employeeCount: 20, icon: '📊', status: 'pending' },
]

// Leave Requests for Admin Review
export const leaveRequestsAdmin = [
  { id: 1, employeeName: 'Nguyễn Văn A', type: 'Nghỉ phép', startDate: '2025-11-15', endDate: '2025-11-17', status: 'pending', reason: 'Nghỉ phép cá nhân' },
  { id: 2, employeeName: 'Trần Thị B', type: 'Nghỉ ốm', startDate: '2025-11-12', endDate: '2025-11-12', status: 'approved', reason: 'Khám bệnh định kỳ' },
  { id: 3, employeeName: 'Lê Văn C', type: 'Nghỉ việc riêng', startDate: '2025-11-20', endDate: '2025-11-20', status: 'pending', reason: 'Giải quyết việc cá nhân' },
  { id: 4, employeeName: 'Phạm Thị D', type: 'Nghỉ phép', startDate: '2025-11-10', endDate: '2025-11-11', status: 'rejected', reason: 'Du lịch gia đình' },
]

// Attendance Overview
export const attendanceOverview = [
  { date: '2025-11-08', present: 142, absent: 8, late: 6, early: 2 },
  { date: '2025-11-07', present: 145, absent: 5, late: 4, early: 1 },
  { date: '2025-11-06', present: 148, absent: 3, late: 3, early: 2 },
  { date: '2025-11-05', present: 150, absent: 2, late: 2, early: 0 },
  { date: '2025-11-04', present: 149, absent: 4, late: 5, early: 1 },
]

// Admin Notifications
export const adminNotifications = [
  { title: 'Đơn xin nghỉ mới', desc: 'Nguyễn Văn A đã gửi đơn xin nghỉ phép', date: '30 phút trước', type: 'request' },
  { title: 'Báo cáo tháng', desc: 'Báo cáo chấm công tháng 10 đã sẵn sàng', date: '2 giờ trước', type: 'report' },
  { title: 'Nhân viên mới', desc: 'Có 2 nhân viên mới cần được phê duyệt', date: '1 ngày trước', type: 'employee' },
]

// Payroll Overview
export const payrollOverview = [
  { month: 'Tháng 10/2025', totalAmount: '2.450.000.000đ', employees: 156, status: 'completed' },
  { month: 'Tháng 9/2025', totalAmount: '2.380.000.000đ', employees: 154, status: 'completed' },
  { month: 'Tháng 8/2025', totalAmount: '2.420.000.000đ', employees: 152, status: 'completed' },
]

// Recent Activities
export const recentActivities = [
  { id: 1, action: 'Phê duyệt đơn nghỉ phép', employee: 'Trần Thị B', time: '10:30', icon: '✅' },
  { id: 2, action: 'Thêm nhân viên mới', employee: 'Hoàng Văn F', time: '09:15', icon: '👤' },
  { id: 3, action: 'Cập nhật lương', employee: 'Nguyễn Văn A', time: '08:45', icon: '💰' },
  { id: 4, action: 'Tạo phòng ban mới', employee: 'Phòng R&D', time: 'Hôm qua', icon: '🏢' },
]

// Menu Sections Configuration for Admin
export const adminSectionsConfig = {
  dashboard: {
    title: 'Tổng quan',
    pageTitle: 'Tổng quan hệ thống',
    subtitle: 'Quản lý và theo dõi toàn bộ hệ thống',
  },
  employees: {
    title: 'Quản lý nhân viên',
    pageTitle: 'Quản lý nhân viên',
    subtitle: 'Xem danh sách và quản lý thông tin nhân viên',
  },
  departments: {
    title: 'Quản lý phòng ban',
    pageTitle: 'Quản lý phòng ban',
    subtitle: 'Tổ chức và quản lý các phòng ban',
  },
  attendance: {
    title: 'Chấm công',
    pageTitle: 'Quản lý chấm công',
    subtitle: 'Theo dõi và quản lý chấm công nhân viên',
  },
  leave: {
    title: 'Duyệt nghỉ phép',
    pageTitle: 'Duyệt đơn nghỉ phép',
    subtitle: 'Xem và phê duyệt các đơn xin nghỉ',
  },
  payroll: {
    title: 'Quản lý lương',
    pageTitle: 'Quản lý bảng lương',
    subtitle: 'Tính toán và quản lý lương nhân viên',
  },
  reports: {
    title: 'Báo cáo',
    pageTitle: 'Báo cáo & Thống kê',
    subtitle: 'Xem các báo cáo và thống kê hệ thống',
  },
  settings: {
    title: 'Cài đặt hệ thống',
    pageTitle: 'Cài đặt hệ thống',
    subtitle: 'Cấu hình và quản lý hệ thống',
  }
}
