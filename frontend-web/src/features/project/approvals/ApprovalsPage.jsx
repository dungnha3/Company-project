import { useEffect, useState } from 'react'
import { styles } from './ApprovalsPage.styles'
import { ApprovalStatusBadge } from './components/ApprovalsComponents'
import { leavesService } from '@/features/hr/shared/services/leaves.service'
import { useToast } from '@/shared/components/ui'

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState([])
  const toast = useToast()

  const mapStatus = (s) => {
    const m = { CHO_DUYET: 'pending', DA_DUYET: 'approved', BI_TU_CHOI: 'rejected' }
    return m[s] || s || 'pending'
  }

  const loadApprovals = async () => {
    try {
      const data = await leavesService.getPending()
      const mapped = (data || []).map((item) => ({
        id: item.nghiphepId || item.id,
        employeeName: item.hoTenNhanVien || item.employeeName || item.tenNhanVien || 'N/A',
        type: item.loaiPhepLabel || item.type || 'Nghỉ phép',
        fromDate: item.ngayBatDau || item.fromDate,
        toDate: item.ngayKetThuc || item.toDate,
        days: item.soNgay ?? item.days ?? 0,
        reason: item.lyDo || item.reason || '',
        submitDate: item.ngayTao || item.submitDate || '',
        status: mapStatus(item.trangThai || item.status)
      }))
      setApprovals(mapped)
    } catch (err) {
      // Don't show alert on initial load
    }
  }

  useEffect(() => {
    loadApprovals()
  }, [])

  const handleApprove = async (id) => {
    try {
      await leavesService.approve(id, '')
      setApprovals((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'approved' } : item)))
      toast.success('Đã duyệt đơn thành công!')
    } catch (err) {
      toast.error('Lỗi: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleReject = async (id) => {
    try {
      await leavesService.reject(id, 'Từ chối')
      setApprovals((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'rejected' } : item)))
      toast.success('Đã từ chối đơn!')
    } catch (err) {
      toast.error('Lỗi: ' + (err.response?.data?.message || err.message))
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Duyệt nghỉ phép</h1>
        <p style={styles.subtitle}>Duyệt đơn nghỉ phép của nhân viên trong dự án</p>
      </div>

      <div style={styles.pageContent}>
        <div style={styles.tableCard}>
          <div style={styles.tableHeader}>
            <h4 style={styles.tableTitle}>Duyệt nghỉ phép nhân viên</h4>
          </div>

          {approvals.map((approval) => (
            <div key={approval.id} style={styles.approvalCard}>
              <div style={styles.approvalHeader}>
                <div>
                  <div style={styles.approvalEmployee}>{approval.employeeName}</div>
                  <div style={styles.approvalType}>{approval.type}</div>
                </div>
                <ApprovalStatusBadge status={approval.status} />
              </div>

              <div style={styles.approvalBody}>
                <div style={styles.approvalField}>
                  <div style={styles.approvalLabel}>Từ ngày</div>
                  <div style={styles.approvalValue}>{approval.fromDate}</div>
                </div>
                <div style={styles.approvalField}>
                  <div style={styles.approvalLabel}>Đến ngày</div>
                  <div style={styles.approvalValue}>{approval.toDate}</div>
                </div>
                <div style={styles.approvalField}>
                  <div style={styles.approvalLabel}>Số ngày</div>
                  <div style={styles.approvalValue}>{approval.days} ngày</div>
                </div>
                <div style={styles.approvalField}>
                  <div style={styles.approvalLabel}>Ngày gửi</div>
                  <div style={styles.approvalValue}>{approval.submitDate}</div>
                </div>
                <div style={styles.approvalReason}>
                  <div style={styles.approvalReasonLabel}>Lý do</div>
                  <div style={styles.approvalReasonText}>{approval.reason}</div>
                </div>
              </div>

              {approval.status === 'pending' && (
                <div style={styles.approvalActions}>
                  <button style={styles.rejectBtn} onClick={() => handleReject(approval.id)}>
                    ✗ Từ chối
                  </button>
                  <button style={styles.approveBtn} onClick={() => handleApprove(approval.id)}>
                    ✓ Phê duyệt
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
