import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

export default function AIAssistantPage() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [input, setInput] = useState('');
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [activeQuickAction, setActiveQuickAction] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Fetch conversation history
    const { data: conversations = [] } = useQuery({
        queryKey: ['ai-conversations'],
        queryFn: async () => {
            try { return (await apiClient.get(ENDPOINTS.AI.CONVERSATIONS)).data; }
            catch { return []; }
        },
    });

    // Fetch conversation detail
    const { data: conversationData } = useQuery({
        queryKey: ['ai-conversation', activeConversation],
        queryFn: async () => {
            try { return (await apiClient.get(ENDPOINTS.AI.CONVERSATION_BY_ID(activeConversation))).data; }
            catch { return null; }
        },
        enabled: !!activeConversation,
    });

    useEffect(() => {
        if (conversationData?.messages) setMessages(conversationData.messages);
    }, [conversationData]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Send message
    const sendMutation = useMutation({
        mutationFn: async (prompt) => (await apiClient.post(ENDPOINTS.AI.CHAT, { prompt, conversationId: activeConversation })).data,
        onSuccess: (data) => {
            setMessages(prev => [...prev, { role: 'assistant', content: data.response || data.message || data }]);
            if (data.conversationId && !activeConversation) setActiveConversation(data.conversationId);
            queryClient.invalidateQueries(['ai-conversations']);
            setIsStreaming(false);
        },
        onError: (err) => { showToast(err.response?.data?.message || 'AI Ä‘ang báº­n, thá»­ láº¡i sau', 'error'); setIsStreaming(false); },
    });

    // Delete conversation
    const deleteMutation = useMutation({
        mutationFn: (id) => apiClient.delete(ENDPOINTS.AI.DELETE_CONVERSATION(id)),
        onSuccess: () => {
            queryClient.invalidateQueries(['ai-conversations']);
            if (activeConversation) { setActiveConversation(null); setMessages([]); }
        },
    });

    const handleSend = () => {
        const prompt = input.trim();
        if (!prompt || isStreaming) return;
        setMessages(prev => [...prev, { role: 'user', content: prompt }]);
        setInput('');
        setIsStreaming(true);
        sendMutation.mutate(prompt);
    };

    const handleQuickAction = (action) => {
        setActiveQuickAction(action.key);
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: action.prompt }]);
        setIsStreaming(true);
        sendMutation.mutate(action.prompt);
    };

    const QUICK_ACTIONS = [
        { key: 'performance', label: 'PhÃ¢n tÃ­ch hiá»‡u suáº¥t', desc: 'ÄÃ¡nh giÃ¡ KPI & nÄƒng suáº¥t', icon: 'fa-chart-line', color: 'bg-indigo-50 text-indigo-600', prompt: 'PhÃ¢n tÃ­ch hiá»‡u suáº¥t KPI vÃ  nÄƒng suáº¥t team' },
        { key: 'forecast', label: 'Dá»± bÃ¡o nghá»‰ viá»‡c', desc: 'Nháº­n diá»‡n rá»§i ro rá»i Ä‘i sá»›m', icon: 'fa-user-minus', color: 'bg-amber-50 text-amber-600', prompt: 'Dá»± bÃ¡o vÃ  phÃ¢n tÃ­ch rá»§i ro nghá»‰ viá»‡c cá»§a nhÃ¢n viÃªn' },
        { key: 'recruit', label: 'Gá»£i Ã½ tuyá»ƒn dá»¥ng', desc: 'TÃ¬m á»©ng viÃªn phÃ¹ há»£p', icon: 'fa-user-plus', color: 'bg-green-50 text-green-600', prompt: 'Gá»£i Ã½ tuyá»ƒn dá»¥ng vÃ  tÃ¬m á»©ng viÃªn phÃ¹ há»£p cho cÃ¡c vá»‹ trÃ­ Ä‘ang tuyá»ƒn' },
        { key: 'report', label: 'TÃ³m táº¯t bÃ¡o cÃ¡o', desc: 'Tá»•ng há»£p dá»¯ liá»‡u nhanh', icon: 'fa-file-lines', color: 'bg-purple-50 text-purple-600', prompt: 'TÃ³m táº¯t bÃ¡o cÃ¡o tá»•ng há»£p dá»¯ liá»‡u nhÃ¢n sá»±' },
    ];

    // Group conversations by date
    const todayConversations = conversations.filter(c => {
        const d = new Date(c.createdAt || c.updatedAt);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    });
    const olderConversations = conversations.filter(c => {
        const d = new Date(c.createdAt || c.updatedAt);
        const today = new Date();
        return d.toDateString() !== today.toDateString();
    });

    return (
        <div className="flex h-[calc(100vh-120px)] gap-0 rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
            {/* Left Sidebar â€” Conversation History */}
            <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50/80">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm" style={{ background: 'linear-gradient(135deg, #5048e5, #7c3aed)' }}>
                            <i className="fa-solid fa-robot" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Trá»£ lÃ½ AI WorkFlow</h3>
                            <p className="text-[10px] text-gray-400">Sáºµn sÃ ng há»— trá»£ báº¡n</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-2">
                    {todayConversations.length > 0 && (
                        <>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">HÃ´m nay</p>
                            {todayConversations.map(conv => (
                                <ConversationItem key={conv.id} conv={conv} active={activeConversation === conv.id}
                                    onClick={() => setActiveConversation(conv.id)}
                                    onDelete={() => deleteMutation.mutate(conv.id)} />
                            ))}
                        </>
                    )}
                    {olderConversations.length > 0 && (
                        <>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mt-3 mb-1">7 ngÃ y trÆ°á»›c</p>
                            {olderConversations.map(conv => (
                                <ConversationItem key={conv.id} conv={conv} active={activeConversation === conv.id}
                                    onClick={() => setActiveConversation(conv.id)}
                                    onDelete={() => deleteMutation.mutate(conv.id)} />
                            ))}
                        </>
                    )}
                    {conversations.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-xs">ChÆ°a cÃ³ cuá»™c trÃ² chuyá»‡n</div>
                    )}
                </div>

                {/* User profile at bottom */}
                <div className="p-3 border-t border-gray-200">
                    <button
                        onClick={() => { setActiveConversation(null); setMessages([]); inputRef.current?.focus(); }}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                        <i className="fa-solid fa-plus text-[10px]" /> Cuá»™c há»™i thoáº¡i má»›i
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                {/* Header Breadcrumb */}
                <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Trang chá»§</span>
                        <i className="fa-solid fa-chevron-right text-[8px]" />
                        <span>Trung tÃ¢m PhÃ¢n tÃ­ch AI</span>
                    </div>
                    <button className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                        <i className="fa-solid fa-download" /> Xuáº¥t bÃ¡o cÃ¡o
                    </button>
                </div>

                {/* Analytics Dashboard / Chat */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {messages.length === 0 ? (
                        /* Analytics Dashboard View */
                        <div className="space-y-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Tá»•ng quan NhÃ¢n sá»± ThÃ´ng minh</h1>
                                <p className="text-sm text-gray-500">ThÃ´ng tin chi tiáº¿t vÃ  dá»± bÃ¡o dá»±a trÃªn dá»¯ liá»‡u thá»i gian thá»±c.</p>
                            </div>

                            {/* Quick Action Cards â€” matching Stitch */}
                            <div className="grid grid-cols-4 gap-4">
                                {QUICK_ACTIONS.map(action => (
                                    <button
                                        key={action.key}
                                        onClick={() => handleQuickAction(action)}
                                        className={`flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-white hover:shadow-md hover:border-indigo-600/20 transition-all text-left group ${activeQuickAction === action.key ? 'ring-2 ring-indigo-600/30' : ''
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color} flex-shrink-0`}>
                                            <i className={`fa-solid ${action.icon} text-sm`} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 mb-0.5">{action.label}</p>
                                            <p className="text-xs text-gray-400 leading-tight">{action.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Charts Row â€” matching Stitch layout */}
                            <div className="grid grid-cols-3 gap-4">
                                {/* Line Chart â€” Dá»± bÃ¡o biáº¿n Ä‘á»™ng nhÃ¢n sá»± */}
                                <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">Dá»± bÃ¡o biáº¿n Ä‘á»™ng nhÃ¢n sá»±</h3>
                                            <p className="text-xs text-gray-400">Dá»± Ä‘oÃ¡n tÄƒng trÆ°á»Ÿng trong 6 thÃ¡ng tá»›i</p>
                                        </div>
                                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+12%</span>
                                    </div>
                                    {/* Placeholder chart */}
                                    <div className="h-48 flex items-end gap-1 px-2">
                                        {[35, 40, 45, 52, 60, 72, 80, 84].map((h, i) => (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                                <div
                                                    className="w-full rounded-t-md transition-all"
                                                    style={{
                                                        height: `${h * 1.8}px`,
                                                        background: i >= 5 ? 'linear-gradient(to top, #5048e5, #818cf8)' : 'var(--color-primary)',
                                                        opacity: i >= 5 ? 0.5 : 1,
                                                        borderStyle: i >= 5 ? 'dashed' : 'solid',
                                                    }}
                                                />
                                                <span className="text-[10px] text-gray-400">T{i + 1}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-400">
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-indigo-600 rounded-full" /> Thá»±c táº¿</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#818cf8] rounded-full opacity-50" /> Dá»± bÃ¡o</span>
                                    </div>
                                </div>

                                {/* Right column â€” Donut + Heatmap */}
                                <div className="space-y-4">
                                    {/* Donut â€” Má»©c Ä‘á»™ gáº¯n káº¿t */}
                                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 p-5">
                                        <h3 className="font-semibold text-gray-900 text-sm mb-3">PhÃ¢n tÃ­ch má»©c Ä‘á»™ gáº¯n káº¿t</h3>
                                        <div className="flex items-center justify-center">
                                            <div className="relative w-28 h-28">
                                                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                                                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-primary)" strokeWidth="3"
                                                        strokeDasharray="97.4" strokeDashoffset="14.6" strokeLinecap="round" />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-2xl font-bold text-gray-900">85%</span>
                                                    <span className="text-[10px] text-gray-400">TÃ­ch cá»±c</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400 text-center mt-2">Má»©c Ä‘á»™ hÃ i lÃ²ng tá»•ng thá»ƒ vÃ  sá»± gáº¯n káº¿t</p>
                                    </div>

                                    {/* Heatmap â€” Rá»§i ro nghá»‰ viá»‡c */}
                                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 p-5">
                                        <h3 className="font-semibold text-gray-900 text-sm mb-3">Báº£n Ä‘á»“ nhiá»‡t rá»§i ro nghá»‰ viá»‡c</h3>
                                        <div className="space-y-2.5">
                                            {[
                                                { dept: 'PhÃ²ng IT', level: 90, color: 'bg-red-500', label: 'Cao' },
                                                { dept: 'Marketing', level: 45, color: 'bg-amber-400', label: 'TB' },
                                                { dept: 'PhÃ²ng HR', level: 20, color: 'bg-green-400', label: 'Tháº¥p' },
                                            ].map(item => (
                                                <div key={item.dept} className="flex items-center gap-3">
                                                    <span className="text-xs text-gray-600 w-20 truncate">{item.dept}</span>
                                                    <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                                                        <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${item.level}%` }} />
                                                    </div>
                                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${item.label === 'Cao' ? 'bg-red-100 text-red-600' :
                                                            item.label === 'TB' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
                                                        }`}>{item.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Chat Messages View */
                        <div className="space-y-4 max-w-3xl mx-auto">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
                                    {msg.role === 'assistant' && (
                                        <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs" style={{ background: 'linear-gradient(135deg, #5048e5, #7c3aed)' }}>
                                            <i className="fa-solid fa-robot" />
                                        </div>
                                    )}
                                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-tr-md'
                                            : 'bg-gray-100 text-gray-800 rounded-tl-md'
                                        }`}>
                                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                    </div>
                                </div>
                            ))}
                            {isStreaming && (
                                <div className="flex justify-start gap-3">
                                    <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs" style={{ background: 'linear-gradient(135deg, #5048e5, #7c3aed)' }}>
                                        <i className="fa-solid fa-robot" />
                                    </div>
                                    <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3">
                                        <div className="flex gap-1.5">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Chat Input Bar â€” Stitch style */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50">
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-3 max-w-3xl mx-auto">
                        <div className="relative flex-1">
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Há»i AI vá» dá»¯ liá»‡u nhÃ¢n sá»±â€¦"
                                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                                disabled={isStreaming}
                                autoComplete="off"
                                spellCheck={true}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!input.trim() || isStreaming}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40"
                            style={{ background: 'linear-gradient(135deg, #5048e5, #7c3aed)' }}
                            aria-label="Gá»­i tin nháº¯n"
                        >
                            <i className={`fa-solid ${isStreaming ? 'fa-spinner fa-spin' : 'fa-arrow-right'} text-sm`} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

function ConversationItem({ conv, active, onClick, onDelete }) {
    return (
        <div
            className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm ${active ? 'bg-indigo-600/10 text-indigo-600' : 'hover:bg-gray-100 text-gray-600'
                }`}
            onClick={onClick}
        >
            <i className="fa-solid fa-circle text-[4px] flex-shrink-0" />
            <span className="truncate flex-1 text-xs">{conv.title || 'Cuá»™c trÃ² chuyá»‡n'}</span>
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                aria-label="XÃ³a cuá»™c trÃ² chuyá»‡n"
            >
                <i className="fa-solid fa-xmark text-xs" />
            </button>
        </div>
    );
}




