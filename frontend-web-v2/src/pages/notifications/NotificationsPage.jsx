import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocketStore } from '@shared/stores/websocketStore';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { useNavigate } from 'react-router-dom';

export default function NotificationsPage() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const { subscribe, unsubscribe } = useWebSocketStore();

    // Fetch notifications
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.NOTIFICATIONS.LIST)).data,
    });

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

    useEffect(() => {
        // Subscribe to real-time updates
        const topic = '/user/queue/notifications';
        subscribe(topic, () => {
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

        // Handle navigation based on type
        if (notification.type === 'TASK_ASSIGNED' && notification.referenceId) {
            navigate(`/projects/task/${notification.referenceId}`); // Adjust route as needed
        } else if (notification.type === 'LEAVE_APPROVED') {
            navigate('/leave-requests');
        }
        // Add more logic
    };

    if (isLoading) return <div className="p-8 text-center">Đang tải thông báo...</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h1 className="text-2xl font-bold text-gray-900">Thông báo</h1>
                <button
                    onClick={() => readAllMutation.mutate()}
                    disabled={readAllMutation.isPending || notifications.length === 0}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:text-gray-400"
                >
                    Đánh dấu tất cả đã đọc
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {notifications.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <i className="fa-regular fa-bell-slash text-4xl mb-3 text-gray-300" />
                        <p>Không có thông báo nào</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {notifications.map(notification => (
                            <div
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`
                                    p-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-4
                                    ${!notification.isRead ? 'bg-blue-50/50' : 'bg-white'}
                                `}
                            >
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center shrink-0
                                    ${getIconColors(notification.type)}
                                `}>
                                    <i className={getIconClass(notification.type)} />
                                </div>

                                <div className="flex-1">
                                    <h4 className={`text-sm mb-1 ${!notification.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                        {notification.title}
                                    </h4>
                                    <p className="text-sm text-gray-600">{notification.message}</p>
                                    <span className="text-xs text-gray-400 mt-2 block">
                                        {new Date(notification.createdAt).toLocaleString('vi-VN')}
                                    </span>
                                </div>

                                {!notification.isRead && (
                                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function getIconClass(type) {
    switch (type) {
        case 'TASK_ASSIGNED': return 'fa-solid fa-tasks';
        case 'LEAVE_APPROVED': return 'fa-solid fa-check-double';
        case 'LEAVE_REJECTED': return 'fa-solid fa-xmark';
        case 'PAYROLL_READY': return 'fa-solid fa-money-bill-wave';
        default: return 'fa-solid fa-bell';
    }
}

function getIconColors(type) {
    switch (type) {
        case 'TASK_ASSIGNED': return 'bg-blue-100 text-blue-600';
        case 'LEAVE_APPROVED': return 'bg-green-100 text-green-600';
        case 'LEAVE_REJECTED': return 'bg-red-100 text-red-600';
        case 'PAYROLL_READY': return 'bg-yellow-100 text-yellow-600';
        default: return 'bg-gray-100 text-gray-600';
    }
}
