import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    useDroppable,
    useDraggable,
    pointerWithin,
    rectIntersection,
} from '@dnd-kit/core';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { useTimerStore, fireTaskCompleted, fireTaskToReview, fireTaskStopped, calculateWorkingSeconds } from '@shared/stores/timerStore';
import IssueDetailModal from './components/IssueDetailModal';
import SubmitTaskModal from './components/SubmitTaskModal';
import QuickReviewModal from './components/QuickReviewModal';

const VIEW_MODES = [
    { id: 'all', label: 'Tất cả', icon: 'fa-list-check' },
    { id: 'assigned', label: 'Được giao', icon: 'fa-user-check' },
    { id: 'reported', label: 'Tôi tạo', icon: 'fa-user-pen' },
    { id: 'overdue', label: 'Quá hạn', icon: 'fa-clock' },
];

function hexToColumnStyle(hex) {
    const upperHex = hex?.toUpperCase();
    const colorMap = {
        '#94A3B8': { bg: 'bg-gray-50 border border-gray-100', dot: 'bg-slate-400', marker: 'bg-slate-200' },
        '#6366F1': { bg: 'bg-blue-50/60 border border-blue-100', dot: 'bg-indigo-500', marker: 'bg-indigo-200' },
        '#F59E0B': { bg: 'bg-amber-50/60 border border-amber-100', dot: 'bg-amber-500', marker: 'bg-amber-200' },
        '#10B981': { bg: 'bg-emerald-50/60 border border-emerald-100', dot: 'bg-green-500', marker: 'bg-emerald-200' },
        '#EF4444': { bg: 'bg-red-50/60 border border-red-100', dot: 'bg-red-500', marker: 'bg-red-200' },
        '#8B5CF6': { bg: 'bg-purple-50/60 border border-purple-100', dot: 'bg-purple-500', marker: 'bg-purple-200' },
        '#EC4899': { bg: 'bg-pink-50/60 border border-pink-100', dot: 'bg-pink-500', marker: 'bg-pink-200' },
        '#06B6D4': { bg: 'bg-cyan-50/60 border border-cyan-100', dot: 'bg-cyan-500', marker: 'bg-cyan-200' },
        '#F97316': { bg: 'bg-orange-50/60 border border-orange-100', dot: 'bg-orange-500', marker: 'bg-orange-200' },
    };
    return colorMap[upperHex] || { bg: 'bg-gray-50 border border-gray-100', dot: 'bg-slate-400', marker: 'bg-slate-200' };
}

const BACKWARD_MOVES = {
    'To Do': new Set([]),
    'In Progress': new Set(['To Do']),
    'Review': new Set(['To Do', 'In Progress']),
    'Done': new Set(['To Do', 'In Progress', 'Review']),
};

// Statuses considered "forward" (not rework)
const FORWARD_STATUSES = new Set(['Review', 'Done', 'Testing', 'test', 'review', 'done', 'kiểm tra', 'đánh giá', 'hoàn thành']);
// Statuses considered "backward" (rework trigger)
const BACKWARD_STATUSES = new Set(['In Progress', 'To Do', 'to do', 'in progress', 'progress', 'đang thực hiện', 'chưa bắt đầu', 'mở']);

function isBackwardMove(fromStatus, toStatus) {
    if (!fromStatus || !toStatus) return false;
    const oldLower = fromStatus.toLowerCase();
    const newLower = toStatus.toLowerCase();
    const isOldForward = [...FORWARD_STATUSES].some(s => oldLower.includes(s.toLowerCase()));
    const isNewBackward = [...BACKWARD_STATUSES].some(s => newLower.includes(s.toLowerCase()));
    return isOldForward && isNewBackward;
}

export default function MyIssuesPage() {
    const [viewMode, setViewMode] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [submitIssue, setSubmitIssue] = useState(null);
    const [quickReviewIssueId, setQuickReviewIssueId] = useState(null);
    const [activeId, setActiveId] = useState(null);
    // Rework warning modal state
    const [reworkWarning, setReworkWarning] = useState(null);
    const [pendingMove, setPendingMove] = useState(null);
    // Track which issues have been penalized in the current backward cycle
    const [penalizedIssues, setPenalizedIssues] = useState(new Set());
    const [selectedProjectId, setSelectedProjectId] = useState('all');
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const { data: issueStatuses = [] } = useQuery({
        queryKey: ['issue-statuses-for-submit'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.ISSUE_STATUSES.LIST);
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    const statusNameToId = useMemo(() =>
        issueStatuses.reduce((acc, s) => { acc[s.name] = s.statusId; return acc; }, {}),
        [issueStatuses]
    );

    const statuses = useMemo(() => {
        return issueStatuses.length > 0 ? issueStatuses : [
            { statusId: 1, name: 'To Do', orderIndex: 1, color: '#94A3B8' },
            { statusId: 2, name: 'In Progress', orderIndex: 2, color: '#6366F1' },
            { statusId: 3, name: 'Review', orderIndex: 3, color: '#F59E0B' },
            { statusId: 4, name: 'Done', orderIndex: 4, color: '#10B981' },
        ];
    }, [issueStatuses]);

    const STATUS_ORDER = useMemo(() => statuses.map(s => s.name), [statuses]);

    const COLUMN_STYLES = useMemo(() => {
        return statuses.reduce((acc, s) => {
            acc[s.name] = hexToColumnStyle(s.color);
            return acc;
        }, {});
    }, [statuses]);

    // Fetch my projects
    const { data: projects = [] } = useQuery({
        queryKey: ['projects', 'my'],
        queryFn: async () => {
            try {
                const res = await apiClient.get(ENDPOINTS.PROJECTS.MY_PROJECTS, {
                    params: { size: 100 }
                });
                return Array.isArray(res.data) ? res.data : (res.data?.content || []);
            } catch { return []; }
        },
        staleTime: 2 * 60 * 1000,
    });

    const activeProjects = useMemo(() => {
        return (projects || []).filter(p => p.status === 'ACTIVE');
    }, [projects]);

    // Fetch sprints for each active project to identify their active sprints
    const sprintQueries = useQueries({
        queries: activeProjects.map(p => ({
            queryKey: ['sprints', p.projectId || p.id],
            queryFn: async () => {
                try {
                    const res = await apiClient.get(ENDPOINTS.SPRINTS.BY_PROJECT(p.projectId || p.id));
                    return res.data || [];
                } catch {
                    return [];
                }
            },
            staleTime: 60000,
            enabled: !!(p.projectId || p.id),
        }))
    });

    const activeSprintIdsByProject = useMemo(() => {
        const map = new Map();
        sprintQueries.forEach((q, idx) => {
            const project = activeProjects[idx];
            if (!project) return;
            const sprints = q.data || [];
            const activeSprint = sprints.find(s => s.status === 'ACTIVE');
            if (activeSprint) {
                map.set(String(project.projectId || project.id), activeSprint.sprintId);
            }
        });
        return map;
    }, [sprintQueries, activeProjects]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const kanbanCollisionDetection = useCallback((args) => {
        const pointerCollisions = pointerWithin(args);
        if (pointerCollisions.length > 0) {
            const columnHit = pointerCollisions.find(c => STATUS_ORDER.includes(c.id));
            if (columnHit) return [columnHit];
            return pointerCollisions;
        }
        return rectIntersection(args);
    }, [STATUS_ORDER]);

    // Fetch my assigned issues
    const { data: assignedIssues = [], isLoading: loadingAssigned } = useQuery({
        queryKey: ['myIssues'],
        queryFn: async () => {
            try {
                const response = (await apiClient.get(ENDPOINTS.ISSUES.MY_ISSUES, {
                    params: { size: 1000, sort: 'createdAt,desc' }
                })).data;
                return response?.content || response || [];
            } catch { return []; }
        },
    });

    // Fetch issues I reported
    const { data: reportedIssues = [], isLoading: loadingReported } = useQuery({
        queryKey: ['myReportedIssues'],
        queryFn: async () => {
            try {
                const response = (await apiClient.get(ENDPOINTS.ISSUES.MY_REPORTED, {
                    params: { size: 1000, sort: 'createdAt,desc' }
                })).data;
                return Array.isArray(response) ? response : (response?.content || []);
            } catch { return []; }
        },
    });

    const submitMutation = useMutation({
        mutationFn: async ({ issueId, targetStatusId, note }) => {
            await apiClient.post(ENDPOINTS.COMMENTS.CREATE, { issueId, content: `[Nộp task] ${note.trim()}` });
            await apiClient.patch(ENDPOINTS.ISSUES.UPDATE_STATUS_TO(issueId, targetStatusId));
        },
        onSuccess: () => {
            showToast('Đã nộp task thành công', 'success');
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            queryClient.invalidateQueries({ queryKey: ['myIssues'] });
            queryClient.invalidateQueries({ queryKey: ['myReportedIssues'] });
            queryClient.invalidateQueries({ queryKey: ['backlog-including-planning'] });
        },
        onError: (err) => showToast(err?.response?.data?.message || 'Không thể nộp task', 'error'),
    });

    const moveIssueMutation = useMutation({
        mutationFn: async ({ issueId, targetStatusId, applyPenalty, fromStatusName }) =>
            apiClient.patch(ENDPOINTS.ISSUES.UPDATE_STATUS_TO(issueId, targetStatusId)),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            queryClient.invalidateQueries({ queryKey: ['myIssues'] });
            queryClient.invalidateQueries({ queryKey: ['myReportedIssues'] });
            queryClient.invalidateQueries({ queryKey: ['backlog-including-planning'] });
            const reworkCount = data?.data?.reworkCount;
            if (reworkCount > 0 && variables.applyPenalty) {
                showToast(`Rework! Đã bị trừ ${reworkCount} lần rework (-${reworkCount * 5}% điểm)`, 'warning', 4000);
            }
            // Auto-start timer or stop timer based on target status name
            const targetStatusName = issueStatuses.find(s => s.statusId === variables.targetStatusId)?.name;
            if (targetStatusName === 'In Progress') {
                const issueObj = allIssues.find(i => i.issueId === variables.issueId);
                if (issueObj) {
                    useTimerStore.getState().startTimer({
                        issueId: variables.issueId,
                        issueKey: issueObj.issueKey,
                        issueTitle: issueObj.title,
                    });
                }
            } else if (variables.fromStatusName === 'In Progress') {
                if (targetStatusName === 'Done') {
                    fireTaskCompleted(variables.issueId);
                } else if (targetStatusName === 'Review') {
                    fireTaskToReview(variables.issueId);
                } else {
                    fireTaskStopped(variables.issueId);
                }
            } else {
                if (targetStatusName === 'Done') {
                    fireTaskCompleted(variables.issueId);
                } else if (targetStatusName === 'Review') {
                    fireTaskToReview(variables.issueId);
                }
            }
        },
        onError: () => showToast('Không thể di chuyển task', 'error'),
    });

    const isLoading = loadingAssigned || loadingReported || sprintQueries.some(q => q.isLoading);

    const assignedUnique = useMemo(() => {
        const unique = [...new Map(assignedIssues.map(i => [i.issueId, i])).values()];
        return unique.filter(i => {
            const projIdStr = String(i.projectId);
            const activeSprintId = activeSprintIdsByProject.get(projIdStr);
            return activeSprintId && String(i.sprintId) === String(activeSprintId);
        });
    }, [assignedIssues, activeSprintIdsByProject]);

    const reportedUnique = useMemo(() => {
        const unique = [...new Map(reportedIssues.map(i => [i.issueId, i])).values()];
        return unique.filter(i => {
            const projIdStr = String(i.projectId);
            const activeSprintId = activeSprintIdsByProject.get(projIdStr);
            return activeSprintId && String(i.sprintId) === String(activeSprintId);
        });
    }, [reportedIssues, activeSprintIdsByProject]);

    const allIssues = useMemo(() => {
        const seen = new Map();
        [...assignedUnique, ...reportedUnique].forEach(i => {
            if (!seen.has(i.issueId)) seen.set(i.issueId, i);
        });
        return Array.from(seen.values());
    }, [assignedUnique, reportedUnique]);

    const projectsFilteredIssues = useMemo(() => {
        if (selectedProjectId && selectedProjectId !== 'all') {
            return allIssues.filter(i => String(i.projectId) === String(selectedProjectId));
        }
        return allIssues;
    }, [allIssues, selectedProjectId]);

    const projectsFilteredAssigned = useMemo(() => {
        if (selectedProjectId && selectedProjectId !== 'all') {
            return assignedUnique.filter(i => String(i.projectId) === String(selectedProjectId));
        }
        return assignedUnique;
    }, [assignedUnique, selectedProjectId]);

    const projectsFilteredReported = useMemo(() => {
        if (selectedProjectId && selectedProjectId !== 'all') {
            return reportedUnique.filter(i => String(i.projectId) === String(selectedProjectId));
        }
        return reportedUnique;
    }, [reportedUnique, selectedProjectId]);

    const stats = useMemo(() => ({
        total: projectsFilteredIssues.length,
        assigned: projectsFilteredAssigned.length,
        reported: projectsFilteredReported.length,
        overdue: projectsFilteredIssues.filter(i => i.dueDate && new Date(i.dueDate) < new Date() && i.statusName !== 'Done').length,
    }), [projectsFilteredIssues, projectsFilteredAssigned, projectsFilteredReported]);

    const filteredIssues = useMemo(() => {
        let list;
        switch (viewMode) {
            case 'assigned': list = projectsFilteredAssigned; break;
            case 'reported': list = projectsFilteredReported; break;
            case 'overdue': list = projectsFilteredIssues.filter(i => i.dueDate && new Date(i.dueDate) < new Date() && i.statusName !== 'Done'); break;
            default: list = projectsFilteredIssues;
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(i =>
                i.title?.toLowerCase().includes(q) ||
                i.issueKey?.toLowerCase().includes(q) ||
                i.projectName?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [viewMode, searchQuery, projectsFilteredIssues, projectsFilteredAssigned, projectsFilteredReported]);

    const byStatus = useMemo(() =>
        STATUS_ORDER.reduce((acc, s) => { acc[s] = filteredIssues.filter(i => i.statusName === s); return acc; }, {}),
        [filteredIssues, STATUS_ORDER]
    );

    const activeIssue = activeId ? filteredIssues.find(i => i.issueId === activeId) : null;

    // ── Drag handlers
    const handleDragStart = (event) => setActiveId(event.active.id);

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);
        if (!over) return;

        const draggedIssue = filteredIssues.find(i => i.issueId === active.id);
        if (!draggedIssue) return;

        let targetStatusName = over.id;
        if (!STATUS_ORDER.includes(targetStatusName)) {
            const overIssue = filteredIssues.find(i => i.issueId === over.id);
            if (overIssue) targetStatusName = overIssue.statusName;
        }

        if (!targetStatusName || targetStatusName === draggedIssue.statusName) return;

        const targetStatusId = statusNameToId[targetStatusName];
        if (!targetStatusId) return;

        // Check if this is a backward move (rework)
        if (isBackwardMove(draggedIssue.statusName, targetStatusName)) {
            const alreadyPenalized = penalizedIssues.has(draggedIssue.issueId);
            setReworkWarning({
                issue: draggedIssue,
                fromStatus: draggedIssue.statusName,
                toStatus: targetStatusName,
                reworkCount: (draggedIssue.reworkCount || 0) + 1,
                penalty: ((draggedIssue.reworkCount || 0) + 1) * 5,
                alreadyPenalized,
            });
            setPendingMove({
                issueId: draggedIssue.issueId,
                targetStatusId,
                applyPenalty: !alreadyPenalized,
                fromStatusName: draggedIssue.statusName,
            });
        } else if (targetStatusName === 'Review' && draggedIssue.statusName !== 'Review') {
            setSubmitIssue(draggedIssue);
        } else if (draggedIssue.statusName !== 'Done' && targetStatusName === 'Done') {
            setQuickReviewIssueId(draggedIssue.issueId);
        } else {
            if (penalizedIssues.has(draggedIssue.issueId)) {
                setPenalizedIssues(prev => {
                    const next = new Set(prev);
                    next.delete(draggedIssue.issueId);
                    return next;
                });
            }
            moveIssueMutation.mutate({ issueId: draggedIssue.issueId, targetStatusId, fromStatusName: draggedIssue.statusName });
        }
    };

    const confirmReworkMove = () => {
        if (!pendingMove) return;
        if (pendingMove.applyPenalty) {
            setPenalizedIssues(prev => new Set([...prev, pendingMove.issueId]));
        }
        moveIssueMutation.mutate(pendingMove);
        setReworkWarning(null);
        setPendingMove(null);
    };

    const handleIssueClick = (issue) => setSelectedIssue(issue);
    const handleCloseModal = () => {
        setSelectedIssue(null);
        queryClient.invalidateQueries({ queryKey: ['issues'] });
        queryClient.invalidateQueries({ queryKey: ['myIssues'] });
        queryClient.invalidateQueries({ queryKey: ['myReportedIssues'] });
        queryClient.invalidateQueries({ queryKey: ['backlog-including-planning'] });
    };

    return (
        <div className="max-w-full mx-auto p-6 space-y-6">
            {/* Header Banner - Clean white card */}
            <div className="flex items-center justify-between px-6 py-5 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-list-check text-xl text-gray-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Công việc của tôi</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Kéo thả để chuyển trạng thái</p>
                    </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <StatMini icon="fa-list-check" label="Tổng" value={stats.total} />
                    <StatMini icon="fa-user-check" label="Được giao" value={stats.assigned} />
                    <StatMini icon="fa-user-pen" label="Tôi tạo" value={stats.reported} />
                    <StatMini icon="fa-clock" label="Quá hạn" value={stats.overdue} highlight={stats.overdue > 0} />
                </div>
            </div>

            {/* Toolbar - Clean minimal style */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex gap-1.5 flex-wrap">
                    {VIEW_MODES.map(mode => (
                        <button
                            key={mode.id}
                            onClick={() => setViewMode(mode.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all
                                ${viewMode === mode.id
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            <i className={`fa-solid ${mode.icon} text-xs`} />
                            {mode.label}
                            {mode.id === 'overdue' && stats.overdue > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full font-medium">
                                    {stats.overdue}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-gray-500">{filteredIssues.length} công việc</span>

                    {/* Project Filter */}
                    <div className="relative">
                        <select
                            value={selectedProjectId}
                            onChange={e => setSelectedProjectId(e.target.value)}
                            className="pl-3 pr-8 py-2 text-sm rounded-lg border border-gray-250 focus:outline-none focus:border-gray-400 bg-white transition-all appearance-none cursor-pointer font-medium text-gray-600"
                        >
                            <option value="all">Tất cả dự án</option>
                            {activeProjects.map(p => (
                                <option key={p.projectId || p.id} value={p.projectId || p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[10px]" />
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                        <input
                            type="text" placeholder="Tìm kiếm..." value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 w-40 focus:outline-none focus:border-gray-300 focus:ring-0 bg-white transition-all"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <i className="fa-solid fa-xmark text-xs" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Board - Minimalist Kanban */}
            {isLoading ? (
                <LoadingBoard />
            ) : filteredIssues.length === 0 ? (
                <EmptyState viewMode={viewMode} />
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={kanbanCollisionDetection}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)]">
                        {STATUS_ORDER.map(statusName => (
                            <KanbanColumn
                                key={statusName}
                                title={statusName}
                                issues={byStatus[statusName] || []}
                                onIssueClick={handleIssueClick}
                                onSubmit={setSubmitIssue}
                                colStyle={COLUMN_STYLES[statusName]}
                            />
                        ))}
                    </div>

                    <DragOverlay dropAnimation={null}>
                        {activeIssue && <IssueCardOverlay issue={activeIssue} />}
                    </DragOverlay>
                </DndContext>
            )}

            {/* Rework Warning Modal - Minimalist */}
            {reworkWarning && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {reworkWarning.alreadyPenalized ? 'Di chuyển ngược' : 'Cảnh báo Rework'}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {reworkWarning.alreadyPenalized
                                    ? 'Task này đã bị phạt rework.'
                                    : 'Bạn đang kéo task ngược về'}
                            </p>
                        </div>
                        <div className="p-6">
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mr-2">
                                    {reworkWarning.issue.issueKey}
                                </span>
                                <span className="text-sm text-gray-700">{reworkWarning.issue.title}</span>
                            </div>
                            {!reworkWarning.alreadyPenalized && (
                                <div className="bg-red-50 rounded-lg p-4 mb-4">
                                    <p className="text-sm font-medium text-red-700">Ảnh hưởng đến điểm Performance</p>
                                    <div className="mt-2 space-y-1 text-sm">
                                        <div className="flex justify-between"><span className="text-gray-600">Rework lần này:</span><span className="font-medium text-red-600">-5%</span></div>
                                        <div className="flex justify-between"><span className="text-gray-600">Tổng penalty:</span><span className="font-medium text-red-600">-{reworkWarning.penalty}% điểm</span></div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                            <button
                                onClick={() => { setReworkWarning(null); setPendingMove(null); }}
                                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={confirmReworkMove}
                                disabled={moveIssueMutation.isPending}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                                Xác nhận Rework
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Submit Modal */}
            {submitIssue && (
                <SubmitTaskModal
                    issue={submitIssue}
                    onClose={() => setSubmitIssue(null)}
                    onSuccess={() => setSubmitIssue(null)}
                />
            )}

            {/* Quick Review Modal */}
            {quickReviewIssueId && (
                <QuickReviewModal
                    issue={allIssues.find(i => i.issueId === quickReviewIssueId)}
                    onClose={() => setQuickReviewIssueId(null)}
                    onSuccess={() => {
                        // Auto-stop timer and log time when task is completed
                        fireTaskCompleted(quickReviewIssueId);
                        queryClient.invalidateQueries({ queryKey: ['issues'] });
                        queryClient.invalidateQueries({ queryKey: ['myIssues'] });
                        queryClient.invalidateQueries({ queryKey: ['myReportedIssues'] });
                        queryClient.invalidateQueries({ queryKey: ['backlog-including-planning'] });
                        setQuickReviewIssueId(null);
                    }}
                />
            )}

            {selectedIssue && <IssueDetailModal issue={selectedIssue} onClose={handleCloseModal} />}
        </div>
    );
}

// ─── Stat Mini Card ───────────────────────────────────────────────────────
function StatMini({ icon, label, value, highlight }) {
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all
            ${highlight ? 'bg-red-50 border border-red-100' : 'bg-gray-100'}`}
        >
            <i className={`fa-solid ${icon} text-sm ${highlight ? 'text-red-500' : 'text-gray-500'}`} />
            <div>
                <div className={`text-lg font-semibold leading-none ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</div>
                <div className={`text-[10px] mt-0.5 ${highlight ? 'text-red-500' : 'text-gray-500'}`}>{label}</div>
            </div>
        </div>
    );
}

// ─── Kanban Column - Minimalist ────────────────────────────────────────────
function KanbanColumn({ title, issues = [], onIssueClick, onSubmit, colStyle }) {
    const { setNodeRef, isOver } = useDroppable({ id: title });
    const finalStyle = colStyle || { bg: 'bg-gray-50 border border-gray-100', dot: 'bg-slate-400', marker: 'bg-slate-200' };

    return (
        <div className={`
            flex-shrink-0 w-80 flex flex-col rounded-xl max-h-full transition-all duration-200
            ${finalStyle.bg}
            ${isOver ? 'ring-2 ring-indigo-400 scale-[1.01] shadow-lg' : ''}
        `}>
            {/* Column Header */}
            <div className="px-4 py-3 flex items-center justify-between rounded-t-xl bg-white/60 backdrop-blur-sm sticky top-0 z-10 font-bold border-b border-gray-100/50">
                <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${finalStyle.marker}`} />
                    <span className="text-sm font-semibold text-gray-700">{title}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white text-gray-500 shadow-sm border border-gray-100">
                    {issues.length}
                </span>
            </div>

            {/* Cards */}
            <div
                ref={setNodeRef}
                className={`flex-1 p-3 overflow-y-auto custom-scrollbar space-y-2.5 min-h-[120px] transition-colors duration-200
                    ${isOver ? 'bg-indigo-100/40' : ''}`}
            >
                {issues.length === 0 ? (
                    <div className={`h-full flex items-center justify-center text-xs border-2 border-dashed rounded-xl py-10 transition-colors
                        ${isOver ? 'border-indigo-300 text-indigo-400 bg-indigo-50/50' : 'border-gray-200 text-gray-400'}`}>
                        Kéo task vào đây
                    </div>
                ) : (
                    issues.map(issue => (
                        <DraggableIssueCard
                            key={issue.issueId}
                            issue={issue}
                            onClick={() => onIssueClick(issue)}
                            onSubmit={() => onSubmit(issue)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

// ─── Draggable Issue Card ─────────────────────────────────────────────────
function DraggableIssueCard({ issue, onClick, onSubmit }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: issue.issueId,
        data: { type: 'Issue', issue },
    });

    return (
        <div
            ref={setNodeRef}
            style={{ transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined, opacity: isDragging ? 0.3 : 1 }}
            {...attributes} {...listeners}
        >
            <IssueCard issue={issue} onClick={onClick} onSubmit={onSubmit} />
        </div>
    );
}

// ─── Mini actual time for a task card ─────────────────────────────────────────
function MiniActualTime({ issue }) {
    const { isRunning, issueId: runningIssueId, elapsedSeconds } = useTimerStore();
    const isRunningThis = isRunning && String(runningIssueId) === String(issue.issueId);
    let actual = Number(issue.loggedHours ?? issue.actualHours ?? 0);
    if (isRunningThis) {
        actual += elapsedSeconds / 3600;
    } else if (issue.statusName === 'In Progress' && issue.inProgressAt) {
        const inProgressMs = new Date(issue.inProgressAt).getTime();
        actual += calculateWorkingSeconds(inProgressMs, Date.now()) / 3600;
    }
    return (
        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
            <span className="text-gray-500 flex items-center gap-1 font-medium">
                <i className="fa-solid fa-clock text-[8px] text-gray-400" />
                Thời gian thực tế
            </span>
            <span className="font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                {actual.toFixed(1)}h
            </span>
        </div>
    );
}

// ─── Timer state indicator for a Kanban card ─────────────────────────────────
function TimerStatusBadge({ issue }) {
    const { isRunning, issueId: runningIssueId, elapsedSeconds } = useTimerStore();

    const isRunningThis = isRunning && String(runningIssueId) === String(issue.issueId);

    const formatCardTime = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    if (isRunningThis) {
        return (
            <div className="flex items-center gap-1 shrink-0">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded shrink-0">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                    {formatCardTime(elapsedSeconds)}
                </span>
                <button
                    onClick={(e) => { e.stopPropagation(); fireTaskStopped(issue.issueId); }}
                    className="w-5 h-5 rounded bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors text-[9px] shrink-0 cursor-pointer"
                    title="Tạm dừng đếm giờ"
                >
                    <i className="fa-solid fa-pause" />
                </button>
            </div>
        );
    }

    if (issue.statusName === 'In Progress') {
        return (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    useTimerStore.getState().startTimer({
                        issueId: issue.issueId,
                        issueKey: issue.issueKey,
                        issueTitle: issue.title,
                    });
                }}
                className="w-5 h-5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition-colors text-[9px] shrink-0 font-bold cursor-pointer"
                title="Bắt đầu đếm giờ"
            >
                <i className="fa-solid fa-play" />
            </button>
        );
    }

    if (issue.statusName === 'Review') {
        return (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
                <i className="fa-solid fa-pause text-[8px]" />
            </span>
        );
    }

    if (issue.statusName === 'Done') {
        return (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded shrink-0">
                <i className="fa-solid fa-check text-[8px]" />
            </span>
        );
    }

    return null;
}

// ─── Issue Card - Minimalist Style ─────────────────────────────────────────
function IssueCard({ issue, onClick, onSubmit }) {
    const { isRunning, issueId: runningIssueId } = useTimerStore();

    const isImportant = issue.isImportant;
    const isUrgent = issue.isUrgent;
    const isBoth = isImportant && isUrgent;
    const isOverdue = issue.dueDate && !issue.statusName?.includes('Done') && new Date(issue.dueDate) < new Date();
    const reworkCount = issue.reworkCount || 0;

    const isRunningThis = isRunning && String(runningIssueId) === String(issue.issueId);

    const highlightClasses = isBoth
        ? 'border-l-4 border-l-red-500 ring-2 ring-red-200 bg-gradient-to-r from-red-50/80 via-white to-orange-50/60 shadow-md shadow-red-100/50'
        : isUrgent
            ? 'border-l-4 border-l-red-400 bg-red-50/40 ring-1 ring-red-100'
            : isImportant
                ? 'border-l-4 border-l-purple-400 bg-purple-50/40 ring-1 ring-purple-100'
                : '';

    const runningClasses = isRunningThis
        ? 'ring-2 ring-indigo-500/80 bg-indigo-50/10 shadow-lg shadow-indigo-150/40 animate-pulse scale-[1.01] border-indigo-400'
        : '';

    return (
        <div
            onDoubleClick={onClick}
            className={`bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${highlightClasses} ${runningClasses}`}
        >
            {/* Priority + badges row */}
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${getPriorityColor(issue.priority)}`}>
                        {issue.priority || 'MEDIUM'}
                    </span>
                    {isBoth && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-sm">
                            <i className="fa-solid fa-fire text-[8px]" /> Làm ngay
                        </span>
                    )}
                    {isImportant && !isBoth && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                            <i className="fa-solid fa-star text-[8px]" /> Quan trọng
                        </span>
                    )}
                    {isUrgent && !isBoth && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600">
                            <i className="fa-solid fa-bolt text-[8px]" /> Khẩn cấp
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <TimerStatusBadge issue={issue} />
                </div>
            </div>

            {/* Title */}
            <h4 className="text-sm font-medium text-gray-800 mb-2 line-clamp-2">{issue.title}</h4>

            {/* Bottom row */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-gray-400 font-mono">{issue.issueKey}</span>
                    {issue.dueDate && (
                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium
                            ${isOverdue
                                ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
                                : 'bg-gray-50 text-gray-500'
                            }`}
                        >
                            <i className={`fa-solid fa-calendar-day text-[8px] ${isOverdue ? 'text-red-500' : 'text-gray-400'}`} />
                            {new Date(issue.dueDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                        </span>
                    )}
                    {reworkCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-50 text-red-600">
                            <i className="fa-solid fa-rotate-right text-[8px]" />
                            {reworkCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    {issue.assigneeName ? (
                        <div
                            className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold ring-2 ring-white"
                            title={issue.assigneeName}
                        >
                            {issue.assigneeName.charAt(0).toUpperCase()}
                        </div>
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-[10px] ring-2 ring-white">
                            <i className="fa-solid fa-user text-[8px]" />
                        </div>
                    )}
                </div>
            </div>

            {/* Mini actual time */}
            <MiniActualTime issue={issue} />

            {/* Submit action */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 flex-wrap">
                    {issue.statusName === 'Review' && <ReviewSlaChip issue={issue} />}
                </div>
                {issue.statusName !== 'Done' ? (
                    <button onClick={(e) => { e.stopPropagation(); onSubmit(); }}
                        className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-[10px] font-medium transition-colors">
                        Nộp
                    </button>
                ) : (
                    <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded font-medium">
                        <i className="fa-solid fa-check mr-1 text-[8px]" />
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Drag Overlay Card ────────────────────────────────────────────────────
function IssueCardOverlay({ issue }) {
    return (
        <div className="bg-white rounded-lg border-2 border-gray-300 p-3 shadow-lg w-80">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getPriorityColor(issue.priority)}`}>
                    {issue.priority || 'MEDIUM'}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">{issue.issueKey}</span>
            </div>
            <h4 className="text-sm font-medium text-gray-800 line-clamp-2">{issue.title}</h4>
        </div>
    );
}

// ─── Review SLA Chip ─────────────────────────────────────────────────────
function ReviewSlaChip({ issue }) {
    const ts = issue.updatedAt || issue.createdAt ? new Date(issue.updatedAt || issue.createdAt).getTime() : NaN;
    if (!ts || Number.isNaN(ts)) return null;
    const h = (Date.now() - ts) / (1000 * 60 * 60);
    if (h < 0) return null;
    const label = h >= 24 ? `${Math.floor(h / 24)}d` : `${Math.max(1, Math.floor(h))}h`;
    if (h >= 48) return <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded font-medium"><i className="fa-solid fa-triangle-exclamation text-[8px]" />Trễ SLA</span>;
    if (h >= 24) return <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium"><i className="fa-solid fa-clock text-[8px]" />Sắp trễ</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium"><i className="fa-solid fa-check text-[8px]" />SLA OK</span>;
}

function getPriorityColor(priority) {
    switch (priority) {
        case 'CRITICAL': return 'bg-red-100 text-red-700';
        case 'HIGH': return 'bg-orange-100 text-orange-700';
        case 'LOW': return 'bg-gray-100 text-gray-700';
        default: return 'bg-indigo-50 text-indigo-700'; // MEDIUM
    }
}

// ─── Loading ──────────────────────────────────────────────────────────────
function LoadingBoard() {
    return (
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)]">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex-shrink-0 w-80 bg-gray-50 rounded-xl animate-pulse p-4">
                    <div className="h-8 bg-gray-200 rounded mb-4 w-2/3" />
                    <div className="space-y-3">
                        <div className="h-32 bg-gray-200 rounded" />
                        <div className="h-32 bg-gray-200 rounded" />
                        <div className="h-28 bg-gray-200 rounded" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Empty State ─────────────────────────────────────────────────────────
function EmptyState({ viewMode }) {
    const msgs = {
        all: { icon: 'fa-list-check', title: 'Không có task nào', sub: 'Bạn chưa được giao hoặc tạo task nào.' },
        assigned: { icon: 'fa-user-check', title: 'Không có task được giao', sub: 'Không có task nào được giao cho bạn.' },
        reported: { icon: 'fa-user-pen', title: 'Chưa tạo task nào', sub: 'Bạn chưa tạo task nào.' },
        overdue: { icon: 'fa-clock', title: 'Tuyệt vời!', sub: 'Không có task nào quá hạn.' },
    };
    const m = msgs[viewMode] || msgs.all;
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-xl border border-gray-100">
            <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                <i className={`fa-solid ${m.icon} text-2xl text-gray-400`} />
            </div>
            <h3 className="text-base font-medium text-gray-700 mb-1">{m.title}</h3>
            <p className="text-sm text-gray-400">{m.sub}</p>
        </div>
    );
}
