import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocketStore } from '@shared/stores/websocketStore';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { useNavigate } from 'react-router-dom';
import { formatRelativeTime } from '@shared/utils/formatters';

// Notification types based on workspace
const COMPANY_NOTIFICATION_TYPES = [
    { key: 'all', label: 'Tất cả', icon: 'fa-bell' },
    { key: 'task', label: 'Công việc', icon: 'fa-list-check' },
    { key: 'leave', label: 'Nghỉ phép', icon: 'fa-calendar-check' },
    { key: 'mention', label: 'Mentions', icon: 'fa-at' },
    { key: 'system', label: 'Hệ thống', icon: 'fa-cog' },
];

const PERSONAL_NOTIFICATION_TYPES = [
    { key: 'all', label: 'Tất cả', icon: 'fa-bell' },
    { key: 'task', label: 'Tasks', icon: 'fa-list-check' },
    { key: 'invite', label: 'Lời mời', icon: 'fa-envelope' },
    { key: 'system', label: 'Hệ thống', icon: 'fa-cog' },
];

export default function NotificationsPage() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const { subscribe, unsubscribe } = useWebSocketStore();
    const { workspaceType } = useWorkspaceStore();
    const isPersonal = workspaceType === 'PERSONAL';

    const [activeTab, setActiveTab] = useState('all');
    const [showPreferences, setShowPreferences] = useState(false);

    const notificationTypes = isPersonal ? PERSONAL_NOTIFICATION_TYPES : COMPANY_NOTIFICATION_TYPES;

    // Fetch notifications
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.NOTIFICATIONS.LIST);
            const data = response.data;
            return Array.isArray(data) ? data : (data?.content || data?.notifications || []);
        },
    });

    // Filter notifications by type
    const filteredNotifications = notifications.filter(n => {
        if (activeTab === 'all') return true;

        if (isPersonal) {
            // Personal workspace filters
            if (activeTab === 'task') return ['PERSONAL_TASK_REMINDER', 'PERSONAL_TASK_DUE'].includes(n.type);
            if (activeTab === 'invite') return ['WORKSPACE_INVITE', 'INVITE_ACCEPTED'].includes(n.type);
            if (activeTab === 'system') return ['SYSTEM', 'PLAN_UPGRADED', 'QUOTA_WARNING'].includes(n.type);
        } else {
            // Company workspace filters
            if (activeTab === 'task') return ['TASK_ASSIGNED', 'TASK_COMPLETED', 'TASK_COMMENT', 'ISSUE_CREATED', 'ISSUE_UPDATED', 'ISSUE_ASSIGNED', 'ISSUE_OVERDUE'].includes(n.type);
            if (activeTab === 'leave') return ['LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_REQUEST'].includes(n.type);
            if (activeTab === 'mention') return n.type === 'MENTION';
            if (activeTab === 'system') return ['SYSTEM', 'PAYROLL_READY', 'ANNOUNCEMENT'].includes(n.type);
        }
        return true;
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Mutations
    const readAllMutation = useMutation({
        mutationFn: () => apiClient.put(ENDPOINTS.NOTIFICATIONS.READ_ALL),
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
            queryClient.invalidateQueries(['unread-count']);
            showToast('Đã đánh dấu tất cả là đã đọc', 'success');
        }
    });

    const markReadMutation = useMutation({
        mutationFn: (id) => apiClient.put(ENDPOINTS.NOTIFICATIONS.MARK_READ(id)),
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
            queryClient.invalidateQueries(['unread-count']);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => apiClient.delete(ENDPOINTS.NOTIFICATIONS.DELETE?.(id) || `/api/notifications/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
            showToast('Đã xóa thông báo', 'success');
        }
    });

    // Real-time subscription
    useEffect(() => {
        const topic = '/user/queue/notifications';
        subscribe(topic, (message) => {
            queryClient.invalidateQueries(['notifications']);
            queryClient.invalidateQueries(['unread-count']);
            showToast('Bạn có thông báo mới', 'info');
        });
        return () => unsubscribe(topic);
    }, []);

    const handleNotificationClick = (notification) => {
        if (!notification.isRead) {
            markReadMutation.mutate(notification.id);
        }

        // Navigate based on type and workspace
        const routes = isPersonal ? {
            'PERSONAL_TASK_REMINDER': '/app/me/tasks',
            'PERSONAL_TASK_DUE': '/app/me/tasks',
            'WORKSPACE_INVITE': '/app/dashboard', // Invites shown in dashboard
            'QUOTA_WARNING': '/app/company/billing',
        } : {
            'TASK_ASSIGNED': `/app/projects/${notification.referenceId}`,
            'LEAVE_APPROVED': '/app/hr/leave-requests',
            'LEAVE_REJECTED': '/app/hr/leave-requests',
            'PAYROLL_READY': '/app/hr/salaries',
            'MENTION': `/app/chat`,
            'ISSUE_CREATED': `/app/projects/${notification.referenceId}`,
            'ISSUE_UPDATED': `/app/projects/${notification.referenceId}`,
            'ISSUE_ASSIGNED': `/app/projects/${notification.referenceId}`,
        };

        if (routes[notification.type]) {
            navigate(routes[notification.type]);
        }
    };

    return (
        <div className={`p-6 max-w-4xl mx-auto space-y-6 ${isPersonal ? 'animate-fade-in' : ''}`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isPersonal ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gradient-to-br from-indigo-500 to-indigo-600'}`}>
                        <i className="fa-solid fa-bell text-white text-xl" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Thông báo</h1>
                        <p className="text-gray-500 text-sm">
                            {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Không có thông báo mới'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowPreferences(true)}
                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                    >
                        <i className="fa-solid fa-cog mr-2" />
                        Cài đặt
                    </button>
                    <button
                        onClick={() => readAllMutation.mutate()}
                        disabled={readAllMutation.isPending || unreadCount === 0}
                        className={`px-4 py-2.5 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors ${isPersonal
                            ? 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                    >
                        <i className="fa-solid fa-check-double mr-2" />
                        Đọc tất cả
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className={`flex gap-2 p-1.5 rounded-xl overflow-x-auto ${isPersonal ? 'bg-violet-50' : 'bg-gray-100'}`}>
                {notificationTypes.map(type => {
                    const count = type.key === 'all'
                        ? notifications.length
                        : filteredNotifications.length;

                    return (
                        <button
                            key={type.key}
                            onClick={() => setActiveTab(type.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === type.key
                                ? `bg-white shadow-sm ${isPersonal ? 'text-violet-600' : 'text-indigo-600'}`
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                }`}
                        >
                            <i className={`fa-solid ${type.icon}`} />
                            {type.label}
                            {count > 0 && type.key === activeTab && (
                                <span className={`px-1.5 py-0.5 rounded-full text-xs ${isPersonal ? 'bg-violet-100 text-violet-600' : 'bg-indigo-100 text-indigo-600'
                                    }`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-16">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isPersonal ? 'bg-violet-100' : 'bg-indigo-100'}`}>
                        <i className={`fa-solid fa-spinner fa-spin text-2xl ${isPersonal ? 'text-violet-500' : 'text-indigo-500'}`} />
                    </div>
                    <p className="text-gray-500">Đang tải thông báo...</p>
                </div>
            )}

            {/* Notification List */}
            {!isLoading && (
                <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {filteredNotifications.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isPersonal ? 'bg-violet-50' : 'bg-gray-50'}`}>
                                <i className={`fa-solid fa-bell-slash text-3xl ${isPersonal ? 'text-violet-300' : 'text-gray-300'}`} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800">Không có thông báo</h3>
                            <p className="text-gray-500 text-sm mt-1">
                                {isPersonal
                                    ? 'Bạn sẽ nhận thông báo về tasks và lời mời ở đây'
                                    : 'Bạn sẽ nhận thông báo khi có hoạt động mới'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filteredNotifications.map(notification => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onClick={() => handleNotificationClick(notification)}
                                    onDelete={() => deleteMutation.mutate(notification.id)}
                                    isPersonal={isPersonal}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Preferences Modal */}
            {showPreferences && (
                <NotificationPreferencesModal
                    onClose={() => setShowPreferences(false)}
                    isPersonal={isPersonal}
                />
            )}
        </div>
    );
}

function NotificationItem({ notification, onClick, onDelete, isPersonal }) {
    const [showActions, setShowActions] = useState(false);

    return (
        <div
            className={`
                relative p-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-4
                ${!notification.isRead ? (isPersonal ? 'bg-violet-50/50' : 'bg-indigo-50/50') : 'bg-white'}
            `}
            onClick={onClick}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${getIconColors(notification.type, isPersonal)}`}>
                <i className={getIconClass(notification.type)} />
            </div>

            <div className="flex-1 min-w-0">
                <h4 className={`text-sm mb-1 ${!notification.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {notification.title}
                </h4>
                <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400">
                        {formatRelativeTime(notification.createdAt)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeBadgeColor(notification.type, isPersonal)}`}>
                        {getTypeLabel(notification.type)}
                    </span>
                </div>
            </div>

            {!notification.isRead && (
                <div className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${isPersonal ? 'bg-violet-500' : 'bg-indigo-500'}`} />
            )}

            {/* Actions */}
            {showActions && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-2 bg-white shadow rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <i className="fa-solid fa-trash text-sm" />
                    </button>
                </div>
            )}
        </div>
    );
}

function NotificationPreferencesModal({ onClose, isPersonal }) {
    const { showToast } = useToast();
    const [preferences, setPreferences] = useState({
        emailEnabled: true,
        pushEnabled: true,
        taskNotifications: true,
        leaveNotifications: !isPersonal,
        mentionNotifications: !isPersonal,
        inviteNotifications: isPersonal,
        systemNotifications: true,
        digestFrequency: 'daily',
    });

    const togglePref = (key) => {
        setPreferences({ ...preferences, [key]: !preferences[key] });
    };

    const handleSave = () => {
        showToast('Đã lưu cài đặt thông báo', 'success');
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
                <div className={`p-6 border-b border-gray-100 ${isPersonal ? 'bg-gradient-to-r from-violet-500 to-purple-600' : 'bg-gradient-to-r from-indigo-500 to-indigo-600'}`}>
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white">Cài đặt thông báo</h2>
                        <button onClick={onClose} className="text-white/80 hover:text-white">
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                    {/* Delivery Methods */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Phương thức nhận</h4>
                        <div className="space-y-3">
                            <ToggleRow
                                icon="fa-envelope"
                                label="Email"
                                desc="Gửi thông báo qua email"
                                enabled={preferences.emailEnabled}
                                onToggle={() => togglePref('emailEnabled')}
                                accentColor={isPersonal ? 'violet' : 'blue'}
                            />
                            <ToggleRow
                                icon="fa-bell"
                                label="Push Notification"
                                desc="Thông báo trên trình duyệt"
                                enabled={preferences.pushEnabled}
                                onToggle={() => togglePref('pushEnabled')}
                                accentColor={isPersonal ? 'violet' : 'blue'}
                            />
                        </div>
                    </div>

                    {/* Notification Types */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Loại thông báo</h4>
                        <div className="space-y-3">
                            <ToggleRow
                                icon="fa-list-check"
                                label={isPersonal ? 'Tasks cá nhân' : 'Công việc'}
                                desc={isPersonal ? 'Nhắc nhở, hạn chót' : 'Tasks, dự án, deadlines'}
                                enabled={preferences.taskNotifications}
                                onToggle={() => togglePref('taskNotifications')}
                                accentColor={isPersonal ? 'violet' : 'blue'}
                            />
                            {isPersonal ? (
                                <ToggleRow
                                    icon="fa-envelope"
                                    label="Lời mời"
                                    desc="Lời mời tham gia workspace"
                                    enabled={preferences.inviteNotifications}
                                    onToggle={() => togglePref('inviteNotifications')}
                                    accentColor="violet"
                                />
                            ) : (
                                <>
                                    <ToggleRow
                                        icon="fa-calendar-check"
                                        label="Nghỉ phép"
                                        desc="Đơn nghỉ phép, phê duyệt"
                                        enabled={preferences.leaveNotifications}
                                        onToggle={() => togglePref('leaveNotifications')}
                                        accentColor="blue"
                                    />
                                    <ToggleRow
                                        icon="fa-at"
                                        label="Mentions"
                                        desc="Khi ai đó @mention bạn"
                                        enabled={preferences.mentionNotifications}
                                        onToggle={() => togglePref('mentionNotifications')}
                                        accentColor="blue"
                                    />
                                </>
                            )}
                            <ToggleRow
                                icon="fa-cog"
                                label="Hệ thống"
                                desc="Thông báo từ hệ thống"
                                enabled={preferences.systemNotifications}
                                onToggle={() => togglePref('systemNotifications')}
                                accentColor={isPersonal ? 'violet' : 'blue'}
                            />
                        </div>
                    </div>

                    {/* Digest Frequency */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Tần suất tổng hợp</h4>
                        <select
                            value={preferences.digestFrequency}
                            onChange={(e) => setPreferences({ ...preferences, digestFrequency: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                        >
                            <option value="realtime">Tức thì</option>
                            <option value="daily">Hàng ngày</option>
                            <option value="weekly">Hàng tuần</option>
                            <option value="none">Không gửi</option>
                        </select>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                        Hủy
                    </button>
                    <button
                        onClick={handleSave}
                        className={`px-4 py-2.5 text-white rounded-xl font-medium ${isPersonal
                            ? 'bg-gradient-to-r from-violet-500 to-purple-600'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                    >
                        Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
    );
}

function ToggleRow({ icon, label, desc, enabled, onToggle, accentColor = 'blue' }) {
    const colors = {
        blue: 'bg-indigo-500',
        violet: 'bg-violet-500',
    };

    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
                    <i className={`fa-solid ${icon} text-gray-500`} />
                </div>
                <div>
                    <div className="font-medium text-gray-800 text-sm">{label}</div>
                    <div className="text-xs text-gray-500">{desc}</div>
                </div>
            </div>
            <button
                onClick={onToggle}
                className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? colors[accentColor] : 'bg-gray-300'}`}
            >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? 'left-6' : 'left-1'}`} />
            </button>
        </div>
    );
}

function getIconClass(type) {
    const icons = {
        // Company types
        'TASK_ASSIGNED': 'fa-solid fa-list-check',
        'TASK_COMPLETED': 'fa-solid fa-check-circle',
        'TASK_COMMENT': 'fa-solid fa-comment',
        'LEAVE_APPROVED': 'fa-solid fa-check-double',
        'LEAVE_REJECTED': 'fa-solid fa-xmark',
        'LEAVE_REQUEST': 'fa-solid fa-calendar-plus',
        'PAYROLL_READY': 'fa-solid fa-money-bill-wave',
        'MENTION': 'fa-solid fa-at',
        'SYSTEM': 'fa-solid fa-cog',
        'COMMENT_ADDED': 'fa-solid fa-comment',
        'COMMENT_EDITED': 'fa-solid fa-pen-to-square',
        'ROLE_CHANGED': 'fa-solid fa-user-gear',
        'ISSUE_CREATED': 'fa-solid fa-plus-circle',
        'ISSUE_UPDATED': 'fa-solid fa-pen',
        'ISSUE_ASSIGNED': 'fa-solid fa-user-plus',
        'ISSUE_OVERDUE': 'fa-solid fa-clock',
        'SPRINT_STARTED': 'fa-solid fa-play',
        'SPRINT_COMPLETED': 'fa-solid fa-flag-checkered',
        'PROJECT_CREATED': 'fa-solid fa-folder-plus',
        'PROJECT_MEMBER_ADDED': 'fa-solid fa-user-plus',
        // Personal types
        'PERSONAL_TASK_REMINDER': 'fa-solid fa-bell',
        'PERSONAL_TASK_DUE': 'fa-solid fa-clock',
        'WORKSPACE_INVITE': 'fa-solid fa-envelope',
        'INVITE_ACCEPTED': 'fa-solid fa-user-check',
        'QUOTA_WARNING': 'fa-solid fa-exclamation-triangle',
        'PLAN_UPGRADED': 'fa-solid fa-crown',
    };
    return icons[type] || 'fa-solid fa-bell';
}

function getIconColors(type, isPersonal) {
    // Personal-specific types
    if (['PERSONAL_TASK_REMINDER', 'PERSONAL_TASK_DUE'].includes(type)) {
        return 'bg-violet-100 text-violet-600';
    }
    if (['WORKSPACE_INVITE', 'INVITE_ACCEPTED'].includes(type)) {
        return 'bg-purple-100 text-purple-600';
    }
    if (type === 'QUOTA_WARNING') {
        return 'bg-orange-100 text-orange-600';
    }
    if (type === 'PLAN_UPGRADED') {
        return 'bg-amber-100 text-amber-600';
    }

    // Company types
    const colors = {
        'TASK_ASSIGNED': 'bg-indigo-100 text-indigo-600',
        'TASK_COMPLETED': 'bg-green-100 text-green-600',
        'LEAVE_APPROVED': 'bg-green-100 text-green-600',
        'LEAVE_REJECTED': 'bg-red-100 text-red-600',
        'LEAVE_REQUEST': 'bg-orange-100 text-orange-600',
        'PAYROLL_READY': 'bg-yellow-100 text-yellow-600',
        'MENTION': 'bg-purple-100 text-purple-600',
        'SYSTEM': 'bg-gray-100 text-gray-600',
        'ISSUE_CREATED': 'bg-green-100 text-green-600',
        'ISSUE_UPDATED': 'bg-indigo-100 text-indigo-600',
        'ISSUE_ASSIGNED': 'bg-cyan-100 text-cyan-600',
        'ISSUE_OVERDUE': 'bg-red-100 text-red-600',
    };
    return colors[type] || (isPersonal ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-600');
}

function getTypeBadgeColor(type, isPersonal) {
    if (['PERSONAL_TASK_REMINDER', 'PERSONAL_TASK_DUE'].includes(type)) {
        return 'bg-violet-100 text-violet-600';
    }
    if (['WORKSPACE_INVITE', 'INVITE_ACCEPTED'].includes(type)) {
        return 'bg-purple-100 text-purple-600';
    }
    if (type?.includes('TASK') || type?.includes('ISSUE')) return 'bg-indigo-100 text-indigo-600';
    if (type?.includes('LEAVE')) return 'bg-green-100 text-green-600';
    if (type === 'MENTION') return 'bg-purple-100 text-purple-600';
    return isPersonal ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-600';
}

function getTypeLabel(type) {
    const labels = {
        // Company labels
        'TASK_ASSIGNED': 'Công việc',
        'TASK_COMPLETED': 'Hoàn thành',
        'LEAVE_APPROVED': 'Đã duyệt',
        'LEAVE_REJECTED': 'Từ chối',
        'PAYROLL_READY': 'Lương',
        'MENTION': 'Mention',
        'SYSTEM': 'Hệ thống',
        'COMMENT_ADDED': 'Bình luận mới',
        'ISSUE_CREATED': 'Task mới',
        'ISSUE_UPDATED': 'Cập nhật',
        'ISSUE_ASSIGNED': 'Được gán',
        'ISSUE_OVERDUE': 'Quá hạn',
        'SPRINT_STARTED': 'Sprint',
        'PROJECT_CREATED': 'Dự án mới',
        // Personal labels
        'PERSONAL_TASK_REMINDER': 'Nhắc nhở',
        'PERSONAL_TASK_DUE': 'Hạn chót',
        'WORKSPACE_INVITE': 'Lời mời',
        'INVITE_ACCEPTED': 'Đã chấp nhận',
        'QUOTA_WARNING': 'Cảnh báo',
        'PLAN_UPGRADED': 'Nâng cấp',
    };
    return labels[type] || 'Thông báo';
}


