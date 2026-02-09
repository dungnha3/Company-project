import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import IssueDetailModal from '../components/IssueDetailModal';

// Map status to columns
const COLUMNS = {
    TODO: { id: 'OPEN', title: 'To Do', color: 'bg-gray-100' },
    IN_PROGRESS: { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-50' },
    REVIEW: { id: 'IN_REVIEW', title: 'Review', color: 'bg-yellow-50' },
    DONE: { id: 'CLOSED', title: 'Done', color: 'bg-green-50' },
};

const COLUMN_IDS = Object.values(COLUMNS).map(c => c.id);

export default function ProjectBoard({ project }) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [activeId, setActiveId] = useState(null);
    const [selectedIssue, setSelectedIssue] = useState(null);

    // Fetch Issues (Assuming active sprint or all issues for now)
    // Ideally we filter by active sprint. For now let's fetch all project issues.
    const { data: issues = [], isLoading } = useQuery({
        queryKey: ['issues', project.projectId],
        queryFn: async () => {
            try {
                const response = (await apiClient.get(ENDPOINTS.ISSUES.BY_PROJECT(project.projectId))).data;
                // Handle paginated response (has .content) or direct array
                return response?.content || response || [];
            } catch {
                return [];
            }
        },
    });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Group issues by status
    const boardData = useMemo(() => {
        const grouped = {
            OPEN: [],
            IN_PROGRESS: [],
            IN_REVIEW: [],
            CLOSED: []
        };
        issues.forEach(issue => {
            // Map backend status to frontend columns if needed, or assume exact match
            const status = issue.status || 'OPEN';
            if (grouped[status]) grouped[status].push(issue);
            else grouped['OPEN'].push(issue); // Fallback
        });
        return grouped;
    }, [issues]);

    // Mutation for Drag End
    const moveIssueMutation = useMutation({
        mutationFn: ({ id, status }) => apiClient.put(ENDPOINTS.ISSUES.UPDATE_STATUS(id), null, { params: { status } }),
        onSuccess: () => {
            // We can optimize this by optimistic update instead of invalidate
            queryClient.invalidateQueries(['issues', project.projectId]);
        },
        onError: () => {
            showToast('Không thể cập nhật trạng thái', 'error');
            queryClient.invalidateQueries(['issues', project.projectId]); // Revert
        }
    });

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeIssueId = active.id;
        const overId = over.id; // Could be a container ID or another item ID

        // Find which container the active item is in (current status from active.data.current)
        // AND which container it was dropped over.

        let newStatus = null;

        // Check if over is a container column
        if (COLUMN_IDS.includes(overId)) {
            newStatus = overId;
        } else {
            // Over is another item, find its status
            const overIssue = issues.find(i => i.issueId === overId);
            if (overIssue) newStatus = overIssue.status;
        }

        const activeIssue = issues.find(i => i.issueId === activeIssueId);

        if (activeIssue && newStatus && activeIssue.status !== newStatus) {
            moveIssueMutation.mutate({ id: activeIssueId, status: newStatus });
        }
    };

    const handleIssueClick = (issue) => {
        setSelectedIssue(issue);
    };

    if (isLoading) return <LoadingBoard />;

    return (
        <>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-250px)]">
                    {Object.values(COLUMNS).map(col => (
                        <BoardColumn
                            key={col.id}
                            column={col}
                            issues={boardData[col.id] || []}
                            onIssueClick={handleIssueClick}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeId ? (
                        <IssueCard issue={issues.find(i => i.issueId === activeId)} isOverlay />
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
        </>
    );
}

function BoardColumn({ column, issues, onIssueClick }) {
    const { setNodeRef } = useSortable({ id: column.id, data: { type: 'Container', id: column.id } });

    return (
        <div className={`flex-shrink-0 w-80 flex flex-col rounded-xl ${column.color} max-h-full`}>
            <div className="p-4 font-bold text-gray-700 flex justify-between items-center bg-white/50 rounded-t-xl mb-1 sticky top-0 backdrop-blur-sm">
                <span>{column.title}</span>
                <span className="bg-white px-2 py-0.5 rounded-full text-xs text-gray-500 shadow-sm border border-gray-100">
                    {issues.length}
                </span>
            </div>

            <div ref={setNodeRef} className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3 min-h-[100px]">
                <SortableContext items={issues.map(i => i.issueId)} strategy={verticalListSortingStrategy}>
                    {issues.map(issue => (
                        <SortableIssue key={issue.issueId} issue={issue} onClick={() => onIssueClick?.(issue)} />
                    ))}
                </SortableContext>
                {issues.length === 0 && (
                    <div className="h-full flex items-center justify-center text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-lg py-8">
                        Thả thẻ vào đây
                    </div>
                )}
            </div>
        </div>
    );
}

function SortableIssue({ issue, onClick }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: issue.issueId, data: { type: 'Issue', issue } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <IssueCard issue={issue} onClick={onClick} />
        </div>
    );
}

function IssueCard({ issue, isOverlay, onClick }) {
    if (!issue) return null;

    return (
        <div
            className={`
                bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group
                ${isOverlay ? 'shadow-xl rotate-2 ring-2 ring-primary ring-opacity-50' : ''}
            `}
            onDoubleClick={onClick}
        >
            <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${getPriorityColor(issue.priority)}`}>
                    {issue.priority || 'NORMAL'}
                </span>
                <button
                    className="text-gray-300 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                    title="Xem chi tiết"
                >
                    <i className="fa-solid fa-expand" />
                </button>
            </div>

            <h4 className="text-sm font-medium text-gray-800 mb-2 line-clamp-2">{issue.subject}</h4>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                <div className="text-xs text-gray-400 font-mono">#{issue.issueId}</div>

                <div className="flex items-center gap-2">
                    {issue.assignee ? (
                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold" title={issue.assignee.fullName}>
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
        case 'URGENT': return 'bg-red-100 text-red-700';
        case 'HIGH': return 'bg-orange-100 text-orange-700';
        case 'LOW': return 'bg-gray-100 text-gray-700';
        default: return 'bg-blue-50 text-blue-700'; // NORMAL
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
