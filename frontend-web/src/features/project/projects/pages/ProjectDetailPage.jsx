import { useState, useEffect } from 'react'
import { projectApi, userApi } from '../api/projectApi'
import { issueApi } from '../api/issueApi'
import ListView from '../components/ListView'
import KanbanView from '../components/KanbanView'
import { styles } from './ProjectDetailPage.styles'

export default function ProjectDetailPage({ projectId, onBack }) {
  const [project, setProject] = useState(null)
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('list') // 'list' or 'kanban'
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: 'ACTIVE',
    startDate: '',
    endDate: ''
  })
  const [saving, setSaving] = useState(false)

  // Member management states
  const [members, setMembers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('MEMBER')
  const [addingMember, setAddingMember] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState(null)

  useEffect(() => {
    loadProjectData()
  }, [projectId])

  const loadProjectData = async () => {
    setLoading(true)
    try {
      // Load project details
      const projectData = await projectApi.getProjectById(projectId)
      setProject(projectData)

      // Load project issues
      const issuesData = await issueApi.getProjectIssues(projectId)
      setIssues(issuesData)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async () => {
    try {
      const membersData = await projectApi.getProjectMembers(projectId)
      setMembers(membersData || [])
    } catch (error) {
      console.error('Lỗi khi tải thành viên:', error)
    }
  }

  const loadAllUsers = async () => {
    try {
      // Try getActiveUsers first, fallback to getAllUsers
      let usersData = null
      try {
        usersData = await userApi.getActiveUsers()
      } catch (e) {
        console.log('getActiveUsers failed, trying getAllUsers')
        usersData = await userApi.getAllUsers()
      }
      console.log('Loaded users:', usersData)
      setAllUsers(usersData || [])
    } catch (error) {
      console.error('Lỗi khi tải danh sách người dùng:', error)
      setAllUsers([])
    }
  }

  const handleIssueUpdate = async () => {
    try {
      const issuesData = await issueApi.getProjectIssues(projectId)
      setIssues(issuesData)
    } catch (error) {
      console.error(error)
    }
  }

  const openEditModal = async () => {
    setEditForm({
      name: project.name || '',
      description: project.description || '',
      status: project.status || 'ACTIVE',
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      endDate: project.endDate ? project.endDate.split('T')[0] : ''
    })
    setIsEditModalOpen(true)
    // Load members and all users when modal opens
    await Promise.all([loadMembers(), loadAllUsers()])
  }

  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveProject = async () => {
    setSaving(true)
    try {
      await projectApi.updateProject(projectId, {
        name: editForm.name,
        description: editForm.description,
        status: editForm.status,
        startDate: editForm.startDate || null,
        endDate: editForm.endDate || null
      })
      await loadProjectData()
      setIsEditModalOpen(false)
    } catch (error) {
      console.error('Lỗi khi cập nhật dự án:', error)
      alert('Không thể cập nhật dự án')
    } finally {
      setSaving(false)
    }
  }

  const handleAddMember = async () => {
    if (!selectedUserId) return
    setAddingMember(true)
    try {
      await projectApi.addMember(projectId, {
        userId: parseInt(selectedUserId),
        role: selectedRole
      })
      await loadMembers()
      setSelectedUserId('')
      setSelectedRole('MEMBER')
      setSearchKeyword('')
    } catch (error) {
      console.error('Lỗi khi thêm thành viên:', error)
      alert('Không thể thêm thành viên. Có thể người này đã là thành viên.')
    } finally {
      setAddingMember(false)
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Bạn có chắc muốn xóa thành viên này?')) return
    setRemovingMemberId(memberId)
    try {
      await projectApi.removeMember(projectId, memberId)
      await loadMembers()
    } catch (error) {
      console.error('Lỗi khi xóa thành viên:', error)
      alert('Không thể xóa thành viên')
    } finally {
      setRemovingMemberId(null)
    }
  }

  // Filter users that are not already members
  const availableUsers = allUsers.filter(user => {
    const isMember = members.some(m => m.userId === user.userId)
    const matchesSearch = !searchKeyword ||
      user.username?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchKeyword.toLowerCase())
    return !isMember && matchesSearch
  })

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'OWNER': return { bg: '#fef3c7', color: '#d97706' }
      case 'MANAGER': return { bg: '#dbeafe', color: '#2563eb' }
      default: return { bg: '#e5e7eb', color: '#6b7280' }
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', color: '#666' }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '15px' }}></i>
        <p>Đang tải dự án...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#e74c3c' }}>
        <h3>Không tìm thấy dự án</h3>
        <button className="btn-primary" onClick={onBack} style={{ margin: '20px auto' }}>
          <i className="fa-solid fa-arrow-left"></i> Quay lại
        </button>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 100
            }}
            onClick={() => setIsEditModalOpen(false)}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '600px',
            maxWidth: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            zIndex: 101,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: '600' }}>
              Chỉnh sửa dự án
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                Tên dự án *
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => handleEditFormChange('name', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                Mô tả
              </label>
              <textarea
                value={editForm.description}
                onChange={(e) => handleEditFormChange('description', e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                Trạng thái
              </label>
              <select
                value={editForm.status}
                onChange={(e) => handleEditFormChange('status', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="PLANNING">Lập kế hoạch</option>
                <option value="ON_HOLD">Tạm dừng</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Ngày bắt đầu
                </label>
                <input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => handleEditFormChange('startDate', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Ngày kết thúc
                </label>
                <input
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => handleEditFormChange('endDate', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Member Management Section */}
            <div style={{ marginBottom: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                <i className="fa-solid fa-users" style={{ marginRight: '8px' }}></i>
                Thành viên dự án ({members.length})
              </label>

              {/* Add Member Form */}
              <div style={{
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ flex: 2, position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Nhập email hoặc tên người dùng..."
                      value={searchKeyword}
                      onChange={(e) => {
                        setSearchKeyword(e.target.value)
                        // Auto-select if exact email match found
                        const exactMatch = allUsers.find(u =>
                          u.email?.toLowerCase() === e.target.value.toLowerCase() &&
                          !members.some(m => m.userId === u.userId)
                        )
                        if (exactMatch) {
                          setSelectedUserId(String(exactMatch.userId))
                        } else {
                          setSelectedUserId('')
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '13px',
                      minWidth: '100px'
                    }}
                  >
                    <option value="MEMBER">Member</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                  <button
                    onClick={handleAddMember}
                    disabled={!selectedUserId || addingMember}
                    style={{
                      padding: '10px 16px',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: selectedUserId && !addingMember ? '#10b981' : '#e5e7eb',
                      color: selectedUserId && !addingMember ? 'white' : '#9ca3af',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: selectedUserId && !addingMember ? 'pointer' : 'not-allowed',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {addingMember ? '...' : '+ Thêm'}
                  </button>
                </div>

                {/* User suggestions dropdown */}
                {searchKeyword && availableUsers.length > 0 && !selectedUserId && (
                  <div style={{
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    maxHeight: '150px',
                    overflowY: 'auto'
                  }}>
                    {availableUsers.slice(0, 5).map(user => (
                      <div
                        key={user.userId}
                        onClick={() => {
                          setSelectedUserId(String(user.userId))
                          setSearchKeyword(user.email || user.username)
                        }}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {user.username?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '500' }}>{user.username}</div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>{user.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected user indicator */}
                {selectedUserId && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#dcfce7',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#166534'
                  }}>
                    <i className="fa-solid fa-check-circle"></i>
                    <span>Đã chọn: <strong>{allUsers.find(u => String(u.userId) === selectedUserId)?.username || searchKeyword}</strong></span>
                    <button
                      onClick={() => {
                        setSelectedUserId('')
                        setSearchKeyword('')
                      }}
                      style={{
                        marginLeft: 'auto',
                        background: 'none',
                        border: 'none',
                        color: '#166534',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ✕ Hủy
                    </button>
                  </div>
                )}

                {/* No results message */}
                {searchKeyword && availableUsers.length === 0 && !selectedUserId && (
                  <div style={{
                    padding: '12px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '13px',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db'
                  }}>
                    Không tìm thấy người dùng với "{searchKeyword}"
                  </div>
                )}
              </div>

              {/* Members List */}
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}>
                {members.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
                    Chưa có thành viên nào
                  </div>
                ) : (
                  members.map((member, index) => {
                    const roleStyle = getRoleBadgeColor(member.role)
                    return (
                      <div
                        key={member.userId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderBottom: index < members.length - 1 ? '1px solid #e5e7eb' : 'none',
                          backgroundColor: index % 2 === 0 ? 'white' : '#fafafa'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            fontWeight: '600'
                          }}>
                            {member.username?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '500' }}>{member.username}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{member.email}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '500',
                            backgroundColor: roleStyle.bg,
                            color: roleStyle.color
                          }}>
                            {member.role}
                          </span>
                          {member.role !== 'OWNER' && (
                            <button
                              onClick={() => handleRemoveMember(member.memberId || member.userId)}
                              disabled={removingMemberId === (member.memberId || member.userId)}
                              style={{
                                padding: '4px 8px',
                                border: 'none',
                                borderRadius: '4px',
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                              title="Xóa thành viên"
                            >
                              {removingMemberId === (member.memberId || member.userId) ? '...' : '✕'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleSaveProject}
                disabled={saving || !editForm.name.trim()}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving || !editForm.name.trim() ? 0.6 : 1
                }}
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backButton} onClick={onBack}>
            ← Quay lại
          </button>

          <div style={{ width: '50px', height: '50px', background: '#ffeaa7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
            📁
          </div>

          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-dark)' }}>{project.name}</h1>
            {project.description && (
              <p style={{ margin: '5px 0 0 0', color: 'var(--text-light)', fontSize: '0.9rem' }}>{project.description}</p>
            )}
          </div>
        </div>

        <div style={styles.headerRight}>
          <button style={styles.moreButton} onClick={openEditModal} title="Chỉnh sửa dự án">
            ⋯
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={styles.tabsContainer}>
        <div style={styles.tabsList}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'list' ? styles.tabActive : {})
            }}
            onClick={() => setActiveTab('list')}
          >
            Danh sách
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'kanban' ? styles.tabActive : {})
            }}
            onClick={() => setActiveTab('kanban')}
          >
            Kanban
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ minHeight: '500px' }}>
        {activeTab === 'list' ? (
          <ListView
            issues={issues}
            projectId={projectId}
            onUpdate={handleIssueUpdate}
          />
        ) : (
          <KanbanView
            issues={issues}
            projectId={projectId}
            onUpdate={handleIssueUpdate}
          />
        )}
      </div>
    </div>
  )
}

