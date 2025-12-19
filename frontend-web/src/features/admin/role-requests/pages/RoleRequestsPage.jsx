import { useState, useEffect } from 'react'
import { roleRequestsService } from '@/shared/services'
import { usePermissions, useErrorHandler } from '@/shared/hooks'
import { validateRequired } from '@/shared/utils/validation'
import { useToast } from '@/shared/components/ui'
import './RoleRequestsPage.css'

const roleLabels = {
  'ADMIN': { label: 'Admin', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  'MANAGER_HR': { label: 'HR Manager', color: '#0891b2', bg: 'rgba(8, 145, 178, 0.15)' },
  'MANAGER_ACCOUNTING': { label: 'Kế toán', color: '#059669', bg: 'rgba(5, 150, 105, 0.15)' },
  'MANAGER_PROJECT': { label: 'PM', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  'EMPLOYEE': { label: 'Nhân viên', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' }
}

export default function RoleRequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processingId, setProcessingId] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectError, setRejectError] = useState('')

  const { isAdmin } = usePermissions()
  const { handleError } = useErrorHandler()
  const toast = useToast()

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const data = await roleRequestsService.getPending()
      setRequests(data || [])
      setError(null)
    } catch (err) {
      const errorMessage = handleError(err, { context: 'load_role_requests' })
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Helper to get username from various API response formats
  const getUsername = (req) => {
    return req.targetUsername || req.username || req.targetUser?.username || req.user?.username || 'Unknown'
  }

  const getEmail = (req) => {
    return req.targetEmail || req.email || req.targetUser?.email || req.user?.email || ''
  }

  const handleApprove = async (request) => {
    const username = getUsername(request)
    if (!confirm(`Xác nhận duyệt yêu cầu của ${username}?`)) return

    try {
      setProcessingId(request.requestId || request.id)
      await roleRequestsService.approve(request.requestId || request.id, 'Approved by Admin')
      loadRequests()
    } catch (err) {
      const errorMessage = handleError(err, { context: 'approve_role_request' })
      toast.error(errorMessage)
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectClick = (request) => {
    setSelectedRequest(request)
    setRejectNote('')
    setRejectError('')
    setShowRejectModal(true)
  }

  const handleRejectSubmit = async () => {
    const error = validateRequired(rejectNote, 'Lý do từ chối')
    if (error) {
      setRejectError(error)
      return
    }

    if (rejectNote.trim().length < 10) {
      setRejectError('Lý do từ chối phải có ít nhất 10 ký tự')
      return
    }

    try {
      setProcessingId(selectedRequest.requestId || selectedRequest.id)
      await roleRequestsService.reject(selectedRequest.requestId || selectedRequest.id, rejectNote)
      setShowRejectModal(false)
      loadRequests()
    } catch (err) {
      const errorMessage = handleError(err, { context: 'reject_role_request' })
      toast.error(errorMessage)
    } finally {
      setProcessingId(null)
    }
  }

  const getRoleLabel = (role) => roleLabels[role]?.label || role
  const getRoleStyle = (role) => ({
    color: roleLabels[role]?.color || '#64748b',
    backgroundColor: roleLabels[role]?.bg || 'rgba(100, 116, 139, 0.15)'
  })

  if (!isAdmin) {
    return (
      <div className="role-error-container">
        <div className="role-error-card">
          <i className="fa-solid fa-lock"></i>
          <h3>Không có quyền truy cập</h3>
          <p>Bạn cần quyền Admin để xem trang này</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="role-loading">
        <div className="role-spinner"></div>
        <p>Đang tải danh sách yêu cầu...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="role-error-container">
        <div className="role-error-card">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <h3>Lỗi tải dữ liệu</h3>
          <p>{error}</p>
          <button onClick={loadRequests} className="btn-retry">Thử lại</button>
        </div>
      </div>
    )
  }

  return (
    <div className="role-requests-container">
      {/* Header */}
      <div className="role-header">
        <div className="role-header-left">
          <h1><i className="fa-solid fa-user-shield"></i> Yêu cầu Thay đổi Role</h1>
          <p>Duyệt yêu cầu thay đổi quyền từ HR Manager • {requests.length} yêu cầu chờ duyệt</p>
        </div>
        <button className="btn-refresh" onClick={loadRequests}>
          <i className="fa-solid fa-rotate"></i>
          Làm mới
        </button>
      </div>

      {/* Content */}
      {requests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fa-solid fa-check-circle"></i>
          </div>
          <h3>Không có yêu cầu nào</h3>
          <p>Tất cả yêu cầu thay đổi role đã được xử lý</p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map((req) => {
            const username = getUsername(req)
            const email = getEmail(req)
            const requestId = req.requestId || req.id
            const isProcessing = processingId === requestId

            return (
              <div key={requestId} className="request-card">
                {/* Card Header with User Info */}
                <div className="card-top">
                  <div className="user-section">
                    <div className="user-initial">{username.charAt(0).toUpperCase()}</div>
                    <div className="user-text">
                      <span className="user-name">{username}</span>
                      {email && <span className="user-email">{email}</span>}
                    </div>
                  </div>
                  <span className="pending-badge">
                    <i className="fa-solid fa-clock"></i> Chờ duyệt
                  </span>
                </div>

                {/* Role Change - Compact horizontal layout */}
                <div className="role-section">
                  <div className="role-item">
                    <span className="role-title">Từ</span>
                    <span className="role-value" style={getRoleStyle(req.currentRole)}>
                      {getRoleLabel(req.currentRole)}
                    </span>
                  </div>
                  <i className="fa-solid fa-arrow-right role-arrow"></i>
                  <div className="role-item">
                    <span className="role-title">Sang</span>
                    <span className="role-value" style={getRoleStyle(req.requestedRole)}>
                      {getRoleLabel(req.requestedRole)}
                    </span>
                  </div>
                </div>

                {/* Reason if exists */}
                {(req.reason || req.lyDo) && (
                  <div className="reason-box">
                    <strong>Lý do:</strong> {req.reason || req.lyDo}
                  </div>
                )}

                {/* Footer with time and actions */}
                <div className="card-footer">
                  <span className="time-info">
                    <i className="fa-regular fa-clock"></i>
                    {new Date(req.createdAt || req.ngayTao).toLocaleString('vi-VN')}
                  </span>
                  <div className="action-btns">
                    <button
                      className="btn-deny"
                      onClick={() => handleRejectClick(req)}
                      disabled={isProcessing}
                    >
                      Từ chối
                    </button>
                    <button
                      className="btn-accept"
                      onClick={() => handleApprove(req)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Đang xử lý...' : 'Duyệt'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <h2>Từ chối Yêu cầu</h2>
              <button className="close-btn" onClick={() => setShowRejectModal(false)}>
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <div className="modal-middle">
              <p className="reject-target">
                Từ chối yêu cầu của: <strong>{getUsername(selectedRequest)}</strong>
              </p>
              <p className="reject-detail">
                {getRoleLabel(selectedRequest?.currentRole)} → {getRoleLabel(selectedRequest?.requestedRole)}
              </p>

              <label>Lý do từ chối <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea
                rows="3"
                placeholder="Nhập lý do từ chối (tối thiểu 10 ký tự)..."
                value={rejectNote}
                onChange={(e) => {
                  setRejectNote(e.target.value)
                  setRejectError('')
                }}
              />
              {rejectError && <span className="err-msg">{rejectError}</span>}
            </div>

            <div className="modal-bottom">
              <button className="cancel-btn" onClick={() => setShowRejectModal(false)}>
                Hủy
              </button>
              <button
                className="confirm-btn"
                onClick={handleRejectSubmit}
                disabled={processingId !== null}
              >
                {processingId ? 'Đang xử lý...' : 'Xác nhận Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
