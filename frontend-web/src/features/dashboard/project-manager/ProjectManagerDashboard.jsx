import { useMemo, useState, useRef, useEffect } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import './ProjectManagerDashboard.css' // Updated Import
import { profileService } from '@/shared/services/profile.service'
import { employeesService } from '@/features/hr/shared/services/employees.service'
import {
    NavItem,
    RoleBadge,
    StatCard,
    ProjectStatsCard,
    PendingApprovalsWidget,
    QuickActionButton
} from './components/ProjectManagerDashboard.components'
import { sectionsConfig } from './components/ProjectManagerDashboard.constants'
import { pmDashboardService } from './services/pmDashboard.service'

// Import feature modules
import { ProfilePage, LeavePage, ApprovalsPage, ChatPage, ProjectsPage, PMStoragePage } from '@modules/project';
import { LeavesPage } from '@modules/hr'
import NotificationBell from '@/shared/components/notification/NotificationBell'
import { AIChatBot } from '@/shared/components/ai-chatbot'
import { useToast } from '@/shared/components/ui'

export default function ProjectManagerDashboard() {
    const [active, setActive] = useState('dashboard')

    const { logout, user: authUser } = useAuth()
    const username = authUser?.username || localStorage.getItem('username') || 'Project Manager'

    const [userFullName, setUserFullName] = useState(null)
    const [userAvatar, setUserAvatar] = useState(null)

    const user = useMemo(() => ({
        name: userFullName || username || 'Trần Thị B',
        role: 'Quản lý dự án'
    }), [username, userFullName])

    // State for sidebar toggle (renamed to match Employee/Accounting dashboard pattern)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

    // Fetch user avatar and full name on mount
    useEffect(() => {
        const loadProfileData = async () => {
            try {
                const profile = await profileService.getProfile();
                setUserAvatar(profile?.avatarUrl);

                if (profile?.userId) {
                    try {
                        // Fetch employee details to get full name (hoTen)
                        const employee = await employeesService.getByUserId(profile.userId);
                        if (employee?.hoTen) {
                            setUserFullName(employee.hoTen);
                        }
                    } catch (err) {
                        console.warn('Cannot load employee info for PM:', err);
                    }
                }
            } catch (error) {
                console.error('Failed to load user profile:', error);
            }
        };
        loadProfileData();
    }, []);

    const sections = useMemo(() => sectionsConfig, [])
    const meta = sections[active]

    const handleLogout = async () => {
        await logout()
    }

    // Render content based on active tab
    const renderContent = () => {
        switch (active) {
            case 'dashboard':
                return <DashboardOverview user={user} setActive={setActive} />
            case 'profile':
                return <ProfilePage
                    glassMode={true}
                    onProfileUpdate={(updatedData) => {
                        if (updatedData.avatarUrl) setUserAvatar(updatedData.avatarUrl);
                        if (updatedData.hoTen) setUserFullName(updatedData.hoTen);
                    }}
                />
            case 'leave':
                return <LeavePage glassMode={true} />
            case 'storage':
                return <PMStoragePage glassMode={true} />
            case 'approvals':
                return <ApprovalsPage glassMode={true} />
            case 'team-leaves':
                return <LeavesPage glassMode={true} />
            case 'projects':
                return <ProjectsPage glassMode={true} />
            case 'chat':
                return <ChatPage glassMode={true} />
            default:
                return <DashboardOverview user={user} setActive={setActive} />
        }
    }

    return (
        <div className="project-manager-dashboard-container">
            {/* --- SIDEBAR --- */}
            <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                {/* Toggle Button */}
                <div className="sidebar-toggle-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
                    <i className="fa-solid fa-bars"></i>
                </div>

                {/* Scrollable Menu */}
                <div className="menu-section">
                    <div className="menu-title">Tổng quan</div>
                    <NavItem active={active === 'dashboard'} onClick={() => setActive('dashboard')} icon="fa-solid fa-house" collapsed={isSidebarCollapsed}>
                        {sections.dashboard.title}
                    </NavItem>

                    <div className="menu-title">Quản lý dự án</div>
                    <NavItem active={active === 'projects'} onClick={() => setActive('projects')} icon="fa-solid fa-industry" collapsed={isSidebarCollapsed}>
                        {sections.projects.title}
                    </NavItem>
                    <NavItem active={active === 'team-leaves'} onClick={() => setActive('team-leaves')} icon="fa-solid fa-calendar-check" collapsed={isSidebarCollapsed}>
                        Duyệt nghỉ phép
                    </NavItem>

                    <div className="menu-title">Cá nhân</div>
                    <NavItem active={active === 'leave'} onClick={() => setActive('leave')} icon="fa-solid fa-calendar-days" collapsed={isSidebarCollapsed}>
                        {sections.leave.title}
                    </NavItem>
                    <NavItem active={active === 'storage'} onClick={() => setActive('storage')} icon="fa-solid fa-folder-open" collapsed={isSidebarCollapsed}>
                        File của tôi
                    </NavItem>

                    <div className="menu-title">Giao tiếp</div>
                    <NavItem active={active === 'chat'} onClick={() => setActive('chat')} icon="fa-solid fa-comments" collapsed={isSidebarCollapsed}>
                        {sections.chat.title}
                    </NavItem>

                    <div className="menu-title">Hệ thống</div>
                    {/* Renamed to "Cài đặt" as requested */}
                    <NavItem active={active === 'profile'} onClick={() => setActive('profile')} icon="fa-solid fa-user-gear" collapsed={isSidebarCollapsed}>
                        Cài đặt
                    </NavItem>

                    <div style={{ flex: 1 }}></div>

                    <div className="menu-item" onClick={handleLogout} style={{ color: '#ef4444', borderColor: '#fecaca', backgroundColor: '#fff' }} title={isSidebarCollapsed ? "Đăng xuất" : ""}>
                        <i className="fa-solid fa-right-from-bracket"></i>
                        <span>Đăng xuất</span>
                    </div>
                </div>
            </aside>

            {/* --- MAIN CONTENT --- */}
            <main className="main-content">
                <header className="dashboard-header">
                    <div className="header-title">
                        <h1>{meta.pageTitle || meta.title}</h1>
                        {active === 'dashboard'
                            ? <p>Xin chào, {user.name}</p>
                            : <p>{meta.subtitle}</p>
                        }
                    </div>

                    <div className="header-actions">
                        <NotificationBell />
                        <div className="breadcrumbs">
                            <i className="fa-solid fa-briefcase"></i>
                            {user.role}
                        </div>
                        <RoleBadge role={user.role} avatarUrl={userAvatar} />
                    </div>
                </header>

                {/* Render nội dung động dựa trên tab được chọn */}
                {renderContent()}
            </main>

            {/* AI ChatBot - Floating button góc dưới phải */}
            <AIChatBot />
        </div>
    )
}

// Component Dashboard Overview - Chỉ hiển thị tổng quan, KPIs, charts
function DashboardOverview({ user, setActive }) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const toast = useToast();

    // Fetch dashboard data on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await pmDashboardService.getOverviewStats();
                setStats(data);
            } catch (error) {
                console.error('Error loading PM dashboard:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Handle leave approval
    const handleApproveLeave = async (leaveId) => {
        try {
            await pmDashboardService.approveLeave(leaveId);
            // Refresh data
            const data = await pmDashboardService.getOverviewStats();
            setStats(data);
        } catch (error) {
            console.error('Error approving leave:', error);
            toast.error('Có lỗi khi duyệt đơn: ' + (error.response?.data?.message || error.message));
        }
    };

    // Handle leave rejection
    const handleRejectLeave = async (leaveId) => {
        const reason = prompt('Nhập lý do từ chối:');
        if (!reason) return;

        try {
            await pmDashboardService.rejectLeave(leaveId, reason);
            // Refresh data
            const data = await pmDashboardService.getOverviewStats();
            setStats(data);
        } catch (error) {
            console.error('Error rejecting leave:', error);
            toast.error('Có lỗi khi từ chối đơn: ' + (error.response?.data?.message || error.message));
        }
    };

    return (
        <>
            {/* Removed Welcome Banner - Redundant with Header Greeting */}

            {/* Stats Grid */}
            <div className="stats-grid" style={{ marginBottom: 25, marginTop: 10 }}>
                <StatCard
                    title="Tổng dự án"
                    value={loading ? '...' : stats?.totalProjects || 0}
                    subtext="Dự án đang quản lý"
                    icon="fa-solid fa-building"
                    accentColor="#3b82f6"
                    loading={loading}
                    onClick={() => setActive('projects')}
                />
                <StatCard
                    title="Issues đang xử lý"
                    value={loading ? '...' : stats?.inProgressIssues || 0}
                    subtext={`${stats?.completedIssues || 0} đã hoàn thành`}
                    icon="fa-solid fa-rotate"
                    accentColor="#8b5cf6"
                    loading={loading}
                    onClick={() => setActive('projects')}
                />
                <StatCard
                    title="Đơn chờ duyệt"
                    value={loading ? '...' : stats?.pendingLeaveCount || 0}
                    subtext="Cần xử lý"
                    icon="fa-solid fa-clipboard-list"
                    accentColor="#f59e0b"
                    loading={loading}
                    onClick={() => setActive('team-leaves')}
                    highlight={(stats?.pendingLeaveCount || 0) > 0}
                />
                <StatCard
                    title="Thành viên"
                    value={loading ? '...' : stats?.totalMembers || 0}
                    subtext="Trong các dự án"
                    icon="fa-solid fa-users"
                    accentColor="#10b981"
                    loading={loading}
                />
            </div>

            {/* Main Content Grid */}
            <div className="dashboard-grid">
                {/* Project Stats Card */}
                <ProjectStatsCard
                    projects={stats?.projects || []}
                    loading={loading}
                    onViewAll={() => setActive('projects')}
                />

                {/* Pending Approvals Widget */}
                <PendingApprovalsWidget
                    leaves={stats?.pendingLeavesList || []}
                    loading={loading}
                    onApprove={handleApproveLeave}
                    onReject={handleRejectLeave}
                    onViewAll={() => setActive('team-leaves')}
                />
            </div>

            {/* Quick Actions (Bottom) */}
            {/* Removed "Truy cập nhanh" header as requested */}
            <div className="quick-actions-grid">
                <QuickActionButton
                    icon="fa-solid fa-building"
                    label="Xem dự án"
                    onClick={() => setActive('projects')}
                    color="#3b82f6"
                />
                <QuickActionButton
                    icon="fa-solid fa-check-double"
                    label="Duyệt nghỉ phép"
                    onClick={() => setActive('team-leaves')}
                    color="#10b981"
                />
                <QuickActionButton
                    icon="fa-solid fa-calendar-plus"
                    label="Đơn của tôi"
                    onClick={() => setActive('leave')}
                    color="#f59e0b"
                />
                <QuickActionButton
                    icon="fa-solid fa-comments"
                    label="Trò chuyện"
                    onClick={() => setActive('chat')}
                    color="#8b5cf6"
                />
            </div>
        </>
    )
}
