import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocketStore } from '@shared/stores/websocketStore';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { useNavigate } from 'react-router-dom';

const NOTIFICATION_TYPES = [
    { key: 'all', label: 'Tất cả', icon: 'fa-bell' },
    { key: 'task', label: 'Công việc', icon: 'fa-list-check' },
    { key: 'leave', label: 'Nghỉ phép', icon: 'fa-calendar-check' },
    { key: 'mention', label: 'Mentions', icon: 'fa-at' },
    { key: 'system', label: 'Hệ thống', icon: 'fa-cog' },
];

export default function NotificationsPage() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const { subscribe, unsubscribe } = useWebSocketStore();
    const [activeTab, setActiveTab] = useState('all');
    const [showPreferences, setShowPreferences] = useState(false);

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
        if (activeTab === 'task') return ['TASK_ASSIGNED', 'TASK_COMPLETED', 'TASK_COMMENT'].includes(n.type);
        if (activeTab === 'leave') return ['LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_REQUEST'].includes(n.type);
        if (activeTab === 'mention') return n.type === 'MENTION';
        if (activeTab === 'system') return ['SYSTEM', 'PAYROLL_READY', 'ANNOUNCEMENT'].includes(n.type);
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
        // Navigate based on type
        const routes = {
            'TASK_ASSIGNED': `/app/projects/${notification.referenceId}`,
            'LEAVE_APPROVED': '/app/leave-requests',
            'LEAVE_REJECTED': '/app/leave-requests',
            'PAYROLL_READY': '/app/salaries',
            'MENTION': `/app/chat`,
        };
        if (routes[notification.type]) {
            navigate(routes[notification.type]);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Thông báo</h1>
                    <p className="text-gray-500 text-sm">
                        {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Không có thông báo mới'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowPreferences(true)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                    >
                        <i className="fa-solid fa-cog mr-2" />
                        Cài đặt
                    </button>
                    <button
                        onClick={() => readAllMutation.mutate()}
                        disabled={readAllMutation.isPending || unreadCount === 0}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                        <i className="fa-solid fa-check-double mr-2" />
                        Đọc tất cả
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl overflow-x-auto">
                {NOTIFICATION_TYPES.map(type => {
                    const count = type.key === 'all'
                        ? notifications.length
                        : notifications.filter(n => {
                            if (type.key === 'task') return ['TASK_ASSIGNED', 'TASK_COMPLETED'].includes(n.type);
                            if (type.key === 'leave') return ['LEAVE_APPROVED', 'LEAVE_REJECTED'].includes(n.type);
                            return n.type === type.key.toUpperCase();
                        }).length;

                    return (
                        <button
                            key={type.key}
                            onClick={() => setActiveTab(type.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === type.key
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <i className={`fa-solid ${type.icon}`} />
                            {type.label}
                            {count > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === type.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'
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
                <div className="flex items-center justify-center py-12">
                    <i className="fa-solid fa-spinner fa-spin text-2xl text-blue-500" />
                </div>
            )}

            {/* Notification List */}
            {!isLoading && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {filteredNotifications.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i className="fa-solid fa-bell-slash text-2xl text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800">Không có thông báo</h3>
                            <p className="text-gray-500 text-sm mt-1">Bạn sẽ nhận thông báo khi có hoạt động mới</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filteredNotifications.map(notification => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onClick={() => handleNotificationClick(notification)}
                                    onDelete={() => deleteMutation.mutate(notification.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Preferences Modal */}
            {showPreferences && (
                <NotificationPreferencesModal onClose={() => setShowPreferences(false)} />
            )}
        </div>
    );
}

function NotificationItem({ notification, onClick, onDelete }) {
    const [showActions, setShowActions] = useState(false);

    return (
        <div
            className={`
                relative p-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-4
                ${!notification.isRead ? 'bg-blue-50/50' : 'bg-white'}
            `}
            onClick={onClick}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${getIconColors(notification.type)}`}>
                <i className={getIconClass(notification.type)} />
            </div>

            <div className="flex-1 min-w-0">
                <h4 className={`text-sm mb-1 ${!notification.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {notification.title}
                </h4>
                <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400">
                        {formatTimeAgo(notification.createdAt)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeBadgeColor(notification.type)}`}>
                        {getTypeLabel(notification.type)}
                    </span>
                </div>
            </div>

            {!notification.isRead && (
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-2 shrink-0" />
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

function NotificationPreferencesModal({ onClose }) {
    const { showToast } = useToast();
    const [preferences, setPreferences] = useState({
        emailEnabled: true,
        pushEnabled: true,
        taskNotifications: true,
        leaveNotifications: true,
        mentionNotifications: true,
        systemNotifications: true,
        digestFrequency: 'daily',
    });

    const togglePref = (key) => {
        setPreferences({ ...preferences, [key]: !preferences[key] });
    };

    const handleSave = () => {
        // API call to save preferences
        showToast('Đã lưu cài đặt thông báo', 'success');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900">Cài đặt thông báo</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
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
                            />
                            <ToggleRow
                                icon="fa-bell"
                                label="Push Notification"
                                desc="Thông báo trên trình duyệt"
                                enabled={preferences.pushEnabled}
                                onToggle={() => togglePref('pushEnabled')}
                            />
                        </div>
                    </div>

                    {/* Notification Types */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Loại thông báo</h4>
                        <div className="space-y-3">
                            <ToggleRow
                                icon="fa-list-check"
                                label="Công việc"
                                desc="Tasks, dự án, deadlines"
                                enabled={preferences.taskNotifications}
                                onToggle={() => togglePref('taskNotifications')}
                            />
                            <ToggleRow
                                icon="fa-calendar-check"
                                label="Nghỉ phép"
                                desc="Đơn nghỉ phép, phê duyệt"
                                enabled={preferences.leaveNotifications}
                                onToggle={() => togglePref('leaveNotifications')}
                            />
                            <ToggleRow
                                icon="fa-at"
                                label="Mentions"
                                desc="Khi ai đó @mention bạn"
                                enabled={preferences.mentionNotifications}
                                onToggle={() => togglePref('mentionNotifications')}
                            />
                            <ToggleRow
                                icon="fa-cog"
                                label="Hệ thống"
                                desc="Thông báo từ hệ thống"
                                enabled={preferences.systemNotifications}
                                onToggle={() => togglePref('systemNotifications')}
                            />
                        </div>
                    </div>

                    {/* Digest Frequency */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Tần suất tổng hợp</h4>
                        <select
                            value={preferences.digestFrequency}
                            onChange={(e) => setPreferences({ ...preferences, digestFrequency: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                        >
                            <option value="realtime">Tức thì</option>
                            <option value="daily">Hàng ngày</option>
                            <option value="weekly">Hàng tuần</option>
                            <option value="none">Không gửi</option>
                        </select>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        Hủy
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
    );
}

function ToggleRow({ icon, label, desc, enabled, onToggle }) {
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
                className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-blue-500' : 'bg-gray-300'}`}
            >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? 'left-6' : 'left-1'}`} />
            </button>
        </div>
    );
}

function getIconClass(type) {
    const icons = {
        'TASK_ASSIGNED': 'fa-solid fa-list-check',
        'TASK_COMPLETED': 'fa-solid fa-check-circle',
        'TASK_COMMENT': 'fa-solid fa-comment',
        'LEAVE_APPROVED': 'fa-solid fa-check-double',
        'LEAVE_REJECTED': 'fa-solid fa-xmark',
        'LEAVE_REQUEST': 'fa-solid fa-calendar-plus',
        'PAYROLL_READY': 'fa-solid fa-money-bill-wave',
        'MENTION': 'fa-solid fa-at',
        'SYSTEM': 'fa-solid fa-cog',
        // NEW notification types from BE events
        'COMMENT_ADDED': 'fa-solid fa-comment',
        'COMMENT_EDITED': 'fa-solid fa-pen-to-square',
        'COMMENT_DELETED': 'fa-solid fa-comment-slash',
        'ROLE_CHANGED': 'fa-solid fa-user-gear',
        'ISSUE_CREATED': 'fa-solid fa-plus-circle',
        'ISSUE_UPDATED': 'fa-solid fa-pen',
        'ISSUE_DELETED': 'fa-solid fa-trash',
        'ISSUE_ASSIGNED': 'fa-solid fa-user-plus',
        'ISSUE_OVERDUE': 'fa-solid fa-clock',
        'SPRINT_STARTED': 'fa-solid fa-play',
        'SPRINT_COMPLETED': 'fa-solid fa-flag-checkered',
        'SPRINT_ENDING_SOON': 'fa-solid fa-hourglass-half',
        'PROJECT_CREATED': 'fa-solid fa-folder-plus',
        'PROJECT_MEMBER_ADDED': 'fa-solid fa-user-plus',
    };
    return icons[type] || 'fa-solid fa-bell';
}

function getIconColors(type) {
    const colors = {
        'TASK_ASSIGNED': 'bg-blue-100 text-blue-600',
        'TASK_COMPLETED': 'bg-green-100 text-green-600',
        'LEAVE_APPROVED': 'bg-green-100 text-green-600',
        'LEAVE_REJECTED': 'bg-red-100 text-red-600',
        'LEAVE_REQUEST': 'bg-orange-100 text-orange-600',
        'PAYROLL_READY': 'bg-yellow-100 text-yellow-600',
        'MENTION': 'bg-purple-100 text-purple-600',
        'SYSTEM': 'bg-gray-100 text-gray-600',
        // NEW notification types from BE events
        'COMMENT_ADDED': 'bg-blue-100 text-blue-600',
        'COMMENT_EDITED': 'bg-amber-100 text-amber-600',
        'COMMENT_DELETED': 'bg-red-100 text-red-600',
        'ROLE_CHANGED': 'bg-indigo-100 text-indigo-600',
        'ISSUE_CREATED': 'bg-green-100 text-green-600',
        'ISSUE_UPDATED': 'bg-blue-100 text-blue-600',
        'ISSUE_DELETED': 'bg-red-100 text-red-600',
        'ISSUE_ASSIGNED': 'bg-cyan-100 text-cyan-600',
        'ISSUE_OVERDUE': 'bg-red-100 text-red-600',
        'SPRINT_STARTED': 'bg-green-100 text-green-600',
        'SPRINT_COMPLETED': 'bg-emerald-100 text-emerald-600',
        'SPRINT_ENDING_SOON': 'bg-orange-100 text-orange-600',
        'PROJECT_CREATED': 'bg-indigo-100 text-indigo-600',
        'PROJECT_MEMBER_ADDED': 'bg-blue-100 text-blue-600',
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
}

function getTypeBadgeColor(type) {
    if (type?.includes('TASK')) return 'bg-blue-100 text-blue-600';
    if (type?.includes('LEAVE')) return 'bg-green-100 text-green-600';
    if (type === 'MENTION') return 'bg-purple-100 text-purple-600';
    return 'bg-gray-100 text-gray-600';
}

function getTypeLabel(type) {
    const labels = {
        'TASK_ASSIGNED': 'Công việc',
        'TASK_COMPLETED': 'Hoàn thành',
        'LEAVE_APPROVED': 'Đã duyệt',
        'LEAVE_REJECTED': 'Từ chối',
        'PAYROLL_READY': 'Lương',
        'MENTION': 'Mention',
        'SYSTEM': 'Hệ thống',
        // NEW notification types from BE events
        'COMMENT_ADDED': 'Bình luận mới',
        'COMMENT_EDITED': 'Sửa bình luận',
        'COMMENT_DELETED': 'Xóa bình luận',
        'ROLE_CHANGED': 'Thay đổi vai trò',
        'ISSUE_CREATED': 'Task mới',
        'ISSUE_UPDATED': 'Cập nhật task',
        'ISSUE_DELETED': 'Xóa task',
        'ISSUE_ASSIGNED': 'Được gán task',
        'ISSUE_OVERDUE': 'Quá hạn',
        'SPRINT_STARTED': 'Sprint bắt đầu',
        'SPRINT_COMPLETED': 'Sprint hoàn thành',
        'SPRINT_ENDING_SOON': 'Sprint sắp hết',
        'PROJECT_CREATED': 'Dự án mới',
        'PROJECT_MEMBER_ADDED': 'Thêm thành viên',
    };
    return labels[type] || 'Thông báo';
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
}
