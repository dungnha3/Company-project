import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useWebSocketStore } from '@shared/stores/websocketStore';
import EmojiPicker from './EmojiPicker';

import { formatBytes } from '@shared/utils/formatters';

export default function MessageInput({ roomId, replyTo, onCancelReply, onMessageSent }) {
    const { sendMessage } = useWebSocketStore();
    const [inputValue, setInputValue] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [attachedFile, setAttachedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    // File upload mutation
    const uploadFileMutation = useMutation({
        mutationFn: async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            return (await apiClient.post(ENDPOINTS.CHAT.UPLOAD_FILE(roomId), formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })).data;
        }
    });

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!inputValue.trim() && !attachedFile) return;

        let fileUrl = null;
        let fileName = null;
        let fileType = null;

        // Upload file first if attached
        if (attachedFile) {
            try {
                setUploading(true);
                const result = await uploadFileMutation.mutateAsync(attachedFile);
                fileUrl = result.url;
                fileName = attachedFile.name;
                fileType = attachedFile.type;
            } catch (err) {
                console.error('File upload failed:', err);
                return;
            } finally {
                setUploading(false);
            }
        }

        // Send message via WebSocket
        sendMessage('/app/chat.sendMessage', {
            roomId,
            content: inputValue.trim() || (fileName ? `📎 ${fileName}` : ''),
            type: fileUrl ? 'FILE' : 'TEXT',
            fileUrl,
            fileName,
            fileType,
            replyToId: replyTo?.id,
        });

        setInputValue('');
        setAttachedFile(null);
        onCancelReply?.();
        onMessageSent?.();
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            // Max 10MB
            if (file.size > 10 * 1024 * 1024) {
                alert('File quá lớn (tối đa 10MB)');
                return;
            }
            setAttachedFile(file);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const insertEmoji = (emoji) => {
        setInputValue(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    return (
        <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            {/* Reply Preview */}
            {replyTo && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-blue-50 rounded-lg text-sm">
                    <i className="fa-solid fa-reply text-blue-500" />
                    <span className="text-gray-500">Đang trả lời</span>
                    <span className="font-medium text-gray-700">{replyTo.senderName}</span>
                    <span className="text-gray-400 truncate flex-1">{replyTo.content}</span>
                    <button onClick={onCancelReply} className="text-gray-400 hover:text-gray-600">
                        <i className="fa-solid fa-times" />
                    </button>
                </div>
            )}

            {/* File Preview */}
            {attachedFile && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                    {attachedFile.type.startsWith('image/') ? (
                        <img
                            src={URL.createObjectURL(attachedFile)}
                            alt="preview"
                            className="w-12 h-12 object-cover rounded"
                        />
                    ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            <i className="fa-solid fa-file text-gray-500" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-700 truncate">{attachedFile.name}</div>
                        <div className="text-xs text-gray-400">
                            {formatBytes(attachedFile.size)}
                        </div>
                    </div>
                    <button
                        onClick={() => setAttachedFile(null)}
                        className="text-gray-400 hover:text-red-500"
                    >
                        <i className="fa-solid fa-times" />
                    </button>
                </div>
            )}

            {/* Input Form */}
            <form
                onSubmit={handleSend}
                className="flex gap-2 items-end bg-gray-50 px-4 py-3 rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all"
            >
                {/* File Attach */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                    title="Đính kèm file"
                >
                    <i className="fa-solid fa-paperclip" />
                </button>

                {/* Text Input */}
                <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Nhập tin nhắn..."
                    rows={1}
                    className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-gray-400 resize-none max-h-24"
                    style={{ minHeight: '24px' }}
                />

                {/* Emoji Button */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                        title="Emoji"
                    >
                        <i className="fa-regular fa-face-smile" />
                    </button>
                    {showEmojiPicker && (
                        <EmojiPicker
                            onSelect={insertEmoji}
                            onClose={() => setShowEmojiPicker(false)}
                        />
                    )}
                </div>

                {/* Send Button */}
                <button
                    type="submit"
                    disabled={(!inputValue.trim() && !attachedFile) || uploading}
                    className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center disabled:opacity-40 disabled:from-gray-300 disabled:to-gray-400 hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
                >
                    {uploading ? (
                        <i className="fa-solid fa-spinner fa-spin text-sm" />
                    ) : (
                        <i className="fa-solid fa-paper-plane text-sm" />
                    )}
                </button>
            </form>
        </div>
    );
}
