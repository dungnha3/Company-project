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
    'automation': 'automationEnabled',

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
const PROJECT_DEPENDENT_FEATURES = ['timeTracking', 'analytics', 'automation'];

/**
 * Kiểm tra feature có được bật không
 * @param {string} plan - Plan tier (FREE, STARTER, PROFESSIONAL, ENTERPRISE)
 * @param {object|null} settings - CompanySettings từ backend (null = Personal Workspace)
 * @param {string} feature - Feature key
 * @returns {boolean}
 */
export function isFeatureEnabled(plan, settings, feature) {
    // 1. Kiểm tra Plan trước
    // HR sub-features đều phụ thuộc vào 'hr' plan feature
    let planFeature = feature;
    if (HR_DEPENDENT_FEATURES.includes(feature)) planFeature = 'hr';
    if (PROJECT_DEPENDENT_FEATURES.includes(feature)) planFeature = 'project';

    if (!planHasFeature(plan, planFeature)) {
        return false;
    }

    // 2. Nếu không có settings (Personal Workspace) → cho phép tất cả
    if (!settings) {
        return true;
    }

    // 3. Kiểm tra CompanySettings
    const settingsKey = FEATURE_SETTINGS_MAP[feature];
    if (!settingsKey) {
        // Feature không có trong map → cho phép
        return true;
    }

    // 4. HR sub-features cần check cả hrModuleEnabled
    if (HR_DEPENDENT_FEATURES.includes(feature)) {
        if (!settings.hrModuleEnabled) {
            return false;
        }
    }

    // 5. Project sub-features cần check cả projectModuleEnabled
    if (PROJECT_DEPENDENT_FEATURES.includes(feature)) {
        if (!settings.projectModuleEnabled) {
            return false;
        }
    }

    return settings[settingsKey] !== false;
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
 * @param {string} itemPath - Route path (e.g., '/app/attendance')
 * @param {string} plan 
 * @param {object|null} settings 
 * @returns {boolean}
 */
export function isMenuItemEnabled(itemPath, plan, settings) {
    const pathFeatureMap = {
        '/app/attendance': 'attendance',
        '/app/leave-requests': 'leave',
        '/app/salaries': 'salary',
        '/app/contracts': 'contract',
        '/app/employees': 'hr',
        '/app/departments': 'hr',
        '/app/positions': 'hr',
        '/app/reviews': 'review',
        '/app/projects': 'project',
        '/app/chat': 'chat',
        '/app/storage': 'storage',
        // New competitive features
        '/app/my-timelogs': 'timeTracking',
        '/app/calendar': 'calendar',
        '/app/hr-dashboard': 'hr',
        '/app/org-chart': 'orgChart',
        '/app/okr': 'okr',
        '/app/skills-matrix': 'skillsMatrix',
        '/app/onboarding': 'onboarding',
        '/app/resource-planning': 'resourcePlanning',
    };

    const feature = pathFeatureMap[itemPath];
    if (!feature) return true;

    return isFeatureEnabled(plan, settings, feature);
}

/**
 * Check if specific project feature is enabled (for tabs/buttons in project pages)
 */
export function isProjectFeatureEnabled(settings, feature) {
    const map = {
        'timeTracking': 'timeTrackingEnabled',
        'analytics': 'analyticsEnabled',
        'calendar': 'calendarEnabled',
        'automation': 'automationEnabled',
    };

    if (!settings) return true; // Personal workspace
    if (!settings.projectModuleEnabled) return false;

    const key = map[feature];
    return key ? settings[key] !== false : true;
}

