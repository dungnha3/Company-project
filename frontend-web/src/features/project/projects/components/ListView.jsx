import { useEffect, useState, useRef } from 'react'
import { styles } from './ListView.styles'
import { projectApi } from '../api/projectApi'
import { issueApi } from '../api/issueApi'

export default function ListView({ issues, projectId, onUpdate }) {
  const [members, setMembers] = useState([])
  const [statuses, setStatuses] = useState([])
  const [openMenuId, setOpenMenuId] = useState(null)

  // State cho inline editing
  const [editingCell, setEditingCell] = useState(null) // { issueId, field }
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return
      try {
        const [membersData, statusesData] = await Promise.all([
          projectApi.getProjectMembers(projectId),
          projectApi.getIssueStatuses(projectId).catch(() => [
            { statusId: 1, name: 'To Do' },
            { statusId: 2, name: 'In Progress' },
            { statusId: 3, name: 'Review' },
            { statusId: 4, name: 'Done' }
          ])
        ])
        setMembers(membersData || [])
        setStatuses(statusesData || [])
      } catch (e) {
        setMembers([])
        setStatuses([])
      }
    }
    loadData()
  }, [projectId])

  // Focus vào input khi bắt đầu edit
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
      if (inputRef.current.select) {
        inputRef.current.select()
      }
    }
  }, [editingCell])

  const priorities = [
    { value: 'LOW', label: 'Thấp', color: '#10b981' },
    { value: 'MEDIUM', label: 'Trung bình', color: '#f59e0b' },
    { value: 'HIGH', label: 'Cao', color: '#f97316' },
    { value: 'CRITICAL', label: 'Khẩn cấp', color: '#dc2626' }
  ]

  const getStatusColor = (statusName) => {
    const statusColors = {
      'To Do': '#94a3b8',
      'In Progress': '#3b82f6',
      'Review': '#f59e0b',
      'Done': '#10b981'
    }
    return statusColors[statusName] || '#94a3b8'
  }

  const getPriorityColor = (priority) => {
    const found = priorities.find(p => p.value === priority)
    return found?.color || '#94a3b8'
  }

  const getPriorityLabel = (priority) => {
    const found = priorities.find(p => p.value === priority)
    return found?.label || priority
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN')
  }

  const formatDateForInput = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toISOString().split('T')[0]
  }

  // ==================== Inline Editing Handlers ====================

  const startEditing = (e, issueId, field, currentValue) => {
    e.stopPropagation()
    setEditingCell({ issueId, field })
    setEditValue(currentValue || '')
    setOpenMenuId(null)
  }

  const cancelEditing = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const saveEdit = async (issueId, field) => {
    const currentEditingCell = editingCell
    const currentEditValue = editValue

    if (!currentEditingCell) return

    // Cancel editing first to prevent re-triggering
    cancelEditing()

    try {
      const issue = issues.find(i => i.issueId === issueId)
      if (!issue) return

      let updateData = {}

      switch (field) {
        case 'title':
          if (currentEditValue.trim() && currentEditValue !== issue.title) {
            updateData = { title: currentEditValue.trim() }
          }
          break
        case 'dueDate':
          // Always update dueDate when it's different or being cleared
          const currentDueDate = formatDateForInput(issue.dueDate)
          if (currentEditValue !== currentDueDate) {
            updateData = { dueDate: currentEditValue || null }
          }
          break
        default:
          break
      }

      if (Object.keys(updateData).length > 0) {
        console.log('Updating issue:', issueId, updateData)
        await issueApi.updateIssue(issueId, updateData)
        if (onUpdate) await onUpdate()
      }
    } catch (e) {
      console.error('Lỗi khi cập nhật:', e)
    }
  }

  const handleKeyDown = (e, issueId, field) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit(issueId, field)
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  const handleInputChange = (e) => {
    e.stopPropagation()
    setEditValue(e.target.value)
  }

  const handleStatusChange = async (issueId, statusId) => {
    setOpenMenuId(null)
    try {
      await issueApi.changeIssueStatus(issueId, statusId)
      if (onUpdate) await onUpdate()
    } catch (e) {
      console.error('Lỗi khi thay đổi trạng thái:', e)
    }
  }

  const handlePriorityChange = async (issueId, priority) => {
    setOpenMenuId(null)
    try {
      await issueApi.updateIssue(issueId, { priority })
      if (onUpdate) await onUpdate()
    } catch (e) {
      console.error('Lỗi khi thay đổi độ ưu tiên:', e)
    }
  }

  const handleSelectMember = async (issueId, assigneeId) => {
    setOpenMenuId(null)
    try {
      await issueApi.assignIssue(issueId, assigneeId)
      if (onUpdate) await onUpdate()
    } catch (e) {
      console.error(e)
    }
  }

  // ==================== Render Components ====================

  const UserAvatar = ({ name, size = '28px', fontSize = '12px' }) => (
    <div style={{ ...styles.userAvatar, width: size, height: size, fontSize: fontSize }}>
      {name?.charAt(0)?.toUpperCase() || 'U'}
    </div>
  )

  const EmptyAvatarIcon = () => (
    <div style={styles.emptyAvatar}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )

  // Check if currently editing this cell
  const isEditingCell = (issueId, field) => {
    return editingCell?.issueId === issueId && editingCell?.field === field
  }

  if (issues.length === 0) {
    return (
      <div className="card" style={{ padding: '60px', textAlign: 'center', color: '#888' }}>
        <i className="fa-solid fa-clipboard-check" style={{ fontSize: '3rem', marginBottom: '20px', opacity: 0.3 }}></i>
        <p>Chưa có tác vụ nào.</p>
        <button className="btn-primary" style={{ margin: '15px auto' }}>+ Tạo tác vụ mới</button>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Lớp phủ để đóng menu dropdown khi click ra ngoài */}
      {openMenuId && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 10, cursor: 'default' }}
          onClick={() => setOpenMenuId(null)}
        />
      )}

      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <button style={styles.filterButton}>☆ Tên</button>
          <button style={styles.filterButton}>Giai đoạn Kanban</button>
          <button style={styles.filterButton}>Hoạt động ▼</button>
          <button style={styles.filterButton}>Hạn chốt</button>
          <button style={styles.filterButton}>Người tạo</button>
          <button style={styles.filterButton}>Người được phân công</button>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Tìm kiếm..."
            style={{
              padding: '8px 15px 8px 35px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.6)',
              background: 'rgba(255,255,255,0.4)', outline: 'none'
            }}
          />
          <i className="fa-solid fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: '0.8rem' }}></i>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead style={styles.tableHead}>
            <tr>
              <th style={styles.tableHeader}>Tên</th>
              <th style={styles.tableHeader}>Giai đoạn Kanban</th>
              <th style={styles.tableHeader}>Hoạt động</th>
              <th style={styles.tableHeader}>Hạn chốt</th>
              <th style={styles.tableHeader}>Người tạo</th>
              <th style={{ ...styles.tableHeader, minWidth: '180px' }}>Người được phân công</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.issueId} style={styles.tableRow}>
                {/* Cột Tên - Editable */}
                <td style={styles.tableCell}>
                  {isEditingCell(issue.issueId, 'title') ? (
                    <div style={styles.issueName}>
                      <span style={styles.issueKey}>{issue.issueKey}</span>
                      <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={handleInputChange}
                        onBlur={() => saveEdit(issue.issueId, 'title')}
                        onKeyDown={(e) => handleKeyDown(e, issue.issueId, 'title')}
                        style={styles.editInput}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div
                      style={{ ...styles.issueName, ...styles.editableCell }}
                      onClick={(e) => startEditing(e, issue.issueId, 'title', issue.title)}
                      title="Click để sửa"
                    >
                      <span style={styles.issueKey}>{issue.issueKey}</span>
                      {issue.title}
                    </div>
                  )}
                </td>

                {/* Cột Status - Dropdown */}
                <td style={styles.tableCell}>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        ...styles.editableCell,
                        backgroundColor: getStatusColor(issue.statusName) + '20',
                        color: getStatusColor(issue.statusName),
                      }}
                      onClick={() => setOpenMenuId(openMenuId === `status-${issue.issueId}` ? null : `status-${issue.issueId}`)}
                      title="Click để thay đổi trạng thái"
                    >
                      {issue.statusName || 'N/A'}
                    </span>

                    {openMenuId === `status-${issue.issueId}` && (
                      <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.dropdownHeader}>Chọn trạng thái</div>
                        {statuses.map((status) => (
                          <div
                            key={status.statusId}
                            style={styles.dropdownItem}
                            onClick={() => handleStatusChange(issue.issueId, status.statusId)}
                          >
                            <span style={{
                              ...styles.statusBadge,
                              backgroundColor: getStatusColor(status.name) + '20',
                              color: getStatusColor(status.name),
                            }}>
                              {status.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>

                {/* Cột Priority - Dropdown */}
                <td style={styles.tableCell}>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        ...styles.priorityBadge,
                        ...styles.editableCell,
                        backgroundColor: getPriorityColor(issue.priority) + '20',
                        color: getPriorityColor(issue.priority),
                      }}
                      onClick={() => setOpenMenuId(openMenuId === `priority-${issue.issueId}` ? null : `priority-${issue.issueId}`)}
                      title="Click để thay đổi độ ưu tiên"
                    >
                      {getPriorityLabel(issue.priority)}
                    </span>

                    {openMenuId === `priority-${issue.issueId}` && (
                      <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.dropdownHeader}>Chọn độ ưu tiên</div>
                        {priorities.map((priority) => (
                          <div
                            key={priority.value}
                            style={styles.dropdownItem}
                            onClick={() => handlePriorityChange(issue.issueId, priority.value)}
                          >
                            <span style={{
                              ...styles.priorityBadge,
                              backgroundColor: priority.color + '20',
                              color: priority.color,
                            }}>
                              {priority.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>

                {/* Cột DueDate - Date Picker */}
                <td style={styles.tableCell}>
                  {isEditingCell(issue.issueId, 'dueDate') ? (
                    <input
                      ref={inputRef}
                      type="date"
                      value={editValue}
                      onChange={handleInputChange}
                      onBlur={() => saveEdit(issue.issueId, 'dueDate')}
                      onKeyDown={(e) => handleKeyDown(e, issue.issueId, 'dueDate')}
                      style={styles.dateInput}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <span
                      style={styles.editableCell}
                      onClick={(e) => startEditing(e, issue.issueId, 'dueDate', formatDateForInput(issue.dueDate))}
                      title="Click để chọn ngày"
                    >
                      {formatDate(issue.dueDate)}
                    </span>
                  )}
                </td>

                <td style={styles.tableCell}>
                  <div style={styles.userInfo}>
                    <UserAvatar name={issue.reporterName} />
                    <span style={styles.userName}>
                      {issue.reporterName || 'N/A'}
                    </span>
                  </div>
                </td>

                {/* Cột Người được phân công - Dropdown */}
                <td style={styles.tableCell}>
                  <div
                    style={styles.assigneeContainer}
                    onClick={() => setOpenMenuId(openMenuId === issue.issueId ? null : issue.issueId)}
                    className="hover-bg"
                  >
                    {issue.assigneeName ? (
                      <>
                        <UserAvatar name={issue.assigneeName} size="24px" />
                        <span>{issue.assigneeName}</span>
                      </>
                    ) : (
                      <>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fa-solid fa-user-plus" style={{ fontSize: '0.7rem', color: '#999' }}></i></div>
                        <span style={{ color: '#999', fontSize: '0.85rem' }}>Chưa gán</span>
                      </>
                    )}

                    {openMenuId === issue.issueId && members.length > 0 && (
                      <div style={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.dropdownHeader}>Chọn thành viên</div>
                        <div
                          style={styles.dropdownItem}
                          onClick={() => handleSelectMember(issue.issueId, null)}
                        >
                          <EmptyAvatarIcon />
                          <span style={styles.dropdownItemName}>-- Chưa gán --</span>
                        </div>
                        {members.map((m) => (
                          <div
                            key={m.userId}
                            style={styles.dropdownItem}
                            onClick={() => handleSelectMember(issue.issueId, m.userId)}
                          >
                            <UserAvatar name={m.username} size="24px" fontSize="10px" />
                            <span style={styles.dropdownItemName}>{m.username}</span>
                            {m.role && <span style={styles.roleBadge}>{m.role}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
