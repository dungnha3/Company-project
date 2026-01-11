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
    },

    // Admin (SaaS)
    ADMIN: {
        COMPANIES: '/api/companies/admin/all',
        COMPANY_DETAILS: (id) => `/api/companies/admin/${id}`,
        USERS: '/api/users/admin', // Assuming this exists or will mock
    },

    // Companies
    COMPANIES: {
        LIST: '/api/companies',
        BY_ID: (id) => `/api/companies/${id}`,
        CREATE: '/api/companies',
        UPDATE: (id) => `/api/companies/${id}`,
        DELETE: (id) => `/api/companies/${id}`,
        SETTINGS: (id) => `/api/companies/${id}/settings`,
        QUOTA: '/api/companies/quota', // GET - current quota usage
    },

    // Workspaces (NEW - Dual Workspace Model)
    WORKSPACES: {
        LIST: '/api/workspaces',
        PERSONAL: '/api/workspaces/personal',
        ENSURE_PERSONAL: '/api/workspaces/personal/ensure',
    },

    // Invites
    INVITES: {
        SEND: '/api/company/invite',  // POST - invites user to company
        PENDING: '/api/invites/pending',
        ACCEPT: '/api/invites/accept',
        CANCEL: (id) => `/api/invites/${id}`,
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
        CHANGE_PASSWORD: '/api/profile/change-password',
        SET_ONLINE: '/api/profile/online',
        SET_OFFLINE: '/api/profile/offline',
        UPDATE_FCM: '/api/profile/fcm-token',
    },

    // Employees
    EMPLOYEES: {
        LIST: '/api/employees',
        CREATE: '/api/employees',
        BY_ID: (id) => `/api/employees/${id}`,
        UPDATE: (id) => `/api/employees/${id}`,
        DELETE: (id) => `/api/employees/${id}`,
        SEARCH: '/api/employees/search',
        BY_DEPARTMENT: (deptId) => `/api/employees/department/${deptId}`,
        BY_POSITION: (posId) => `/api/employees/position/${posId}`,
        BY_STATUS: (status) => `/api/employees/status/${status}`,
    },

    // Departments
    DEPARTMENTS: {
        LIST: '/api/departments',
        CREATE: '/api/departments',
        BY_ID: (id) => `/api/departments/${id}`,
        UPDATE: (id) => `/api/departments/${id}`,
        DELETE: (id) => `/api/departments/${id}`,
    },

    // Positions
    POSITIONS: {
        LIST: '/api/positions',
        CREATE: '/api/positions',
        BY_ID: (id) => `/api/positions/${id}`,
        UPDATE: (id) => `/api/positions/${id}`,
        DELETE: (id) => `/api/positions/${id}`,
    },

    // Attendance
    ATTENDANCE: {
        CHECK_IN: '/api/attendance/check-in',
        CHECK_OUT: '/api/attendance/check-out',
        TODAY: '/api/attendance/today',
        MY_HISTORY: '/api/attendance/my-history',
        LIST: '/api/attendance',
        BY_EMPLOYEE: (empId) => `/api/attendance/employee/${empId}`,
        DATE_RANGE: '/api/attendance/date-range',
        REPORT: '/api/attendance/report',
    },

    // Export to Excel
    EXPORT: {
        EMPLOYEES: '/api/export/employees/excel',
        ATTENDANCE: '/api/export/attendance/excel', // params: month, year
        SALARY: '/api/export/salary/excel', // params: month, year
        LEAVES: '/api/export/leaves/excel', // params: startDate, endDate
    },

    // Leave Requests
    LEAVE_REQUESTS: {
        LIST: '/api/leave-requests',
        BY_ID: (id) => `/api/leave-requests/${id}`,
        BY_EMPLOYEE: (empId) => `/api/leave-requests/employee/${empId}`,
        DATE_RANGE: '/api/leave-requests/date-range',
        PENDING: '/api/leave-requests/pending',
        APPROVED: '/api/leave-requests/approved',
        REJECTED: '/api/leave-requests/rejected',
        APPROVE: (id) => `/api/leave-requests/${id}/approve`,
        REJECT: (id) => `/api/leave-requests/${id}/reject`,
    },

    // Salaries
    SALARIES: {
        LIST: '/api/salaries',
        BY_ID: (id) => `/api/salaries/${id}`,
        BY_EMPLOYEE: (empId) => `/api/salaries/employee/${empId}`,
        BY_PERIOD: '/api/salaries/period',
        BY_STATUS: (status) => `/api/salaries/status/${status}`,
        GENERATE: '/api/salaries/generate',
        PAY: (id) => `/api/salaries/${id}/pay`,
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
        PENDING: '/api/reviews/pending',
        SUBMIT: (id) => `/api/reviews/${id}/submit`,
        APPROVE: (id) => `/api/reviews/${id}/approve`,
        REJECT: (id) => `/api/reviews/${id}/reject`,
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
        ATTENDANCE_BY_DEPT: '/api/dashboard/attendance-by-department',
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
        LIST: '/api/sprints',
        BY_ID: (id) => `/api/sprints/${id}`,
        BY_PROJECT: (projectId) => `/api/sprints/project/${projectId}`,
        START: (id) => `/api/sprints/${id}/start`,
        COMPLETE: (id) => `/api/sprints/${id}/complete`,
        ADD_ISSUE: (sprintId, issueId) => `/api/sprints/${sprintId}/issues/${issueId}`,
        REMOVE_ISSUE: (sprintId, issueId) => `/api/sprints/${sprintId}/issues/${issueId}`,
    },

    // Issues
    ISSUES: {
        BY_ID: (id) => `/api/issues/${id}`,
        BY_PROJECT: (projectId) => `/api/issues/project/${projectId}`,
        BACKLOG: (projectId) => `/api/issues/project/${projectId}/backlog`,
        BY_SPRINT: (sprintId) => `/api/issues/sprint/${sprintId}`,
        MY_ISSUES: '/api/issues/my-issues',
        MY_REPORTED: '/api/issues/my-reported',
        UPDATE_STATUS: (id) => `/api/issues/${id}/status`,
        ASSIGN: (id) => `/api/issues/${id}/assign`,
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


    // Storage
    STORAGE: {
        LIST: '/api/storage/files',
        FILES: '/api/storage/files',
        FILE_BY_ID: (id) => `/api/storage/files/${id}`,
        DOWNLOAD: (id) => `/api/storage/files/${id}/download`,
        MY_FILES: '/api/storage/files/my-files',
        UPLOAD: '/api/storage/files/upload',
        DELETE: (id) => `/api/storage/files/${id}`,
        // Folders
        FOLDERS: '/api/storage/folders',
        FOLDER_BY_ID: (id) => `/api/storage/folders/${id}`,
        CREATE_FOLDER: '/api/storage/folders',
        MY_FOLDERS: '/api/storage/folders/my-folders',
        // Sharing
        SHARE: (id) => `/api/storage/files/${id}/share`,
        SHARED_WITH_ME: '/api/storage/shared-with-me',
        GENERATE_LINK: (id) => `/api/storage/files/${id}/public-link`,
        // Stats
        STATS: '/api/storage/stats',
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
    },

    // Time Tracking (NEW)
    TIMELOGS: {
        CREATE: '/api/timelogs',
        BY_ISSUE: (issueId) => `/api/timelogs/issue/${issueId}`,
        TOTAL_BY_ISSUE: (issueId) => `/api/timelogs/issue/${issueId}/total`,
        MY_LOGS: '/api/timelogs/my',
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

    // Automations (NEW)
    AUTOMATIONS: {
        CREATE: '/api/automations',
        BY_PROJECT: (projectId) => `/api/automations/project/${projectId}`,
        BY_ID: (id) => `/api/automations/${id}`,
        TOGGLE: (id) => `/api/automations/${id}/toggle`,
        DELETE: (id) => `/api/automations/${id}`,
        LOGS: (id) => `/api/automations/${id}/logs`,
    },

    // Chat (merged from duplicates)
    CHAT: {
        // Rooms
        ROOMS: '/api/chat/rooms',
        CREATE_ROOM: '/api/chat/rooms',
        ROOM_BY_ID: (roomId) => `/api/chat/rooms/${roomId}`,
        DIRECT: (userId) => `/api/chat/rooms/direct/${userId}`,
        ROOM_MEMBERS: (roomId) => `/api/chat/rooms/${roomId}/members`,
        ADD_MEMBER: (roomId) => `/api/chat/rooms/${roomId}/members`,
        REMOVE_MEMBER: (roomId, userId) => `/api/chat/rooms/${roomId}/members/${userId}`,
        LEAVE_ROOM: (roomId) => `/api/chat/rooms/${roomId}/leave`,

        // Messages
        MESSAGES: (roomId) => `/api/chat/rooms/${roomId}/messages`,
        MESSAGE_BY_ID: (msgId) => `/api/chat/messages/${msgId}`,
        EDIT_MESSAGE: (msgId) => `/api/chat/messages/${msgId}`,
        DELETE_MESSAGE: (msgId) => `/api/chat/messages/${msgId}`,
        PIN_MESSAGE: (msgId) => `/api/chat/messages/${msgId}/pin`,
        PINNED_MESSAGES: (roomId) => `/api/chat/rooms/${roomId}/pinned`,

        // Reactions
        ADD_REACTION: (msgId) => `/api/chat/messages/${msgId}/reactions`,
        REMOVE_REACTION: (msgId, reactionId) => `/api/chat/messages/${msgId}/reactions/${reactionId}`,

        // Read Status
        MARK_READ: (roomId) => `/api/chat/rooms/${roomId}/read`,

        // Search
        SEARCH: (roomId) => `/api/chat/rooms/${roomId}/search`,

        // Files
        UPLOAD_FILE: (roomId) => `/api/chat/rooms/${roomId}/files`,

        // Typing
        TYPING: (roomId) => `/api/chat/rooms/${roomId}/typing`,
    },

};
