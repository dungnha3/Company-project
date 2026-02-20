import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useWebSocketStore } from '@shared/stores/websocketStore';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatRelativeTime } from '@shared/utils/formatters';

export default function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { subscribe, unsubscribe } = useWebSocketStore();
    const { workspaceType } = useWorkspaceStore();
    const isCompanyWorkspace = workspaceType === 'COMPANY';

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        // Subscribe to real-time notifications
        const topic = '/user/queue/notifications';
        subscribe(topic, () => {
            queryClient.invalidateQueries(['unread-count']);
            queryClient.invalidateQueries(['notifications-preview']);
        });

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            unsubscribe(topic);
        };
    }, []);

    const { data: unreadCount = 0 } = useQuery({
        queryKey: ['unread-count'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT)).data,
        refetchInterval: 60000, // Polling fallback
        enabled: isCompanyWorkspace, // Only fetch for Company Workspace
    });

    const { data: notifications = [] } = useQuery({
        queryKey: ['notifications-preview'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.NOTIFICATIONS.LIST, { params: { size: 5 } })).data?.content || [],
        enabled: isOpen && isCompanyWorkspace, // Only when open AND in Company Workspace
    });

    const markReadMutation = useMutation({
        mutationFn: (id) => apiClient.put(ENDPOINTS.NOTIFICATIONS.MARK_READ(id)),
        onSuccess: () => {
            queryClient.invalidateQueries(['unread-count']);
            queryClient.invalidateQueries(['notifications-preview']);
        }
    });

    const handleItemClick = (notification) => {
        if (!notification.isRead) markReadMutation.mutate(notification.id);
        setIsOpen(false);
        navigate('/notifications');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-indigo-600 flex items-center justify-center transition-all relative"
            >
                <i className="fa-regular fa-bell text-lg" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-2 border-b border-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Thông báo</h3>
                        <button onClick={() => { setIsOpen(false); navigate('/notifications'); }} className="text-xs text-indigo-600 hover:underline">
                            Xem tất cả
                        </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                Không có thông báo mới
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleItemClick(notif)}
                                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer flex gap-3 ${!notif.isRead ? 'bg-indigo-50/30' : ''}`}
                                >
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0 opacity-0 data-[unread='true']:opacity-100" data-unread={!notif.isRead}></div>
                                    <div>
                                        <p className={`text-sm line-clamp-2 ${!notif.isRead ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                                            {notif.title}
                                        </p>
                                        <span className="text-xs text-gray-400 mt-1 block">
                                            {formatRelativeTime(notif.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
