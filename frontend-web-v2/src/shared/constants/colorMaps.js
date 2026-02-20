/**
 * Semantic color maps — dùng bởi StatCard, MiniStat, và các components
 * nhận `color` prop dưới dạng string.
 */
export const SEMANTIC_COLORS = {
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
    green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
    red: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-200' },
    cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-200' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
    gold: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
};

// Accent color for toggle switches (NotificationsPage)
export const ACCENT_COLORS = {
    indigo: 'bg-indigo-500',
    violet: 'bg-violet-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
};

// File type → color mapping (StoragePage, PersonalStoragePage)
export const FILE_TYPE_COLORS = {
    image: 'bg-purple-100 text-purple-600',
    pdf: 'bg-red-100 text-red-600',
    word: 'bg-indigo-100 text-indigo-600',
    excel: 'bg-green-100 text-green-600',
    powerpoint: 'bg-orange-100 text-orange-600',
    video: 'bg-pink-100 text-pink-600',
    audio: 'bg-cyan-100 text-cyan-600',
    default: 'bg-gray-100 text-gray-600',
};

// Notification type → color mapping
export const NOTIFICATION_COLORS = {
    TASK_ASSIGNED: 'bg-indigo-100 text-indigo-600',
    LEAVE_APPROVED: 'bg-green-100 text-green-600',
    LEAVE_REJECTED: 'bg-red-100 text-red-600',
    MENTION: 'bg-purple-100 text-purple-600',
    ISSUE_UPDATED: 'bg-indigo-100 text-indigo-600',
    REVIEW_CREATED: 'bg-orange-100 text-orange-600',
    default: 'bg-gray-100 text-gray-600',
};

// Activity log action types
export const ACTIVITY_COLORS = {
    CREATE: 'indigo',
    UPDATE: 'yellow',
    DELETE: 'red',
    security: 'red',
    billing: 'green',
    default: 'indigo',
};
