import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useUIStore } from '@shared/stores/uiStore';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { useAuthStore } from '@shared/stores/authStore';
import CompanySwitcher from './CompanySwitcher';
import { isMenuItemEnabled } from '@shared/utils/featureHelper';


/**
 * Hybrid NAV_CONFIG
 * - HR: single link → body tabs (SectionTabLayout handles sub-items)
 * - All other sections: inline items in sidebar
 */
export const NAV_CONFIG = [
    {
        key: 'overview',
        title: 'Tổng quan',
        roles: ['*'],
        items: [
            { path: '/app', icon: 'fa-house', label: 'Dashboard', exact: true },
        ],
    },

    {
        key: 'personal',
        title: 'Cá nhân',
        roles: ['*'],
        items: [
            { path: '/app/me/issues', icon: 'fa-list-check', label: 'Công việc của tôi', companyOnly: true },
            { path: '/app/me/calendar', icon: 'fa-calendar-days', label: 'Lịch cá nhân', feature: 'calendar', companyOnly: true },
            { path: '/app/me/timelogs', icon: 'fa-stopwatch', label: 'Chấm công (Logs)', feature: 'timeTracking', companyOnly: true },
        ],
    },
    {
        key: 'hr',
        title: 'Nhân sự (HR)',
        permission: 'hrViewList',
        feature: 'hr',
        companyOnly: true,
        items: [
            // Single entry point → body tabs handle sub-items
            { path: '/app/hr/employees', icon: 'fa-users-gear', label: 'Nhân viên (Team)', feature: 'hr', matchPrefix: '/app/hr' },
        ],
    },
    {
        key: 'payroll',
        title: 'Nghỉ phép',
        feature: 'hr',
        companyOnly: true,
        // Only show for users WITHOUT full HR access (those with hrViewList see everything in HR body tabs)
        hideIfPermission: 'hrViewList',
        items: [
            { path: '/app/hr/leave-requests', icon: 'fa-calendar-minus', label: 'Nghỉ phép', feature: 'leave' },
        ],
    },
    {
        key: 'workspace-tools',
        title: 'Dự án & Công cụ',
        roles: ['*'],
        companyOnly: true,
        items: [
            { path: '/app/projects', icon: 'fa-folder-open', label: 'Dự án', feature: 'project' },
            { path: '/app/reports', icon: 'fa-chart-bar', label: 'Báo cáo', feature: 'project' },
            { path: '/app/notifications', icon: 'fa-bell', label: 'Thông báo' },
            { path: '/app/company/activity', icon: 'fa-history', label: 'Nhật ký hoạt động', roles: ['OWNER', 'COMPANY_ADMIN'] },
        ],
    },
];

const FEATURE_NAMES = {
    'hr': 'Nhân sự (HR)',
    'project': 'Dự án',
    'leave': 'Nghỉ phép',
    'review': 'Đánh giá',
    'resourcePlanning': 'Quản lý nguồn lực',
    'timeTracking': 'Time Tracking',
    'calendar': 'Lịch',
};



export default function Sidebar() {
    const { sidebarCollapsed, toggleSidebar } = useUIStore();
    const { currentWorkspace, hasPermission } = useWorkspaceStore();
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [upgradeModal, setUpgradeModal] = useState(null);

    if (user?.isSystemAdmin) return null;

    const currentRoles = currentWorkspace?.roles || (currentWorkspace?.role ? [currentWorkspace.role] : ['OWNER']);
    const settings = currentWorkspace?.settings || null;
    const permissions = currentWorkspace?.permissions || null;
    const isPersonalWorkspace = currentWorkspace?.type === 'PERSONAL';

    // Filter sections and items
    const visibleSections = NAV_CONFIG.filter(section => {
        if (section.companyOnly && isPersonalWorkspace) return false;
        if (section.personalOnly && !isPersonalWorkspace) return false;

        // hideIfPermission: hide section if user HAS this permission (e.g., payroll hidden if user has full HR access)
        if (section.hideIfPermission && hasPermission(section.hideIfPermission)) return false;

        // Permission-based visibility (preferred)
        if (section.permission) return hasPermission(section.permission);

        // Role-based visibility (kept for admin-only sections)
        if (section.roles) {
            if (section.roles.includes('*')) return true;
            return section.roles.some(r => currentRoles.includes(r));
        }

        return true;
    }).map(section => ({
        ...section,
        items: section.items
            .map(item => {
                if (item.companyOnly && isPersonalWorkspace) return null;
                // Permission-based item visibility
                if (item.permission && !hasPermission(item.permission)) return null;
                // Legacy role-based item visibility
                if (item.roles && !item.roles.includes('*') && !item.roles.some(r => currentRoles.includes(r))) return null;

                if (item.feature) {
                    let planFeature = item.feature;
                    if (['leave', 'review', 'resourcePlanning'].includes(item.feature)) planFeature = 'hr';

                    const isFullyEnabled = isMenuItemEnabled(item.path, settings, permissions);
                    return isFullyEnabled ? { ...item, enabled: true } : null;
                }

                return { ...item, enabled: true };
            })
            .filter(Boolean),
    })).filter(section => section.items.length > 0);



    const isItemActive = (item) => {
        if (item.exact) return location.pathname === item.path;
        if (item.matchPrefix) return location.pathname.startsWith(item.matchPrefix);
        return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    };

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
                            item.enabled ? (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.exact}
                                    className={() => `menu-item ${isItemActive(item) ? 'active' : ''}`}
                                    title={item.label}
                                >
                                    <i className={`fa-solid ${item.icon}`} />
                                    {!sidebarCollapsed && <span>{item.label}</span>}
                                </NavLink>
                            ) : null
                        ))}
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 space-y-2">

                <NavLink to="/app/me/profile" className="menu-item" title="Cài đặt">
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
