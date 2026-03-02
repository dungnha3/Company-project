import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocketStore } from '@shared/stores/websocketStore';
import { useAuthStore } from '@shared/stores/authStore';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';

export default function ChatWindow({ roomId, onOpenRoomInfo }) {
    const { user } = useAuthStore();
    const { subscribe, unsubscribe, sendMessage } = useWebSocketStore();
    const queryClient = useQueryClient();
    const toast = useToast();
    const messagesEndRef = useRef(null);
    const [replyTo, setReplyTo] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    // Fetch room info
    const { data: room } = useQuery({
        queryKey: ['chat-room', roomId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.CHAT.ROOM_BY_ID(roomId))).data,
        enabled: !!roomId,
    });

    // Fetch messages
    const { data: messages = [], isLoading } = useQuery({
        queryKey: ['chat-messages', roomId],
        queryFn: async () => {
            const response = (await apiClient.get(ENDPOINTS.CHAT.MESSAGES(roomId))).data;
            return Array.isArray(response) ? response : (response?.content || []);
        },
        enabled: !!roomId,
    });

    // Mark as read
    const markReadMutation = useMutation({
        mutationFn: () => apiClient.put(ENDPOINTS.CHAT.MARK_READ(roomId)),
        onSuccess: () => queryClient.invalidateQueries(['chat-rooms'])
    });

    // Edit message
    const editMutation = useMutation({
        mutationFn: async ({ messageId, content }) => {
            await apiClient.put(ENDPOINTS.CHAT.EDIT_MESSAGE(messageId), { content });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['chat-messages', roomId]);
            setEditingMessage(null);
            toast.success('Đã cập nhật tin nhắn');
        }
    });

    // Delete message
    const deleteMutation = useMutation({
        mutationFn: async (messageId) => {
            await apiClient.delete(ENDPOINTS.CHAT.DELETE_MESSAGE(messageId));
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['chat-messages', roomId]);
            toast.success('Đã xóa tin nhắn');
        }
    });

    // WebSocket subscription
    useEffect(() => {
        // Guard: Only proceed if roomId is valid
        if (!roomId) return;

        const topic = `/topic/room.${roomId}`;
        subscribe(topic, (wsMessage) => {
            // Backend sends WebSocketMessage wrapper with full MessDTO in .data
            if (wsMessage.type === 'CHAT_MESSAGE' && wsMessage.data) {
                queryClient.setQueryData(['chat-messages', roomId], (old) => [...(old || []), wsMessage.data]);
            }
            queryClient.invalidateQueries(['chat-rooms']);
        });

        // Typing indicator topic
        const typingTopic = `/topic/room.${roomId}.typing`;
        subscribe(typingTopic, (typingData) => {
            // Handle typing indicator
        });

        markReadMutation.mutate();

        return () => {
            unsubscribe(topic);
            unsubscribe(typingTopic);
        };
    }, [roomId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleEdit = (message) => {
        setEditingMessage(message);
    };

    const handleDelete = (message) => {
        if (confirm('Bạn có chắc muốn xóa tin nhắn này?')) {
            deleteMutation.mutate(message.messageId);
        }
    };

    const handleReply = (message) => {
        setReplyTo(message);
    };

    // Filter messages for search
    const filteredMessages = searchQuery
        ? messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
        : messages;

    if (!roomId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-gradient-to-br from-gray-50 to-white">
                <div className="w-24 h-24 mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                    <i className="fa-regular fa-comments text-4xl" />
                </div>
                <p className="text-lg font-medium text-gray-400">Chọn một cuộc trò chuyện</p>
                <p className="text-sm text-gray-300 mt-1">để bắt đầu nhắn tin</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-white">
            {/* Header */}
            <div className="h-16 px-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                        {room?.roomType === 'DIRECT' ? (
                            room?.otherUser?.name?.charAt(0) || 'U'
                        ) : (
                            <i className="fa-solid fa-users text-sm" />
                        )}
                    </div>
                    <div>
                        <div className="font-bold text-gray-800">{room?.name || 'Phòng chat'}</div>
                        <div className="text-xs text-green-500 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            {room?.memberCount || 0} thành viên
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Search Toggle */}
                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showSearch ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100'
                            }`}
                    >
                        <i className="fa-solid fa-search" />
                    </button>

                    {/* Video Call */}
                    <button className="w-9 h-9 rounded-full text-gray-400 hover:bg-gray-100 flex items-center justify-center">
                        <i className="fa-solid fa-video" />
                    </button>

                    {/* Voice Call */}
                    <button className="w-9 h-9 rounded-full text-gray-400 hover:bg-gray-100 flex items-center justify-center">
                        <i className="fa-solid fa-phone" />
                    </button>

                    {/* Room Info */}
                    <button
                        onClick={onOpenRoomInfo}
                        className="w-9 h-9 rounded-full text-gray-400 hover:bg-gray-100 flex items-center justify-center"
                    >
                        <i className="fa-solid fa-circle-info" />
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            {showSearch && (
                <div className="px-6 py-2 bg-gray-50 border-b border-gray-100">
                    <div className="relative">
                        <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm trong cuộc trò chuyện..."
                            className="w-full pl-9 pr-4 py-2 bg-white rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                            autoFocus
                        />
                        {searchQuery && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                {filteredMessages.length} kết quả
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gradient-to-b from-gray-50/50 to-white space-y-3">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-300" />
                    </div>
                ) : filteredMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <i className="fa-regular fa-comment-dots text-4xl mb-3" />
                        <p>{searchQuery ? 'Không tìm thấy tin nhắn' : 'Bắt đầu cuộc trò chuyện!'}</p>
                    </div>
                ) : (
                    filteredMessages.map((msg, index) => {
                        const isMe = msg.sender?.userId === user?.userId;
                        const showAvatar = !isMe && (index === 0 || filteredMessages[index - 1].sender?.userId !== msg.sender?.userId);

                        return (
                            <MessageItem
                                key={msg.messageId || index}
                                message={msg}
                                isMe={isMe}
                                showAvatar={showAvatar}
                                onReply={handleReply}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <MessageInput
                roomId={roomId}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
                onMessageSent={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
            />
        </div>
    );
}
