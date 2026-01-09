import { NavLink, useLocation } from 'react-router-dom';
import { useUIStore } from '@shared/stores/uiStore';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { useAuthStore } from '@shared/stores/authStore';
import CompanySwitcher from './CompanySwitcher';

const NAV_CONFIG = [
    {
        key: 'overview',
        title: 'Tổng quan',
        roles: ['*'],
        items: [
            { path: '/app', icon: 'fa-house', label: 'Dashboard', exact: true },
            { path: '/app/settings/workspace', icon: 'fa-sliders', label: 'Cài đặt Workspace', roles: ['OWNER', 'ADMIN'] },
        ],
    },
    {
        key: 'hr',
        title: 'Nhân sự',
        roles: ['OWNER', 'ADMIN', 'MANAGER_HR'],
        items: [
            { path: '/app/employees', icon: 'fa-users', label: 'Thành viên' },
            { path: '/app/departments', icon: 'fa-building', label: 'Phòng ban' },
            { path: '/app/positions', icon: 'fa-briefcase', label: 'Chức vụ' },
            { path: '/app/contracts', icon: 'fa-file-contract', label: 'Hợp đồng' },
        ],
    },
    {
        key: 'time',
        title: 'Chấm công & Nghỉ phép',
        roles: ['*'],
        items: [
            { path: '/app/attendance', icon: 'fa-clock', label: 'Chấm công' },
            { path: '/app/leave-requests', icon: 'fa-calendar-check', label: 'Nghỉ phép' },
        ],
    },
    {
        key: 'finance',
        title: 'Tài chính',
        roles: ['OWNER', 'ADMIN', 'MANAGER_ACCOUNTING'],
        items: [
            { path: '/app/salaries', icon: 'fa-money-bill-wave', label: 'Bảng lương' },
        ],
    },
    {
        key: 'project',
        title: 'Dự án',
        roles: ['*'],
        items: [
            { path: '/app/projects', icon: 'fa-folder-open', label: 'Dự án' },
            { path: '/app/my-issues', icon: 'fa-list-check', label: 'Công việc' },
        ],
    },
    {
        key: 'other',
        title: 'Khác',
        roles: ['*'],
        items: [
            { path: '/app/storage', icon: 'fa-folder', label: 'Tài liệu' },
            { path: '/app/chat', icon: 'fa-comments', label: 'Trò chuyện' },
            { path: '/app/notifications', icon: 'fa-bell', label: 'Thông báo' },
        ],
    },
];

import { isSectionEnabled, isMenuItemEnabled } from '@shared/utils/featureHelper';

export default function Sidebar() {
    const { sidebarCollapsed, toggleSidebar } = useUIStore();
    const { currentWorkspace } = useWorkspaceStore();
    const { logout } = useAuthStore();
    const location = useLocation();

    // Get current role, plan, and settings from workspace context
    const currentRole = currentWorkspace?.role || 'OWNER';
    const currentPlan = currentWorkspace?.plan || 'FREE';
    const settings = currentWorkspace?.settings || null;

    // Filter nav items by role, plan, AND company settings
    const visibleSections = NAV_CONFIG.filter(section => {
        // Role check
        const hasRole = section.roles.includes('*') || section.roles.includes(currentRole);
        if (!hasRole) return false;

        // Plan + Settings check via featureHelper
        if (!isSectionEnabled(section.key, currentPlan, settings)) {
            return false;
        }

        return true;
    }).map(section => ({
        ...section,
        // Filter individual items within section
        items: section.items.filter(item =>
            isMenuItemEnabled(item.path, currentPlan, settings)
        )
    })).filter(section => section.items.length > 0); // Remove empty sections

    return (
        <aside className={`sidebar fixed top-0 left-0 h-screen z-40 ${sidebarCollapsed ? 'collapsed' : ''}`}>
            {/* Toggle Button */}
            <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-6 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center text-gray-400 hover:text-primary transition-colors"
            >
                <i className={`fa-solid ${sidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-xs`} />
            </button>

            {/* Company Switcher */}
            <div className="p-4 border-b border-gray-100">
                <CompanySwitcher collapsed={sidebarCollapsed} />
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
                {visibleSections.map(section => (
                    <div key={section.key} className="menu-section">
                        {!sidebarCollapsed && (
                            <div className="menu-title">{section.title}</div>
                        )}
                        {section.items.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.exact}
                                className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
                                title={item.label}
                            >
                                <i className={`fa-solid ${item.icon}`} />
                                {!sidebarCollapsed && <span>{item.label}</span>}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100">
                <NavLink to="/app/profile" className="menu-item" title="Cài đặt">
                    <i className="fa-solid fa-gear" />
                    {!sidebarCollapsed && <span>Cài đặt</span>}
                </NavLink>
                <button
                    onClick={logout}
                    className="menu-item w-full text-red-500 hover:bg-red-50 hover:text-red-600"
                    title="Đăng xuất"
                >
                    <i className="fa-solid fa-right-from-bracket" />
                    {!sidebarCollapsed && <span>Đăng xuất</span>}
                </button>
            </div>
        </aside>
    );
}
