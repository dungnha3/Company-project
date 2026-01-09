/**
 * Plan Configuration & Helper Functions
 * Định nghĩa limits và features của từng plan
 */

export const PLAN_CONFIG = {
    FREE: {
        name: 'Free',
        maxUsers: 5,
        maxProjects: 3,
        storageGB: 1,
        features: {
            kanban: true,
            gantt: true,
            sprints: true,
            timeTracking: true,
            chat: true,
            files: true,
            hr: false,
            api: false,
        }
    },
    STARTER: {
        name: 'Starter',
        maxUsers: 20,
        maxProjects: -1, // unlimited
        storageGB: 10,
        features: {
            kanban: true,
            gantt: true,
            sprints: true,
            timeTracking: true,
            chat: true,
            files: true,
            hr: false,
            api: false,
        }
    },
    PROFESSIONAL: {
        name: 'Professional',
        maxUsers: 100,
        maxProjects: -1,
        storageGB: 100,
        features: {
            kanban: true,
            gantt: true,
            sprints: true,
            timeTracking: true,
            chat: true,
            files: true,
            hr: true,
            api: false,
        }
    },
    ENTERPRISE: {
        name: 'Enterprise',
        maxUsers: -1,
        maxProjects: -1,
        storageGB: -1,
        features: {
            kanban: true,
            gantt: true,
            sprints: true,
            timeTracking: true,
            chat: true,
            files: true,
            hr: true,
            api: true,
        }
    }
};

/**
 * Get plan config by name
 * @param {string} plan - Plan name (FREE, STARTER, PROFESSIONAL, ENTERPRISE)
 * @returns {object} Plan configuration
 */
export const getPlanConfig = (plan) => {
    return PLAN_CONFIG[plan] || PLAN_CONFIG.FREE;
};

/**
 * Check if a feature is available for a plan
 * @param {string} plan 
 * @param {string} featureName 
 * @returns {boolean}
 */
export const hasFeature = (plan, featureName) => {
    const config = getPlanConfig(plan);
    return config.features[featureName] === true;
};

/**
 * Check if user can add more members
 * @param {string} plan 
 * @param {number} currentCount 
 * @returns {boolean}
 */
export const canAddMember = (plan, currentCount) => {
    const config = getPlanConfig(plan);
    if (config.maxUsers === -1) return true; // unlimited
    return currentCount < config.maxUsers;
};

/**
 * Check if user can create more projects
 * @param {string} plan 
 * @param {number} currentCount 
 * @returns {boolean}
 */
export const canCreateProject = (plan, currentCount) => {
    const config = getPlanConfig(plan);
    if (config.maxProjects === -1) return true; // unlimited
    return currentCount < config.maxProjects;
};

/**
 * Get remaining slots
 * @param {string} plan
 * @param {number} currentCount
 * @param {'users'|'projects'} type
 * @returns {number} -1 if unlimited
 */
export const getRemainingSlots = (plan, currentCount, type) => {
    const config = getPlanConfig(plan);
    const max = type === 'users' ? config.maxUsers : config.maxProjects;
    if (max === -1) return -1;
    return Math.max(0, max - currentCount);
};

/**
 * Get plan that has a specific feature
 * @param {string} featureName
 * @returns {string} Minimum required plan name
 */
export const getRequiredPlanForFeature = (featureName) => {
    const plans = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
    for (const plan of plans) {
        if (hasFeature(plan, featureName)) {
            return plan;
        }
    }
    return 'ENTERPRISE';
};
