import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';

export default function ScoreSuggestionPanel({ issueId, employeeId, reviewPeriod, onApply }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const queryKey = issueId
        ? ['smart-score-suggestion-issue', issueId]
        : ['smart-score-suggestion-employee', employeeId, reviewPeriod];

    const { data: suggestion, isLoading, isFetching } = useQuery({
        queryKey,
        queryFn: async () => {
            if (issueId) {
                return (await apiClient.get(ENDPOINTS.SMART_ASSISTANT.SCORE_SUGGESTION_ISSUE(issueId))).data;
            } else {
                return (await apiClient.get(ENDPOINTS.SMART_ASSISTANT.SCORE_SUGGESTION_EMPLOYEE(employeeId, reviewPeriod || ''))).data;
            }
        },
        enabled: isExpanded,
    });

    const handleApply = (score) => {
        onApply?.(score);
        setIsExpanded(false);
    };

    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors flex items-center gap-1.5"
            >
                <i className="fa-solid fa-wand-magic-sparkles text-[10px]" />
                Gợi ý điểm
            </button>
        );
    }

    return (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <i className="fa-solid fa-wand-magic-sparkles text-amber-500" />
                    <span className="text-sm font-semibold text-gray-700">Gợi ý điểm thông minh</span>
                </div>
                <div className="flex items-center gap-2">
                    {isFetching && <i className="fa-solid fa-circle-notch fa-spin text-xs text-amber-500" />}
                    <button
                        onClick={() => setIsExpanded(false)}
                        className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>
            </div>

            {isLoading || isFetching ? (
                <div className="text-center py-4 text-gray-400 text-xs">
                    <i className="fa-solid fa-circle-notch fa-spin mr-1" />
                    Đang phân tích...
                </div>
            ) : (
                <>
                    {/* QuickScore suggestion */}
                    {suggestion?.suggestedScore !== undefined && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-2xl font-bold text-amber-600">{suggestion.suggestedScore}</span>
                                    <span className="text-sm text-gray-400">/10</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    suggestion.confidence === 'high' ? 'bg-green-100 text-green-700' :
                                    suggestion.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                    Độ tin cậy: {suggestion.confidence === 'high' ? 'Cao' : suggestion.confidence === 'medium' ? 'Trung bình' : 'Thấp'}
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all"
                                    style={{ width: `${(suggestion.suggestedScore / 10) * 100}%` }}
                                />
                                <div
                                    className="absolute top-0 h-full w-0.5 bg-gray-800 animate-pulse"
                                    style={{ left: `${(suggestion.suggestedScore / 10) * 100}%` }}
                                />
                            </div>

                            {/* Reasons */}
                            {suggestion.reasons?.length > 0 && (
                                <div className="space-y-1.5">
                                    {suggestion.reasons.map((reason, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs">
                                            <span className={`flex items-center gap-1 ${
                                                reason.type === 'negative' ? 'text-red-500' :
                                                reason.type === 'positive' ? 'text-green-600' :
                                                reason.type === 'warning' ? 'text-amber-500' :
                                                'text-gray-500'
                                            }`}>
                                                {reason.type === 'positive' ? '✅' :
                                                 reason.type === 'negative' ? '❌' :
                                                 reason.type === 'warning' ? '⚠️' : 'ℹ️'}
                                                {reason.label}
                                            </span>
                                            <span className={`font-semibold ${
                                                reason.impact > 0 ? 'text-green-600' :
                                                reason.impact < 0 ? 'text-red-500' :
                                                'text-gray-400'
                                            }`}>
                                                {reason.impact > 0 ? '+' : ''}{reason.impact.toFixed(1)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => handleApply(suggestion.suggestedScore)}
                                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                                Sử dụng điểm này ({suggestion.suggestedScore}/10) →
                            </button>
                        </div>
                    )}

                    {/* Full review suggestion */}
                    {suggestion?.suggestedScores && (
                        <div className="space-y-3">
                            {/* Employee insights */}
                            {suggestion.employeeInsights && (
                                <div className="bg-white rounded-lg p-3 border border-amber-100">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">📊 Employee Insights:</p>
                                    <div className="space-y-1 text-xs text-gray-600">
                                        {suggestion.employeeInsights.totalTasks > 0 && (
                                            <p>• Đã hoàn thành <strong>{suggestion.employeeInsights.totalTasks}</strong> task trong kỳ</p>
                                        )}
                                        {suggestion.employeeInsights.averageScore && (
                                            <p>• Điểm TB: <strong>{suggestion.employeeInsights.averageScore}</strong>
                                                {suggestion.employeeInsights.trend > 0 && (
                                                    <span className="text-green-600 ml-1">↑ {suggestion.employeeInsights.trend} so với kỳ trước</span>
                                                )}
                                                {suggestion.employeeInsights.trend < 0 && (
                                                    <span className="text-red-500 ml-1">↓ {suggestion.employeeInsights.trend} so với kỳ trước</span>
                                                )}
                                            </p>
                                        )}
                                        {suggestion.employeeInsights.onTimeRate > 0 && (
                                            <p>• Tỷ lệ đúng hạn: <strong>{suggestion.employeeInsights.onTimeRate}%</strong></p>
                                        )}
                                        {suggestion.employeeInsights.reworkCount > 0 && (
                                            <p>• Có <strong>{suggestion.employeeInsights.reworkCount}</strong> task cần rework</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Suggested scores */}
                            <div className="space-y-2">
                                {[
                                    { label: 'Chuyên môn', field: 'technicalScore', basis: suggestion.suggestedScores.basis?.technicalScore },
                                    { label: 'Thái độ', field: 'attitudeScore', basis: suggestion.suggestedScores.basis?.attitudeScore },
                                    { label: 'Kỹ năng mềm', field: 'softSkillsScore', basis: suggestion.suggestedScores.basis?.softSkillsScore },
                                    { label: 'Làm việc nhóm', field: 'teamworkScore', basis: suggestion.suggestedScores.basis?.teamworkScore },
                                ].map(item => (
                                    <div key={item.field} className="flex items-center justify-between">
                                        <div>
                                            <span className="text-sm text-gray-700">{item.label}</span>
                                            {item.basis && (
                                                <span className="ml-2 text-[10px] text-gray-400">({item.basis})</span>
                                            )}
                                        </div>
                                        <span className="font-bold text-amber-600">{suggestion.suggestedScores[item.field]}/10</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => handleApply({
                                    technicalScore: suggestion.suggestedScores.technicalScore,
                                    attitudeScore: suggestion.suggestedScores.attitudeScore,
                                    softSkillsScore: suggestion.suggestedScores.softSkillsScore,
                                    teamworkScore: suggestion.suggestedScores.teamworkScore,
                                })}
                                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                                Áp dụng tất cả →
                            </button>

                            <div className="relative">
                                <select
                                    onChange={(e) => {
                                        const field = e.target.value;
                                        if (!field) return;
                                        const fieldMap = {
                                            'technicalScore': suggestion.suggestedScores.technicalScore,
                                            'attitudeScore': suggestion.suggestedScores.attitudeScore,
                                            'softSkillsScore': suggestion.suggestedScores.softSkillsScore,
                                            'teamworkScore': suggestion.suggestedScores.teamworkScore,
                                        };
                                        handleApply({ [field]: fieldMap[field] });
                                        e.target.value = '';
                                    }}
                                    className="w-full py-2 px-3 border border-amber-200 bg-white text-gray-600 rounded-lg text-sm hover:bg-amber-50 transition-colors cursor-pointer"
                                    defaultValue=""
                                >
                                    <option value="">Chỉ áp dụng 1 tiêu chí ▼</option>
                                    <option value="technicalScore">Chuyên môn ({suggestion.suggestedScores.technicalScore})</option>
                                    <option value="attitudeScore">Thái độ ({suggestion.suggestedScores.attitudeScore})</option>
                                    <option value="softSkillsScore">Kỹ năng mềm ({suggestion.suggestedScores.softSkillsScore})</option>
                                    <option value="teamworkScore">Làm việc nhóm ({suggestion.suggestedScores.teamworkScore})</option>
                                </select>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
