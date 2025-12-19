import { useState, useEffect, useRef } from 'react'
import { styles } from './IssueDetailPage.styles'
import { issueApi } from '../api/issueApi'
import { commentApi } from '../api/commentApi'
import { activityApi } from '../api/activityApi'
import { useToast } from '@/shared/components/ui'

export default function IssueDetailPage({ issueId, onBack, onUpdate }) {
  const [issue, setIssue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('comments') // comments | history
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [editingComment, setEditingComment] = useState(null)
  const [loadingComments, setLoadingComments] = useState(false)
  const [activities, setActivities] = useState([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const toast = useToast()

  // Timer state cho tính giờ làm việc
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)

  useEffect(() => {
    loadIssue()
    loadComments()
    loadActivities()

    // Load saved timer from localStorage
    const savedStartTime = localStorage.getItem(`issue_timer_${issueId}`)
    if (savedStartTime) {
      startTimeRef.current = parseInt(savedStartTime)
      setIsTimerRunning(true)
    }

    return () => {
      // Cleanup timer on unmount
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [issueId])

  const loadIssue = async () => {
    setLoading(true)
    try {
      const data = await issueApi.getIssueById(issueId)
      setIssue(data)
    } catch (error) {
      console.error(error)
      toast.error('Không thể tải thông tin tác vụ')
    } finally {
      setLoading(false)
    }
  }

  const loadComments = async () => {
    setLoadingComments(true)
    try {
      const data = await commentApi.getIssueComments(issueId)
      setComments(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      await commentApi.createComment({
        issueId: issueId,
        content: newComment
      })
      setNewComment('')
      loadComments()
      // Also reload activities as adding comment creates activity
      loadActivities()
      toast.success('Đã thêm bình luận')
    } catch (error) {
      toast.error('Không thể tạo bình luận')
    }
  }

  const handleUpdateComment = async (commentId, content) => {
    try {
      await commentApi.updateComment(commentId, content)
      setEditingComment(null)
      loadComments()
      toast.success('Đã cập nhật bình luận')
    } catch (error) {
      toast.error('Không thể cập nhật bình luận')
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return

    try {
      await commentApi.deleteComment(commentId)
      loadComments()
      toast.success('Đã xóa bình luận')
    } catch (error) {
      toast.error('Không thể xóa bình luận')
    }
  }

  const loadActivities = async () => {
    setLoadingActivities(true)
    try {
      const data = await activityApi.getIssueActivities(issueId)
      setActivities(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingActivities(false)
    }
  }

  // Timer effect - chạy khi isTimerRunning = true
  useEffect(() => {
    if (isTimerRunning && startTimeRef.current) {
      timerRef.current = setInterval(() => {
        const now = Date.now()
        const elapsed = Math.floor((now - startTimeRef.current) / 1000)
        setElapsedSeconds(elapsed)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isTimerRunning])

  // Format thời gian hiển thị
  const formatElapsedTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Handler cho nút "BẮT ĐẦU" - chuyển trạng thái sang "In Progress" và bắt đầu timer
  const handleStart = async () => {
    try {
      // statusId = 2 thường là "In Progress"
      await issueApi.changeIssueStatus(issueId, 2)

      // Bắt đầu timer
      const now = Date.now()
      startTimeRef.current = now
      localStorage.setItem(`issue_timer_${issueId}`, now.toString())
      setIsTimerRunning(true)
      setElapsedSeconds(0)

      await loadIssue()
      await loadActivities()

      // Gọi onUpdate để cập nhật danh sách ở parent
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Lỗi khi bắt đầu tác vụ:', error)
      alert('Không thể bắt đầu tác vụ')
    }
  }

  // Handler cho nút "HOÀN THÀNH" - chuyển trạng thái sang "Done" và lưu thời gian
  const handleComplete = async () => {
    try {
      // Tính toán giờ làm việc thực tế
      let actualHours = 0
      if (startTimeRef.current) {
        const totalSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000)
        actualHours = parseFloat((totalSeconds / 3600).toFixed(2))
      }

      // Dừng timer
      setIsTimerRunning(false)
      localStorage.removeItem(`issue_timer_${issueId}`)
      startTimeRef.current = null

      // Cập nhật giờ làm việc thực tế
      if (actualHours > 0) {
        await issueApi.updateIssue(issueId, { actualHours })
      }

      // statusId = 4 thường là "Done"
      await issueApi.changeIssueStatus(issueId, 4)
      await loadIssue()
      await loadActivities()

      // Gọi onUpdate để cập nhật danh sách ở parent
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Lỗi khi hoàn thành tác vụ:', error)
      alert('Không thể hoàn thành tác vụ')
    }
  }

  const getActivityIcon = (activityType) => {
    const icons = {
      'CREATED': 'fa-plus',
      'STATUS_CHANGED': 'fa-right-left',
      'ASSIGNEE_CHANGED': 'fa-user-tag',
      'PRIORITY_CHANGED': 'fa-layer-group',
      'SPRINT_CHANGED': 'fa-person-running',
      'DUE_DATE_CHANGED': 'fa-calendar',
      'ESTIMATED_HOURS_CHANGED': 'fa-clock',
      'ACTUAL_HOURS_CHANGED': 'fa-stopwatch',
      'TITLE_CHANGED': 'fa-heading',
      'DESCRIPTION_CHANGED': 'fa-align-left',
      'COMMENT_ADDED': 'fa-comment',
      'COMMENT_EDITED': 'fa-pen',
      'COMMENT_DELETED': 'fa-trash'
    }
    return icons[activityType] || 'fa-info-circle'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Không có'
    const date = new Date(dateString)
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPriorityLabel = (priority) => {
    const found = [
      { value: 'LOW', label: 'Thấp' },
      { value: 'MEDIUM', label: 'Trung bình' },
      { value: 'HIGH', label: 'Cao' },
      { value: 'CRITICAL', label: 'Khẩn cấp' }
    ].find(p => p.value === priority)
    return found?.label || priority
  }

  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', color: '#666' }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '15px' }}></i>
        <p>Đang tải thông tin chi tiết...</p>
      </div>
    )
  }

  if (!issue) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <h3 style={{ color: '#e74c3c' }}>Không tìm thấy tác vụ</h3>
        <button className="btn-primary" onClick={onBack} style={{ margin: '20px auto' }}>
          <i className="fa-solid fa-arrow-left"></i> Quay lại
        </button>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header Bar */}
      <div style={styles.headerBar}>
        <div style={styles.headerLeft}>
          <button style={styles.backButton} onClick={onBack} title="Quay lại">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <div style={styles.issueKey}>{issue.issueKey}</div>
            <h2 style={styles.issueTitle}>{issue.title}</h2>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Left Panel */}
        <div style={styles.leftPanel}>
          {/* Priority Badge */}
          <div style={styles.prioritySection}>
            <span
              style={{
                ...styles.priorityBadge,
                backgroundColor: issue.priority === 'HIGH' || issue.priority === 'CRITICAL' ? '#fee2e2' : '#e0f2fe',
                color: issue.priority === 'HIGH' || issue.priority === 'CRITICAL' ? '#991b1b' : '#0369a1'
              }}
            >
              {issue.priority === 'HIGH' || issue.priority === 'CRITICAL' ? '⚠️' : 'ℹ️'} Ưu tiên {getPriorityLabel(issue.priority)}
            </span>
          </div>

          {/* Timer Display - hiển thị khi đang làm việc */}
          {(isTimerRunning || issue.statusName === 'In Progress') && (
            <div style={{
              padding: '16px',
              backgroundColor: '#dbeafe',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              border: '1px solid #93c5fd'
            }}>
              <span style={{ fontSize: '24px' }}>⏱️</span>
              <div>
                <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: '500' }}>
                  Thời gian làm việc
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: '#1e3a8a',
                  fontFamily: 'monospace',
                  letterSpacing: '2px'
                }}>
                  {formatElapsedTime(elapsedSeconds)}
                </div>
              </div>
              {isTimerRunning && (
                <div style={{
                  marginLeft: 'auto',
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#22c55e',
                  borderRadius: '50%',
                  animation: 'pulse 1.5s infinite'
                }} title="Đang chạy" />
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            <button
              style={{
                ...styles.startButton,
                opacity: issue.statusName === 'In Progress' || issue.statusName === 'Done' ? 0.5 : 1,
                cursor: issue.statusName === 'In Progress' || issue.statusName === 'Done' ? 'not-allowed' : 'pointer'
              }}
              onClick={handleStart}
              disabled={issue.statusName === 'In Progress' || issue.statusName === 'Done'}
            >
              BẮT ĐẦU
            </button>
            <button
              style={{
                ...styles.completeButton,
                opacity: issue.statusName === 'Done' ? 0.5 : 1,
                cursor: issue.statusName === 'Done' ? 'not-allowed' : 'pointer'
              }}
              onClick={handleComplete}
              disabled={issue.statusName === 'Done'}
            >
              HOÀN THÀNH
            </button>
          </div>

          {/* Description */}
          <div style={styles.descriptionSection}>
            <h3 style={styles.sectionTitle}>
              <i className="fa-solid fa-align-left" style={{ marginRight: '8px' }}></i>
              Mô tả
            </h3>
            <div style={styles.descriptionContent}>
              {issue.description || 'Chưa có mô tả cho tác vụ này.'}
            </div>
          </div>

          {/* Tabs */}
          <div style={styles.tabs}>
            <button
              style={{ ...styles.tab, ...(activeTab === 'comments' ? styles.tabActive : {}) }}
              onClick={() => setActiveTab('comments')}
            >
              Ghi chú <span style={styles.tabCount}>{comments.length}</span>
            </button>
            <button
              style={{ ...styles.tab, ...(activeTab === 'history' ? styles.tabActive : {}) }}
              onClick={() => setActiveTab('history')}
            >
              Lịch sử <span style={styles.tabCount}>{activities.filter(a => a.activityType === 'STATUS_CHANGED').length}</span>
            </button>
          </div>

          {/* Tab Content */}
          <div style={styles.tabContent}>
            {activeTab === 'comments' && (
              <div style={styles.commentSection}>
                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} style={styles.commentInput}>
                  <div style={styles.avatar}>👤</div>
                  <input
                    type="text"
                    placeholder="Thêm bình luận"
                    style={styles.input}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  {newComment.trim() && (
                    <button type="submit" style={styles.submitCommentBtn}>
                      Gửi
                    </button>
                  )}
                </form>

                {/* Comments List */}
                <div style={styles.commentList}>
                  {loadingComments ? (
                    <div style={styles.loadingText}>Đang tải bình luận...</div>
                  ) : comments.length === 0 ? (
                    <div style={styles.emptyText}>Chưa có thảo luận nào. Hãy là người đầu tiên!</div>
                  ) : (
                    comments.map(comment => (
                      <div key={comment.commentId} style={styles.commentItem}>
                        <div style={styles.commentAvatar}>
                          {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={styles.commentBubble}>
                            <div style={styles.commentHeader}>
                              <strong>{comment.authorName}</strong>
                              <span>{formatDate(comment.createdAt)}</span>
                            </div>

                            {editingComment === comment.commentId ? (
                              <div style={styles.editCommentForm}>
                                <input
                                  type="text"
                                  defaultValue={comment.content}
                                  style={styles.input}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateComment(comment.commentId, e.target.value)
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingComment(null)
                                    }
                                  }}
                                  autoFocus
                                />
                                <button
                                  style={styles.cancelEditBtn}
                                  onClick={() => setEditingComment(null)}
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <div style={styles.commentContent}>{comment.content}</div>
                            )}
                          </div>
                          <div style={styles.commentActions}>
                            <button
                              style={styles.editCommentBtn}
                              onClick={() => setEditingComment(comment.commentId)}
                            >
                              Sửa
                            </button>
                            <button
                              style={styles.deleteCommentBtn}
                              onClick={() => handleDeleteComment(comment.commentId)}
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div style={styles.historyList}>
                {loadingActivities ? (
                  <div style={styles.loadingText}>Đang tải lịch sử...</div>
                ) : activities.length === 0 ? (
                  <div style={styles.emptyText}>Chưa có hoạt động nào được ghi nhận.</div>
                ) : (
                  activities.map((activity, idx) => (
                    <div key={idx} style={styles.historyItem}>
                      <div style={styles.historyIcon}>
                        <i className={`fa-solid ${getActivityIcon(activity.activityType)}`}></i>
                      </div>
                      <div style={styles.historyContent}>
                        <div>
                          <strong>{activity.userName}</strong>
                          <span style={{ margin: '0 5px' }}>{activity.description}</span>
                        </div>
                        {(activity.oldValue || activity.newValue) && (
                          <div style={styles.diffBox}>
                            {activity.oldValue && <span style={styles.oldValue}>{activity.oldValue}</span>}
                            {activity.oldValue && activity.newValue && <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.7rem', color: '#bbb', margin: '0 5px' }}></i>}
                            {activity.newValue && <span style={styles.newValue}>{activity.newValue}</span>}
                          </div>
                        )}
                        <div style={styles.historyTime}>
                          {formatDate(activity.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div style={styles.rightPanel}>
          <div style={styles.infoCard}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Trạng thái:</span>
              <span style={{ ...styles.infoValue, fontWeight: '700' }}>
                {issue.statusName}
              </span>
            </div>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>nhắc nhở:</span>
              <span style={{ ...styles.infoValue, color: '#3b82f6' }}>
                🔔 Nhắc lại
              </span>
            </div>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Giai đoạn:</span>
              <div style={styles.progressBar}>
                <div style={styles.progressFill}></div>
              </div>
            </div>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Tự động:</span>
              <span style={styles.infoValue}>Cấu hình</span>
            </div>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Được tạo ra:</span>
              <span style={styles.infoValue}>
                {formatDate(issue.createdAt)}
              </span>
            </div>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Đánh giá:</span>
              <span style={styles.infoValue}>Không có</span>
            </div>


            <div style={styles.creatorSection}>
              <h4 style={styles.sectionLabel}>Được tạo bởi</h4>
              <div style={styles.userInfo}>
                <div style={styles.userAvatar}>
                  {issue.reporterName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span style={styles.userName}>{issue.reporterName}</span>
              </div>
            </div>

            <div style={styles.assigneeSection}>
              <h4 style={styles.sectionLabel}>
                Người được phân công
                <button style={styles.changeButton}>thay đổi</button>
              </h4>
              <div style={styles.userInfo}>
                <div style={styles.userAvatar}>
                  {issue.assigneeName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span style={styles.userName}>
                  {issue.assigneeName || 'Chưa gán'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
