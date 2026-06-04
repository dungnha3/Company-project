import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { formatDate } from '@shared/utils/formatters';
import { useAccessControl } from '@shared/hooks/useAccessControl';
import SprintOverview from '../components/BurndownChart';
import IssueDetailModal from '../components/IssueDetailModal';

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
    return (
        <div className="space-y-4">
            <SprintView projectId={projectId} />
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

    const planningSprints = sprints.filter(s => s.status === 'PLANNING');
    const completedSprints = sprints.filter(s => s.status === 'COMPLETED');

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

            {planningSprints.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <i className="fa-solid fa-clock text-gray-400" />Sắp diễn ra ({planningSprints.length})
                    </h3>
                    <div className="space-y-3">
                        {planningSprints.map(sprint => (
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
            )}

            {completedSprints.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <i className="fa-solid fa-check-circle text-green-500" />Đã hoàn thành ({completedSprints.length})
                    </h3>
                    <div className="space-y-3">
                        {completedSprints.slice(0, 5).map(sprint => (
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
                                        <span className={`px-2 py-0.5 rounded text-xs ${SPRINT_STATUS.COMPLETED.color}`}>{SPRINT_STATUS.COMPLETED.label}</span>
                                    </div>
                                </div>
                                {expandedSprint === sprint.sprintId && (
                                    <SprintIssueList sprintId={sprint.sprintId} projectId={projectId} readOnly={true} />
                                )}
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
                        const statusColor = issue.statusName === 'In Progress' ? 'bg-blue-100 text-blue-700' : issue.statusName === 'Review' ? 'bg-yellow-100 text-yellow-700' : issue.statusName === 'Done' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
                        return (
                            <div key={issue.issueId} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors group">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <i className={`fa-solid ${typeInfo.icon} ${typeInfo.color} text-sm`} />
                                    <span className="text-sm text-gray-800 truncate font-medium">{issue.title}</span>
                                    {issue.isImportant && (
                                        <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap flex items-center gap-0.5" title="Quan trọng">
                                            <i className="fa-solid fa-star text-amber-500" /> Quan trọng
                                        </span>
                                    )}
                                    {issue.isUrgent && (
                                        <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap flex items-center gap-0.5" title="Khẩn cấp">
                                            <i className="fa-solid fa-fire text-rose-500" /> Khẩn cấp
                                        </span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${statusColor}`}>{issue.statusName || 'To Do'}</span>
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
const EISENHOWER_FILTERS = {
    ALL: { label: 'Tất cả', color: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200' },
    DO_NOW: { label: '🔥 Làm ngay', color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' },
    PLAN: { label: '⭐ Lên kế hoạch', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
    DELEGATE: { label: '⚡ Giao lại', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
    ELIMINATE: { label: '⏳ Làm sau', color: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100' }
};

function AddIssueToSprintModal({ projectId, sprintId, onClose, onSuccess }) {
    const [selectedIssues, setSelectedIssues] = useState([]);
    const [search, setSearch] = useState('');
    const [eisenhowerFilter, setEisenhowerFilter] = useState('ALL');
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
    const filteredIssues = backlogIssues.filter(issue => {
        const matchesSearch = issue.title?.toLowerCase().includes(search.toLowerCase());
        if (!matchesSearch) return false;

        const imp = !!issue.isImportant;
        const urg = !!issue.isUrgent;

        if (eisenhowerFilter === 'DO_NOW') return imp && urg;
        if (eisenhowerFilter === 'PLAN') return imp && !urg;
        if (eisenhowerFilter === 'DELEGATE') return !imp && urg;
        if (eisenhowerFilter === 'ELIMINATE') return !imp && !urg;
        return true;
    });

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
                <div className="px-6 py-3 border-b border-gray-100 space-y-3">
                    <div className="relative">
                        <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white"
                            placeholder="Tìm issue theo tên..." />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-none flex-nowrap" style={{ WebkitOverflowScrolling: 'touch' }}>
                        {Object.entries(EISENHOWER_FILTERS).map(([key, value]) => {
                            const isActive = eisenhowerFilter === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setEisenhowerFilter(key)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-all ${isActive
                                        ? key === 'ALL' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                            : key === 'DO_NOW' ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                                : key === 'PLAN' ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                                    : key === 'DELEGATE' ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                        : 'bg-gray-600 text-white border-gray-600 shadow-sm'
                                        : `${value.color}`
                                        }`}
                                >
                                    {value.label}
                                </button>
                            );
                        })}
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
                                const statusColor = issue.statusName === 'In Progress' ? 'bg-blue-100 text-blue-700' : issue.statusName === 'Review' ? 'bg-yellow-100 text-yellow-700' : issue.statusName === 'Done' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
                                return (
                                    <label key={issue.issueId} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                                        <input type="checkbox" checked={isSelected} onChange={() => toggleIssue(issue.issueId)}
                                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                                        <i className={`fa-solid ${typeInfo.icon} ${typeInfo.color} text-sm`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 min-w-0">
                                                <span className="text-sm font-medium text-gray-800 truncate">{issue.title}</span>
                                                <div className="flex gap-1 flex-shrink-0">
                                                    {issue.isImportant && (
                                                        <span className="px-1 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                                                            ★ Q.Trọng
                                                        </span>
                                                    )}
                                                    {issue.isUrgent && (
                                                        <span className="px-1 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                                                            🔥 Khẩn
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`px-1.5 py-0.5 rounded text-xs ${statusColor}`}>{issue.statusName || 'To Do'}</span>
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
    const [form, setForm] = useState({ name: '', goal: '', startDate: '', endDate: '', phaseId: null });
    const toast = useToast();

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const payload = { ...data, projectId };
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
        phaseId: sprint?.phaseId || null,
    });
    const toast = useToast();

    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const payload = { ...data };
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
