import { useState, useEffect } from 'react';
import CreateProjectModal from './components/CreateProjectModal';
import CreateIssueModal from './components/CreateIssueModal';
import { projectApi } from './api/projectApi';
import { issueApi } from './api/issueApi';
import { dashboardApi } from './api/dashboardApi';
import ProjectDetailPage from './pages/ProjectDetailPage';
import IssueDetailPage from './pages/IssueDetailPage';
import { usePermissions, useErrorHandler } from '@/shared/hooks';

export default function ProjectsPage({ glassMode = false }) {
  const [mainTab, setMainTab] = useState('tasks'); // tasks | projects | performance
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const { isProjectManager, isHRManager } = usePermissions();
  const { handleError } = useErrorHandler();

  if (!isProjectManager && !isHRManager) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <div style={{ fontSize: '20px', fontWeight: '600', color: '#ef4444' }}>Không có quyền truy cập</div>
        <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>Chỉ Project Manager hoặc HR Manager mới có quyền quản lý dự án</div>
      </div>
    );
  }

  useEffect(() => {
    loadProjects()

    // Lắng nghe event từ AI ChatBot để reload khi có thay đổi
    const handleAiDataChanged = (event) => {
      const { actionType } = event.detail || {}
      // Reload projects nếu AI tạo project hoặc setup hoàn chỉnh
      if (actionType === 'CREATE_PROJECT' || actionType === 'SETUP_PROJECT_COMPLETE' || actionType === 'BATCH_CREATE') {
        loadProjects()
      }
    }

    window.addEventListener('ai-data-changed', handleAiDataChanged)

    return () => {
      window.removeEventListener('ai-data-changed', handleAiDataChanged)
    }
  }, [])

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await projectApi.getAllProjects();
      setProjects(data);
    } catch (error) {
      handleError(error, { context: 'load_projects' });
    } finally {
      setLoading(false);
    }
  };

  const handleProjectCreated = (newProject) => {
    loadProjects()
  }

  return (
    <div className="accounting-animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

      {/* HR Notice */}
      {isHRManager && !isProjectManager && (
        <div className="card" style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '15px', borderLeft: '4px solid #3b82f6' }}>
          <i className="fa-solid fa-circle-info" style={{ fontSize: '1.2rem', color: '#3b82f6' }}></i>
          <div>
            <div style={{ fontWeight: 600, color: '#3b82f6' }}>Chế độ chỉ xem</div>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
              HR Manager chỉ có quyền xem thông tin. Để tạo/chỉnh sửa, vui lòng liên hệ Project Manager.
            </div>
          </div>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="card" style={{ padding: '0 25px', display: 'flex', gap: '30px', alignItems: 'center', height: '65px' }}>
        <button
          onClick={() => setMainTab('tasks')}
          style={{
            height: '100%', border: 'none', background: 'transparent', cursor: 'pointer',
            borderBottom: mainTab === 'tasks' ? '3px solid var(--primary-color)' : '3px solid transparent',
            color: mainTab === 'tasks' ? 'var(--primary-color)' : 'var(--text-light)',
            fontWeight: mainTab === 'tasks' ? 700 : 500, fontSize: '1rem', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <i className="fa-solid fa-list-check"></i> Tác vụ của tôi
        </button>
        <button
          onClick={() => setMainTab('projects')}
          style={{
            height: '100%', border: 'none', background: 'transparent', cursor: 'pointer',
            borderBottom: mainTab === 'projects' ? '3px solid var(--primary-color)' : '3px solid transparent',
            color: mainTab === 'projects' ? 'var(--primary-color)' : 'var(--text-light)',
            fontWeight: mainTab === 'projects' ? 700 : 500, fontSize: '1rem', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <i className="fa-solid fa-folder-open"></i> Dự án
        </button>
        <button
          onClick={() => setMainTab('performance')}
          style={{
            height: '100%', border: 'none', background: 'transparent', cursor: 'pointer',
            borderBottom: mainTab === 'performance' ? '3px solid var(--primary-color)' : '3px solid transparent',
            color: mainTab === 'performance' ? 'var(--primary-color)' : 'var(--text-light)',
            fontWeight: mainTab === 'performance' ? 700 : 500, fontSize: '1rem', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <i className="fa-solid fa-chart-line"></i> Hiệu suất
        </button>
      </div>

      {/* Content Area */}
      <div>
        {mainTab === 'tasks' ? (
          <TasksTab key="tasks-tab" isProjectManager={isProjectManager} />
        ) : mainTab === 'projects' ? (
          <ProjectsTab
            projects={projects}
            loading={loading}
            onProjectCreated={handleProjectCreated}
            isProjectManager={isProjectManager}
          />
        ) : (
          <PerformanceTab key="performance-tab" />
        )}
      </div>
    </div>
  )
}

// --- SUB COMPONENTS ---

// 1. Tasks Tab
function TasksTab({ isProjectManager }) {
  const [viewMode, setViewMode] = useState('list');
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  const { handleError } = useErrorHandler();

  useEffect(() => {
    loadIssues();

    // Lắng nghe event từ AI ChatBot để reload khi có thay đổi
    const handleAiDataChanged = (event) => {
      const { actionType } = event.detail || {}
      // Reload issues nếu AI tạo issue hoặc thay đổi status
      if (['CREATE_ISSUE', 'CREATE_MULTIPLE_ISSUES', 'CHANGE_ISSUE_STATUS',
        'ASSIGN_ISSUE', 'SETUP_PROJECT_COMPLETE', 'BATCH_CREATE'].includes(actionType)) {
        loadIssues()
      }
    }

    window.addEventListener('ai-data-changed', handleAiDataChanged)

    return () => {
      window.removeEventListener('ai-data-changed', handleAiDataChanged)
    }
  }, []);

  const loadIssues = async () => {
    setLoading(true);
    try {
      const data = await issueApi.getMyIssues();
      setIssues(data);
    } catch (error) {
      handleError(error, { context: 'load_my_issues' });
    } finally {
      setLoading(false);
    }
  };

  const handleIssueCreated = () => loadIssues();

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  // Handler khi quay lại từ IssueDetailPage - reload danh sách
  const handleBackFromDetail = () => {
    setSelectedIssueId(null)
    loadIssues() // Reload để cập nhật trạng thái mới
  }

  // Nếu đã chọn issue, hiển thị IssueDetailPage
  if (selectedIssueId) {
    return (
      <IssueDetailPage
        issueId={selectedIssueId}
        onBack={handleBackFromDetail}
        onUpdate={loadIssues}
      />
    )
  }


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toolbar */}
      <div className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          {isProjectManager && (
            <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
              <i className="fa-solid fa-plus"></i> Tạo tác vụ
            </button>
          )}
          <select style={{ padding: '8px 15px', borderRadius: '8px', border: '1px solid #ccc', background: 'rgba(255,255,255,0.5)', outline: 'none' }}>
            <option>Tất cả các vai trò</option>
            <option>Người tạo</option>
            <option>Người được phân công</option>
          </select>
          <select style={{ padding: '8px 15px', borderRadius: '8px', border: '1px solid #ccc', background: 'rgba(255,255,255,0.5)', outline: 'none' }}>
            <option>Tất cả trạng thái</option>
            <option>Đang tiến hành</option>
            <option>Hoàn thành</option>
          </select>
        </div>
        <div style={{ position: 'relative', width: '250px' }}>
          <i className="fa-solid fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}></i>
          <input type="text" placeholder="Tìm kiếm tác vụ..." style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '8px', border: '1px solid #ccc', background: 'rgba(255,255,255,0.5)', outline: 'none' }} />
        </div>
      </div>

      {/* View Mode & Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #eee', background: 'rgba(255,255,255,0.3)' }}>
          <button
            onClick={() => setViewMode('list')}
            style={{ padding: '15px 20px', border: 'none', background: 'transparent', color: viewMode === 'list' ? 'var(--primary-color)' : '#666', borderBottom: viewMode === 'list' ? '2px solid var(--primary-color)' : 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            📋 Danh sách
          </button>
          <button
            onClick={() => setViewMode('deadline')}
            style={{ padding: '15px 20px', border: 'none', background: 'transparent', color: viewMode === 'deadline' ? 'var(--primary-color)' : '#666', borderBottom: viewMode === 'deadline' ? '2px solid var(--primary-color)' : 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            ⏰ Hạn chót
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <th style={styles.th}>Tên tác vụ</th>
                <th style={styles.th}>Dự án</th>
                <th style={styles.th}>Trạng thái</th>
                <th style={styles.th}>Hạn chót</th>
                <th style={styles.th}>Người thực hiện</th>
                <th style={styles.th}>Người tạo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#666' }}>Đang tải dữ liệu...</td></tr>
              ) : issues.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#666' }}>Chưa có tác vụ nào.</td></tr>
              ) : (
                issues.map(task => (
                  <tr key={task.issueId} onClick={() => setSelectedIssueId(task.issueId)} style={styles.tr}>
                    <td style={styles.td}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#666', background: '#f5f6fa', padding: '2px 5px', borderRadius: '4px', marginRight: '8px' }}>{task.issueKey}</span>
                        <span style={{ fontWeight: 600, color: '#333' }}>{task.title}</span>
                      </div>
                    </td>
                    <td style={styles.td}><span style={styles.projectBadge}>{task.projectName}</span></td>
                    <td style={styles.td}>
                      <span className="badge" style={{ backgroundColor: task.statusColor + '20' || '#eee', color: task.statusColor || '#666' }}>
                        {task.statusName}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {task.dueDate ? (
                        <span style={{ color: new Date(task.dueDate) < new Date() ? '#ef4444' : '#666', fontWeight: new Date(task.dueDate) < new Date() ? 600 : 400 }}>
                          {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={styles.td}>
                      <UserInfo name={task.assigneeName} />
                    </td>
                    <td style={styles.td}>
                      <UserInfo name={task.reporterName} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateIssueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleIssueCreated}
      />
    </div>
  )
}

// 2. Projects Tab
function ProjectsTab({ projects, loading, onProjectCreated, isProjectManager }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState(null)

  if (selectedProjectId) {
    return <ProjectDetailPage projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toolbar */}
      <div className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '15px' }}>
          {isProjectManager && (
            <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
              <i className="fa-solid fa-plus"></i> Tạo dự án mới
            </button>
          )}
          <select style={{ padding: '8px 15px', borderRadius: '8px', border: '1px solid #ccc', background: 'rgba(255,255,255,0.5)', outline: 'none' }}>
            <option>Dự án của tôi</option>
            <option>Tất cả dự án</option>
          </select>
        </div>
        <div style={{ position: 'relative', width: '250px' }}>
          <i className="fa-solid fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}></i>
          <input type="text" placeholder="Tìm kiếm dự án..." style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '8px', border: '1px solid #ccc', background: 'rgba(255,255,255,0.5)', outline: 'none' }} />
        </div>
      </div>

      {/* Projects Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Tên dự án</th>
                <th style={styles.th}>Mô tả</th>
                <th style={styles.th}>Trạng thái</th>
                <th style={styles.th}>Thời gian</th>
                <th style={styles.th}>Người quản lý</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#666' }}>Đang tải dữ liệu...</td></tr>
              ) : projects.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#666' }}>Chưa có dự án nào.</td></tr>
              ) : (
                projects.map(project => (
                  <tr key={project.projectId} onClick={() => setSelectedProjectId(project.projectId)} style={styles.tr}>
                    <td style={styles.td}><span style={{ color: '#888', fontSize: '0.85rem' }}>#{project.keyProject}</span></td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-folder" style={{ color: '#ffd32a' }}></i> {project.name}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#666', fontSize: '0.9rem' }}>
                        {project.description || '-'}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {getStatusBadge(project.status)}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>
                        {new Date(project.startDate).toLocaleDateString('vi-VN')} - {new Date(project.endDate).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <UserInfo name={project.createdByName} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newProject) => {
          onProjectCreated(newProject)
        }}
      />
    </div>
  )
}

// 3. Performance Tab
function PerformanceTab() {
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState({ totalProjects: 0, totalIssues: 0, completedIssues: 0, avgCompletionRate: 0, totalOverdue: 0 })

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const data = await dashboardApi.getMyProjectsStats()
        setStats(data)
        // Calculate summary
        const totalProjects = data.length
        const totalIssues = data.reduce((s, p) => s + p.totalIssues, 0)
        const completedIssues = data.reduce((s, p) => s + p.completedIssues, 0)
        const avgCompletionRate = totalProjects > 0 ? data.reduce((s, p) => s + p.completionRate, 0) / totalProjects : 0
        const totalOverdue = data.reduce((s, p) => s + p.overdueIssues, 0)
        setSummary({ totalProjects, totalIssues, completedIssues, avgCompletionRate, totalOverdue })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0ea5e9' }}><i className="fa-solid fa-folder"></i></div>
          <div className="stat-content">
            <h3>Tổng dự án</h3>
            <p className="stat-value">{summary.totalProjects}</p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7', color: '#22c55e' }}><i className="fa-solid fa-check-circle"></i></div>
          <div className="stat-content">
            <h3>Tác vụ hoàn thành</h3>
            <p className="stat-value">{summary.completedIssues} <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: 400 }}>/ {summary.totalIssues}</span></p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: '#fef9c3', color: '#eab308' }}><i className="fa-solid fa-chart-pie"></i></div>
          <div className="stat-content">
            <h3>Tỷ lệ hoàn thành</h3>
            <p className="stat-value">{summary.avgCompletionRate.toFixed(1)}%</p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: '#fee2e2', color: '#ef4444' }}><i className="fa-solid fa-circle-exclamation"></i></div>
          <div className="stat-content">
            <h3>Tác vụ quá hạn</h3>
            <p className="stat-value" style={{ color: '#ef4444' }}>{summary.totalOverdue}</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-dark)' }}>Chi tiết hiệu suất dự án</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.2)' }}>
              <th style={styles.th}>Dự án</th>
              <th style={styles.th}>Tổng tác vụ</th>
              <th style={styles.th}>Hoàn thành</th>
              <th style={styles.th}>Đang thực hiện</th>
              <th style={styles.th}>Quá hạn</th>
              <th style={styles.th}>Tiến độ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center' }}>Đang tải...</td></tr>
            ) : stats.map(project => (
              <tr key={project.projectId} style={styles.tr}>
                <td style={styles.td}><strong>{project.projectName}</strong></td>
                <td style={styles.td}>{project.totalIssues}</td>
                <td style={{ ...styles.td, color: '#22c55e', fontWeight: 600 }}>{project.completedIssues}</td>
                <td style={{ ...styles.td, color: '#3b82f6', fontWeight: 600 }}>{project.inProgressIssues}</td>
                <td style={{ ...styles.td, color: '#ef4444', fontWeight: 600 }}>{project.overdueIssues}</td>
                <td style={styles.td}>
                  <div style={{ width: '100px', height: '6px', background: '#eee', borderRadius: '3px', overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }}>
                    <div style={{ width: `${project.completionRate}%`, background: project.completionRate >= 80 ? '#22c55e' : project.completionRate >= 50 ? '#eab308' : '#ef4444', height: '100%' }}></div>
                  </div>
                  <span style={{ fontSize: '0.8rem' }}>{project.completionRate.toFixed(0)}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


// --- HELPERS & STYLES ---

const UserInfo = ({ name }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#a29bfe', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
      {name?.charAt(0)?.toUpperCase() || 'U'}
    </div>
    <span style={{ fontSize: '0.9rem', color: '#333' }}>{name || 'Unknown'}</span>
  </div>
)

const getStatusBadge = (status) => {
  let bg = '#f3f4f6'; let color = '#6b7280'; let label = status;
  switch (status) {
    case 'PLANNING': bg = '#fef3c7'; color = '#92400e'; label = 'Lập kế hoạch'; break;
    case 'IN_PROGRESS': bg = '#dbeafe'; color = '#1e40af'; label = 'Đang thực hiện'; break;
    case 'COMPLETED': bg = '#dcfce7'; color = '#166534'; label = 'Hoàn thành'; break;
    case 'ON_HOLD': bg = '#fee2e2'; color = '#991b1b'; label = 'Tạm dừng'; break;
    default: break;
  }
  return <span className="badge" style={{ backgroundColor: bg, color: color }}>{label}</span>
}

const styles = {
  th: {
    padding: '15px 20px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, color: '#666', textTransform: 'uppercase'
  },
  td: {
    padding: '15px 20px', fontSize: '0.9rem', color: 'var(--text-dark)', borderBottom: '1px solid rgba(0,0,0,0.05)'
  },
  tr: {
    cursor: 'pointer', transition: 'background 0.2s',
  },
  projectBadge: {
    background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500
  }
}
