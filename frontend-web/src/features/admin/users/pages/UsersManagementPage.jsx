import { useState, useEffect, useMemo } from 'react'
import { usersService } from '@/shared/services'
import { usePermissions, useErrorHandler } from '@/shared/hooks'
import { validateEmail, validateRequired } from '@/shared/utils/validation'
import { useToast } from '@/shared/components/ui'
import './UsersManagementPage.css'

const ITEMS_PER_PAGE = 10

const roleLabels = {
  'ADMIN': { label: 'Admin', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  'MANAGER_HR': { label: 'HR Manager', color: '#0891b2', bg: 'rgba(8, 145, 178, 0.15)' },
  'MANAGER_ACCOUNTING': { label: 'Kế toán', color: '#059669', bg: 'rgba(5, 150, 105, 0.15)' },
  'MANAGER_PROJECT': { label: 'PM', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  'EMPLOYEE': { label: 'Nhân viên', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' }
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'EMPLOYEE'
  })
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const { isAdmin } = usePermissions()
  const { handleError } = useErrorHandler()
  const toast = useToast()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await usersService.getAll()
      setUsers(data || [])
      setError(null)
    } catch (err) {
      const errorMessage = handleError(err, { context: 'load_users' })
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Filtered and paginated data
  const filteredUsers = useMemo(() => {
    let result = users

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(u =>
        u.username?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
      )
    }

    // Role filter
    if (roleFilter !== 'ALL') {
      result = result.filter(u => u.role === roleFilter)
    }

    return result
  }, [users, searchTerm, roleFilter])

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredUsers, currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, roleFilter])

  const handleCreate = async () => {
    const errors = {}
    if (validateRequired(formData.username, 'Username')) errors.username = 'Username là bắt buộc'
    if (validateEmail(formData.email)) errors.email = 'Email không hợp lệ'
    if (validateRequired(formData.password, 'Password')) errors.password = 'Password là bắt buộc'

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      setSubmitting(true)
      await usersService.create(formData)
      setShowModal(false)
      setFormData({ username: '', email: '', password: '', role: 'EMPLOYEE' })
      setFormErrors({})
      loadUsers()
      toast.success('Tạo user thành công!')
    } catch (err) {
      const errorMessage = handleError(err, { context: 'create_user' })
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (userId, isActive) => {
    try {
      if (isActive) {
        await usersService.deactivate(userId)
      } else {
        await usersService.activate(userId)
      }
      loadUsers()
    } catch (err) {
      const errorMessage = handleError(err, { context: 'toggle_active' })
      toast.error(errorMessage)
    }
  }

  const handleDelete = async (userId) => {
    if (!confirm('Bạn có chắc muốn xóa user này?')) return

    try {
      await usersService.delete(userId)
      loadUsers()
    } catch (err) {
      const errorMessage = handleError(err, { context: 'delete_user' })
      toast.error(errorMessage)
    }
  }

  if (!isAdmin) {
    return (
      <div className="users-error-container">
        <div className="users-error-card">
          <i className="fa-solid fa-lock"></i>
          <h3>Không có quyền truy cập</h3>
          <p>Bạn cần quyền Admin để xem trang này</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="users-loading">
        <div className="users-spinner"></div>
        <p>Đang tải danh sách users...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="users-error-container">
        <div className="users-error-card">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <h3>Lỗi tải dữ liệu</h3>
          <p>{error}</p>
          <button onClick={loadUsers} className="btn-retry">Thử lại</button>
        </div>
      </div>
    )
  }

  return (
    <div className="users-management-container">
      {/* Header */}
      <div className="users-header">
        <div className="users-header-left">
          <h1><i className="fa-solid fa-users"></i> Quản lý Users</h1>
          <p>Tổng cộng {users.length} tài khoản trong hệ thống</p>
        </div>
        <button className="btn-create" onClick={() => setShowModal(true)}>
          <i className="fa-solid fa-plus"></i>
          Tạo user mới
        </button>
      </div>

      {/* Filters */}
      <div className="users-filters">
        <div className="search-box">
          <i className="fa-solid fa-search"></i>
          <input
            type="text"
            placeholder="Tìm kiếm theo username hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>
              <i className="fa-solid fa-times"></i>
            </button>
          )}
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="role-filter"
        >
          <option value="ALL">Tất cả Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER_HR">HR Manager</option>
          <option value="MANAGER_ACCOUNTING">Kế toán</option>
          <option value="MANAGER_PROJECT">PM</option>
          <option value="EMPLOYEE">Nhân viên</option>
        </select>
      </div>

      {/* Table */}
      <div className="users-table-card">
        <table className="users-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>ID</th>
              <th>Thông tin</th>
              <th style={{ width: '140px' }}>Role</th>
              <th style={{ width: '120px' }}>Trạng thái</th>
              <th style={{ width: '180px' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-row">
                  <i className="fa-solid fa-inbox"></i>
                  <span>Không tìm thấy user nào</span>
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => (
                <tr key={user.userId}>
                  <td className="id-cell">{user.userId}</td>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.username} />
                        ) : (
                          user.username?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="user-details">
                        <div className="username">{user.username}</div>
                        <div className="email">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className="role-badge"
                      style={{
                        color: roleLabels[user.role]?.color || '#64748b',
                        backgroundColor: roleLabels[user.role]?.bg || 'rgba(100, 116, 139, 0.15)'
                      }}
                    >
                      {roleLabels[user.role]?.label || user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                      <i className={`fa-solid ${user.isActive ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                      {user.isActive ? 'Hoạt động' : 'Vô hiệu'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className={`btn-action ${user.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                        onClick={() => handleToggleActive(user.userId, user.isActive)}
                        title={user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                      >
                        <i className={`fa-solid ${user.isActive ? 'fa-ban' : 'fa-check'}`}></i>
                      </button>
                      <button
                        className="btn-action btn-delete"
                        onClick={() => handleDelete(user.userId)}
                        title="Xóa user"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(1)}
          >
            <i className="fa-solid fa-angles-left"></i>
          </button>
          <button
            className="page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            <i className="fa-solid fa-angle-left"></i>
          </button>

          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((page, idx, arr) => (
                <span key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && <span className="page-ellipsis">...</span>}
                  <button
                    className={`page-num ${currentPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                </span>
              ))
            }
          </div>

          <button
            className="page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            <i className="fa-solid fa-angle-right"></i>
          </button>
          <button
            className="page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(totalPages)}
          >
            <i className="fa-solid fa-angles-right"></i>
          </button>

          <span className="page-info">
            Trang {currentPage} / {totalPages} ({filteredUsers.length} users)
          </span>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fa-solid fa-user-plus"></i> Tạo User Mới</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Username <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="Nhập username..."
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={formErrors.username ? 'error' : ''}
                />
                {formErrors.username && <span className="error-text">{formErrors.username}</span>}
              </div>

              <div className="form-group">
                <label>Email <span className="required">*</span></label>
                <input
                  type="email"
                  placeholder="Nhập email..."
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={formErrors.email ? 'error' : ''}
                />
                {formErrors.email && <span className="error-text">{formErrors.email}</span>}
              </div>

              <div className="form-group">
                <label>Password <span className="required">*</span></label>
                <input
                  type="password"
                  placeholder="Nhập password..."
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={formErrors.password ? 'error' : ''}
                />
                {formErrors.password && <span className="error-text">{formErrors.password}</span>}
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="EMPLOYEE">Nhân viên</option>
                  <option value="MANAGER_HR">HR Manager</option>
                  <option value="MANAGER_ACCOUNTING">Kế toán</option>
                  <option value="MANAGER_PROJECT">PM</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>
                Hủy
              </button>
              <button className="btn-submit" onClick={handleCreate} disabled={submitting}>
                {submitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i>
                    Tạo User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
