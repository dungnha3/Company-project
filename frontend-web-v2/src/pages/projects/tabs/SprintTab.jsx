import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { formatDate } from '@shared/utils/formatters';
import BurndownChart from '../components/BurndownChart';

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

export default function SprintTab({ projectId }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [expandedSprint, setExpandedSprint] = useState(null);
    const [showAddIssueModal, setShowAddIssueModal] = useState(null); // sprintId or null
    const queryClient = useQueryClient();
    const toast = useToast();

    // Fetch sprints
    const { data: sprints = [], isLoading } = useQuery({
        queryKey: ['sprints', projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.SPRINTS.BY_PROJECT(projectId))).data,
        enabled: !!projectId,
    });

    // Start sprint mutation
    const startMutation = useMutation({
        mutationFn: (sprintId) => apiClient.post(ENDPOINTS.SPRINTS.START(sprintId)),
        onSuccess: () => {
            toast.success('Sprint đã bắt đầu!');
            queryClient.invalidateQueries(['sprints', projectId]);
        },
    });

    // Complete sprint mutation
    const completeMutation = useMutation({
        mutationFn: (sprintId) => apiClient.post(ENDPOINTS.SPRINTS.COMPLETE(sprintId)),
        onSuccess: () => {
            toast.success('Sprint đã hoàn thành!');
            queryClient.invalidateQueries(['sprints', projectId]);
        },
    });

    // Remove issue from sprint
    const removeMutation = useMutation({
        mutationFn: ({ sprintId, issueId }) =>
            apiClient.delete(ENDPOINTS.SPRINTS.REMOVE_ISSUE(sprintId, issueId)),
        onSuccess: (_, { sprintId }) => {
            toast.success('Đã gỡ issue khỏi sprint!');
            queryClient.invalidateQueries(['sprintIssues', sprintId]);
            queryClient.invalidateQueries(['sprints', projectId]);
        },
    });

    const toggleExpand = (sprintId) => {
        setExpandedSprint(expandedSprint === sprintId ? null : sprintId);
    };

    // Separate active and other sprints
    const activeSprint = sprints.find(s => s.status === 'ACTIVE');
    const planningSprints = sprints.filter(s => s.status === 'PLANNING');
    const completedSprints = sprints.filter(s => s.status === 'COMPLETED');

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <i className="fa-solid fa-spinner fa-spin text-3xl text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Sprint Management</h2>
                    <p className="text-sm text-gray-500">Quản lý các sprint trong dự án</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <i className="fa-solid fa-plus" />
                    Tạo Sprint
                </button>
            </div>

            {/* Active Sprint */}
            {activeSprint && (
                <div className="space-y-4">
                    <div className="bg-gradient-to-r from-indigo-50 to-indigo-50 rounded-xl p-5 border border-indigo-200">
                        <div className="flex items-center justify-between mb-4">
                            <div
                                className="flex items-center gap-3 cursor-pointer select-none"
                                onClick={() => toggleExpand(activeSprint.sprintId)}
                            >
                                <div className="w-10 h-10 rounded-lg bg-indigo-500 text-white flex items-center justify-center">
                                    <i className="fa-solid fa-rocket" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        {activeSprint.name}
                                        <i className={`fa-solid fa-chevron-${expandedSprint === activeSprint.sprintId ? 'up' : 'down'} text-xs text-gray-400`} />
                                    </h3>
                                    <span className="text-xs text-indigo-600 font-medium">ACTIVE SPRINT</span>
                                </div>
                            </div>
                            <button
                                onClick={() => completeMutation.mutate(activeSprint.sprintId)}
                                disabled={completeMutation.isPending}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                            >
                                <i className="fa-solid fa-check mr-2" />
                                Hoàn thành Sprint
                            </button>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Bắt đầu</span>
                                <div className="font-medium">{activeSprint.startDate ? formatDate(activeSprint.startDate) : '—'}</div>
                            </div>
                            <div>
                                <span className="text-gray-500">Kết thúc</span>
                                <div className="font-medium">{activeSprint.endDate ? formatDate(activeSprint.endDate) : '—'}</div>
                            </div>
                            <div>
                                <span className="text-gray-500">Issues</span>
                                <div className="font-medium">{activeSprint.totalIssues || 0}</div>
                            </div>
                            <div>
                                <span className="text-gray-500">Hoàn thành</span>
                                <div className="font-medium">{activeSprint.completedIssues || 0}</div>
                            </div>
                        </div>
                        {activeSprint.goal && (
                            <p className="mt-3 text-sm text-gray-600 border-t border-indigo-200 pt-3">
                                <strong>Goal:</strong> {activeSprint.goal}
                            </p>
                        )}

                        {/* Issue List for Active Sprint */}
                        {expandedSprint === activeSprint.sprintId && (
                            <SprintIssueList
                                sprintId={activeSprint.sprintId}
                                projectId={projectId}
                                onAddIssue={() => setShowAddIssueModal(activeSprint.sprintId)}
                                onRemoveIssue={(issueId) => removeMutation.mutate({ sprintId: activeSprint.sprintId, issueId })}
                                removePending={removeMutation.isPending}
                            />
                        )}
                    </div>

                    {/* Burndown Chart for Active Sprint */}
                    <BurndownChart
                        sprintId={activeSprint.sprintId}
                        sprintName={activeSprint.name}
                    />
                </div>
            )}

            {/* Planning Sprints */}
            {planningSprints.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <i className="fa-solid fa-clock text-gray-400" />
                        Upcoming ({planningSprints.length})
                    </h3>
                    <div className="space-y-3">
                        {planningSprints.map(sprint => (
                            <div key={sprint.sprintId} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 p-4 hover:border-indigo-300 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div
                                        className="cursor-pointer select-none"
                                        onClick={() => toggleExpand(sprint.sprintId)}
                                    >
                                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                            {sprint.name}
                                            <i className={`fa-solid fa-chevron-${expandedSprint === sprint.sprintId ? 'up' : 'down'} text-xs text-gray-400`} />
                                        </h4>
                                        <p className="text-sm text-gray-500">
                                            {sprint.startDate ? formatDate(sprint.startDate) : 'TBD'}
                                            {' → '}
                                            {sprint.endDate ? formatDate(sprint.endDate) : 'TBD'}
                                            {sprint.totalIssues > 0 && (
                                                <span className="ml-3 text-indigo-600 font-medium">
                                                    {sprint.totalIssues} issues
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${SPRINT_STATUS.PLANNING.color}`}>
                                            {SPRINT_STATUS.PLANNING.label}
                                        </span>
                                        <button
                                            onClick={() => startMutation.mutate(sprint.sprintId)}
                                            disabled={startMutation.isPending || activeSprint}
                                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
                                            title={activeSprint ? 'Phải hoàn thành sprint hiện tại trước' : 'Bắt đầu sprint'}
                                        >
                                            <i className="fa-solid fa-play mr-1" />
                                            Start
                                        </button>
                                    </div>
                                </div>

                                {/* Issue List for Planning Sprint */}
                                {expandedSprint === sprint.sprintId && (
                                    <SprintIssueList
                                        sprintId={sprint.sprintId}
                                        projectId={projectId}
                                        onAddIssue={() => setShowAddIssueModal(sprint.sprintId)}
                                        onRemoveIssue={(issueId) => removeMutation.mutate({ sprintId: sprint.sprintId, issueId })}
                                        removePending={removeMutation.isPending}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Sprints */}
            {completedSprints.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <i className="fa-solid fa-check-circle text-green-500" />
                        Completed ({completedSprints.length})
                    </h3>
                    <div className="space-y-2">
                        {completedSprints.slice(0, 5).map(sprint => (
                            <div key={sprint.sprintId} className="bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 p-3">
                                <div className="flex items-center justify-between">
                                    <div
                                        className="cursor-pointer select-none"
                                        onClick={() => toggleExpand(sprint.sprintId)}
                                    >
                                        <h4 className="font-medium text-gray-700 flex items-center gap-2">
                                            {sprint.name}
                                            <i className={`fa-solid fa-chevron-${expandedSprint === sprint.sprintId ? 'up' : 'down'} text-xs text-gray-400`} />
                                        </h4>
                                        <p className="text-xs text-gray-500">
                                            {sprint.completedAt ? formatDate(sprint.completedAt) : 'Completed'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span>{sprint.totalIssues || 0} issues</span>
                                        <span className={`px-2 py-0.5 rounded text-xs ${SPRINT_STATUS.COMPLETED.color}`}>
                                            Done
                                        </span>
                                    </div>
                                </div>

                                {/* Issue List for Completed Sprint (read-only) */}
                                {expandedSprint === sprint.sprintId && (
                                    <SprintIssueList
                                        sprintId={sprint.sprintId}
                                        projectId={projectId}
                                        readOnly={true}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {sprints.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                    <i className="fa-solid fa-layer-group text-4xl text-gray-300 mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Chưa có Sprint nào</h3>
                    <p className="text-sm text-gray-500 mb-4">Tạo sprint đầu tiên để bắt đầu quản lý công việc theo chu kỳ</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary"
                    >
                        <i className="fa-solid fa-plus mr-2" />
                        Tạo Sprint
                    </button>
                </div>
            )}

            {/* Create Sprint Modal */}
            {showCreateModal && (
                <CreateSprintModal
                    projectId={projectId}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        queryClient.invalidateQueries(['sprints', projectId]);
                        setShowCreateModal(false);
                    }}
                />
            )}

            {/* Add Issue Modal */}
            {showAddIssueModal && (
                <AddIssueToSprintModal
                    projectId={projectId}
                    sprintId={showAddIssueModal}
                    onClose={() => setShowAddIssueModal(null)}
                    onSuccess={() => {
                        queryClient.invalidateQueries(['sprintIssues', showAddIssueModal]);
                        queryClient.invalidateQueries(['sprints', projectId]);
                        setShowAddIssueModal(null);
                    }}
                />
            )}
        </div>
    );
}

// ─── Sprint Issue List Component ─────────────────────────────────────
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
                    <i className="fa-solid fa-list-check text-indigo-500" />
                    Issues ({issues.length})
                </h4>
                {!readOnly && onAddIssue && (
                    <button
                        onClick={onAddIssue}
                        className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium flex items-center gap-1"
                    >
                        <i className="fa-solid fa-plus" />
                        Thêm Issue
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-6">
                    <i className="fa-solid fa-spinner fa-spin text-indigo-500" />
                    <span className="ml-2 text-sm text-gray-500">Đang tải...</span>
                </div>
            ) : issues.length === 0 ? (
                <div className="text-center py-6 bg-white/50 rounded-lg border border-dashed border-gray-300">
                    <i className="fa-solid fa-inbox text-2xl text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">Chưa có issue nào trong sprint này</p>
                    {!readOnly && onAddIssue && (
                        <button
                            onClick={onAddIssue}
                            className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            + Thêm issue từ backlog
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {issues.map(issue => {
                        const typeInfo = ISSUE_TYPE_ICONS[issue.issueType] || ISSUE_TYPE_ICONS.TASK;
                        const statusColor = ISSUE_STATUS_COLORS[issue.status] || 'bg-gray-100 text-gray-700';
                        return (
                            <div
                                key={issue.issueId}
                                className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors group"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <i className={`fa-solid ${typeInfo.icon} ${typeInfo.color} text-sm`} />
                                    <span className="text-sm text-gray-800 truncate font-medium">
                                        {issue.title}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${statusColor}`}>
                                        {issue.status?.replace(/_/g, ' ')}
                                    </span>
                                    {issue.assigneeName && (
                                        <span className="text-xs text-gray-400 whitespace-nowrap">
                                            <i className="fa-solid fa-user mr-1" />
                                            {issue.assigneeName}
                                        </span>
                                    )}
                                </div>
                                {!readOnly && onRemoveIssue && (
                                    <button
                                        onClick={() => onRemoveIssue(issue.issueId)}
                                        disabled={removePending}
                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1 rounded"
                                        title="Gỡ khỏi sprint"
                                    >
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

// ─── Add Issue to Sprint Modal ───────────────────────────────────────
function AddIssueToSprintModal({ projectId, sprintId, onClose, onSuccess }) {
    const [selectedIssues, setSelectedIssues] = useState([]);
    const [search, setSearch] = useState('');
    const toast = useToast();

    // Fetch backlog issues (not assigned to any sprint)
    const { data: backlogData, isLoading } = useQuery({
        queryKey: ['backlogIssues', projectId],
        queryFn: async () => {
            const res = (await apiClient.get(ENDPOINTS.ISSUES.BACKLOG(projectId), { params: { size: 200 } })).data;
            return res?.content || (Array.isArray(res) ? res : []);
        },
        enabled: !!projectId,
    });

    const backlogIssues = backlogData || [];
    const filteredIssues = backlogIssues.filter(issue =>
        issue.title?.toLowerCase().includes(search.toLowerCase())
    );

    const toggleIssue = (issueId) => {
        setSelectedIssues(prev =>
            prev.includes(issueId) ? prev.filter(id => id !== issueId) : [...prev, issueId]
        );
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (selectedIssues.length === 0) {
            toast.error('Vui lòng chọn ít nhất 1 issue');
            return;
        }
        setIsSubmitting(true);
        try {
            await Promise.all(
                selectedIssues.map(issueId =>
                    apiClient.post(ENDPOINTS.SPRINTS.ADD_ISSUE(sprintId, issueId))
                )
            );
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
            <div
                role="dialog"
                aria-modal="true"
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Thêm Issue vào Sprint</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Chọn issues từ backlog để thêm vào sprint</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fa-solid fa-times" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-6 py-3 border-b border-gray-100">
                    <div className="relative">
                        <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-700 dark:border-gray-600 dark:text-gray-100"
                            placeholder="Tìm issue theo tên..."
                        />
                    </div>
                    {selectedIssues.length > 0 && (
                        <div className="mt-2 text-xs text-indigo-600 font-medium">
                            Đã chọn {selectedIssues.length} issue
                        </div>
                    )}
                </div>

                {/* Issue List */}
                <div className="flex-1 overflow-y-auto px-6 py-3" style={{ maxHeight: '400px' }}>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <i className="fa-solid fa-spinner fa-spin text-indigo-500 mr-2" />
                            <span className="text-sm text-gray-500">Đang tải backlog...</span>
                        </div>
                    ) : filteredIssues.length === 0 ? (
                        <div className="text-center py-8">
                            <i className="fa-solid fa-inbox text-3xl text-gray-300 mb-2" />
                            <p className="text-sm text-gray-500">
                                {search ? 'Không tìm thấy issue phù hợp' : 'Không có issue nào trong backlog'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredIssues.map(issue => {
                                const isSelected = selectedIssues.includes(issue.issueId);
                                const typeInfo = ISSUE_TYPE_ICONS[issue.issueType] || ISSUE_TYPE_ICONS.TASK;
                                const statusColor = ISSUE_STATUS_COLORS[issue.status] || 'bg-gray-100 text-gray-700';
                                return (
                                    <label
                                        key={issue.issueId}
                                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isSelected
                                                ? 'bg-indigo-50 border border-indigo-200'
                                                : 'hover:bg-gray-50 border border-transparent'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleIssue(issue.issueId)}
                                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        />
                                        <i className={`fa-solid ${typeInfo.icon} ${typeInfo.color} text-sm`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-800 truncate">
                                                {issue.title}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`px-1.5 py-0.5 rounded text-xs ${statusColor}`}>
                                                    {issue.status?.replace(/_/g, ' ')}
                                                </span>
                                                {issue.assigneeName && (
                                                    <span className="text-xs text-gray-400">
                                                        {issue.assigneeName}
                                                    </span>
                                                )}
                                                {issue.priority && (
                                                    <span className="text-xs text-gray-400">
                                                        {issue.priority}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                        {filteredIssues.length} issues trong backlog
                    </span>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || selectedIssues.length === 0}
                            className="btn-primary disabled:opacity-50 text-sm"
                        >
                            {isSubmitting ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin mr-2" />
                                    Đang thêm...
                                </>
                            ) : (
                                `Thêm ${selectedIssues.length > 0 ? selectedIssues.length + ' issue' : ''}`
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Create Sprint Modal ─────────────────────────────────────────────
function CreateSprintModal({ projectId, onClose, onSuccess }) {
    const [form, setForm] = useState({
        name: '',
        goal: '',
        startDate: '',
        endDate: '',
    });
    const toast = useToast();

    const createMutation = useMutation({
        mutationFn: async (data) => {
            return (await apiClient.post(ENDPOINTS.SPRINTS.LIST, { ...data, projectId })).data;
        },
        onSuccess: () => {
            toast.success('Tạo sprint thành công!');
            onSuccess();
        },
        onError: (err) => {
            toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error('Vui lòng nhập tên sprint');
            return;
        }
        createMutation.mutate(form);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Tạo Sprint Mới</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fa-solid fa-times" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tên Sprint <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-800 dark:text-gray-100 dark:border-gray-600"
                            placeholder="VD: Sprint 1"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sprint Goal</label>
                        <textarea
                            value={form.goal}
                            onChange={(e) => setForm({ ...form, goal: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            placeholder="Mục tiêu của sprint này..."
                            rows={2}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                            <input
                                type="date"
                                value={form.startDate}
                                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-800 dark:text-gray-100 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                            <input
                                type="date"
                                value={form.endDate}
                                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-800 dark:text-gray-100 dark:border-gray-600"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="btn-primary disabled:opacity-50"
                        >
                            {createMutation.isPending ? 'Đang tạo...' : 'Tạo Sprint'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
