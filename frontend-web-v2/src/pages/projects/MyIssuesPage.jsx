import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { useTimerStore } from '@shared/stores/timerStore';
import IssueDetailModal from './components/IssueDetailModal';
import SubmitTaskModal from './components/SubmitTaskModal';

const VIEW_MODES = [
    { id: 'all', label: 'Tất cả', icon: 'fa-list-check' },
    { id: 'assigned', label: 'Được giao', icon: 'fa-user-check' },
    { id: 'reported', label: 'Tôi tạo', icon: 'fa-user-pen' },
    { id: 'overdue', label: 'Quá hạn', icon: 'fa-clock' },
];

const STATUS_ORDER = ['To Do', 'In Progress', 'Review', 'Done'];

// Minimalist status colors - subtle indicators
const STATUS_COLORS = {
    'To Do':       { dot: 'bg-gray-400' },
    'In Progress': { dot: 'bg-indigo-500' },
    'Review':      { dot: 'bg-amber-500' },
    'Done':        { dot: 'bg-green-500' },
};

const BACKWARD_MOVES = {
    'To Do':       new Set([]),
    'In Progress': new Set(['To Do']),
    'Review':      new Set(['To Do', 'In Progress']),
    'Done':        new Set(['To Do', 'In Progress', 'Review']),
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
    const [activeId, setActiveId] = useState(null);
    // Rework warning modal state
    const [reworkWarning, setReworkWarning] = useState(null);
    const [pendingMove, setPendingMove] = useState(null);
    // Track which issues have been penalized in the current backward cycle
    const [penalizedIssues, setPenalizedIssues] = useState(new Set());
    const queryClient = useQueryClient();
    const { showToast } = useToast();

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
    }, []);

    // Fetch my assigned issues
    const { data: assignedIssues = [], isLoading: loadingAssigned } = useQuery({
        queryKey: ['myIssues'],
        queryFn: async () => {
            try {
                const response = (await apiClient.get(ENDPOINTS.ISSUES.MY_ISSUES)).data;
                return response?.content || response || [];
            } catch { return []; }
        },
    });

    // Fetch issues I reported
    const { data: reportedIssues = [], isLoading: loadingReported } = useQuery({
        queryKey: ['myReportedIssues'],
        queryFn: async () => {
            try {
                const response = (await apiClient.get(ENDPOINTS.ISSUES.MY_REPORTED)).data;
                return Array.isArray(response) ? response : (response?.content || []);
            } catch { return []; }
        },
    });

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

    const submitMutation = useMutation({
        mutationFn: async ({ issueId, targetStatusId, note }) => {
            await apiClient.post(ENDPOINTS.COMMENTS.CREATE, { issueId, content: `[Nộp task] ${note.trim()}` });
            await apiClient.patch(ENDPOINTS.ISSUES.UPDATE_STATUS_TO(issueId, targetStatusId));
        },
        onSuccess: () => {
            showToast('Đã nộp task thành công', 'success');
            queryClient.invalidateQueries(['myIssues']);
            queryClient.invalidateQueries(['myReportedIssues']);
        },
        onError: (err) => showToast(err?.response?.data?.message || 'Không thể nộp task', 'error'),
    });

    const moveIssueMutation = useMutation({
        mutationFn: async ({ issueId, targetStatusId, applyPenalty }) =>
            apiClient.patch(ENDPOINTS.ISSUES.UPDATE_STATUS_TO(issueId, targetStatusId)),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries(['myIssues']);
            queryClient.invalidateQueries(['myReportedIssues']);
            const reworkCount = data?.data?.reworkCount;
            if (reworkCount > 0 && variables.applyPenalty) {
                showToast(`Rework! Đã bị trừ ${reworkCount} lần rework (-${reworkCount * 5}% điểm)`, 'warning', 4000);
            }
        },
        onError: () => showToast('Không thể di chuyển task', 'error'),
    });

    const isLoading = loadingAssigned || loadingReported;

    const allIssues = useMemo(() => {
        const seen = new Map();
        [...assignedIssues, ...reportedIssues].forEach(i => {
            if (!seen.has(i.issueId)) seen.set(i.issueId, i);
        });
        return Array.from(seen.values());
    }, [assignedIssues, reportedIssues]);

    const assignedUnique = useMemo(() =>
        [...new Map(assignedIssues.map(i => [i.issueId, i])).values()], [assignedIssues]);
    const reportedUnique = useMemo(() =>
        [...new Map(reportedIssues.map(i => [i.issueId, i])).values()], [reportedIssues]);

    const stats = useMemo(() => ({
        total: allIssues.length,
        assigned: assignedUnique.length,
        reported: reportedUnique.length,
        overdue: allIssues.filter(i => i.dueDate && new Date(i.dueDate) < new Date() && i.statusName !== 'Done').length,
    }), [allIssues, assignedUnique, reportedUnique]);

    const filteredIssues = useMemo(() => {
        let list;
        switch (viewMode) {
            case 'assigned':  list = assignedUnique; break;
            case 'reported':  list = reportedUnique; break;
            case 'overdue':   list = allIssues.filter(i => i.dueDate && new Date(i.dueDate) < new Date() && i.statusName !== 'Done'); break;
            default:          list = allIssues;
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
    }, [viewMode, searchQuery, allIssues, assignedUnique, reportedUnique]);

    const byStatus = useMemo(() =>
        STATUS_ORDER.reduce((acc, s) => { acc[s] = filteredIssues.filter(i => i.statusName === s); return acc; }, {}),
        [filteredIssues]
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
            });
        } else if (targetStatusName === 'Review' && draggedIssue.statusName !== 'Review') {
            setSubmitIssue(draggedIssue);
        } else {
            if (penalizedIssues.has(draggedIssue.issueId)) {
                setPenalizedIssues(prev => {
                    const next = new Set(prev);
                    next.delete(draggedIssue.issueId);
                    return next;
                });
            }
            moveIssueMutation.mutate({ issueId: draggedIssue.issueId, targetStatusId });
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
        queryClient.invalidateQueries(['myIssues']);
        queryClient.invalidateQueries(['myReportedIssues']);
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
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
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{filteredIssues.length} task</span>
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
                                dotColor={STATUS_COLORS[statusName].dot}
                                issues={byStatus[statusName]}
                                onIssueClick={handleIssueClick}
                                onSubmit={setSubmitIssue}
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
function KanbanColumn({ title, dotColor, issues, onIssueClick, onSubmit }) {
    const { setNodeRef, isOver } = useDroppable({ id: title });

    return (
        <div className={`
            flex-shrink-0 w-80 flex flex-col rounded-xl max-h-full transition-all
            ${isOver ? 'shadow-md' : ''}
            bg-gray-50/50 border border-gray-100
        `}>
            {/* Column Header - Clean, no background color */}
            <div className="px-4 py-3 flex items-center justify-between rounded-t-xl">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <span className="text-sm font-medium text-gray-700">{title}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                    {issues.length}
                </span>
            </div>

            {/* Cards */}
            <div
                ref={setNodeRef}
                className={`flex-1 p-3 overflow-y-auto custom-scrollbar space-y-2 min-h-[120px] transition-colors
                    ${isOver ? 'bg-gray-100' : ''}`}
            >
                {issues.length === 0 ? (
                    <div className={`h-full flex items-center justify-center text-xs border-2 border-dashed rounded-xl py-10 transition-colors
                        ${isOver ? 'border-gray-300 text-gray-400 bg-gray-100' : 'border-gray-200 text-gray-400'}`}>
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

// ─── Mini burndown bar for a task card ─────────────────────────────────────────
function MiniBurndown({ issue }) {
    const est = issue.estimatedHours;
    const log = issue.loggedHours ?? 0;
    if (!est || est <= 0) return null;

    const progress = Math.min((log / est) * 100, 100);
    const remaining = Math.max(est - log, 0);
    const isOver = log > est;

    return (
        <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-gray-400">Time</span>
                <span className={`text-[9px] font-medium ${isOver ? 'text-red-500' : 'text-gray-500'}`}>
                    {log.toFixed(1)}h / {est.toFixed(1)}h
                </span>
            </div>
            <div className="relative h-1 bg-gray-200 rounded-full">
                <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all ${isOver ? 'bg-red-400' : 'bg-gray-400'}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                />
            </div>
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
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded shrink-0">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                {formatCardTime(elapsedSeconds)}
            </span>
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

    return (
        <div
            onDoubleClick={onClick}
            className={`bg-white p-3 rounded-lg border border-gray-100 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing group`}
        >
            {/* Priority + badges row */}
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getPriorityColor(issue.priority)}`}>
                        {issue.priority || 'MEDIUM'}
                    </span>
                    {isBoth && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-700">
                            <i className="fa-solid fa-fire text-[8px]" />
                        </span>
                    )}
                    {isImportant && !isBoth && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                            <i className="fa-solid fa-star text-[8px]" />
                        </span>
                    )}
                    {isUrgent && !isBoth && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-700">
                            <i className="fa-solid fa-bolt text-[8px]" />
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
                    {issue.estimatedHours != null && issue.estimatedHours > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium bg-gray-100 text-gray-600">
                            {Number(issue.estimatedHours) % 1 === 0
                                ? Number(issue.estimatedHours)
                                : Number(issue.estimatedHours).toFixed(1)}h
                        </span>
                    )}
                    {issue.dueDate && (
                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium
                            ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                            <i className={`fa-solid fa-calendar-day text-[8px] ${isOverdue ? 'text-red-500' : 'text-gray-400'}`} />
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
                        <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[10px] font-medium" title={issue.assigneeName}>
                            {issue.assigneeName.charAt(0).toUpperCase()}
                        </div>
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-[10px]">
                            <i className="fa-solid fa-user text-[8px]" />
                        </div>
                    )}
                </div>
            </div>

            {/* Mini burndown chart */}
            <MiniBurndown issue={issue} />

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
    const label = h >= 24 ? `${Math.floor(h/24)}d` : `${Math.max(1,Math.floor(h))}h`;
    if (h >= 48) return <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded font-medium"><i className="fa-solid fa-triangle-exclamation text-[8px]" />Trễ SLA</span>;
    if (h >= 24) return <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium"><i className="fa-solid fa-clock text-[8px]" />Sắp trễ</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium"><i className="fa-solid fa-check text-[8px]" />SLA OK</span>;
}

// ─── Priority Color - Minimalist Subtle ─────────────────────────────────
function getPriorityColor(p) {
    return { CRITICAL: 'bg-red-50 text-red-700', HIGH: 'bg-amber-50 text-amber-700', LOW: 'bg-gray-100 text-gray-600' }[p] || 'bg-gray-100 text-gray-600';
}

// ─── Loading ──────────────────────────────────────────────────────────────
function LoadingBoard() {
    return (
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)]">
            {[1,2,3,4].map(i => (
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
        all:      { icon: 'fa-list-check', title: 'Không có task nào',          sub: 'Bạn chưa được giao hoặc tạo task nào.' },
        assigned: { icon: 'fa-user-check', title: 'Không có task được giao',   sub: 'Không có task nào được giao cho bạn.' },
        reported: { icon: 'fa-user-pen',  title: 'Chưa tạo task nào',          sub: 'Bạn chưa tạo task nào.' },
        overdue:  { icon: 'fa-clock',     title: 'Tuyệt vời!',                sub: 'Không có task nào quá hạn.' },
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
