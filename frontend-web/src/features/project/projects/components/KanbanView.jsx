import { useState } from 'react'
import { issueApi } from '../api/issueApi'
import { useToast } from '@/shared/components/ui'

export default function KanbanView({ issues, projectId, onUpdate }) {
  const [draggedIssue, setDraggedIssue] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)
  const toast = useToast()

  const columns = [
    { id: 1, name: 'To Do', title: 'Cần làm', color: '#94a3b8', bg: '#f1f5f9' },
    { id: 2, name: 'In Progress', title: 'Đang tiến hành', color: '#3b82f6', bg: '#dbeafe' },
    { id: 4, name: 'Done', title: 'Đã xong', color: '#10b981', bg: '#dcfce7' },
  ]

  const getIssuesByStatus = (statusId) => issues.filter(issue => issue.statusId === statusId)

  const handleDragStart = (e, issue) => {
    setDraggedIssue(issue)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.currentTarget)
  }

  const handleDragOver = (e, columnId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }

  const handleDrop = async (e, targetStatusId) => {
    e.preventDefault(); e.stopPropagation(); setDragOverColumn(null);
    if (!draggedIssue || draggedIssue.statusId === targetStatusId) { setDraggedIssue(null); return; }

    try {
      await issueApi.changeIssueStatus(draggedIssue.issueId, targetStatusId)
      if (onUpdate) onUpdate()
    } catch (error) {
      toast.error('Lỗi cập nhật trạng thái')
    } finally {
      setDraggedIssue(null)
    }
  }

  if (issues.length === 0) {
    return (
      <div className="card" style={{ padding: '60px', textAlign: 'center', color: '#888' }}>
        <i className="fa-solid fa-border-all" style={{ fontSize: '3rem', marginBottom: '20px', opacity: 0.3 }}></i>
        <p>Không có dữ liệu cho bảng Kanban.</p>
        <button className="btn-primary" style={{ margin: '15px auto' }}>+ Tạo tác vụ mới</button>
      </div>
    )
  }

  return (
    <div className="accounting-animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div className="card" style={{ padding: '15px 20px', marginBottom: '20px', display: 'flex', gap: '15px' }}>
        <button className="btn-primary" style={{ padding: '8px 15px', background: 'var(--primary-color)', color: 'white', border: 'none' }}>
          <i className="fa-solid fa-plus"></i> Tạo tác vụ
        </button>
        <button className="btn-primary" style={{ padding: '8px 15px', background: 'transparent', color: '#555', border: '1px solid #ccc' }}>
          Người thực hiện ▼
        </button>
        <button className="btn-primary" style={{ padding: '8px 15px', background: 'transparent', color: '#555', border: '1px solid #ccc' }}>
          Độ ưu tiên ▼
        </button>
      </div>

      {/* Board */}
      <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px', alignItems: 'flex-start' }}>
        {columns.map(column => {
          const columnIssues = getIssuesByStatus(column.id);
          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => handleDrop(e, column.id)}
              style={{
                flex: '0 0 320px',
                background: dragOverColumn === column.id ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '15px',
                border: '1px solid rgba(255,255,255,0.4)',
                transition: 'background 0.2s'
              }}
            >
              {/* Column Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: column.color }}></div>
                  <span style={{ fontWeight: 700, color: '#333' }}>{column.title}</span>
                  <span style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600, color: '#666' }}>{columnIssues.length}</span>
                </div>
                <button style={{ border: 'none', background: 'transparent', color: '#666', cursor: 'pointer' }}><i className="fa-solid fa-plus"></i></button>
              </div>

              {/* Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', minHeight: '100px' }}>
                {columnIssues.map(issue => (
                  <div
                    key={issue.issueId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, issue)}
                    className="card"
                    style={{
                      padding: '15px', marginBottom: 0,
                      cursor: 'grab',
                      opacity: draggedIssue?.issueId === issue.issueId ? 0.5 : 1,
                      transform: draggedIssue?.issueId === issue.issueId ? 'scale(0.95)' : 'none',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                      border: '1px solid rgba(255,255,255,0.6)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', background: '#f5f6fa', padding: '2px 6px', borderRadius: '4px' }}>{issue.issueKey}</span>
                      {issue.dueDate && <span style={{ fontSize: '0.75rem', color: '#888' }}>📅 {new Date(issue.dueDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>}
                    </div>
                    <div style={{ fontWeight: 600, color: '#2c3e50', fontSize: '0.95rem', marginBottom: '8px' }}>{issue.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>

                      {/* Priority Indicator */}
                      {issue.priority === 'HIGH' || issue.priority === 'CRITICAL' ? (
                        <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}><i className="fa-solid fa-angles-up"></i> Cao</span>
                      ) : issue.priority === 'MEDIUM' ? (
                        <span style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600 }}><i className="fa-solid fa-angle-up"></i> TB</span>
                      ) : (
                        <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}><i className="fa-solid fa-angle-down"></i> Thấp</span>
                      )}

                      {/* Assignee Avatar */}
                      {issue.assigneeName && (
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#a29bfe', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }} title={issue.assigneeName}>
                          {issue.assigneeName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
