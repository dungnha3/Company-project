import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatDate, formatTime as formatTimeUtil } from '@shared/utils/formatters';
import { Avatar } from '@shared/components/OptimizedImage';

export default function ConversationList({ selectedRoomId, onSelectRoom, onCreateRoom }) {
    const [searchQuery, setSearchQuery] = useState('');

    const { data: rooms = [], isLoading } = useQuery({
        queryKey: ['chat-rooms'],
        queryFn: async () => {
            const response = (await apiClient.get(ENDPOINTS.CHAT.ROOMS)).data;
            return response?.content || [];
        },
    });

    const filteredRooms = rooms.filter(room =>
        room.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-80 border-r border-gray-100 flex flex-col bg-gradient-to-b from-gray-50 to-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="font-bold text-lg text-gray-800">Tin nhắn</h2>
                    <button
                        onClick={onCreateRoom}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center hover:shadow-lg transition-shadow"
                        title="Tạo phòng mới"
                    >
                        <i className="fa-solid fa-plus text-sm" />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm border-none outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                </div>
            </div>

            {/* Room List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                    <div className="p-4 space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-3 animate-pulse">
                                <div className="w-12 h-12 rounded-full bg-gray-200" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredRooms.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <i className="fa-regular fa-comments text-2xl text-gray-300" />
                        </div>
                        <p className="text-gray-400 text-sm">
                            {searchQuery ? 'Không tìm thấy' : 'Chưa có cuộc trò chuyện'}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={onCreateRoom}
                                className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm hover:bg-indigo-100"
                            >
                                <i className="fa-solid fa-plus mr-2" />
                                Tạo phòng mới
                            </button>
                        )}
                    </div>
                ) : (
                    filteredRooms.map(room => (
                        <RoomItem
                            key={room.roomId}
                            room={room}
                            isSelected={selectedRoomId === room.roomId}
                            onClick={() => onSelectRoom(room.roomId)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function RoomItem({ room, isSelected, onClick }) {
    const getRoomIcon = () => {
        if (room.type === 'DIRECT') {
            return room.otherUser?.avatar ? (
                <Avatar src={room.otherUser.avatar} name={room.otherUser?.name} className="w-full h-full" />
            ) : (
                <span>{room.otherUser?.name?.charAt(0) || room.name?.charAt(0) || 'U'}</span>
            );
        }
        return <i className="fa-solid fa-users text-sm" />;
    };

    const getGradient = () => {
        const gradients = [
            'from-purple-400 to-pink-500',
            'from-indigo-400 to-cyan-500',
            'from-green-400 to-emerald-500',
            'from-orange-400 to-red-500',
            'from-indigo-400 to-purple-500',
        ];
        return gradients[(room.roomId || 0) % gradients.length];
    };

    return (
        <div
            onClick={onClick}
            className={`
                p-3 mx-2 my-1 rounded-xl cursor-pointer transition-all
                ${isSelected
                    ? 'bg-indigo-50 shadow-sm'
                    : 'hover:bg-gray-50'
                }
            `}
        >
            <div className="flex gap-3">
                {/* Avatar */}
                <div className="relative">
                    <div className={`
                        w-12 h-12 rounded-full bg-gradient-to-br ${getGradient()} 
                        flex items-center justify-center text-white font-bold text-sm overflow-hidden
                    `}>
                        {getRoomIcon()}
                    </div>
                    {/* Online Indicator */}
                    {room.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className={`text-sm truncate ${isSelected ? 'font-bold text-indigo-900' : 'font-semibold text-gray-700'}`}>
                            {room.name || 'Phòng chat'}
                        </h4>
                        {room.lastMessageAt && (
                            <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                                {formatTime(room.lastMessageAt)}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <p className={`text-xs truncate flex-1 ${room.unreadCount > 0 ? 'font-semibold text-gray-700' : 'text-gray-500'
                            }`}>
                            {room.lastMessage?.content || 'Bắt đầu cuộc trò chuyện...'}
                        </p>
                        {room.unreadCount > 0 && (
                            <span className="shrink-0 min-w-[20px] h-5 px-1.5 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {room.unreadCount > 99 ? '99+' : room.unreadCount}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}p`;
    if (diff < 86400000) return formatTimeUtil(date);
    if (diff < 604800000) {
        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        return days[date.getDay()];
    }
    return formatDate(date, { day: '2-digit', month: '2-digit' });
}
