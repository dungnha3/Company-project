import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useUIStore } from '@shared/stores/uiStore';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { useAuthStore } from '@shared/stores/authStore';
import CompanySwitcher from './CompanySwitcher';
import { isMenuItemEnabled } from '@shared/utils/featureHelper';
import { getRequiredPlanForFeature } from '@shared/utils/planHelper';

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
        key: 'personal-workspace',
        title: 'Không gian cá nhân',
        roles: ['*'],
        personalOnly: true,
        items: [
            { path: '/app/me/tasks', icon: 'fa-list-check', label: 'Tasks cá nhân' },
            { path: '/app/me/storage', icon: 'fa-folder-open', label: 'Tài liệu cá nhân' },
            { path: '/app/me/personal-calendar', icon: 'fa-calendar-days', label: 'Lịch cá nhân' },
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
            // Single entry point → body tabs handle 13 sub-items
            { path: '/app/hr/dashboard', icon: 'fa-users-gear', label: 'Nhân sự (HR)', feature: 'hr', matchPrefix: '/app/hr' },
        ],
    },
    {
        key: 'payroll',
        title: 'Chấm công & Lương',
        feature: 'hr',
        companyOnly: true,
        // Only show for users WITHOUT full HR access (those with hrViewList see everything in HR body tabs)
        hideIfPermission: 'hrViewList',
        items: [
            { path: '/app/hr/attendance', icon: 'fa-clock', label: 'Chấm công', feature: 'attendance' },
            { path: '/app/hr/leave-requests', icon: 'fa-calendar-minus', label: 'Nghỉ phép', feature: 'leave' },
            { path: '/app/hr/salaries', icon: 'fa-money-bill-wave', label: 'Bảng lương', feature: 'salary', permission: 'salaryView' },
        ],
    },
    {
        key: 'workspace-tools',
        title: 'Dự án & Công cụ',
        roles: ['*'],
        companyOnly: true,
        items: [
            { path: '/app/projects', icon: 'fa-folder-open', label: 'Dự án', feature: 'project' },
            { path: '/app/storage', icon: 'fa-folder', label: 'Tài liệu chung', feature: 'storage' },
            { path: '/app/chat', icon: 'fa-comments', label: 'Trò chuyện', feature: 'chat' },
            { path: '/app/notifications', icon: 'fa-bell', label: 'Thông báo' },
        ],
    },
    {
        key: 'company',
        title: 'Quản trị Workspace',
        roles: ['OWNER', 'COMPANY_ADMIN'],
        companyOnly: true,
        items: [
            { path: '/app/company/dashboard', icon: 'fa-building', label: 'Tổng quan' },
            { path: '/app/company/activity', icon: 'fa-history', label: 'Nhật ký hoạt động' },
            { path: '/app/billing', icon: 'fa-credit-card', label: 'Gói & Thanh toán' },
            { path: '/app/company/settings', icon: 'fa-cog', label: 'Cài đặt chung' },
        ],
    },
];

// Feature display names for upgrade prompt
const FEATURE_NAMES = {
    'hr': 'Nhân sự (HR)',
    'project': 'Dự án',
    'chat': 'Trò chuyện',
    'storage': 'Tài liệu',
    'attendance': 'Chấm công',
    'leave': 'Nghỉ phép',
    'salary': 'Bảng lương',
    'contract': 'Hợp đồng',
    'review': 'Đánh giá',
    'okr': 'OKR/KPI',
    'skillsMatrix': 'Ma trận kỹ năng',
    'onboarding': 'Onboarding',
    'resourcePlanning': 'Quản lý nguồn lực',
    'orgChart': 'Sơ đồ tổ chức',
    'timeTracking': 'Time Tracking',
    'calendar': 'Lịch',
    'ai': 'AI Assistant',
};

const PLAN_LEVELS = { 'FREE': 0, 'STARTER': 1, 'PROFESSIONAL': 2, 'ENTERPRISE': 3 };

export default function Sidebar() {
    const { sidebarCollapsed, toggleSidebar } = useUIStore();
    const { currentWorkspace, hasPermission } = useWorkspaceStore();
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [upgradeModal, setUpgradeModal] = useState(null);

    if (user?.isSystemAdmin) return null;

    const currentRoles = currentWorkspace?.roles || (currentWorkspace?.role ? [currentWorkspace.role] : ['OWNER']);
    const currentPlan = currentWorkspace?.plan || 'FREE';
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
                    if (['attendance', 'leave', 'salary', 'contract', 'review', 'okr', 'onboarding', 'resourcePlanning'].includes(item.feature)) planFeature = 'hr';

                    const isFullyEnabled = isMenuItemEnabled(item.path, currentPlan, settings, permissions);
                    if (isFullyEnabled) return { ...item, enabled: true };

                    const requiredPlan = getRequiredPlanForFeature(planFeature);
                    const isPlanBlocked = PLAN_LEVELS[currentPlan] < PLAN_LEVELS[requiredPlan];
                    return isPlanBlocked ? { ...item, enabled: false } : null;
                }

                return { ...item, enabled: true };
            })
            .filter(Boolean),
    })).filter(section => section.items.length > 0);

    const handleDisabledClick = (item, e) => {
        e.preventDefault();
        e.stopPropagation();
        const featureName = FEATURE_NAMES[item.feature] || item.label;
        const requiredPlan = getRequiredPlanForFeature(item.feature === 'hr' ? 'hr' : item.feature);
        setUpgradeModal({ feature: item.feature, name: featureName, requiredPlan });
    };

    const closeUpgradeModal = () => setUpgradeModal(null);

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
                            ) : (
                                <button
                                    key={item.path}
                                    onClick={(e) => handleDisabledClick(item, e)}
                                    className="menu-item w-full opacity-50 cursor-not-allowed hover:bg-gray-50"
                                    title={`${item.label} - Cần nâng cấp gói`}
                                >
                                    <i className={`fa-solid ${item.icon} text-gray-400`} />
                                    {!sidebarCollapsed && (
                                        <>
                                            <span className="text-gray-400">{item.label}</span>
                                            <i className="fa-solid fa-lock text-[10px] text-gray-400 ml-auto" />
                                        </>
                                    )}
                                </button>
                            )
                        ))}
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 space-y-2">
                {isPersonalWorkspace && currentPlan === 'FREE' && !sidebarCollapsed && (
                    <NavLink
                        to="/app/billing"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 text-violet-600 text-sm hover:from-violet-100 hover:to-purple-100 transition-all group"
                    >
                        <i className="fa-solid fa-sparkles text-xs group-hover:animate-pulse" />
                        <span className="font-medium">Nâng cấp PRO</span>
                        <i className="fa-solid fa-arrow-right text-xs ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </NavLink>
                )}
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

            {/* Upgrade Modal */}
            {upgradeModal && (
                <div className="modal-overlay">
                    <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-fade-in">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                                <i className="fa-solid fa-crown text-2xl text-indigo-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                                Nâng cấp để mở khóa
                            </h3>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-600 mb-3">
                                <i className={`fa-solid ${isPersonalWorkspace ? 'fa-user' : 'fa-building'} text-xs`} />
                                {isPersonalWorkspace ? 'Personal Workspace' : (currentWorkspace?.name || 'Company Workspace')}
                            </div>
                            <p className="text-gray-600 mb-4">
                                Tính năng <strong className="text-indigo-600">{upgradeModal.name}</strong> yêu cầu gói{' '}
                                <span className="font-semibold text-purple-600">{upgradeModal.requiredPlan}</span> trở lên.
                            </p>
                            <p className="text-sm text-gray-500 mb-6">
                                Nâng cấp workspace này để trải nghiệm đầy đủ tính năng!
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={closeUpgradeModal}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Để sau
                                </button>
                                <button
                                    onClick={() => {
                                        closeUpgradeModal();
                                        navigate('/app/billing');
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                                >
                                    <i className="fa-solid fa-arrow-up-right-from-square mr-2" />
                                    Nâng cấp
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
