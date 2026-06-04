/**
 * API Endpoints Configuration
 * Matching with BE multi-tenant APIs (English paths)
 */

export const ENDPOINTS = {
    // Auth
    AUTH: {
        LOGIN: '/api/auth/login',
        GOOGLE_LOGIN: '/api/auth/google',
        REGISTER: '/api/auth/register',
        LOGOUT: '/api/auth/logout',
        LOGOUT_ALL: '/api/auth/logout-all',
        REFRESH: '/api/auth/refresh',
        ME: '/api/auth/me',
        SELECT_COMPANY: '/api/auth/select-company',
        IMPERSONATE: (userId) => `/api/auth/impersonate/${userId}`,
        FORGOT_PASSWORD: '/api/auth/forgot-password',
        RESET_PASSWORD: '/api/auth/reset-password',
        CHANGE_PASSWORD: '/api/auth/change-password',
        VERIFY_2FA: '/api/auth/verify-2fa',
        ACTIVATE: '/api/auth/activate',
    },


    // Accounts (Admin user management — merged into UsersController)
    ACCOUNTS: {
        LIST: '/api/users',
        BY_ID: (id) => `/api/users/${id}`,
        SEARCH: '/api/users/search',
        UPDATE: (id) => `/api/users/${id}`,
        DELETE: (id) => `/api/users/${id}`,
        CHANGE_PASSWORD: (id) => `/api/users/${id}/password`,
        TOGGLE_STATUS: (id) => `/api/users/${id}/status`,
        UPDATE_ROLE: (id) => `/api/users/${id}/role`,
        UPDATE_SYSTEM_ADMIN: (id) => `/api/users/${id}/system-admin`,
        BY_ROLE: (role) => `/api/users/role/${role}`,
        ACTIVE: '/api/users/active',
        ONLINE: '/api/users/online',
        COUNT_BY_ROLE: (role) => `/api/users/count/role/${role}`,
        COUNT_ONLINE: '/api/users/count/online',
    },

    // System Admin (God Mode)
    SYSADMIN: {
        USER_TOGGLE_STATUS: (id) => `/api/sysadmin/users/${id}/toggle-status`,
        USER_RESET_PASSWORD: (id) => `/api/sysadmin/users/${id}/reset-password`,
        COMPANY_DETAILS: (id) => `/api/sysadmin/companies/${id}`,
        COMPANY_PLAN: (id) => `/api/sysadmin/companies/${id}/plan`,
        COMPANY_STATUS: (id) => `/api/sysadmin/companies/${id}/status`,
        COMPANY_DELETE: (id) => `/api/sysadmin/companies/${id}`,
        COMPANY_FEATURES: (id) => `/api/sysadmin/companies/${id}/features`,
        COMPANY_SETTINGS: (id) => `/api/sysadmin/companies/${id}/settings`,
        SETTINGS: '/api/sysadmin/settings',
        ANALYTICS: {
            STATS: '/api/sysadmin/analytics/stats',
            GROWTH: '/api/sysadmin/analytics/growth',
        },
        TENANTS: {
            USERS: (companyId) => `/api/sysadmin/tenants/${companyId}/users`,
            PROJECTS: (companyId) => `/api/sysadmin/tenants/${companyId}/projects`,
        },
    },

    // Companies
    COMPANIES: {
        LIST: '/api/companies/my',
        BY_ID: (id) => `/api/companies/${id}`,
        CREATE: '/api/companies',
        UPDATE: (id) => `/api/companies/${id}`,
        SETTINGS: (id) => `/api/companies/${id}/settings`,
        REVIEW_SETTINGS: (id) => `/api/companies/${id}/settings/review`,

        // Members
        MEMBERS: (companyId) => `/api/companies/${companyId}/members`,
        MEMBER_REMOVE: (companyId, userId) => `/api/companies/${companyId}/members/${userId}`,
        MEMBER_PERMISSIONS: (companyId, userId) => `/api/companies/${companyId}/members/${userId}/permissions`,
        MEMBER_PERMISSIONS_BATCH: (companyId, userId) => `/api/companies/${companyId}/members/${userId}/permissions/batch`,
        MEMBER_ROLE: (companyId, userId) => `/api/companies/${companyId}/members/${userId}/role`,
    },



    // Invites
    INVITES: {
        SEND: '/api/company/invite',  // POST - invites user to company
        PENDING: '/api/invites/pending',
        ACCEPT: '/api/invites/accept',
        CANCEL: (id) => `/api/invites/${id}`,
    },

    // Workspace Join Requests
    WORKSPACE_JOIN: {
        REQUEST: '/api/workspaces/join',                                          // POST - xin gia nhập
        MY_REQUESTS: '/api/workspaces/join/my-requests',                          // GET - trạng thái yêu cầu của mình
        PENDING: (companyId) => `/api/workspaces/${companyId}/join-requests`,     // GET - admin xem
        APPROVE: (requestId) => `/api/workspaces/join-requests/${requestId}/approve`, // POST
        REJECT: (requestId) => `/api/workspaces/join-requests/${requestId}/reject`,   // POST
    },


    // Users
    USERS: {
        LIST: '/api/users',
        BY_ID: (id) => `/api/users/${id}`,
        SEARCH: '/api/users/search',
        ONLINE: '/api/users/online',
        ACTIVE: '/api/users/active',
    },

    // Profile
    PROFILE: {
        UPDATE: '/api/profile',
        UPLOAD_AVATAR: '/api/profile/avatar',
        CHANGE_PASSWORD: '/api/profile/change-password',
        SET_ONLINE: '/api/profile/online',
        SET_OFFLINE: '/api/profile/offline',
        UPDATE_FCM: '/api/profile/fcm-token',
        SESSIONS: '/api/profile/sessions',
        REVOKE_SESSION: (sessionId) => `/api/profile/sessions/${sessionId}`,
        NOTIFICATION_SETTINGS: '/api/profile/notification-settings',
        DELETE_ACCOUNT: '/api/profile',
        TWO_FACTOR_SETUP: '/api/profile/2fa/setup',
        TWO_FACTOR_VERIFY: '/api/profile/2fa/verify',
        TWO_FACTOR_DISABLE: '/api/profile/2fa',
    },

    // Employees
    EMPLOYEES: {
        LIST: '/api/employees',
        PAGE: '/api/employees/page',
        CREATE: '/api/employees',
        BY_ID: (id) => `/api/employees/${id}`,
        UPDATE: (id) => `/api/employees/${id}`,
        DELETE: (id) => `/api/employees/${id}`,
        SEARCH: '/api/employees/search',
        BY_STATUS: (status) => `/api/employees/status/${status}`,
        BY_USER: (userId) => `/api/employees/user/${userId}`,
        ME: '/api/employees/me',
    },

    // Export to Excel
    EXPORT: {
        EMPLOYEES: '/api/export/employees/excel',
        SALARY: '/api/export/salary/excel',
        LEAVES: '/api/export/leaves/excel',
        REVIEWS: '/api/export/reviews/excel',
        ATTENDANCE: '/api/export/attendance/excel',
        ISSUES: (projectId) => `/api/export/projects/${projectId}/issues/excel`,
    },

    // Import from Excel
    IMPORT: {
        EMPLOYEES: '/api/import/employees/excel',
        LEAVES: '/api/import/leaves/excel',
        REVIEWS: '/api/import/reviews/excel',
        ATTENDANCE: '/api/import/attendance/excel',
        ISSUES: '/api/import/issues/excel',
    },

    // Template download (blank Excel files with headers)
    TEMPLATE: {
        EMPLOYEES: '/api/templates/employees',
        LEAVES: '/api/templates/leaves',
        REVIEWS: '/api/templates/reviews',
        ATTENDANCE: '/api/templates/attendance',
        ISSUES: '/api/templates/issues',
    },

    // Leave Requests
    LEAVE_REQUESTS: {
        LIST: '/api/leave-requests',
        MY_REQUESTS: '/api/leave-requests',
        ME: '/api/leave-requests/me',
        MY_BALANCE: '/api/leave-requests/me/balance',
        BY_ID: (id) => `/api/leave-requests/${id}`,
        BY_EMPLOYEE: (empId) => `/api/leave-requests/employee/${empId}`,
        DATE_RANGE: '/api/leave-requests/date-range',
        PENDING: '/api/leave-requests/pending',
        APPROVED: '/api/leave-requests/approved',
        REJECTED: '/api/leave-requests/rejected',
        APPROVE: (id) => `/api/leave-requests/${id}/approve`,
        REJECT: (id) => `/api/leave-requests/${id}/reject`,
        TEAM_CALENDAR: '/api/leave-requests/team-calendar',
        CREATE: '/api/leave-requests',
        EMPLOYEE_TOTAL_DAYS: (empId) => `/api/leave-requests/employee/${empId}/total-days`,
        EMPLOYEE_IS_ON_LEAVE: (empId) => `/api/leave-requests/employee/${empId}/is-on-leave`,
    },

    // Salaries
    SALARIES: {
        LIST: '/api/salaries',
        BY_ID: (id) => `/api/salaries/${id}`,
        BY_EMPLOYEE: (empId) => `/api/salaries/employee/${empId}`,
        BY_PERIOD: '/api/salaries/period',
        BY_STATUS: (status) => `/api/salaries/status/${status}`,
        PAY: (id) => `/api/salaries/${id}/mark-paid`,
    },

    // Contracts
    CONTRACTS: {
        LIST: '/api/contracts',
        CREATE: '/api/contracts',
        BY_ID: (id) => `/api/contracts/${id}`,
        UPDATE: (id) => `/api/contracts/${id}`,
        DELETE: (id) => `/api/contracts/${id}`,
        BY_EMPLOYEE: (empId) => `/api/contracts/employee/${empId}`,
        EXPIRING: '/api/contracts/expiring',
    },

    // Reviews (Performance Evaluations)
    REVIEWS: {
        LIST: '/api/reviews',
        LIST_PAGE: '/api/reviews/page',
        CREATE: '/api/reviews',
        BY_ID: (id) => `/api/reviews/${id}`,
        UPDATE: (id) => `/api/reviews/${id}`,
        DELETE: (id) => `/api/reviews/${id}`,
        BY_EMPLOYEE: (empId) => `/api/reviews/employee/${empId}`,
        BY_PROJECT: (projectId) => `/api/reviews/project/${projectId}`,
        PENDING: '/api/reviews/pending',
        SUBMIT: (id) => `/api/reviews/${id}/submit`,
        APPROVE: (id) => `/api/reviews/${id}/approve`,
        REJECT: (id) => `/api/reviews/${id}/reject`,
        QUICK_SCORE: (issueId) => `/api/reviews/quick-score/${issueId}`,
        BULK_CREATE: '/api/reviews/bulk',
        NEEDING_REVIEW: '/api/reviews/needing-review',
    },

    // OKR (Objectives and Key Results)
    OKR: {
        LIST: '/api/okrs',
        CREATE: '/api/okrs',
        BY_ID: (id) => `/api/okrs/${id}`,
        UPDATE: (id) => `/api/okrs/${id}`,
        DELETE: (id) => `/api/okrs/${id}`,
        MY: '/api/okrs/my',
        DEPARTMENT: (deptId) => `/api/okrs/department/${deptId}`,
    },

    // Onboarding
    ONBOARDING: {
        TEMPLATES: '/api/onboarding/templates',
        INSTANCES: '/api/onboarding/instances',
        CREATE_INSTANCE: '/api/onboarding/instances',
        UPDATE_PROGRESS: (id) => `/api/onboarding/instances/${id}/progress`,
        TASKS: (instanceId) => `/api/onboarding/instances/${instanceId}/tasks`,
    },

    // Resource Planning
    RESOURCE_PLANNING: {
        ALLOCATIONS: '/api/resources/allocations',
        BY_PROJECT: (projectId) => `/api/resources/project/${projectId}`,
        BY_EMPLOYEE: (empId) => `/api/resources/employee/${empId}`,
        UPDATE: (id) => `/api/resources/allocations/${id}`,
    },

    // Dashboard
    DASHBOARD: {
        STATS: '/api/dashboard/stats',
        MONTHLY: '/api/dashboard/monthly',
    },

    // HR Dashboard (matches BE DashboardController at /api/dashboard)
    HR_DASHBOARD: {
        OVERVIEW: '/api/dashboard/overview',
        STATS: '/api/dashboard/stats',
        MONTHLY: '/api/dashboard/monthly',
        SALARY_BY_MONTH: '/api/dashboard/salary-by-month',
        EMPLOYEE_BY_AGE: '/api/dashboard/employee-by-age',
        EMPLOYEE_BY_GENDER: '/api/dashboard/employee-by-gender',
    },
    // Projects
    PROJECTS: {
        LIST: '/api/projects',
        MY_PROJECTS: '/api/projects/my-projects',
        BY_ID: (id) => `/api/projects/${id}`,
        MEMBERS: (id) => `/api/projects/${id}/members`,
        ADD_MEMBER: (id) => `/api/projects/${id}/members`,
        REMOVE_MEMBER: (id, userId) => `/api/projects/${id}/members/${userId}`,
        PHASES: (id) => `/api/projects/${id}/phases`,
        GANTT: (id) => `/api/projects/${id}/gantt`,
        GOALS: (id) => `/api/projects/${id}/goals`,
        GOAL_TOGGLE: (id, goalId) => `/api/projects/${id}/goals/${goalId}/toggle`,
        GOAL_DELETE: (id, goalId) => `/api/projects/${id}/goals/${goalId}`,
        GOAL_CREATE: (id) => `/api/projects/${id}/goals`,
        RESOURCE_OVERVIEW: '/api/projects/resource-overview',
        UPDATE_MEMBER_INFO: (projectId, memberId) => `/api/projects/${projectId}/members/${memberId}/info`,
    },

    // Project Costs
    PROJECT_COSTS: {
        BY_PROJECT: (projectId) => `/api/projects/costs/${projectId}`,
        CREATE_EXPENSE: '/api/projects/costs/expenses',
    },
    // Project Dashboard & Export
    PROJECT_DASHBOARD: {
        STATS: (projectId) => `/api/project-dashboard/project/${projectId}/stats`,
        BURNDOWN: (sprintId) => `/api/project-dashboard/sprint/${sprintId}/burndown`,
        MY_PROJECTS_STATS: '/api/project-dashboard/my-projects',
    },

    PROJECT_EXPORT: {
        ISSUES_CSV: (projectId) => `/api/project-export/${projectId}/issues/csv`,
        GANTT_CSV: (projectId) => `/api/project-export/${projectId}/gantt/csv`,
    },

    // Project Phases
    PHASES: {
        BY_PROJECT: (projectId) => `/api/projects/${projectId}/phases`,
        BY_ID: (phaseId) => `/api/projects/phases/${phaseId}`,
    },


    // Sprints
    SPRINTS: {
        CREATE: '/api/sprints',
        BY_ID: (id) => `/api/sprints/${id}`,
        BY_PROJECT: (projectId) => `/api/sprints/project/${projectId}`,
        START: (id) => `/api/sprints/${id}/start`,
        COMPLETE: (id) => `/api/sprints/${id}/complete`,
        ADD_ISSUE: (sprintId, issueId) => `/api/sprints/${sprintId}/issues/${issueId}`,
        REMOVE_ISSUE: (sprintId, issueId) => `/api/sprints/${sprintId}/issues/${issueId}`,
    },

    // Issues
    ISSUES: {
        CREATE: '/api/issues',
        BY_ID: (id) => `/api/issues/${id}`,
        BY_PROJECT: (projectId) => `/api/issues/project/${projectId}`,
        BACKLOG: (projectId) => `/api/issues/project/${projectId}/backlog`,
        BACKLOG_INCLUDE_PLANNING: (projectId) => `/api/issues/project/${projectId}/backlog-including-planning`,
        BOARD: (projectId) => `/api/issues/project/${projectId}/board`,
        BY_SPRINT: (sprintId) => `/api/issues/sprint/${sprintId}`,
        MY_ISSUES: '/api/issues/my-issues',
        MY_REPORTED: '/api/issues/my-reported',
        UPDATE_STATUS_TO: (id, statusId) => `/api/issues/${id}/status/${statusId}`,
        ASSIGN: (id, assigneeId) => assigneeId == null || assigneeId === ''
            ? `/api/issues/${id}/assign`
            : `/api/issues/${id}/assign?assigneeId=${encodeURIComponent(assigneeId)}`,
    },

    // Issue Statuses (Kanban columns)
    ISSUE_STATUSES: {
        LIST: '/api/issue-statuses',
        CREATE: '/api/issue-statuses',
        UPDATE: (id) => `/api/issue-statuses/${id}`,
        DELETE: (id) => `/api/issue-statuses/${id}`,
        REORDER: '/api/issue-statuses/reorder',
    },

    // Comments
    COMMENTS: {
        BY_ISSUE: (issueId) => `/api/comments/issue/${issueId}`,
        BY_PROJECT: (projectId) => `/api/comments/project/${projectId}`,
        CREATE: '/api/comments',
        UPDATE: (id) => `/api/comments/${id}`,
        DELETE: (id) => `/api/comments/${id}`,
    },

    // Activities
    ACTIVITIES: {
        BY_ISSUE: (issueId) => `/api/activities/issue/${issueId}`,
        BY_PROJECT: (projectId) => `/api/activities/project/${projectId}`,
        MY_ACTIVITIES: (projectId) => `/api/activities/project/${projectId}/my`,
    },




    // Notifications (matches BE NotificationController at /api/notifications)
    NOTIFICATIONS: {
        LIST: '/api/notifications',
        UNREAD_COUNT: '/api/notifications/unread-count',
        MARK_READ: (id) => `/api/notifications/${id}/read`,
        MARK_ALL_READ: '/api/notifications/mark-all-read',
        DELETE: (id) => `/api/notifications/${id}`,
    },

    // Audit
    AUDIT: {
        LIST: '/api/audit-logs',
        BY_ACTOR: (actorId) => `/api/audit-logs/actor/${actorId}`,
        BY_TARGET: (targetId) => `/api/audit-logs/target/${targetId}`,
        CRITICAL: '/api/audit-logs/critical',
        STORAGE: '/api/audit-logs/storage',
    },

    // Time Tracking (NEW)
    TIMELOGS: {
        CREATE: '/api/timelogs',
        BY_ISSUE: (issueId) => `/api/timelogs/issue/${issueId}`,
        TOTAL_BY_ISSUE: (issueId) => `/api/timelogs/issue/${issueId}/total`,
        MY_LOGS: '/api/timelogs/my',
        MY_SUMMARY: '/api/timelogs/summary/my',
        PROJECT_SUMMARY: (projectId) => `/api/timelogs/project/${projectId}/summary`,
        PROJECT_TIMELOGS: (projectId) => `/api/timelogs/project/${projectId}`,
        UPDATE: (id) => `/api/timelogs/${id}`,
        DELETE: (id) => `/api/timelogs/${id}`,
    },

    // Analytics (NEW)
    ANALYTICS: {
        BURNDOWN: (projectId) => `/api/analytics/projects/${projectId}/burndown`,
        VELOCITY: (projectId) => `/api/analytics/projects/${projectId}/velocity`,
        STATUS: (projectId) => `/api/analytics/projects/${projectId}/status`,
        WORKLOAD: (projectId) => `/api/analytics/projects/${projectId}/workload`,
    },

    // Calendar (NEW)
    CALENDAR: {
        EVENTS: '/api/calendar/events',
        EVENT_BY_ID: (id) => `/api/calendar/events/${id}`,
        RESPOND: (id) => `/api/calendar/events/${id}/respond`,
    },



    // Custom Fields
    CUSTOM_FIELDS: {
        BY_PROJECT: (projectId) => `/api/projects/${projectId}/custom-fields`,
        CREATE: (projectId) => `/api/projects/${projectId}/custom-fields`,
        // Values handled within Issue update or specific endpoint
        ISSUE_VALUES: (issueId) => `/api/issues/${issueId}/custom-fields`,
    },

    // Performance (HR individual performance — matches BE PerformanceController)
    PERFORMANCE: {
        MY_STATS: '/api/hr/performance/my-stats',
        DASHBOARD: (period) => `/api/hr/performance/dashboard${period ? `?period=${period}` : ''}`,
        EMPLOYEE_SUMMARY: (employeeId) => `/api/hr/performance/employees/${employeeId}/summary`,
        COMPARISON_ME: '/api/hr/performance-comparison/me',
        COMPARISON_BY_PROJECT: (projectId) => `/api/hr/performance-comparison/projects/${projectId}`,
    },

    // HR Dashboard (BE HRPerformanceController)
    HR_PERFORMANCE: {
        DASHBOARD: '/api/hr/performance/dashboard',
        EMPLOYEE_SUMMARY: (employeeId) => `/api/hr/performance/employees/${employeeId}/summary`,
    },

    // Salary Proposals (PENDING: requires backend ProposalsController)
    HR_PROPOSALS: '/api/hr/proposals',

    // Storage (Google Drive Integration)
    STORAGE: {
        OAUTH_AUTHORIZE: '/api/storage/oauth2/authorize',
        STATUS: '/api/storage/status',
        DISCONNECT: '/api/storage/disconnect',
        UPLOAD_PROJECT_FILE: (projectId) => `/api/storage/projects/${projectId}/upload`,
        PROJECT_FILES: (projectId) => `/api/storage/projects/${projectId}/files`,
        PROJECT_FOLDERS: (projectId) => `/api/storage/projects/${projectId}/folders`,
        PROJECT_FOLDER_TREE: (projectId) => `/api/storage/projects/${projectId}/folder-tree`,
        UPLOAD_ISSUE_FILE: (issueId) => `/api/storage/issues/${issueId}/upload`,
        ISSUE_FILES: (issueId) => `/api/storage/issues/${issueId}/files`,
        DOWNLOAD_FILE: (fileId) => `/api/storage/files/${fileId}/download`,
        FILE_METADATA: (fileId) => `/api/storage/files/${fileId}/metadata`,
        DELETE_FILE: (fileId) => `/api/storage/files/${fileId}`,
    },
};
