/**
 * Role Display Helper
 * Maps backend role codes to user-friendly display names
 * 
 * Based on CompanyRole enum:
 * - OWNER → Owner
 * - COMPANY_ADMIN → Admin
 * - EMPLOYEE → Member
 */

export const ROLES = {
    // Workspace roles
    OWNER: { label: 'Owner', color: 'gold', icon: 'fa-crown' },
    COMPANY_ADMIN: { label: 'Admin', color: 'purple', icon: 'fa-user-shield' },

    // Legacy compatibility
    DIRECTOR: { label: 'Owner', color: 'gold', icon: 'fa-crown' },
    SYSTEM_ADMIN: { label: 'System Admin', color: 'red', icon: 'fa-user-cog' },
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
    const managerRoles = ['OWNER', 'COMPANY_ADMIN', 'DIRECTOR'];
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
