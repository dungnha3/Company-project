import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { useAuthStore } from '@shared/stores/authStore';

export default function RoomInfoPanel({ roomId, onClose }) {
    const { user } = useAuthStore();
    const toast = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('members'); // members | files | pinned
    const [showAddMember, setShowAddMember] = useState(false);

    // Fetch room details
    const { data: room, isLoading } = useQuery({
        queryKey: ['chat-room', roomId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.CHAT.ROOM_BY_ID(roomId))).data,
        enabled: !!roomId,
    });

    // Fetch room members
    const { data: members = [] } = useQuery({
        queryKey: ['chat-room-members', roomId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.CHAT.ROOM_MEMBERS(roomId))).data || [],
        enabled: !!roomId,
    });

    // Fetch pinned messages
    const { data: pinnedMessages = [] } = useQuery({
        queryKey: ['chat-pinned', roomId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.CHAT.PINNED_MESSAGES(roomId))).data || [],
        enabled: !!roomId && activeTab === 'pinned',
    });

    // Remove member mutation
    const removeMemberMutation = useMutation({
        mutationFn: async (userId) => {
            await apiClient.delete(ENDPOINTS.CHAT.REMOVE_MEMBER(roomId, userId));
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['chat-room-members', roomId]);
            toast.success('Đã xóa thành viên');
        }
    });

    // Leave room mutation
    const leaveRoomMutation = useMutation({
        mutationFn: async () => {
            await apiClient.post(ENDPOINTS.CHAT.LEAVE_ROOM(roomId));
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['chat-rooms']);
            onClose();
            toast.success('Đã rời phòng');
        }
    });

    const handleRemoveMember = (userId) => {
        if (confirm('Bạn có chắc muốn xóa thành viên này?')) {
            removeMemberMutation.mutate(userId);
        }
    };

    const handleLeaveRoom = () => {
        if (confirm('Bạn có chắc muốn rời khỏi phòng chat này?')) {
            leaveRoomMutation.mutate();
        }
    };

    const isOwner = room?.createdBy === user?.userId;

    if (!roomId) return null;

    return (
        <div className="w-80 border-l border-gray-100 bg-white flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Chi tiết</h3>
                <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                >
                    <i className="fa-solid fa-times text-gray-400" />
                </button>
            </div>

            {/* Room Info */}
            {isLoading ? (
                <div className="p-6 text-center">
                    <i className="fa-solid fa-spinner fa-spin text-gray-300" />
                </div>
            ) : (
                <>
                    {/* Room Avatar & Name */}
                    <div className="p-6 text-center border-b border-gray-100">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                            {room?.roomType === 'DIRECT' ? (
                                room?.name?.charAt(0) || 'U'
                            ) : (
                                <i className="fa-solid fa-users" />
                            )}
                        </div>
                        <h4 className="font-bold text-lg text-gray-800">{room?.name || 'Phòng chat'}</h4>
                        {room?.description && (
                            <p className="text-sm text-gray-500 mt-1">{room.description}</p>
                        )}
                        <div className="flex justify-center gap-3 mt-4">
                            <button className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg hover:bg-gray-100">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                    <i className="fa-solid fa-bell text-gray-500" />
                                </div>
                                <span className="text-xs text-gray-500">Tắt tiếng</span>
                            </button>
                            <button className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg hover:bg-gray-100">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                    <i className="fa-solid fa-thumbtack text-gray-500" />
                                </div>
                                <span className="text-xs text-gray-500">Ghim</span>
                            </button>
                            <button className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg hover:bg-gray-100">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                    <i className="fa-solid fa-search text-gray-500" />
                                </div>
                                <span className="text-xs text-gray-500">Tìm</span>
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-100">
                        {[
                            { id: 'members', icon: 'fa-users', label: 'Thành viên' },
                            { id: 'files', icon: 'fa-file', label: 'File' },
                            { id: 'pinned', icon: 'fa-thumbtack', label: 'Ghim' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-3 text-xs font-medium flex flex-col items-center gap-1 transition-colors ${activeTab === tab.id
                                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <i className={`fa-solid ${tab.icon}`} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {activeTab === 'members' && (
                            <div className="p-4">
                                {/* Add Member Button */}
                                {isOwner && (
                                    <button
                                        onClick={() => setShowAddMember(true)}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-indigo-600 mb-2"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                                            <i className="fa-solid fa-plus" />
                                        </div>
                                        <span className="font-medium">Thêm thành viên</span>
                                    </button>
                                )}

                                {/* Member List */}
                                <div className="space-y-1">
                                    {members.map(member => (
                                        <div
                                            key={member.userId}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 group"
                                        >
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold">
                                                    {member.fullName?.charAt(0) || 'U'}
                                                </div>
                                                {member.isOnline && (
                                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm text-gray-700 truncate">
                                                    {member.fullName}
                                                    {member.userId === room?.createdBy && (
                                                        <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] rounded-full">
                                                            Chủ phòng
                                                        </span>
                                                    )}
                                                    {member.userId === user?.userId && (
                                                        <span className="ml-1 text-gray-400">(bạn)</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400">{member.email}</div>
                                            </div>
                                            {isOwner && member.userId !== user?.userId && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.userId)}
                                                    className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 flex items-center justify-center"
                                                >
                                                    <i className="fa-solid fa-times text-xs" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'files' && (
                            <div className="p-4 text-center text-gray-400 text-sm">
                                <i className="fa-solid fa-file text-3xl mb-3" />
                                <p>Chưa có file nào</p>
                            </div>
                        )}

                        {activeTab === 'pinned' && (
                            <div className="p-4">
                                {pinnedMessages.length === 0 ? (
                                    <div className="text-center text-gray-400 text-sm">
                                        <i className="fa-solid fa-thumbtack text-3xl mb-3" />
                                        <p>Chưa có tin nhắn ghim</p>
                                    </div>
                                ) : (
                                    pinnedMessages.map(msg => (
                                        <div key={msg.id} className="p-3 bg-gray-50 rounded-lg mb-2">
                                            <div className="text-xs text-gray-400 mb-1">{msg.senderName}</div>
                                            <p className="text-sm text-gray-700">{msg.content}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-gray-100">
                        <button
                            onClick={handleLeaveRoom}
                            className="w-full py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium"
                        >
                            <i className="fa-solid fa-door-open mr-2" />
                            Rời khỏi phòng
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
