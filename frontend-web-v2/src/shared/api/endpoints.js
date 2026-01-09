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
        REFRESH: '/api/auth/refresh-token',
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
    },

    // Invites
    INVITES: {
        SEND: '/api/invites',
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

    // Reviews
    REVIEWS: {
        LIST: '/api/reviews',
        BY_ID: (id) => `/api/reviews/${id}`,
        BY_EMPLOYEE: (empId) => `/api/reviews/employee/${empId}`,
    },

    // Dashboard
    DASHBOARD: {
        STATS: '/api/dashboard/stats',
        MONTHLY: '/api/dashboard/monthly',
    },

    // Chat
    CHAT: {
        ROOMS: '/api/chat-rooms',
        MESSAGES: (roomId) => `/api/chat-rooms/${roomId}/messages`,
        CREATE_ROOM: '/api/chat-rooms',
        MARK_READ: (roomId) => `/api/chat-rooms/${roomId}/read`,
    },

    // Notifications
    NOTIFICATIONS: {
        LIST: '/api/notifications',
        MARK_READ: (id) => `/api/notifications/${id}/read`,
        READ_ALL: '/api/notifications/read-all',
        UNREAD_COUNT: '/api/notifications/unread-count',
    },

    // File Storage
    STORAGE: {
        UPLOAD: '/api/files/upload',
        LIST: '/api/files', // Assuming list
        DOWNLOAD: (id) => `/api/files/${id}`,
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

    // Sprints
    SPRINTS: {
        BY_ID: (id) => `/api/sprints/${id}`,
        BY_PROJECT: (projectId) => `/api/sprints/project/${projectId}`,
        START: (id) => `/api/sprints/${id}/start`,
        COMPLETE: (id) => `/api/sprints/${id}/complete`,
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

    // Chat
    CHAT: {
        ROOMS: '/api/chat/rooms',
        ROOM_BY_ID: (id) => `/api/chat/rooms/${id}`,
        DIRECT: (userId) => `/api/chat/rooms/direct/${userId}`,
        ROOM_MEMBERS: (id) => `/api/chat/rooms/${id}/members`,
        MESSAGES: (roomId) => `/api/chat/messages/room/${roomId}`,
        SEND_MESSAGE: '/api/chat/messages',
        EDIT_MESSAGE: (id) => `/api/chat/messages/${id}`,
        DELETE_MESSAGE: (id) => `/api/chat/messages/${id}`,
        REACT: (id) => `/api/chat/messages/${id}/react`,
    },

    // Storage
    STORAGE: {
        FILES: '/api/storage/files',
        FILE_BY_ID: (id) => `/api/storage/files/${id}`,
        DOWNLOAD: (id) => `/api/storage/files/${id}/download`,
        MY_FILES: '/api/storage/files/my-files',
        UPLOAD: '/api/storage/files/upload',
        FOLDERS: '/api/storage/folders',
        FOLDER_BY_ID: (id) => `/api/storage/folders/${id}`,
        MY_FOLDERS: '/api/storage/folders/my-folders',
        STATS: '/api/storage/stats',
    },

    // Notifications
    NOTIFICATIONS: {
        LIST: '/api/notifications',
        UNREAD: '/api/notifications/unread',
        COUNT: '/api/notifications/count',
        MARK_READ: (id) => `/api/notifications/${id}/read`,
        MARK_ALL_READ: '/api/notifications/read-all',
        DELETE: (id) => `/api/notifications/${id}`,
    },

    // Audit
    AUDIT: {
        LIST: '/api/audit-logs',
        BY_ACTOR: (actorId) => `/api/audit-logs/actor/${actorId}`,
        BY_TARGET: (targetId) => `/api/audit-logs/target/${targetId}`,
        CRITICAL: '/api/audit-logs/critical',
    },

};
