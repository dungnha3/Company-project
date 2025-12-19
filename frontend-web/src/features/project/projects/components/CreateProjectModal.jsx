import { useState } from 'react'
import { projectApi } from '../api/projectApi'
import { userApi } from '../api/userApi'
import { useErrorHandler } from '@/shared/hooks'
import { styles } from './CreateProjectModal.styles'
import { useToast } from '@/shared/components/ui'

export default function CreateProjectModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    keyProject: '',
    description: '',
    startDate: '',
    endDate: '',
    phongbanId: null
  })

  const [memberEmails, setMemberEmails] = useState([''])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleEmailChange = (index, value) => {
    const newEmails = [...memberEmails]
    newEmails[index] = value
    setMemberEmails(newEmails)
  }

  const addEmailField = () => {
    setMemberEmails([...memberEmails, ''])
  }

  const removeEmailField = (index) => {
    if (memberEmails.length > 1) {
      const newEmails = memberEmails.filter((_, i) => i !== index)
      setMemberEmails(newEmails)
    }
  }

  const searchUserByEmail = async (email, index) => {
    if (!email || email.trim() === '') return

    try {
      const users = await userApi.searchUsers(email)
      const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

      if (user) {
        // Kiểm tra xem user đã được thêm chưa
        if (!selectedMembers.find(m => m.userId === user.userId)) {
          setSelectedMembers(prev => [...prev, {
            userId: user.userId,
            username: user.username,
            email: user.email,
            role: 'MEMBER' // Default role
          }])

          // Clear email field sau khi thêm thành công
          const newEmails = [...memberEmails]
          newEmails[index] = ''
          setMemberEmails(newEmails)
        } else {
          toast.warning('Thành viên này đã được thêm vào danh sách!')
        }
      } else {
        toast.error('Không tìm thấy user với email: ' + email)
      }
    } catch (err) {
      toast.error('Lỗi khi tìm kiếm user: ' + (err.response?.data?.message || err.message))
    }
  }

  const removeMember = (userId) => {
    setSelectedMembers(prev => prev.filter(m => m.userId !== userId))
  }

  const updateMemberRole = (userId, newRole) => {
    setSelectedMembers(prev => prev.map(m =>
      m.userId === userId ? { ...m, role: newRole } : m
    ))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate form
      if (!formData.name || !formData.keyProject) {
        throw new Error('Vui lòng điền đầy đủ tên dự án và mã dự án')
      }

      // Tạo dự án (backend sẽ tự động tạo folder)
      const createdProject = await projectApi.createProject(formData)

      // Thêm members vào dự án nếu có
      let addedCount = 0
      let skippedCount = 0

      if (selectedMembers.length > 0) {
        for (const member of selectedMembers) {
          try {
            await projectApi.addMember(createdProject.projectId, {
              userId: member.userId,
              role: member.role
            })
            addedCount++
          } catch (memberError) {
            // Skip nếu member đã tồn tại (409 Conflict) - creator đã được thêm tự động
            if (memberError.response?.status === 409) {
              skippedCount++
              continue
            }
            // Tiếp tục thêm members khác nếu có lỗi
          }
        }
      }

      let successMsg = 'Tạo dự án thành công!'
      if (addedCount > 0) {
        successMsg += ` Đã thêm ${addedCount} thành viên.`
      }
      if (skippedCount > 0) {
        successMsg += ` (${skippedCount} thành viên đã tồn tại)`
      }

      toast.success(successMsg)
      onSuccess && onSuccess(createdProject)
      handleClose()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi tạo dự án')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      keyProject: '',
      description: '',
      startDate: '',
      endDate: '',
      phongbanId: null
    })
    setMemberEmails([''])
    setSelectedMembers([])
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div style={styles.modalOverlay} onClick={handleClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Tạo Dự Án Mới</h2>
          <button style={styles.closeBtn} onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.errorBox}>{error}</div>}

          {/* Thông tin dự án */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Thông tin dự án</h3>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Tên dự án <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                style={styles.input}
                placeholder="Nhập tên dự án"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Mã dự án <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="keyProject"
                value={formData.keyProject}
                onChange={handleInputChange}
                style={styles.input}
                placeholder="VD: PROJ01"
                maxLength={10}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Mô tả</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                style={styles.textarea}
                placeholder="Mô tả dự án..."
                rows={3}
              />
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Ngày bắt đầu</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Ngày kết thúc</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Thêm thành viên */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Thêm thành viên</h3>

            <div style={styles.infoBox}>
              ℹ️ Bạn sẽ tự động trở thành <strong>Chủ dự án</strong> với đầy đủ quyền quản lý.
            </div>

            {memberEmails.map((email, index) => (
              <div key={index} style={styles.emailRow}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(index, e.target.value)}
                  style={styles.emailInput}
                  placeholder="Nhập email thành viên"
                />
                <button
                  type="button"
                  onClick={() => searchUserByEmail(email, index)}
                  style={styles.addBtn}
                >
                  Thêm
                </button>
                {memberEmails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEmailField(index)}
                    style={styles.removeBtn}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addEmailField}
              style={styles.addMoreBtn}
            >
              + Thêm email khác
            </button>

            {/* Danh sách thành viên đã chọn */}
            {selectedMembers.length > 0 && (
              <div style={styles.membersList}>
                <h4 style={styles.membersTitle}>Thành viên đã chọn:</h4>
                {selectedMembers.map((member) => (
                  <div key={member.userId} style={styles.memberCard}>
                    <div style={styles.memberInfo}>
                      <div style={styles.memberAvatar}>
                        {member.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={styles.memberName}>{member.username}</div>
                        <div style={styles.memberEmail}>{member.email}</div>
                      </div>
                    </div>
                    <div style={styles.memberActions}>
                      <select
                        value={member.role}
                        onChange={(e) => updateMemberRole(member.userId, e.target.value)}
                        style={styles.roleSelect}
                      >
                        <option value="MEMBER">Thành viên</option>
                        <option value="MANAGER">Quản lý</option>
                        <option value="VIEWER">Người xem</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeMember(member.userId)}
                        style={styles.removeMemberBtn}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              {loading ? 'Đang tạo...' : 'Tạo dự án'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
