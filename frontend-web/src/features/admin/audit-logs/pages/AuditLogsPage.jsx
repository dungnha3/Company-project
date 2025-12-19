import { useState, useEffect } from 'react'
import { apiService } from '@/shared/services'
import './AuditLogsPage.css'

const actionLabels = {
  'CREATE_USER': { label: 'Tạo User', icon: 'fa-user-plus', color: '#10b981' },
  'ACTIVATE_USER': { label: 'Kích hoạt User', icon: 'fa-check-circle', color: '#10b981' },
  'DEACTIVATE_USER': { label: 'Vô hiệu User', icon: 'fa-ban', color: '#f59e0b' },
  'DELETE_USER': { label: 'Xóa User', icon: 'fa-trash', color: '#ef4444' },
  'UPDATE_USER': { label: 'Cập nhật User', icon: 'fa-pen', color: '#3b82f6' },
  'CHANGE_ROLE': { label: 'Đổi Role', icon: 'fa-user-shield', color: '#8b5cf6' },
  'LOGIN': { label: 'Đăng nhập', icon: 'fa-sign-in-alt', color: '#0891b2' },
  'LOGOUT': { label: 'Đăng xuất', icon: 'fa-sign-out-alt', color: '#64748b' }
}

const severityLabels = {
  'INFO': { label: 'Info', color: '#0891b2', bg: 'rgba(8, 145, 178, 0.1)' },
  'WARNING': { label: 'Warning', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  'CRITICAL': { label: 'Critical', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' }
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const data = await apiService.get('/api/audit-logs')
      setLogs(data || [])
      setError(null)
    } catch (err) {
      console.error('Failed to load audit logs:', err)
      setError('Không thể tải audit logs')
    } finally {
      setLoading(false)
    }
  }

  const getActionInfo = (action) => actionLabels[action] || { label: action, icon: 'fa-circle', color: '#64748b' }
  const getSeverityInfo = (severity) => severityLabels[severity] || severityLabels['INFO']

  if (loading) {
    return (
      <div className="audit-loading">
        <div className="audit-spinner"></div>
        <p>Đang tải audit logs...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="audit-error">
        <i className="fa-solid fa-triangle-exclamation"></i>
        <p>{error}</p>
        <button onClick={loadLogs}>Thử lại</button>
      </div>
    )
  }

  return (
    <div className="audit-logs-container">
      {/* Header */}
      <div className="audit-header">
        <div className="audit-header-left">
          <h1><i className="fa-solid fa-clipboard-list"></i> Audit Logs</h1>
          <p>Lịch sử hoạt động hệ thống • {logs.length} bản ghi</p>
        </div>
        <button className="btn-refresh" onClick={loadLogs}>
          <i className="fa-solid fa-rotate"></i>
          Làm mới
        </button>
      </div>

      {/* Logs List */}
      {logs.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-clipboard-list"></i>
          <h3>Chưa có audit log nào</h3>
          <p>Các hoạt động sẽ được ghi lại tại đây</p>
        </div>
      ) : (
        <div className="logs-table-card">
          <table className="logs-table">
            <thead>
              <tr>
                <th style={{ width: '180px' }}>Thời gian</th>
                <th style={{ width: '150px' }}>Người thực hiện</th>
                <th style={{ width: '160px' }}>Hành động</th>
                <th>Đối tượng</th>
                <th style={{ width: '100px' }}>Mức độ</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const actionInfo = getActionInfo(log.action)
                const severityInfo = getSeverityInfo(log.severity)

                return (
                  <tr key={log.id}>
                    <td className="time-cell">
                      {new Date(log.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td>
                      <div className="actor-info">
                        <span className="actor-name">{log.actor?.username || 'System'}</span>
                        {log.actor?.role && (
                          <span className="actor-role">{log.actor.role}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="action-badge" style={{ color: actionInfo.color }}>
                        <i className={`fa-solid ${actionInfo.icon}`}></i>
                        {actionInfo.label}
                      </span>
                    </td>
                    <td>
                      <div className="target-info">
                        {log.targetUser ? (
                          <>
                            <span className="target-name">{log.targetUser.username}</span>
                            <span className="target-type">{log.entityType} #{log.entityId}</span>
                          </>
                        ) : (
                          <span className="target-type">{log.entityType} #{log.entityId}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className="severity-badge"
                        style={{
                          color: severityInfo.color,
                          backgroundColor: severityInfo.bg
                        }}
                      >
                        {severityInfo.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
