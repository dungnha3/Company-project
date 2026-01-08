import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocketStore } from '@shared/stores/websocketStore';
import { useAuthStore } from '@shared/stores/authStore';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

export default function ChatPage() {
    const { connect, disconnect, connected } = useWebSocketStore();
    const [selectedRoomId, setSelectedRoomId] = useState(null);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, []);

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            {/* Sidebar - Conversation List */}
            <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/30">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-bold text-lg text-gray-800">Tin nhắn</h2>
                    <button className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
                        <i className="fa-solid fa-plus" />
                    </button>
                </div>

                <ConversationList
                    selectedRoomId={selectedRoomId}
                    onSelectRoom={setSelectedRoomId}
                />
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {selectedRoomId ? (
                    <ChatWindow roomId={selectedRoomId} />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                        <i className="fa-regular fa-comments text-6xl mb-4" />
                        <p className="text-lg">Chọn một cuộc trò chuyện để bắt đầu</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function ConversationList({ selectedRoomId, onSelectRoom }) {
    const { data: rooms, isLoading } = useQuery({
        queryKey: ['chat-rooms'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.CHAT.ROOMS)).data,
    });

    if (isLoading) return <div className="p-4 text-center text-gray-400">Đang tải...</div>;

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {rooms?.map(room => (
                <div
                    key={room.roomId}
                    onClick={() => onSelectRoom(room.roomId)}
                    className={`
                        p-4 cursor-pointer hover:bg-gray-100 transition-colors border-b border-gray-50
                        ${selectedRoomId === room.roomId ? 'bg-blue-50 hover:bg-blue-50' : ''}
                    `}
                >
                    <div className="flex gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold shrink-0">
                                {room.name?.charAt(0) || 'U'}
                            </div>
                            {/* Online Indicator (Mock) */}
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                                <h4 className={`text-sm truncate ${selectedRoomId === room.roomId ? 'font-bold text-blue-900' : 'font-semibold text-gray-700'}`}>
                                    {room.name || 'Chat Group'}
                                </h4>
                                <span className="text-[10px] text-gray-400">
                                    {room.lastMessageAt ? new Date(room.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                            </div>
                            <p className={`text-xs truncate ${room.unreadCount > 0 ? 'font-bold text-gray-800' : 'text-gray-500'}`}>
                                {room.lastMessage?.content || 'Chưa có tin nhắn'}
                            </p>
                        </div>
                    </div>
                </div>
            ))}

            {rooms?.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">Chưa có tin nhắn nào</div>
            )}
        </div>
    );
}

function ChatWindow({ roomId }) {
    const { user } = useAuthStore();
    const { subscribe, unsubscribe, sendMessage } = useWebSocketStore();
    const queryClient = useQueryClient();
    const messagesEndRef = useRef(null);
    const [inputValue, setInputValue] = useState('');

    const { data: messages = [], isLoading } = useQuery({
        queryKey: ['chat-messages', roomId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.CHAT.MESSAGES(roomId))).data,
    });

    const markReadMutation = useMutation({
        mutationFn: () => apiClient.put(ENDPOINTS.CHAT.MARK_READ(roomId)),
        onSuccess: () => queryClient.invalidateQueries(['chat-rooms'])
    });

    useEffect(() => {
        // Subscribe to Room Topic
        const topic = `/topic/room.${roomId}`;
        subscribe(topic, (newMessage) => {
            // Update cache optimistically
            queryClient.setQueryData(['chat-messages', roomId], (old) => [...(old || []), newMessage]);
            // Refresh rooms list to update last message
            queryClient.invalidateQueries(['chat-rooms']);
        });

        // Mark as read on enter
        markReadMutation.mutate();

        return () => unsubscribe(topic);
    }, [roomId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        sendMessage('/app/chat.sendMessage', {
            roomId,
            content: inputValue,
            type: 'TEXT'
        });
        setInputValue('');
    };

    if (isLoading) return <div className="flex-1 flex items-center justify-center">Loading...</div>;

    return (
        <>
            {/* Header */}
            <div className="h-16 px-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                        #
                    </div>
                    <div>
                        <div className="font-bold text-gray-800">Phòng thảo luận</div>
                        <div className="text-xs text-green-500 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> Online
                        </div>
                    </div>
                </div>
                <div className="flex gap-4 text-gray-400">
                    <button className="hover:text-blue-600"><i className="fa-solid fa-phone" /></button>
                    <button className="hover:text-blue-600"><i className="fa-solid fa-video" /></button>
                    <button className="hover:text-blue-600"><i className="fa-solid fa-circle-info" /></button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/50 space-y-4">
                {messages.map((msg, index) => {
                    const isMe = msg.senderId === user?.userId; // Assuming user stored has userId
                    const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== msg.senderId);

                    return (
                        <div key={msg.id || index} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                            {!isMe && (
                                <div className="w-8 h-8 shrink-0 flex items-end">
                                    {showAvatar ? (
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold" title={msg.senderName}>
                                            {msg.senderName?.charAt(0)}
                                        </div>
                                    ) : <div className="w-8" />}
                                </div>
                            )}

                            <div className={`max-w-[70%] space-y-1 ${isMe ? 'items-end flex flex-col' : ''}`}>
                                {!isMe && showAvatar && <div className="text-xs text-gray-500 ml-1">{msg.senderName}</div>}
                                <div
                                    className={`
                                        px-4 py-2 rounded-2xl text-sm shadow-sm
                                        ${isMe
                                            ? 'bg-blue-600 text-white rounded-br-none'
                                            : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                                        }
                                    `}
                                >
                                    {msg.content}
                                </div>
                                <div className={`text-[10px] text-gray-400 ${isMe ? 'mr-1' : 'ml-1'}`}>
                                    {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                <form onSubmit={handleSend} className="flex gap-2 items-center bg-gray-50 px-4 py-2 rounded-full border border-gray-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
                    <button type="button" className="text-gray-400 hover:text-blue-600 transition-colors">
                        <i className="fa-solid fa-paperclip" />
                    </button>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Nhập tin nhắn..."
                        className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-gray-400"
                    />
                    <button type="button" className="text-gray-400 hover:text-blue-600 transition-colors">
                        <i className="fa-regular fa-face-smile" />
                    </button>
                    <button
                        type="submit"
                        disabled={!inputValue.trim()}
                        className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:opacity-50 disabled:bg-gray-300 hover:bg-blue-700 transition-colors"
                    >
                        <i className="fa-solid fa-paper-plane text-xs" />
                    </button>
                </form>
            </div>
        </>
    );
}
