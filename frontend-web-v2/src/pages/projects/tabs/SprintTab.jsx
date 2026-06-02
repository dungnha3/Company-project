import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { formatDate } from '@shared/utils/formatters';
import { useAccessControl } from '@shared/hooks/useAccessControl';
import SprintOverview from '../components/BurndownChart';
import IssueDetailModal from '../components/IssueDetailModal';
import SmartAssistantFAB from '@components/smart-assistant/SmartAssistantFAB';

// ─── Constants ─────────────────────────────────────────────────────────
const SPRINT_STATUS = {
    PLANNING: { label: 'Planning', color: 'bg-gray-100 text-gray-700' },
    ACTIVE: { label: 'Active', color: 'bg-indigo-100 text-indigo-700' },
    COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700' },
};

const ISSUE_STATUS_COLORS = {
    TODO: 'bg-gray-100 text-gray-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    IN_REVIEW: 'bg-yellow-100 text-yellow-700',
    DONE: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
};

const ISSUE_TYPE_ICONS = {
    BUG: { icon: 'fa-bug', color: 'text-red-500' },
    FEATURE: { icon: 'fa-star', color: 'text-purple-500' },
    TASK: { icon: 'fa-check-square', color: 'text-blue-500' },
    IMPROVEMENT: { icon: 'fa-arrow-up', color: 'text-green-500' },
    SUB_TASK: { icon: 'fa-code-branch', color: 'text-gray-500' },
};

const PHASE_STATUS = {
    PLANNING: { label: 'Lập kế hoạch', color: 'bg-gray-100 text-gray-700', icon: 'fa-clipboard-list' },
    IN_PROGRESS: { label: 'Đang thực hiện', color: 'bg-indigo-100 text-indigo-700', icon: 'fa-spinner' },
    COMPLETED: { label: 'Hoàn thành', color: 'bg-green-100 text-green-700', icon: 'fa-check-circle' },
    ON_HOLD: { label: 'Tạm dừng', color: 'bg-yellow-100 text-yellow-700', icon: 'fa-pause-circle' },
};

const TIMELINE_STATUS_COLORS = {
    'To Do': '#94a3b8', 'In Progress': '#6366f1', 'Review': '#a855f7', 'Done': '#22c55e',
};

// ─── Main SprintTab ─────────────────────────────────────────────────────
export default function SprintTab({ projectId }) {
    const [view, setView] = useState('sprints'); // 'sprints' | 'phases' | 'timeline'
    const [showCreateModal, setShowCreateModal] = useState(false);
    const queryClient = useQueryClient();

    const { data: sprints = [] } = useQuery({
        queryKey: ['sprints', projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.SPRINTS.BY_PROJECT(projectId))).data,
        enabled: !!projectId,
    });

    const activeSprint = sprints.find(s => s.status === 'ACTIVE');

    const VIEW_TABS = [
        { id: 'sprints', label: 'Sprints', icon: 'fa-rocket' },
        { id: 'phases', label: 'Giai đoạn', icon: 'fa-layer-group' },
        { id: 'timeline', label: 'Timeline', icon: 'fa-chart-gantt' },
    ];

    return (
        <div className="space-y-4">
            {/* View switcher */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                {VIEW_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setView(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            view === tab.id
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <i className={`fa-solid ${tab.icon}`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {view === 'sprints' && (
                <SprintView projectId={projectId} />
            )}
            {view === 'phases' && (
                <PhaseView projectId={projectId} />
            )}
            {view === 'timeline' && (
                <TimelineView projectId={projectId} />
            )}
        </div>
    );
}

// ─── Sprint View ───────────────────────────────────────────────────────
function SprintView({ projectId }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [expandedSprint, setExpandedSprint] = useState(null);
    const [showAddIssueModal, setShowAddIssueModal] = useState(null);
    const [editingSprint, setEditingSprint] = useState(null);
    const queryClient = useQueryClient();
    const toast = useToast();
    const { hasPermission } = useAccessControl();
    const canManageSprints = hasPermission('PROJECT.MANAGE_SPRINTS');
    const canManageIssues = hasPermission('PROJECT.MANAGE_ISSUES');

    const { data: sprints = [], isLoading } = useQuery({
        queryKey: ['sprints', projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.SPRINTS.BY_PROJECT(projectId))).data,
        enabled: !!projectId,
    });
    const activeSprint = sprints.find(s => s.status === 'ACTIVE');

    // ── Group sprints by phase (active sprint is handled separately)
    const groupSprintsByPhase = (sprintList) => {
        const groups = {};
        sprintList.forEach(sprint => {
            const key = sprint.phaseId != null ? `${sprint.phaseId}::${sprint.phaseName || 'Giai đoạn'}` : '__ungrouped__';
            if (!groups[key]) {
                groups[key] = {
                    phaseId: sprint.phaseId,
                    phaseName: sprint.phaseId != null ? (sprint.phaseName || 'Giai đoạn') : 'Không phân nhóm',
                    sprints: [],
                };
            }
            groups[key].sprints.push(sprint);
        });
        return Object.values(groups).sort((a, b) => {
            if (a.phaseId == null) return 1;
            if (b.phaseId == null) return -1;
            return a.phaseId - b.phaseId;
        });
    };

    const planningSprints = sprints.filter(s => s.status === 'PLANNING');
    const completedSprints = sprints.filter(s => s.status === 'COMPLETED');
    const groupedPlanning = useMemo(() => groupSprintsByPhase(planningSprints), [planningSprints]);
    const groupedCompleted = useMemo(() => groupSprintsByPhase(completedSprints), [completedSprints]);

    const startMutation = useMutation({
        mutationFn: (sprintId) => apiClient.post(ENDPOINTS.SPRINTS.START(sprintId)),
        onSuccess: () => {
            toast.success('Sprint đã bắt đầu!');
            queryClient.invalidateQueries(['sprints', projectId]);
        },
    });

    const completeMutation = useMutation({
        mutationFn: (sprintId) => apiClient.post(ENDPOINTS.SPRINTS.COMPLETE(sprintId)),
        onSuccess: () => {
            toast.success('Sprint đã hoàn thành!');
            queryClient.invalidateQueries(['sprints', projectId]);
        },
    });

    const removeMutation = useMutation({
        mutationFn: ({ sprintId, issueId }) =>
            apiClient.delete(ENDPOINTS.SPRINTS.REMOVE_ISSUE(sprintId, issueId)),
        onSuccess: (_, { sprintId }) => {
            toast.success('Đã gỡ issue khỏi sprint!');
            queryClient.invalidateQueries(['sprintIssues', sprintId]);
            queryClient.invalidateQueries(['sprints', projectId]);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (sprintId) => apiClient.delete(ENDPOINTS.SPRINTS.BY_ID(sprintId)),
        onSuccess: () => {
            toast.success('Đã xóa sprint!');
            queryClient.invalidateQueries(['sprints', projectId]);
        },
        onError: (err) => {
            toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
        },
    });

    const { data: sprintPrediction } = useQuery({
        queryKey: ['smart-sprint-prediction', activeSprint?.sprintId],
        queryFn: async () => {
            return (await apiClient.get(ENDPOINTS.SMART_ASSISTANT.SPRINT_PREDICTION(activeSprint.sprintId))).data;
        },
        enabled: !!activeSprint?.sprintId,
        staleTime: 2 * 60 * 1000,
    });

    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><i className="fa-solid fa-spinner fa-spin text-3xl text-indigo-500" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Sprint Management</h2>
                    <p className="text-sm text-gray-500">Quản lý các sprint trong dự án</p>
                </div>
                {canManageSprints && (
                    <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
                        <i className="fa-solid fa-plus" /> Tạo Sprint
                    </button>
                )}
            </div>

            {activeSprint && (
                <div className="space-y-4">
                    <div className="bg-gradient-to-r from-indigo-50 to-indigo-50 rounded-xl p-5 border border-indigo-200">
                        <div className="flex items-center justify-between mb-4">
                            <div
                                className="flex items-center gap-3 cursor-pointer select-none"
                                onClick={() => setExpandedSprint(expandedSprint === activeSprint.sprintId ? null : activeSprint.sprintId)}
                            >
                                <div className="w-10 h-10 rounded-lg bg-indigo-500 text-white flex items-center justify-center">
                                    <i className="fa-solid fa-rocket" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                                        {activeSprint.name}
                                        <i className={`fa-solid fa-chevron-${expandedSprint === activeSprint.sprintId ? 'up' : 'down'} text-xs text-gray-400`} />
                                    </h3>
                                    <span className="text-xs text-indigo-600 font-medium">ACTIVE SPRINT</span>
                                </div>
                            </div>
                            {canManageSprints && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setEditingSprint(activeSprint)}
                                        className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                                        title="Chỉnh sửa sprint"
                                    >
                                        <i className="fa-solid fa-pen" />
                                    </button>
                                    <button
                                        onClick={() => completeMutation.mutate(activeSprint.sprintId)}
                                        disabled={completeMutation.isPending}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                    >
                                        <i className="fa-solid fa-check mr-2" />Hoàn thành Sprint
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                            <div><span className="text-gray-500">Bắt đầu</span><div className="font-medium">{activeSprint.startDate ? formatDate(activeSprint.startDate) : '—'}</div></div>
                            <div><span className="text-gray-500">Kết thúc</span><div className="font-medium">{activeSprint.endDate ? formatDate(activeSprint.endDate) : '—'}</div></div>
                            <div><span className="text-gray-500">Issues</span><div className="font-medium">{activeSprint.totalIssues || 0}</div></div>
                            <div><span className="text-gray-500">Hoàn thành</span><div className="font-medium">{activeSprint.completedIssues || 0}</div></div>
                        </div>
                        {activeSprint.goal && (
                            <p className="mt-3 text-sm text-gray-600 border-t border-indigo-200 pt-3">
                                <strong>Goal:</strong> {activeSprint.goal}
                            </p>
                        )}
                        {sprintPrediction && sprintPrediction.alertLevel !== 'OK' && (
                            <SprintAlertBanner prediction={sprintPrediction} />
                        )}
                        {expandedSprint === activeSprint.sprintId && (
                            <SprintIssueList
                                sprintId={activeSprint.sprintId}
                                projectId={projectId}
                                onAddIssue={() => setShowAddIssueModal(activeSprint.sprintId)}
                                onRemoveIssue={(issueId) => removeMutation.mutate({ sprintId: activeSprint.sprintId, issueId })}
                                removePending={removeMutation.isPending}
                                readOnly={!canManageIssues}
                            />
                        )}
                    </div>
                    <SprintOverview sprintId={activeSprint.sprintId} sprintName={activeSprint.name} />
                </div>
            )}

            {groupedPlanning.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <i className="fa-solid fa-clock text-gray-400" />Upcoming ({planningSprints.length})
                    </h3>
                    <div className="space-y-6">
                        {groupedPlanning.map(group => (
                            <div key={group.phaseId || '__ungrouped__'} className="space-y-2">
                                <div className="flex items-center gap-3 px-1">
                                    <i className="fa-solid fa-layer-group text-purple-400 text-sm" />
                                    <h4 className="text-sm font-bold text-gray-700">{group.phaseName}</h4>
                                    <span className="text-xs text-gray-400">({group.sprints.length} Sprint{group.sprints.length > 1 ? 's' : ''})</span>
                                </div>
                                <div className="space-y-2 pl-6">
                                    {group.sprints.map(sprint => (
                                        <div key={sprint.sprintId} className="bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-300 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="cursor-pointer select-none" onClick={() => setExpandedSprint(expandedSprint === sprint.sprintId ? null : sprint.sprintId)}>
                                                    <h5 className="font-medium text-gray-900 flex items-center gap-2">
                                                        {sprint.name}
                                                        <i className={`fa-solid fa-chevron-${expandedSprint === sprint.sprintId ? 'up' : 'down'} text-xs text-gray-400`} />
                                                    </h5>
                                                    <p className="text-sm text-gray-500">
                                                        {sprint.startDate ? formatDate(sprint.startDate) : 'TBD'} → {sprint.endDate ? formatDate(sprint.endDate) : 'TBD'}
                                                        {sprint.totalIssues > 0 && <span className="ml-3 text-indigo-600 font-medium">{sprint.totalIssues} issues</span>}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${SPRINT_STATUS.PLANNING.color}`}>{SPRINT_STATUS.PLANNING.label}</span>
                                                    {canManageSprints && (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => setEditingSprint(sprint)}
                                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                title="Chỉnh sửa sprint"
                                                            >
                                                                <i className="fa-solid fa-pen text-sm" />
                                                            </button>
                                                            <button
                                                                onClick={() => { if (window.confirm(`Xóa sprint "${sprint.name}"?`)) deleteMutation.mutate(sprint.sprintId); }}
                                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Xóa sprint"
                                                            >
                                                                <i className="fa-solid fa-trash text-sm" />
                                                            </button>
                                                            <button
                                                                onClick={() => startMutation.mutate(sprint.sprintId)}
                                                                disabled={startMutation.isPending || !!activeSprint}
                                                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
                                                                title={activeSprint ? 'Phải hoàn thành sprint hiện tại trước' : 'Bắt đầu sprint'}
                                                            >
                                                                <i className="fa-solid fa-play mr-1" />Start
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {expandedSprint === sprint.sprintId && (
                                                <SprintIssueList
                                                    sprintId={sprint.sprintId}
                                                    projectId={projectId}
                                                    onAddIssue={() => setShowAddIssueModal(sprint.sprintId)}
                                                    onRemoveIssue={(issueId) => removeMutation.mutate({ sprintId: sprint.sprintId, issueId })}
                                                    removePending={removeMutation.isPending}
                                                    readOnly={!canManageIssues}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {groupedCompleted.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <i className="fa-solid fa-check-circle text-green-500" />Completed ({completedSprints.length})
                    </h3>
                    <div className="space-y-6">
                        {groupedCompleted.map(group => (
                            <div key={group.phaseId || '__ungrouped__'} className="space-y-2">
                                <div className="flex items-center gap-3 px-1">
                                    <i className="fa-solid fa-layer-group text-purple-400 text-sm" />
                                    <h4 className="text-sm font-bold text-gray-700">{group.phaseName}</h4>
                                    <span className="text-xs text-gray-400">({group.sprints.length} Sprint{group.sprints.length > 1 ? 's' : ''})</span>
                                </div>
                                <div className="space-y-2 pl-6">
                                    {group.sprints.slice(0, 5).map(sprint => (
                                        <div key={sprint.sprintId} className="bg-gray-50 rounded-lg border border-gray-100 p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="cursor-pointer select-none" onClick={() => setExpandedSprint(expandedSprint === sprint.sprintId ? null : sprint.sprintId)}>
                                                    <h5 className="font-medium text-gray-700 flex items-center gap-2 flex-wrap">
                                                        {sprint.name}
                                                        <i className={`fa-solid fa-chevron-${expandedSprint === sprint.sprintId ? 'up' : 'down'} text-xs text-gray-400`} />
                                                    </h5>
                                                    <p className="text-xs text-gray-500">{sprint.completedAt ? formatDate(sprint.completedAt) : 'Completed'}</p>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span>{sprint.totalIssues || 0} issues</span>
                                                    <span className={`px-2 py-0.5 rounded text-xs ${SPRINT_STATUS.COMPLETED.color}`}>Done</span>
                                                </div>
                                            </div>
                                            {expandedSprint === sprint.sprintId && (
                                                <SprintIssueList sprintId={sprint.sprintId} projectId={projectId} readOnly={true} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {sprints.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                    <i className="fa-solid fa-layer-group text-4xl text-gray-300 mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Chưa có Sprint nào</h3>
                    <p className="text-sm text-gray-500 mb-4">Tạo sprint đầu tiên để bắt đầu quản lý công việc theo chu kỳ</p>
                    {canManageSprints && (
                        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                            <i className="fa-solid fa-plus mr-2" />Tạo Sprint
                        </button>
                    )}
                </div>
            )}

            {editingSprint && (
                <EditSprintModal
                    sprint={editingSprint}
                    projectId={projectId}
                    onClose={() => setEditingSprint(null)}
                    onSuccess={() => { queryClient.invalidateQueries(['sprints', projectId]); setEditingSprint(null); }}
                />
            )}

            {showCreateModal && (
                <CreateSprintModal
                    projectId={projectId}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => { queryClient.invalidateQueries(['sprints', projectId]); setShowCreateModal(false); }}
                />
            )}
            {showAddIssueModal && (
                <AddIssueToSprintModal
                    projectId={projectId}
                    sprintId={showAddIssueModal}
                    onClose={() => setShowAddIssueModal(null)}
                    onSuccess={() => { queryClient.invalidateQueries(['sprintIssues', showAddIssueModal]); queryClient.invalidateQueries(['sprints', projectId]); setShowAddIssueModal(null); }}
                />
            )}

            <SmartAssistantFAB project={null} projectId={projectId} sprint={activeSprint} />
        </div>
    );
}

// ─── Phase View ─────────────────────────────────────────────────────────
function PhaseView({ projectId }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingPhase, setEditingPhase] = useState(null);
    const queryClient = useQueryClient();
    const toast = useToast();
    const { hasPermission } = useAccessControl();
    const canManagePhases = hasPermission('PROJECT.MANAGE_PHASES');

    const { data: phases = [], isLoading } = useQuery({
        queryKey: ['phases', projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PHASES.BY_PROJECT(projectId))).data,
        enabled: !!projectId,
    });

    const deleteMutation = useMutation({
        mutationFn: (phaseId) => apiClient.delete(ENDPOINTS.PHASES.BY_ID(phaseId)),
        onSuccess: () => {
            toast.success('Đã xóa giai đoạn');
            queryClient.invalidateQueries(['phases', projectId]);
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ phaseId, status }) => apiClient.put(ENDPOINTS.PHASES.BY_ID(phaseId), { status }),
        onSuccess: () => {
            toast.success('Đã cập nhật trạng thái');
            queryClient.invalidateQueries(['phases', projectId]);
        },
    });

    const sortedPhases = [...phases].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    const completedCount = sortedPhases.filter(p => p.status === 'COMPLETED').length;
    const progress = phases.length > 0 ? Math.round((completedCount / phases.length) * 100) : 0;

    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><i className="fa-solid fa-spinner fa-spin text-3xl text-indigo-500" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Giai đoạn dự án</h2>
                    <p className="text-sm text-gray-500">Quản lý các giai đoạn (phases) trong dự án</p>
                </div>
                {canManagePhases && (
                    <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
                        <i className="fa-solid fa-plus" /> Thêm giai đoạn
                    </button>
                )}
            </div>

            {phases.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-gray-700">Tiến độ tổng thể</span>
                        <span className="text-2xl font-bold text-indigo-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>{completedCount}/{phases.length} giai đoạn hoàn thành</span>
                    </div>
                </div>
            )}

            {phases.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(() => {
                        const totalIssues = phases.reduce((s, p) => s + (p.issueCount || 0), 0);
                        const avgDuration = sortedPhases.length > 0
                            ? Math.round(sortedPhases.reduce((s, p) => {
                                if (!p.startDate || !p.endDate) return s;
                                const days = (new Date(p.endDate) - new Date(p.startDate)) / (1000 * 60 * 60 * 24);
                                return s + days;
                            }, 0) / sortedPhases.length)
                            : 0;
                        return [
                            { label: 'Tổng Giai đoạn', value: phases.length, icon: 'fa-layer-group', bgClass: 'bg-indigo-500' },
                            { label: 'Hoàn thành', value: completedCount, icon: 'fa-check-circle', bgClass: 'bg-green-500' },
                            { label: 'Tổng Issues', value: totalIssues, icon: 'fa-list-check', bgClass: 'bg-violet-500' },
                            { label: 'TB ngày/phase', value: `${avgDuration}d`, icon: 'fa-calendar-day', bgClass: 'bg-amber-500' },
                        ];
                    })().map(card => (
                        <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm ${card.bgClass}`}>
                                    <i className={`fa-solid ${card.icon}`} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">{card.label}</p>
                                    <p className="text-xl font-bold text-gray-900">{card.value}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {sortedPhases.length > 0 ? (
                <div className="relative">
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
                    <div className="space-y-4">
                        {sortedPhases.map((phase, index) => {
                            const statusConfig = PHASE_STATUS[phase.status] || PHASE_STATUS.PLANNING;
                            return (
                                <div key={phase.phaseId} className="relative flex gap-4 pl-12">
                                    <div className={`absolute left-4 w-5 h-5 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[10px]
                                        ${phase.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                                            phase.status === 'IN_PROGRESS' ? 'bg-indigo-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                        {phase.status === 'COMPLETED' ? <i className="fa-solid fa-check" /> : index + 1}
                                    </div>
                                    <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-gray-900">{phase.name}</h3>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
                                                </div>
                                                {phase.description && <p className="text-sm text-gray-500 mb-2">{phase.description}</p>}
                                                <div className="flex gap-4 text-xs text-gray-500">
                                                    {phase.startDate && <span><i className="fa-regular fa-calendar mr-1" />{formatDate(phase.startDate)}</span>}
                                                    {phase.endDate && <span><i className="fa-solid fa-arrow-right mx-1" />{formatDate(phase.endDate)}</span>}
                                                    {phase.issueCount !== undefined && <span><i className="fa-solid fa-list-check mr-1" />{phase.issueCount} tasks</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {canManagePhases && (
                                                    <>
                                                        <select
                                                            value={phase.status}
                                                            onChange={(e) => updateStatusMutation.mutate({ phaseId: phase.phaseId, status: e.target.value })}
                                                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-gray-300"
                                                        >
                                                            {Object.entries(PHASE_STATUS).map(([key, val]) => (
                                                                <option key={key} value={key}>{val.label}</option>
                                                            ))}
                                                        </select>
                                                        <button onClick={() => setEditingPhase(phase)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Chỉnh sửa">
                                                            <i className="fa-solid fa-pen text-sm" />
                                                        </button>
                                                        <button
                                                            onClick={() => { if (confirm('Xóa giai đoạn này?')) deleteMutation.mutate(phase.phaseId); }}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa"
                                                        >
                                                            <i className="fa-solid fa-trash text-sm" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                    <i className="fa-solid fa-layer-group text-4xl text-gray-300 mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Chưa có giai đoạn nào</h3>
                    <p className="text-sm text-gray-500 mb-4">Thêm giai đoạn để chia nhỏ dự án thành các phần dễ quản lý</p>
                    {canManagePhases && (
                        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                            <i className="fa-solid fa-plus mr-2" />Thêm giai đoạn đầu tiên
                        </button>
                    )}
                </div>
            )}

            {(showCreateModal || editingPhase) && (
                <PhaseModal
                    projectId={projectId}
                    phase={editingPhase}
                    onClose={() => { setShowCreateModal(false); setEditingPhase(null); }}
                    onSuccess={() => { queryClient.invalidateQueries(['phases', projectId]); setShowCreateModal(false); setEditingPhase(null); }}
                />
            )}
        </div>
    );
}

// ─── Timeline View ──────────────────────────────────────────────────────
function TimelineView({ projectId }) {
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [filter, setFilter] = useState('');
    const scrollRef = useRef(null);

    const { data: issuesRaw = [], isLoading } = useQuery({
        queryKey: ['project-issues-timeline', projectId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.ISSUES.BY_PROJECT(projectId));
            return res.data?.content || res.data || [];
        },
        enabled: !!projectId,
    });

    const issues = Array.isArray(issuesRaw) ? issuesRaw : [];

    const { filteredIssues, days, startDate, totalDays } = useMemo(() => {
        let filtered = issues.filter(i => i.startDate || i.dueDate);
        if (filter) {
            const q = filter.toLowerCase();
            filtered = filtered.filter(i =>
                i.title?.toLowerCase().includes(q) ||
                i.assigneeName?.toLowerCase().includes(q) ||
                i.issueKey?.toLowerCase().includes(q)
            );
        }
        if (filtered.length === 0) return { filteredIssues: [], days: [], startDate: null, totalDays: 0 };
        const allDates = filtered.flatMap(i => [i.startDate, i.dueDate].filter(Boolean)).map(d => new Date(d));
        if (allDates.length === 0) return { filteredIssues: filtered, days: [], startDate: null, totalDays: 0 };
        const min = new Date(Math.min(...allDates));
        const max = new Date(Math.max(...allDates));
        min.setDate(min.getDate() - 2);
        max.setDate(max.getDate() + 2);
        const total = Math.ceil((max - min) / (1000 * 60 * 60 * 24)) + 1;
        const dayArr = [];
        for (let i = 0; i < total; i++) {
            const d = new Date(min);
            d.setDate(d.getDate() + i);
            dayArr.push(d);
        }
        return { filteredIssues: filtered, days: dayArr, startDate: min, totalDays: total };
    }, [issues, filter]);

    const dailyCounts = useMemo(() => {
        const counts = {};
        days.forEach(d => { counts[d.toISOString().slice(0, 10)] = 0; });
        filteredIssues.forEach(i => {
            const s = new Date(i.startDate || i.dueDate);
            const e = new Date(i.dueDate || i.startDate);
            days.forEach(d => {
                const key = d.toISOString().slice(0, 10);
                if (d >= s && d <= e) counts[key] = (counts[key] || 0) + 1;
            });
        });
        return counts;
    }, [filteredIssues, days]);

    const getBarStyle = (issue) => {
        if (!startDate) return {};
        const s = new Date(issue.startDate || issue.dueDate);
        const e = new Date(issue.dueDate || issue.startDate);
        const leftDays = Math.max(0, (s - startDate) / (1000 * 60 * 60 * 24));
        const widthDays = Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1);
        const cellW = 36;
        return { left: `${leftDays * cellW}px`, width: `${widthDays * cellW}px` };
    };

    const today = new Date().toISOString().slice(0, 10);
    const todayOffset = useMemo(() => {
        if (!startDate) return -1;
        const t = new Date(today);
        const s = new Date(startDate);
        t.setHours(0, 0, 0, 0);
        s.setHours(0, 0, 0, 0);
        const diffDays = (t - s) / (1000 * 60 * 60 * 24);
        if (diffDays < 0 || diffDays >= days.length) return -1;
        return diffDays;
    }, [today, startDate, days.length]);

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-[400px]"><div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin" /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
                    <i className="fa-solid fa-chart-gantt" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Timeline</h2>
                    <p className="text-xs text-gray-500">Gantt tổng quan các công việc theo thời gian</p>
                </div>
                <div className="ml-auto relative">
                    <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                        type="text" value={filter} onChange={e => setFilter(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm w-56 focus:outline-none focus:border-gray-300 focus:border-transparent"
                    />
                </div>
            </div>

            {filteredIssues.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <i className="fa-solid fa-chart-gantt text-4xl mb-3" />
                    <p>Không có dữ liệu timeline (cần startDate hoặc dueDate)</p>
                </div>
            ) : (
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto" ref={scrollRef}>
                        <div style={{ minWidth: `${Math.max(totalDays * 36 + 280, 800)}px` }}>
                            <div className="flex bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                                <div className="w-[280px] shrink-0 px-4 py-2 text-xs font-medium text-gray-500 border-r border-gray-200">Công việc</div>
                                <div className="flex-1 flex">
                                    {days.map(d => {
                                        const key = d.toISOString().slice(0, 10);
                                        const isToday = key === today;
                                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                        return (
                                            <div key={key} className={`w-9 shrink-0 text-center py-1 text-[10px] border-r border-gray-100 ${isToday ? 'bg-red-50 font-bold text-red-600' : isWeekend ? 'bg-gray-100 text-gray-400' : 'text-gray-500'}`}>
                                                {isToday && <div className="text-[7px] font-black text-red-500 leading-none mb-0.5">HÔM NAY</div>}
                                                <div>{d.getDate()}</div>
                                                <div className="text-[8px]">{['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()]}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {filteredIssues.map(issue => {
                                const statusColor = TIMELINE_STATUS_COLORS[issue.statusName] || '#94a3b8';
                                const isOverdue = issue.dueDate && new Date(issue.dueDate) < new Date() && issue.statusName !== 'Done';
                                return (
                                    <div key={issue.issueId} className="flex border-b border-gray-50 hover:bg-gray-50/50 group">
                                        <div className="w-[280px] shrink-0 px-3 py-2 border-r border-gray-100 flex items-center gap-2 cursor-pointer" onClick={() => setSelectedIssue(issue)}>
                                            <span className="text-[10px] font-mono text-gray-400 min-w-[60px]">{issue.issueKey}</span>
                                            <span className="text-xs text-gray-800 truncate group-hover:text-indigo-600 transition-colors flex-1">{issue.title}</span>
                                            <span className="text-[10px] text-gray-400 truncate max-w-[60px]">{issue.assigneeName?.split(' ').pop() || ''}</span>
                                        </div>
                                        <div className="flex-1 relative h-9">
                                            {days.map(d => {
                                                const key = d.toISOString().slice(0, 10);
                                                const isToday = key === today;
                                                return (
                                                    <div key={key} className={`absolute top-0 bottom-0 w-9 border-r border-gray-50 ${isToday ? 'bg-red-50/20' : ''}`}
                                                        style={{ left: `${days.indexOf(d) * 36}px` }} />
                                                );
                                            })}
                                            {todayOffset >= 0 && (
                                                <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                                                    style={{ left: `${todayOffset * 36 + 18}px` }} title="Hôm nay" />
                                            )}
                                            <div
                                                className={`absolute top-1.5 h-6 rounded-md shadow-sm cursor-pointer transition-all hover:shadow-md hover:brightness-110 ${isOverdue ? 'ring-2 ring-red-400 ring-opacity-60' : ''}`}
                                                style={{ ...getBarStyle(issue), backgroundColor: statusColor, minWidth: '36px' }}
                                                onClick={() => setSelectedIssue(issue)}
                                                title={`${issue.title}\n${issue.startDate || ''} → ${issue.dueDate || ''}\n${issue.assigneeName || 'Chưa giao'}`}
                                            >
                                                <span className="text-[9px] text-white font-medium px-1.5 truncate block leading-6">{issue.title}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="flex bg-gray-50 border-t border-gray-200">
                                <div className="w-[280px] shrink-0 px-4 py-1.5 text-xs font-medium text-gray-500 border-r border-gray-200">Tổng / ngày</div>
                                <div className="flex-1 flex">
                                    {days.map(d => {
                                        const key = d.toISOString().slice(0, 10);
                                        const count = dailyCounts[key] || 0;
                                        return (
                                            <div key={key} className={`w-9 shrink-0 text-center py-1 text-[10px] font-medium border-r border-gray-100 ${count > 3 ? 'text-red-600 bg-red-50' : count > 0 ? 'text-gray-600' : 'text-gray-300'}`}>
                                                {count || '·'}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedIssue && (
                <IssueDetailModal issue={selectedIssue} onClose={() => setSelectedIssue(null)} onUpdate={() => { }} />
            )}
        </div>
    );
}

// ─── Sprint Issue List Component ────────────────────────────────────────
function SprintIssueList({ sprintId, projectId, onAddIssue, onRemoveIssue, removePending, readOnly = false }) {
    const { data: issuesData, isLoading } = useQuery({
        queryKey: ['sprintIssues', sprintId],
        queryFn: async () => {
            const res = (await apiClient.get(ENDPOINTS.ISSUES.BY_SPRINT(sprintId), { params: { size: 100 } })).data;
            return res?.content || (Array.isArray(res) ? res : []);
        },
        enabled: !!sprintId,
    });

    const issues = issuesData || [];

    return (
        <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <i className="fa-solid fa-list-check text-indigo-500" />Issues ({issues.length})
                </h4>
                {!readOnly && onAddIssue && (
                    <button onClick={onAddIssue} className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium flex items-center gap-1">
                        <i className="fa-solid fa-plus" />Thêm Issue
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-6"><i className="fa-solid fa-spinner fa-spin text-indigo-500" /><span className="ml-2 text-sm text-gray-500">Đang tải...</span></div>
            ) : issues.length === 0 ? (
                <div className="text-center py-6 bg-white/50 rounded-lg border border-dashed border-gray-300">
                    <i className="fa-solid fa-inbox text-2xl text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">Chưa có issue nào trong sprint này</p>
                    {!readOnly && onAddIssue && (
                        <button onClick={onAddIssue} className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">+ Thêm issue từ backlog</button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {issues.map(issue => {
                        const typeInfo = ISSUE_TYPE_ICONS[issue.issueType] || ISSUE_TYPE_ICONS.TASK;
                        const statusColor = ISSUE_STATUS_COLORS[issue.status] || 'bg-gray-100 text-gray-700';
                        return (
                            <div key={issue.issueId} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors group">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <i className={`fa-solid ${typeInfo.icon} ${typeInfo.color} text-sm`} />
                                    <span className="text-sm text-gray-800 truncate font-medium">{issue.title}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${statusColor}`}>{issue.status?.replace(/_/g, ' ')}</span>
                                    {issue.assigneeName && <span className="text-xs text-gray-400 whitespace-nowrap"><i className="fa-solid fa-user mr-1" />{issue.assigneeName}</span>}
                                </div>
                                {!readOnly && onRemoveIssue && (
                                    <button onClick={() => onRemoveIssue(issue.issueId)} disabled={removePending}
                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1 rounded" title="Gỡ khỏi sprint">
                                        <i className="fa-solid fa-times text-xs" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Add Issue to Sprint Modal ──────────────────────────────────────────
function AddIssueToSprintModal({ projectId, sprintId, onClose, onSuccess }) {
    const [selectedIssues, setSelectedIssues] = useState([]);
    const [search, setSearch] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();

    const { data: backlogData, isLoading } = useQuery({
        queryKey: ['backlogIssues', projectId],
        queryFn: async () => {
            const res = (await apiClient.get(ENDPOINTS.ISSUES.BACKLOG(projectId), { params: { size: 200 } })).data;
            return res?.content || (Array.isArray(res) ? res : []);
        },
        enabled: !!projectId,
    });

    const backlogIssues = backlogData || [];
    const filteredIssues = backlogIssues.filter(issue => issue.title?.toLowerCase().includes(search.toLowerCase()));

    const toggleIssue = (issueId) => {
        setSelectedIssues(prev => prev.includes(issueId) ? prev.filter(id => id !== issueId) : [...prev, issueId]);
    };

    const handleSubmit = async () => {
        if (selectedIssues.length === 0) { toast.error('Vui lòng chọn ít nhất 1 issue'); return; }
        setIsSubmitting(true);
        try {
            await Promise.all(selectedIssues.map(issueId => apiClient.post(ENDPOINTS.SPRINTS.ADD_ISSUE(sprintId, issueId))));
            toast.success(`Đã thêm ${selectedIssues.length} issue vào sprint!`);
            onSuccess();
        } catch (err) {
            toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Thêm Issue vào Sprint</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Chọn issues từ backlog để thêm vào sprint</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-times" /></button>
                </div>
                <div className="px-6 py-3 border-b border-gray-100">
                    <div className="relative">
                        <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white"
                            placeholder="Tìm issue theo tên..." />
                    </div>
                    {selectedIssues.length > 0 && <div className="mt-2 text-xs text-indigo-600 font-medium">Đã chọn {selectedIssues.length} issue</div>}
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-3" style={{ maxHeight: '400px' }}>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8"><i className="fa-solid fa-spinner fa-spin text-indigo-500 mr-2" /><span className="text-sm text-gray-500">Đang tải backlog...</span></div>
                    ) : filteredIssues.length === 0 ? (
                        <div className="text-center py-8"><i className="fa-solid fa-inbox text-3xl text-gray-300 mb-2" /><p className="text-sm text-gray-500">{search ? 'Không tìm thấy issue phù hợp' : 'Không có issue nào trong backlog'}</p></div>
                    ) : (
                        <div className="space-y-1">
                            {filteredIssues.map(issue => {
                                const isSelected = selectedIssues.includes(issue.issueId);
                                const typeInfo = ISSUE_TYPE_ICONS[issue.issueType] || ISSUE_TYPE_ICONS.TASK;
                                const statusColor = ISSUE_STATUS_COLORS[issue.status] || 'bg-gray-100 text-gray-700';
                                return (
                                    <label key={issue.issueId} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                                        <input type="checkbox" checked={isSelected} onChange={() => toggleIssue(issue.issueId)}
                                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                                        <i className={`fa-solid ${typeInfo.icon} ${typeInfo.color} text-sm`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-800 truncate">{issue.title}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`px-1.5 py-0.5 rounded text-xs ${statusColor}`}>{issue.status?.replace(/_/g, ' ')}</span>
                                                {issue.assigneeName && <span className="text-xs text-gray-400">{issue.assigneeName}</span>}
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                    <span className="text-xs text-gray-500">{filteredIssues.length} issues trong backlog</span>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm">Hủy</button>
                        <button onClick={handleSubmit} disabled={isSubmitting || selectedIssues.length === 0} className="btn-primary disabled:opacity-50 text-sm">
                            {isSubmitting ? <><i className="fa-solid fa-spinner fa-spin mr-2" />Đang thêm...</> : `Thêm ${selectedIssues.length > 0 ? selectedIssues.length + ' issue' : ''}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Create Sprint Modal ────────────────────────────────────────────────
function CreateSprintModal({ projectId, onClose, onSuccess }) {
    const [form, setForm] = useState({ name: '', goal: '', startDate: '', endDate: '', phaseId: '' });
    const toast = useToast();

    const { data: phases = [] } = useQuery({
        queryKey: ['phases', projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PHASES.BY_PROJECT(projectId))).data,
        enabled: !!projectId,
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const payload = { ...data, projectId };
            if (payload.phaseId === '') payload.phaseId = null;
            return (await apiClient.post(ENDPOINTS.SPRINTS.CREATE, payload)).data;
        },
        onSuccess: () => { toast.success('Tạo sprint thành công!'); onSuccess(); },
        onError: (err) => { toast.error('Lỗi: ' + (err.response?.data?.message || err.message)); },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) { toast.error('Vui lòng nhập tên sprint'); return; }
        createMutation.mutate(form);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Tạo Sprint Mới</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-times" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên Sprint <span className="text-red-500">*</span></label>
                        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white"
                            placeholder="VD: Sprint 1" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sprint Goal</label>
                        <textarea value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300 focus:border-transparent resize-none"
                            placeholder="Mục tiêu của sprint này..." rows={2} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Thuộc Giai đoạn <span className="text-gray-400 font-normal">(Tùy chọn)</span>
                        </label>
                        <select value={form.phaseId} onChange={(e) => setForm({ ...form, phaseId: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white">
                            <option value="">— Không chọn giai đoạn —</option>
                            {phases.map(phase => (
                                <option key={phase.phaseId} value={phase.phaseId}>{phase.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                        <button type="submit" disabled={createMutation.isPending} className="btn-primary disabled:opacity-50">
                            {createMutation.isPending ? 'Đang tạo...' : 'Tạo Sprint'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Edit Sprint Modal ────────────────────────────────────────────────
function EditSprintModal({ sprint, projectId, onClose, onSuccess }) {
    const [form, setForm] = useState({
        name: sprint?.name || '',
        goal: sprint?.goal || '',
        startDate: sprint?.startDate ? String(sprint.startDate).split('T')[0] : '',
        endDate: sprint?.endDate ? String(sprint.endDate).split('T')[0] : '',
        phaseId: sprint?.phaseId || '',
    });
    const toast = useToast();

    const { data: phases = [] } = useQuery({
        queryKey: ['phases', projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PHASES.BY_PROJECT(projectId))).data,
        enabled: !!projectId,
    });

    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const payload = { ...data };
            if (payload.phaseId === '') payload.phaseId = null;
            return (await apiClient.put(ENDPOINTS.SPRINTS.BY_ID(sprint.sprintId), payload)).data;
        },
        onSuccess: () => { toast.success('Cập nhật sprint thành công!'); onSuccess(); },
        onError: (err) => { toast.error('Lỗi: ' + (err.response?.data?.message || err.message)); },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) { toast.error('Vui lòng nhập tên sprint'); return; }
        updateMutation.mutate(form);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Chỉnh sửa Sprint</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-times" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên Sprint <span className="text-red-500">*</span></label>
                        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white"
                            placeholder="VD: Sprint 1" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sprint Goal</label>
                        <textarea value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300 focus:border-transparent resize-none"
                            placeholder="Mục tiêu của sprint này..." rows={2} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Thuộc Giai đoạn <span className="text-gray-400 font-normal">(Tùy chọn)</span>
                        </label>
                        <select value={form.phaseId} onChange={(e) => setForm({ ...form, phaseId: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white">
                            <option value="">— Không chọn giai đoạn —</option>
                            {phases.map(phase => (
                                <option key={phase.phaseId} value={phase.phaseId}>{phase.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                        <button type="submit" disabled={updateMutation.isPending} className="btn-primary disabled:opacity-50">
                            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Phase Modal ────────────────────────────────────────────────────────
function PhaseModal({ projectId, phase, onClose, onSuccess }) {
    const [form, setForm] = useState({
        name: phase?.name || '',
        description: phase?.description || '',
        startDate: phase?.startDate?.split('T')[0] || '',
        endDate: phase?.endDate?.split('T')[0] || '',
        status: phase?.status || 'PLANNING',
        orderIndex: phase?.orderIndex || 1,
    });
    const toast = useToast();
    const isEditing = !!phase;

    const mutation = useMutation({
        mutationFn: async (data) => {
            if (isEditing) return (await apiClient.put(ENDPOINTS.PHASES.BY_ID(phase.phaseId), data)).data;
            return (await apiClient.post(ENDPOINTS.PHASES.BY_PROJECT(projectId), data)).data;
        },
        onSuccess: () => { toast.success(isEditing ? 'Đã cập nhật giai đoạn' : 'Đã tạo giai đoạn'); onSuccess(); },
        onError: (err) => { toast.error('Lỗi: ' + (err.response?.data?.message || err.message)); },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) { toast.error('Vui lòng nhập tên giai đoạn'); return; }
        mutation.mutate(form);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">{isEditing ? 'Chỉnh sửa giai đoạn' : 'Thêm giai đoạn mới'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-times" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên giai đoạn <span className="text-red-500">*</span></label>
                        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white"
                            placeholder="VD: Giai đoạn thiết kế" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300 focus:border-transparent resize-none"
                            placeholder="Mô tả chi tiết..." rows={2} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white">
                                {Object.entries(PHASE_STATUS).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự</label>
                            <input type="number" value={form.orderIndex} onChange={(e) => setForm({ ...form, orderIndex: parseInt(e.target.value) || 1 })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white"
                                min="1" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                        <button type="submit" disabled={mutation.isPending} className="btn-primary disabled:opacity-50">
                            {mutation.isPending ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo giai đoạn'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Sprint Alert Banner ───────────────────────────────────────────────────────
function SprintAlertBanner({ prediction }) {
    const isCritical = prediction.alertLevel === 'CRITICAL';

    const bgColor = isCritical ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
    const iconColor = isCritical ? 'text-red-500' : 'text-amber-500';
    const icon = isCritical ? 'fa-circle-exclamation' : 'fa-triangle-exclamation';

    const confidencePercent = prediction.onTimeConfidence != null
        ? Math.round(prediction.onTimeConfidence * 100)
        : null;

    const showProgress = prediction.onTimeConfidence != null;

    return (
        <div className={`mt-3 p-4 rounded-xl border ${bgColor} animate-in slide-in-from-top-2 duration-300`}>
            <div className="flex items-start gap-3">
                <i className={`fa-solid ${icon} text-xl ${iconColor} mt-0.5 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className={`font-bold ${isCritical ? 'text-red-700' : 'text-amber-700'}`}>
                            {isCritical ? 'Sprint có nguy cơ thất bại cao!' : 'Cần đẩy nhanh!'}
                        </p>
                        {confidencePercent != null && (
                            <span className={`text-sm font-bold ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>
                                Confidence hoàn thành đúng hạn: {confidencePercent}%
                            </span>
                        )}
                    </div>

                    {showProgress && (
                        <div className="mt-2 relative h-2 bg-white/80 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${isCritical ? 'bg-red-400' : 'bg-amber-400'}`}
                                style={{ width: `${confidencePercent}%` }}
                            />
                            <div className="absolute top-0 left-0 h-full w-0.5 bg-gray-800 animate-pulse" />
                        </div>
                    )}

                    <div className="mt-2 space-y-1">
                        {prediction.recommendations?.map((rec, i) => (
                            <p key={i} className={`text-sm ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>
                                {rec}
                            </p>
                        ))}
                    </div>

                    {prediction.daysRemaining != null && (
                        <p className={`mt-2 text-xs ${isCritical ? 'text-red-500' : 'text-amber-500'}`}>
                            Còn {prediction.daysRemaining} ngày
                            {prediction.predictedCompletionDate && ` • Dự kiến hoàn thành: ${prediction.predictedCompletionDate}`}
                            {prediction.autoTuningInfo && prediction.autoTuningInfo.source === 'auto-tuned' && (
                                <span className="ml-2 text-purple-500">• ML tuned: α={prediction.autoTuningInfo.alpha} β={prediction.autoTuningInfo.beta}</span>
                            )}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
