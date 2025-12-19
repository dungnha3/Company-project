import { useMemo, useState, useEffect, useRef } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import './HrManagerDashboard.css' // Import custom CSS

import {
  EmployeesPage,
  EmployeeDetailPage,
  LeavesPage,
  DepartmentsPage,
  DepartmentDetailPage,
  ContractsPage,
  PositionsPage,
  EvaluationsPage,
  HRStoragePage
} from '@modules/hr'
import { SharedProfilePage } from '@/shared/components/profile'
import { SharedLeaveRequestPage } from '@/shared/components/leave-request'
import { ChatPage } from '@/modules/project'
import NotificationBell from '@/shared/components/notification/NotificationBell'
import CreateNotificationModal from '@/shared/components/notification/CreateNotificationModal'
import { HrNotificationsPage } from '@/features/hr/notifications'
import { dashboardService } from '@/features/hr/shared/services'
import { profileService } from '@/shared/services/profile.service'

export default function HrManagerDashboard() {
  const [active, setActive] = useState('dashboard')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null)

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userAvatar, setUserAvatar] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showCreateNotificationModal, setShowCreateNotificationModal] = useState(false);

  const { logout, user: authUser } = useAuth()
  const username = authUser?.username || localStorage.getItem('username') || 'HR Manager'
  const user = useMemo(() => ({ name: username || 'Nguyễn Thị C', role: 'Quản lý nhân sự' }), [username])

  // Reusable function to load avatar
  const loadAvatar = async () => {
    try {
      const profile = await profileService.getProfile();
      setUserAvatar(profile?.avatarUrl);

      // Also try to get employee name if possible
      if (profile?.userId) {
        const employee = await import('@/features/hr/shared/services/employees.service').then(m => m.employeesService.getByUserId(profile.userId));
        if (employee?.hoTen) {
          setDisplayName(employee.hoTen);
        }
      }
    } catch (error) {
      console.error('Failed to load user avatar/info:', error);
    }
  };

  // Fetch user avatar on mount
  useEffect(() => {
    loadAvatar();
  }, []);

  // Fetch Dashboard Data
  useEffect(() => {
    if (active === 'dashboard') {
      const loadData = async () => {
        try {
          setLoading(true);
          const data = await dashboardService.getStats();
          setStats(normalizeData(data));
        } catch (error) {
          console.error("Failed to load dashboard stats", error);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [active]);

  const normalizeData = (data) => {
    if (!data) return null;
    if (data.tongQuan) {
      return {
        ...data.tongQuan,
        chamCongPhongBan: data.chamCongPhongBan || [],
        nhanVienTheoTuoi: data.nhanVienTheoTuoi || [],
        nhanVienTheoGioiTinh: data.nhanVienTheoGioiTinh || {},
        luongTheoThang: data.luongTheoThang || []
      };
    }
    return {
      tongNhanVien: data.tongNhanVien || 0,
      nhanVienDangLam: data.nhanVienDangLam || 0,
      donNghiPhepChoDuyet: data.donNghiPhepChoDuyet || 0,
      bangLuongChoDuyet: data.bangLuongChuaThanhToan || 0,
      hopDongHetHan30Ngay: data.hopDongSapHetHan || 0,
      tongChiPhiLuongThang: data.tongLuongThangNay || 0,
      chamCongPhongBan: [],
      nhanVienTheoTuoi: [],
      ...data
    };
  };



  const handleLogout = async () => await logout();

  // Navigation handlers
  const handleViewEmployeeDetail = (employeeId) => { setSelectedEmployeeId(employeeId); setActive('employee-detail'); }
  const handleBackFromEmployeeDetail = () => { setSelectedEmployeeId(null); setActive('employees'); }
  const handleViewDepartmentDetail = (departmentId) => { setSelectedDepartmentId(departmentId); setActive('department-detail'); }
  const handleBackFromDepartmentDetail = () => { setSelectedDepartmentId(null); setActive('departments'); }

  return (
    <div className="hr-dashboard-container">
      {/* --- SIDEBAR --- */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-toggle-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
          <i className="fa-solid fa-bars"></i>
        </div>



        <div className="menu-section">
          <div className="menu-title">Tổng quan</div>
          <div className={`menu-item ${active === 'dashboard' ? 'active' : ''}`} onClick={() => setActive('dashboard')} title="Dashboard">
            <i className="fa-solid fa-house"></i>
            <span>Dashboard</span>
          </div>
        </div>

        <div className="menu-section">
          <div className="menu-title">Quản lý nhân sự</div>
          <div className={`menu-item ${active === 'employees' ? 'active' : ''}`} onClick={() => setActive('employees')} title="Nhân viên">
            <i className="fa-solid fa-users"></i>
            <span>Nhân viên</span>
          </div>
          <div className={`menu-item ${active === 'departments' ? 'active' : ''}`} onClick={() => setActive('departments')} title="Phòng ban">
            <i className="fa-solid fa-building"></i>
            <span>Phòng ban</span>
          </div>
          <div className={`menu-item ${active === 'positions' ? 'active' : ''}`} onClick={() => setActive('positions')} title="Chức vụ">
            <i className="fa-solid fa-briefcase"></i>
            <span>Chức vụ</span>
          </div>
          <div className={`menu-item ${active === 'contracts' ? 'active' : ''}`} onClick={() => setActive('contracts')} title="Hợp đồng">
            <i className="fa-solid fa-file-contract"></i>
            <span>Hợp đồng</span>
          </div>
        </div>

        <div className="menu-section">
          <div className="menu-title">Nghỉ phép & Đánh giá</div>
          <div className={`menu-item ${active === 'leaves' ? 'active' : ''}`} onClick={() => setActive('leaves')} title="Quản lý nghỉ phép">
            <i className="fa-solid fa-calendar-check"></i>
            <span>Quản lý nghỉ phép</span>
          </div>
          <div className={`menu-item ${active === 'my-leave' ? 'active' : ''}`} onClick={() => setActive('my-leave')} title="Duyệt đơn nghỉ">
            <i className="fa-solid fa-list-check"></i>
            <span>Duyệt đơn nghỉ</span>
          </div>
          <div className={`menu-item ${active === 'evaluations' ? 'active' : ''}`} onClick={() => setActive('evaluations')} title="Đánh giá">
            <i className="fa-solid fa-star"></i>
            <span>Đánh giá</span>
          </div>
        </div>

        <div className="menu-section">
          <div className="menu-title">Khác</div>
          <div className={`menu-item ${active === 'storage' ? 'active' : ''}`} onClick={() => setActive('storage')} title="Tài liệu công ty">
            <i className="fa-solid fa-folder-open"></i>
            <span>Tài liệu công ty</span>
          </div>
          <div className={`menu-item ${active === 'chat' ? 'active' : ''}`} onClick={() => setActive('chat')} title="Trò chuyện">
            <i className="fa-solid fa-comments"></i>
            <span>Trò chuyện</span>
          </div>
          <div className={`menu-item ${active === 'notifications' ? 'active' : ''}`} onClick={() => setActive('notifications')} title="Thông báo">
            <i className="fa-solid fa-bell"></i>
            <span>Thông báo</span>
          </div>
        </div>



        <div className="menu-section">
          <div className="menu-title">Hệ thống</div>
          <div className={`menu-item ${active === 'profile' ? 'active' : ''}`} onClick={() => setActive('profile')} title="Cài đặt">
            <i className="fa-solid fa-gear"></i>
            <span>Cài đặt</span>
          </div>
          <div className="menu-item" onClick={handleLogout} style={{ color: '#ef4444', borderColor: '#fecaca', background: '#fff' }} title="Đăng xuất">
            <i className="fa-solid fa-right-from-bracket"></i>
            <span>Đăng xuất</span>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="main-content">
        {/* Dynamic Header - Always visible now */}
        <header className="hr-header">
          <div className="header-title">
            <h1>{active === 'dashboard' ? 'Dashboard' :
              active === 'employees' ? 'Quản lý nhân viên' :
                active === 'employee-detail' ? 'Chi tiết nhân viên' :
                  active === 'departments' ? 'Quản lý phòng ban' :
                    active === 'department-detail' ? 'Chi tiết phòng ban' :
                      active === 'positions' ? 'Quản lý chức vụ' :
                        active === 'contracts' ? 'Quản lý hợp đồng' :
                          active === 'leaves' ? 'Quản lý nghỉ phép' :
                            active === 'my-leave' ? 'Duyệt đơn nghỉ phép' :
                              active === 'evaluations' ? 'Đánh giá nhân sự' :
                                active === 'storage' ? 'Tài liệu công ty' :
                                  active === 'profile' ? 'Cài đặt tài khoản' :
                                    active === 'notifications' ? 'Quản lý Thông báo' :
                                      active === 'chat' ? 'Trò chuyện' : 'Tổng quan'}</h1>
            <p>Xin chào, {displayName || user.name}</p>
          </div>
          <div className="header-actions">
            <NotificationBell />
            <div className="breadcrumbs">
              <i className="fa-solid fa-id-card"></i>
              Quản lý nhân sự
            </div>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: '3px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--glass-bg)',
              fontWeight: 700,
              color: 'var(--primary-color)',
              fontSize: '1.2rem'
            }}>
              {userAvatar ? (
                <img src={userAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span>{user.name ? user.name.charAt(0).toUpperCase() : 'HR'}</span>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Overview */}
        {active === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            {/* Stats Grid - Full Width Row */}
            <div className="stats-grid">
              <StatCard
                title="Tổng nhân viên"
                value={stats?.tongNhanVien || 0}
                subtext={`${stats?.nhanVienDangLam || 0} đang hoạt động`}
                icon={<i className="fa-solid fa-users"></i>}
                className="bg-purple text-purple"
                onClick={() => setActive('employees')}
              />
              <StatCard
                title="Cần phê duyệt"
                value={(stats?.donNghiPhepChoDuyet || 0) + (stats?.bangLuongChoDuyet || 0)}
                subtext={`${stats?.donNghiPhepChoDuyet || 0} đơn nghỉ • ${stats?.bangLuongChoDuyet || 0} bảng lương`}
                icon={<i className="fa-solid fa-bolt"></i>}
                className="bg-yellow text-yellow"
                onClick={() => setActive('leaves')}
                highlight={(stats?.donNghiPhepChoDuyet || 0) > 0}
              />
              <StatCard
                title="Hợp đồng sắp hết hạn"
                value={stats?.hopDongHetHan30Ngay || 0}
                subtext="Trong 30 ngày tới"
                icon={<i className="fa-solid fa-circle-exclamation"></i>}
                className="text-red"
                onClick={() => setActive('contracts')}
                highlight={(stats?.hopDongHetHan30Ngay || 0) > 0}
              />
            </div>

            {/* Charts Row - 1:1 Split */}
            <div className="dashboard-grid">
              {/* Left Chart - Chấm công theo phòng ban */}
              <div className="card">
                <div className="chart-header">
                  <div className="chart-icon-bg"><i className="fa-solid fa-chart-simple"></i></div>
                  <h3 className="chart-title">Chấm công theo phòng ban</h3>
                </div>
                <div style={{ minHeight: '250px' }}>
                  {stats?.chamCongPhongBan?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {stats.chamCongPhongBan.slice(0, 5).map((dept, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '120px', fontSize: '0.85rem', color: 'var(--text-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={dept.tenPhongBan}>
                            {dept.tenPhongBan}
                          </div>
                          <div style={{ flex: 1, height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                            <div style={{ width: `${dept.tiLeDungGio}%`, background: '#2ecc71', height: '100%' }} title={`Đúng giờ: ${dept.tiLeDungGio}%`} />
                            <div style={{ width: `${(dept.nhanVienDiMuon / dept.tongNhanVien * 100) || 0}%`, background: '#f1c40f', height: '100%' }} title={`Đi muộn: ${dept.nhanVienDiMuon}`} />
                            <div style={{ width: `${(dept.nhanVienVeSom / dept.tongNhanVien * 100) || 0}%`, background: '#e74c3c', height: '100%' }} title={`Về sớm: ${dept.nhanVienVeSom}`} />
                          </div>
                          <div style={{ width: '40px', textAlign: 'right', fontSize: '0.85rem', fontWeight: '600' }}>{dept.tiLeDungGio}%</div>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '20px', marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '10px', height: '10px', background: '#2ecc71', borderRadius: '2px' }}></div>Đúng giờ</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '10px', height: '10px', background: '#f1c40f', borderRadius: '2px' }}></div>Đi muộn</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '10px', height: '10px', background: '#e74c3c', borderRadius: '2px' }}></div>Về sớm</div>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon"><i className="fa-regular fa-calendar-xmark"></i></div>
                      <div className="empty-text">Chưa có dữ liệu chấm công</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Chart - Độ tuổi nhân sự */}
              <div className="card">
                <div className="chart-header">
                  <div className="chart-icon-bg"><i className="fa-solid fa-cake-candles"></i></div>
                  <h3 className="chart-title">Độ tuổi nhân sự</h3>
                </div>
                <div>
                  {stats?.nhanVienTheoTuoi?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {stats.nhanVienTheoTuoi.map((item, idx) => (
                        <div key={idx}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '5px' }}>
                            <span style={{ color: 'var(--text-light)' }}>{item.nhomTuoi}</span>
                            <span style={{ fontWeight: '600' }}>{item.soLuong}</span>
                          </div>
                          <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${item.tiLe}%`, background: 'var(--primary-color)', height: '100%' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon"><i className="fa-solid fa-chart-pie"></i></div>
                      <div className="empty-text">Chưa có dữ liệu độ tuổi</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shared Components & Pages */}
        {active === 'profile' && <SharedProfilePage title="Hồ sơ cá nhân" breadcrumb="Cá nhân / Hồ sơ cá nhân" allowEdit={true} glassMode={true} onAvatarChange={loadAvatar} />}
        {active === 'my-leave' && <SharedLeaveRequestPage title="Quản lý nghỉ phép" breadcrumb="HR / Quản lý nghỉ phép" viewMode="management" glassMode={true} />}
        {active === 'employees' && <EmployeesPage onViewDetail={handleViewEmployeeDetail} glassMode={true} />}
        {active === 'employee-detail' && selectedEmployeeId && <EmployeeDetailPage employeeId={selectedEmployeeId} onBack={handleBackFromEmployeeDetail} glassMode={true} />}
        {active === 'departments' && <DepartmentsPage onViewDetail={handleViewDepartmentDetail} glassMode={true} />}
        {active === 'department-detail' && selectedDepartmentId && <DepartmentDetailPage departmentId={selectedDepartmentId} onBack={handleBackFromDepartmentDetail} glassMode={true} />}
        {active === 'positions' && <PositionsPage glassMode={true} />}
        {active === 'contracts' && <ContractsPage glassMode={true} />}
        {active === 'leaves' && <LeavesPage glassMode={true} />}
        {active === 'evaluations' && <EvaluationsPage glassMode={true} />}
        {active === 'storage' && <HRStoragePage glassMode={true} />}
        {active === 'chat' && <ChatPage glassMode={true} />}
        {active === 'notifications' && <HrNotificationsPage />}

        {/* Create Notification Modal */}
        <CreateNotificationModal
          isOpen={showCreateNotificationModal}
          onClose={() => setShowCreateNotificationModal(false)}
          onSuccess={() => {
            console.log('Notification created successfully');
            // Optionally refresh notification count
          }}
        />
      </main>
    </div>
  )
}

// --- Sub-components ---

const StatCard = ({ title, value, subtext, icon, className, style, onClick, highlight }) => (
  <div
    className={`card stat-card ${className || ''}`}
    onClick={onClick}
    style={{
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }}
  >
    <div className="stat-header">
      <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.2)' }}>{icon}</div>
      {highlight && <div className="badge" style={{ background: '#fff', color: '#ef4444' }}>Cần xử lý</div>}
    </div>
    <div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{title}</div>
      <div className="stat-sub" style={{ opacity: 0.8 }}>{subtext}</div>
    </div>
  </div>
);

const EmptyState = ({ message, icon }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', minHeight: 150, padding: 20 }}>
    <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>{icon}</div>
    <div style={{ fontSize: 14 }}>{message}</div>
  </div>
);

const LegendItem = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
    <div style={{ width: 10, height: 10, borderRadius: 4, background: color }} />
    {label}
  </div>
);
