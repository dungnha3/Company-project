// Mock data for Project Manager Dashboard

// KPI Data
export const kpiData = {
  teamSize: 12,
  pendingLeaves: 3,
  approvedToday: 5,
  totalRequests: 28
}

// Attendance History
export const attendanceHistory = [
  { date: '2025-11-08', timeIn: '08:30', timeOut: '17:45', hours: 9.3, status: 'normal' },
  { date: '2025-11-07', timeIn: '08:35', timeOut: '17:30', hours: 8.9, status: 'late' },
  { date: '2025-11-06', timeIn: '08:25', timeOut: '17:15', hours: 8.8, status: 'early' },
  { date: '2025-11-05', timeIn: '08:30', timeOut: '17:30', hours: 9.0, status: 'normal' },
  { date: '2025-11-04', timeIn: '08:30', timeOut: '17:30', hours: 9.0, status: 'normal' },
]

// Leave Requests (for project manager's own leaves)
export const leaveRequests = [
  { id: 1, type: 'Nghỉ phép', date: '07/11/2025', status: 'approved', approver: 'Giám đốc' },
  { id: 2, type: 'Giải trình', date: '05/11/2025', status: 'pending', approver: 'Giám đốc' },
  { id: 3, type: 'Nghỉ ốm', date: '01/11/2025', status: 'rejected', approver: 'Giám đốc' },
]

// Pending Leave Approvals (for team members)
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
]

// Notifications
export const notifications = [
  { title: 'Đơn nghỉ phép mới', desc: 'Nguyễn Văn A đã gửi đơn nghỉ phép', date: '30 phút trước' },
  { title: 'Thông báo nghỉ lễ', desc: 'Công ty nghỉ lễ Quốc khánh 2/9', date: '3 ngày trước' },
]

// Projects List Data
export const projectsListData = [
  {
    id: 3,
    name: 'dự án 2',
    lastUpdate: '18 tháng 11, 2:02 am',
    performance: 100,
    members: 2,
    role: 'Thành viên dự án',
    privacy: 'Công khai'
  },
  {
    id: 5,
    name: 'testmoi2',
    lastUpdate: '18 tháng 11, 2:04 am',
    performance: 100,
    members: 2,
    role: 'Người quản lý dự án',
    privacy: 'Công khai'
  },
]

// Menu Sections Configuration
export const sectionsConfig = {
  dashboard: {
    title: 'Dashboard',
    pageTitle: 'Dashboard',
    subtitle: 'Tổng quan quản lý dự án của bạn',
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
    pageTitle: 'Đơn từ & Nghghỉ phép',
    subtitle: 'Xin nghỉ phép và xem trạng thái đơn',
  },
  approvals: {
    title: 'Duyệt nghỉ phép',
    pageTitle: 'Duyệt nghỉ phép',
    subtitle: 'Duyệt đơn nghỉ phép của nhân viên trong dự án',
  },
  'team-leaves': {
    title: 'Duyệt nghỉ phép',
    pageTitle: 'Duyệt nghỉ phép team',
    subtitle: 'Duyệt đơn nghỉ phép của thành viên trong team',
  },
  payroll: {
    title: 'Phiếu lương',
    pageTitle: 'Phiếu lương',
    subtitle: 'Xem thông tin lương và phụ cấp',
  },
  documents: {
    title: 'Hợp đồng & Tài liệu',
    pageTitle: 'Hợp đồng & Tài liệu',
    subtitle: 'Quản lý hợp đồng và tài liệu cá nhân',
  },
  projects: {
    title: 'Dự án',
    pageTitle: 'Quản lý Dự án',
    subtitle: 'Quản lý công việc, tiến độ, và tài liệu dự án',
  },
  chat: {
    title: 'Trò chuyện',
    pageTitle: 'Trò chuyện',
    subtitle: 'Nhắn tin với đồng nghiệp và nhóm dự án',
  },
  storage: {
    title: 'File của tôi',
    pageTitle: 'File của tôi',
    subtitle: 'Quản lý file và tài liệu cá nhân',
  }
}

// START: DATA MẪU MỚI CHO TRANG DỰ ÁN (CHI TIẾT HƠN)
export const mockProjects = [
  {
    id: 1,
    name: 'Website E-commerce (QLNS)',
    status: 'Đang tiến hành',
    progress: 65,
    team: ['A', 'B', 'C', 'D'],
    dueDate: '30/12/2025',
    leader: 'Trần Thị B'
  },
  {
    id: 2,
    name: 'Ứng dụng Mobile Banking',
    status: 'Tạm dừng',
    progress: 20,
    team: ['E', 'F'],
    dueDate: 'N/A',
    leader: 'Trần Thị B'
  },
  {
    id: 3,
    name: 'Hệ thống ERP nội bộ',
    status: 'Hoàn thành',
    progress: 100,
    team: ['A', 'G', 'H'],
    dueDate: '01/10/2025',
    leader: 'Nguyễn Văn A'
  },
  {
    id: 4,
    name: 'Nâng cấp Cơ sở dữ liệu',
    status: 'Chưa bắt đầu',
    progress: 0,
    team: ['B', 'D'],
    dueDate: '15/01/2026',
    leader: 'Lê Văn C'
  },
]

export const mockIssues = [
  { id: 'PROJ-101', title: 'Lỗi giao diện trang thanh toán', project: 'Website E-commerce', priority: 'Cao', status: 'Mở', assignee: 'Nguyễn Văn A' },
  { id: 'PROJ-102', title: 'Không thể đăng nhập bằng Google', project: 'Website E-commerce', priority: 'Trung bình', status: 'Đang xử lý', assignee: 'Trần Thị B' },
  { id: 'ERP-55', title: 'Sai công thức tính lương', project: 'Hệ thống ERP nội bộ', priority: 'Cao', status: 'Mở', assignee: 'Lê Văn C' },
  { id: 'MB-12', title: 'App crash khi chuyển tiền', project: 'Ứng dụng Mobile Banking', priority: 'Cao nhất', status: 'Đã đóng', assignee: 'Trần Thị B' },
  { id: 'PROJ-103', title: 'Tối ưu hóa query trang sản phẩm', project: 'Website E-commerce', priority: 'Thấp', status: 'Mở', assignee: 'Nguyễn Văn A' },
]

export const mockStorageItems = [
  { id: 1, type: 'folder', name: 'Tài liệu Đặc tả Yêu cầu', lastModified: '12/11/2025', size: '25.5 MB' },
  { id: 2, type: 'folder', name: 'Thiết kế (Wireframes & Mockups)', lastModified: '10/11/2025', size: '150.2 MB' },
  { id: 3, type: 'folder', name: 'Hợp đồng & Hóa đơn', lastModified: '01/11/2025', size: '10.1 MB' },
  { id: 4, type: 'file', name: 'Project_Charter_QLNS.pdf', lastModified: '05/10/2025', size: '2.2 MB' },
  { id: 5, type: 'file', name: 'Timeline_Gantt_Chart.xlsx', lastModified: '14/11/2025', size: '1.5 MB' },
  { id: 6, type: 'file', name: 'Meeting_Notes_10-11.docx', lastModified: '10/11/2025', size: '350 KB' },
]

// TASKS DATA FOR PROJECT DETAIL VIEW
export const projectTasksData = [
  {
    id: 1,
    name: 'Thiết kế giao diện trang chủ',
    kanbanStage: 'To Do',
    activity: '18 tháng 11, 2:02 am',
    dueDate: '20 tháng 11, 2024',
    creator: 'Nguyễn Văn A',
    assignee: 'Trần Thị B',
    project: 'dự án 2',
    storage: 'Thiết kế'
  },
  {
    id: 2,
    name: 'Phát triển API thanh toán',
    kanbanStage: 'In Progress',
    activity: '17 tháng 11, 10:30 am',
    dueDate: '25 tháng 11, 2024',
    creator: 'Trần Thị B',
    assignee: 'Lê Văn C',
    project: 'dự án 2',
    storage: 'Phát triển'
  },
  {
    id: 3,
    name: 'Kiểm thử chức năng đăng nhập',
    kanbanStage: 'In Review',
    activity: '16 tháng 11, 3:15 pm',
    dueDate: '19 tháng 11, 2024',
    creator: 'Lê Văn C',
    assignee: 'Nguyễn Văn A',
    project: 'dự án 2',
    storage: 'QA'
  },
  {
    id: 4,
    name: 'Cập nhật tài liệu API',
    kanbanStage: 'Done',
    activity: '15 tháng 11, 9:00 am',
    dueDate: '18 tháng 11, 2024',
    creator: 'Nguyễn Văn A',
    assignee: 'Trần Thị B',
    project: 'dự án 2',
    storage: 'Tài liệu'
  },
  {
    id: 5,
    name: 'Tối ưu hóa hiệu suất database',
    kanbanStage: 'In Progress',
    activity: '14 tháng 11, 2:20 pm',
    dueDate: '28 tháng 11, 2024',
    creator: 'Trần Thị B',
    assignee: 'Lê Văn C',
    project: 'dự án 2',
    storage: 'Phát triển'
  },
]

export const mockSprints = [
  {
    id: 1,
    name: 'Sprint 1: Setup & UI Base',
    status: 'Hoàn thành',
    startDate: '01/10/2025',
    endDate: '15/10/2025',
    issues: 15
  },
  {
    id: 2,
    name: 'Sprint 2: Core Features',
    status: 'Đang tiến hành',
    startDate: '16/10/2025',
    endDate: '30/10/2025',
    issues: 8
  },
  {
    id: 3,
    name: 'Sprint 3: Payment & Checkout',
    status: 'Chưa bắt đầu',
    startDate: '01/11/2025',
    endDate: '15/11/2025',
    issues: 0
  },
]

export const mockProjectMembers = [
  { id: 1, name: 'Nguyễn Văn A', email: 'vana@example.com', role: 'DEVELOPER' },
  { id: 2, name: 'Trần Thị B', email: 'thib@example.com', role: 'PROJECT_MANAGER' },
  { id: 3, name: 'Lê Văn C', email: 'vanc@example.com', role: 'DEVELOPER' },
  { id: 4, name: 'Phạm Thị D', email: 'thid@example.com', role: 'TESTER' },
]

export const mockActivities = [
  { id: 1, user: 'Nguyễn Văn A', action: 'đã bình luận về issue', target: 'PROJ-102', time: '15 phút trước' },
  { id: 2, user: 'Trần Thị B', action: 'đã tạo issue mới', target: 'PROJ-103', time: '1 giờ trước' },
  { id: 3, user: 'Trần Thị B', action: 'đã assign', target: 'PROJ-103 cho Nguyễn Văn A', time: '1 giờ trước' },
  { id: 4, user: 'Lê Văn C', action: 'đã thay đổi trạng thái của', target: 'ERP-55 thành "Đang xử lý"', time: '3 giờ trước' },
]

// END: DATA MẪU MỚI