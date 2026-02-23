/**
 * Role Display Helper
 * Maps backend role codes to user-friendly display names
 * 
 * Based on transition_plan.md:
 * - DIRECTOR → Owner
 * - EMPLOYEE → Member
 * - MANAGER_* → Admin/Lead
 */

export const ROLES = {
    // Workspace roles
    OWNER: { label: 'Owner', color: 'gold', icon: 'fa-crown' },
    ADMIN: { label: 'Admin', color: 'purple', icon: 'fa-user-shield' },

    // Legacy company roles (mapped to SaaS terminology)
    DIRECTOR: { label: 'Owner', color: 'gold', icon: 'fa-crown' },
    SYSTEM_ADMIN: { label: 'System Admin', color: 'red', icon: 'fa-user-cog' },
    MANAGER_HR: { label: 'HR Admin', color: 'purple', icon: 'fa-users' },
    MANAGER_PROJECT: { label: 'Project Lead', color: 'green', icon: 'fa-project-diagram' },
    MANAGER_ACCOUNTING: { label: 'Accounting Lead', color: 'indigo', icon: 'fa-calculator' },
    EMPLOYEE: { label: 'Member', color: 'gray', icon: 'fa-user' },
    MEMBER: { label: 'Member', color: 'gray', icon: 'fa-user' },
};

/**
 * Get role display info
 * @param {string} backendRole - Role from backend (DIRECTOR, ADMIN, etc.)
 * @returns {{ label: string, color: string, icon: string }}
 */
export const getRoleDisplay = (backendRole) => {
    return ROLES[backendRole] || ROLES.MEMBER;
};

/**
 * Get just the label
 * @param {string} backendRole 
 * @returns {string}
 */
export const getRoleLabel = (backendRole) => {
    return getRoleDisplay(backendRole).label;
};

/**
 * Check if role has management privileges
 * @param {string} role 
 * @returns {boolean}
 */
export const isManager = (role) => {
    const managerRoles = ['OWNER', 'ADMIN', 'DIRECTOR', 'MANAGER_HR', 'MANAGER_PROJECT', 'MANAGER_ACCOUNTING'];
    return managerRoles.includes(role);
};

/**
 * Check if role is workspace owner
 * @param {string} role 
 * @returns {boolean}
 */
export const isOwner = (role) => {
    return ['OWNER', 'DIRECTOR'].includes(role);
};
