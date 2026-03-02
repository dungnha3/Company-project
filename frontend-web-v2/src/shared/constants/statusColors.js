export const STATUS_COLORS = {
    TODO: 'bg-gray-100 text-gray-700',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
    IN_REVIEW: 'bg-purple-100 text-purple-700',
    DONE: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
    ON_HOLD: 'bg-yellow-100 text-yellow-700',
};

// === SPRINT STATUSES ===
export const SPRINT_STATUS_COLORS = {
    PLANNING: 'bg-gray-100 text-gray-700',
    ACTIVE: 'bg-indigo-100 text-indigo-700',
    COMPLETED: 'bg-green-100 text-green-700',
};

// === PHASE STATUSES ===
export const PHASE_STATUS_COLORS = {
    NOT_STARTED: 'bg-gray-100 text-gray-700',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
    COMPLETED: 'bg-green-100 text-green-700',
};

// === OKR STATUSES ===
export const OKR_STATUS_COLORS = {
    NOT_STARTED: 'bg-gray-100 text-gray-700',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
    ON_TRACK: 'bg-green-100 text-green-700',
    AT_RISK: 'bg-yellow-100 text-yellow-700',
    BEHIND: 'bg-red-100 text-red-700',
};

// === LEAVE TYPES ===
export const LEAVE_TYPE_COLORS = {
    ANNUAL: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },
    SICK: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
    PERSONAL: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' },
    MATERNITY: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-100' },
    OTHER: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-100' },
};

// === REVIEW PERIODS ===
export const REVIEW_PERIOD_COLORS = {
    MONTHLY: { bg: 'bg-green-50', text: 'text-green-700' },
    QUARTERLY: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
    ANNUAL: { bg: 'bg-purple-50', text: 'text-purple-700' },
};

// === REVIEW GRADES ===
export const REVIEW_GRADE_COLORS = {
    A: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    B: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
    C: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    D: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

// === PRIORITIES ===
export const PRIORITY_COLORS = {
    LOW: 'text-gray-500',
    MEDIUM: 'text-indigo-500',
    HIGH: 'text-orange-500',
    CRITICAL: 'text-red-500',
};

export const PRIORITY_ICONS = {
    LOW: 'fa-arrow-down',
    MEDIUM: 'fa-minus',
    HIGH: 'fa-arrow-up',
    CRITICAL: 'fa-fire',
};

// === PROJECT STATUSES ===
export const PROJECT_STATUS_COLORS = {
    PLANNING: { color: 'text-indigo-700 bg-indigo-50 border-indigo-100', label: 'Planning' },
    IN_PROGRESS: { color: 'text-indigo-700 bg-indigo-50 border-indigo-200', label: 'In Progress' },
    COMPLETED: { color: 'text-green-700 bg-green-50 border-green-100', label: 'Completed' },
    ON_HOLD: { color: 'text-yellow-700 bg-yellow-50 border-yellow-100', label: 'On Hold' },
    CANCELLED: { color: 'text-red-700 bg-red-50 border-red-100', label: 'Cancelled' },
};

// === PLAN BADGES (SaaS) ===
export const PLAN_COLORS = {
    FREE: 'bg-gray-100 text-gray-700',
    STARTER: 'bg-indigo-100 text-indigo-700',
    BUSINESS: 'bg-purple-100 text-purple-700',
    ENTERPRISE: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white',
};

// === PROGRESS BAR COLOR HELPER ===
export function getProgressColor(percentage) {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 70) return 'bg-indigo-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
}

export function getProgressTextColor(percentage) {
    if (percentage >= 100) return 'text-green-600';
    if (percentage >= 70) return 'text-indigo-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-500';
}

// === SCORE COLOR HELPER ===
export function getScoreColor(score) {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-indigo-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-500';
}

export function getScoreBgColor(score) {
    if (score >= 8) return 'bg-green-100';
    if (score >= 6) return 'bg-indigo-100';
    if (score >= 4) return 'bg-yellow-100';
    return 'bg-red-100';
}
