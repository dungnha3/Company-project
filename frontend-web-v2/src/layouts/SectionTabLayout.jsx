import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';



/**
 * HR Section Tab Layout Configuration
 * Groups HR sub-pages into logical tabs with sub-navigation
 */
export const HR_TAB_CONFIG = [
    {
        tabKey: 'manage',
        tabLabel: 'Nhân viên',
        tabIcon: 'fa-users',
        items: [
            { path: '/app/hr/employees', icon: 'fa-users', label: 'Danh sách nhân viên', feature: 'hr' },
        ],
    },
    {
        tabKey: 'evaluation',
        tabLabel: 'Đánh giá',
        tabIcon: 'fa-star',
        items: [
            { path: '/app/hr/performance', icon: 'fa-chart-column', label: 'Hiệu suất tổng thể', permission: 'HR.MANAGE_REVIEWS' },
            { path: '/app/hr/reviews', icon: 'fa-star', label: 'Đánh giá', feature: 'review' },
        ],
    },
    {
        tabKey: 'leave',
        tabLabel: 'Nghỉ phép',
        tabIcon: 'fa-calendar-minus',
        items: [
            { path: '/app/hr/leave-requests', icon: 'fa-calendar-minus', label: 'Nghỉ phép', feature: 'leave' },
        ],
    },
    {
        tabKey: 'advanced',
        tabLabel: 'Nguồn lực',
        tabIcon: 'fa-chart-area',
        items: [
            { path: '/app/hr/resource-planning', icon: 'fa-calendar-check', label: 'Phân bổ nguồn lực', feature: 'resourcePlanning' },
        ],
    },
];



/**
 * Section Tab Layout — renders tab bar + sub-nav pills in the body area.
 * Title is NOT rendered here (Header component handles it).
 */
export default function SectionTabLayout({ tabConfig }) {
    const location = useLocation();
    const { currentWorkspace, hasPermission } = useWorkspaceStore();

    const currentRoles = currentWorkspace?.roles || (currentWorkspace?.role ? [currentWorkspace.role] : ['OWNER']);
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
            return { ...item, enabled: true };
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

            {/* Sub-navigation pills for active tab (show only when multiple items) */}
            {activeTab && getVisibleItems(activeTab.items).length > 1 && (
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
