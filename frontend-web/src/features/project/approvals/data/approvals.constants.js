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
