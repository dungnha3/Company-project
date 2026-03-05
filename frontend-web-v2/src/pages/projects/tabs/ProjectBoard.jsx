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
import IssueDetailModal from '../components/IssueDetailModal';
import CreateIssueModal from '../components/CreateIssueModal';

// Map status to columns - must match backend IssueStatus names
const COLUMNS = [
    { id: 'To Do', title: 'Chờ xử lý', color: 'bg-gray-100', headerColor: 'bg-slate-200' },
    { id: 'In Progress', title: 'Đang thực hiện', color: 'bg-indigo-50', headerColor: 'bg-indigo-200' },
    { id: 'Review', title: 'Đang review', color: 'bg-yellow-50', headerColor: 'bg-yellow-200' },
    { id: 'Done', title: 'Hoàn thành', color: 'bg-green-50', headerColor: 'bg-green-200' },
];

const COLUMN_IDS = COLUMNS.map(c => c.id);

// Map statusName → statusId (matches issue_statuses table)
const STATUS_NAME_TO_ID = {
    'To Do': 1,
    'In Progress': 2,
    'Review': 3,
    'Done': 4,
};

// Custom collision detection: prioritize droppable columns, then fall back
function kanbanCollisionDetection(args) {
    // First try pointerWithin — checks which droppable the pointer is inside
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
        // Prefer column containers over individual items
        const columnHit = pointerCollisions.find(c => COLUMN_IDS.includes(c.id));
        if (columnHit) return [columnHit];
        return pointerCollisions;
    }
    // Fallback to rect intersection
    return rectIntersection(args);
}

export default function ProjectBoard({ project }) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [activeId, setActiveId] = useState(null);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Fetch all project issues
    const { data: issues = [], isLoading } = useQuery({
        queryKey: ['issues', project.projectId],
        queryFn: async () => {
            try {
                const response = (await apiClient.get(ENDPOINTS.ISSUES.BY_PROJECT(project.projectId), {
                    params: { size: 500, sort: 'createdAt,desc' }
                })).data;
                return response?.content || response || [];
            } catch {
                return [];
            }
        },
    });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    // Group issues by statusName
    const boardData = useMemo(() => {
        const grouped = {
            'To Do': [],
            'In Progress': [],
            'Review': [],
            'Done': []
        };
        issues.forEach(issue => {
            const statusName = issue.statusName || 'To Do';
            if (grouped[statusName]) grouped[statusName].push(issue);
            else grouped['To Do'].push(issue);
        });
        return grouped;
    }, [issues]);

    // Mutation for status change
    const moveIssueMutation = useMutation({
        mutationFn: ({ id, statusId }) => apiClient.patch(`/api/issues/${id}/status/${statusId}`),
        onSuccess: () => {
            queryClient.invalidateQueries(['issues', project.projectId]);
            showToast('Đã cập nhật trạng thái', 'success');
        },
        onError: () => {
            showToast('Không thể cập nhật trạng thái', 'error');
            queryClient.invalidateQueries(['issues', project.projectId]);
        }
    });

    const handleDragStart = useCallback((event) => {
        setActiveId(event.active.id);
    }, []);

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeIssueId = active.id;
        const overId = over.id;

        // Determine the target column
        let newStatusName = null;

        if (COLUMN_IDS.includes(overId)) {
            // Dropped directly onto a column
            newStatusName = overId;
        } else {
            // Dropped onto another issue card — find which column that issue is in
            const overIssue = issues.find(i => i.issueId === overId);
            if (overIssue) newStatusName = overIssue.statusName;
        }

        const activeIssue = issues.find(i => i.issueId === activeIssueId);

        if (activeIssue && newStatusName && activeIssue.statusName !== newStatusName) {
            const statusId = STATUS_NAME_TO_ID[newStatusName];
            if (statusId) {
                moveIssueMutation.mutate({ id: activeIssueId, statusId });
            }
        }
    }, [issues, moveIssueMutation]);

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
    }, []);

    const activeIssue = activeId ? issues.find(i => i.issueId === activeId) : null;

    if (isLoading) return <LoadingBoard />;

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{issues.length} công việc</span>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
                >
                    <i className="fa-solid fa-plus" />
                    Tạo Issue
                </button>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={kanbanCollisionDetection}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-300px)]">
                    {COLUMNS.map(col => (
                        <BoardColumn
                            key={col.id}
                            column={col}
                            issues={boardData[col.id] || []}
                            onIssueClick={setSelectedIssue}
                        />
                    ))}
                </div>

                <DragOverlay dropAnimation={null}>
                    {activeIssue ? (
                        <IssueCard issue={activeIssue} isOverlay />
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Issue Detail Modal */}
            {selectedIssue && (
                <IssueDetailModal
                    issue={selectedIssue}
                    onClose={() => setSelectedIssue(null)}
                    onUpdate={() => queryClient.invalidateQueries(['issues', project.projectId])}
                />
            )}

            {/* Create Issue Modal */}
            <CreateIssueModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    setShowCreateModal(false);
                    queryClient.invalidateQueries(['issues', project.projectId]);
                }}
                defaultProjectId={project.projectId}
            />
        </>
    );
}

/* ─── Column (Droppable) ──────────────────────────────────────────── */
function BoardColumn({ column, issues, onIssueClick }) {
    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
        data: { type: 'Column', statusName: column.id },
    });

    return (
        <div className={`flex-shrink-0 w-80 flex flex-col rounded-xl ${column.color} max-h-full transition-all duration-200 ${isOver ? 'ring-2 ring-indigo-400 scale-[1.02] shadow-lg' : ''
            }`}>
            <div className="p-4 font-bold text-gray-700 flex justify-between items-center bg-white/50 rounded-t-xl mb-1 sticky top-0 backdrop-blur-sm">
                <span>{column.title}</span>
                <span className="bg-white px-2 py-0.5 rounded-full text-xs text-gray-500 shadow-sm border border-gray-100">
                    {issues.length}
                </span>
            </div>

            <div
                ref={setNodeRef}
                className={`flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3 min-h-[120px] transition-colors duration-200 ${isOver ? 'bg-indigo-100/40' : ''
                    }`}
            >
                {issues.map(issue => (
                    <DraggableIssue key={issue.issueId} issue={issue} onClick={() => onIssueClick?.(issue)} />
                ))}
                {issues.length === 0 && (
                    <div className={`h-full flex items-center justify-center text-xs border-2 border-dashed rounded-lg py-8 transition-colors ${isOver ? 'border-indigo-300 text-indigo-400 bg-indigo-50/50' : 'border-gray-200 text-gray-400'
                        }`}>
                        Thả thẻ vào đây
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Draggable Issue Card ────────────────────────────────────────── */
function DraggableIssue({ issue, onClick }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging,
    } = useDraggable({
        id: issue.issueId,
        data: { type: 'Issue', issue, statusName: issue.statusName },
    });

    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 999 : 'auto',
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <IssueCard issue={issue} onClick={onClick} />
        </div>
    );
}

/* ─── Issue Card (visual only) ────────────────────────────────────── */
function IssueCard({ issue, isOverlay, onClick }) {
    if (!issue) return null;

    const isImportant = issue.isImportant;
    const isUrgent = issue.isUrgent;
    const isBoth = isImportant && isUrgent;

    // Build highlight classes
    const highlightClasses = isBoth
        ? 'border-l-4 border-l-red-500 ring-2 ring-red-200 bg-gradient-to-r from-red-50/80 via-white to-orange-50/60 shadow-md shadow-red-100/50 animate-kanban-pulse'
        : isUrgent
            ? 'border-l-4 border-l-red-400 bg-red-50/40 ring-1 ring-red-100'
            : isImportant
                ? 'border-l-4 border-l-purple-400 bg-purple-50/40 ring-1 ring-purple-100'
                : '';

    return (
        <div
            className={`
                bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group
                ${isOverlay ? 'shadow-xl rotate-2 ring-2 ring-indigo-500 ring-opacity-50 scale-105' : ''}
                ${!isOverlay ? highlightClasses : ''}
            `}
            onDoubleClick={onClick}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${getPriorityColor(issue.priority)}`}>
                        {issue.priority || 'NORMAL'}
                    </span>
                    {/* Important & Urgent badges */}
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
                <button
                    className="text-gray-300 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                    title="Xem chi tiết"
                >
                    <i className="fa-solid fa-expand" />
                </button>
            </div>

            <h4 className="text-sm font-medium text-gray-800 mb-2 line-clamp-2">{issue.title}</h4>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                <div className="text-xs text-gray-400 font-mono">#{issue.issueId}</div>

                <div className="flex items-center gap-2">
                    {issue.assignee ? (
                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold" title={issue.assignee.fullName}>
                            {issue.assignee.fullName.charAt(0)}
                        </div>
                    ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-[10px]">
                            <i className="fa-solid fa-user" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function getPriorityColor(priority) {
    switch (priority) {
        case 'CRITICAL': return 'bg-red-100 text-red-700';
        case 'HIGH': return 'bg-orange-100 text-orange-700';
        case 'LOW': return 'bg-gray-100 text-gray-700';
        default: return 'bg-indigo-50 text-indigo-700'; // MEDIUM
    }
}

function LoadingBoard() {
    return (
        <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-250px)]">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex-shrink-0 w-80 bg-gray-50 rounded-xl h-full animate-pulse p-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-24 bg-gray-200 rounded-lg"></div>
                        <div className="h-24 bg-gray-200 rounded-lg"></div>
                    </div>
                </div>
            ))}
        </div>
    );
}
