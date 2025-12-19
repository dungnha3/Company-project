import { useState, useEffect } from 'react';
import { projectService } from '@/shared/services/project.service';
import { issueService } from '@/shared/services/issue.service';
import { apiService } from '@/shared/services/api.service';
import ProjectDetailPage from '@/features/project/projects/pages/ProjectDetailPage';
import IssueDetailPage from '@/features/project/projects/pages/IssueDetailPage';
import CreateIssueModal from '@/features/project/projects/components/CreateIssueModal';

// Styles are now largely handled by EmployeeDashboard.css
// Usage: className="card", className="btn-primary", etc.

export default function MyProjectsPage({ glassMode }) {
  const [mainTab, setMainTab] = useState('tasks'); // tasks | projects | performance
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load projects khi component mount
  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await projectService.getMyProjects();
      setProjects(data);
    } catch (error) {
      console.error("Failed to load projects", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="accounting-animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

      {/* Main Tab Navigation */}
      <div className="card" style={{ padding: '10px 15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          className={`btn-tab ${mainTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setMainTab('tasks')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: mainTab === 'tasks' ? 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))' : 'transparent',
            color: mainTab === 'tasks' ? 'white' : 'var(--text-light)',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <i className="fa-solid fa-list-check"></i> Tác vụ của tôi
        </button>
        <button
          className={`btn-tab ${mainTab === 'projects' ? 'active' : ''}`}
          onClick={() => setMainTab('projects')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: mainTab === 'projects' ? 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))' : 'transparent',
            color: mainTab === 'projects' ? 'white' : 'var(--text-light)',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <i className="fa-solid fa-folder-open"></i> Dự án
        </button>
        <button
          className={`btn-tab ${mainTab === 'performance' ? 'active' : ''}`}
          onClick={() => setMainTab('performance')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: mainTab === 'performance' ? 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))' : 'transparent',
            color: mainTab === 'performance' ? 'white' : 'var(--text-light)',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <i className="fa-solid fa-chart-line"></i> Hiệu suất
        </button>
      </div>

      {/* Content Area */}
      {mainTab === 'tasks' ? (
        <TasksTab key="tasks-tab" />
      ) : mainTab === 'projects' ? (
        <ProjectsTab
          projects={projects}
          loading={loading}
        />
      ) : (
        <PerformanceTab key="performance-tab" />
      )}
    </div>
  )
}

// Tab "Tác vụ của tôi"
function TasksTab() {
  const [viewMode, setViewMode] = useState('list'); // list | deadline | calendar 
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  // States for filter inputs
  const [filterRole, setFilterRole] = useState('Tất cả các vai trò');
  const [filterStatus, setFilterStatus] = useState('Đang tiến hành ⚡'); // Just a placeholder, logic can be added later
  const [searchTerm, setSearchTerm] = useState('');


  // Load issues khi component mount
  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    setLoading(true);
    try {
      const data = await issueService.getMyIssues();
      setIssues(data);
    } catch (error) {
      console.error("Failed to load issues", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleIssueCreated = (newIssue) => {
    // Reload issues sau khi tạo mới
    loadIssues()
  }

  // Nếu đã chọn issue, hiển thị IssueDetailPage
  if (selectedIssueId) {
    return (
      <IssueDetailPage
        issueId={selectedIssueId}
        onBack={() => setSelectedIssueId(null)}
      />
    )
  }

  const inputStyle = {
    padding: '10px 15px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.6)',
    background: 'rgba(255,255,255,0.4)',
    backdropFilter: 'blur(10px)',
    outline: 'none',
    color: 'var(--text-dark)',
    fontSize: '0.9rem'
  };

  return (
    <>
      {/* Toolbar */}
      <div className="card" style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>

          <select
            style={inputStyle}
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option>Tất cả các vai trò</option>
            <option>Người tạo</option>
            <option>Người được phân công</option>
          </select>

          <select
            style={inputStyle}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option>Tất cả trạng thái</option>
            <option>Đang tiến hành ⚡</option>
            <option>Hoàn thành</option>
            <option>Chưa bắt đầu</option>
          </select>

          <div style={{ position: 'relative' }}>
            <i className="fa-solid fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }}></i>
            <input
              type="text"
              placeholder="Tìm kiếm tác vụ..."
              style={{ ...inputStyle, paddingLeft: '35px', width: '250px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="icon-btn" title="Làm mới" onClick={loadIssues}>
            <i className="fa-solid fa-sync"></i>
          </button>
          {/* Additional buttons like export can go here */}
        </div>
      </div>

      {/* View Mode Tabs (Sub-tabs) */}
      <div style={{ display: 'flex', gap: '5px', marginLeft: '10px' }}>
        <button
          onClick={() => setViewMode('list')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px 8px 0 0',
            background: viewMode === 'list' ? 'var(--glass-bg)' : 'transparent',
            border: viewMode === 'list' ? 'var(--glass-border)' : 'none',
            borderBottom: 'none',
            color: viewMode === 'list' ? 'var(--primary-color)' : 'var(--text-light)',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          📋 Danh sách
        </button>
        <button
          onClick={() => setViewMode('deadline')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px 8px 0 0',
            background: viewMode === 'deadline' ? 'var(--glass-bg)' : 'transparent',
            border: viewMode === 'deadline' ? 'var(--glass-border)' : 'none',
            borderBottom: 'none',
            color: viewMode === 'deadline' ? 'var(--primary-color)' : 'var(--text-light)',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          ⏰ Hạn chót
        </button>
      </div>

      {/* Create Issue Modal */}
      <CreateIssueModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleIssueCreated}
      />

      {/* Tasks Table Wrapper */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '0 20px 20px 20px', marginTop: '-1px' }}>
        {loading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-light)' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '10px' }}></i>
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <th style={styles.th}>Tên tác vụ</th>
                  <th style={styles.th}>
                    Trạng thái <i className="fa-solid fa-sort" style={{ fontSize: '0.8rem', marginLeft: '5px', opacity: 0.5 }}></i>
                  </th>
                  <th style={styles.th}>Hạn chót</th>
                  <th style={styles.th}>Người tạo</th>
                  <th style={styles.th}>Người được phân công</th>
                  <th style={styles.th}>Dự án</th>
                </tr>
              </thead>
              <tbody>
                {issues.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                      <i className="fa-solid fa-clipboard-check" style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.3 }}></i>
                      <p>Bạn chưa có tác vụ nào.</p>
                    </td>
                  </tr>
                ) : (
                  issues.map((task) => (
                    <tr
                      key={task.issueId}
                      className="table-row"
                      onClick={() => setSelectedIssueId(task.issueId)}
                      style={{ cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.05)', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.4)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={styles.td}>
                        <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                          <span style={{ color: 'var(--text-light)', marginRight: '8px', fontSize: '0.9rem' }}>{task.issueKey}</span>
                          {task.title}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span className="badge" style={{ backgroundColor: task.statusColor ? `${task.statusColor}20` : '#f5f5f5', color: task.statusColor || '#666' }}>
                          {task.statusName}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {task.dueDate ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            color: task.isOverdue ? '#ef4444' : 'var(--text-dark)',
                            fontWeight: task.isOverdue ? 600 : 400
                          }}>
                            <i className="fa-regular fa-clock"></i>
                            {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={styles.td}>
                        <UserInfo name={task.reporterName} />
                      </td>
                      <td style={styles.td}>
                        <UserInfo name={task.assigneeName} />
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '15px',
                          background: 'rgba(255,255,255,0.5)',
                          border: '1px solid rgba(255,255,255,0.6)',
                          fontSize: '0.85rem'
                        }}>
                          {task.projectName || '-'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination */}
        {issues.length > 0 && (
          <div style={{ padding: '15px 20px', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-light)', fontSize: '0.9rem' }}>
            <div>Tổng: <strong>{issues.length}</strong> tác vụ</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>Trang 1</span>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button className="icon-btn" style={{ width: '30px', height: '30px', fontSize: '0.8rem' }} disabled><i className="fa-solid fa-chevron-left"></i></button>
                <button className="icon-btn" style={{ width: '30px', height: '30px', fontSize: '0.8rem' }} disabled><i className="fa-solid fa-chevron-right"></i></button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Helper user info component
const UserInfo = ({ name }) => {
  if (!name) return '-';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%',
        background: 'linear-gradient(135deg, #a29bfe, #74b9ff)',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.75rem', fontWeight: 700
      }}>
        {name.charAt(0).toUpperCase()}
      </div>
      <span>{name}</span>
    </div>
  )
}

// Tab "Dự án"
function ProjectsTab({ projects, loading }) {
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('');

  // Nếu đã chọn project, hiển thị ProjectDetailPage
  if (selectedProjectId) {
    return (
      <ProjectDetailPage
        projectId={selectedProjectId}
        onBack={() => setSelectedProjectId(null)}
      />
    )
  }

  const inputStyle = {
    padding: '10px 15px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.6)',
    background: 'rgba(255,255,255,0.4)',
    backdropFilter: 'blur(10px)',
    outline: 'none',
    color: 'var(--text-dark)',
    fontSize: '0.9rem'
  };

  return (
    <>
      {/* Toolbar */}
      <div className="card" style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <i className="fa-solid fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }}></i>
            <input
              type="text"
              placeholder="Tìm kiếm dự án..."
              style={{ ...inputStyle, paddingLeft: '35px', width: '300px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select style={inputStyle}>
            <option>Tất cả dự án</option>
            <option>Đang thực hiện</option>
            <option>Đã đóng</option>
          </select>
        </div>
      </div>

      {/* Projects Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-light)' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '10px' }}></i>
            <p>Đang tải dữ liệu dự án...</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <th style={styles.th}>Mã DA</th>
                <th style={styles.th}>Tên dự án</th>
                <th style={{ ...styles.th, width: '30%' }}>Mô tả</th>
                <th style={styles.th}>Trạng thái</th>
                <th style={styles.th}>Thời gian</th>
                <th style={styles.th}>Người quản lý</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                    <i className="fa-solid fa-folder-open" style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.3 }}></i>
                    <p>Chưa có dự án nào.</p>
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr
                    key={project.projectId}
                    onClick={() => setSelectedProjectId(project.projectId)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.05)', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.4)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={styles.td}>
                      <span style={{
                        background: '#e0e7ff', color: '#4338ca',
                        padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600
                      }}>
                        {project.keyProject}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '1rem' }}>
                        {project.name}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px',
                        color: 'var(--text-light)'
                      }}>
                        {project.description || '-'}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {getStatusBadge(project.status)}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                        <div>Bắt đầu: {project.startDate ? new Date(project.startDate).toLocaleDateString('vi-VN') : '-'}</div>
                        {project.endDate && <div>Kết thúc: {new Date(project.endDate).toLocaleDateString('vi-VN')}</div>}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <UserInfo name={project.createdByName || 'Admin'} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

const getStatusBadge = (status) => {
  let colorClass = 'text-gray';
  let text = status;
  let bg = '#f3f4f6';
  let color = '#6b7280';

  switch (status) {
    case 'PLANNING': bg = '#fef3c7'; color = '#92400e'; text = 'Đang lập kế hoạch'; break;
    case 'IN_PROGRESS': bg = '#dbeafe'; color = '#1e40af'; text = 'Đang thực hiện'; break;
    case 'ON_HOLD': bg = '#fee2e2'; color = '#991b1b'; text = 'Tạm dừng'; break;
    case 'COMPLETED': bg = '#dcfce7'; color = '#166534'; text = 'Hoàn thành'; break;
    case 'CANCELLED': bg = '#f1f5f9'; color = '#475569'; text = 'Đã hủy'; break;
    default: break;
  }

  return (
    <span style={{
      padding: '5px 12px', borderRadius: '20px',
      backgroundColor: bg, color: color,
      fontSize: '0.85rem', fontWeight: 600,
      display: 'inline-block'
    }}>
      {text}
    </span>
  )
}

// Tab "Hiệu suất"
function PerformanceTab() {
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState({
    totalProjects: 0,
    totalIssues: 0,
    completedIssues: 0,
    avgCompletionRate: 0,
    totalOverdue: 0
  })

  useEffect(() => {
    loadPerformanceData()
  }, [])

  const loadPerformanceData = async () => {
    setLoading(true)
    try {
      const data = await apiService.get('/api/project-dashboard/my-projects')
      setStats(data)

      if (data && data.length > 0) {
        const totalProjects = data.length
        const totalIssues = data.reduce((sum, p) => sum + p.totalIssues, 0)
        const completedIssues = data.reduce((sum, p) => sum + p.completedIssues, 0)
        const avgCompletionRate = totalProjects > 0
          ? data.reduce((sum, p) => sum + p.completionRate, 0) / totalProjects
          : 0
        const totalOverdue = data.reduce((sum, p) => sum + p.overdueIssues, 0)

        setSummary({
          totalProjects,
          totalIssues,
          completedIssues,
          avgCompletionRate,
          totalOverdue
        })
      }
    } catch (error) {
      console.error("Failed to load performance data", error)
    } finally {
      setLoading(false)
    }
  }

  const getCompletionColor = (rate) => {
    if (rate >= 80) return '#10b981'
    if (rate >= 50) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <>
      <div className="card welcome-card" style={{ marginBottom: 0, padding: '25px' }}>
        <h2>Tổng quan hiệu suất</h2>
        <p style={{ margin: 0 }}>Thống kê chi tiết tiến độ công việc và hiệu quả thực hiện dự án của bạn.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><i className="fa-solid fa-spinner fa-spin"></i> Loading...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="stats-grid">
            <div className="card stat-card">
              <div className="stat-header">
                <div className="stat-icon bg-purple">
                  <i className="fa-solid fa-folder"></i>
                </div>
              </div>
              <div>
                <div className="stat-value">{summary.totalProjects}</div>
                <div className="stat-label">Tổng dự án</div>
              </div>
            </div>

            <div className="card stat-card">
              <div className="stat-header">
                <div className="stat-icon bg-blue">
                  <i className="fa-solid fa-list-check"></i>
                </div>
              </div>
              <div>
                <div className="stat-value">{summary.totalIssues}</div>
                <div className="stat-label">Tổng tác vụ</div>
                <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '5px' }}>
                  <i className="fa-solid fa-check"></i> {summary.completedIssues} hoàn thành
                </div>
              </div>
            </div>

            <div className="card stat-card">
              <div className="stat-header">
                <div className="stat-icon bg-green">
                  <i className="fa-solid fa-chart-pie"></i>
                </div>
              </div>
              <div>
                <div className="stat-value" style={{ color: getCompletionColor(summary.avgCompletionRate) }}>
                  {summary.avgCompletionRate.toFixed(1)}%
                </div>
                <div className="stat-label">Tỷ lệ hoàn thành TB</div>
              </div>
            </div>

            <div className="card stat-card">
              <div className="stat-header">
                <div className="stat-icon bg-yellow">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                </div>
              </div>
              <div>
                <div className="stat-value" style={{ color: '#ef4444' }}>{summary.totalOverdue}</div>
                <div className="stat-label">Tác vụ quá hạn</div>
              </div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(0,0,0,0.05)', fontWeight: 700, fontSize: '1.1rem' }}>
              Chi tiết theo dự án
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                  <th style={styles.th}>Dự án</th>
                  <th style={styles.th}>Trạng thái</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Tổng việc</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Hoàn thành</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Tiến độ</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((project, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600 }}>{project.projectName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>{project.projectKey}</div>
                    </td>
                    <td style={styles.td}>{getStatusBadge(project.status)}</td>
                    <td style={{ ...styles.td, textAlign: 'center', fontWeight: 600 }}>{project.totalIssues}</td>
                    <td style={{ ...styles.td, textAlign: 'center', color: '#10b981', fontWeight: 600 }}>{project.completedIssues}</td>
                    <td style={{ ...styles.td, width: '25%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1, height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${project.completionRate}%`,
                            height: '100%',
                            background: getCompletionColor(project.completionRate),
                            borderRadius: '4px'
                          }}></div>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: '45px' }}>{project.completionRate.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {stats.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#888' }}>Chưa có dữ liệu chi tiết</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}

const styles = {
  th: {
    padding: '15px 20px',
    textAlign: 'left',
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#666',
    textTransform: 'uppercase',
  },
  td: {
    padding: '15px 20px',
    fontSize: '0.95rem',
  }
};
