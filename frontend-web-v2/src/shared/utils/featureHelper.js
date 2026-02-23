/**
 * Feature Helper - Kết hợp Plan + CompanySettings
 * Kiểm tra feature có được bật không dựa trên:
 * 1. Plan tier (FREE/STARTER/PRO/ENTERPRISE)
 * 2. CompanySettings (Admin bật/tắt)
 */

import { hasFeature as planHasFeature } from './planHelper';

/**
 * Mapping từ feature key sang CompanySettings field
 */
const FEATURE_SETTINGS_MAP = {
    // Modules
    'hr': 'hrModuleEnabled',
    'project': 'projectModuleEnabled',
    'chat': 'chatModuleEnabled',
    'storage': 'storageModuleEnabled',
    'ai': 'aiModuleEnabled',

    // HR Sub-features
    'attendance': 'attendanceEnabled',
    'leave': 'leaveEnabled',
    'salary': 'salaryEnabled',
    'contract': 'contractEnabled',
    'review': 'reviewEnabled',

    // HR Competitive features (NEW)
    'okr': 'okrEnabled',
    'skillsMatrix': 'skillsMatrixEnabled',
    'onboarding': 'onboardingEnabled',
    'resourcePlanning': 'resourcePlanningEnabled',
    'orgChart': 'orgChartEnabled',

    // Project Sub-features (NEW)
    'timeTracking': 'timeTrackingEnabled',
    'analytics': 'analyticsEnabled',
    'calendar': 'calendarEnabled',
    'webhook': 'webhookEnabled',

    // Chat Sub-features (NEW)
    'chatReactions': 'chatReactionsEnabled',
    'chatFileShare': 'chatFileShareEnabled',
    'chatThreads': 'chatThreadsEnabled',
    'chatSearch': 'chatSearchEnabled',
};

/**
 * Check xem feature có yêu cầu HR module không
 */
const HR_DEPENDENT_FEATURES = [
    'attendance', 'leave', 'salary', 'contract', 'review',
    'okr', 'skillsMatrix', 'onboarding', 'resourcePlanning', 'orgChart'
];

/**
 * Check xem feature có yêu cầu Project module không
 */
const PROJECT_DEPENDENT_FEATURES = ['timeTracking', 'analytics', 'webhook'];

/**
 * Feature Helper - Kết hợp Plan + CompanySettings + UserPermissions
 */

// ... (existing imports)

/**
 * Mapping feature -> UserPermission field (Default permission required for this feature)
 * Used when generic feature access is checked (e.g. Sidebar)
 */
const FEATURE_PERMISSION_MAP = {
    'hr': 'hrViewList',
    'attendance': 'attendanceViewAll', // Or attendanceViewOwn if we had it, but ViewAll seems appropriate for module access
    'leave': 'leaveViewAll', // Proxy
    'salary': 'salaryView',
    'contract': 'hrManageContracts', // Contract management
    'review': 'hrViewList', // Review usually linked to HR
    'project': 'projectCreate', // Or projectManageAll? Maybe just need ability to see projects? 
    // We don't have projectView? Assuming projectCreate implies access for now or update POJO.
    // Actually UserPermissions has projectCreate, projectManageAll, projectDelete.
    // Use projectCreate as proxy for "Can use Projects" for now? Or better, just 'projectManageAll' if we want to restrict?
    // Let's assume projectCreate for basic access or if they are just a member.
    // Wait, regular members might NOT create projects but can View.
    // Our UserPermissions POJO is limited. 
    // For now, if permissions object is null (Admin/Owner), it passes.
    // If permissions object exists (Employee), they might NOT have projectCreate.
    // We might need a 'projectView' permission or similar. 
    // For now, let's map 'project' to 'projectCreate' or 'projectManageAll' implies full access.
    // IF NO MAPPING, we might skip permission check for generic module, relies on specific action checks later.
    'chat': 'chatCreateGroup', // Proxy
    'storage': 'storageUpload', // Proxy
};

/**
 * Check specifically for user permission (Granular)
 */
export function hasUserPermission(permissions, feature) {
    if (!permissions) return true; // No permissions object provided (or Personal/Owner), assume Allowed or handled elsewhere

    // Direct field check if feature matches permission key
    if (permissions[feature] !== undefined) return permissions[feature];

    // Mapped check
    const permKey = FEATURE_PERMISSION_MAP[feature];
    if (permKey && permissions[permKey] !== undefined) {
        return permissions[permKey];
    }

    return true; // Default allow if no specific permission mapped (Plan/Settings controlled)
}

// ... existing isFeatureEnabled signature updated

export function isFeatureEnabled(plan, settings, feature, permissions = null) {
    // 1. Plan Check
    let planFeature = feature;
    if (HR_DEPENDENT_FEATURES.includes(feature)) planFeature = 'hr';
    if (PROJECT_DEPENDENT_FEATURES.includes(feature)) planFeature = 'project';

    if (!planHasFeature(plan, planFeature)) {
        return false;
    }

    // 2. Personal Workspace Check (No settings, no perms usually)
    if (!settings) {
        return planHasFeature('FREE', planFeature);
    }

    // 3. Company Settings Check
    const settingsKey = FEATURE_SETTINGS_MAP[feature];
    if (settingsKey && settings[settingsKey] === false) {
        return false;
    }

    // 4. HR/Project Module Global Switches
    if (HR_DEPENDENT_FEATURES.includes(feature) && !settings.hrModuleEnabled) return false;
    if (PROJECT_DEPENDENT_FEATURES.includes(feature) && !settings.projectModuleEnabled) return false;

    // 5. User Permission Check (NEW)
    if (permissions) {
        if (!hasUserPermission(permissions, feature)) {
            return false;
        }
    }

    return true;
}

/**
 * Kiểm tra section sidebar có hiển thị không
 * @param {string} sectionKey - Key của section (hr, time, finance, project, other)
 * @param {string} plan 
 * @param {object|null} settings 
 * @returns {boolean}
 */
export function isSectionEnabled(sectionKey, plan, settings) {
    switch (sectionKey) {
        case 'hr':
        case 'time':
        case 'finance':
            return isFeatureEnabled(plan, settings, 'hr');
        case 'project':
            return isFeatureEnabled(plan, settings, 'project');
        case 'other':
            return true; // Luôn hiển thị
        default:
            return true;
    }
}

/**
 * Kiểm tra menu item cụ thể có hiển thị không
 * @param {string} itemPath - Route path (e.g., '/app/hr/attendance')
 * @param {string} plan 
 * @param {object|null} settings 
 * @returns {boolean}
 */
export function isMenuItemEnabled(itemPath, plan, settings, permissions = null) {
    const pathFeatureMap = {
        '/app/hr/attendance': 'attendance',
        '/app/hr/leave-requests': 'leave',
        '/app/hr/salaries': 'salary',
        '/app/hr/contracts': 'contract',
        '/app/hr/employees': 'hr',
        '/app/hr/departments': 'hr',
        '/app/hr/positions': 'hr',
        '/app/reviews': 'review',
        '/app/projects': 'project',
        '/app/chat': 'chat',
        '/app/storage': 'storage',
        // New competitive features
        '/app/me/timelogs': 'timeTracking',
        '/app/me/calendar': 'calendar',
        '/app/hr-dashboard': 'hr',
        '/app/org-chart': 'orgChart',
        '/app/okr': 'okr',
        '/app/skills-matrix': 'skillsMatrix',
        '/app/onboarding': 'onboarding',
        '/app/resource-planning': 'resourcePlanning',
    };

    const feature = pathFeatureMap[itemPath];
    if (!feature) return true;

    return isFeatureEnabled(plan, settings, feature, permissions);
}

/**
 * Check if specific project feature is enabled (for tabs/buttons in project pages)
 */
export function isProjectFeatureEnabled(settings, feature) {
    const map = {
        'timeTracking': 'timeTrackingEnabled',
        'analytics': 'analyticsEnabled',
        'calendar': 'calendarEnabled',
        'webhook': 'webhookEnabled',
    };

    if (!settings) return true; // Personal workspace
    if (!settings.projectModuleEnabled) return false;

    const key = map[feature];
    return key ? settings[key] !== false : true;
}

