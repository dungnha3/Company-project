import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import TaskAssignmentPanel from './TaskAssignmentPanel';
import InsightCard from './common/InsightCard';

const TABS = [
    { key: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
    { key: 'kanban', label: 'Kanban', icon: 'fa-columns' },
    { key: 'sprint', label: 'Sprint', icon: 'fa-bolt' },
    { key: 'hr', label: 'HR', icon: 'fa-user-check' },
];

export default function SmartAssistantModal({ project, sprint, onClose }) {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showTaskAssignment, setShowTaskAssignment] = useState(false);

    const projectId = project?.projectId;
    const sprintId = sprint?.sprintId || null;

    const { data: summary, isLoading: loadingSummary } = useQuery({
        queryKey: ['smart-summary', projectId, sprintId],
        queryFn: async () => {
            const params = new URLSearchParams({ action: 'summary' });
            if (projectId) params.append('projectId', projectId);
            if (sprintId) params.append('sprintId', sprintId);
            return (await apiClient.get(`/api/smart-assistant?${params.toString()}`)).data;
        },
        enabled: !!projectId,
    });

    const { data: workload, isLoading: loadingWorkload } = useQuery({
        queryKey: ['smart-workload', projectId],
        queryFn: async () => {
            return (await apiClient.get(`/api/smart-assistant?action=workload&projectId=${projectId}`)).data;
        },
        enabled: !!projectId && (activeTab === 'kanban' || activeTab === 'dashboard'),
    });

    const { data: sprintHealth, isLoading: loadingSprintHealth } = useQuery({
        queryKey: ['smart-sprint-health', sprintId],
        queryFn: async () => {
            return (await apiClient.get(`/api/smart-assistant?action=sprint-health&sprintId=${sprintId}`)).data;
        },
        enabled: !!sprintId && (activeTab === 'sprint' || activeTab === 'dashboard'),
    });

    const { data: projectRisk, isLoading: loadingRisk } = useQuery({
        queryKey: ['smart-risk', projectId],
        queryFn: async () => {
            return (await apiClient.get(`/api/smart-assistant?action=project-risk&projectId=${projectId}`)).data;
        },
        enabled: !!projectId && (activeTab === 'sprint' || activeTab === 'dashboard'),
    });

    const isLoading = loadingSummary || loadingWorkload || loadingSprintHealth || loadingRisk;

    const getScoreColor = (score, type = 'health') => {
        if (type === 'risk') {
            if (score >= 70) return 'text-red-600';
            if (score >= 50) return 'text-orange-500';
            if (score >= 25) return 'text-yellow-500';
            return 'text-green-600';
        }
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-500';
        if (score >= 40) return 'text-orange-500';
        return 'text-red-600';
    };

    const getBgColor = (score, type = 'health') => {
        if (type === 'risk') {
            if (score >= 70) return 'bg-red-50 border-red-200';
            if (score >= 50) return 'bg-orange-50 border-orange-200';
            if (score >= 25) return 'bg-yellow-50 border-yellow-200';
            return 'bg-green-50 border-green-200';
        }
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
                                    {/* Sprint Health */}
                                    {(sprintHealth || summary?.sprintHealth) && (() => {
                                        const sh = sprintHealth || summary?.sprintHealth;
                                        return (
                                            <div className={`rounded-xl border p-4 ${getBgColor(sh?.healthScore, 'health')}`}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <i className="fa-solid fa-heart-pulse text-indigo-500" />
                                                        <span className="font-semibold text-gray-700">Sprint Health</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-2xl font-bold ${getScoreColor(sh?.healthScore, 'health')}`}>{sh?.healthScore || 0}</span>
                                                        <span className="text-sm text-gray-400">/100</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${sh?.healthScore >= 80 ? 'bg-green-100 text-green-700' : sh?.healthScore >= 60 ? 'bg-yellow-100 text-yellow-700' : sh?.healthScore >= 40 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                                            {sh?.label || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                                {/* Metrics */}
                                                <div className="space-y-2">
                                                    {[
                                                        { label: 'Completion Rate', value: sh?.metrics?.completionRate, weight: '30%' },
                                                        { label: 'On-Time Rate', value: sh?.metrics?.onTimeRate, weight: '25%' },
                                                        { label: 'Rework Rate', value: sh?.metrics?.reworkRate, weight: '20%' },
                                                        { label: 'Velocity Accuracy', value: sh?.metrics?.velocityAccuracy, weight: '15%' },
                                                        { label: 'Burnout Risk', value: sh?.metrics?.burnoutRisk, weight: '10%', inverted: true },
                                                    ].map(m => (
                                                        <div key={m.label} className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-500 w-32">{m.label}</span>
                                                            <div className="flex-1 h-2 bg-white/80 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${m.inverted ? (m.value > 50 ? 'bg-red-400' : 'bg-green-400') : 'bg-indigo-500'}`}
                                                                    style={{ width: `${Math.min(m.value || 0, 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-medium text-gray-600 w-8 text-right">{m.value || 0}%</span>
                                                            <span className="text-[10px] text-gray-400 w-7">{m.weight}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {sh?.recommendation && (
                                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                                        <span className="text-sm text-gray-600 italic">💡 {sh.recommendation}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Project Risk */}
                                    {(projectRisk || summary?.projectRisk) && (() => {
                                        const pr = projectRisk || summary?.projectRisk;
                                        if (!pr) return null;
                                        return (
                                            <div className={`rounded-xl border p-4 ${getBgColor(pr?.riskScore, 'risk')}`}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <i className="fa-solid fa-triangle-exclamation text-orange-500" />
                                                        <span className="font-semibold text-gray-700">Project Risk</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-2xl font-bold ${getScoreColor(pr?.riskScore, 'risk')}`}>{pr?.riskScore || 0}</span>
                                                        <span className="text-sm text-gray-400">/100</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${pr?.riskScore >= 70 ? 'bg-red-100 text-red-700' : pr?.riskScore >= 50 ? 'bg-orange-100 text-orange-700' : pr?.riskScore >= 25 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                            {pr?.label || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                                {pr?.riskFactors?.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {pr.riskFactors.filter(f => f.score >= 15).map((f, i) => (
                                                            <span key={i} className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                                f.severity === 'high' ? 'bg-red-100 text-red-700' : f.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                                ⚠️ {f.label}: {f.score}%
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {pr?.recommendations?.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                                        {pr.recommendations.slice(0, 2).map((r, i) => (
                                                            <div key={i} className="text-sm text-gray-600 italic">💡 {r}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

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

                                    {/* Backlog count */}
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

                                    {!sprintHealth && !projectRisk && !workload && (
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
                                    {sprintHealth ? (
                                        <>
                                            {/* Sprint Info */}
                                            {sprintHealth.sprint && (
                                                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h3 className="font-bold text-indigo-800">{sprintHealth.sprint.name}</h3>
                                                            <div className="flex items-center gap-4 mt-1 text-sm text-indigo-600">
                                                                <span>Actual: <strong>{sprintHealth.sprint.actualHours || 0}h</strong> / {sprintHealth.sprint.estimatedHours || 0}h</span>
                                                                <span>{sprintHealth.sprint.daysRemaining}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`text-4xl font-bold ${getScoreColor(sprintHealth.healthScore, 'health')}`}>
                                                                {sprintHealth.healthScore}
                                                            </div>
                                                            <div className={`px-2 py-0.5 rounded text-xs font-bold ${
                                                                sprintHealth.healthScore >= 80 ? 'bg-green-200 text-green-800' :
                                                                sprintHealth.healthScore >= 60 ? 'bg-yellow-200 text-yellow-800' :
                                                                sprintHealth.healthScore >= 40 ? 'bg-orange-200 text-orange-800' : 'bg-red-200 text-red-800'
                                                            }`}>
                                                                {sprintHealth.label}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Metrics */}
                                            <div className="grid grid-cols-5 gap-3">
                                                {[
                                                    { label: 'Hoàn thành', value: sprintHealth.metrics?.completionRate, color: 'bg-blue-500' },
                                                    { label: 'Đúng hạn', value: sprintHealth.metrics?.onTimeRate, color: 'bg-green-500' },
                                                    { label: 'Không rework', value: sprintHealth.metrics?.reworkRate, color: 'bg-purple-500' },
                                                    { label: 'Velocity', value: sprintHealth.metrics?.velocityAccuracy, color: 'bg-cyan-500' },
                                                    { label: 'Burnout', value: 100 - (sprintHealth.metrics?.burnoutRisk || 0), color: 'bg-pink-500' },
                                                ].map(m => (
                                                    <div key={m.label} className="text-center rounded-xl bg-gray-50 p-3">
                                                        <div className={`text-2xl font-bold ${getScoreColor(m.value, 'health')}`}>{m.value || 0}%</div>
                                                        <div className="text-[10px] text-gray-500 mt-1">{m.label}</div>
                                                        <div className={`h-1 mt-2 rounded-full ${m.color}`} style={{ width: `${Math.min(m.value || 0, 100)}%` }} />
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-16 text-gray-400">
                                            <i className="fa-solid fa-bolt text-4xl mb-3 opacity-30" />
                                            <p>Chưa có sprint đang hoạt động</p>
                                        </div>
                                    )}

                                    {projectRisk && (
                                        <div className={`rounded-xl border p-4 ${getBgColor(projectRisk.riskScore, 'risk')}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-semibold text-gray-700">Rủi ro dự án</span>
                                                <span className={`font-bold ${getScoreColor(projectRisk.riskScore, 'risk')}`}>{projectRisk.riskScore}/100</span>
                                            </div>
                                            {projectRisk.riskFactors?.length > 0 && (
                                                <div className="space-y-1">
                                                    {projectRisk.riskFactors.filter(f => f.score >= 15).map((f, i) => (
                                                        <div key={i} className="text-sm text-gray-600">
                                                            ⚠️ {f.label}: {f.description}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ===== HR TAB ===== */}
                            {activeTab === 'hr' && (
                                <div className="space-y-4">
                                    <div className="text-center py-12 text-gray-400">
                                        <i className="fa-solid fa-user-check text-4xl mb-3 opacity-30" />
                                        <p className="font-medium text-gray-600">Performance Insights</p>
                                        <p className="text-xs mt-1">Mở form đánh giá để xem gợi ý điểm</p>
                                        <button
                                            onClick={() => {
                                                onClose();
                                            }}
                                            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                                        >
                                            <i className="fa-solid fa-arrow-right mr-2" />
                                            Đến trang HR Reviews
                                        </button>
                                    </div>
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
