import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

/**
 * SubtaskSuggestionPanel — AI-powered subtask suggestions for CreateIssueModal.
 *
 * Shows a "✨ Gợi ý Sub-tasks" button that calls the smart-assistant API
 * with the issue title + description, then displays a checkbox list of
 * suggested subtasks grouped by category.
 *
 * Props:
 *   - title: current issue title (string)
 *   - description: current issue description (string)
 *   - onAccept: callback(selectedSubtasks[]) when user accepts
 */

const CATEGORY_CONFIG = {
    backend:   { label: 'Backend',   icon: 'fa-server',        color: 'bg-blue-100 text-blue-700 border-blue-200' },
    frontend:  { label: 'Frontend',  icon: 'fa-palette',       color: 'bg-purple-100 text-purple-700 border-purple-200' },
    devops:    { label: 'DevOps',    icon: 'fa-cloud-arrow-up', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    testing:   { label: 'Testing',   icon: 'fa-flask-vial',    color: 'bg-green-100 text-green-700 border-green-200' },
    auth:      { label: 'Auth',      icon: 'fa-shield-halved', color: 'bg-red-100 text-red-700 border-red-200' },
    reporting: { label: 'Reporting', icon: 'fa-chart-pie',     color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

export default function SubtaskSuggestionPanel({ title, description, onAccept }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [hasAccepted, setHasAccepted] = useState(false);

    const canSuggest = title && title.trim().length >= 3;

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['smart-subtasks', title, description],
        queryFn: async () => {
            return (await apiClient.get(ENDPOINTS.SMART_ASSISTANT.SUGGEST_SUBTASKS(title, description))).data;
        },
        enabled: false, // manual trigger only
        staleTime: 5 * 60 * 1000,
    });

    const handleGenerate = () => {
        if (!canSuggest) return;
        setIsOpen(true);
        setSelected(new Set());
        setHasAccepted(false);
        refetch();
    };

    const handleToggle = (subtaskTitle) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(subtaskTitle)) {
                next.delete(subtaskTitle);
            } else {
                next.add(subtaskTitle);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        if (!data?.suggestions) return;
        if (selected.size === data.suggestions.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(data.suggestions.map(s => s.title)));
        }
    };

    const handleAccept = () => {
        if (selected.size === 0) return;
        const accepted = data.suggestions.filter(s => selected.has(s.title));
        onAccept?.(accepted);
        setHasAccepted(true);
        setIsOpen(false);
    };

    // Group suggestions by category
    const grouped = {};
    if (data?.suggestions) {
        for (const s of data.suggestions) {
            if (!grouped[s.category]) grouped[s.category] = [];
            grouped[s.category].push(s);
        }
    }

    return (
        <div className="space-y-2">
            {/* Trigger Button */}
            <button
                type="button"
                onClick={handleGenerate}
                disabled={!canSuggest || isLoading || isFetching}
                title={!canSuggest ? 'Nhập tiêu đề ít nhất 3 ký tự' : 'AI gợi ý các sub-task cho issue này'}
                className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-2 ${
                    !canSuggest
                        ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                        : hasAccepted
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-gradient-to-r from-violet-50 to-purple-50 text-purple-700 border-purple-200 hover:from-violet-100 hover:to-purple-100 hover:border-purple-300 hover:shadow-sm'
                }`}
            >
                {isLoading || isFetching ? (
                    <>
                        <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                        Đang phân tích...
                    </>
                ) : hasAccepted ? (
                    <>
                        <i className="fa-solid fa-check text-xs" />
                        Đã thêm sub-tasks — Nhấn lại để tạo thêm
                    </>
                ) : (
                    <>
                        <i className="fa-solid fa-wand-magic-sparkles text-xs" />
                        ✨ Gợi ý Sub-tasks thông minh
                    </>
                )}
            </button>

            {/* Results Panel */}
            {isOpen && data && !isLoading && (
                <div className="border border-purple-200 rounded-xl bg-white shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600">
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-wand-magic-sparkles text-white text-xs" />
                            <span className="text-sm font-semibold text-white">
                                Gợi ý Sub-tasks
                            </span>
                            {data.totalMatched > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                                    {data.suggestions?.length || 0} gợi ý
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="w-6 h-6 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors flex items-center justify-center text-xs"
                        >
                            <i className="fa-solid fa-times" />
                        </button>
                    </div>

                    {data.suggestions?.length === 0 ? (
                        /* No suggestions */
                        <div className="p-6 text-center">
                            <i className="fa-solid fa-magnifying-glass text-gray-300 text-2xl mb-2" />
                            <p className="text-sm text-gray-500">
                                Không tìm thấy gợi ý phù hợp.
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                Thử thêm từ khóa vào tiêu đề như: api, frontend, deploy, test, login, report...
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Matched Keywords */}
                            {data.matchedKeywords?.length > 0 && (
                                <div className="px-4 py-2 bg-purple-50 border-b border-purple-100 flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] text-purple-500 font-semibold uppercase tracking-wider">Từ khóa:</span>
                                    {data.matchedKeywords.map((kw, i) => (
                                        <span key={i} className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 text-[10px] font-medium">
                                            {kw}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Select All */}
                            <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selected.size === (data.suggestions?.length || 0) && selected.size > 0}
                                        onChange={handleSelectAll}
                                        className="w-3.5 h-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-xs text-gray-600 font-medium">Chọn tất cả</span>
                                </label>
                                <span className="text-[10px] text-gray-400">
                                    {selected.size}/{data.suggestions?.length || 0} đã chọn
                                </span>
                            </div>

                            {/* Grouped Suggestions */}
                            <div className="max-h-64 overflow-y-auto">
                                {Object.entries(grouped).map(([category, items]) => {
                                    const config = CATEGORY_CONFIG[category] || { label: category, icon: 'fa-circle', color: 'bg-gray-100 text-gray-600' };
                                    return (
                                        <div key={category} className="border-b border-gray-50 last:border-b-0">
                                            {/* Category Header */}
                                            <div className="px-4 py-1.5 bg-gray-50 flex items-center gap-2">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${config.color}`}>
                                                    <i className={`fa-solid ${config.icon}`} />
                                                    {config.label}
                                                </span>
                                            </div>
                                            {/* Items */}
                                            {items.map((suggestion, idx) => (
                                                <label
                                                    key={idx}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50/50 cursor-pointer transition-colors group"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selected.has(suggestion.title)}
                                                        onChange={() => handleToggle(suggestion.title)}
                                                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 flex-shrink-0"
                                                    />
                                                    <span className="text-sm text-gray-700 group-hover:text-purple-700 transition-colors flex-1">
                                                        {suggestion.title}
                                                    </span>
                                                    {suggestion.relevanceScore >= 80 && (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-600">
                                                            Phù hợp cao
                                                        </span>
                                                    )}
                                                </label>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer / Accept */}
                            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                    <i className="fa-solid fa-microchip" />
                                    {data.method}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleAccept}
                                    disabled={selected.size === 0}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                                        selected.size === 0
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-sm hover:shadow-md'
                                    }`}
                                >
                                    <i className="fa-solid fa-check text-xs" />
                                    Chấp nhận ({selected.size})
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
