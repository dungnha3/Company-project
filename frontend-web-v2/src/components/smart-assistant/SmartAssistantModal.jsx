import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import TaskAssignmentPanel from './TaskAssignmentPanel';

const TABS = [
    { key: 'dashboard', label: 'Tổng quan', icon: 'fa-chart-line' },
    { key: 'kanban', label: 'Kanban', icon: 'fa-columns' },
    { key: 'sprint', label: 'Sprint', icon: 'fa-bolt' },
    { key: 'hr', label: 'Đánh giá', icon: 'fa-star' },
];

export default function SmartAssistantModal({ project, sprint, onClose }) {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showTaskAssignment, setShowTaskAssignment] = useState(false);

    const projectId = project?.projectId;
    const sprintId = sprint?.sprintId || null;

    const { data: summary, isLoading: loadingSummary } = useQuery({
        queryKey: ['smart-summary', projectId, sprintId],
        queryFn: async () => {
            return (await apiClient.get(ENDPOINTS.SMART_ASSISTANT.SUMMARY(projectId, sprintId))).data;
        },
        enabled: !!projectId,
    });

    const { data: workload, isLoading: loadingWorkload } = useQuery({
        queryKey: ['smart-workload', projectId],
        queryFn: async () => {
            return (await apiClient.get(ENDPOINTS.SMART_ASSISTANT.WORKLOAD(projectId))).data;
        },
        enabled: !!projectId && (activeTab === 'kanban' || activeTab === 'dashboard'),
    });

    const { data: sprintHealth, isLoading: loadingSprintHealth } = useQuery({
        queryKey: ['smart-sprint-health', sprintId],
        queryFn: async () => {
            return (await apiClient.get(ENDPOINTS.SMART_ASSISTANT.SPRINT_HEALTH(sprintId))).data;
        },
        enabled: !!sprintId && (activeTab === 'sprint' || activeTab === 'dashboard'),
    });

    const { data: sprintPrediction, isLoading: loadingPrediction } = useQuery({
        queryKey: ['sprint-prediction', sprintId],
        queryFn: async () => {
            return (await apiClient.get(ENDPOINTS.SMART_ASSISTANT.SPRINT_PREDICTION(sprintId))).data;
        },
        enabled: !!sprintId && activeTab === 'sprint',
    });

    const isLoading = loadingSummary || loadingWorkload || loadingSprintHealth || loadingPrediction;

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-500';
        if (score >= 40) return 'text-orange-500';
        return 'text-red-600';
    };

    const getBgColor = (score) => {
        if (score >= 80) return 'bg-green-50 border-green-200';
        if (score >= 60) return 'bg-yellow-50 border-yellow-200';
        if (score >= 40) return 'bg-orange-50 border-orange-200';
        return 'bg-red-50 border-red-200';
    };

    const getWorkloadColor = (level) => {
        if (level === 'QUÁ_TẢI') return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' };
        if (level === 'BẬN') return { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' };
        if (level === 'BÌNH_THƯỜNG') return { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' };
        return { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' };
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
                 style={{ maxWidth: '900px' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-purple-600">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <i className="fa-solid fa-robot text-white text-lg" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Trợ lý thông minh</h2>
                            <p className="text-indigo-200 text-xs">{project?.name || 'Dự án'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors flex items-center justify-center">
                        <i className="fa-solid fa-times" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 bg-gray-50 px-4">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                                activeTab === tab.key
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <i className={`fa-solid ${tab.icon} text-xs`} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <i className="fa-solid fa-circle-notch fa-spin text-3xl text-indigo-500" />
                        </div>
                    ) : (
                        <>
                            {/* ===== DASHBOARD TAB ===== */}
                            {activeTab === 'dashboard' && (
                                <div className="space-y-4">
                                    {/* Sprint Delay Alert (from Holt's prediction) */}
                                    {sprintHealth?.sprint && (
                                        <SprintDelayAlert projectId={projectId} sprintId={sprintId} />
                                    )}

                                    {/* SmartEstimate Quick Widget */}
                                    <SmartEstimateWidget projectId={projectId} />

                                    {/* Workload Summary */}
                                    {(workload || summary?.workload) && (() => {
                                        const wl = workload || summary?.workload;
                                        if (!wl?.members?.length) return null;
                                        return (
                                            <div className="rounded-xl border border-gray-200 p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <i className="fa-solid fa-users text-purple-500" />
                                                        <span className="font-semibold text-gray-700">Workload Team</span>
                                                    </div>
                                                    <span className="text-sm text-gray-500">Balance: <strong>{wl?.balanceScore || 0}%</strong></span>
                                                </div>
                                                <div className="space-y-2">
                                                    {wl.members.slice(0, 5).map(m => {
                                                        const colors = getWorkloadColor(m.workloadLevel);
                                                        return (
                                                            <div key={m.userId} className="flex items-center gap-3">
                                                                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                                    {m.fullName?.charAt(0)?.toUpperCase()}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm font-medium text-gray-700 truncate">{m.fullName}</span>
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${colors.bg} ${colors.text}`}>
                                                                            {m.workloadLevel?.replace('_', ' ')}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <span className="text-[10px] text-gray-400">{m.activeTasks} task</span>
                                                                        <span className="text-[10px] text-gray-400">•</span>
                                                                        <span className="text-[10px] text-gray-400">{m.totalHours || 0}h</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Top Insights */}
                                    {summary?.topInsights?.length > 0 && (
                                        <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <i className="fa-solid fa-lightbulb text-purple-500" />
                                                <span className="font-semibold text-gray-700">Insights</span>
                                            </div>
                                            <div className="space-y-1">
                                                {summary.topInsights.map((insight, i) => (
                                                    <div key={i} className="text-sm text-gray-600">• {insight}</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Backlog + Deadline warnings */}
                                    {(summary?.backlogCount > 0 || summary?.deadlineWarnings?.length > 0) && (
                                        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 space-y-2">
                                            {summary.backlogCount > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <i className="fa-solid fa-inbox text-amber-500" />
                                                    <span className="text-sm text-gray-700">
                                                        <strong>{summary.backlogCount}</strong> issue chưa được giao việc
                                                    </span>
                                                </div>
                                            )}
                                            {summary.deadlineWarnings?.length > 0 && (
                                                <div className="space-y-1">
                                                    {summary.deadlineWarnings.slice(0, 3).map(w => (
                                                        <div key={w.issueId} className="text-sm text-red-700">
                                                            ⚠️ <strong>{w.issueKey}</strong>: {w.title} ({w.type === 'overdue' ? 'Đã trễ' : 'Sắp deadline'})
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {!sprintHealth && !workload && !summary?.topInsights?.length && (
                                        <div className="text-center py-16 text-gray-400">
                                            <i className="fa-solid fa-robot text-4xl mb-3 opacity-30" />
                                            <p>Chưa có dữ liệu để phân tích</p>
                                            <p className="text-xs mt-1">Hãy tạo sprint và giao việc để xem insights</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ===== KANBAN TAB ===== */}
                            {activeTab === 'kanban' && (
                                <div className="space-y-4">
                                    {/* Workload */}
                                    {workload?.members?.length > 0 && (
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="font-semibold text-gray-700">
                                                    <i className="fa-solid fa-users mr-2 text-purple-500" />
                                                    Workload Team
                                                </h3>
                                                <span className="text-sm text-gray-500">Balance: <strong className={workload?.balanceScore >= 70 ? 'text-green-600' : workload?.balanceScore >= 40 ? 'text-yellow-600' : 'text-red-600'}>
                                                    {workload?.balanceScore || 0}%
                                                </strong></span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {workload.members.map(m => {
                                                    const colors = getWorkloadColor(m.workloadLevel);
                                                    return (
                                                        <div key={m.userId} className={`rounded-lg border p-3 ${colors.bg}`}>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="w-7 h-7 rounded-full bg-white text-center flex items-center justify-center text-xs font-bold">
                                                                    {m.fullName?.charAt(0)?.toUpperCase()}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-sm font-medium text-gray-800 truncate">{m.fullName}</div>
                                                                    <div className="text-[10px] text-gray-500">{m.activeTasks} task • {m.totalHours || 0}h</div>
                                                                </div>
                                                            </div>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${colors.bg} ${colors.text}`}>
                                                                {m.workloadLevel?.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Deadline warnings */}
                                    {summary?.deadlineWarnings?.length > 0 && (
                                        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                                            <h3 className="font-semibold text-red-700 mb-2">
                                                <i className="fa-solid fa-clock mr-2" />
                                                Cảnh báo deadline
                                            </h3>
                                            <div className="space-y-1">
                                                {summary.deadlineWarnings.map(w => (
                                                    <div key={w.issueId} className="text-sm text-red-700">
                                                        {w.type === 'overdue' ? '🔴' : '🟡'} <strong>{w.issueKey}</strong>: {w.title}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Task Assignment Button */}
                                    {summary?.backlogCount > 0 && (
                                        <button
                                            onClick={() => setShowTaskAssignment(true)}
                                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                        >
                                            <i className="fa-solid fa-robot" />
                                            Lập kế hoạch giao việc ({summary.backlogCount} issue)
                                        </button>
                                    )}

                                    {summary?.backlogCount === 0 && (
                                        <div className="text-center py-12 text-gray-400">
                                            <i className="fa-solid fa-check-circle text-4xl text-green-400 mb-3" />
                                            <p className="font-medium text-green-600">Tất cả issue đã được giao việc</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ===== SPRINT TAB ===== */}
                            {activeTab === 'sprint' && (
                                <div className="space-y-4">
                                    {sprintPrediction ? (
                                        <>
                                            {/* Sprint Alert */}
                                            <div className={`rounded-xl border p-4 ${
                                                sprintPrediction.alertLevel === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                                                sprintPrediction.alertLevel === 'WARNING' ? 'bg-amber-50 border-amber-200' :
                                                'bg-green-50 border-green-200'
                                            }`}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <i className={`fa-solid fa-chart-line ${
                                                            sprintPrediction.alertLevel === 'CRITICAL' ? 'text-red-500' :
                                                            sprintPrediction.alertLevel === 'WARNING' ? 'text-amber-500' :
                                                            'text-green-500'
                                                        }`} />
                                                        <span className="font-semibold text-gray-700">
                                                            {sprintPrediction.sprintName || 'Sprint'}
                                                        </span>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                        sprintPrediction.alertLevel === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                                        sprintPrediction.alertLevel === 'WARNING' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-green-100 text-green-700'
                                                    }`}>
                                                        {sprintPrediction.alertLevel === 'CRITICAL' ? '⚠️ Nguy hiểm' :
                                                         sprintPrediction.alertLevel === 'WARNING' ? '⚡ Cảnh báo' : '✅ Tốt'}
                                                    </span>
                                                </div>

                                                {/* Progress bar */}
                                                <div className="mb-3">
                                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                        <span>Tiến độ: {sprintPrediction.completedIssues || 0}/{sprintPrediction.totalIssues || 0} issues</span>
                                                        <span>{sprintPrediction.daysRemaining || 0} ngày còn lại</span>
                                                    </div>
                                                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all ${
                                                            sprintPrediction.alertLevel === 'CRITICAL' ? 'bg-red-500' :
                                                            sprintPrediction.alertLevel === 'WARNING' ? 'bg-amber-500' :
                                                            'bg-green-500'
                                                        }`} style={{ width: `${Math.min(((sprintPrediction.completedIssues || 0) / (sprintPrediction.totalIssues || 1)) * 100, 100)}%` }} />
                                                    </div>
                                                </div>

                                                {/* Key metric */}
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="text-center">
                                                        <p className="text-3xl font-bold text-gray-800">
                                                            {sprintPrediction.onTimeConfidence != null
                                                                ? Math.round(sprintPrediction.onTimeConfidence * 100)
                                                                : '—'}%
                                                        </p>
                                                        <p className="text-xs text-gray-500">Khả năng hoàn thành đúng hạn</p>
                                                    </div>
                                                    {sprintPrediction.predictedCompletionDate && (
                                                        <div className="border-l border-gray-300 pl-3">
                                                            <p className="text-sm text-gray-600">
                                                                Dự kiến xong: <strong>{sprintPrediction.predictedCompletionDate}</strong>
                                                            </p>
                                                            {sprintPrediction.autoTuningInfo && (
                                                                <p className="text-[10px] text-purple-500">
                                                                    AI tuned: α={sprintPrediction.autoTuningInfo.alpha} β={sprintPrediction.autoTuningInfo.beta}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Recommendations */}
                                                {sprintPrediction.recommendations?.length > 0 && (
                                                    <div className="space-y-1">
                                                        {sprintPrediction.recommendations.slice(0, 3).map((rec, i) => (
                                                            <div key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                                                <i className="fa-solid fa-lightbulb text-amber-500 mt-0.5 text-xs" />
                                                                <span>{rec}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => window.location.href = `/app/projects/${projectId}/sprints`}
                                                    className="mt-3 w-full py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <i className="fa-solid fa-arrow-right" />
                                                    Xem chi tiết Sprint
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-16 text-gray-400">
                                            <i className="fa-solid fa-bolt text-4xl mb-3 opacity-30" />
                                            <p>Chưa có sprint đang hoạt động</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ===== HR TAB ===== */}
                            {activeTab === 'hr' && (
                                <div className="space-y-4">
                                    <HRPerformanceInsights projectId={projectId} />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Task Assignment Panel (overlay) */}
            {showTaskAssignment && (
                <div className="absolute inset-0 z-10">
                    <TaskAssignmentPanel
                        projectId={projectId}
                        onClose={() => setShowTaskAssignment(false)}
                    />
                </div>
            )}
        </div>
    );
}

// ─── Sprint Delay Alert (Holt's prediction) ─────────────────────────────────
function SprintDelayAlert({ projectId, sprintId }) {
    const { data: prediction } = useQuery({
        queryKey: ['sprint-prediction', sprintId],
        queryFn: async () => {
            return (await apiClient.get(ENDPOINTS.SMART_ASSISTANT.SPRINT_PREDICTION(sprintId))).data;
        },
        enabled: !!sprintId,
    });

    if (!prediction?.alertLevel || prediction.alertLevel === 'OK') return null;

    return (
        <div className={`rounded-xl border p-4 ${
            prediction.alertLevel === 'CRITICAL' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
        }`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <i className={`fa-solid fa-chart-line ${
                        prediction.alertLevel === 'CRITICAL' ? 'text-red-500' : 'text-amber-500'
                    }`} />
                    <span className="font-semibold text-gray-700">Sprint Alert</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    prediction.alertLevel === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                    {prediction.alertLevel === 'CRITICAL' ? 'Nguy hiểm' : 'Cảnh báo'}
                </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Confidence hoàn thành đúng hạn:</span>
                <strong className={prediction.alertLevel === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'}>
                        {' '}{prediction.onTimeConfidence != null ? Math.round(prediction.onTimeConfidence * 100) : '—'}%
                    </strong>
                <span>{prediction.daysRemaining} ngày còn lại</span>
            </div>
            {prediction.recommendations?.length > 0 && (
                <p className="text-xs text-gray-500 italic">💡 {prediction.recommendations[0]}</p>
            )}
            <button
                onClick={() => window.location.href = `/app/projects/${projectId}/sprints`}
                className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
                <i className="fa-solid fa-arrow-right" />Xem chi tiết
            </button>
        </div>
    );
}

// ─── SmartEstimate Quick Widget ─────────────────────────────────────────────
function SmartEstimateWidget({ projectId }) {
    const [selectedAssignee, setSelectedAssignee] = useState(null);
    const [weight, setWeight] = useState(5);
    const [estimate, setEstimate] = useState(null);

    const { data: members = [] } = useQuery({
        queryKey: ['project-members', projectId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.MEMBERS(projectId));
            return res.data || [];
        },
        enabled: !!projectId,
    });

    const fetchEstimate = async () => {
        if (!selectedAssignee || !projectId) return;
        try {
            const res = await apiClient.get(ENDPOINTS.SMART_ASSISTANT.ESTIMATE(projectId, 'TASK', weight, selectedAssignee));
            setEstimate(res.data);
        } catch { /* ignore */ }
    };

    return (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <div className="flex items-center gap-2 mb-3">
                <i className="fa-solid fa-wand-magic-sparkles text-amber-500" />
                    <span className="font-semibold text-gray-700">Ước tính giờ nhanh</span>
            </div>
            <div className="flex gap-2 mb-2">
                <select
                    value={selectedAssignee || ''}
                    onChange={e => setSelectedAssignee(e.target.value ? Number(e.target.value) : null)}
                    className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                >
                    <option value="">Chọn người làm</option>
                    {members.map(m => (
                        <option key={m.userId || m.user?.userId} value={m.userId || m.user?.userId}>
                            {m.fullName || m.user?.fullName || 'N/A'}
                        </option>
                    ))}
                </select>
                <input
                    type="number" min="1" max="10" value={weight}
                    onChange={e => setWeight(Number(e.target.value))}
                    className="w-16 text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-center bg-white"
                />
                <button
                    onClick={fetchEstimate} disabled={!selectedAssignee}
                    className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 disabled:opacity-50"
                >Ước tính</button>
            </div>
            {estimate && (
                <div className="bg-white rounded-lg p-3 border border-amber-200">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl font-bold text-amber-600">{estimate.suggestedHours}</span>
                        <span className="text-sm text-gray-400">gio</span>
                        {estimate.method && (
                            <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold ${
                                estimate.method === 'OLS' ? 'bg-purple-100 text-purple-700' :
                                estimate.method === 'Heuristic' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-500'
                            }`}>{estimate.method}</span>
                        )}
                    </div>
                    {estimate.explanation ? (
                        <p className="text-xs text-gray-600 leading-relaxed">{estimate.explanation}</p>
                    ) : (
                        <p className="text-xs text-gray-500">{estimate.basis}</p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── HR Performance Insights Sub-component ────────────────────────────────
function HRPerformanceInsights({ projectId }) {
    const { data: pendingReviews = [] } = useQuery({
        queryKey: ['reviews-pending', projectId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.REVIEWS.PENDING);
            return res.data || [];
        },
        enabled: true,
    });

    const { data: recentReviews = [] } = useQuery({
        queryKey: ['reviews-recent', projectId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.REVIEWS.LIST, {
                params: { size: 20, ...(projectId ? { projectId } : {}) }
            });
            const data = res.data;
            return Array.isArray(data) ? data : (data?.content || []);
        },
        enabled: true,
    });

    const validScores = recentReviews
        .filter(r => r.totalScore != null)
        .map(r => {
            const t = typeof r.totalScore === 'number' ? r.totalScore : parseFloat(r.totalScore);
            return isNaN(t) ? null : t;
        })
        .filter(s => s !== null);

    const teamAvg = validScores.length > 0
        ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
        : null;

    const withEmployee = recentReviews.filter(r => r.employee);
    const topPerformer = withEmployee.length > 0
        ? withEmployee.reduce((best, r) => {
            const cur = typeof r.totalScore === 'number' ? r.totalScore : parseFloat(r.totalScore);
            const bestScore = typeof best.totalScore === 'number' ? best.totalScore : parseFloat(best.totalScore);
            return (isNaN(cur) ? 0 : cur) > (isNaN(bestScore) ? 0 : bestScore) ? r : best;
        }, withEmployee[0])
        : null;

    const needsImprovement = withEmployee.length > 0
        ? withEmployee.reduce((worst, r) => {
            const cur = typeof r.totalScore === 'number' ? r.totalScore : parseFloat(r.totalScore);
            const worstScore = typeof worst.totalScore === 'number' ? worst.totalScore : parseFloat(worst.totalScore);
            return (isNaN(cur) ? 10 : cur) < (isNaN(worstScore) ? 0 : worstScore) ? r : worst;
        }, withEmployee[0])
        : null;

    const pendingCount = pendingReviews.length;

    const getScoreColor = (score) => {
        if (score == null) return 'text-gray-400';
        const s = typeof score === 'number' ? score : parseFloat(score);
        if (s >= 8) return 'text-green-600';
        if (s >= 6) return 'text-indigo-600';
        if (s >= 4) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getBgColor = (score) => {
        if (score == null) return 'bg-gray-50 border-gray-200';
        const s = typeof score === 'number' ? score : parseFloat(score);
        if (s >= 8) return 'bg-green-50 border-green-200';
        if (s >= 6) return 'bg-indigo-50 border-indigo-200';
        if (s >= 4) return 'bg-yellow-50 border-yellow-200';
        return 'bg-red-50 border-red-200';
    };

    const getScoreNum = (score) => {
        if (score == null) return '—';
        const s = typeof score === 'number' ? score : parseFloat(score);
        return isNaN(s) ? '—' : s.toFixed(1);
    };

    if (recentReviews.length === 0) {
        return (
            <div className="text-center py-16 text-gray-400">
                <i className="fa-solid fa-user-check text-4xl mb-3 opacity-30" />
                <p className="font-medium text-gray-600">Chưa có dữ liệu đánh giá</p>
                <p className="text-xs mt-1">Hoàn thành các đánh giá để xem insights</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Top stats row */}
            <div className="grid grid-cols-2 gap-3">
                {/* Team Average */}
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-center">
                    <p className="text-xs text-indigo-500 font-medium mb-1">Team Average</p>
                    <p className={`text-3xl font-bold ${getScoreColor(teamAvg)}`}>{teamAvg ?? '—'}</p>
                    <p className="text-[10px] text-indigo-400">/10</p>
                </div>
                {/* Pending Reviews */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                    <p className="text-xs text-amber-500 font-medium mb-1">Chờ duyệt</p>
                    <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
                    <p className="text-[10px] text-amber-400">reviews</p>
                </div>
            </div>

            {/* Top performer */}
            {topPerformer && topPerformer.employee && (
                <div className={`rounded-xl border p-4 ${getBgColor(topPerformer.totalScore)}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-200 text-green-700 flex items-center justify-center text-sm font-bold">
                            {topPerformer.employee.fullName?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-gray-500">Top Performer</p>
                            <p className="font-bold text-gray-800">{topPerformer.employee.fullName}</p>
                        </div>
                        <div className="text-right">
                            <p className={`text-2xl font-bold ${getScoreColor(topPerformer.totalScore)}`}>{getScoreNum(topPerformer.totalScore)}</p>
                            <p className="text-[10px] text-gray-400">{topPerformer.reviewPeriod}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Needs Improvement */}
            {needsImprovement && needsImprovement.employee && (
                <div className={`rounded-xl border p-4 ${getBgColor(needsImprovement.totalScore)}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-200 text-orange-700 flex items-center justify-center text-sm font-bold">
                            {needsImprovement.employee.fullName?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-gray-500">Cần cải thiện</p>
                            <p className="font-bold text-gray-800">{needsImprovement.employee.fullName}</p>
                        </div>
                        <div className="text-right">
                            <p className={`text-2xl font-bold ${getScoreColor(needsImprovement.totalScore)}`}>{getScoreNum(needsImprovement.totalScore)}</p>
                            <p className="text-[10px] text-gray-400">{needsImprovement.reviewPeriod}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending list */}
            {pendingCount > 0 && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <h4 className="font-semibold text-amber-700 mb-2">
                        <i className="fa-solid fa-clock mr-2" />
                        Reviews chờ duyệt ({pendingCount})
                    </h4>
                    <div className="space-y-1">
                        {pendingReviews.slice(0, 5).map(review => (
                            <div key={review.reviewId || review.id} className="flex items-center justify-between text-sm">
                                <span className="text-amber-700">
                                    {review.employee?.fullName || 'N/A'} — {review.reviewPeriod}
                                </span>
                                <span className={`font-bold ${getScoreColor(review.totalScore)}`}>
                                    {getScoreNum(review.totalScore)}
                                </span>
                            </div>
                        ))}
                        {pendingCount > 5 && (
                            <p className="text-xs text-amber-500">+{pendingCount - 5} reviews khác</p>
                        )}
                    </div>
                </div>
            )}

            {/* Quick action */}
            <button
                onClick={() => window.location.href = '/hr/reviews'}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
                <i className="fa-solid fa-arrow-right" />
                Đến trang HR Reviews
            </button>
        </div>
    );
}
