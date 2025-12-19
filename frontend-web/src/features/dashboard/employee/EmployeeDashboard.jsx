import { useMemo, useState, useEffect, useRef } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import './EmployeeDashboard.css' // Import custom CSS

import {
  RoleBadge,
  StatCard,
  TodayStatusCard,
  AttendanceChart,
  LeaveStatusWidget,
  QuickActionButton
} from './components/EmployeeDashboard.components'
import { ProfilePage, MyPayrollPage, MyAttendancePage, MyLeavePage, MyDocumentsPage, MyProjectsPage, MyStoragePage } from '@/modules/employee'
import NotificationBell from '@/shared/components/notification/NotificationBell'
import { ChatPage } from '@/modules/project'

// Services
import { profileService } from '@/shared/services/profile.service'
import { employeesService } from '@/features/hr/shared/services/employees.service'
import { attendanceService } from '@/shared/services/attendance.service'
import { leaveService } from '@/shared/services/leave.service'
import { payrollService } from '@/shared/services/payroll.service'
import { useToast } from '@/shared/components/ui'

export default function EmployeeDashboard() {
  const [active, setActive] = useState('dashboard')
  const { logout, user: authUser } = useAuth()
  const toast = useToast()

  // Helper function to get Vietnamese status label for toast notifications
  const getStatusLabel = (trangThai, isLate, isEarlyLeave) => {
    const statusLabels = {
      DU_GIO: '✓ Đúng giờ',
      DI_TRE: '⏰ Đi muộn',
      VE_SOM: '🏃 Về sớm',
      NGHI_PHEP: '📋 Nghỉ phép',
      NGHI_KHONG_PHEP: '❌ Nghỉ không phép'
    };

    if (trangThai && statusLabels[trangThai]) {
      return statusLabels[trangThai];
    }

    if (isEarlyLeave) return '🏃 Về sớm';
    if (isLate) return '⏰ Đi muộn';
    return '✓ Đúng giờ';
  };

  // Dashboard data states
  const [loading, setLoading] = useState(true)
  const [employeeId, setEmployeeId] = useState(null)
  const [attendanceStatus, setAttendanceStatus] = useState(null)
  const [attendanceData, setAttendanceData] = useState([])
  const [leaveStats, setLeaveStats] = useState({ pending: 0, approved: 0, rejected: 0, remaining: 12 })
  const [payrollData, setPayrollData] = useState(null)
  const [stats, setStats] = useState({
    totalHours: 0,
    lateDays: 0,
    workingDays: 0
  })
  const [checkInLoading, setCheckInLoading] = useState(false)
  const [userAvatar, setUserAvatar] = useState(null)
  const [fullName, setFullName] = useState(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const username = authUser?.username || localStorage.getItem('username') || 'Employee'
  const user = useMemo(() => ({
    name: fullName || username,
    role: 'Nhân viên',
    initial: (fullName || username).charAt(0).toUpperCase()
  }), [username, fullName])


  const handleLogout = async () => {
    await logout()
  }

  // Fetch employee data on mount
  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        // Get user profile first
        const profile = await profileService.getProfile()
        if (profile?.userId) {
          // Set avatar from profile
          setUserAvatar(profile.avatarUrl)
          // Get employee by user ID
          const employee = await employeesService.getByUserId(profile.userId)
          if (employee?.nhanvienId) {
            setEmployeeId(employee.nhanvienId)
            if (employee.hoTen) setFullName(employee.hoTen)
          }
        }
      } catch (error) {
        console.error('Error fetching employee data:', error)
      }
    }
    fetchEmployeeData()
  }, [])

  // Fetch dashboard data when employeeId is available
  useEffect(() => {
    if (!employeeId || active !== 'dashboard') return

    const fetchDashboardData = async () => {
      setLoading(true)
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1

      try {
        // Fetch all data in parallel
        const [
          statusRes,
          attendanceRes,
          leaveRes,
          payrollRes
        ] = await Promise.allSettled([
          attendanceService.getStatus(employeeId),
          attendanceService.getByMonth(employeeId, year, month),
          leaveService.getByEmployee(employeeId),
          // Use getByEmployeePeriod to get payroll for specific month/year
          payrollService.getByEmployeePeriod(employeeId, month, year)
        ])

        // Process attendance status
        if (statusRes.status === 'fulfilled' && statusRes.value) {
          setAttendanceStatus(statusRes.value)
        }

        // Process attendance data for chart
        if (attendanceRes.status === 'fulfilled' && Array.isArray(attendanceRes.value)) {
          const chartData = attendanceRes.value
            .slice(-7)
            .map(item => ({
              date: item.ngayCham,
              hours: item.soGioLam || 0,
              status: item.trangThai
            }))
          setAttendanceData(chartData)

          // Calculate stats
          const totalHours = attendanceRes.value.reduce((sum, item) => sum + (item.soGioLam || 0), 0)
          const lateDays = attendanceRes.value.filter(item => item.trangThai === 'DI_MUON').length
          const workingDays = attendanceRes.value.length
          setStats({ totalHours, lateDays, workingDays })
        }

        // Process leave data
        if (leaveRes.status === 'fulfilled' && Array.isArray(leaveRes.value)) {
          const thisYearLeaves = leaveRes.value.filter(l => {
            const leaveDate = new Date(l.ngayBatDau)
            return leaveDate.getFullYear() === year
          })
          const pending = thisYearLeaves.filter(l => l.trangThai === 'CHO_DUYET').length
          const approved = thisYearLeaves.filter(l => l.trangThai === 'DA_DUYET').length
          const rejected = thisYearLeaves.filter(l => l.trangThai === 'TU_CHOI').length
          const usedDays = thisYearLeaves
            .filter(l => l.trangThai === 'DA_DUYET')
            .reduce((sum, l) => sum + (l.soNgay || 0), 0)
          setLeaveStats({
            pending,
            approved,
            rejected,
            remaining: Math.max(12 - usedDays, 0)
          })
        }

        // Process payroll data
        if (payrollRes.status === 'fulfilled' && payrollRes.value) {
          setPayrollData(payrollRes.value)
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [employeeId, active])

  // Handle check-in
  const handleCheckIn = async () => {
    if (!employeeId) return
    setCheckInLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const result = await attendanceService.checkIn(employeeId, today)
      // Refresh status
      const status = await attendanceService.getStatus(employeeId)
      setAttendanceStatus(status)
      // Show toast with status
      const statusLabel = getStatusLabel(result?.trangThai, result?.isLate)
      toast.success(`Check-in thành công! ${statusLabel}`)
    } catch (error) {
      console.error('Check-in error:', error)
      toast.error('Có lỗi khi chấm công: ' + (error.response?.data?.message || error.message))
    } finally {
      setCheckInLoading(false)
    }
  }

  // Handle check-out
  const handleCheckOut = async () => {
    if (!attendanceStatus?.chamcongId) return
    setCheckInLoading(true)
    try {
      const result = await attendanceService.checkOut(attendanceStatus.chamcongId)
      // Refresh status
      const status = await attendanceService.getStatus(employeeId)
      setAttendanceStatus(status)
      // Show toast with status
      const statusLabel = getStatusLabel(result?.trangThai, result?.isLate, result?.isEarlyLeave)
      toast.success(`Check-out thành công! ${statusLabel}`)
    } catch (error) {
      console.error('Check-out error:', error)
      toast.error('Có lỗi khi chấm công ra: ' + (error.response?.data?.message || error.message))
    } finally {
      setCheckInLoading(false)
    }
  }

  return (
    <div className="employee-dashboard-container">
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-toggle-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
          <i className="fa-solid fa-bars"></i>
        </div>

        <div className="menu-section">
          <div className="menu-title">Tổng quan</div>
          <div className={`menu-item ${active === 'dashboard' ? 'active' : ''}`} onClick={() => setActive('dashboard')} title={isSidebarCollapsed ? "Dashboard" : ""}>
            <i className="fa-solid fa-house"></i>
            <span>Dashboard</span>
          </div>

          <div className="menu-title">Công việc</div>
          <div className={`menu-item ${active === 'timesheet' ? 'active' : ''}`} onClick={() => setActive('timesheet')} title={isSidebarCollapsed ? "Chấm công" : ""}>
            <i className="fa-solid fa-clock"></i>
            <span>Chấm công</span>
          </div>
          <div className={`menu-item ${active === 'leave' ? 'active' : ''}`} onClick={() => setActive('leave')} title={isSidebarCollapsed ? "Nghỉ phép" : ""}>
            <i className="fa-solid fa-calendar-days"></i>
            <span>Nghỉ phép</span>
          </div>
          <div className={`menu-item ${active === 'projects' ? 'active' : ''}`} onClick={() => setActive('projects')} title={isSidebarCollapsed ? "Dự án của tôi" : ""}>
            <i className="fa-solid fa-industry"></i>
            <span>Dự án của tôi</span>
          </div>

          <div className="menu-title">Tài chính & Tài liệu</div>
          <div className={`menu-item ${active === 'payroll' ? 'active' : ''}`} onClick={() => setActive('payroll')} title={isSidebarCollapsed ? "Phiếu lương" : ""}>
            <i className="fa-solid fa-money-bill-wave"></i>
            <span>Phiếu lương</span>
          </div>
          <div className={`menu-item ${active === 'documents' ? 'active' : ''}`} onClick={() => setActive('documents')} title={isSidebarCollapsed ? "Tài liệu" : ""}>
            <i className="fa-solid fa-file-lines"></i>
            <span>Tài liệu</span>
          </div>
          <div className={`menu-item ${active === 'storage' ? 'active' : ''}`} onClick={() => setActive('storage')} title={isSidebarCollapsed ? "File của tôi" : ""}>
            <i className="fa-solid fa-folder-open"></i>
            <span>File của tôi</span>
          </div>

          <div className="menu-title">Giao tiếp</div>
          <div className={`menu-item ${active === 'chat' ? 'active' : ''}`} onClick={() => setActive('chat')} title={isSidebarCollapsed ? "Trò chuyện" : ""}>
            <i className="fa-solid fa-comments"></i>
            <span>Trò chuyện</span>
          </div>

          <div className="menu-title">Hệ thống</div>
          <div className={`menu-item ${active === 'profile' ? 'active' : ''}`} onClick={() => setActive('profile')} title={isSidebarCollapsed ? "Cài đặt" : ""}>
            <i className="fa-solid fa-user-gear"></i>
            <span>Cài đặt</span>
          </div>

          <div style={{ flex: 1 }}></div>
          <div className="menu-item" onClick={handleLogout} style={{ color: '#ef4444', borderColor: '#fecaca', background: '#fff' }} title={isSidebarCollapsed ? "Đăng xuất" : ""}>
            <i className="fa-solid fa-right-from-bracket"></i>
            <span>Đăng xuất</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {/* Header */}
        {/* Header - Always visible now */}
        <header className="accounting-header">
          <div className="header-title">
            <h1>{active === 'dashboard' ? 'Dashboard' :
              active === 'timesheet' ? 'Chấm công' :
                active === 'leave' ? 'Nghỉ phép' :
                  active === 'projects' ? 'Dự án của tôi' :
                    active === 'payroll' ? 'Phiếu lương' :
                      active === 'documents' ? 'Tài liệu' :
                        active === 'storage' ? 'File của tôi' :
                          active === 'chat' ? 'Trò chuyện' :
                            active === 'profile' ? 'Hồ sơ cá nhân' : 'Tổng quan'}</h1>
            <p>Xin chào, {user.name}</p>
          </div>

          <div className="header-actions">
            <NotificationBell />
            <RoleBadge role={user.role} avatarUrl={userAvatar} size={45} />
          </div>
        </header>

        {/* Dashboard Main - REDESIGNED Layout */}
        {active === 'dashboard' && (
          <div className="dashboard-grid">
            {/* Left Column - Main Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Stats Row - 3 cards in a row */}
              <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <StatCard
                  title="Ngày phép còn lại"
                  value={`${leaveStats.remaining} ngày`}
                  subtext={`Đã sử dụng ${12 - leaveStats.remaining} ngày`}
                  icon="📅"
                  accentColor="#3b82f6"
                  loading={loading}
                  onClick={() => setActive('leave')}
                />
                <StatCard
                  title="Số lần đi muộn"
                  value={`${stats.lateDays} lần`}
                  subtext="Trong tháng này"
                  icon="⏰"
                  accentColor={stats.lateDays > 3 ? '#ef4444' : '#f59e0b'}
                  loading={loading}
                  onClick={() => setActive('timesheet')}
                />
                <StatCard
                  title="Tổng giờ làm"
                  value={`${stats.totalHours.toFixed(1)}h`}
                  subtext={`${stats.workingDays} ngày công`}
                  icon="🕐"
                  accentColor="#8b5cf6"
                  loading={loading}
                  onClick={() => setActive('timesheet')}
                />
              </div>

              {/* Charts Row - Side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="card" style={{ padding: 0 }}>
                  <AttendanceChart data={attendanceData} loading={loading} />
                </div>
                <div className="card" style={{ padding: 0 }}>
                  <LeaveStatusWidget data={leaveStats} loading={loading} />
                </div>
              </div>

              {/* Quick Actions - Full width */}
              <div className="card">
                <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1rem', color: 'var(--text-dark)', fontWeight: 600 }}>
                  <span style={{ marginRight: '8px' }}>⚡</span>Truy cập nhanh
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  <QuickActionButton
                    icon="🕐"
                    label="Chấm công"
                    onClick={() => setActive('timesheet')}
                    color="#3b82f6"
                  />
                  <QuickActionButton
                    icon="📋"
                    label="Xin nghỉ phép"
                    onClick={() => setActive('leave')}
                    color="#10b981"
                  />
                  <QuickActionButton
                    icon="💰"
                    label="Phiếu lương"
                    onClick={() => setActive('payroll')}
                    color="#f59e0b"
                  />
                  <QuickActionButton
                    icon="📄"
                    label="Tài liệu"
                    onClick={() => setActive('documents')}
                    color="#8b5cf6"
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Today Status (Primary Action) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <TodayStatusCard
                status={attendanceStatus}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                loading={checkInLoading}
              />

              {/* Payroll Summary Card - Show if data available */}
              {payrollData && (
                <div className="card" onClick={() => setActive('payroll')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      background: '#fef3c7', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '20px'
                    }}>💰</div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                      Lương tháng {new Date().getMonth() + 1}
                    </h3>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payrollData.thucNhan || 0)}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                    Thực nhận sau thuế
                  </div>
                </div>
              )}

              {/* Additional Quick Links */}
              <div className="card">
                <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1rem', color: 'var(--text-dark)', fontWeight: 600 }}>
                  <span style={{ marginRight: '8px' }}>📂</span>Thêm
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div
                    onClick={() => setActive('projects')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                      background: 'rgba(59,130,246,0.1)', borderRadius: '10px', cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>🏭</span>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-dark)' }}>Dự án của tôi</span>
                  </div>
                  <div
                    onClick={() => setActive('storage')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                      background: 'rgba(139,92,246,0.1)', borderRadius: '10px', cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>💾</span>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-dark)' }}>File của tôi</span>
                  </div>
                  <div
                    onClick={() => setActive('chat')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                      background: 'rgba(16,185,129,0.1)', borderRadius: '10px', cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>💬</span>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-dark)' }}>Trò chuyện</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Child Pages - Passing glassMode where appropriate */}
        {active === 'timesheet' && <MyAttendancePage glassMode={true} />}
        {active === 'leave' && <MyLeavePage glassMode={true} />}
        {active === 'chat' && <ChatPage glassMode={true} />}
        {active === 'profile' && <ProfilePage glassMode={true} onProfileUpdate={(data) => {
          if (data.avatarUrl) setUserAvatar(data.avatarUrl)
          if (data.hoTen) setFullName(data.hoTen)
        }} />}
        {active === 'payroll' && <MyPayrollPage glassMode={true} />}
        {active === 'documents' && <MyDocumentsPage glassMode={true} />}
        {active === 'storage' && <MyStoragePage glassMode={true} />}
        {active === 'projects' && <MyProjectsPage glassMode={true} />}
      </main>
    </div>
  )
}
