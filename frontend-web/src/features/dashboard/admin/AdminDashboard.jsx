import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import './AdminDashboard.css'
import { profileService } from '@/shared/services/profile.service'
import { usersService, roleRequestsService } from '@/shared/services'
import NotificationBell from '@/shared/components/notification/NotificationBell'
import CreateNotificationModal from '@/shared/components/notification/CreateNotificationModal'

// Feature Pages
import { UsersManagementPage, RoleRequestsPage, AuditLogsPage } from '@/modules/admin'
import { NotificationsManagementPage } from '@/features/admin/notifications'

// Shared Components
import { SharedProfilePage } from '@/shared/components/profile'

export default function AdminDashboard() {
  const [active, setActive] = useState('dashboard')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showCreateNotificationModal, setShowCreateNotificationModal] = useState(false)
  const { logout, user: authUser } = useAuth()

  // Stats State
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingRequests: 0,
    onlineUsers: 0
  })
  const [userAvatar, setUserAvatar] = useState(null)
  const [loading, setLoading] = useState(true)

  const username = authUser?.username || localStorage.getItem('username') || 'Admin'
  const user = useMemo(() => ({
    name: username,
    role: 'Quản trị viên',
    initial: username.charAt(0).toUpperCase()
  }), [username])

  // Fetch Dashboard Stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        // Fetch user stats
        const allUsers = await usersService.getAll()
        const activeCount = allUsers?.filter(u => u.isActive)?.length || 0
        const onlineCount = allUsers?.filter(u => u.isOnline)?.length || 0

        // Fetch pending role requests count
        let pendingCount = 0
        try {
          const pendingRequests = await roleRequestsService.getPending()
          pendingCount = pendingRequests?.length || 0
        } catch (err) {
          console.warn('Could not fetch pending role requests:', err)
        }

        setStats({
          totalUsers: allUsers?.length || 0,
          activeUsers: activeCount,
          pendingRequests: pendingCount,
          onlineUsers: onlineCount
        })
      } catch (error) {
        console.error('Failed to fetch admin stats', error)
      } finally {
        setLoading(false)
      }
    }

    if (active === 'dashboard') {
      fetchStats()
    }
  }, [active])

  // Fetch User Avatar
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await profileService.getProfile()
        if (profile?.avatarUrl) {
          setUserAvatar(profile.avatarUrl)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      }
    }
    fetchProfile()
  }, [])

  const handleLogout = async () => {
    await logout()
  }

  const handleProfileUpdate = (updatedData) => {
    if (updatedData.avatarUrl) {
      setUserAvatar(updatedData.avatarUrl)
    }
  }

  // --- Render Sidebar ---
  const renderSidebar = () => (
    <aside className={`admin-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-toggle-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
        <i className="fa-solid fa-bars"></i>
      </div>

      <div className="menu-section">
        <div className="menu-title">Tổng quan</div>
        <div className={`menu-item ${active === 'dashboard' ? 'active' : ''}`} onClick={() => setActive('dashboard')} title={isSidebarCollapsed ? "Dashboard" : ""}>
          <i className="fa-solid fa-house"></i>
          <span>Dashboard</span>
        </div>

        <div className="menu-title">Quản trị hệ thống</div>
        <div className={`menu-item ${active === 'users' ? 'active' : ''}`} onClick={() => setActive('users')} title={isSidebarCollapsed ? "Quản lý Users" : ""}>
          <i className="fa-solid fa-users"></i>
          <span>Quản lý Users</span>
        </div>
        <div className={`menu-item ${active === 'role-requests' ? 'active' : ''}`} onClick={() => setActive('role-requests')} title={isSidebarCollapsed ? "Yêu cầu Role" : ""}>
          <i className="fa-solid fa-user-shield"></i>
          <span>Yêu cầu Role</span>
        </div>
        <div className={`menu-item ${active === 'audit-logs' ? 'active' : ''}`} onClick={() => setActive('audit-logs')} title={isSidebarCollapsed ? "Audit Logs" : ""}>
          <i className="fa-solid fa-clipboard-list"></i>
          <span>Audit Logs</span>
        </div>

        <div className="menu-title">Hệ thống</div>
        <div className={`menu-item ${active === 'profile' ? 'active' : ''}`} onClick={() => setActive('profile')} title={isSidebarCollapsed ? "Cài đặt" : ""}>
          <i className="fa-solid fa-gear"></i>
          <span>Cài đặt</span>
        </div>
        <div className={`menu-item ${active === 'notifications' ? 'active' : ''}`} onClick={() => setActive('notifications')} title={isSidebarCollapsed ? "Quản lý thông báo" : ""} style={{ background: active === 'notifications' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent', color: active === 'notifications' ? 'white' : 'inherit' }}>
          <i className="fa-solid fa-bell"></i>
          <span>Thông báo</span>
        </div>

        <div style={{ flex: 1 }}></div>
        <div className="menu-item logout" onClick={handleLogout} title={isSidebarCollapsed ? "Đăng xuất" : ""}>
          <i className="fa-solid fa-right-from-bracket"></i>
          <span>Đăng xuất</span>
        </div>
      </div>
    </aside>
  )

  // --- Render Dashboard Content ---
  const renderDashboardContent = () => (
    <>
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-header">
            <div className="stat-icon bg-cyan">
              <i className="fa-solid fa-users"></i>
            </div>
            <span className="badge text-cyan">Tổng</span>
          </div>
          <div>
            <div className="stat-value">{stats.totalUsers}</div>
            <div className="stat-label">Tổng Users</div>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-header">
            <div className="stat-icon bg-green">
              <i className="fa-solid fa-user-check"></i>
            </div>
            <span className="badge text-green">Hoạt động</span>
          </div>
          <div>
            <div className="stat-value">{stats.activeUsers}</div>
            <div className="stat-label">Users Active</div>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-header">
            <div className="stat-icon bg-yellow">
              <i className="fa-solid fa-clock"></i>
            </div>
            <span className="badge text-yellow">Chờ duyệt</span>
          </div>
          <div>
            <div className="stat-value">{stats.pendingRequests}</div>
            <div className="stat-label">Yêu cầu Role</div>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-header">
            <div className="stat-icon bg-blue">
              <i className="fa-solid fa-signal"></i>
            </div>
            <span className="badge text-blue">Online</span>
          </div>
          <div>
            <div className="stat-value">{stats.onlineUsers}</div>
            <div className="stat-label">Users Online</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card welcome-card">
          <h2>Chào mừng Admin, {user.name}!</h2>
          <p>
            Với vai trò <strong>Admin</strong>, bạn có quyền quản lý users, phê duyệt yêu cầu thay đổi role, và theo dõi audit logs hệ thống.
          </p>
          <div className="admin-note">
            <i className="fa-solid fa-circle-info"></i>
            <span>Admin không có quyền truy cập dữ liệu business (nhân viên, lương, chấm công). Các chức năng đó thuộc về HR Manager và Accounting Manager.</span>
          </div>
          <div className="quick-actions">
            <button className="quick-action-btn" onClick={() => setActive('users')}>
              <i className="fa-solid fa-users"></i>
              Quản lý Users
            </button>
            <button className="quick-action-btn" onClick={() => setActive('role-requests')}>
              <i className="fa-solid fa-user-shield"></i>
              Yêu cầu Role
            </button>
            <button className="quick-action-btn" onClick={() => setActive('audit-logs')}>
              <i className="fa-solid fa-clipboard-list"></i>
              Audit Logs
            </button>
            <button className="quick-action-btn" onClick={() => setActive('notifications')} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <i className="fa-solid fa-bell"></i>
              Thông báo
            </button>
          </div>
        </div>

        <div className="card">
          <div className="notif-header">
            <i className="fa-regular fa-bell"></i>
            Hoạt động gần đây
          </div>
          <div className="notif-list">
            <div className="notif-item">
              <div className="notif-icon">
                <i className="fa-solid fa-user-plus"></i>
              </div>
              <div className="notif-content">
                <h5>User mới đăng ký</h5>
                <p>Có người dùng mới đăng ký vào hệ thống</p>
                <span className="notif-time">
                  <i className="fa-regular fa-clock" style={{ marginRight: '5px', fontSize: '0.65rem' }}></i>
                  Vừa xong
                </span>
              </div>
            </div>

            <div className="notif-item">
              <div className="notif-icon">
                <i className="fa-solid fa-shield"></i>
              </div>
              <div className="notif-content">
                <h5>Yêu cầu thay đổi Role</h5>
                <p>HR Manager yêu cầu thay đổi role cho 1 user</p>
                <span className="notif-time">
                  <i className="fa-regular fa-clock" style={{ marginRight: '5px', fontSize: '0.65rem' }}></i>
                  2 giờ trước
                </span>
              </div>
            </div>

            <div className="notif-item">
              <div className="notif-icon">
                <i className="fa-solid fa-check-circle"></i>
              </div>
              <div className="notif-content">
                <h5>Hệ thống hoạt động ổn định</h5>
                <p>Không có lỗi được ghi nhận trong 24h qua</p>
                <span className="notif-time">
                  <i className="fa-regular fa-clock" style={{ marginRight: '5px', fontSize: '0.65rem' }}></i>
                  1 ngày trước
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div className="admin-dashboard-container">
      {renderSidebar()}

      <main className="admin-main-content">
        {/* Header - shown for ALL pages now */}
        <header className="admin-header">
          <div className="header-title">
            <h1>
              {active === 'dashboard' && 'Dashboard'}
              {active === 'users' && 'Quản lý Users'}
              {active === 'role-requests' && 'Yêu cầu thay đổi Role'}
              {active === 'audit-logs' && 'Audit Logs'}
              {active === 'notifications' && 'Quản lý Thông báo'}
              {active === 'profile' && 'Cài đặt tài khoản'}
            </h1>
            <p>Xin chào, {user.name}</p>
          </div>
          <div className="header-actions">
            <NotificationBell />
            <div className="breadcrumbs">
              <i className="fa-solid fa-shield-halved"></i>
              Quản trị viên
            </div>
            <div className="header-avatar">
              {userAvatar ? (
                <img src={userAvatar} alt="Avatar" />
              ) : user.initial}
            </div>
          </div>
        </header>

        {/* Content Switcher */}
        {active === 'dashboard' && renderDashboardContent()}

        {active === 'users' && <UsersManagementPage />}

        {active === 'role-requests' && <RoleRequestsPage />}

        {active === 'audit-logs' && <AuditLogsPage />}

        {active === 'notifications' && <NotificationsManagementPage glassMode={true} />}

        {active === 'profile' && (
          <SharedProfilePage
            title="Cài đặt"
            breadcrumb="Hệ thống / Cài đặt"
            allowEdit={true}
            userRole="Admin"
            onProfileUpdate={handleProfileUpdate}
            glassMode={true}
          />
        )}

        {/* Create Notification Modal */}
        <CreateNotificationModal
          isOpen={showCreateNotificationModal}
          onClose={() => setShowCreateNotificationModal(false)}
          onSuccess={() => {
            console.log('Notification created successfully');
          }}
        />
      </main>
    </div>
  )
}
