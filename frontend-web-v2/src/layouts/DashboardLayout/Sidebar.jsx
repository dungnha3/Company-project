import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '@shared/stores/uiStore';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { useAuthStore } from '@shared/stores/authStore';
import { useAccessControl } from '@shared/hooks/useAccessControl';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import CompanySwitcher from './CompanySwitcher';

export const NAV_CONFIG = [
    {
        key: 'personal',
        title: 'Cá nhân',
        items: [
            { path: '/app/me', icon: 'fa-house', label: 'Dashboard', exact: true },
            { path: '/app/me/issues', icon: 'fa-list-check', label: 'Công việc của tôi' },
            { path: '/app/me/calendar', icon: 'fa-calendar-days', label: 'Lịch cá nhân' },
            { path: '/app/me/performance', icon: 'fa-chart-line', label: 'Hiệu suất' },
        ],
    },
    {
        key: 'project',
        title: 'Quản lý Dự án',
        items: [
            { path: '/app/projects', icon: 'fa-cubes', label: 'Dự án & Kanban' },
            { path: '/app/projects/costs', icon: 'fa-coins', label: 'Chi phí dự án' },
            { path: '/app/hr/resource-planning', icon: 'fa-users-gear', label: 'Nguồn lực' },
            { path: '/app/projects/analytics', icon: 'fa-chart-pie', label: 'Thống kê & Phân tích' },
        ],
    },
    {
        key: 'hr',
        title: 'Nhân sự & HR',
        items: [
            { path: '/app/hr', icon: 'fa-chart-simple', label: 'Dashboard', exact: true, permission: 'HR.VIEW_DASHBOARD' },
            { path: '/app/hr/employees', icon: 'fa-address-book', label: 'Danh bạ nhân viên', permission: 'HR.VIEW_LIST' },
            { path: '/app/hr/reviews', icon: 'fa-clipboard-check', label: 'Đánh giá nhân viên', permission: 'REVIEW.VIEW_ALL' },
            { path: '/app/hr/leave-requests', icon: 'fa-calendar-minus', label: 'Quản lý nghỉ phép', permission: 'LEAVE.VIEW_ALL' },
        ],
    },
    {
        key: 'settings',
        title: 'Quản trị',
        items: [
            { path: '/app/company/settings', icon: 'fa-gear', label: 'Cài đặt Workspace', permission: 'WORKSPACE.MANAGE_MEMBERS' },
        ],
    },
];

export default function Sidebar() {
    const { sidebarCollapsed, toggleSidebar } = useUIStore();
    const { currentWorkspace } = useWorkspaceStore();
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const { canAccess, hasPermission } = useAccessControl();
    const { data: myIssuesForAlert = [] } = useQuery({
        queryKey: ['sidebar-my-issues-alert'],
        queryFn: async () => {
            try {
                const response = (await apiClient.get(ENDPOINTS.ISSUES.MY_ISSUES)).data;
                return response?.content || response || [];
            } catch {
                return [];
            }
        },
    });

    const lateReviewCount = myIssuesForAlert.filter((issue) => {
        if (issue.statusName !== 'Review') return false;
        const baseDate = issue.updatedAt || issue.createdAt;
        const ts = baseDate ? new Date(baseDate).getTime() : NaN;
        if (!ts || Number.isNaN(ts)) return false;
        const elapsedHours = (Date.now() - ts) / (1000 * 60 * 60);
        return elapsedHours >= 48;
    }).length;

    if (user?.isSystemAdmin) return null;

    // Lọc menu theo quyền và cờ tính năng
    const visibleSections = NAV_CONFIG.map(section => {
        // Kiểm tra Feature Toggle của cả section (Ví dụ: tắt HR module thì ẩn cả section)

        const items = section.items.filter(item => {
            // Kiểm tra Permission cụ thể của từng item
            if (item.permission && !canAccess({ permission: item.permission })) {
                // Special case for Settings: If user can manage requests or members, also show settings
                if (item.path === '/app/company/settings') {
                    if (hasPermission('WORKSPACE.MANAGE_REQUESTS') || hasPermission('WORKSPACE.MANAGE_MEMBERS')) return true;
                }
                return false;
            }
            return true;
        });

        if (items.length === 0) return null;

        return { ...section, items };
    }).filter(Boolean);

    const isItemActive = (item) => {
        if (item.exact) return location.pathname === item.path;
        return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    };

    return (
        <aside
            className={`
                fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out
                ${sidebarCollapsed ? 'w-20' : 'w-[260px]'}
                bg-white border-r border-gray-100 flex flex-col shadow-sm
            `}
        >
            {/* Header / Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100/50 bg-white/50 backdrop-blur-xl">
                {!sidebarCollapsed && (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <i className="fa-solid fa-layer-group text-sm"></i>
                        </div>
                        <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                            Workspace
                        </span>
                    </div>
                )}
                <button
                    onClick={toggleSidebar}
                    className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-indigo-50 flex items-center justify-center text-gray-500 hover:text-indigo-600 transition-colors mx-auto"
                >
                    <i className={`fa-solid ${sidebarCollapsed ? 'fa-chevron-right' : 'fa-bars'}`}></i>
                </button>
            </div>

            {/* Workspace Switcher */}
            {!sidebarCollapsed && (
                <div className="p-3 border-b border-gray-100/50 bg-gray-50/30">
                    <CompanySwitcher />
                </div>
            )}

            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-4 px-3 space-y-6">
                {visibleSections.map((section, idx) => (
                    <div key={idx} className="space-y-1">
                        {!sidebarCollapsed && section.title && (
                            <h3 className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                {section.title}
                            </h3>
                        )}
                        {section.items.map((item, itemIdx) => (
                            <NavLink
                                key={itemIdx}
                                to={item.path}
                                className={() => `
                                    relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group
                                    ${isItemActive(item)
                                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
                                    }
                                `}
                                title={sidebarCollapsed ? item.label : ''}
                            >
                                <div className={`
                                    w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors
                                    ${isItemActive(item) ? 'bg-indigo-100/50 text-indigo-600' : 'bg-white text-gray-400 group-hover:text-gray-600 group-hover:bg-white border border-gray-100 shadow-sm'}
                                `}>
                                    <i className={`fa-solid ${item.icon}`}></i>
                                </div>
                                {!sidebarCollapsed && (
                                    <span className="flex-1 truncate flex items-center gap-2">
                                        <span>{item.label}</span>
                                        {item.path === '/app/me/issues' && lateReviewCount > 0 && (
                                            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                                                {lateReviewCount}
                                            </span>
                                        )}
                                    </span>
                                )}
                                {sidebarCollapsed && item.path === '/app/me/issues' && lateReviewCount > 0 && (
                                    <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                                        {lateReviewCount}
                                    </span>
                                )}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </div>

            {/* User Profile Footer */}
            <div className="p-3 border-t border-gray-100 bg-white">
                <div className="flex flex-col gap-1">
                    <button
                        onClick={() => navigate('/app/me/profile')}
                        className={`flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
                    >
                        <img
                            src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.fullName}&background=6366f1&color=fff`}
                            alt="avatar"
                            className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                        {!sidebarCollapsed && (
                            <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-bold text-gray-900 truncate">{user?.fullName}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                            </div>
                        )}
                    </button>

                    <button
                        onClick={logout}
                        className={`flex items-center gap-3 p-2 rounded-xl hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
                        title="Đăng xuất"
                    >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center">
                            <i className="fa-solid fa-arrow-right-from-bracket"></i>
                        </div>
                        {!sidebarCollapsed && (
                            <span className="text-sm font-medium">Đăng xuất</span>
                        )}
                    </button>
                </div>
            </div>
        </aside>
    );
}
