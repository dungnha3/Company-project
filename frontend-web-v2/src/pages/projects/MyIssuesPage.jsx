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

const STATUS_COLORS = {
    'To Do':       { dot: 'bg-gray-300',    headerBg: 'bg-slate-100',   colBg: 'bg-slate-50/70' },
    'In Progress': { dot: 'bg-indigo-400',  headerBg: 'bg-indigo-100',   colBg: 'bg-indigo-50/60' },
    'Review':      { dot: 'bg-amber-400',   headerBg: 'bg-amber-100',    colBg: 'bg-amber-50/60' },
    'Done':        { dot: 'bg-emerald-400', headerBg: 'bg-emerald-100',  colBg: 'bg-emerald-50/60' },
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
    // to avoid double-penalizing when user drags back to a previous state
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
            // Only show rework toast if penalty was intentionally applied (not re-penalized)
            const reworkCount = data?.data?.reworkCount;
            if (reworkCount > 0 && variables.applyPenalty) {
                showToast(`⚠️ Rework! Đã bị trừ ${reworkCount} lần rework (-${reworkCount * 5}% điểm)`, 'warning', 4000);
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
            // Only penalize if NOT already penalized in this cycle
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
            // Block direct drag to Review — must use Submit modal for evidence
            setSubmitIssue(draggedIssue);
        } else {
            // Moving forward — reset penalty flag so next backward move can penalize again
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
        // Track that this issue has been penalized so we don't penalize again
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
        <div className="space-y-4">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute -top-16 -right-16 w-60 h-60 bg-white rounded-full" />
                    <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white rounded-full" />
                </div>
                <div className="relative flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold">Công việc của tôi</h1>
                        <p className="text-indigo-100 text-sm mt-1">Kéo thả để chuyển trạng thái • Kéo ngược sẽ bị trừ điểm</p>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        <StatMini icon="fa-list-check" label="Tổng" value={stats.total} />
                        <StatMini icon="fa-user-check" label="Được giao" value={stats.assigned} />
                        <StatMini icon="fa-user-pen" label="Tôi tạo" value={stats.reported} />
                        <StatMini icon="fa-clock" label="Quá hạn" value={stats.overdue} highlight={stats.overdue > 0} />
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex gap-1.5 flex-wrap">
                    {VIEW_MODES.map(mode => (
                        <button
                            key={mode.id}
                            onClick={() => setViewMode(mode.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-sm
                                ${viewMode === mode.id
                                    ? 'bg-white text-indigo-700 shadow-md ring-1 ring-indigo-200'
                                    : 'bg-white/70 text-gray-500 hover:bg-white hover:text-gray-700'
                                }`}
                        >
                            <i className={`fa-solid ${mode.icon} text-xs`} />
                            {mode.label}
                            {mode.id === 'overdue' && stats.overdue > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full font-bold">
                                    {stats.overdue}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-medium">{filteredIssues.length} task</span>
                    <div className="relative">
                        <i className="fa-solid fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                        <input
                            type="text" placeholder="Tìm kiếm..." value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-7 pr-3 py-2 text-xs rounded-xl border border-gray-200 w-44 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 bg-white transition-all shadow-sm"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px]">
                                <i className="fa-solid fa-xmark" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Board */}
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
                                colors={STATUS_COLORS[statusName]}
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

            {/* Rework Warning Modal */}
            {reworkWarning && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden">
                        {/* Header - red gradient */}
                        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-5 text-white">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                    <i className="fa-solid fa-triangle-exclamation text-2xl" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">
                                        {reworkWarning.alreadyPenalized ? 'Di chuyển ngược' : 'Cảnh báo Rework!'}
                                    </h3>
                                    <p className="text-red-100 text-sm">
                                        {reworkWarning.alreadyPenalized
                                            ? 'Task này đã bị phạt rework. Quay lại không bị phạt thêm.'
                                            : 'Bạn đang kéo task ngược về'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-4">
                            {/* Task info */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                        {reworkWarning.issue.issueKey}
                                    </span>
                                    <span className="text-sm font-medium text-gray-700 line-clamp-2">{reworkWarning.issue.title}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="px-2 py-1 rounded bg-gray-200 text-gray-600 font-medium">
                                        {reworkWarning.fromStatus}
                                    </span>
                                    <i className="fa-solid fa-arrow-right text-gray-400" />
                                    <span className="px-2 py-1 rounded bg-red-100 text-red-600 font-bold">
                                        {reworkWarning.toStatus}
                                    </span>
                                </div>
                            </div>

                            {/* Rework impact */}
                            {reworkWarning.alreadyPenalized ? (
                                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                                    <div className="flex items-start gap-3">
                                        <i className="fa-solid fa-info-circle text-amber-500 text-lg mt-0.5" />
                                        <div>
                                            <p className="font-bold text-amber-700 text-sm">Rework đã được tính trước đó</p>
                                            <p className="text-amber-600 text-xs mt-1">
                                                Task này đã bị phạt rework rồi. Quay lại trạng thái cũ <strong>không bị phạt thêm</strong>, nhưng vẫn ghi nhận lịch sử kéo ngược.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-100">
                                    <div className="flex items-start gap-3">
                                        <i className="fa-solid fa-chart-line text-red-500 text-lg mt-0.5" />
                                        <div>
                                            <p className="font-bold text-red-700 text-sm">Ảnh hưởng đến điểm Performance</p>
                                            <div className="mt-2 space-y-1.5">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Rework lần này:</span>
                                                    <span className="font-bold text-red-600">-5%</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Tổng rework:</span>
                                                    <span className="font-bold text-red-600">{reworkWarning.reworkCount} lần</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Tổng penalty:</span>
                                                    <span className="font-bold text-red-600">-{reworkWarning.penalty}% điểm</span>
                                                </div>
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-red-200">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-700 font-medium">Điểm sau penalty:</span>
                                                    <span className="font-bold text-red-700">
                                                        {Math.max(0, 100 - reworkWarning.penalty)}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Reason input */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                                    Lý do kéo ngược <span className="text-gray-400 font-normal">(tùy chọn)</span>
                                </label>
                                <textarea
                                    id="rework-reason"
                                    placeholder="VD: Cần bổ sung requirement, lỗi phát sinh từ bên thứ 3..."
                                    rows={2}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-red-300 focus:border-red-300 transition-all"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
                            <button
                                onClick={() => { setReworkWarning(null); setPendingMove(null); }}
                                className="px-4 py-2 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors font-medium"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={confirmReworkMove}
                                disabled={moveIssueMutation.isPending}
                                className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white disabled:opacity-50 transition-all shadow-sm"
                            >
                                {moveIssueMutation.isPending ? (
                                    <><i className="fa-solid fa-spinner fa-spin mr-1.5 text-xs" />Đang xử lý...</>
                                ) : (
                                    <><i className="fa-solid fa-triangle-exclamation mr-1.5 text-xs" />Xác nhận Rework</>
                                )}
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
        <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl backdrop-blur-sm transition-all
            ${highlight ? 'bg-red-500/20 ring-1 ring-red-400/50' : 'bg-white/10 ring-1 ring-white/20'}`}
        >
            <i className={`fa-solid ${icon} text-sm ${highlight ? 'text-red-200' : 'text-indigo-200'}`} />
            <div>
                <div className={`text-lg font-bold leading-none ${highlight ? 'text-red-100' : 'text-white'}`}>{value}</div>
                <div className={`text-[10px] mt-0.5 ${highlight ? 'text-red-200' : 'text-indigo-200'}`}>{label}</div>
            </div>
        </div>
    );
}

// ─── Kanban Column ───────────────────────────────────────────────────────
function KanbanColumn({ title, colors, issues, onIssueClick, onSubmit }) {
    const { setNodeRef, isOver } = useDroppable({ id: title });

    return (
        <div className={`
            flex-shrink-0 w-80 flex flex-col rounded-2xl max-h-full transition-all duration-200
            ${isOver ? 'scale-[1.01] shadow-lg ring-2 ring-indigo-400' : ''}
            ${colors.colBg} border border-gray-100
        `}>
            {/* Column Header */}
            <div className={`px-4 py-3 flex items-center justify-between rounded-t-2xl flex-shrink-0 ${colors.headerBg}`}>
                <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                    <span className="text-sm font-bold text-gray-700">{title}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm
                    ${issues.length > 0 ? 'bg-white text-gray-600' : 'bg-gray-200 text-gray-400'}`}>
                    {issues.length}
                </span>
            </div>

            {/* Cards */}
            <div
                ref={setNodeRef}
                className={`flex-1 p-3 overflow-y-auto custom-scrollbar space-y-2.5 min-h-[120px] transition-colors duration-200
                    ${isOver ? 'bg-indigo-50/40' : ''}`}
            >
                {issues.length === 0 ? (
                    <div className={`h-full flex items-center justify-center text-xs border-2 border-dashed rounded-xl py-10 transition-colors
                        ${isOver ? 'border-indigo-300 text-indigo-400 bg-indigo-50/40' : 'border-gray-200 text-gray-300'}`}>
                        <div className="text-center">
                            <i className="fa-solid fa-hand-holding text-xl mb-1 block" />
                            Kéo task vào đây
                        </div>
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
// Shows: estimated total | logged marker | remaining portion
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
                <span className="text-[9px] text-slate-400 font-medium">Time</span>
                <span className={`text-[9px] font-bold ${isOver ? 'text-red-500' : 'text-slate-500'}`}>
                    {log.toFixed(1)}h / {est.toFixed(1)}h
                </span>
            </div>
            {/* Burndown bar */}
            <div className="relative h-1.5 bg-slate-100 rounded-full overflow-visible">
                {/* Remaining portion (gray → goes down as logged increases) */}
                <div
                    className="absolute right-0 top-0 h-full bg-slate-200 rounded-r-full transition-all"
                    style={{ width: `${Math.max(100 - progress, 0)}%` }}
                />
                {/* Logged portion (indigo → grows from left) */}
                <div
                    className={`absolute left-0 top-0 h-full rounded-l-full transition-all ${isOver ? 'bg-red-400' : 'bg-indigo-400'}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                />
                {/* Overflow (if over) */}
                {isOver && (
                    <div
                        className="absolute top-0 h-full bg-red-500 rounded-r-full"
                        style={{ left: '100%', width: `${Math.min(((log - est) / est) * 100, 30)}%` }}
                    />
                )}
            </div>
        </div>
    );
}

// ─── Timer state indicator for a Kanban card ─────────────────────────────────
// Shows: running (pulsing dot + elapsed), paused (orange badge), completed (green badge)
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

    // Card-level pulsing dot when running
    if (isRunningThis) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md shrink-0" title="Timer đang chạy">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                {formatCardTime(elapsedSeconds)}
            </span>
        );
    }

    // Paused: in Review column
    if (issue.statusName === 'Review') {
        return (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md shrink-0" title="Tạm dừng — kéo sang Review">
                <i className="fa-solid fa-pause text-[8px]" />
                Tạm dừng
            </span>
        );
    }

    // Completed: in Done column
    if (issue.statusName === 'Done') {
        return (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md shrink-0" title="Hoàn thành">
                <i className="fa-solid fa-circle-check text-[8px]" />
                Xong
            </span>
        );
    }

    // Not started: in To Do / In Progress (but not the running one)
    if (issue.statusName === 'In Progress' && !isRunningThis) {
        return (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md shrink-0" title="Bắt đầu kéo sang In Progress để đếm giờ">
                <i className="fa-solid fa-play text-[8px]" />
                Chưa đếm
            </span>
        );
    }

    return null;
}

// ─── Issue Card ───────────────────────────────────────────────────────────
function IssueCard({ issue, onClick, onSubmit }) {
    const { isRunning, issueId: runningIssueId } = useTimerStore();

    const isImportant = issue.isImportant;
    const isUrgent = issue.isUrgent;
    const isBoth = isImportant && isUrgent;
    const isOverdue = issue.dueDate && !issue.statusName?.includes('Done') && new Date(issue.dueDate) < new Date();
    const reworkCount = issue.reworkCount || 0;

    // Check if this card's issue is the running timer one
    const isRunningThis = isRunning && String(runningIssueId) === String(issue.issueId);

    const highlightClasses = isBoth
        ? 'border-l-4 border-l-red-500 ring-2 ring-red-200 bg-gradient-to-r from-red-50/80 via-white to-orange-50/60 shadow-md shadow-red-100/50'
        : isUrgent
            ? 'border-l-4 border-l-red-400 bg-red-50/40 ring-1 ring-red-100'
            : isImportant
                ? 'border-l-4 border-l-purple-400 bg-purple-50/40 ring-1 ring-purple-100'
                : '';

    return (
        <div
            onDoubleClick={onClick}
            className={`bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group
                ${highlightClasses}`}
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
                    <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md font-medium">
                        <i className="fa-solid fa-folder text-[8px]" />
                        {issue.projectName || '—'}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Timer state indicator */}
                    <TimerStatusBadge issue={issue} />
                    <button
                        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                        className="text-gray-300 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-xs"
                        title="Xem chi tiết"
                    >
                        <i className="fa-solid fa-expand" />
                    </button>
                </div>
            </div>

            {/* Title */}
            <h4 className="text-sm font-medium text-gray-800 mb-2 line-clamp-2">{issue.title}</h4>

            {/* Bottom row: key + due date + rework count + story points */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-gray-400 font-mono">{issue.issueKey}</span>
                    {issue.estimatedHours != null && issue.estimatedHours > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-amber-50 text-amber-600 ring-1 ring-amber-200"
                            title="Điểm công việc (giờ ước tính)">
                            <i className="fa-solid fa-stopwatch text-[8px]" />
                            {Number(issue.estimatedHours) % 1 === 0
                                ? Number(issue.estimatedHours)
                                : Number(issue.estimatedHours).toFixed(1)}h
                        </span>
                    )}
                    {issue.dueDate && (
                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium
                            ${isOverdue ? 'bg-red-50 text-red-600 ring-1 ring-red-200' : 'bg-gray-50 text-gray-500'}`}>
                            <i className={`fa-solid fa-calendar-day text-[8px] ${isOverdue ? 'text-red-500' : 'text-gray-400'}`} />
                            {new Date(issue.dueDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                        </span>
                    )}
                    {issue.totalScore != null && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            Number(issue.totalScore) >= 8 ? 'bg-green-100 text-green-700' :
                            Number(issue.totalScore) >= 6 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-600'
                        }`} title={`Total Score: ${Number(issue.totalScore).toFixed(1)}`}>
                            <i className="fa-solid fa-chart-simple text-[8px] mr-0.5" />
                            {Number(issue.totalScore).toFixed(1)}
                        </span>
                    )}
                    {reworkCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-red-100 text-red-600"
                            title={`Đã bị rework ${reworkCount} lần (-${reworkCount * 5}% điểm)`}>
                            <i className="fa-solid fa-rotate-right text-[8px]" />
                            {reworkCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    {issue.assigneeName ? (
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold ring-2 ring-white" title={issue.assigneeName}>
                            {issue.assigneeName.charAt(0).toUpperCase()}
                        </div>
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-[10px] ring-2 ring-white">
                            <i className="fa-solid fa-user text-[8px]" />
                        </div>
                    )}
                </div>
            </div>

            {/* Mini burndown chart */}
            <MiniBurndown issue={issue} />

            {/* Review SLA + submit action */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 flex-wrap">
                    {issue.statusName === 'Review' && <ReviewSlaChip issue={issue} />}
                </div>
                {issue.statusName !== 'Done' ? (
                    <button onClick={(e) => { e.stopPropagation(); onSubmit(); }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-semibold transition-colors shadow-sm">
                        Nộp
                    </button>
                ) : (
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">
                        <i className="fa-solid fa-check mr-1 text-[8px]" />Hoàn thành
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Drag Overlay Card ────────────────────────────────────────────────────
function IssueCardOverlay({ issue }) {
    return (
        <div className="bg-white rounded-lg border-2 border-indigo-400 p-3 shadow-xl ring-2 ring-indigo-200 rotate-2 scale-105 w-80">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${getPriorityColor(issue.priority)}`}>
                    {issue.priority || 'MEDIUM'}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">{issue.issueKey}</span>
                {issue.estimatedHours != null && issue.estimatedHours > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-50 text-amber-600 ring-1 ring-amber-200">
                        <i className="fa-solid fa-stopwatch text-[8px]" />
                        {Number(issue.estimatedHours) % 1 === 0
                            ? Number(issue.estimatedHours)
                            : Number(issue.estimatedHours).toFixed(1)}h
                    </span>
                )}
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
    const label = h >= 24 ? `${Math.floor(h/24)}d ${Math.floor(h%24)}h` : `${Math.max(1,Math.floor(h))}h`;
    if (h >= 48) return <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-semibold"><i className="fa-solid fa-triangle-exclamation text-[8px]" />Trễ SLA ({label})</span>;
    if (h >= 24) return <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-semibold"><i className="fa-solid fa-clock text-[8px]" />Sắp trễ ({label})</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-md font-semibold"><i className="fa-solid fa-check text-[8px]" />Đúng SLA ({label})</span>;
}

// ─── Priority Color ───────────────────────────────────────────────────────
function getPriorityColor(p) {
    return { CRITICAL: 'bg-red-100 text-red-700', HIGH: 'bg-orange-100 text-orange-700', LOW: 'bg-gray-100 text-gray-600' }[p] || 'bg-indigo-50 text-indigo-700';
}

// ─── Loading ──────────────────────────────────────────────────────────────
function LoadingBoard() {
    return (
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)]">
            {[1,2,3,4].map(i => (
                <div key={i} className="flex-shrink-0 w-80 bg-gray-50/70 rounded-2xl animate-pulse p-4">
                    <div className="h-8 bg-gray-200 rounded-xl mb-4 w-2/3" />
                    <div className="space-y-3">
                        <div className="h-36 bg-gray-200 rounded-xl" />
                        <div className="h-36 bg-gray-200 rounded-xl" />
                        <div className="h-28 bg-gray-200 rounded-xl" />
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
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-5">
                <i className={`fa-solid ${m.icon} text-3xl text-indigo-400`} />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">{m.title}</h3>
            <p className="text-sm text-gray-400">{m.sub}</p>
        </div>
    );
}
