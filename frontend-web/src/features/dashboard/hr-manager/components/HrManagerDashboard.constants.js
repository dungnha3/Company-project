// Mock data for HR Manager Dashboard

// KPI Data
export const kpiData = {
  totalEmployees: 85,
  pendingLeaves: 7,
  approvedToday: 4,
  newHires: 3
}

// Attendance History
export const attendanceHistory = [
  { date: '2025-11-08', timeIn: '08:30', timeOut: '17:45', hours: 9.3, status: 'normal' },
  { date: '2025-11-07', timeIn: '08:35', timeOut: '17:30', hours: 8.9, status: 'late' },
  { date: '2025-11-06', timeIn: '08:25', timeOut: '17:15', hours: 8.8, status: 'early' },
  { date: '2025-11-05', timeIn: '08:30', timeOut: '17:30', hours: 9.0, status: 'normal' },
  { date: '2025-11-04', timeIn: '08:30', timeOut: '17:30', hours: 9.0, status: 'normal' },
]

// Leave Requests (for HR manager's own leaves)
export const leaveRequests = [
  { id: 1, type: 'Nghỉ phép', date: '07/11/2025', status: 'approved', approver: 'Giám đốc' },
  { id: 2, type: 'Giải trình', date: '05/11/2025', status: 'pending', approver: 'Giám đốc' },
  { id: 3, type: 'Nghỉ ốm', date: '01/11/2025', status: 'rejected', approver: 'Giám đốc' },
]

// Pending Leave Approvals (for all employees)
export const pendingApprovals = [
  {
    id: 1,
    employeeName: 'Nguyễn Văn A',
    type: 'Nghỉ phép',
    fromDate: '10/11/2025',
    toDate: '12/11/2025',
    days: 3,
    reason: 'Nghỉ phép năm',
    submitDate: '08/11/2025',
    status: 'pending'
  },
  {
    id: 2,
    employeeName: 'Trần Thị B',
    type: 'Nghỉ ốm',
    fromDate: '09/11/2025',
    toDate: '09/11/2025',
    days: 1,
    reason: 'Bị cảm, có giấy khám bệnh',
    submitDate: '08/11/2025',
    status: 'pending'
  },
  {
    id: 3,
    employeeName: 'Lê Văn C',
    type: 'Giải trình',
    fromDate: '07/11/2025',
    toDate: '07/11/2025',
    days: 1,
    reason: 'Đi muộn do kẹt xe',
    submitDate: '07/11/2025',
    status: 'pending'
  },
  {
    id: 4,
    employeeName: 'Phạm Thị D',
    type: 'Nghỉ phép',
    fromDate: '15/11/2025',
    toDate: '16/11/2025',
    days: 2,
    reason: 'Việc gia đình',
    submitDate: '08/11/2025',
    status: 'approved'
  },
  {
    id: 5,
    employeeName: 'Hoàng Văn E',
    type: 'Nghỉ phép',
    fromDate: '05/11/2025',
    toDate: '05/11/2025',
    days: 1,
    reason: 'Không có lý do chính đáng',
    submitDate: '04/11/2025',
    status: 'rejected'
  },
  {
    id: 6,
    employeeName: 'Vũ Thị F',
    type: 'Nghỉ thai sản',
    fromDate: '20/11/2025',
    toDate: '20/02/2026',
    days: 90,
    reason: 'Nghỉ thai sản',
    submitDate: '10/11/2025',
    status: 'pending'
  },
  {
    id: 7,
    employeeName: 'Đỗ Văn G',
    type: 'Nghỉ phép',
    fromDate: '25/11/2025',
    toDate: '27/11/2025',
    days: 3,
    reason: 'Du lịch cùng gia đình',
    submitDate: '12/11/2025',
    status: 'pending'
  },
]

// Notifications
export const notifications = [
  { title: 'Tuyển dụng mới', desc: '3 ứng viên đã nộp hồ sơ cho vị trí Developer', date: '1 giờ trước' },
  { title: 'Đơn nghỉ thai sản', desc: 'Vũ Thị F đã gửi đơn nghỉ thai sản', date: '2 giờ trước' },
  { title: 'Thông báo nghỉ lễ', desc: 'Công ty nghỉ lễ Quốc khánh 2/9', date: '3 ngày trước' },
  { title: 'Đánh giá hiệu suất', desc: 'Đã hoàn thành đánh giá Q3 cho tất cả nhân viên', date: '1 tuần trước' },
]

// Chat Contacts
export const chatContacts = [
  {
    id: 1,
    name: 'Giám đốc',
    avatar: '👔',
    lastMessage: 'Báo cáo tuyển dụng Q4 đã hoàn thành',
    time: '11:30',
    unread: 1,
    online: true
  },
  {
    id: 2,
    name: 'IT Department',
    avatar: '💻',
    lastMessage: 'Hệ thống HRMS đã được cập nhật',
    time: '10:45',
    unread: 0,
    online: true
  },
  {
    id: 3,
    name: 'Accounting Team',
    avatar: '💰',
    lastMessage: 'Bảng lương tháng 11 đã sẵn sàng',
    time: '09:20',
    unread: 2,
    online: true
  },
  {
    id: 4,
    name: 'Nguyễn Văn A',
    avatar: '👤',
    lastMessage: 'Cảm ơn chị đã duyệt đơn nghỉ phép',
    time: 'Hôm qua',
    unread: 0,
    online: false
  },
  {
    id: 5,
    name: 'Trần Thị B',
    avatar: '👩',
    lastMessage: 'Hồ sơ ứng viên đã được gửi',
    time: 'Hôm qua',
    unread: 0,
    online: false
  },
  {
    id: 6,
    name: 'Project Managers',
    avatar: '📊',
    lastMessage: 'Đánh giá nhân viên Q4 đã hoàn thành',
    time: '2 ngày trước',
    unread: 0,
    online: false
  }
]

// Chat Messages
export const chatMessages = [
  {
    id: 1,
    sender: 'Giám đốc',
    content: 'Chào chị! Báo cáo tuyển dụng Q4 đã hoàn thành chưa ạ?',
    time: '11:25',
    isOwn: false
  },
  {
    id: 2,
    sender: 'You',
    content: 'Dạ, em đã hoàn thành báo cáo. Hiện tại chúng ta đã tuyển được 3 nhân viên mới.',
    time: '11:27',
    isOwn: true
  },
  {
    id: 3,
    sender: 'Giám đốc',
    content: 'Tốt lắm! Vậy kế hoạch onboarding cho nhân viên mới thế nào?',
    time: '11:28',
    isOwn: false
  },
  {
    id: 4,
    sender: 'You',
    content: 'Em đã chuẩn bị chương trình đào tạo 2 tuần cho nhân viên mới. Dự kiến bắt đầu từ tuần sau.',
    time: '11:30',
    isOwn: true
  },
  {
    id: 5,
    sender: 'Giám đốc',
    content: 'Rất tốt! Cảm ơn chị đã làm việc hiệu quả.',
    time: '11:31',
    isOwn: false
  }
]

// Menu Sections Configuration
export const sectionsConfig = {
  dashboard: {
    title: 'Dashboard',
    pageTitle: 'Dashboard',
    subtitle: 'Tổng quan quản lý nhân sự của bạn',
  },
  profile: {
    title: 'Thông tin & Tài khoản',
    pageTitle: 'Thông tin & Tài khoản',
    subtitle: 'Xem và cập nhật thông tin cá nhân',
  },
  timesheet: {
    title: 'Chấm công',
    pageTitle: 'Lịch sử chấm công',
    subtitle: 'Xem lịch sử chấm công và số giờ làm việc',
  },
  leave: {
    title: 'Đơn từ & Nghỉ phép',
    pageTitle: 'Đơn từ & Nghỉ phép',
    subtitle: 'Xin nghỉ phép và xem trạng thái đơn',
  },
  approvals: {
    title: 'Duyệt nghỉ phép',
    pageTitle: 'Duyệt nghỉ phép',
    subtitle: 'Duyệt đơn nghỉ phép của tất cả nhân viên',
  },
  payroll: {
    title: 'Phiếu lương',
    pageTitle: 'Phiếu lương',
    subtitle: 'Xem thông tin lương và phụ cấp',
  },
  documents: {
    title: 'Hợp đồng & Tài liệu',
    pageTitle: 'Hợp đồng & Tài liệu',
    subtitle: 'Quản lý hợp đồng và tài liệu nhân sự',
  },
  chat: {
    title: 'Trò chuyện',
    pageTitle: 'Trò chuyện',
    subtitle: 'Nhắn tin với đồng nghiệp và các phòng ban',
  }
}
