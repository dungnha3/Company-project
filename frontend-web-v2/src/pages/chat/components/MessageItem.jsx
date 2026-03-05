import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocketStore } from '@shared/stores/websocketStore';
import { useAuthStore } from '@shared/stores/authStore';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatTime } from '@shared/utils/formatters';
import EmojiPicker from './EmojiPicker';

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

export default function MessageItem({ message, isMe, showAvatar, onReply, onEdit, onDelete }) {
    const [showActions, setShowActions] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    const addReactionMutation = useMutation({
        mutationFn: async (emoji) => {
            await apiClient.post(ENDPOINTS.CHAT.ADD_REACTION(message.messageId), { emoji });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['chat-messages', message.roomId]);
            setShowEmojiPicker(false);
        }
    });

    const removeReactionMutation = useMutation({
        mutationFn: async (emoji) => {
            await apiClient.delete(ENDPOINTS.CHAT.REMOVE_REACTION(message.messageId, emoji));
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['chat-messages', message.roomId]);
        }
    });

    const handleReaction = (emoji) => {
        // Reactions from backend is Map<emoji, List<username>>
        const reactionsMap = message.reactions || {};
        const usersForEmoji = reactionsMap[emoji] || [];
        const hasMyReaction = usersForEmoji.includes(user?.username);
        if (hasMyReaction) {
            removeReactionMutation.mutate(emoji);
        } else {
            addReactionMutation.mutate(emoji);
        }
    };

    // Build grouped reactions from backend Map<emoji, List<username>>
    const reactionsMap = message.reactions || {};
    const groupedReactions = Object.entries(reactionsMap).reduce((acc, [emoji, usernames]) => {
        acc[emoji] = {
            count: usernames.length,
            users: usernames,
            hasMe: usernames.includes(user?.username)
        };
        return acc;
    }, {});

    return (
        <div
            className={`group flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); }}
        >
            {/* Avatar */}
            {!isMe && (
                <div className="w-8 h-8 shrink-0 flex items-end">
                    {showAvatar ? (
                        <div
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center text-xs font-bold"
                            title={message.sender?.username}
                        >
                            {message.sender?.username?.charAt(0)?.toUpperCase()}
                        </div>
                    ) : <div className="w-8" />}
                </div>
            )}

            {/* Message Content */}
            <div className={`max-w-[70%] ${isMe ? 'items-end flex flex-col' : ''}`}>
                {/* Sender Name */}
                {!isMe && showAvatar && (
                    <div className="text-xs text-gray-500 ml-1 mb-1">{message.sender?.username}</div>
                )}

                {/* Reply Reference */}
                {message.replyTo && (
                    <div className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-1 mb-1 border-l-2 border-indigo-400 truncate max-w-[200px]">
                        <i className="fa-solid fa-reply mr-1" />
                        {message.replyTo.content}
                    </div>
                )}

                {/* Message Bubble */}
                <div className="relative">
                    <div
                        className={`
                            px-4 py-2.5 rounded-2xl text-sm shadow-sm relative
                            ${isMe
                                ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-br-sm'
                                : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                            }
                            ${message.isDeleted ? 'italic opacity-60' : ''}
                        `}
                    >
                        {message.isDeleted ? (
                            <span className="text-gray-400">Tin nhắn đã xóa</span>
                        ) : (
                            <>
                                {message.content}
                                {message.isEdited && (
                                    <span className="text-[10px] opacity-60 ml-1">(đã sửa)</span>
                                )}
                            </>
                        )}

                        {/* File Attachment */}
                        {message.fileUrl && !message.isDeleted && (
                            <div className="mt-2">
                                {message.fileType?.startsWith('image/') ? (
                                    <img
                                        src={message.fileUrl}
                                        alt="attachment"
                                        className="max-w-[200px] rounded-lg cursor-pointer hover:opacity-90"
                                        onClick={() => window.open(message.fileUrl, '_blank')}
                                    />
                                ) : (
                                    <a
                                        href={message.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-gray-100'}`}
                                    >
                                        <i className="fa-solid fa-file" />
                                        <span className="truncate max-w-[150px]">{message.fileName}</span>
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions Menu */}
                    {showActions && !message.isDeleted && (
                        <div className={`absolute top-0 ${isMe ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} flex items-center gap-1 px-2`}>
                            <button
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-xs"
                                title="Thêm reaction"
                            >
                                😊
                            </button>
                            <button
                                onClick={() => onReply?.(message)}
                                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-xs"
                                title="Trả lời"
                            >
                                <i className="fa-solid fa-reply" />
                            </button>
                            {isMe && (
                                <>
                                    <button
                                        onClick={() => onEdit?.(message)}
                                        className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-xs"
                                        title="Chỉnh sửa"
                                    >
                                        <i className="fa-solid fa-pen" />
                                    </button>
                                    <button
                                        onClick={() => onDelete?.(message)}
                                        className="w-7 h-7 rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 flex items-center justify-center text-xs"
                                        title="Xóa"
                                    >
                                        <i className="fa-solid fa-trash" />
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Quick Emoji Picker */}
                    {showEmojiPicker && (
                        <div className={`absolute ${isMe ? 'right-0' : 'left-0'} -bottom-10 bg-white rounded-full shadow-lg border border-gray-100 px-2 py-1 flex gap-1 z-10`}>
                            {EMOJI_LIST.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => handleReaction(emoji)}
                                    className="w-7 h-7 hover:bg-gray-100 rounded-full flex items-center justify-center text-lg transition-transform hover:scale-125"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Reactions Display */}
                {Object.keys(groupedReactions).length > 0 && (
                    <div className={`flex gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                        {Object.entries(groupedReactions).map(([emoji, data]) => (
                            <button
                                key={emoji}
                                onClick={() => handleReaction(emoji)}
                                className={`
                                    flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors
                                    ${data.hasMe
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                    }
                                `}
                                title={data.users.join(', ')}
                            >
                                <span>{emoji}</span>
                                <span>{data.count}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Timestamp & Read Status */}
                <div className={`flex items-center gap-1 text-[10px] text-gray-400 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
                    {formatTime(message.sentAt || Date.now())}
                    {isMe && message.seenBy?.length > 0 && (
                        <i className="fa-solid fa-check-double text-indigo-500" title="Đã xem" />
                    )}
                </div>
            </div>
        </div>
    );
}
