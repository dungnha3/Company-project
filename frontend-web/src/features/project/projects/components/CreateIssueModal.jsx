import { useState, useEffect } from 'react'
import { styles } from './CreateIssueModal.styles'
import { issueApi } from '../api/issueApi'
import { projectApi } from '../api/projectApi'
import { useToast } from '@/shared/components/ui'

const PRIORITIES = [
  { value: 'LOW', label: 'Thấp', icon: '⬇️' },
  { value: 'MEDIUM', label: 'Trung bình', icon: '➡️' },
  { value: 'HIGH', label: 'Cao', icon: '⬆️' },
  { value: 'CRITICAL', label: 'Khẩn cấp', icon: '🔴' }
]

const STATUSES = [
  { id: 1, name: 'To Do', color: '#4BADE8' },
  { id: 2, name: 'In Progress', color: '#FFA500' },
  { id: 3, name: 'Review', color: '#9C27B0' },
  { id: 4, name: 'Done', color: '#4CAF50' }
]

export default function CreateIssueModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    projectId: '',
    title: '',
    description: '',
    statusId: 1, // Default: To Do
    priority: 'MEDIUM',
    assigneeId: null,
    estimatedHours: '',
    dueDate: ''
  })

  const [projects, setProjects] = useState([])
  const [projectMembers, setProjectMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()

  // Load projects khi modal mở
  useEffect(() => {
    if (isOpen) {
      loadProjects()
    }
  }, [isOpen])

  // Load members khi chọn project
  useEffect(() => {
    if (formData.projectId) {
      loadProjectMembers(formData.projectId)
    } else {
      setProjectMembers([])
    }
  }, [formData.projectId])

  const loadProjects = async () => {
    try {
      const data = await projectApi.getMyProjects()
      setProjects(data)
    } catch (err) {
      // Handle error silently
    }
  }

  const loadProjectMembers = async (projectId) => {
    try {
      const members = await projectApi.getProjectMembers(projectId)
      setProjectMembers(members)
    } catch (err) {
      setProjectMembers([])
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate form
      if (!formData.projectId || !formData.title) {
        throw new Error('Vui lòng điền đầy đủ dự án và tiêu đề')
      }

      // Chuẩn bị data
      const issueData = {
        projectId: parseInt(formData.projectId),
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        statusId: formData.statusId,
        priority: formData.priority,
        assigneeId: formData.assigneeId ? parseInt(formData.assigneeId) : null,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
        dueDate: formData.dueDate || null
      }

      // Tạo issue
      const createdIssue = await issueApi.createIssue(issueData)

      toast.success('Tạo tác vụ thành công!')
      onSuccess && onSuccess(createdIssue)
      handleClose()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi tạo tác vụ')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      projectId: '',
      title: '',
      description: '',
      statusId: 1,
      priority: 'MEDIUM',
      assigneeId: null,
      estimatedHours: '',
      dueDate: ''
    })
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div style={styles.modalOverlay} onClick={handleClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Tạo Tác Vụ Mới</h2>
          <button style={styles.closeBtn} onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.errorBox}>{error}</div>}

          {/* Thông tin tác vụ */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Thông tin tác vụ</h3>

            {/* Dự án */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Dự án <span style={styles.required}>*</span>
              </label>
              <select
                name="projectId"
                value={formData.projectId}
                onChange={handleInputChange}
                style={styles.select}
                required
              >
                <option value="">-- Chọn dự án --</option>
                {projects.map(project => (
                  <option key={project.projectId} value={project.projectId}>
                    {project.name} ({project.keyProject})
                  </option>
                ))}
              </select>
            </div>

            {/* Tiêu đề */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Tiêu đề <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                style={styles.input}
                placeholder="Nhập tiêu đề tác vụ"
                required
              />
            </div>

            {/* Mô tả */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Mô tả</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                style={styles.textarea}
                placeholder="Mô tả chi tiết tác vụ..."
                rows={4}
              />
            </div>

            {/* Hàng 1: Status và Priority */}
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Trạng thái</label>
                <select
                  name="statusId"
                  value={formData.statusId}
                  onChange={handleInputChange}
                  style={styles.select}
                >
                  {STATUSES.map(status => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Độ ưu tiên</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  style={styles.select}
                >
                  {PRIORITIES.map(priority => (
                    <option key={priority.value} value={priority.value}>
                      {priority.icon} {priority.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Người được giao việc */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Người được giao việc</label>
              <select
                name="assigneeId"
                value={formData.assigneeId || ''}
                onChange={handleInputChange}
                style={styles.select}
                disabled={!formData.projectId}
              >
                <option value="">-- Chọn người --</option>
                {projectMembers.map(member => (
                  <option key={member.userId} value={member.userId}>
                    {member.username} ({member.role})
                  </option>
                ))}
              </select>
              {!formData.projectId && (
                <small style={styles.helperText}>Vui lòng chọn dự án trước</small>
              )}
            </div>

            {/* Hàng 2: Estimated Hours và Due Date */}
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Thời gian ước tính (giờ)</label>
                <input
                  type="number"
                  name="estimatedHours"
                  value={formData.estimatedHours}
                  onChange={handleInputChange}
                  style={styles.input}
                  placeholder="VD: 8"
                  min="0"
                  step="0.5"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Hạn chót</label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div style={styles.modalFooter}>
            <button
              type="button"
              onClick={handleClose}
              style={styles.cancelBtn}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              style={styles.submitBtn}
              disabled={loading}
            >
              {loading ? 'Đang tạo...' : 'Tạo tác vụ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
