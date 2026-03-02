import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { isMenuItemEnabled } from '@shared/utils/featureHelper';
import { getRequiredPlanForFeature } from '@shared/utils/planHelper';

/**
 * HR Section Tab Layout Configuration
 * Groups HR sub-pages into logical tabs with sub-navigation
 */
export const HR_TAB_CONFIG = [
    {
        tabKey: 'manage',
        tabLabel: 'Quản lý',
        tabIcon: 'fa-clipboard-list',
        items: [
            { path: '/app/hr/dashboard', icon: 'fa-gauge-high', label: 'Tổng quan', feature: 'hr' },
            { path: '/app/hr/employees', icon: 'fa-users', label: 'Nhân viên', feature: 'hr' },
            { path: '/app/hr/departments', icon: 'fa-building', label: 'Phòng ban', feature: 'hr' },
            { path: '/app/hr/positions', icon: 'fa-briefcase', label: 'Chức vụ', feature: 'hr' },
        ],
    },
    {
        tabKey: 'evaluation',
        tabLabel: 'Đánh giá & Phát triển',
        tabIcon: 'fa-chart-line',
        items: [
            { path: '/app/hr/contracts', icon: 'fa-file-contract', label: 'Hợp đồng', feature: 'contract' },
            { path: '/app/hr/reviews', icon: 'fa-star', label: 'Đánh giá', feature: 'review' },
            { path: '/app/hr/okr', icon: 'fa-bullseye', label: 'OKR/KPI', feature: 'okr' },
            { path: '/app/hr/onboarding', icon: 'fa-user-plus', label: 'Onboarding', feature: 'onboarding' },
        ],
    },
    {
        tabKey: 'payroll',
        tabLabel: 'Chấm công & Lương',
        tabIcon: 'fa-money-check-dollar',
        items: [
            { path: '/app/hr/attendance', icon: 'fa-clock', label: 'Chấm công', feature: 'attendance' },
            { path: '/app/hr/leave-requests', icon: 'fa-calendar-minus', label: 'Nghỉ phép', feature: 'leave' },
            { path: '/app/hr/salaries', icon: 'fa-money-bill-wave', label: 'Bảng lương', feature: 'salary', permission: 'salaryView' },
        ],
    },
    {
        tabKey: 'advanced',
        tabLabel: 'Nâng cao',
        tabIcon: 'fa-chart-area',
        items: [
            { path: '/app/hr/org-chart', icon: 'fa-sitemap', label: 'Sơ đồ tổ chức', feature: 'orgChart' },
            { path: '/app/hr/resource-planning', icon: 'fa-calendar-check', label: 'Nguồn lực', feature: 'resourcePlanning' },
        ],
    },
];

const PLAN_LEVELS = { 'FREE': 0, 'STARTER': 1, 'PROFESSIONAL': 2, 'ENTERPRISE': 3 };

/**
 * Section Tab Layout — renders tab bar + sub-nav pills in the body area.
 * Title is NOT rendered here (Header component handles it).
 */
export default function SectionTabLayout({ tabConfig }) {
    const location = useLocation();
    const { currentWorkspace, hasPermission } = useWorkspaceStore();

    const currentRoles = currentWorkspace?.roles || (currentWorkspace?.role ? [currentWorkspace.role] : ['OWNER']);
    const currentPlan = currentWorkspace?.plan || 'FREE';
    const settings = currentWorkspace?.settings || null;
    const permissions = currentWorkspace?.permissions || null;

    // Determine active tab from current path
    const activeTab = tabConfig.find(tab =>
        tab.items.some(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/'))
    ) || tabConfig[0];

    // Filter items by role and feature
    const getVisibleItems = (items) => {
        return items.filter(item => {
            // Permission-based filter (preferred)
            if (item.permission && !hasPermission(item.permission)) {
                return false;
            }
            // Legacy role-based filter
            if (item.roles && !item.roles.includes('*') && !item.roles.some(r => currentRoles.includes(r))) {
                return false;
            }
            return true;
        }).map(item => {
            if (!item.feature) return { ...item, enabled: true };

            const isEnabled = isMenuItemEnabled(item.path, currentPlan, settings, permissions);
            if (isEnabled) return { ...item, enabled: true };

            let planFeature = item.feature;
            if (['attendance', 'leave', 'salary', 'contract', 'review', 'okr', 'onboarding', 'resourcePlanning'].includes(item.feature)) planFeature = 'hr';
            const requiredPlan = getRequiredPlanForFeature(planFeature);
            const isPlanBlocked = PLAN_LEVELS[currentPlan] < PLAN_LEVELS[requiredPlan];

            return isPlanBlocked ? { ...item, enabled: false } : null;
        }).filter(Boolean);
    };

    // Filter tabs that have at least one visible item
    const visibleTabs = tabConfig.map(tab => ({
        ...tab,
        items: getVisibleItems(tab.items),
    })).filter(tab => tab.items.length > 0);

    return (
        <div className="section-tab-layout">
            {/* Tab Bar — no title here, Header handles page title */}
            <div className="section-tab-header">
                <div className="section-tabs">
                    {visibleTabs.map(tab => {
                        const isActive = tab.tabKey === activeTab?.tabKey;
                        return (
                            <NavLink
                                key={tab.tabKey}
                                to={tab.items[0]?.path || '#'}
                                className={`section-tab ${isActive ? 'active' : ''}`}
                            >
                                <i className={`fa-solid ${tab.tabIcon}`} />
                                <span>{tab.tabLabel}</span>
                            </NavLink>
                        );
                    })}
                </div>
            </div>

            {/* Sub-navigation pills for active tab */}
            {activeTab && (
                <div className="section-sub-nav">
                    {getVisibleItems(activeTab.items).map(item => (
                        item.enabled ? (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end
                                className={({ isActive }) => `section-sub-nav-item ${isActive ? 'active' : ''}`}
                            >
                                <i className={`fa-solid ${item.icon}`} />
                                <span>{item.label}</span>
                            </NavLink>
                        ) : (
                            <span key={item.path} className="section-sub-nav-item disabled" title="Cần nâng cấp gói">
                                <i className={`fa-solid ${item.icon}`} />
                                <span>{item.label}</span>
                                <i className="fa-solid fa-lock text-[9px] ml-1" />
                            </span>
                        )
                    ))}
                </div>
            )}

            {/* Page Content */}
            <div className="section-content">
                <Outlet />
            </div>
        </div>
    );
}
