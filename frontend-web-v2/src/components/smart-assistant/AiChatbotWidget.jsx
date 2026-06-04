import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { smartApi } from '@shared/api/featureApi';

export default function AiChatbotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [messages, setMessages] = useState([
        {
            role: 'model',
            text: 'Xin chào! Tôi là Trợ lý dự án AI của bạn. Hãy chọn một dự án và đặt bất kỳ câu hỏi nào về tiến độ, công việc hoặc rủi ro của team.',
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const location = useLocation();
    const chatEndRef = useRef(null);

    // Fetch projects to populate dropdown
    const { data: myProjects = [] } = useQuery({
        queryKey: ['chatbot-projects'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.MY_PROJECTS);
            return Array.isArray(res.data) ? res.data : (res.data?.content || []);
        }
    });

    // Auto-detect project from URL route
    useEffect(() => {
        const match = location.pathname.match(/\/app\/projects\/(\d+)/);
        if (match) {
            setSelectedProjectId(Number(match[1]));
        } else if (myProjects.length > 0 && !selectedProjectId) {
            const firstId = myProjects[0].projectId || myProjects[0].id;
            setSelectedProjectId(firstId);
        }
    }, [location.pathname, myProjects, selectedProjectId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Listen for custom event to open chatbot programmatically
    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('open-ai-chatbot', handleOpen);
        return () => window.removeEventListener('open-ai-chatbot', handleOpen);
    }, []);

    const handleSend = async (textToSend) => {
        const text = textToSend || inputValue;
        if (!text.trim()) return;

        if (!selectedProjectId) {
            setMessages(prev => [
                ...prev,
                { role: 'user', text },
                { role: 'model', text: 'Vui lòng chọn một dự án để bắt đầu đặt câu hỏi.' }
            ]);
            setInputValue('');
            return;
        }

        // Add user message to state
        const updatedMessages = [...messages, { role: 'user', text }];
        setMessages(updatedMessages);
        if (!textToSend) setInputValue('');
        setIsLoading(true);

        try {
            // Convert state history to Gemini API format
            // Ignore the very first system greeting message if it doesn't match standard roles
            const historyForApi = updatedMessages
                .filter((m, idx) => idx > 0 || m.role === 'user') // skip intro message to keep it clean
                .map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.text }]
                }));

            const response = await smartApi.chat(selectedProjectId, historyForApi);
            setMessages(prev => [...prev, { role: 'model', text: response.text }]);
        } catch (error) {
            console.error('AI chat failed:', error);
            setMessages(prev => [
                ...prev,
                { role: 'model', text: 'Xin lỗi, không thể kết nối đến máy chủ AI lúc này. Vui lòng thử lại sau.' }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Helper to render basic markdown styles
    const formatMessageText = (text) => {
        if (!text) return '';
        let html = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\s*[-*]\s+(.*)$/gm, '<li class="ml-4 list-disc text-sm my-0.5">$1</li>')
            .replace(/\n/g, '<br />');
        return <div dangerouslySetInnerHTML={{ __html: html }} />;
    };

    const quickPrompts = [
        { label: '🐞 Ai ôm lỗi nặng nhất?', text: 'Ai đang ôm nhiều lỗi nghiêm trọng nhất trong dự án?' },
        { label: '📊 Tóm tắt tiến độ tuần qua', text: 'Hãy đúc kết nhật ký và tóm tắt ngắn gọn tiến độ tuần qua của dự án này.' },
        { label: '⚠️ Cảnh báo rủi ro trễ hạn', text: 'Dự án hiện có những rủi ro nào gây trễ hạn deadline không và đề xuất giải pháp là gì?' },
    ];

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center`}
                title="AI Project Assistant"
            >
                {isOpen ? (
                    <i className="fa-solid fa-xmark text-xl" />
                ) : (
                    <div className="relative flex items-center justify-center">
                        <i className="fa-solid fa-robot text-xl" />
                        <span className="absolute -top-2.5 -right-2.5 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-white"></span>
                        </span>
                    </div>
                )}
            </button>

            {/* Chat Drawer/Panel */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-[9998] w-[380px] sm:w-[420px] h-[580px] bg-white/95 backdrop-blur-md border border-gray-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in transition-all">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-white flex flex-col gap-2 shadow-md">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                    <i className="fa-solid fa-robot text-sm text-indigo-100" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Trợ lý AI Assistant</h3>
                                    <p className="text-[10px] text-indigo-100/90 font-medium">Hỗ trợ quản trị dự án thông minh</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>

                        {/* Project selector dropdown */}
                        <div className="flex items-center gap-1.5 bg-black/10 rounded-lg p-1.5 border border-white/5">
                            <span className="text-[10px] uppercase font-bold text-indigo-200 shrink-0 pl-1">Dự án:</span>
                            <select
                                value={selectedProjectId || ''}
                                onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
                                className="bg-transparent border-0 text-xs font-bold text-white outline-none w-full cursor-pointer focus:ring-0 select-none py-0.5"
                            >
                                <option value="" className="text-gray-800">— Chọn dự án —</option>
                                {myProjects.map(p => (
                                    <option key={p.projectId || p.id} value={p.projectId || p.id} className="text-gray-800">
                                        {p.name || p.projectName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/50">
                        {messages.map((m, idx) => (
                            <div
                                key={idx}
                                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                            >
                                <div
                                    className={`px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed max-w-[85%] shadow-sm border ${
                                        m.role === 'user'
                                            ? 'bg-indigo-600 text-white border-indigo-700/20 rounded-tr-none'
                                            : 'bg-white text-gray-850 border-gray-100 rounded-tl-none'
                                    }`}
                                >
                                    {formatMessageText(m.text)}
                                </div>
                                <span className="text-[9px] text-gray-400 mt-1 px-1 font-semibold">
                                    {m.role === 'user' ? 'Bạn' : 'Trợ lý AI'}
                                </span>
                            </div>
                        ))}

                        {/* Loading status */}
                        {isLoading && (
                            <div className="flex flex-col items-start">
                                <div className="px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                    <span className="flex h-2 w-2 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                    </span>
                                    <span className="text-[11px] text-gray-500 font-bold animate-pulse">Trợ lý đang suy nghĩ...</span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Quick Prompts Panel */}
                    {messages.length === 1 && !isLoading && (
                        <div className="p-3 bg-white border-t border-gray-100 space-y-1.5">
                            <p className="text-[10px] font-bold text-gray-450 uppercase tracking-wider pl-1 mb-1">Gợi ý nhanh</p>
                            <div className="flex flex-col gap-1.5">
                                {quickPrompts.map((p, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSend(p.text)}
                                        className="text-left text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-650 border border-gray-100 hover:border-indigo-150 p-2.5 rounded-xl transition-all"
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Chat Input Footer */}
                    <div className="p-3 bg-white border-t border-gray-150 flex items-center gap-2 shadow-inner">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={selectedProjectId ? "Đặt câu hỏi về dự án..." : "Vui lòng chọn dự án..."}
                            disabled={!selectedProjectId || isLoading}
                            rows={1}
                            className="flex-1 bg-gray-50 hover:bg-gray-100/50 border border-gray-200 focus:border-indigo-500/50 rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 resize-none max-h-16 custom-scrollbar disabled:opacity-50 disabled:bg-gray-150 cursor-text"
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={!selectedProjectId || !inputValue.trim() || isLoading}
                            className="w-8 h-8 shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white flex items-center justify-center shadow-md disabled:shadow-none transition-all duration-200 active:scale-95"
                        >
                            <i className="fa-solid fa-paper-plane text-xs" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
