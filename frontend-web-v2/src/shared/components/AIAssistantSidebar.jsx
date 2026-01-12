import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { useToast } from '@app/providers/ToastProvider';

import { ENDPOINTS } from '@shared/api/endpoints';

const QUICK_ACTIONS = [
    { id: 'summarize', icon: 'fa-file-lines', label: 'Tóm tắt dự án', endpoint: ENDPOINTS.AI.SUMMARIZE_PROJECT },
    { id: 'sprint', icon: 'fa-layer-group', label: 'Sprint hiện tại', endpoint: ENDPOINTS.AI.SPRINT_SUMMARY },
    { id: 'suggest', icon: 'fa-lightbulb', label: 'Gợi ý công việc', endpoint: ENDPOINTS.AI.SUGGEST_TASKS },
    { id: 'analyze', icon: 'fa-chart-line', label: 'Phân tích tiến độ', endpoint: ENDPOINTS.AI.ANALYZE_PROGRESS },
];

export default function AIAssistantSidebar({ isOpen, onClose, projectId }) {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [conversationId, setConversationId] = useState(null);
    const messagesEndRef = useRef(null);
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // Check AI status
    const { data: aiStatus } = useQuery({
        queryKey: ['ai-status'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.AI.STATUS)).data,
        staleTime: 60000,
    });

    // Chat mutation
    const chatMutation = useMutation({
        mutationFn: async (userMessage) => {
            const response = await apiClient.post(ENDPOINTS.AI.CHAT, {
                message: userMessage,
                projectId,
                conversationId,
            });
            return response.data;
        },
        onSuccess: (data) => {
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
            if (data.conversationId) setConversationId(data.conversationId);
        },
        onError: (err) => {
            showToast(err.response?.data?.message || 'AI không phản hồi', 'error');
        },
    });

    // Quick action mutation
    const quickActionMutation = useMutation({
        mutationFn: async (endpoint) => {
            const response = await apiClient.get(endpoint);
            return response.data;
        },
        onSuccess: (data) => {
            setMessages(prev => [...prev, { role: 'assistant', content: data.response || data.summary || JSON.stringify(data) }]);
        },
        onError: (err) => {
            showToast(err.response?.data?.message || 'Lỗi thực hiện quick action', 'error');
        },
    });

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!message.trim() || chatMutation.isPending) return;

        setMessages(prev => [...prev, { role: 'user', content: message }]);
        chatMutation.mutate(message);
        setMessage('');
    };

    const handleQuickAction = (action) => {
        if (!projectId) {
            showToast('Vui lòng chọn một dự án', 'warning');
            return;
        }
        setMessages(prev => [...prev, { role: 'user', content: `🚀 ${action.label}` }]);
        quickActionMutation.mutate(action.endpoint(projectId));
    };

    const handleNewChat = () => {
        setMessages([]);
        setConversationId(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-indigo-500 to-purple-600">
                <div className="flex items-center gap-2 text-white">
                    <i className="fa-solid fa-robot text-xl" />
                    <div>
                        <h3 className="font-bold">AI Assistant</h3>
                        <span className="text-xs opacity-80">
                            {aiStatus?.available ? 'Online' : 'Đang kiểm tra...'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleNewChat}
                        className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Cuộc trò chuyện mới"
                    >
                        <i className="fa-solid fa-plus" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <i className="fa-solid fa-times" />
                    </button>
                </div>
            </div>

            {/* Quick Actions */}
            {messages.length === 0 && (
                <div className="p-4 border-b border-gray-100">
                    <p className="text-sm text-gray-500 mb-3">Quick Actions:</p>
                    <div className="grid grid-cols-2 gap-2">
                        {QUICK_ACTIONS.map(action => (
                            <button
                                key={action.id}
                                onClick={() => handleQuickAction(action)}
                                disabled={quickActionMutation.isPending || !projectId}
                                className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-indigo-50 rounded-lg text-left transition-colors disabled:opacity-50"
                            >
                                <i className={`fa-solid ${action.icon} text-indigo-500`} />
                                <span className="text-sm text-gray-700">{action.label}</span>
                            </button>
                        ))}
                    </div>
                    {!projectId && (
                        <p className="text-xs text-orange-500 mt-2">
                            <i className="fa-solid fa-info-circle mr-1" />
                            Chọn một dự án để sử dụng Quick Actions
                        </p>
                    )}
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center py-8">
                        <i className="fa-solid fa-comments text-4xl text-gray-200 mb-3" />
                        <p className="text-gray-400 text-sm">
                            Xin chào! Tôi có thể giúp gì cho bạn?
                        </p>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user'
                                    ? 'bg-indigo-500 text-white rounded-br-md'
                                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                                    }`}
                            >
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </div>
                    ))
                )}
                {(chatMutation.isPending || quickActionMutation.isPending) && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 p-3 rounded-2xl rounded-bl-md">
                            <i className="fa-solid fa-spinner fa-spin text-indigo-500" />
                            <span className="text-sm text-gray-500 ml-2">Đang suy nghĩ...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-gray-100 bg-gray-50">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Nhập tin nhắn..."
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        disabled={chatMutation.isPending}
                    />
                    <button
                        type="submit"
                        disabled={!message.trim() || chatMutation.isPending}
                        className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        <i className="fa-solid fa-paper-plane" />
                    </button>
                </div>
            </form>
        </div>
    );
}
